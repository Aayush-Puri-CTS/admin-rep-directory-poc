import { INestApplication, MiddlewareConsumer, Module, NestModule, RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { CreateRepHandler } from '../../../application/commands/create-rep.handler';
import { LinkRepToGroupHandler } from '../../../application/commands/link-rep-to-group.handler';
import { RestoreRepHandler } from '../../../application/commands/restore-rep.handler';
import { SoftDeleteRepHandler } from '../../../application/commands/soft-delete-rep.handler';
import { UpdateRepAccessControlHandler } from '../../../application/commands/update-rep-access-control.handler';
import { UpdateRepBusinessInfoHandler } from '../../../application/commands/update-rep-business-info.handler';
import { UpdateRepPersonalInfoHandler } from '../../../application/commands/update-rep-personal-info.handler';
import { GetGroupsServicedByRepHandler } from '../../../application/queries/get-groups-serviced-by-rep.handler';
import { GetRepByIdHandler } from '../../../application/queries/get-rep-by-id.handler';
import { GetRepDirectoryHandler } from '../../../application/queries/get-rep-directory.handler';
import { SearchRepsHandler } from '../../../application/queries/search-reps.handler';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { RepController } from './rep.controller';

const noop = jest.fn().mockResolvedValue(undefined);

function buildProviders() {
  return [
    { provide: CreateRepHandler, useValue: { execute: noop } },
    { provide: UpdateRepPersonalInfoHandler, useValue: { execute: noop } },
    { provide: UpdateRepBusinessInfoHandler, useValue: { execute: noop } },
    { provide: UpdateRepAccessControlHandler, useValue: { execute: noop } },
    { provide: SoftDeleteRepHandler, useValue: { execute: noop } },
    { provide: RestoreRepHandler, useValue: { execute: noop } },
    { provide: LinkRepToGroupHandler, useValue: { execute: noop } },
    { provide: GetRepByIdHandler, useValue: { execute: jest.fn() } },
    { provide: SearchRepsHandler, useValue: { execute: jest.fn().mockResolvedValue([]) } },
    { provide: GetRepDirectoryHandler, useValue: { execute: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }) } },
    { provide: GetGroupsServicedByRepHandler, useValue: { execute: jest.fn().mockResolvedValue([]) } },
  ];
}

// Mirrors AppModule's `consumer.apply(TenantMiddleware).forRoutes('*')` wiring
// (see app.module.ts) so this test exercises the same middleware placement
// production requests go through, without pulling in PrismaModule/NatsModule.
@Module({ controllers: [RepController], providers: buildProviders() })
class TestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

describe('TenantMiddleware wired in front of RepController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ imports: [TestModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => app.close());

  it('returns 400 for POST /reps without X-Tenant-Id', async () => {
    const res = await request(app.getHttpServer())
      .post('/reps')
      .send({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 201 for POST /reps when X-Tenant-Id is present', async () => {
    const res = await request(app.getHttpServer())
      .post('/reps')
      .set('X-Tenant-Id', 'tenant-a')
      .send({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' });
    expect(res.status).toBe(201);
  });

  it('returns 400 for GET /reps without X-Tenant-Id', async () => {
    const res = await request(app.getHttpServer()).get('/reps');
    expect(res.status).toBe(400);
  });
});
