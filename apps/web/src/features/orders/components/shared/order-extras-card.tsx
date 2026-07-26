'use client';

import * as React from 'react';
import type { OrderDetail, OrderFormOptionsResponse } from '@laam/types';
import { FileText, Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PathaoLocationDialog } from '@/features/orders/components/create-order/pathao-location-dialog';
import { EditableSectionCard } from '@/features/orders/components/shared/editable-section-card';
import type { PathaoLocation } from '@/features/orders/lib/create-order-types';
import { env } from '@/config/env';
import { getStoredAccessToken } from '@/lib/auth-token';
import { getTenantSlugFromHost } from '@/lib/tenant';
import { cn } from '@/lib/utils';

type OrderExtrasCardProps = {
  order: OrderDetail;
  options?: OrderFormOptionsResponse | null;
  onSave?: (patch: {
    altMobile?: string;
    referenceNo?: string;
    skipFollowup?: boolean;
    paymentMethod?: string;
    paidAmount?: number;
    customerTag?: string;
    orderTag?: string;
    pathaoCity?: string;
    pathaoZone?: string;
    pathaoArea?: string;
    pathaoCityId?: number | null;
    pathaoZoneId?: number | null;
    pathaoAreaId?: number | null;
    customerNote?: string;
    courierNote?: string;
    packingNote?: string;
    attachmentNames?: string[];
    attachmentUrls?: string[];
  }) => void | Promise<OrderDetail | void>;
  className?: string;
};

type Draft = {
  altMobile: string;
  referenceNo: string;
  skipFollowup: boolean;
  paymentMethod: string;
  paidAmount: string;
  customerTag: string;
  orderTag: string;
  pathaoLocation: PathaoLocation | null;
  customerNote: string;
  courierNote: string;
  packingNote: string;
  attachments: Array<{ name: string; url: string }>;
};

function pathaoFromOrder(order: OrderDetail): PathaoLocation | null {
  if (!order.pathaoCity || !order.pathaoZone || !order.pathaoArea) return null;
  if (!order.pathaoCityId || !order.pathaoZoneId || !order.pathaoAreaId) {
    // Names only — dialog can re-match by name so IDs get saved on confirm.
    return {
      cityId: order.pathaoCityId ?? 0,
      zoneId: order.pathaoZoneId ?? 0,
      areaId: order.pathaoAreaId ?? 0,
      city: order.pathaoCity,
      zone: order.pathaoZone,
      area: order.pathaoArea,
      label: `${order.pathaoArea}, ${order.pathaoZone}, ${order.pathaoCity}`,
    };
  }
  return {
    cityId: order.pathaoCityId,
    zoneId: order.pathaoZoneId,
    areaId: order.pathaoAreaId,
    city: order.pathaoCity,
    zone: order.pathaoZone,
    area: order.pathaoArea,
    label: `${order.pathaoArea}, ${order.pathaoZone}, ${order.pathaoCity}`,
  };
}

function toDraft(order: OrderDetail): Draft {
  return {
    altMobile: order.altMobile ?? '',
    referenceNo: order.referenceNo ?? '',
    skipFollowup: Boolean(order.skipFollowup),
    paymentMethod: order.paymentMethod ?? '',
    paidAmount: String(order.paidAmount ?? 0),
    customerTag: order.customerTag ?? '',
    orderTag: order.orderTag ?? '',
    pathaoLocation: pathaoFromOrder(order),
    customerNote: order.customerNote ?? '',
    courierNote: order.courierNote ?? '',
    packingNote: order.packingNote ?? '',
    attachments: (order.attachments ?? []).map((a) => ({ name: a.name, url: a.url })),
  };
}

function MetaRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 text-sm sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium">{display}</span>
    </div>
  );
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2 text-sm leading-relaxed">
        {text}
      </p>
    </div>
  );
}

async function uploadOrderFile(file: File): Promise<{ name: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const headers: HeadersInit = {};
  const token = getStoredAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const tenant = getTenantSlugFromHost();
  if (tenant) headers['X-Tenant-Slug'] = tenant;
  const res = await fetch(`${env.apiUrl}/crm/orders/attachments`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.message === 'string' ? body.message : 'Upload failed');
  }
  return (await res.json()) as { name: string; url: string };
}

