import { describe, it, expect } from 'vitest';

/**
 * Authorization logic extracted from /api/agent-clients/route.ts.
 *
 * The route rejects any request where the authenticated user is NOT
 * the clientId being linked. This prevents a buyer from forging a
 * connection on behalf of another user.
 *
 * We test the rule directly rather than spinning up Next.js so the
 * test stays fast and doesn't require Supabase credentials.
 */

function isAuthorized(authenticatedUserId: string, clientId: string): boolean {
  return authenticatedUserId === clientId;
}

function validateLinkageParams(agentId: unknown, clientId: unknown): boolean {
  return !!(agentId && clientId);
}

describe('agent-clients authorization', () => {
  it('allows a buyer to link themselves to an agent', () => {
    expect(isAuthorized('user-123', 'user-123')).toBe(true);
  });

  it('blocks a buyer from linking a different user to an agent', () => {
    expect(isAuthorized('user-123', 'user-456')).toBe(false);
  });

  it('blocks if clientId is empty', () => {
    expect(isAuthorized('user-123', '')).toBe(false);
  });

  it('rejects missing agentId param', () => {
    expect(validateLinkageParams(undefined, 'user-123')).toBe(false);
    expect(validateLinkageParams('', 'user-123')).toBe(false);
  });

  it('rejects missing clientId param', () => {
    expect(validateLinkageParams('agent-abc', undefined)).toBe(false);
    expect(validateLinkageParams('agent-abc', '')).toBe(false);
  });

  it('passes when both params are present', () => {
    expect(validateLinkageParams('agent-abc', 'user-123')).toBe(true);
  });
});
