import { PlatformAccessType, RepPlatform } from '../../domain/value-objects/access-control.vo';
import { RepStatus } from '../../domain/value-objects/rep-status';
import { RepType } from '../../domain/value-objects/rep-type';

export interface RepSummaryView {
  repId: string;
  firstName: string;
  lastName: string;
  email: string;
  repType: RepType | null;
  status: RepStatus;
  businessName: string | null;
  isEliteBlue: boolean;
  createdAt: Date;
}

export interface RepDetailView extends RepSummaryView {
  middleName: string | null;
  cellPhone: string | null;
  telephone: string | null;
  fax: string | null;
  num800: string | null;
  dateOfBirth: Date | null;
  businessTaxId: string | null;
  businessEmail: string | null;
  bio: string | null;
  uplineRepId: string | null;
  platformAccess: Array<{ platform: RepPlatform; accessType: PlatformAccessType }>;
  updatedAt: Date;
}

export interface RepSearchFilters {
  name?: string;
  email?: string;
  status?: RepStatus;
  repType?: RepType;
  businessName?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface RepDirectoryPage {
  items: RepSummaryView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IRepReadRepository {
  findById(repId: string): Promise<RepDetailView | null>;
  search(filters: RepSearchFilters): Promise<RepSummaryView[]>;
  findDirectory(pagination: PaginationParams): Promise<RepDirectoryPage>;
}
