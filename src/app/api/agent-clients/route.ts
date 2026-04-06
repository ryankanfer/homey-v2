import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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
