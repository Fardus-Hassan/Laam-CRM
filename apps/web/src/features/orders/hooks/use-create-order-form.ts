'use client';

import * as React from 'react';
import type { OrderCustomerLookup, OrderFormOptionsResponse } from '@laam/types';

import { couponsApi } from '@/features/coupons/api/coupons-api';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { ordersApi } from '@/features/orders/api/orders-api';
import {
  calcCreateOrderTotals,
  calcLineSubtotal,
} from '@/features/orders/lib/create-order-calculations';
import type {
  CarrybeeLocation,
  CreateOrderFormState,
  CreateOrderLineItem,
  CreateOrderTotals,
  CreateOrderValidationErrors,
  PathaoLocation,
} from '@/features/orders/lib/create-order-types';

export type OrderCatalogProduct = {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  variations: Array<{ id: string; label: string; unitPrice: number }>;
};

type FormAction =
  | { type: 'patch'; patch: Partial<CreateOrderFormState> }
  | { type: 'reset' }
  | {
      type: 'hydrate_defaults';
      courierNote: string;
      shipping: number;
    }
  | {
      type: 'lookup_customer_result';
      profile: OrderCustomerLookup | null;
    }
  | { type: 'add_line_item_from_product'; product: OrderCatalogProduct; variationId?: string }
  | {
      type: 'update_line_item';
      id: string;
      patch: Partial<CreateOrderLineItem>;
      catalog: OrderCatalogProduct[];
    }
  | { type: 'remove_line_item'; id: string }
  | {
      type: 'apply_coupon';
      applied: boolean;
      discountAmount?: number;
      code?: string;
    }
  | { type: 'set_pathao'; location: PathaoLocation | null }
  | { type: 'set_carrybee'; location: CarrybeeLocation | null }
  | { type: 'add_attachment'; name: string; url: string }
  | { type: 'remove_attachment'; name: string };

function createInitialState(): CreateOrderFormState {
  return {
    mobile: '',
    altMobile: '',
    name: '',
    email: '',
    address: '',
    customerNote: '',
    district: '',
    pathaoLocation: null,
    carrybeeLocation: null,
    orderSource: '',
    orderTag: '',
    customerTag: '',
    customerStats: null,
    lineItems: [],
    productSearch: '',
    selectedProductId: '',
    selectedVariationId: '',
    orderStatus: '',
    holdFollowUpDate: null,
    paymentMethod: '',
    attachments: [],
    courierNote: '',
    packingNote: '',
    orderNote: '',
    utmSource: '',
    utmId: '',
    utmContent: '',
    utmCampaign: '',
    courierWeightKg: '',
    courierDeliveryType: 'normal',
    orderDate: new Date(),
    referenceNo: '',
    discountMode: 'amount',
    discountValue: 0,
    shipping: 0,
    advancePayment: 0,
    courierChargedToMe: 0,
    couponCode: '',
    couponApplied: false,
    couponDiscountAmount: 0,
    skipFollowup: false,
    salesAssignMode: '',
    salesTeamIds: [],
    salesUserId: '',
    catalogSearch: '',
    catalogCategory: '',
  };
}

function nextLineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function reducer(state: CreateOrderFormState, action: FormAction): CreateOrderFormState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };

    case 'reset':
      return createInitialState();

    case 'hydrate_defaults':
      return {
        ...state,
        courierNote: state.courierNote || action.courierNote,
        shipping: state.shipping || action.shipping,
      };

    case 'lookup_customer_result': {
      const profile = action.profile;
      if (!profile) {
        return {
          ...state,
          customerStats: { totalOrders: 0, completedDelivered: 0 },
        };
      }
      // Only fill blank fields — never overwrite order/detail edits (or hydrated
      // order data) with a stale customer profile after save/reload.
      return {
        ...state,
        name: state.name.trim() ? state.name : profile.name || state.name,
        email: state.email.trim() ? state.email : profile.email || state.email,
        address: state.address.trim()
          ? state.address
          : profile.address || state.address,
        district: state.district.trim()
          ? state.district
          : profile.district || state.district,
        orderSource: (state.orderSource.trim()
          ? state.orderSource
          : profile.orderSource || state.orderSource) as CreateOrderFormState['orderSource'],
        customerTag: state.customerTag.trim()
          ? state.customerTag
          : profile.customerTag || state.customerTag,
        customerStats: profile.stats,
      };
    }

    case 'update_line_item': {
      return {
        ...state,
        lineItems: state.lineItems.map((item) => {
          if (item.id !== action.id) return item;
          const next = { ...item, ...action.patch };
          if (action.patch.variationId) {
            const product = action.catalog.find((p) => p.id === item.productId);
            const variation = product?.variations.find(
              (v) => v.id === action.patch.variationId,
            );
            if (variation) {
              next.variationLabel = variation.label;
              next.unitPrice = variation.unitPrice;
            }
          }
          next.subtotal = calcLineSubtotal(next);
          return next;
        }),
      };
    }

    case 'remove_line_item':
      return {
        ...state,
        lineItems: state.lineItems.filter((item) => item.id !== action.id),
      };

    case 'apply_coupon':
      return {
        ...state,
        couponApplied: action.applied,
        couponDiscountAmount: action.applied ? (action.discountAmount ?? 0) : 0,
        couponCode: action.code ?? state.couponCode,
      };

    case 'add_line_item_from_product': {
      const product = action.product;
      const variation =
        product.variations.find((item) => item.id === action.variationId) ??
        product.variations[0];
      if (!variation) return state;
      const line: CreateOrderLineItem = {
        id: nextLineId(),
        productId: product.id,
        productName: product.name,
        variationId: variation.id,
        variationLabel: variation.label,
        unitPrice: variation.unitPrice,
        quantity: 1,
        discount: 0,
        subtotal: variation.unitPrice,
      };
      return {
        ...state,
        lineItems: [...state.lineItems, line],
        selectedProductId: product.id,
        selectedVariationId: variation.id,
      };
    }

    case 'set_pathao':
      return {
        ...state,
        pathaoLocation: action.location,
        ...(action.location
          ? {
              address: action.location.label,
              district: action.location.city,
            }
          : {}),
      };

    case 'set_carrybee':
      return {
        ...state,
        carrybeeLocation: action.location,
        ...(action.location
          ? {
              address: action.location.label,
              district: action.location.city,
            }
          : {}),
      };

    case 'add_attachment':
      if (state.attachments.some((a) => a.name === action.name && a.url === action.url)) {
        return state;
      }
      return {
        ...state,
        attachments: [...state.attachments, { name: action.name, url: action.url }],
      };

    case 'remove_attachment':
      return {
        ...state,
        attachments: state.attachments.filter((a) => a.name !== action.name),
      };

    default:
      return state;
  }
}

