import { IsEmail, IsOptional, IsString, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BusinessInfoDto {
  @IsString()
  @MinLength(1)
  businessName: string;

  @IsOptional()
  @IsString()
  businessTaxId?: string;

  @IsOptional()
  @IsEmail()
  businessEmail?: string;
}

export class UpdateBusinessInfoBodyDto {
  // null is explicitly allowed — it means "remove business info"
  @ValidateIf((o: UpdateBusinessInfoBodyDto) => o.businessInfo !== null)
  @ValidateNested()
  @Type(() => BusinessInfoDto)
  businessInfo: BusinessInfoDto | null;
}
