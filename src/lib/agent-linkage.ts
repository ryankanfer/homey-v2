/**
 * Shared agent-client linkage utility.
 * Used by /auth/callback (primary) and any future entry point.
 * Centralizes POST /api/agent-clients so the source tracking
 * and insert-only logic only lives in one place.
 */
export async function performAgentLinkage(
  agentId: string,
  clientId: string,
  source: 'invite_link' | 'agent_browse' | 'buyer_search' = 'invite_link',
): Promise<void> {
  if (!agentId || !clientId) return;
  try {
    const res = await fetch('/api/agent-clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, clientId, source }),
    });
    if (!res.ok && res.status !== 409) {
      // 409 = record already exists (insert-only behavior) — not an error
      console.warn('Agent linkage responded with', res.status);
    }
  } catch (err) {
    // Non-fatal: linkage can be reconciled via the auth callback fallback
    console.warn('Agent linkage failed silently', err);
  }
}
