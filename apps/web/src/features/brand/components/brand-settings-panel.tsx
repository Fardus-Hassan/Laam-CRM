'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { BrandColors, Permission, PublicTenantBrand, SidebarNavLayout } from '@laam/types';
import { ImagePlus, Palette, RotateCcw, Save } from 'lucide-react';

import { BrandLogo } from '@/components/brand/brand-logo';
import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DEFAULT_BRAND, contrastOnBrandBg, mergeBrandFromPublic } from '@/config/brand';
import { env } from '@/config/env';
import {
  brandingApi,
  type BrandingApiClient,
} from '@/features/brand/api/branding-api';
import { SidebarNavLayoutEditor } from '@/features/brand/components/sidebar-nav-layout-editor';
import { useBrandControls } from '@/features/brand/providers/brand-provider';
import { setLiveSidebarNavLayout } from '@/features/navigation/data/sidebar-nav-order-store';
import { parseApiErrorMessage } from '@/lib/api/parse-api-error';

const COLOR_FIELDS: Array<{ key: keyof BrandColors; label: string }> = [
  { key: 'primary', label: 'Primary' },
  { key: 'primaryDark', label: 'Primary dark' },
  { key: 'accent', label: 'Accent' },
  { key: 'sidebarBgLight', label: 'Sidebar background (light)' },
  { key: 'sidebarBgDark', label: 'Sidebar background (dark)' },
  { key: 'sidebarActiveBg', label: 'Sidebar active' },
  { key: 'sidebarActiveFg', label: 'Sidebar active text' },
  { key: 'sidebarFg', label: 'Sidebar text' },
  { key: 'surfaceLight', label: 'Surface light' },
  { key: 'surfaceDark', label: 'Surface dark' },
];

function toPublicBrand(
  name: string,
  slug: string,
  colors: BrandColors,
  logos: { light?: string; dark?: string },
): PublicTenantBrand {
  return { name, slug, colors, logos };
}

type BrandSettingsPanelProps = {
  api?: BrandingApiClient;
  /** Permission required to mutate (platform uses platform.manage). */
  managePermission?: Permission | Permission[];
  /**
   * When true (default), live-preview also updates the app chrome brand.
   * Disable when editing another tenant from the platform console.
   */
  syncLiveBrand?: boolean;
};

