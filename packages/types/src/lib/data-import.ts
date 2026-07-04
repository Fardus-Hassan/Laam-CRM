import { z } from 'zod';

export const importEntityTypeSchema = z.enum(['customers', 'orders', 'products', 'leads']);
export type ImportEntityType = z.infer<typeof importEntityTypeSchema>;

export const importJobStatusSchema = z.enum([
  'idle',
  'parsing',
  'validating',
  'importing',
  'completed',
  'failed',
]);
export type ImportJobStatus = z.infer<typeof importJobStatusSchema>;

export const importRowErrorSchema = z.object({
  row: z.number(),
  field: z.string().optional(),
  message: z.string(),
});
export type ImportRowError = z.infer<typeof importRowErrorSchema>;

export const importJobResultSchema = z.object({
  entityType: importEntityTypeSchema,
  status: importJobStatusSchema,
  totalRows: z.number(),
  processedRows: z.number(),
  successCount: z.number(),
  errorCount: z.number(),
  errors: z.array(importRowErrorSchema),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
});
export type ImportJobResult = z.infer<typeof importJobResultSchema>;

export const importCustomerRowSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  email: z.string().optional(),
  address: z.string().optional(),
  district: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
});
export type ImportCustomerRow = z.infer<typeof importCustomerRowSchema>;

export const importOrderRowSchema = z.object({
  order_number: z.string().optional(),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(8),
  address: z.string().optional(),
  district: z.string().optional(),
  product_name: z.string().min(1),
  quantity: z.coerce.number().min(1),
  unit_price: z.coerce.number().min(0),
  delivery_charge: z.coerce.number().optional(),
  discount: z.coerce.number().optional(),
  status: z.string().optional(),
  payment_status: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().optional(),
});
export type ImportOrderRow = z.infer<typeof importOrderRowSchema>;
