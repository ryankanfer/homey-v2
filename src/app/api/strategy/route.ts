import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { UserProfile } from '@/types/profile';
import { fetchBuildingIntelligence } from '@/lib/realplus';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface StrategyRequestBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
  profile: Pick<UserProfile, 'mode' | 'timeline' | 'budgetTier' | 'territory' | 'fear' | 'frictionData'>;
  isUrlAnalysis?: boolean;
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

export async function POST(req: Request) {
  try {
    const body: StrategyRequestBody = await req.json();
    const { messages, profile, isUrlAnalysis } = body;

    let systemPrompt = `You are a real estate strategy intelligence agent for homey.
Your focus is on negotiation, deal mechanics, and NYC-specific real estate logic.
The user is a ${profile.mode || 'Buyer'}.
Timeline: ${profile.timeline || 'Unknown'}
Budget Ceiling: ${profile.budgetTier || 'Unknown'}
Territory: ${profile.territory?.join(', ') || 'NYC'}
Core anxiety: ${profile.fear || 'Unknown'}
${profile.frictionData?.tension !== undefined ? `Risk disposition: ${profile.frictionData.tension < 35 ? 'FOMO-driven (fears missing the perfect place)' : profile.frictionData.tension > 65 ? 'Overpaying-averse (fears paying too much)' : 'Decision-paralyzed (fears making the wrong call)'}` : ''}
${profile.frictionData?.triggers?.length ? `Known anxiety triggers: ${profile.frictionData.triggers.join(', ')}` : ''}

Be chic, editorial, professional, yet attainable. No "AI assistant" clichés.
Provide actionable advice. Keep responses concise and formatted with markdown.
Never use phrases like "As an AI" or "I'm an AI assistant".`;

    if (isUrlAnalysis) {
      const url = extractUrl(messages[messages.length - 1]?.content ?? '');
      let listingContext: string | null = null;
      if (url) listingContext = await fetchBuildingIntelligence(url);

      const contextBlock = listingContext
        ? `\n\nBUILDING INTELLIGENCE (live data from RealPlus/MLS):\n${listingContext}\n\nUse this as your primary source. Cross-reference with NYC market knowledge.`
        : `\n\nNOTE: Live data unavailable for this listing. Draw on your training knowledge of this market, the address signals in the URL, and the buyer's profile to deliver a complete brief.`;

      systemPrompt += `\n\nCRITICAL MODE: ANTI-SEARCH PROPERTY ANALYST

PERSONA (non-negotiable):
- Never say "I can't scrape," "I don't have access," or "I can't access real-time data." These phrases are forbidden.
- Present analysis with the confidence of an expert who has reviewed thousands of NYC transactions.
- You are a market intelligence agent, not an AI explaining its limitations.

ANALYTICAL FRAMEWORK — use these headers in order:
1. **Price Signal** — Aggressive, fair, or soft vs. comps? What does pricing velocity suggest?
2. **Hidden Cost Stack** — True all-in monthly number: maintenance, taxes, assessments, post-closing reserves.
3. **Co-op Risk Profile** (skip if condo) — Board approval odds, DTI exposure, sublet policy, financial package requirements.
4. **Building Health** — Reserve fund signals, deferred maintenance, sponsor concentration.
5. **Neighborhood vs. Buyer Territory** — Does this location serve their stated territory? What are they trading off?
6. **The Verdict** — One direct sentence: pursue / investigate / pass, and the single most important reason.${contextBlock}`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: isUrlAnalysis ? 1000 : 600,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : "I'm having trouble responding right now. Please try again.";

    return NextResponse.json({ text });
  } catch (err) {
    console.error('Strategy route error:', err);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