export function BrandSettingsPanel({
  api = brandingApi,
  managePermission = 'brand.manage',
  syncLiveBrand = true,
}: BrandSettingsPanelProps) {
  const { brand, setBrand } = useBrandControls();
  const [colors, setColors] = React.useState<BrandColors>(brand.colors);
  const [logos, setLogos] = React.useState(brand.logos);
  const [sidebarNavLayout, setSidebarNavLayout] =
    React.useState<SidebarNavLayout | null>(null);
  const [orgMeta, setOrgMeta] = React.useState({ name: brand.name, slug: 'tenant' });
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState<'light' | 'dark' | 'favicon' | null>(
    null,
  );

  React.useEffect(() => {
    if (!env.useApi) {
      return;
    }
    void api.get().then((data) => {
      const merged = mergeBrandFromPublic(data, env.apiUrl);
      setOrgMeta({ name: data.name, slug: data.slug });
      setColors(merged.colors);
      setLogos(merged.logos);
      setSidebarNavLayout(data.sidebarNavLayout ?? null);
      if (syncLiveBrand) {
        setBrand(merged);
        setLiveSidebarNavLayout(data.sidebarNavLayout ?? null);
      }
    });
  }, [api, setBrand, syncLiveBrand]);

  function preview(nextColors: BrandColors, nextLogos = logos) {
    if (!syncLiveBrand) {
      return;
    }
    setBrand(
      mergeBrandFromPublic(
        toPublicBrand(orgMeta.name, orgMeta.slug, nextColors, nextLogos),
        env.apiUrl,
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await api.update({
        colors,
        logos,
        sidebarNavLayout: sidebarNavLayout ?? null,
      });
      const merged = mergeBrandFromPublic(saved, env.apiUrl);
      setColors(merged.colors);
      setLogos(merged.logos);
      setSidebarNavLayout(saved.sidebarNavLayout ?? null);
      setOrgMeta({ name: saved.name, slug: saved.slug });
      if (syncLiveBrand) {
        setBrand(merged);
        setLiveSidebarNavLayout(saved.sidebarNavLayout ?? null);
      }
      toast.success('Brand updated');
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Could not save brand'));
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      const saved = await api.update({
        colors: DEFAULT_BRAND.colors,
        logos: { light: '', dark: '', favicon: '' },
        sidebarNavOrder: null,
        sidebarNavLayout: null,
      });
      const merged = {
        ...DEFAULT_BRAND,
        name: saved.name || orgMeta.name,
      };
      setOrgMeta({ name: saved.name, slug: saved.slug });
      setColors(merged.colors);
      setLogos(merged.logos);
      setSidebarNavLayout(null);
      if (syncLiveBrand) {
        setBrand(merged);
        setLiveSidebarNavLayout(null);
      }
      toast.success('Reset to Laam defaults');
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Could not reset brand'));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(variant: 'light' | 'dark' | 'favicon', file: File | null) {
    if (!file) return;
    setUploading(variant);
    try {
      const saved = await api.uploadLogo(variant, file);
      const merged = mergeBrandFromPublic(saved, env.apiUrl);
      setLogos(merged.logos);
      setColors(merged.colors);
      setOrgMeta({ name: saved.name, slug: saved.slug });
      if (syncLiveBrand) {
        setBrand(merged);
      }
      const label =
        variant === 'favicon' ? 'Favicon' : variant === 'light' ? 'Light logo' : 'Dark logo';
      toast.success(`${label} uploaded`);
    } catch (error) {
      toast.error(parseApiErrorMessage(error, 'Upload failed'));
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Palette className="size-4 text-primary" />
            <CardTitle className="text-base">Brand colors</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    id={field.key}
                    type="color"
                    className="h-9 w-12 cursor-pointer rounded border border-input bg-background p-1"
                    value={colors[field.key]}
                    onChange={(event) => {
                      const next = { ...colors, [field.key]: event.target.value };
                      setColors(next);
                      preview(next);
                    }}
                  />
                  <input
                    className="h-9 flex-1 rounded-md border border-input bg-background px-2 font-mono text-xs"
                    value={colors[field.key]}
                    onChange={(event) => {
                      const next = { ...colors, [field.key]: event.target.value };
                      setColors(next);
                      preview(next);
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <ImagePlus className="size-4 text-primary" />
            <CardTitle className="text-base">Logos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            {(['light', 'dark'] as const).map((variant) => (
              <div key={variant} className="space-y-3">
                <Label>{variant === 'light' ? 'Light mode logo' : 'Dark mode logo'}</Label>
                <div
                  className="flex h-28 items-center justify-center rounded-xl border p-4"
                  style={{
                    backgroundColor:
                      variant === 'light' ? colors.sidebarBgLight : colors.sidebarBgDark,
                  }}
                >
                  <BrandLogo
                    variant={variant}
                    src={variant === 'light' ? logos.light : logos.dark}
                    className="max-h-16"
                  />
                </div>
                <Can permission={managePermission}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                    className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground"
                    disabled={uploading === variant}
                    onChange={(event) =>
                      void handleUpload(variant, event.target.files?.[0] ?? null)
                    }
                  />
                </Can>
                <p className="text-[11px] text-muted-foreground">
                  {uploading === variant ? 'Uploading…' : 'PNG, JPG, WEBP or SVG · max 2MB'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <ImagePlus className="size-4 text-primary" />
            <CardTitle className="text-base">Favicon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Browser tab icon — shown next to the company name for this workspace.
            </p>
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border bg-muted/30 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logos.favicon || logos.light || '/images/brand/logo.png'}
                alt="Favicon preview"
                className="size-10 object-contain"
              />
            </div>
            <Can permission={managePermission}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/x-icon,.ico"
                className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground"
                disabled={uploading === 'favicon'}
                onChange={(event) =>
                  void handleUpload('favicon', event.target.files?.[0] ?? null)
                }
              />
            </Can>
            <p className="text-[11px] text-muted-foreground">
              {uploading === 'favicon'
                ? 'Uploading…'
                : 'ICO, PNG, JPG, WEBP or SVG · max 2MB · square works best'}
            </p>
          </CardContent>
        </Card>

        <Can permission={managePermission}>
          <SidebarNavLayoutEditor
            value={sidebarNavLayout}
            onChange={(next) => {
              setSidebarNavLayout(next);
              if (syncLiveBrand) {
                setLiveSidebarNavLayout(next);
              }
            }}
            onReset={() => {
              setSidebarNavLayout(null);
              if (syncLiveBrand) {
                setLiveSidebarNavLayout(null);
              }
            }}
          />
        </Can>

        <Can permission={managePermission}>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              <Save className="size-4" />
              {saving ? 'Saving…' : 'Save brand'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleReset()}
              disabled={saving}
            >
              <RotateCcw className="size-4" />
              Reset defaults
            </Button>
          </div>
        </Can>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <BrandLogo src={logos.light} className="mb-4 dark:hidden" />
            <BrandLogo src={logos.dark} className="mb-4 hidden dark:block" />
            <p className="text-sm font-semibold" style={{ color: colors.primary }}>
              {orgMeta.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Login & dashboard use these colors and logos.
            </p>
            <Button
              type="button"
              className="mt-4 w-full"
              style={{ backgroundColor: colors.primary }}
            >
              Sample button
            </Button>
          </div>
          <div className="grid gap-3">
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: colors.sidebarBgLight,
                color: contrastOnBrandBg(colors.sidebarBgLight, colors.sidebarFg),
              }}
            >
              <p className="text-xs font-medium opacity-80">Sidebar · light</p>
              <div
                className="mt-3 rounded-md px-3 py-2 text-sm font-medium"
                style={{
                  backgroundColor: colors.sidebarActiveBg,
                  color: colors.sidebarActiveFg,
                }}
              >
                Active nav item
              </div>
            </div>
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: colors.sidebarBgDark,
                color: contrastOnBrandBg(colors.sidebarBgDark, colors.sidebarFg),
              }}
            >
              <p className="text-xs font-medium opacity-80">Sidebar · dark</p>
              <div
                className="mt-3 rounded-md px-3 py-2 text-sm font-medium"
                style={{
                  backgroundColor: colors.sidebarActiveBg,
                  color: colors.sidebarActiveFg,
                }}
              >
                Active nav item
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
