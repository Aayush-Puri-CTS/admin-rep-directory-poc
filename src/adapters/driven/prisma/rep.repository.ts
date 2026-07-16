import { Rep } from '../../../domain/entities/rep.entity';
import { IRepRepository } from '../../../domain/ports/rep-repository.port';
import { AccessControl } from '../../../domain/value-objects/access-control.vo';
import { PlatformAccessType, RepPlatform } from '../../../domain/value-objects/access-control.vo';
import { RepBusinessInfo } from '../../../domain/value-objects/rep-business-info.vo';
import { RepId } from '../../../domain/value-objects/rep-id.vo';
import { RepPersonalInfo } from '../../../domain/value-objects/rep-personal-info.vo';
import { RepStatus } from '../../../domain/value-objects/rep-status';
import { RepType } from '../../../domain/value-objects/rep-type';
import { OutboxService } from '../../../infrastructure/outbox/outbox.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../infrastructure/tenant/tenant-context';

export class PrismaRepRepository implements IRepRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async findById(id: RepId): Promise<Rep | null> {
    return this.prisma.withTenantTransaction(TenantContext.get(), async (tx) => {
      const row = await tx.rep.findUnique({
        where: { id: id.value },
        include: { platformAccess: true },
      });

      if (!row) return null;

      return Rep.reconstitute({
        id: RepId.of(row.id),
        personalInfo: RepPersonalInfo.create({
          firstName: row.firstName,
          lastName: row.lastName,
          middleName: row.middleName ?? undefined,
          email: row.email,
          cellPhone: row.cellPhone ?? undefined,
          telephone: row.telephone ?? undefined,
          fax: row.fax ?? undefined,
          num800: row.num800 ?? undefined,
          dateOfBirth: row.dateOfBirth ?? undefined,
          ssn: row.ssn ?? undefined,
        }),
        businessInfo: row.businessName
          ? RepBusinessInfo.create({
              businessName: row.businessName,
              businessTaxId: row.businessTaxId ?? undefined,
              businessEmail: row.businessEmail ?? undefined,
            })
          : null,
        status: row.status as RepStatus,
        accessControl: AccessControl.create(
          row.platformAccess.map((a) => ({
            platform: a.platform as RepPlatform,
            accessType: a.accessType as PlatformAccessType,
          })),
        ),
        uplineRepId: row.uplineRepId ? RepId.of(row.uplineRepId) : null,
        repType: row.repType as RepType | null,
        bio: row.bio,
        isEliteBlue: row.isEliteBlue,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });
  }

  async save(rep: Rep): Promise<void> {
    const tenantId = TenantContext.get();

    const events = rep.domainEvents.map((e) => ({
      tenantId,
      eventType: e.type,
      aggregateId: e.repId,
      payload: e.payload ?? {},
      occurredAt: e.occurredAt,
    }));

    const repData = {
      firstName: rep.personalInfo.firstName,
      lastName: rep.personalInfo.lastName,
      middleName: rep.personalInfo.middleName ?? null,
      email: rep.personalInfo.email,
      cellPhone: rep.personalInfo.cellPhone ?? null,
      telephone: rep.personalInfo.telephone ?? null,
      fax: rep.personalInfo.fax ?? null,
      num800: rep.personalInfo.num800 ?? null,
      dateOfBirth: rep.personalInfo.dateOfBirth ?? null,
      ssn: rep.personalInfo.ssn ?? null,
      businessName: rep.businessInfo?.businessName ?? null,
      businessTaxId: rep.businessInfo?.businessTaxId ?? null,
      businessEmail: rep.businessInfo?.businessEmail ?? null,
      status: rep.status,
      repType: rep.repType ?? null,
      bio: rep.bio,
      isEliteBlue: rep.isEliteBlue,
      uplineRepId: rep.uplineRepId?.value ?? null,
    };

    await this.prisma.withTenantTransaction(tenantId, async (tx) => {
      await tx.rep.upsert({
        where: { id: rep.id.value },
        create: { id: rep.id.value, tenantId, ...repData },
        update: repData,
      });

      // Sync platform access as a full replacement
      await tx.repPlatformAccess.deleteMany({ where: { repId: rep.id.value } });
      const accessEntries = rep.accessControl.toArray();
      if (accessEntries.length > 0) {
        await tx.repPlatformAccess.createMany({
          data: accessEntries.map((e) => ({
            tenantId,
            repId: rep.id.value,
            platform: e.platform,
            accessType: e.accessType,
          })),
        });
      }

      await this.outbox.writeAll(events, tx);
    });

    rep.clearDomainEvents();
  }
}
