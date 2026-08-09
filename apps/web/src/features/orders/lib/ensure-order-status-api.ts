/** Ensure org form-options include this status so PATCH /orders/:id status succeeds. */
export async function ensureOrderStatusOnApi(input: {
  value: string;
  label?: string;
}): Promise<{ value: string; label: string; created: boolean }> {
  const { apiRequest } = await import('@/lib/api/client');
  const { crmEndpoints } = await import('@/lib/api/endpoints');
  return apiRequest<{ value: string; label: string; created: boolean }>(
    `${crmEndpoints.orders}/meta/statuses/ensure`,
    {
      method: 'POST',
      body: JSON.stringify({
        value: input.value,
        label: input.label,
      }),
    },
  );
}

export async function syncLocalStatusesToApi(
  statuses: Array<{ slug: string; label: string }>,
): Promise<{ ok: number; failed: number }> {
  if (process.env.NEXT_PUBLIC_USE_API !== 'true') {
    return { ok: 0, failed: 0 };
  }
  let ok = 0;
  let failed = 0;
  for (const status of statuses) {
    try {
      await ensureOrderStatusOnApi({ value: status.slug, label: status.label });
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  return { ok, failed };
}
