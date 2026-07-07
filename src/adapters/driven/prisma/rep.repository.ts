import { Rep } from '../../../domain/entities/rep.entity';
import { IRepRepository } from '../../../domain/ports/rep-repository.port';
import { RepId } from '../../../domain/value-objects/rep-id.vo';
import { OutboxService } from '../../../infrastructure/outbox/outbox.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export class PrismaRepRepository implements IRepRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async findById(_id: RepId): Promise<Rep | null> {
    // TODO: query reps table and reconstitute the Rep aggregate via Rep.reconstitute()
    throw new Error('PrismaRepRepository.findById not implemented');
  }

  async save(rep: Rep): Promise<void> {
    const events = rep.domainEvents.map((e) => ({
      eventType: e.type,
      aggregateId: e.repId,
      payload: e.payload ?? {},
      occurredAt: e.occurredAt,
    }));

    await this.prisma.client.$transaction(async (tx) => {
      // TODO: upsert the Rep row here — example structure:
      // await tx.rep.upsert({
      //   where: { id: rep.id.value },
      //   create: { id: rep.id.value, firstName: rep.personalInfo.firstName, ... },
      //   update: { firstName: rep.personalInfo.firstName, ... },
      // });

      await this.outbox.writeAll(events, tx);
    });

    rep.clearDomainEvents();
  }
}
