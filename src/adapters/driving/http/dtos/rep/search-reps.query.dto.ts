import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { RepStatus } from '../../../../../domain/value-objects/rep-status';
import { RepType } from '../../../../../domain/value-objects/rep-type';

export class SearchRepsQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(RepStatus)
  status?: RepStatus;

  @IsOptional()
  @IsEnum(RepType)
  repType?: RepType;

  @IsOptional()
  @IsString()
  businessName?: string;
}
