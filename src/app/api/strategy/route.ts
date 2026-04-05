import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { BuyerProfile } from '@/types/buyer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface StrategyRequestBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
  profile: Pick<BuyerProfile, 'mode' | 'timeline' | 'budgetTier' | 'territory' | 'fear'>;
  isUrlAnalysis?: boolean;
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

Be chic, editorial, professional, yet attainable. No "AI assistant" clichés.
Provide actionable advice. Keep responses concise and formatted with markdown.
Never use phrases like "As an AI" or "I'm an AI assistant".`;

    if (isUrlAnalysis) {
      systemPrompt += `\n\nCRITICAL DIRECTIVE: The user just submitted a property listing URL. Act as the "Anti-Search Property Analyzer".
DO NOT sell them on the property. Strip the marketing fluff. Give a brutal, objective breakdown based on their budget and NYC realities.
Consider: hidden costs, DTI risks for co-ops, building financial health, neighborhood context vs. their territory, post-closing liquidity requirements.
Be hyper-critical and strategic. Format clearly with sections.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content ?? "I'm having trouble responding right now. Please try again.";
    return NextResponse.json({ text });
  } catch (err) {
    console.error('Strategy route error:', err);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
