/**
 * Distribution hierarchy levels for a Rep.
 * Derived from the `rep_type` filter in the matrix and the explicit `super_ga`
 * field in UpdateAgentPersonalRequest.
 */
export enum RepType {
  AGENT = 'AGENT',
  BROKER = 'BROKER',
  GA = 'GA',
  MGA = 'MGA',
  SUPER_GA = 'SUPER_GA',
}
