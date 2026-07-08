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
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Reps')
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
  @ApiOperation({ summary: 'Create a new Rep' })
  @ApiResponse({ status: 201, description: 'Rep created', schema: { example: { repId: 'uuid' } } })
  @ApiResponse({ status: 400, description: 'Validation error' })
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
  @ApiOperation({ summary: 'Search / filter Reps', description: 'All filters are optional and AND-combined' })
  @ApiResponse({ status: 200, description: 'Matching Reps' })
  @ApiResponse({ status: 400, description: 'Invalid filter value' })
  async searchReps(@Query() query: SearchRepsQueryDto) {
    return this.searchRepsHandler.execute(query);
  }

  @Get()
  @ApiOperation({ summary: 'Paginated Rep directory', description: 'Lists all non-deleted Reps; defaults to page 1, page size 20' })
  @ApiResponse({ status: 200, description: 'Directory page' })
  @ApiResponse({ status: 400, description: 'Invalid pagination params' })
  async getDirectory(@Query() query: DirectoryQueryDto) {
    return this.getRepDirectoryHandler.execute(query);
  }

  @Get(':repId')
  @ApiOperation({ summary: 'Get a Rep by ID' })
  @ApiParam({ name: 'repId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Rep detail view' })
  @ApiResponse({ status: 404, description: 'Rep not found' })
  async getRepById(@Param('repId') repId: string) {
    const rep = await this.getRepByIdHandler.execute({ repId });
    if (rep === null) throw new NotFoundException(`Rep ${repId} not found`);
    return rep;
  }

  @Patch(':repId/personal-info')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Replace personal info for a Rep' })
  @ApiParam({ name: 'repId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Rep not found' })
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
  @ApiOperation({ summary: 'Replace business info for a Rep', description: 'Send `null` for `businessInfo` to remove it entirely' })
  @ApiParam({ name: 'repId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Rep not found' })
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
  @ApiOperation({ summary: 'Replace all platform access entries for a Rep' })
  @ApiParam({ name: 'repId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Rep not found' })
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
  @ApiOperation({ summary: 'Soft-delete a Rep', description: 'Data is retained; recoverable via the restore endpoint' })
  @ApiParam({ name: 'repId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Soft-deleted' })
  @ApiResponse({ status: 404, description: 'Rep not found' })
  async softDeleteRep(@Param('repId') repId: string): Promise<void> {
    await this.softDeleteRepHandler
      .execute({ repId })
      .catch((err: unknown) => this.rethrowAsHttp(err));
  }

  @Post(':repId/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restore a soft-deleted Rep' })
  @ApiParam({ name: 'repId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Restored' })
  @ApiResponse({ status: 404, description: 'Rep not found' })
  async restoreRep(@Param('repId') repId: string): Promise<void> {
    await this.restoreRepHandler
      .execute({ repId })
      .catch((err: unknown) => this.rethrowAsHttp(err));
  }

  @Post(':repId/groups')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link a Rep to a Group (Employer)' })
  @ApiParam({ name: 'repId', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Relationship created', schema: { example: { relationshipId: 'uuid' } } })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Rep or Group not found' })
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
  @ApiOperation({ summary: 'Get Groups serviced by a Rep' })
  @ApiParam({ name: 'repId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of Groups' })
  @ApiResponse({ status: 404, description: 'Rep not found' })
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
