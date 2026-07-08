import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class LinkRepToGroupBodyDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'UUID of the Group (Employer) to link' })
  @IsUUID()
  groupId: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'ISO 8601 date the relationship becomes effective; defaults to now' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}
