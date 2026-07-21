import { IRepReadRepository, PartyIdentityView } from './rep-read.port';
import { ResolvePartyIdentityByKeycloakUserIdHandler } from './resolve-party-identity-by-keycloak-user-id.handler';

function makeRepo(result: PartyIdentityView | null): IRepReadRepository {
  return {
    findById: jest.fn(),
    search: jest.fn(),
    findDirectory: jest.fn(),
    findByKeycloakUserId: jest.fn<Promise<PartyIdentityView | null>, [string]>().mockResolvedValue(result),
  };
}

describe('ResolvePartyIdentityByKeycloakUserIdHandler', () => {
  it('returns the resolved partyId', async () => {
    const repo = makeRepo({ partyId: 'rep-1' });
    const result = await new ResolvePartyIdentityByKeycloakUserIdHandler(repo).execute({
      keycloakUserId: 'sub-123',
    });
    expect(result).toEqual({ partyId: 'rep-1' });
  });

  it('returns null when nothing is linked to the keycloakUserId', async () => {
    const repo = makeRepo(null);
    const result = await new ResolvePartyIdentityByKeycloakUserIdHandler(repo).execute({
      keycloakUserId: 'sub-unknown',
    });
    expect(result).toBeNull();
  });

  it('queries by the correct keycloakUserId', async () => {
    const repo = makeRepo(null);
    await new ResolvePartyIdentityByKeycloakUserIdHandler(repo).execute({ keycloakUserId: 'sub-42' });
    expect(repo.findByKeycloakUserId).toHaveBeenCalledWith('sub-42');
  });
});
