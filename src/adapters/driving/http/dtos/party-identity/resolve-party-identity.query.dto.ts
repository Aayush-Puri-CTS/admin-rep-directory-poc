import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResolvePartyIdentityQueryDto {
  @ApiProperty({ description: 'Keycloak `sub` claim' })
  @IsString()
  @IsNotEmpty()
  keycloakUserId: string;
}
