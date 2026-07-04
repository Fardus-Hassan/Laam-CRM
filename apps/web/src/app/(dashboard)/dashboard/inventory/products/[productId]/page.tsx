import { ProductDetailView } from '@/features/inventory/components/product-detail-view';

type ProductDetailPageProps = {
  params: Promise<{ productId: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = await params;
  return <ProductDetailView productId={productId} />;
}
