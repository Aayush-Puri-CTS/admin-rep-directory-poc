import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LinkKeycloakAccountBodyDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Keycloak `sub` claim to link to this Rep' })
  @IsString()
  @IsNotEmpty()
  keycloakUserId: string;
}
