import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';

import { RequestWithAuth } from './decorators';
import { resolveTenantSlugFromRequest } from './tenant.util';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: RequestWithAuth, _res: Response, next: NextFunction) {
    req.tenantSlug = resolveTenantSlugFromRequest(req);
    next();
  }
}
