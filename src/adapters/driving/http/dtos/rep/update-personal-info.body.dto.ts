import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePersonalInfoBodyDto {
  @ApiProperty({ example: 'Jane' })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiPropertyOptional({ example: 'A.' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'jane.smith@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '555-123-4567' })
  @IsOptional()
  @IsString()
  cellPhone?: string;

  @ApiPropertyOptional({ example: '555-987-6543' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional({ example: '555-000-1111' })
  @IsOptional()
  @IsString()
  fax?: string;

  @ApiPropertyOptional({ example: '800-555-9999' })
  @IsOptional()
  @IsString()
  num800?: string;

  @ApiPropertyOptional({ example: '1985-04-12', description: 'ISO 8601 date string' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '123-45-6789', description: 'Social Security Number — handle with care' })
  @IsOptional()
  @IsString()
  ssn?: string;
}
