import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { UserProfile } from '@/types/profile';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const profile: UserProfile = await req.json();

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 350,
      system: `You are an empathetic, editorial real estate strategist. Based on the following ${profile.mode.toLowerCase()} profile parameters, write a detailed 3-4 sentence strategic summary speaking directly to the user (use "You").

Mode: ${profile.mode}
Timeline: ${profile.mode === 'Rent' && profile.moveInDate ? `Exact date: ${profile.moveInDate}` : profile.timeline} (${profile.timelineContext || 'No context'})
Budget: ${profile.mode === 'Rent' && profile.maxMonthlyRent ? `$${profile.maxMonthlyRent}/mo` : profile.budgetTier} (${profile.budgetContext || 'No context'})
${profile.meetsIncomeRequirement !== undefined ? `Meets 40x income req: ${profile.meetsIncomeRequirement ? 'Yes' : 'No'}` : ''}
${profile.usingGuarantor !== undefined ? `Using guarantor (80x): ${profile.usingGuarantor ? 'Yes' : 'No'}` : ''}
Territory: ${profile.territory?.join(', ')}
Fear/Anxiety: ${profile.fear}
Friction Telemetry: ${profile.frictionData ? JSON.stringify(profile.frictionData) : 'No telemetry'}
Context: ${profile.fearContext || 'No additional context'}

CRITICAL: Do not just restate the facts. Write a narrative that connects their specific friction points (from the telemetry) to their chosen timeline and budget. The output should feel like a custom blueprint. Avoid generic phrases. If the telemetry shows high tension between FOMO and FOOP, address that psychological tug-of-war. If they reacted strongly to board rejection scenarios, double down on the preparation needed for that specific hurdle. Incorporate their specific anxiety triggers and scenario reactions to tailor the advice.

Example: "You're caught in a visceral tug-of-war between the fear of missing a rare West Village gem and the anxiety of overpaying in this high-interest market. Your reactions suggest that while you're ready for the financial commitment, the co-op board's liquidity requirements are the silent dealbreaker keeping you up at night. We will architect a strategy that front-loads your financial vetting so that when we find the right place, you aren't just moving fast—you're moving with the confidence of an all-cash buyer."`,
      messages: [{ role: 'user', content: 'Synthesize my strategic profile into a personal blueprint.' }],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ summary });
  } catch (err) {
    console.error('Profile summary error:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
