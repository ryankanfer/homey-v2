import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { clientName, profile, metadata } = await req.json();
    const isRenter = profile?.kind === 'renter' || profile?.mode === 'Rent';

    const vaultDone = Object.entries(profile?.vault ?? {}).filter(([, v]) => v).map(([k]) => k);
    const vaultTotal = isRenter ? 5 : 5;
    const vaultCount = vaultDone.length;

    const lastTouch = metadata?.last_meaningful_touch;
    const daysSinceTouch = lastTouch?.date
      ? Math.floor((Date.now() - new Date(lastTouch.date).getTime()) / 86400000)
      : null;

    const userPrompt = `Client: ${clientName}
Mode: ${isRenter ? 'Renter' : 'Buyer'}
${isRenter
  ? `Budget: $${profile?.max_monthly_rent ?? profile?.budget_monthly ?? '?'}/mo`
  : `Budget: ${profile?.budget_tier ?? '?'}`}
Territory: ${profile?.territory?.join(', ') || 'NYC'}
Timeline: ${isRenter && profile?.move_in_date ? `Move-in ${profile.move_in_date}` : (profile?.timeline ?? 'Unknown')}
Core fear: ${profile?.fear ?? 'Unknown'}${profile?.fear_context ? ` (${profile.fear_context})` : ''}
${profile?.friction_data?.tension !== undefined
  ? `Tension score: ${profile.friction_data.tension}/100 (${profile.friction_data.tension < 35 ? 'FOMO-driven' : profile.friction_data.tension > 65 ? 'loss-averse/overpaying fear' : 'decision paralysis'})`
  : ''}
${profile?.friction_data?.triggers?.length ? `Anxiety triggers: ${profile.friction_data.triggers.join(', ')}` : ''}
${profile?.friction_data?.scenarios?.length ? `Scenario reactions: ${profile.friction_data.scenarios.map((s: any) => `${s.scenario} → ${s.reaction}`).join('; ')}` : ''}
Readiness score: ${profile?.readiness_score ?? 0}/100
Profile complete: ${profile?.is_partial ? 'No' : 'Yes'}
Vault: ${vaultCount}/${vaultTotal} docs ready${vaultDone.length ? ` (${vaultDone.join(', ')})` : ''}
${isRenter && profile?.meets_income_req === false ? `⚠ Does NOT meet 40x income requirement. Using guarantor: ${profile?.using_guarantor ? 'yes' : 'no'}.` : ''}
${metadata?.friction_tag ? `Friction tag: ${metadata.friction_tag.replace(/_/g, ' ')}` : ''}
${metadata?.agent_confidence ? `Agent confidence: ${metadata.agent_confidence.replace(/_/g, ' ')}` : ''}
${daysSinceTouch !== null ? `Last touch: ${daysSinceTouch} days ago via ${lastTouch.type}${lastTouch.summary ? ` — "${lastTouch.summary}"` : ''}` : 'No touch logged yet'}
Profile summary: ${profile?.summary ?? 'Not generated'}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: `You are an elite NYC real estate agent's AI briefing assistant.
Generate a structured intelligence brief for an agent about to engage with their client.
Write in second person to the agent. Be direct, editorial, and ruthlessly specific.

Respond ONLY with valid JSON in exactly this shape (no markdown, no wrapper, just the JSON object):
{
  "narrative": "One editorial sentence summarizing the situation and what the agent should know",
  "next_action": {
    "action": "Specific thing the agent should do next",
    "urgency": "now" | "this_week" | "soon",
    "rationale": "Why this action, why now"
  },
  "risk_signals": [
    { "type": "ghost_risk" | "timing_risk" | "motivation_risk" | "budget_risk" | "readiness_stall", "severity": "low" | "medium" | "high", "reason": "Specific reason based on this client's data" }
  ],
  "coaching_note": "Private strategic note for the agent — what to lead with, what to avoid",
  "momentum": "rising" | "steady" | "falling" | "stalled" | null
}`,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';

    let intelligence;
    try {
      intelligence = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Failed to parse intelligence response' }, { status: 500 });
    }

    intelligence.generated_at = new Date().toISOString();

    return NextResponse.json({ intelligence });
  } catch (err) {
    console.error('Client brief error:', err);
    return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 });
  }
}
