import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { BuyerProfile } from '@/types/buyer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const profile: BuyerProfile = await req.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an empathetic, editorial real estate strategist. Based on the following buyer parameters, write a 2-3 sentence summary speaking directly to the user (use "You").

Mode: ${profile.mode}
Timeline: ${profile.timeline} (${profile.timelineContext || 'No context'})
Budget: ${profile.budgetTier} (${profile.budgetContext || 'No context'})
Territory: ${profile.territory?.join(', ')}
Fear/Anxiety: ${profile.fear} (${profile.fearContext || 'No context'})

Do not list the parameters. Write a cohesive narrative that validates their fear, acknowledges their constraints, and sets a tone of confident guidance.
Example: "You're moving with urgency and your biggest fear is moving too slowly. That combination can lead to panic-buying. We'll keep you fast without letting you rush past the right decision."`,
        },
        { role: 'user', content: 'Synthesize my profile.' },
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    const summary = completion.choices[0]?.message?.content ?? '';
    return NextResponse.json({ summary });
  } catch (err) {
    console.error('Profile summary error:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
