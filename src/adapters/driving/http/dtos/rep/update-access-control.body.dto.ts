import { IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PlatformAccessType, RepPlatform } from '../../../../../domain/value-objects/access-control.vo';

export class PlatformAccessEntryDto {
  @IsEnum(RepPlatform)
  platform: RepPlatform;

  @IsEnum(PlatformAccessType)
  accessType: PlatformAccessType;
}

export class UpdateAccessControlBodyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformAccessEntryDto)
  entries: PlatformAccessEntryDto[];
}
