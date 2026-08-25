'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { invalidateProductQueryCaches } from '@/features/inventory/data/product-query-cache';

export function useProductMutations() {
  const [isLoading, setIsLoading] = React.useState(false);

  async function createProduct(payload: Parameters<typeof inventoryApi.createProduct>[0]) {
    setIsLoading(true);
    try {
      const product = await inventoryApi.createProduct(payload);
      toast.success(`Product "${product.name}" created`);
      invalidateProductQueryCaches();
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
      const product = await inventoryApi.updateProduct(id, patch);
      invalidateProductQueryCaches();
      return product;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update product');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteProduct(id: string) {
    setIsLoading(true);
    try {
      await inventoryApi.deleteProduct(id);
      toast.success('Product archived');
      invalidateProductQueryCaches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive product');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function hardDeleteProduct(id: string) {
    setIsLoading(true);
    try {
      await inventoryApi.deleteProduct(id, { hard: true });
      toast.success('Product permanently deleted');
      invalidateProductQueryCaches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to permanently delete product');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function restoreProduct(id: string) {
    setIsLoading(true);
    try {
      const product = await inventoryApi.restoreProduct(id);
      toast.success('Product restored');
      invalidateProductQueryCaches();
      return product;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore product');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function adjustStock(
    productId: string,
    payload: Parameters<typeof inventoryApi.adjustStock>[1],
  ) {
    setIsLoading(true);
    try {
      const product = await inventoryApi.adjustStock(productId, payload);
      toast.success('Stock adjusted');
      invalidateProductQueryCaches();
      return product;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to adjust stock');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function uploadProductImage(productId: string, file: File) {
    setIsLoading(true);
    try {
      const product = await inventoryApi.uploadProductImage(productId, file);
      toast.success('Product image uploaded');
      invalidateProductQueryCaches();
      return product;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload product image');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function bulkAction(payload: Parameters<typeof inventoryApi.bulkProductAction>[0]) {
    setIsLoading(true);
    try {
      const result = await inventoryApi.bulkProductAction(payload);
      toast.success(result.message ?? 'Bulk action completed');
      invalidateProductQueryCaches();
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk action failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function createAdjustment(payload: Parameters<typeof inventoryApi.createAdjustment>[0]) {
    setIsLoading(true);
    try {
      await inventoryApi.createAdjustment(payload);
      toast.success('Stock adjusted');
      invalidateProductQueryCaches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to adjust stock');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    hardDeleteProduct,
    restoreProduct,
    adjustStock,
    uploadProductImage,
    bulkAction,
    createAdjustment,
    isLoading,
  };
}
