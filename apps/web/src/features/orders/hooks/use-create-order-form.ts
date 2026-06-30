'use client';

import * as React from 'react';

import {
  DEFAULT_COURIER_NOTE,
  getProductById,
  lookupCustomerByMobile,
  VALID_COUPON_CODE,
} from '@/features/orders/data/mock-create-order';
import {
  calcCreateOrderTotals,
  calcLineSubtotal,
} from '@/features/orders/lib/create-order-calculations';
import type {
  CreateOrderFormState,
  CreateOrderLineItem,
  CreateOrderTotals,
  CreateOrderValidationErrors,
  PathaoLocation,
} from '@/features/orders/lib/create-order-types';

type FormAction =
  | { type: 'patch'; patch: Partial<CreateOrderFormState> }
  | { type: 'lookup_customer' }
  | { type: 'add_line_item' }
  | { type: 'add_line_item_from_product'; productId: string; variationId?: string }
  | { type: 'update_line_item'; id: string; patch: Partial<CreateOrderLineItem> }
  | { type: 'remove_line_item'; id: string }
  | { type: 'apply_coupon' }
  | { type: 'set_pathao'; location: PathaoLocation | null }
  | { type: 'add_attachment'; name: string }
  | { type: 'remove_attachment'; name: string };

function createInitialState(): CreateOrderFormState {
  return {
    mobile: '',
    altMobile: '',
    name: '',
    email: '',
    address: '',
    district: '',
    pathaoLocation: null,
    orderSource: '',
    orderTag: '',
    customerTag: '',
    customerStats: null,
    lineItems: [],
    productSearch: '',
    selectedProductId: '',
    selectedVariationId: '',
    orderStatus: 'pending',
    paymentMethod: 'cod',
    attachmentNames: [],
    courierNote: DEFAULT_COURIER_NOTE,
    packingNote: '',
    orderNote: '',
    utmSource: '',
    utmId: '',
    utmContent: '',
    utmCampaign: '',
    orderDate: new Date(),
    referenceNo: '',
    discountMode: 'amount',
    discountValue: 0,
    shipping: 120,
    advancePayment: 0,
    courierChargedToMe: 0,
    couponCode: '',
    couponApplied: false,
    skipFollowup: false,
  };
}

function nextLineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function reducer(state: CreateOrderFormState, action: FormAction): CreateOrderFormState {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };

    case 'lookup_customer': {
      const profile = lookupCustomerByMobile(state.mobile);
      if (!profile) {
        return { ...state, customerStats: null };
      }

      return {
        ...state,
        name: profile.name,
        email: profile.email,
        address: profile.address,
        district: profile.district,
        orderSource: profile.orderSource,
        customerTag: profile.customerTag,
        customerStats: profile.stats,
      };
    }

    case 'add_line_item': {
      const product = getProductById(state.selectedProductId);
      if (!product) {
        return state;
      }

      const variation =
        product.variations.find((item) => item.id === state.selectedVariationId) ??
        product.variations[0];

      if (!variation) {
        return state;
      }

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
        productSearch: '',
        selectedProductId: '',
        selectedVariationId: '',
      };
    }

    case 'update_line_item': {
      return {
        ...state,
        lineItems: state.lineItems.map((item) => {
          if (item.id !== action.id) {
            return item;
          }

          const next = { ...item, ...action.patch };

          if (action.patch.variationId) {
            const product = getProductById(item.productId);
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
        couponApplied:
          state.couponCode.trim().toUpperCase() === VALID_COUPON_CODE.toUpperCase(),
      };

    case 'add_line_item_from_product': {
      const product = getProductById(action.productId);
      if (!product) {
        return state;
      }

      const variation =
        product.variations.find((item) => item.id === action.variationId) ??
        product.variations[0];

      if (!variation) {
        return state;
      }

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

    case 'add_attachment':
      if (state.attachmentNames.includes(action.name)) {
        return state;
      }
      return {
        ...state,
        attachmentNames: [...state.attachmentNames, action.name],
      };

    case 'remove_attachment':
      return {
        ...state,
        attachmentNames: state.attachmentNames.filter((name) => name !== action.name),
      };

    default:
      return state;
  }
}

function validateForm(state: CreateOrderFormState): CreateOrderValidationErrors {
  const errors: CreateOrderValidationErrors = {};

  if (!state.mobile.trim()) {
    errors.mobile = 'Mobile number is required';
  }

  if (!state.name.trim()) {
    errors.name = 'Customer name is required';
  }

  if (!state.address.trim()) {
    errors.address = 'Address is required';
  }

  if (state.lineItems.length === 0) {
    errors.lineItems = 'Add at least one product';
  }

  if (!state.orderDate) {
    errors.orderDate = 'Order date is required';
  }

  return errors;
}

export function useCreateOrderForm() {
  const [state, dispatch] = React.useReducer(reducer, undefined, createInitialState);
  const [errors, setErrors] = React.useState<CreateOrderValidationErrors>({});

  const totals = React.useMemo<CreateOrderTotals>(
    () => calcCreateOrderTotals(state),
    [state],
  );

  const patch = React.useCallback((patch: Partial<CreateOrderFormState>) => {
    dispatch({ type: 'patch', patch });
  }, []);

  const lookupCustomer = React.useCallback(() => {
    dispatch({ type: 'lookup_customer' });
  }, []);

  const addLineItem = React.useCallback(() => {
    dispatch({ type: 'add_line_item' });
  }, []);

  const addLineItemFromProduct = React.useCallback(
    (productId: string, variationId?: string) => {
      dispatch({ type: 'add_line_item_from_product', productId, variationId });
    },
    [],
  );

  const updateLineItem = React.useCallback(
    (id: string, patch: Partial<CreateOrderLineItem>) => {
      dispatch({ type: 'update_line_item', id, patch });
    },
    [],
  );

  const removeLineItem = React.useCallback((id: string) => {
    dispatch({ type: 'remove_line_item', id });
  }, []);

  const applyCoupon = React.useCallback(() => {
    const applied =
      state.couponCode.trim().toUpperCase() === VALID_COUPON_CODE.toUpperCase();
    dispatch({ type: 'apply_coupon' });
    return applied;
  }, [state.couponCode]);

  const setPathaoLocation = React.useCallback((location: PathaoLocation | null) => {
    dispatch({ type: 'set_pathao', location });
  }, []);

  const addAttachment = React.useCallback((name: string) => {
    dispatch({ type: 'add_attachment', name });
  }, []);

  const removeAttachment = React.useCallback((name: string) => {
    dispatch({ type: 'remove_attachment', name });
  }, []);

  const validate = React.useCallback(() => {
    const nextErrors = validateForm(state);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [state]);

  const clearFieldError = React.useCallback((field: keyof CreateOrderValidationErrors) => {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  return {
    state,
    totals,
    errors,
    patch,
    lookupCustomer,
    addLineItem,
    addLineItemFromProduct,
    updateLineItem,
    removeLineItem,
    applyCoupon,
    setPathaoLocation,
    addAttachment,
    removeAttachment,
    validate,
    clearFieldError,
  };
}

export type CreateOrderFormApi = ReturnType<typeof useCreateOrderForm>;
