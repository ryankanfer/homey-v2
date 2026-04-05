import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { url, clientId, clientProfile } = await req.json();

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a NYC real estate expert reviewing a listing for a buyer client.
Client budget: ${clientProfile?.budgetTier || 'Unknown'}
Client territory: ${clientProfile?.territory?.join(', ') || 'NYC'}
Client fear: ${clientProfile?.fear || 'Unknown'}

Analyze this listing URL objectively. Cover:
1. Price assessment vs. market
2. Hidden costs (maintenance, taxes, assessments)
3. Co-op board risk (if applicable)
4. Building financial health red flags
5. Your recommendation (pursue / pass / investigate further)

Be direct. No marketing language.`,
        },
        { role: 'user', content: `Analyze this listing: ${url}` },
      ],
      max_tokens: 800,
      temperature: 0.6,
    });

    const analysis = completion.choices[0]?.message?.content ?? '';

    const { data, error } = await supabase
      .from('listing_analyses')
      .insert({ agent_id: user.id, client_id: clientId, url, analysis })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ analysis: data });
  } catch (err) {
    console.error('Listing analysis error:', err);
    return NextResponse.json({ error: 'Failed to analyze listing' }, { status: 500 });
  }
}
