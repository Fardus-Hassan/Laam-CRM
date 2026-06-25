import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@laam/types';

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'laam-api',
      version: '0.0.1',
      timestamp: new Date().toISOString(),
    };
  }
}
