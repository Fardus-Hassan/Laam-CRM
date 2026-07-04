'use client';

type TooltipPayloadItem = {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string | number;
};

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  valueFormatter?: (value: number, name: string) => string;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  valueFormatter,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
      {label ? (
        <p className="mb-1.5 text-xs font-semibold text-foreground">{label}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry) => {
          const value = Number(entry.value ?? 0);
          const name = String(entry.name ?? entry.dataKey ?? '');
          const color = entry.color ?? 'var(--primary)';

          return (
            <li key={name} className="flex items-center gap-2 text-xs">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto font-medium text-foreground">
                {valueFormatter ? valueFormatter(value, name) : value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
