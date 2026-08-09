import { PageShell } from '@/components/layout/page-shell';
import { BrandSettingsPanel } from '@/features/brand/components/brand-settings-panel';

export default function BrandSettingsPage() {
  return (
    <PageShell
      title="Brand"
      description="Tenant colors and logos for dashboard, login, and OTP screens."
    >
      <BrandSettingsPanel />
    </PageShell>
  );
}
