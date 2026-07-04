import { CampaignsPage } from '@/features/campaigns/components/campaigns-page';

type CampaignsRouteProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function CampaignsRoute({ searchParams }: CampaignsRouteProps) {
  const params = searchParams ? await searchParams : undefined;
  return <CampaignsPage initialTab={params?.tab} />;
}
