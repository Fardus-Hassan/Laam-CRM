import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';

type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * Stores product images in an S3-compatible bucket (MinIO locally, any S3
 * provider in production). When S3_ENDPOINT is not configured, falls back to
 * the local `uploads/` directory served by the API (same as branding logos).
 */
@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    const endpoint = process.env['S3_ENDPOINT']?.trim();
    this.bucket = process.env['S3_BUCKET']?.trim() || 'laam-uploads';
    this.publicBaseUrl = (
      process.env['S3_PUBLIC_BASE_URL']?.trim() ||
      (endpoint ? `${endpoint.replace(/\/+$/, '')}/${this.bucket}` : '')
    ).replace(/\/+$/, '');

    if (endpoint) {
      this.client = new S3Client({
        endpoint,
        region: process.env['S3_REGION']?.trim() || 'us-east-1',
        // MinIO and most self-hosted S3 providers require path-style URLs.
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env['S3_ACCESS_KEY_ID'] ?? '',
          secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'] ?? '',
        },
      });
    } else {
      this.client = null;
    }
  }

  get isS3Enabled(): boolean {
    return this.client !== null;
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) {
      this.logger.log('S3_ENDPOINT not set — using local disk storage for uploads');
      return;
    }
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created bucket "${this.bucket}"`);
      } catch (error) {
        const name = (error as { name?: string }).name ?? '';
        if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') {
          this.logger.error(`Failed to ensure bucket "${this.bucket}" exists`, error as Error);
        }
      }
    }
  }

  async uploadProductImage(
    organizationId: string,
    productId: string,
    file: UploadedImage,
  ): Promise<{ key: string; url: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image must be 2MB or smaller');
    }

    const rawExt = extname(file.originalname ?? '').toLowerCase();
    const ext = ALLOWED_EXTENSIONS.includes(rawExt)
      ? rawExt
      : MIME_TO_EXTENSION[file.mimetype.toLowerCase()];
    if (!ext) {
      throw new BadRequestException('Only png, jpg, jpeg, webp or gif images are allowed');
    }

    const filename = `${randomUUID()}${ext}`;

    if (this.client) {
      const key = `orgs/${organizationId}/products/${productId}/${filename}`;
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      return { key, url: `${this.publicBaseUrl}/${key}` };
    }

    // Local disk fallback, served by main.ts via /api/uploads (like branding).
    const dir = join(process.cwd(), 'uploads', organizationId, 'products');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), file.buffer);
    const key = `${organizationId}/products/${filename}`;
    return { key, url: `/api/uploads/${key}` };
  }

  async deleteObject(key: string): Promise<void> {
    if (!key) {
      return;
    }

    if (this.client) {
      try {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } catch (error) {
        this.logger.warn(`Failed to delete object "${key}": ${(error as Error).message}`);
      }
      return;
    }

    const uploadsRoot = join(process.cwd(), 'uploads');
    const target = normalize(join(uploadsRoot, key));
    if (!target.startsWith(uploadsRoot + sep)) {
      throw new BadRequestException('Invalid storage key');
    }
    try {
      await unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Failed to delete local file "${key}": ${(error as Error).message}`);
      }
    }
  }
}
