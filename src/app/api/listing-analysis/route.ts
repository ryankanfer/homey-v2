import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { url, clientId, clientProfile } = await req.json();

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const isRenter = clientProfile?.kind === 'renter' || clientProfile?.mode === 'Rent';
    const budgetDisplay = isRenter
      ? `$${clientProfile?.max_monthly_rent ?? clientProfile?.budget_monthly ?? '?'}/mo`
      : (clientProfile?.budget_tier ?? 'Unknown');

    const systemPrompt = isRenter
      ? `You are a NYC real estate expert reviewing a rental listing for a renter client.
Client budget: ${budgetDisplay}
Client territory: ${clientProfile?.territory?.join(', ') || 'NYC'}
Client fear: ${clientProfile?.fear || 'Unknown'}
${clientProfile?.friction_data?.tension !== undefined ? `Risk tolerance score: ${clientProfile.friction_data.tension}/100` : ''}
${clientProfile?.friction_data?.triggers?.length ? `Anxiety triggers: ${clientProfile.friction_data.triggers.join(', ')}` : ''}
${clientProfile?.meets_income_req === false ? 'Note: Client does NOT meet 40x income requirement.' : ''}
${clientProfile?.using_guarantor ? 'Note: Client is using a guarantor.' : ''}

Analyze this rental listing. Cover:
1. Price vs. market — is this fair for the area?
2. Upfront cash required (first month + security + 15% broker fee estimate)
3. Income qualification — does the price work for the client?
4. Management company or building red flags
5. Lease term or concession signals
6. Your recommendation (apply now / proceed with caution / avoid)

Be direct. No marketing language.`
      : `You are a NYC real estate expert reviewing a listing for a buyer client.
Client budget: ${budgetDisplay}
Client territory: ${clientProfile?.territory?.join(', ') || 'NYC'}
Client fear: ${clientProfile?.fear || 'Unknown'}
${clientProfile?.friction_data?.tension !== undefined ? `Risk tolerance score: ${clientProfile.friction_data.tension}/100` : ''}
${clientProfile?.friction_data?.triggers?.length ? `Anxiety triggers: ${clientProfile.friction_data.triggers.join(', ')}` : ''}

Analyze this listing. Cover:
1. Price assessment vs. market
2. Hidden costs (maintenance, taxes, special assessments)
3. Co-op board risk (if applicable)
4. Building financial health red flags
5. Your recommendation (pursue / pass / investigate further)

Be direct. No marketing language.`;

    const encoder = new TextEncoder();
    let fullText = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 800,
            system: systemPrompt,
            messages: [{ role: 'user', content: `Analyze this listing: ${url}` }],
          });

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              fullText += chunk.delta.text;
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }

          await supabase
            .from('listing_analyses')
            .insert({ agent_id: user.id, client_id: clientId, url, analysis: fullText } as any);

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('Listing analysis error:', err);
    return new Response('Failed to analyze listing', { status: 500 });
  }
}
