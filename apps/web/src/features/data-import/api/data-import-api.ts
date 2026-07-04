import type { ImportEntityType, ImportJobResult } from '@laam/types';

import {
  buildCompletedResult,
  insertCustomerRow,
  insertOrderRow,
  processInChunks,
  validateCustomerRow,
  validateOrderRow,
} from '@/features/data-import/data/import-store';
import { parseCsv } from '@/features/data-import/lib/parse-csv';
import { apiRequest } from '@/lib/api/client';

export type DataImportApi = {
  importCsv: (
    entityType: ImportEntityType,
    fileText: string,
    onProgress: (processed: number, total: number, success: number, errorCount: number) => void,
  ) => Promise<ImportJobResult>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockDataImportApi(): DataImportApi {
  return {
    async importCsv(entityType, fileText, onProgress) {
      await delay(50);
      const { rows } = parseCsv(fileText);
      if (rows.length === 0) {
        return {
          entityType,
          status: 'failed',
          totalRows: 0,
          processedRows: 0,
          successCount: 0,
          errorCount: 1,
          errors: [{ row: 0, message: 'CSV is empty or has no data rows' }],
        };
      }

      if (entityType === 'customers') {
        const progress = await processInChunks(
          rows,
          (row, rowNumber) => {
            const result = validateCustomerRow(row, rowNumber);
            if (result.error) return result.error;
            if (result.data) insertCustomerRow(result.data);
            return null;
          },
          (p) => onProgress(p.processed, rows.length, p.success, p.errors.length),
        );
        return buildCompletedResult('customers', progress);
      }

      if (entityType === 'orders') {
        const progress = await processInChunks(
          rows,
          (row, rowNumber) => {
            const result = validateOrderRow(row, rowNumber);
            if (result.error) return result.error;
            if (result.data) insertOrderRow(result.data);
            return null;
          },
          (p) => onProgress(p.processed, rows.length, p.success, p.errors.length),
        );
        return buildCompletedResult('orders', progress);
      }

      return {
        entityType,
        status: 'failed',
        totalRows: rows.length,
        processedRows: 0,
        successCount: 0,
        errorCount: 1,
        errors: [{ row: 0, message: `${entityType} import is not enabled yet` }],
      };
    },
  };
}

export function createHttpDataImportApi(): DataImportApi {
  return {
    async importCsv(entityType, fileText, onProgress) {
      onProgress(0, 1, 0, 0);
      const result = await apiRequest<ImportJobResult>(`/crm/import/${entityType}`, {
        method: 'POST',
        body: JSON.stringify({ csv: fileText }),
      });
      onProgress(result.processedRows, result.totalRows, result.successCount, result.errorCount);
      return result;
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const dataImportApi = useHttpApi ? createHttpDataImportApi() : createMockDataImportApi();
