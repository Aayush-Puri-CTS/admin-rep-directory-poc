import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ResolvePartyIdentityByKeycloakUserIdHandler } from '../../../application/queries/resolve-party-identity-by-keycloak-user-id.handler';

import { ResolvePartyIdentityQueryDto } from './dtos/party-identity/resolve-party-identity.query.dto';

// TODO(platform-team, ADR-004): this endpoint is called by the gateway/Lambda Authorizer to
// resolve party_id BEFORE the normal per-request auth context exists — it cannot use end-user
// JWT auth. It still requires X-Tenant-Id (enforced by the global TenantMiddleware) because the
// gateway already knows tenantId from the JWT issuer (ADR-002), but nothing today stops any other
// caller who can reach this route + guess/enumerate keycloakUserId values from resolving party_id.
// Needs a shared-secret header, mTLS, or network-level restriction (e.g. an ALB rule limiting
// /internal/* to the gateway's egress IP/VPC) — decided with the platform/gateway team, not
// invented here. Do not expose this route beyond local dev / a locked-down internal network
// until that's in place.
@ApiTags('Internal — Party Identity Resolution (interim, see ADR-004)')
@Controller('internal/party-identity')
export class PartyIdentityController {
  constructor(
    private readonly resolvePartyIdentityHandler: ResolvePartyIdentityByKeycloakUserIdHandler,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Resolve party_id (Rep.id) by keycloakUserId, scoped to the tenant in X-Tenant-Id',
  })
  @ApiResponse({ status: 200, description: 'Resolved', schema: { example: { partyId: 'uuid' } } })
  @ApiResponse({ status: 404, description: 'No Rep linked to this keycloakUserId in this tenant' })
  async resolve(@Query() query: ResolvePartyIdentityQueryDto) {
    const result = await this.resolvePartyIdentityHandler.execute({
      keycloakUserId: query.keycloakUserId,
    });
    if (result === null) {
      throw new NotFoundException('No Rep linked to this keycloakUserId in this tenant');
    }
    return result;
  }
}
