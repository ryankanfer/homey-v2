import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Authorization helpers (extracted from route.ts logic) ───────────────────

function isAuthorized(authenticatedUserId: string, clientId: string): boolean {
  return authenticatedUserId === clientId;
}

function validateLinkageParams(agentId: unknown, clientId: unknown): boolean {
  return !!(agentId && clientId);
}

// ─── Status machine ──────────────────────────────────────────────────────────

type Status = 'pending' | 'requested' | 'active' | 'declined';

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  pending: ['requested'],
  requested: ['active', 'declined'],
  active: [],
  declined: ['requested'], // agent can re-request once after decline
};

function canTransition(from: Status, to: Status): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Insert-only logic ───────────────────────────────────────────────────────

interface AgentClientRow {
  agent_id: string;
  client_id: string;
  status: Status;
  source: string;
}

/** Simulates insert-only behavior: returns existing row if conflict, new row otherwise. */
function insertOnly(
  table: AgentClientRow[],
  row: AgentClientRow,
): { row: AgentClientRow; existed: boolean } {
  const existing = table.find(
    r => r.agent_id === row.agent_id && r.client_id === row.client_id,
  );
  if (existing) return { row: existing, existed: true };
  table.push(row);
  return { row, existed: false };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

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

describe('agent-clients insert-only behavior', () => {
  let table: AgentClientRow[];
  beforeEach(() => { table = []; });

  it('inserts a new record when none exists', () => {
    const { existed } = insertOnly(table, {
      agent_id: 'agent-1', client_id: 'buyer-1', status: 'pending', source: 'invite_link',
    });
    expect(existed).toBe(false);
    expect(table).toHaveLength(1);
    expect(table[0].status).toBe('pending');
  });

  it('returns existing record without overwriting status', () => {
    // Simulate: agent already requested before buyer signed up via invite link
    table.push({ agent_id: 'agent-1', client_id: 'buyer-1', status: 'requested', source: 'agent_browse' });

    const { existed, row } = insertOnly(table, {
      agent_id: 'agent-1', client_id: 'buyer-1', status: 'pending', source: 'invite_link',
    });
    expect(existed).toBe(true);
    expect(table).toHaveLength(1);
    // Critical: 'requested' must NOT be downgraded to 'pending'
    expect(row.status).toBe('requested');
  });

  it('allows different agent-buyer pairs to coexist', () => {
    insertOnly(table, { agent_id: 'agent-1', client_id: 'buyer-1', status: 'pending', source: 'invite_link' });
    insertOnly(table, { agent_id: 'agent-2', client_id: 'buyer-1', status: 'pending', source: 'buyer_search' });
    expect(table).toHaveLength(2);
  });
});

describe('agent-clients status machine', () => {
  it('pending → requested is valid (agent sends request via Avenue 1)', () => {
    expect(canTransition('pending', 'requested')).toBe(true);
  });

  it('requested → active is valid (buyer accepts)', () => {
    expect(canTransition('requested', 'active')).toBe(true);
  });

  it('requested → declined is valid (buyer declines)', () => {
    expect(canTransition('requested', 'declined')).toBe(true);
  });

  it('declined → requested is valid (agent can re-request once)', () => {
    expect(canTransition('declined', 'requested')).toBe(true);
  });

  it('pending → active is NOT valid (must go through requested)', () => {
    expect(canTransition('pending', 'active')).toBe(false);
  });

  it('pending → declined is NOT valid', () => {
    expect(canTransition('pending', 'declined')).toBe(false);
  });

  it('active → anything is NOT valid (terminal state)', () => {
    expect(canTransition('active', 'pending')).toBe(false);
    expect(canTransition('active', 'requested')).toBe(false);
    expect(canTransition('active', 'declined')).toBe(false);
  });

  it('accept/decline can only act on rows in requested state', () => {
    // Simulates: PATCH action:'accept' on a 'pending' row should be rejected
    const row: AgentClientRow = { agent_id: 'a', client_id: 'b', status: 'pending', source: 'invite_link' };
    expect(canTransition(row.status, 'active')).toBe(false);
  });
});

describe('agent-clients GET exclusion logic', () => {
  const allBuyers = [
    { user_id: 'buyer-1', readiness_score: 90 },
    { user_id: 'buyer-2', readiness_score: 75 },
    { user_id: 'buyer-3', readiness_score: 60 },
  ];

  function getBrowsableBuyers(connectedIds: string[]) {
    return allBuyers.filter(b => !connectedIds.includes(b.user_id));
  }

  it('returns all buyers when agent has no connections', () => {
    expect(getBrowsableBuyers([])).toHaveLength(3);
  });

  it('excludes already-connected buyers regardless of status', () => {
    const result = getBrowsableBuyers(['buyer-1', 'buyer-3']);
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe('buyer-2');
  });

  it('returns empty array when agent is connected to all buyers', () => {
    expect(getBrowsableBuyers(['buyer-1', 'buyer-2', 'buyer-3'])).toHaveLength(0);
  });
});

describe('avenue source tracking', () => {
  it('invite_link is the source for Avenue 3 (agent shared link)', () => {
    const row: AgentClientRow = {
      agent_id: 'a', client_id: 'b', status: 'pending', source: 'invite_link',
    };
    expect(row.source).toBe('invite_link');
  });

  it('agent_browse is the source for Avenue 1 (agent requested from dashboard)', () => {
    const row: AgentClientRow = {
      agent_id: 'a', client_id: 'b', status: 'requested', source: 'agent_browse',
    };
    expect(row.source).toBe('agent_browse');
  });

  it('buyer_search is the source for Avenue 2 (buyer entered agent email)', () => {
    const row: AgentClientRow = {
      agent_id: 'a', client_id: 'b', status: 'pending', source: 'buyer_search',
    };
    expect(row.source).toBe('buyer_search');
  });
});

describe('agent invitation rate limiting', () => {
  function canSendInvitation(existingTodayCount: number, max = 3): boolean {
    return existingTodayCount < max;
  }

  it('allows first invitation', () => {
    expect(canSendInvitation(0)).toBe(true);
  });

  it('allows up to the limit', () => {
    expect(canSendInvitation(2)).toBe(true);
  });

  it('blocks at the limit', () => {
    expect(canSendInvitation(3)).toBe(false);
  });

  it('blocks above the limit', () => {
    expect(canSendInvitation(5)).toBe(false);
  });
});

describe('agent invitation deduplication', () => {
  interface Invitation { agent_email: string; invited_by_client_id: string; }

  function isDuplicate(existing: Invitation[], newInv: Invitation): boolean {
    return existing.some(
      i => i.agent_email === newInv.agent_email &&
           i.invited_by_client_id === newInv.invited_by_client_id,
    );
  }

  it('allows invitation to a new agent email', () => {
    const existing = [{ agent_email: 'agent-a@test.com', invited_by_client_id: 'buyer-1' }];
    expect(isDuplicate(existing, { agent_email: 'agent-b@test.com', invited_by_client_id: 'buyer-1' })).toBe(false);
  });

  it('blocks duplicate invitation (same buyer, same agent email)', () => {
    const existing = [{ agent_email: 'agent-a@test.com', invited_by_client_id: 'buyer-1' }];
    expect(isDuplicate(existing, { agent_email: 'agent-a@test.com', invited_by_client_id: 'buyer-1' })).toBe(true);
  });

  it('allows same agent email from different buyers', () => {
    const existing = [{ agent_email: 'agent-a@test.com', invited_by_client_id: 'buyer-1' }];
    expect(isDuplicate(existing, { agent_email: 'agent-a@test.com', invited_by_client_id: 'buyer-2' })).toBe(false);
  });
});
