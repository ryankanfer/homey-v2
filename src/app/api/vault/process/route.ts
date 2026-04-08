import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Schemas for Tool Use (Function Calling)
const EXTRACTION_TOOLS: Anthropic.Tool[] = [
  {
    name: 'extract_w2_data',
    description: 'Extract data from an IRS W2 form',
    input_schema: {
      type: 'object',
      properties: {
        gross_income: { type: 'number', description: 'Box 1: Wages, tips, other compensation' },
        employer: { type: 'string', description: 'Employer name' },
        tax_year: { type: 'integer', description: 'The tax year of the W2' }
      },
      required: ['gross_income', 'employer', 'tax_year']
    }
  },
  {
    name: 'extract_bank_statement_data',
    description: 'Extract data from a Bank Statement',
    input_schema: {
      type: 'object',
      properties: {
        avg_daily_balance: { type: 'number' },
        recurring_debits: { type: 'number', description: 'Total value of recurring monthly debits' },
        lowest_monthly_balance: { type: 'number' },
        liquidity_score: { type: 'integer', description: 'Score from 1-100 on post-closing safety' }
      },
      required: ['avg_daily_balance', 'liquidity_score']
    }
  },
  {
    name: 'extract_pre_approval_data',
    description: 'Extract data from a Mortgage Pre-approval letter',
    input_schema: {
      type: 'object',
      properties: {
        approved_amount: { type: 'number' },
        lender: { type: 'string' },
        expiry_date: { type: 'string', format: 'date' },
        loan_type: { type: 'string', enum: ['Conventional', 'FHA', 'VA', 'Jumbo', 'Other'] }
      },
      required: ['approved_amount', 'lender', 'expiry_date']
    }
  }
];

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();
    const supabase = (await createServerSupabaseClient()) as any;
    
    // 1. Fetch document metadata
    const docResponse = await supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docResponse.error || !docResponse.data) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = docResponse.data as Record<string, any>;
    
    if (doc.status === 'processed') return NextResponse.json({ message: 'Already processed' });

    // Update status to processing
    await supabase.from('user_documents').update({ status: 'processing' }).eq('id', documentId);

    // 2. Download from Storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from('homey-vault')
      .download(doc.storage_path);

    if (downloadErr) throw downloadErr;

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const base64File = buffer.toString('base64');
    const mediaType = doc.file_type || 'application/pdf';

    // 3. AI Intelligence Step
    // First, ask Claude to classify and extract using tools
    const isPdf = mediaType === 'application/pdf';
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      system: `You are a specialized NYC real estate document intelligence engine. 
      Your goal is to "read" the provided document and extract structured financial intuition.
      1. Classify the document.
      2. Call the appropriate tool based on the document type.
      3. For the "signal_summary", provide a 1-sentence briefing for a real estate agent about the client's financial stability.`,
      tools: EXTRACTION_TOOLS,
      tool_choice: { type: 'auto' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: isPdf ? 'document' : 'image',
              source: {
                type: 'base64',
                media_type: mediaType as any,
                data: base64File,
              },
            } as any,
            { type: 'text', text: 'Analyze this document for the Homey Vault.' }
          ],
        },
      ],
    }, {
      headers: {
        'anthropic-beta': 'pdfs-2024-09-25' // Enable PDF support if it's a PDF
      }
    });

    // 4. Handle tool response
    const toolUse = response.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
    const textResp = response.content.find((c): c is Anthropic.TextBlock => c.type === 'text');
    
    if (!toolUse) {
       await supabase.from('user_documents').update({ status: 'error' }).eq('id', documentId);
       return NextResponse.json({ error: 'AI failed to classify document' }, { status: 422 });
    }

    const category = toolUse.name.replace('extract_', '').replace('_data', '') as any;
    const extractedData = toolUse.input;
    const signalSummary = textResp?.text || `Verified ${category} document.`;

    // 5. Save Intelligence
    await supabase.from('document_intelligence').insert({
      document_id: documentId,
      user_id: doc.user_id,
      category,
      extracted_data: extractedData as any,
      signal_summary: signalSummary
    });

    // 6. Update Vault Bits (No Demotion Rule)
    const vaultMap: Record<string, string> = {
      w2: 'w2',
      bank_statement: 'bank',
      pre_approval: 'preapproval',
      tax_return: 'rebny' // Closest match for generic tax info
    };

    const vaultKey = vaultMap[category as string];
    if (vaultKey) {
      const { data: profile } = await supabase.from('buyer_profiles').select('vault').eq('user_id', doc.user_id).single();
      if (profile) {
        const currentVault = (profile.vault as any) || {};
        // Only promote from false -> true
        if (currentVault[vaultKey] === false) {
           currentVault[vaultKey] = true;
           await supabase.from('buyer_profiles').update({ vault: currentVault }).eq('user_id', doc.user_id);
        }
      }
    }

    // Final status update
    await supabase.from('user_documents').update({ status: 'processed' }).eq('id', documentId);

    return NextResponse.json({ success: true, category, extractedData });

  } catch (err) {
    console.error('Vault processing error:', err);
    return NextResponse.json({ error: 'Internal processing failure' }, { status: 500 });
  }
}
