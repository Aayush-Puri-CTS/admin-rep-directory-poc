import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PlatformAccessType, RepPlatform } from '../../../../../domain/value-objects/access-control.vo';

export class PlatformAccessEntryDto {
  @ApiProperty({ enum: RepPlatform, enumName: 'RepPlatform' })
  @IsEnum(RepPlatform)
  platform: RepPlatform;

  @ApiProperty({ enum: PlatformAccessType, enumName: 'PlatformAccessType' })
  @IsEnum(PlatformAccessType)
  accessType: PlatformAccessType;
}

export class UpdateAccessControlBodyDto {
  @ApiProperty({
    type: [PlatformAccessEntryDto],
    description: 'Full replacement of all platform access entries for the Rep',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformAccessEntryDto)
  entries: PlatformAccessEntryDto[];
}
