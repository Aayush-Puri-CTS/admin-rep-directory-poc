import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from '../../../../infrastructure/tenant/tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const tenantId = req.headers['x-tenant-id'];
    if (typeof tenantId !== 'string' || !tenantId) {
      throw new BadRequestException('X-Tenant-Id header is required');
    }
    TenantContext.run(tenantId, () => next());
  }
}
