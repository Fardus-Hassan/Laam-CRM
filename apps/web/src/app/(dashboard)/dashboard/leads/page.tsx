import { EntityPage } from '@/features/crm/components/entity-page';
import { CRM_MODULES } from '@/features/crm/config/modules';

export default function LeadsPage() {
  return <EntityPage module={CRM_MODULES.leads} />;
}
