import { Module } from '@nestjs/common';

import { ResolvePartyIdentityByKeycloakUserIdHandler } from '../../../application/queries/resolve-party-identity-by-keycloak-user-id.handler';
import { PrismaRepReadRepository } from '../../driven/prisma/rep-read.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

import { PartyIdentityController } from './party-identity.controller';

@Module({
  controllers: [PartyIdentityController],
  providers: [
    {
      provide: ResolvePartyIdentityByKeycloakUserIdHandler,
      useFactory: (prisma: PrismaService) =>
        new ResolvePartyIdentityByKeycloakUserIdHandler(new PrismaRepReadRepository(prisma)),
      inject: [PrismaService],
    },
  ],
})
export class PartyIdentityModule {}
