import { INestApplication, MiddlewareConsumer, Module, NestModule, RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { ResolvePartyIdentityByKeycloakUserIdHandler } from '../../../application/queries/resolve-party-identity-by-keycloak-user-id.handler';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { PartyIdentityController } from './party-identity.controller';

// Mirrors AppModule's `consumer.apply(TenantMiddleware).forRoutes('*')` wiring — this endpoint
// gets no special treatment, it's gated by the same global middleware as every other route.
function buildTestModule(execute: jest.Mock) {
  @Module({
    controllers: [PartyIdentityController],
    providers: [{ provide: ResolvePartyIdentityByKeycloakUserIdHandler, useValue: { execute } }],
  })
  class TestModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
      consumer.apply(TenantMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
    }
  }
  return TestModule;
}

async function bootstrap(execute: jest.Mock): Promise<INestApplication> {
  const module = await Test.createTestingModule({ imports: [buildTestModule(execute)] }).compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe('PartyIdentityController', () => {
  let app: INestApplication;

  afterEach(async () => app.close());

  it('returns 400 for GET /internal/party-identity without X-Tenant-Id', async () => {
    app = await bootstrap(jest.fn());
    const res = await request(app.getHttpServer()).get('/internal/party-identity?keycloakUserId=sub-123');
    expect(res.status).toBe(400);
  });

  it('returns 404 when no Rep is linked to the keycloakUserId', async () => {
    app = await bootstrap(jest.fn().mockResolvedValue(null));
    const res = await request(app.getHttpServer())
      .get('/internal/party-identity?keycloakUserId=sub-unknown')
      .set('X-Tenant-Id', 'tenant-a');
    expect(res.status).toBe(404);
  });

  it('returns 200 with partyId when resolved', async () => {
    app = await bootstrap(jest.fn().mockResolvedValue({ partyId: 'rep-1' }));
    const res = await request(app.getHttpServer())
      .get('/internal/party-identity?keycloakUserId=sub-123')
      .set('X-Tenant-Id', 'tenant-a');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ partyId: 'rep-1' });
  });

  // No service-to-service access control exists yet for this endpoint (see ADR-004) — this is a
  // standing reminder to add coverage once the platform/gateway team decides on a mechanism.
  it.todo('rejects calls without platform-team-approved service auth once implemented — ADR-004');
});
