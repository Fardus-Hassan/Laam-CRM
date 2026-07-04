'use client';

import * as React from 'react';
import type {
  BulkActionResult,
  CreateOrderPayload,
  DuplicateCheckResult,
  OrderBulkActionPayload,
  OrderDetail,
  UpdateOrderPayload,
} from '@laam/types';
import { toast } from 'sonner';

import { ordersApi } from '@/features/orders/api/orders-api';

export function useOrderMutations() {
  const [isLoading, setIsLoading] = React.useState(false);

  const createOrder = React.useCallback(async (payload: CreateOrderPayload) => {
    setIsLoading(true);
    try {
      const order = await ordersApi.createOrder(payload);
      toast.success(`Order ${order.orderNumber} created`);
      return order;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create order');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateOrder = React.useCallback(async (id: string, patch: UpdateOrderPayload) => {
    setIsLoading(true);
    try {
      const order = await ordersApi.updateOrder(id, patch);
      toast.success('Order updated');
      return order;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkDuplicate = React.useCallback(
    async (phone: string, productIds?: string[]): Promise<DuplicateCheckResult> => {
      return ordersApi.checkDuplicate({ phone, productIds, windowHours: 72 });
    },
    [],
  );

  const bulkAction = React.useCallback(async (payload: OrderBulkActionPayload) => {
    setIsLoading(true);
    try {
      const result: BulkActionResult = await ordersApi.bulkAction(payload);
      toast.success(result.message ?? `Updated ${result.successCount} order(s)`);
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk action failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bulkSetFollowUp = React.useCallback(async (orderIds: string[], followUpDate: string) => {
    setIsLoading(true);
    try {
      const result: BulkActionResult = await ordersApi.bulkSetFollowUp(orderIds, followUpDate);
      toast.success(result.message ?? `Follow-up set for ${result.successCount} order(s)`);
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set follow-up');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateNote = React.useCallback(async (orderId: string, note: string) => {
    await ordersApi.updateOrderNote(orderId, note);
    toast.success('Note saved');
  }, []);

  return { isLoading, createOrder, updateOrder, checkDuplicate, bulkAction, bulkSetFollowUp, updateNote };
}

export function useOrderDetailMutations(order: OrderDetail | null, onUpdated?: (order: OrderDetail) => void) {
  const { updateOrder, isLoading } = useOrderMutations();

  const confirmOrder = React.useCallback(async () => {
    if (!order) return;
    const updated = await updateOrder(order.id, { status: 'confirmed' });
    onUpdated?.(updated);
  }, [order, onUpdated, updateOrder]);

  const cancelOrder = React.useCallback(async () => {
    if (!order) return;
    const updated = await updateOrder(order.id, { status: 'cancelled' });
    onUpdated?.(updated);
  }, [order, onUpdated, updateOrder]);

  const changeStatus = React.useCallback(
    async (status: string) => {
      if (!order) return;
      const updated = await updateOrder(order.id, {
        status: status as OrderDetail['status'],
      });
      onUpdated?.(updated);
    },
    [order, onUpdated, updateOrder],
  );

  return { isLoading, confirmOrder, cancelOrder, changeStatus, updateOrder };
}
