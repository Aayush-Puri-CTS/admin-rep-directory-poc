import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BusinessInfoDto {
  @ApiProperty({ example: 'Smith Insurance LLC' })
  @IsString()
  @MinLength(1)
  businessName: string;

  @ApiPropertyOptional({ example: '12-3456789' })
  @IsOptional()
  @IsString()
  businessTaxId?: string;

  @ApiPropertyOptional({ example: 'contact@smithinsurance.com' })
  @IsOptional()
  @IsEmail()
  businessEmail?: string;
}

export class UpdateBusinessInfoBodyDto {
  @ApiProperty({
    type: BusinessInfoDto,
    nullable: true,
    description: 'Pass null to remove business info entirely',
  })
  // null is explicitly allowed — it means "remove business info"
  @ValidateIf((o: UpdateBusinessInfoBodyDto) => o.businessInfo !== null)
  @ValidateNested()
  @Type(() => BusinessInfoDto)
  businessInfo: BusinessInfoDto | null;
}
