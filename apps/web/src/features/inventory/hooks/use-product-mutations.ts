'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { inventoryApi } from '@/features/inventory/api/inventory-api';

export function useProductMutations() {
  const [isLoading, setIsLoading] = React.useState(false);

  async function createProduct(payload: Parameters<typeof inventoryApi.createProduct>[0]) {
    setIsLoading(true);
    try {
      const product = await inventoryApi.createProduct(payload);
      toast.success(`Product "${product.name}" created`);
      return product;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateProduct(id: string, patch: Parameters<typeof inventoryApi.updateProduct>[1]) {
    setIsLoading(true);
    try {
      return await inventoryApi.updateProduct(id, patch);
    } finally {
      setIsLoading(false);
    }
  }

  async function bulkAction(payload: Parameters<typeof inventoryApi.bulkProductAction>[0]) {
    setIsLoading(true);
    try {
      const result = await inventoryApi.bulkProductAction(payload);
      toast.success(result.message ?? 'Bulk action completed');
      return result;
    } finally {
      setIsLoading(false);
    }
  }

  async function createAdjustment(payload: Parameters<typeof inventoryApi.createAdjustment>[0]) {
    setIsLoading(true);
    try {
      await inventoryApi.createAdjustment(payload);
      toast.success('Stock adjusted');
    } finally {
      setIsLoading(false);
    }
  }

  return { createProduct, updateProduct, bulkAction, createAdjustment, isLoading };
}
