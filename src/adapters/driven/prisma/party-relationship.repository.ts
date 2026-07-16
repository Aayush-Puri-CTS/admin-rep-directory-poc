import { PartyRelationship } from '../../../domain/entities/party-relationship.entity';
import { IPartyRelationshipRepository } from '../../../domain/ports/party-relationship-repository.port';
import { RepId } from '../../../domain/value-objects/rep-id.vo';
import { OutboxService } from '../../../infrastructure/outbox/outbox.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../infrastructure/tenant/tenant-context';

export class PrismaPartyRelationshipRepository implements IPartyRelationshipRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async findGroupsByRepId(_repId: RepId): Promise<PartyRelationship[]> {
    // TODO: query party_relationships table and reconstitute via PartyRelationship.reconstitute()
    // Must run inside prisma.withTenantTransaction(TenantContext.get(), ...) once implemented.
    throw new Error('PrismaPartyRelationshipRepository.findGroupsByRepId not implemented');
  }

  async save(relationship: PartyRelationship): Promise<void> {
    const tenantId = TenantContext.get();

    const events = relationship.domainEvents.map((e) => ({
      tenantId,
      eventType: e.type,
      aggregateId: e.repId,
      payload: e.payload ?? {},
      occurredAt: e.occurredAt,
    }));

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      // TODO: upsert the PartyRelationship row here — example structure:
      // await tx.partyRelationship.upsert({
      //   where: { repId_groupId_relationshipType: { repId: relationship.repId.value, groupId: relationship.groupId, relationshipType: relationship.relationshipType } },
      //   create: { id: relationship.id, tenantId, repId: relationship.repId.value, groupId: relationship.groupId, ... },
      //   update: { endDate: relationship.endDate },
      // });

      await this.outbox.writeAll(events, tx);
    });

    relationship.clearDomainEvents();
  }
}
