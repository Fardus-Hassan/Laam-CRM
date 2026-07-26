import type { OrderSource } from '@laam/types';

export type DiscountMode = 'amount' | 'percent';

export type PathaoLocation = {
  cityId: number;
  zoneId: number;
  areaId: number;
  city: string;
  zone: string;
  area: string;
  label: string;
};

export type CreateOrderLineItem = {
  id: string;
  productId: string;
  productName: string;
  variationId: string;
  variationLabel: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  subtotal: number;
};

export type CustomerLookupStats = {
  totalOrders: number;
  completedDelivered: number;
};

export type CreateOrderFormState = {
  mobile: string;
  altMobile: string;
  name: string;
  email: string;
  address: string;
  customerNote: string;
  district: string;
  pathaoLocation: PathaoLocation | null;
  orderSource: OrderSource | '';
  orderTag: string;
  customerTag: string;
  customerStats: CustomerLookupStats | null;

  lineItems: CreateOrderLineItem[];
  productSearch: string;
  selectedProductId: string;
  selectedVariationId: string;

  orderStatus: string;
  paymentMethod: string;
  attachments: Array<{ name: string; url: string }>;
  courierNote: string;
  packingNote: string;
  orderNote: string;

  utmSource: string;
  utmId: string;
  utmContent: string;
  utmCampaign: string;

  orderDate: Date;
  referenceNo: string;
  discountMode: DiscountMode;
  discountValue: number;
  shipping: number;
  advancePayment: number;
  courierChargedToMe: number;
  couponCode: string;
  couponApplied: boolean;
  couponDiscountAmount: number;
  skipFollowup: boolean;

  catalogSearch: string;
  catalogCategory: string;
};

export type CreateOrderTotals = {
  subtotal: number;
  orderDiscount: number;
  couponDiscount: number;
  afterDiscount: number;
  grandTotal: number;
  due: number;
};

export type CreateOrderValidationErrors = Partial<
  Record<
    | 'mobile'
    | 'name'
    | 'address'
    | 'lineItems'
    | 'discountValue'
    | 'shipping'
    | 'orderDate'
    | 'orderSource'
    | 'orderStatus'
    | 'paymentMethod',
    string
  >
>;
