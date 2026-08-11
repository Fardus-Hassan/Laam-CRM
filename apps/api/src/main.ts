import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as classTransformer from 'class-transformer';
import * as classValidator from 'class-validator';
import { AppModule } from './app/app.module';

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return true;
    }
    if (host.endsWith('.localhost')) {
      return true;
    }
    if (host === 'laamcrm.com' || host.endsWith('.laamcrm.com')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function bootstrap() {
  // rawBody: required for WooCommerce X-WC-Webhook-Signature HMAC verify
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Honor X-Forwarded-For from reverse proxy / CDN (set hop count via TRUST_PROXY)
  const trustProxy = process.env['TRUST_PROXY'];
  if (trustProxy === '1' || trustProxy === 'true') {
    app.set('trust proxy', 1);
  } else if (trustProxy && /^\d+$/.test(trustProxy)) {
    app.set('trust proxy', Number(trustProxy));
  }

  // Cap JSON / form body size (website webhooks stay small; uploads use multipart elsewhere).
  // NestFactory rawBody:true keeps Buffer for Woo HMAC; these parsers apply size limits.
  const bodyLimit = process.env['JSON_BODY_LIMIT'] ?? '512kb';
  app.useBodyParser('json', { limit: bodyLimit });
  app.useBodyParser('urlencoded', { limit: bodyLimit, extended: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // Force the pipe to use the exact same class-transformer/class-validator
      // instances the DTO decorators registered metadata in. Without this, the
      // webpack bundle and node_modules copies diverge and nested DTOs (e.g.
      // product variants) get stripped to empty objects by whitelist.
      transformerPackage: classTransformer,
      validatorPackage: classValidator,
    }),
  );
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Slug',
      'X-Laam-Ingest-Token',
      'X-Website-Token',
      'X-WC-Webhook-Signature',
    ],
  });

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/api/uploads' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Laam CRM API')
    .setDescription('Laam enterprise CRM REST API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    customSiteTitle: 'Laam CRM API Docs',
    customCssUrl: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css',
    ],
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js',
    ],
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env['PORT'] ?? 3333;
  await app.listen(port);
  Logger.log(`Laam API running at http://localhost:${port}/${globalPrefix}`);
  Logger.log(`Swagger docs at http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
