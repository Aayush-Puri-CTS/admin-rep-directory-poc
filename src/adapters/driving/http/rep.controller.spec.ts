import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { CreateRepHandler } from '../../../application/commands/create-rep.handler';
import { LinkRepKeycloakAccountHandler } from '../../../application/commands/link-rep-keycloak-account.handler';
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
import { RepStatus } from '../../../domain/value-objects/rep-status';
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
    { provide: LinkRepKeycloakAccountHandler, useValue: { execute: noop } },
    { provide: GetRepByIdHandler, useValue: { execute: jest.fn() } },
    { provide: SearchRepsHandler, useValue: { execute: jest.fn().mockResolvedValue([]) } },
    { provide: GetRepDirectoryHandler, useValue: { execute: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }) } },
    { provide: GetGroupsServicedByRepHandler, useValue: { execute: jest.fn().mockResolvedValue([]) } },
  ];
}

async function bootstrap(providers = buildProviders()): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: [RepController],
    providers,
  }).compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

const VALID_CREATE_BODY = {
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
};

const VALID_PERSONAL_INFO = {
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
};

describe('RepController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await bootstrap();
  });

  afterEach(async () => app.close());

  // ─── POST /reps ─────────────────────────────────────────────────────────────

  describe('POST /reps', () => {
    it('returns 201 with a server-generated repId', async () => {
      const res = await request(app.getHttpServer()).post('/reps').send(VALID_CREATE_BODY);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('repId');
      expect(typeof res.body.repId).toBe('string');
    });

    it('returns 400 when firstName is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/reps')
        .send({ lastName: 'Smith', email: 'alice@example.com' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when email is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/reps')
        .send({ ...VALID_CREATE_BODY, email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('strips unknown fields (whitelist)', async () => {
      const createHandler = { execute: jest.fn().mockResolvedValue(undefined) };
      const localApp = await bootstrap([
        { provide: CreateRepHandler, useValue: createHandler },
        ...buildProviders().filter((p) => p.provide !== CreateRepHandler),
      ]);
      await request(localApp.getHttpServer())
        .post('/reps')
        .send({ ...VALID_CREATE_BODY, unknownField: 'bad' });
      expect(createHandler.execute).toHaveBeenCalledWith(
        expect.not.objectContaining({ unknownField: 'bad' }),
      );
      await localApp.close();
    });
  });

  // ─── GET /reps/search ───────────────────────────────────────────────────────

  describe('GET /reps/search', () => {
    it('returns 200 with results', async () => {
      const res = await request(app.getHttpServer()).get('/reps/search');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('passes status filter to the handler', async () => {
      const searchHandler = { execute: jest.fn().mockResolvedValue([]) };
      const localApp = await bootstrap([
        { provide: SearchRepsHandler, useValue: searchHandler },
        ...buildProviders().filter((p) => p.provide !== SearchRepsHandler),
      ]);
      await request(localApp.getHttpServer())
        .get('/reps/search')
        .query({ status: RepStatus.ACTIVE });
      expect(searchHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({ status: RepStatus.ACTIVE }),
      );
      await localApp.close();
    });

    it('returns 400 for an invalid status enum value', async () => {
      const res = await request(app.getHttpServer())
        .get('/reps/search')
        .query({ status: 'INVALID_STATUS' });
      expect(res.status).toBe(400);
    });
  });

  // ─── GET /reps ──────────────────────────────────────────────────────────────

  describe('GET /reps', () => {
    it('returns 200 with a RepDirectoryPage shape', async () => {
      const res = await request(app.getHttpServer()).get('/reps');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
    });

    it('passes page and pageSize query params', async () => {
      const directoryHandler = { execute: jest.fn().mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 10 }) };
      const localApp = await bootstrap([
        { provide: GetRepDirectoryHandler, useValue: directoryHandler },
        ...buildProviders().filter((p) => p.provide !== GetRepDirectoryHandler),
      ]);
      await request(localApp.getHttpServer()).get('/reps').query({ page: 2, pageSize: 10 });
      expect(directoryHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 10 }),
      );
      await localApp.close();
    });
  });

  // ─── GET /reps/:repId ───────────────────────────────────────────────────────

  describe('GET /reps/:repId', () => {
    it('returns 200 with the rep when found', async () => {
      const view = { repId: 'rep-1', firstName: 'Alice', status: RepStatus.ACTIVE };
      const localApp = await bootstrap([
        { provide: GetRepByIdHandler, useValue: { execute: jest.fn().mockResolvedValue(view) } },
        ...buildProviders().filter((p) => p.provide !== GetRepByIdHandler),
      ]);
      const res = await request(localApp.getHttpServer()).get('/reps/rep-1');
      expect(res.status).toBe(200);
      expect(res.body.repId).toBe('rep-1');
      await localApp.close();
    });

    it('returns 404 when the rep does not exist', async () => {
      const localApp = await bootstrap([
        { provide: GetRepByIdHandler, useValue: { execute: jest.fn().mockResolvedValue(null) } },
        ...buildProviders().filter((p) => p.provide !== GetRepByIdHandler),
      ]);
      const res = await request(localApp.getHttpServer()).get('/reps/rep-missing');
      expect(res.status).toBe(404);
      await localApp.close();
    });
  });

  // ─── PATCH /reps/:repId/personal-info ───────────────────────────────────────

  describe('PATCH /reps/:repId/personal-info', () => {
    it('returns 204 on success', async () => {
      const res = await request(app.getHttpServer())
        .patch('/reps/rep-1/personal-info')
        .send(VALID_PERSONAL_INFO);
      expect(res.status).toBe(204);
    });

    it('returns 400 when firstName is missing', async () => {
      const res = await request(app.getHttpServer())
        .patch('/reps/rep-1/personal-info')
        .send({ lastName: 'Smith', email: 'alice@example.com' });
      expect(res.status).toBe(400);
    });

    it('returns 404 when handler throws a not-found error', async () => {
      const localApp = await bootstrap([
        { provide: UpdateRepPersonalInfoHandler, useValue: { execute: jest.fn().mockRejectedValue(new Error('Rep not found: rep-missing')) } },
        ...buildProviders().filter((p) => p.provide !== UpdateRepPersonalInfoHandler),
      ]);
      const res = await request(localApp.getHttpServer())
        .patch('/reps/rep-missing/personal-info')
        .send(VALID_PERSONAL_INFO);
      expect(res.status).toBe(404);
      await localApp.close();
    });
  });

  // ─── PATCH /reps/:repId/business-info ───────────────────────────────────────

  describe('PATCH /reps/:repId/business-info', () => {
    it('returns 204 when setting business info', async () => {
      const res = await request(app.getHttpServer())
        .patch('/reps/rep-1/business-info')
        .send({ businessInfo: { businessName: 'Acme Corp' } });
      expect(res.status).toBe(204);
    });

    it('returns 204 when clearing business info (null)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/reps/rep-1/business-info')
        .send({ businessInfo: null });
      expect(res.status).toBe(204);
    });
  });

  // ─── PATCH /reps/:repId/access-control ──────────────────────────────────────

  describe('PATCH /reps/:repId/access-control', () => {
    it('returns 204 with valid entries', async () => {
      const res = await request(app.getHttpServer())
        .patch('/reps/rep-1/access-control')
        .send({ entries: [{ platform: 'ENROLLPRIME', accessType: 'ENABLED' }] });
      expect(res.status).toBe(204);
    });

    it('returns 400 when entries contain an invalid platform', async () => {
      const res = await request(app.getHttpServer())
        .patch('/reps/rep-1/access-control')
        .send({ entries: [{ platform: 'INVALID_PLATFORM', accessType: 'ENABLED' }] });
      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE /reps/:repId ────────────────────────────────────────────────────

  describe('DELETE /reps/:repId', () => {
    it('returns 204 on success', async () => {
      const res = await request(app.getHttpServer()).delete('/reps/rep-1');
      expect(res.status).toBe(204);
    });

    it('returns 404 when handler throws not-found', async () => {
      const localApp = await bootstrap([
        { provide: SoftDeleteRepHandler, useValue: { execute: jest.fn().mockRejectedValue(new Error('Rep not found: x')) } },
        ...buildProviders().filter((p) => p.provide !== SoftDeleteRepHandler),
      ]);
      const res = await request(localApp.getHttpServer()).delete('/reps/x');
      expect(res.status).toBe(404);
      await localApp.close();
    });
  });

  // ─── POST /reps/:repId/restore ──────────────────────────────────────────────

  describe('POST /reps/:repId/restore', () => {
    it('returns 204 on success', async () => {
      const res = await request(app.getHttpServer()).post('/reps/rep-1/restore');
      expect(res.status).toBe(204);
    });
  });

  // ─── POST /reps/:repId/groups ───────────────────────────────────────────────

  describe('POST /reps/:repId/groups', () => {
    it('returns 201 with a server-generated relationshipId', async () => {
      const res = await request(app.getHttpServer())
        .post('/reps/rep-1/groups')
        .send({ groupId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('relationshipId');
    });

    it('returns 400 when groupId is not a UUID', async () => {
      const res = await request(app.getHttpServer())
        .post('/reps/rep-1/groups')
        .send({ groupId: 'not-a-uuid' });
      expect(res.status).toBe(400);
    });
  });

  // ─── GET /reps/:repId/groups ────────────────────────────────────────────────

  describe('GET /reps/:repId/groups', () => {
    it('returns 200 with groups list', async () => {
      const res = await request(app.getHttpServer()).get('/reps/rep-1/groups');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
