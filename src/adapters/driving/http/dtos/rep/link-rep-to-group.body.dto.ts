import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class LinkRepToGroupBodyDto {
  @IsUUID()
  groupId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