function validateForm(state: CreateOrderFormState): CreateOrderValidationErrors {
  const errors: CreateOrderValidationErrors = {};
  if (!state.mobile.trim()) errors.mobile = 'Mobile number is required';
  if (!state.name.trim()) errors.name = 'Customer name is required';
  if (!state.address.trim()) errors.address = 'Address is required';
  if (state.lineItems.length === 0) errors.lineItems = 'Add at least one product';
  if (!state.orderDate) errors.orderDate = 'Order date is required';
  if (!state.orderSource) errors.orderSource = 'Order source is required';
  if (!state.orderStatus) errors.orderStatus = 'Order status is required';
  if (state.orderStatus.trim().toLowerCase() === 'hold' && !state.holdFollowUpDate) {
    errors.holdFollowUpDate = 'Hold follow-up date is required';
  }
  if (!state.paymentMethod) errors.paymentMethod = 'Payment method is required';
  return errors;
}

const EMPTY_OPTIONS: OrderFormOptionsResponse = {
  statuses: [],
  paymentMethods: [],
  sources: [],
  districts: [],
  orderTags: [],
  customerTags: [],
  pathaoCities: [],
  pathaoZones: [],
  defaultCourierNote: '',
  defaultShipping: 0,
  customerCreateSource: '',
};

function mapDetailToCatalog(
  d: NonNullable<Awaited<ReturnType<typeof inventoryApi.getProduct>>>,
): OrderCatalogProduct {
  return {
    id: d.id,
    name: d.name,
    sku: d.sku,
    imageUrl: d.imageUrl ?? '',
    variations:
      d.variants.length > 0
        ? d.variants.map((v) => ({
            id: v.id,
            label: v.label,
            unitPrice: v.salePrice,
          }))
        : [{ id: `${d.id}-default`, label: 'Default', unitPrice: d.salePriceMin }],
  };
}