export function OrderExtrasCard({ order, options, onSave, className }: OrderExtrasCardProps) {
  const [draft, setDraft] = React.useState(() => toDraft(order));
  const [uploading, setUploading] = React.useState(false);
  const [pathaoOpen, setPathaoOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDraft(toDraft(order));
  }, [order]);

  const pathao = draft.pathaoLocation?.label
    ?? [order.pathaoCity, order.pathaoZone, order.pathaoArea].filter(Boolean).join(' › ');
  const pathaoReady = Boolean(
    draft.pathaoLocation?.cityId &&
      draft.pathaoLocation?.zoneId &&
      draft.pathaoLocation?.areaId,
  );
  const attachments = order.attachments ?? [];

  const paymentOptions = (options?.paymentMethods ?? []).map((m) => ({
    value: m.value,
    label: m.label,
  }));
  const customerTagOptions = (options?.customerTags ?? []).map((t) => ({
    value: t.value,
    label: t.label,
  }));
  const orderTagOptions = (options?.orderTags ?? []).map((t) => ({
    value: t.value,
    label: t.label,
  }));

  function patchDraft(partial: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const uploaded = await uploadOrderFile(file);
      setDraft((prev) => ({
        ...prev,
        attachments: [...prev.attachments, { name: uploaded.name, url: uploaded.url }],
      }));
      toast.success('Attachment uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const editContent = (
    <div className="space-y-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <FormField label="Alt mobile">
          <FormInput
            value={draft.altMobile}
            onChange={(e) => patchDraft({ altMobile: e.target.value })}
          />
        </FormField>
        <FormField label="Reference no">
          <FormInput
            value={draft.referenceNo}
            onChange={(e) => patchDraft({ referenceNo: e.target.value })}
          />
        </FormField>
        <FormField label="Payment method">
          {paymentOptions.length > 0 ? (
            <FormSelect
              value={draft.paymentMethod}
              onChange={(paymentMethod) => patchDraft({ paymentMethod })}
              options={paymentOptions}
              placeholder="Select method"
            />
          ) : (
            <FormInput
              value={draft.paymentMethod}
              onChange={(e) => patchDraft({ paymentMethod: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Paid amount">
          <FormInput
            type="number"
            min={0}
            value={draft.paidAmount}
            onChange={(e) => patchDraft({ paidAmount: e.target.value })}
          />
        </FormField>
        <FormField label="Customer tag">
          {customerTagOptions.length > 0 ? (
            <FormSelect
              value={draft.customerTag}
              onChange={(customerTag) => patchDraft({ customerTag })}
              options={[{ value: '', label: 'None' }, ...customerTagOptions]}
              placeholder="Select tag"
            />
          ) : (
            <FormInput
              value={draft.customerTag}
              onChange={(e) => patchDraft({ customerTag: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Order tag">
          {orderTagOptions.length > 0 ? (
            <FormSelect
              value={draft.orderTag}
              onChange={(orderTag) => patchDraft({ orderTag })}
              options={[{ value: '', label: 'None' }, ...orderTagOptions]}
              placeholder="Select tag"
            />
          ) : (
            <FormInput
              value={draft.orderTag}
              onChange={(e) => patchDraft({ orderTag: e.target.value })}
            />
          )}
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.skipFollowup}
          onChange={(e) => patchDraft({ skipFollowup: e.target.checked })}
          className="size-4 rounded border"
        />
        Skip follow-up
      </label>

      <div className="space-y-2">
        <FormField
          label="Pathao location"
          hint={
            pathaoReady
              ? 'Ready to book'
              : draft.pathaoLocation
                ? 'Re-select location to save Pathao IDs before booking'
                : 'Required before Pathao booking'
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setPathaoOpen(true)}>
              {draft.pathaoLocation ? 'Change Pathao' : 'Select Pathao'}
            </Button>
            {draft.pathaoLocation ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => patchDraft({ pathaoLocation: null })}
              >
                Clear
              </Button>
            ) : null}
          </div>
          {draft.pathaoLocation ? (
            <p className="mt-1.5 text-sm font-medium">{draft.pathaoLocation.label}</p>
          ) : null}
        </FormField>
      </div>

      <FormField label="Customer note">
        <FormTextarea
          rows={2}
          value={draft.customerNote}
          onChange={(e) => patchDraft({ customerNote: e.target.value })}
        />
      </FormField>
      <FormField label="Courier note">
        <FormTextarea
          rows={2}
          value={draft.courierNote}
          onChange={(e) => patchDraft({ courierNote: e.target.value })}
        />
      </FormField>
      <FormField label="Packing note">
        <FormTextarea
          rows={2}
          value={draft.packingNote}
          onChange={(e) => patchDraft({ packingNote: e.target.value })}
        />
      </FormField>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Attachments
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1.5"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Upload className="size-3.5 animate-pulse" /> : <Plus className="size-3.5" />}
            {uploading ? 'Uploading…' : 'Add file'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </div>
        {draft.attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No attachments yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {draft.attachments.map((file) => (
              <li
                key={`${file.url}-${file.name}`}
                className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
              >
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-primary hover:underline"
                >
                  {file.name}
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive"
                                  onClick={() =>
                                    setDraft((prev) => ({
                                      ...prev,
                                      attachments: prev.attachments.filter(
                                        (a) => !(a.url === file.url && a.name === file.name),
                                      ),
                                    }))
                                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const readContent = (
    <div className="space-y-3.5">
      <div className="space-y-2">
        <MetaRow label="Alt mobile" value={order.altMobile} />
        <MetaRow label="Reference" value={order.referenceNo} />
        <MetaRow label="Skip follow-up" value={order.skipFollowup} />
        <MetaRow label="Paid amount" value={order.paidAmount} />
        <MetaRow label="Pathao" value={pathao || undefined} />
        <MetaRow
          label="Pathao IDs"
          value={
            order.pathaoCityId && order.pathaoZoneId && order.pathaoAreaId
              ? `${order.pathaoCityId}/${order.pathaoZoneId}/${order.pathaoAreaId}`
              : undefined
          }
        />
        <MetaRow label="Consignment" value={order.courierConsignmentId} />
      </div>

      {(order.customerTag || order.orderTag || order.paymentMethod || order.couponCode) && (
        <div className="flex flex-wrap gap-1.5">
          {order.paymentMethod ? (
            <Badge variant="secondary" className="rounded-md font-normal">
              {order.paymentMethod}
            </Badge>
          ) : null}
          {order.couponCode ? (
            <Badge variant="outline" className="rounded-md font-normal">
              Coupon {order.couponCode}
            </Badge>
          ) : null}
          {order.customerTag ? (
            <Badge variant="secondary" className="rounded-md font-normal">
              Customer: {order.customerTag}
            </Badge>
          ) : null}
          {order.orderTag ? (
            <Badge variant="outline" className="rounded-md font-normal">
              Order: {order.orderTag}
            </Badge>
          ) : null}
        </div>
      )}

      {order.customerNote ? <NoteBlock label="Customer note" text={order.customerNote} /> : null}
            {order.courierStatus ? <NoteBlock label="Pathao status" text={order.courierStatus} /> : null}
            {order.courierNote ? <NoteBlock label="Courier note" text={order.courierNote} /> : null}
      {order.packingNote ? <NoteBlock label="Packing note" text={order.packingNote} /> : null}

      {attachments.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Paperclip className="size-3.5" />
            Attachments
          </p>
          <ul className="space-y-1.5">
            {attachments.map((file) => (
              <li key={file.id}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-2 truncate rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-sm text-primary transition-colors hover:bg-muted/40"
                >
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No attachments.</p>
      )}
    </div>
  );

  return (
    <>
      <EditableSectionCard
        title="Order details"
        icon={<FileText className="size-4 text-primary" />}
        className={cn(className)}
        canEdit={Boolean(onSave)}
        editContent={onSave ? editContent : undefined}
        onCancel={() => setDraft(toDraft(order))}
        onSave={
          onSave
            ? async () => {
                const paid = Number(draft.paidAmount);
                const loc = draft.pathaoLocation;
                await onSave({
                  altMobile: draft.altMobile,
                  referenceNo: draft.referenceNo,
                  skipFollowup: draft.skipFollowup,
                  paymentMethod: draft.paymentMethod,
                  paidAmount: Number.isFinite(paid) ? Math.max(0, paid) : 0,
                  customerTag: draft.customerTag,
                  orderTag: draft.orderTag,
                  pathaoCity: loc?.city ?? '',
                  pathaoZone: loc?.zone ?? '',
                  pathaoArea: loc?.area ?? '',
                  pathaoCityId: loc?.cityId ? loc.cityId : null,
                  pathaoZoneId: loc?.zoneId ? loc.zoneId : null,
                  pathaoAreaId: loc?.areaId ? loc.areaId : null,
                  customerNote: draft.customerNote,
                  courierNote: draft.courierNote,
                  packingNote: draft.packingNote,
                  attachmentNames: draft.attachments.map((a) => a.name),
                  attachmentUrls: draft.attachments.map((a) => a.url),
                });
              }
            : undefined
        }
      >
        {readContent}
      </EditableSectionCard>

      <PathaoLocationDialog
        open={pathaoOpen}
        onOpenChange={setPathaoOpen}
        value={draft.pathaoLocation}
        onConfirm={(location) => {
          patchDraft({ pathaoLocation: location });
          toast.success('Pathao location selected — save to apply');
        }}
      />
    </>
  );
}
