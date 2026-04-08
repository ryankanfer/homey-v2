import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/agent-clients — agent fetches available buyers not yet connected to them
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if ((profile as any)?.role !== 'agent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = adminClient();

    // Find buyer_ids already connected (any status) to this agent
    const { data: existing } = await admin
      .from('agent_clients')
      .select('client_id')
      .eq('agent_id', user.id);
    const connectedIds = (existing ?? []).map((r: any) => r.client_id);

    // Fetch complete buyer profiles not already connected
    const buyerQuery = admin
      .from('buyer_profiles')
      .select('*, profile:profiles!buyer_profiles_user_id_fkey(full_name)')
      .eq('is_partial', false)
      .order('readiness_score', { ascending: false })
      .limit(50);
    if (connectedIds.length > 0) buyerQuery.not('user_id', 'in', `(${connectedIds.join(',')})`);

    const renterQuery = admin
      .from('renter_profiles')
      .select('*, profile:profiles!renter_profiles_user_id_fkey(full_name)')
      .eq('is_partial', false)
      .order('readiness_score', { ascending: false })
      .limit(50);
    if (connectedIds.length > 0) renterQuery.not('user_id', 'in', `(${connectedIds.join(',')})`);

    const [{ data: buyers }, { data: renters }] = await Promise.all([buyerQuery, renterQuery]);

    return NextResponse.json({
      buyers: (buyers ?? []).map((b: any) => ({ ...b, kind: 'buyer' })),
      renters: (renters ?? []).map((r: any) => ({ ...r, kind: 'renter' })),
    });
  } catch (err) {
    console.error('Browse buyers error:', err);
    return NextResponse.json({ error: 'Failed to fetch buyers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { agentId, clientId } = await req.json();
    if (!agentId || !clientId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    if (user.id !== clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await admin.from('agent_clients').upsert(
      { agent_id: agentId, client_id: clientId, status: 'pending' },
      { onConflict: 'agent_id,client_id' }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Agent-client linkage error:', err);
    return NextResponse.json({ error: 'Failed to create linkage' }, { status: 500 });
  }
}

// PATCH /api/agent-clients — agent sends connection request, or buyer accepts/declines
export async function PATCH(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { agentId, clientId, action } = await req.json();
    if (!agentId || !clientId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const admin = adminClient();

    // Agent sending a connection request
    if (action === 'request') {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if ((profile as any)?.role !== 'agent' || user.id !== agentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { error } = await admin.from('agent_clients').upsert(
        { agent_id: agentId, client_id: clientId, status: 'requested' },
        { onConflict: 'agent_id,client_id' }
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // Buyer accepting or declining
    if (action === 'accept' || action === 'decline') {
      if (user.id !== clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const newStatus = action === 'accept' ? 'active' : 'declined';
      const { error } = await admin
        .from('agent_clients')
        .update({ status: newStatus })
        .eq('agent_id', agentId)
        .eq('client_id', clientId)
        .eq('status', 'requested');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Agent-client patch error:', err);
    return NextResponse.json({ error: 'Failed to update linkage' }, { status: 500 });
  }
}
