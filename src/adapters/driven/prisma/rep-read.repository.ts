import { Prisma } from '@prisma/client';
import type { Rep as PrismaRep, RepPlatformAccess } from '@prisma/client';
import {
  IRepReadRepository,
  PaginationParams,
  RepDetailView,
  RepDirectoryPage,
  RepSearchFilters,
  RepSummaryView,
} from '../../../application/queries/rep-read.port';
import { PlatformAccessType, RepPlatform } from '../../../domain/value-objects/access-control.vo';
import { RepStatus } from '../../../domain/value-objects/rep-status';
import { RepType } from '../../../domain/value-objects/rep-type';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../infrastructure/tenant/tenant-context';

type PrismaRepWithAccess = PrismaRep & { platformAccess: RepPlatformAccess[] };

function toSummaryView(row: PrismaRep): RepSummaryView {
  return {
    repId: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    repType: row.repType as RepType | null,
    status: row.status as RepStatus,
    businessName: row.businessName,
    isEliteBlue: row.isEliteBlue,
    createdAt: row.createdAt,
  };
}

function toDetailView(row: PrismaRepWithAccess): RepDetailView {
  return {
    ...toSummaryView(row),
    middleName: row.middleName,
    cellPhone: row.cellPhone,
    telephone: row.telephone,
    fax: row.fax,
    num800: row.num800,
    dateOfBirth: row.dateOfBirth,
    businessTaxId: row.businessTaxId,
    businessEmail: row.businessEmail,
    bio: row.bio,
    uplineRepId: row.uplineRepId,
    platformAccess: row.platformAccess.map((a) => ({
      platform: a.platform as RepPlatform,
      accessType: a.accessType as PlatformAccessType,
    })),
    updatedAt: row.updatedAt,
  };
}

function buildSearchWhere(filters: RepSearchFilters): Prisma.RepWhereInput {
  const where: Prisma.RepWhereInput = {};

  if (filters.name !== undefined) {
    where.OR = [
      { firstName: { contains: filters.name, mode: 'insensitive' } },
      { lastName: { contains: filters.name, mode: 'insensitive' } },
    ];
  }

  if (filters.email !== undefined) {
    where.email = { contains: filters.email, mode: 'insensitive' };
  }

  if (filters.status !== undefined) {
    where.status = filters.status as Prisma.EnumRepStatusFilter['equals'];
  }

  if (filters.repType !== undefined) {
    where.repType = filters.repType as Prisma.EnumRepTypeNullableFilter['equals'];
  }

  if (filters.businessName !== undefined) {
    where.businessName = { contains: filters.businessName, mode: 'insensitive' };
  }

  return where;
}

const DIRECTORY_WHERE: Prisma.RepWhereInput = {
  status: { not: 'SOFT_DELETED' as Prisma.EnumRepStatusFilter['equals'] },
};

export class PrismaRepReadRepository implements IRepReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(repId: string): Promise<RepDetailView | null> {
    return this.prisma.withTenantTransaction(TenantContext.get(), async (tx) => {
      const row = await tx.rep.findUnique({
        where: { id: repId },
        include: { platformAccess: true },
      });
      return row ? toDetailView(row) : null;
    });
  }

  async search(filters: RepSearchFilters): Promise<RepSummaryView[]> {
    return this.prisma.withTenantTransaction(TenantContext.get(), async (tx) => {
      const rows = await tx.rep.findMany({
        where: buildSearchWhere(filters),
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
      return rows.map(toSummaryView);
    });
  }

  async findDirectory(pagination: PaginationParams): Promise<RepDirectoryPage> {
    const skip = (pagination.page - 1) * pagination.pageSize;
    return this.prisma.withTenantTransaction(TenantContext.get(), async (tx) => {
      const [rows, total] = await Promise.all([
        tx.rep.findMany({
          where: DIRECTORY_WHERE,
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
          skip,
          take: pagination.pageSize,
        }),
        tx.rep.count({ where: DIRECTORY_WHERE }),
      ]);
      return {
        items: rows.map(toSummaryView),
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
    });
  }
}
