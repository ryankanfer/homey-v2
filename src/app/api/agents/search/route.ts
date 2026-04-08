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
 * GET /api/agents/search?email=<exact>
 *
 * Returns whether an agent with the given email exists on homey.advsr.
 * Intentionally minimal — returns only found status and display name.
 * No fuzzy search, no enumeration. Exact email match only.
 * Requires authenticated buyer.
 */
export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.toLowerCase().trim();
    if (!email) return NextResponse.json({ error: 'email param required' }, { status: 400 });

    const admin = adminClient();

    // Look up exact email match in auth.users joined to profiles(role='agent')
    const { data: authUser } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('email', email)
      .eq('role', 'agent')
      .maybeSingle();

    if (!authUser) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      agentId: (authUser as any).id,
      displayName: (authUser as any).full_name ?? 'Your agent',
    });
  } catch (err) {
    console.error('Agent search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
