import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { RepStatus } from '../../../../../domain/value-objects/rep-status';
import { RepType } from '../../../../../domain/value-objects/rep-type';

export class SearchRepsQueryDto {
  @ApiPropertyOptional({ example: 'Smith', description: 'Case-insensitive match against first or last name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'jane.smith@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: RepStatus, enumName: 'RepStatus' })
  @IsOptional()
  @IsEnum(RepStatus)
  status?: RepStatus;

  @ApiPropertyOptional({ enum: RepType, enumName: 'RepType' })
  @IsOptional()
  @IsEnum(RepType)
  repType?: RepType;

  @ApiPropertyOptional({ example: 'Smith Insurance', description: 'Case-insensitive contains match' })
  @IsOptional()
  @IsString()
  businessName?: string;
}
