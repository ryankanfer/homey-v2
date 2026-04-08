import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * POST /api/agent-invitations/reconcile
 *
 * Fallback called from /auth/callback when a new agent signs in.
 * Checks agent_invitations for any pending invitations that match their
 * email and creates agent_clients rows if the Supabase trigger missed them.
 * This handles edge cases: email typo correction, manual account creation.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only run for agents
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if ((profile as any)?.role !== 'agent') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const admin = adminClient();

    // Find unconverted invitations matching this agent's email
    const { data: pending } = await admin
      .from('agent_invitations')
      .select('id, invited_by_client_id')
      .eq('agent_email', user.email!)
      .is('converted_at', null);

    if (!pending?.length) {
      return NextResponse.json({ ok: true, converted: 0 });
    }

    // Mark all as converted
    await admin
      .from('agent_invitations')
      .update({ converted_at: new Date().toISOString() })
      .eq('agent_email', user.email!)
      .is('converted_at', null);

    // Create agent_clients rows (insert-only, ignore existing)
    const rows = pending.map((inv: any) => ({
      agent_id: user.id,
      client_id: inv.invited_by_client_id,
      status: 'pending',
      source: 'buyer_search',
    }));

    const { error } = await admin
      .from('agent_clients')
      .insert(rows);

    // 23505 = unique constraint violation (record already exists) — not an error here
    if (error && error.code !== '23505') {
      console.error('Reconcile insert error:', error);
    }

    return NextResponse.json({ ok: true, converted: pending.length });
  } catch (err) {
    console.error('Reconcile error:', err);
    return NextResponse.json({ error: 'Reconcile failed' }, { status: 500 });
  }
}
