'use client';

import { PipelineBoard } from '@/features/deals/components/pipeline-board';
import { getPipelinePageCopy } from '@/features/deals/config/deal-filters';
import { usePipeline } from '@/features/deals/hooks/use-deal-detail';

export function PipelinePageClient() {
  const copy = getPipelinePageCopy();
  const { data, isLoading, error } = usePipeline();
  return <PipelineBoard data={data} isLoading={isLoading} error={error} title={copy.title} description={copy.description} />;
}
