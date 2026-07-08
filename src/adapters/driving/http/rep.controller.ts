import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

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

import { CreateRepBodyDto } from './dtos/rep/create-rep.body.dto';
import { DirectoryQueryDto } from './dtos/rep/directory.query.dto';
import { LinkRepToGroupBodyDto } from './dtos/rep/link-rep-to-group.body.dto';
import { SearchRepsQueryDto } from './dtos/rep/search-reps.query.dto';
import { UpdateAccessControlBodyDto } from './dtos/rep/update-access-control.body.dto';
import { UpdateBusinessInfoBodyDto } from './dtos/rep/update-business-info.body.dto';
import { UpdatePersonalInfoBodyDto } from './dtos/rep/update-personal-info.body.dto';

@Controller('reps')
export class RepController {
  constructor(
    private readonly createRepHandler: CreateRepHandler,
    private readonly updatePersonalInfoHandler: UpdateRepPersonalInfoHandler,
    private readonly updateBusinessInfoHandler: UpdateRepBusinessInfoHandler,
    private readonly updateAccessControlHandler: UpdateRepAccessControlHandler,
    private readonly softDeleteRepHandler: SoftDeleteRepHandler,
    private readonly restoreRepHandler: RestoreRepHandler,
    private readonly linkRepToGroupHandler: LinkRepToGroupHandler,
    private readonly getRepByIdHandler: GetRepByIdHandler,
    private readonly searchRepsHandler: SearchRepsHandler,
    private readonly getRepDirectoryHandler: GetRepDirectoryHandler,
    private readonly getGroupsServicedByRepHandler: GetGroupsServicedByRepHandler,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRep(@Body() dto: CreateRepBodyDto): Promise<{ repId: string }> {
    const repId = randomUUID();
    await this.createRepHandler.execute({
      repId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      email: dto.email,
      cellPhone: dto.cellPhone,
      telephone: dto.telephone,
      fax: dto.fax,
      num800: dto.num800,
      dateOfBirth: dto.dateOfBirth !== undefined ? new Date(dto.dateOfBirth) : undefined,
      ssn: dto.ssn,
      businessName: dto.businessName,
      businessTaxId: dto.businessTaxId,
      businessEmail: dto.businessEmail,
      uplineRepId: dto.uplineRepId,
      repType: dto.repType,
    });
    return { repId };
  }

  // Declared before :repId to prevent "search" being matched as a path param
  @Get('search')
  async searchReps(@Query() query: SearchRepsQueryDto) {
    return this.searchRepsHandler.execute(query);
  }

  @Get()
  async getDirectory(@Query() query: DirectoryQueryDto) {
    return this.getRepDirectoryHandler.execute(query);
  }

  @Get(':repId')
  async getRepById(@Param('repId') repId: string) {
    const rep = await this.getRepByIdHandler.execute({ repId });
    if (rep === null) throw new NotFoundException(`Rep ${repId} not found`);
    return rep;
  }

  @Patch(':repId/personal-info')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePersonalInfo(
    @Param('repId') repId: string,
    @Body() dto: UpdatePersonalInfoBodyDto,
  ): Promise<void> {
    await this.updatePersonalInfoHandler
      .execute({
        repId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        email: dto.email,
        cellPhone: dto.cellPhone,
        telephone: dto.telephone,
        fax: dto.fax,
        num800: dto.num800,
        dateOfBirth: dto.dateOfBirth !== undefined ? new Date(dto.dateOfBirth) : undefined,
        ssn: dto.ssn,
      })
      .catch((err: unknown) => this.rethrowAsHttp(err));
  }

  @Patch(':repId/business-info')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateBusinessInfo(
    @Param('repId') repId: string,
    @Body() dto: UpdateBusinessInfoBodyDto,
  ): Promise<void> {
    await this.updateBusinessInfoHandler
      .execute({
        repId,
        businessInfo: dto.businessInfo
          ? {
              businessName: dto.businessInfo.businessName,
              businessTaxId: dto.businessInfo.businessTaxId,
              businessEmail: dto.businessInfo.businessEmail,
            }
          : null,
      })
      .catch((err: unknown) => this.rethrowAsHttp(err));
  }

  @Patch(':repId/access-control')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateAccessControl(
    @Param('repId') repId: string,
    @Body() dto: UpdateAccessControlBodyDto,
  ): Promise<void> {
    await this.updateAccessControlHandler
      .execute({ repId, entries: dto.entries })
      .catch((err: unknown) => this.rethrowAsHttp(err));
  }

  @Delete(':repId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeleteRep(@Param('repId') repId: string): Promise<void> {
    await this.softDeleteRepHandler
      .execute({ repId })
      .catch((err: unknown) => this.rethrowAsHttp(err));
  }

  @Post(':repId/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  async restoreRep(@Param('repId') repId: string): Promise<void> {
    await this.restoreRepHandler
      .execute({ repId })
      .catch((err: unknown) => this.rethrowAsHttp(err));
  }

  @Post(':repId/groups')
  @HttpCode(HttpStatus.CREATED)
  async linkRepToGroup(
    @Param('repId') repId: string,
    @Body() dto: LinkRepToGroupBodyDto,
  ): Promise<{ relationshipId: string }> {
    const relationshipId = randomUUID();
    await this.linkRepToGroupHandler
      .execute({
        relationshipId,
        repId,
        groupId: dto.groupId,
        startDate: dto.startDate !== undefined ? new Date(dto.startDate) : undefined,
      })
      .catch((err: unknown) => this.rethrowAsHttp(err));
    return { relationshipId };
  }

  @Get(':repId/groups')
  async getGroupsServicedByRep(@Param('repId') repId: string) {
    return this.getGroupsServicedByRepHandler.execute({ repId });
  }

  private rethrowAsHttp(err: unknown): never {
    if (err instanceof Error && /not found/i.test(err.message)) {
      throw new NotFoundException(err.message);
    }
    throw err;
  }
}
