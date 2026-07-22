import { Module } from '@nestjs/common';

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
import { PrismaPartyRelationshipRepository } from '../../driven/prisma/party-relationship.repository';
import { PrismaRepReadRepository } from '../../driven/prisma/rep-read.repository';
import { PrismaRepRepository } from '../../driven/prisma/rep.repository';
import { OutboxService } from '../../../infrastructure/outbox/outbox.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RepController } from './rep.controller';

@Module({
  controllers: [RepController],
  providers: [
    OutboxService,
    {
      provide: CreateRepHandler,
      useFactory: (prisma: PrismaService, outbox: OutboxService) =>
        new CreateRepHandler(new PrismaRepRepository(prisma, outbox)),
      inject: [PrismaService, OutboxService],
    },
    {
      provide: UpdateRepPersonalInfoHandler,
      useFactory: (prisma: PrismaService, outbox: OutboxService) =>
        new UpdateRepPersonalInfoHandler(new PrismaRepRepository(prisma, outbox)),
      inject: [PrismaService, OutboxService],
    },
    {
      provide: UpdateRepBusinessInfoHandler,
      useFactory: (prisma: PrismaService, outbox: OutboxService) =>
        new UpdateRepBusinessInfoHandler(new PrismaRepRepository(prisma, outbox)),
      inject: [PrismaService, OutboxService],
    },
    {
      provide: UpdateRepAccessControlHandler,
      useFactory: (prisma: PrismaService, outbox: OutboxService) =>
        new UpdateRepAccessControlHandler(new PrismaRepRepository(prisma, outbox)),
      inject: [PrismaService, OutboxService],
    },
    {
      provide: SoftDeleteRepHandler,
      useFactory: (prisma: PrismaService, outbox: OutboxService) =>
        new SoftDeleteRepHandler(new PrismaRepRepository(prisma, outbox)),
      inject: [PrismaService, OutboxService],
    },
    {
      provide: RestoreRepHandler,
      useFactory: (prisma: PrismaService, outbox: OutboxService) =>
        new RestoreRepHandler(new PrismaRepRepository(prisma, outbox)),
      inject: [PrismaService, OutboxService],
    },
    {
      provide: LinkRepKeycloakAccountHandler,
      useFactory: (prisma: PrismaService, outbox: OutboxService) =>
        new LinkRepKeycloakAccountHandler(new PrismaRepRepository(prisma, outbox)),
      inject: [PrismaService, OutboxService],
    },
    {
      provide: LinkRepToGroupHandler,
      useFactory: (prisma: PrismaService, outbox: OutboxService) =>
        new LinkRepToGroupHandler(
          new PrismaRepRepository(prisma, outbox),
          new PrismaPartyRelationshipRepository(prisma, outbox),
        ),
      inject: [PrismaService, OutboxService],
    },
    {
      provide: GetRepByIdHandler,
      useFactory: (prisma: PrismaService) =>
        new GetRepByIdHandler(new PrismaRepReadRepository(prisma)),
      inject: [PrismaService],
    },
    {
      provide: SearchRepsHandler,
      useFactory: (prisma: PrismaService) =>
        new SearchRepsHandler(new PrismaRepReadRepository(prisma)),
      inject: [PrismaService],
    },
    {
      provide: GetRepDirectoryHandler,
      useFactory: (prisma: PrismaService) =>
        new GetRepDirectoryHandler(new PrismaRepReadRepository(prisma)),
      inject: [PrismaService],
    },
    {
      provide: GetGroupsServicedByRepHandler,
      useFactory: (prisma: PrismaService, outbox: OutboxService) =>
        new GetGroupsServicedByRepHandler(
          new PrismaPartyRelationshipRepository(prisma, outbox),
        ),
      inject: [PrismaService, OutboxService],
    },
  ],
})
export class RepModule {}