export function useCreateOrderForm() {
  const [state, dispatch] = React.useReducer(reducer, undefined, createInitialState);
  const [errors, setErrors] = React.useState<CreateOrderValidationErrors>({});
  const [options, setOptions] = React.useState<OrderFormOptionsResponse>(EMPTY_OPTIONS);
  const [catalogProducts, setCatalogProducts] = React.useState<OrderCatalogProduct[]>([]);
  const [catalogTotal, setCatalogTotal] = React.useState(0);
  const [loadingMeta, setLoadingMeta] = React.useState(true);
  const [loadingCatalog, setLoadingCatalog] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      setLoadingMeta(true);
      try {
        const formOptions = await ordersApi.getFormOptions();
        if (cancelled) return;
        const { mergeStatusSelectOptions } = await import(
          '@/features/orders/lib/order-status-hierarchy'
        );
        const statuses = mergeStatusSelectOptions(formOptions.statuses);
        const merged = { ...formOptions, statuses };
        setOptions(merged);
        dispatch({
          type: 'hydrate_defaults',
          courierNote: merged.defaultCourierNote,
          shipping: merged.defaultShipping,
        });
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoadingCatalog(true);
        try {
          const page = await inventoryApi.listProducts({
            filter: 'active',
            search: state.catalogSearch.trim() || undefined,
            category: state.catalogCategory || undefined,
            page: 1,
            pageSize: 40,
          });
          if (cancelled) return;
          setCatalogTotal(page.total);
          const details = await Promise.all(
            page.items.map(async (row) => {
              try {
                return await inventoryApi.getProduct(row.id);
              } catch {
                return null;
              }
            }),
          );
          if (cancelled) return;
          setCatalogProducts(
            details
              .filter((d): d is NonNullable<typeof d> => Boolean(d))
              .map(mapDetailToCatalog),
          );
        } catch {
          if (!cancelled) {
            setCatalogProducts([]);
            setCatalogTotal(0);
          }
        } finally {
          if (!cancelled) setLoadingCatalog(false);
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [state.catalogSearch, state.catalogCategory]);

  const totals = React.useMemo<CreateOrderTotals>(() => calcCreateOrderTotals(state), [state]);

  const patch = React.useCallback((patch: Partial<CreateOrderFormState>) => {
    dispatch({ type: 'patch', patch });
  }, []);

  const reset = React.useCallback(() => {
    dispatch({ type: 'reset' });
    setErrors({});
    dispatch({
      type: 'hydrate_defaults',
      courierNote: options.defaultCourierNote,
      shipping: options.defaultShipping,
    });
  }, [options]);

  const lookupCustomer = React.useCallback(async (phoneOverride?: string) => {
    const phone = (phoneOverride ?? state.mobile).trim();
    if (!phone) {
      dispatch({ type: 'lookup_customer_result', profile: null });
      return;
    }
    const profile = await ordersApi.lookupCustomer(phone);
    dispatch({ type: 'lookup_customer_result', profile });
  }, [state.mobile]);

  const addLineItemFromProduct = React.useCallback(
    async (productId: string, variationId?: string) => {
      let product = catalogProducts.find((p) => p.id === productId);
      if (!product) {
        const detail = await inventoryApi.getProduct(productId);
        if (!detail) return;
        product = mapDetailToCatalog(detail);
      }
      dispatch({ type: 'add_line_item_from_product', product, variationId });
    },
    [catalogProducts],
  );

  const updateLineItem = React.useCallback(
    (id: string, patch: Partial<CreateOrderLineItem>) => {
      dispatch({ type: 'update_line_item', id, patch, catalog: catalogProducts });
    },
    [catalogProducts],
  );

  const removeLineItem = React.useCallback((id: string) => {
    dispatch({ type: 'remove_line_item', id });
  }, []);

  const applyCoupon = React.useCallback(async () => {
    const code = state.couponCode.trim();
    if (!code) {
      dispatch({ type: 'apply_coupon', applied: false });
      return { ok: false as const, message: 'Enter a coupon code' };
    }
    const subtotal = totals.subtotal;
    const result = await couponsApi.validate(code, subtotal);
    if (!result.valid) {
      dispatch({ type: 'apply_coupon', applied: false });
      return { ok: false as const, message: result.message || 'Invalid coupon' };
    }
    dispatch({
      type: 'apply_coupon',
      applied: true,
      discountAmount: result.discount,
      code: result.coupon?.code ?? code,
    });
    return { ok: true as const, discount: result.discount, coupon: result.coupon };
  }, [state.couponCode, totals.subtotal]);

  const setPathaoLocation = React.useCallback((location: PathaoLocation | null) => {
    dispatch({ type: 'set_pathao', location });
  }, []);

  const setCarrybeeLocation = React.useCallback((location: CarrybeeLocation | null) => {
    dispatch({ type: 'set_carrybee', location });
  }, []);

  const addAttachment = React.useCallback((name: string, url: string) => {
    dispatch({ type: 'add_attachment', name, url });
  }, []);

  const removeAttachment = React.useCallback((name: string) => {
    dispatch({ type: 'remove_attachment', name });
  }, []);

  const uploadAttachment = React.useCallback(async (file: File) => {
    const { env } = await import('@/config/env');
    const formData = new FormData();
    formData.append('file', file);
    const { getStoredAccessToken } = await import('@/lib/auth-token');
    const { getTenantSlugFromHost } = await import('@/lib/tenant');
    const token = getStoredAccessToken();
    const headers: HeadersInit = {};
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
      throw new Error(
        typeof body.message === 'string' ? body.message : 'Upload failed',
      );
    }
    const uploaded = (await res.json()) as { name: string; url: string };
    dispatch({ type: 'add_attachment', name: uploaded.name, url: uploaded.url });
    return uploaded;
  }, []);

  const validate = React.useCallback(() => {
    const nextErrors = validateForm(state);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [state]);

  const clearFieldError = React.useCallback((field: keyof CreateOrderValidationErrors) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const getProductById = React.useCallback(
    (id: string) => catalogProducts.find((p) => p.id === id),
    [catalogProducts],
  );

  return {
    state,
    totals,
    errors,
    options,
    catalogProducts,
    catalogTotal,
    loadingMeta,
    loadingCatalog,
    getProductById,
    patch,
    reset,
    lookupCustomer,
    addLineItemFromProduct,
    updateLineItem,
    removeLineItem,
    applyCoupon,
    setPathaoLocation,
    setCarrybeeLocation,
    addAttachment,
    removeAttachment,
    uploadAttachment,
    validate,
    clearFieldError,
  };
}

export type CreateOrderFormApi = ReturnType<typeof useCreateOrderForm>;
