import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { signPreviewToken } from '@/lib/preview-token';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const MAX_INVITATIONS_PER_DAY = 3;

/**
 * POST /api/agent-invitations
 *
 * Called when a buyer enters an agent's email and the agent is NOT
 * yet on homey.advsr. Creates an invitation record and sends a warm
 * acquisition email to the agent with a secure buyer profile preview link.
 *
 * Rate limit: max 3 invitations per buyer per 24h.
 * Dedup: unique(agent_email, invited_by_client_id) — no duplicate sends.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Buyer only
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();
    if ((profile as any)?.role === 'agent') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { agentEmail, agentName, buyerProfile } = await req.json();
    if (!agentEmail?.trim()) {
      return NextResponse.json({ error: 'agentEmail required' }, { status: 400 });
    }
    const normalizedEmail = agentEmail.trim().toLowerCase();

    const admin = adminClient();

    // ── Rate limit: max MAX_INVITATIONS_PER_DAY invitations per buyer in 24h ──
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('agent_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('invited_by_client_id', user.id)
      .gte('created_at', since);

    if ((count ?? 0) >= MAX_INVITATIONS_PER_DAY) {
      return NextResponse.json(
        { error: 'Daily invitation limit reached. Try again tomorrow.' },
        { status: 429 },
      );
    }

    // ── Sign a scoped preview token (non-sensitive fields only) ──
    const previewToken = await signPreviewToken({
      clientId: user.id,
      territory: buyerProfile?.territory ?? [],
      budgetTier: buyerProfile?.budgetTier ?? '',
      timeline: buyerProfile?.timeline ?? '',
      mode: buyerProfile?.mode ?? 'Buy',
    });

    // ── Upsert invitation — dedup on (agent_email, invited_by_client_id) ──
    const { error: insertError } = await admin
      .from('agent_invitations')
      .upsert(
        {
          agent_email: normalizedEmail,
          agent_name: agentName?.trim() || null,
          invited_by_client_id: user.id,
          preview_token: previewToken,
        },
        { onConflict: 'agent_email,invited_by_client_id', ignoreDuplicates: false },
      );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // ── Send acquisition email via Resend ──
    const buyerFirstName = (profile as any)?.full_name?.split(' ')[0] ?? 'Your client';
    const previewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/agent-preview/${previewToken}`;
    const agentFirstName = agentName?.split(' ')[0] ?? 'there';

    await sendAgentInvitationEmail({
      to: normalizedEmail,
      agentFirstName,
      buyerFirstName,
      previewUrl,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Agent invitation error:', err);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}

async function sendAgentInvitationEmail({
  to,
  agentFirstName,
  buyerFirstName,
  previewUrl,
}: {
  to: string;
  agentFirstName: string;
  buyerFirstName: string;
  previewUrl: string;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set — skipping agent invitation email');
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(resendKey);

  await resend.emails.send({
    from: 'homey. <hello@homey.advsr>',
    to,
    subject: `${buyerFirstName} just built their buyer profile on homey.`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; color: #1a1a18; background: #faf9f7; padding: 40px;">
        <p style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #8a7f6e; margin-bottom: 32px;">homey. intelligence platform</p>

        <h1 style="font-size: 28px; font-weight: normal; font-style: italic; color: #1a1a18; margin-bottom: 24px; line-height: 1.3;">
          Hi ${agentFirstName} — ${buyerFirstName} just built their buyer profile.
        </h1>

        <p style="font-size: 15px; color: #4a4640; line-height: 1.7; margin-bottom: 24px;">
          They listed you as their agent. Here's a preview of their profile — territory, budget range, and timeline — no sign-up needed to see it.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${previewUrl}" style="display: inline-block; background: #c8b89a; color: #0d0d0b; text-decoration: none; font-size: 11px; font-weight: bold; letter-spacing: 0.2em; text-transform: uppercase; padding: 14px 28px;">
            View ${buyerFirstName}'s Profile Preview →
          </a>
        </div>

        <p style="font-size: 13px; color: #8a7f6e; line-height: 1.6; margin-bottom: 24px;">
          On homey.advsr, you get full access: readiness score, budget precision, territory breakdown, and strategic context. The buyers you see have already profiled themselves — no cold intros, no wasted calls.
        </p>

        <p style="font-size: 13px; color: #8a7f6e;">
          Preview link expires in 48 hours. Questions? Reply to this email.
        </p>
      </div>
    `,
  });
}
