import { BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { TenantContext } from '../../../../infrastructure/tenant/tenant-context';
import { TenantMiddleware } from './tenant.middleware';

function makeRequest(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

describe('TenantMiddleware', () => {
  const middleware = new TenantMiddleware();

  it('throws BadRequestException (400) when X-Tenant-Id is missing', () => {
    const next = jest.fn();
    expect(() => middleware.use(makeRequest(), {} as Response, next)).toThrow(BadRequestException);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws BadRequestException (400) when X-Tenant-Id is an empty string', () => {
    const next = jest.fn();
    expect(() => middleware.use(makeRequest({ 'x-tenant-id': '' }), {} as Response, next)).toThrow(
      BadRequestException,
    );
  });

  it('activates TenantContext and calls next() when X-Tenant-Id is present', () => {
    const next = jest.fn(() => {
      expect(TenantContext.get()).toBe('tenant-a');
    });
    middleware.use(makeRequest({ 'x-tenant-id': 'tenant-a' }), {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
