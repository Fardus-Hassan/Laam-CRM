import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@fardus/types';

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'fardus-api',
      version: '0.0.1',
      timestamp: new Date().toISOString(),
    };
  }
}
