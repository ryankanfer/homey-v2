import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('DIGEST_FROM_EMAIL') ?? 'homey. <brief@homeypocket.ai>';
const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://homeypocket.ai';

// ─── Neighborhood market intel (mirrors src/types/profile.ts) ─────────────────
const BUYER_STATS: Record<string, { median: number; dom: number; ratio: number; insight: string }> = {
  'Park Slope':       { median: 1150000, dom: 32, ratio: 1.02, insight: 'Bidding wars are common for well-priced 2BRs.' },
  'Cobble Hill':      { median: 1250000, dom: 28, ratio: 1.05, insight: 'Inventory is at a 5-year low. Move fast.' },
  'West Village':     { median: 1450000, dom: 45, ratio: 0.96, insight: 'Co-op boards are tightening. Cash is king.' },
  'Carroll Gardens':  { median: 1350000, dom: 35, ratio: 1.01, insight: 'Brownstones are seeing record numbers.' },
  'Prospect Heights': { median: 950000,  dom: 40, ratio: 0.98, insight: 'Great value compared to Park Slope.' },
};

const RENTER_STATS: Record<string, { medianRent: number; dom: number; concessions: string; insight: string }> = {
  'Williamsburg':  { medianRent: 3800, dom: 18, concessions: '1 month free on 12+ mo leases', insight: 'Demand is outpacing supply. Listings go in days.' },
  'Astoria':       { medianRent: 2600, dom: 24, concessions: 'Rare — landlords not conceding', insight: 'Best value in Queens for professionals.' },
  'Park Slope':    { medianRent: 3200, dom: 21, concessions: 'Occasional broker fee splits', insight: 'Family-friendly; 2BRs move fastest.' },
  'Long Island City': { medianRent: 3400, dom: 20, concessions: '1-2 months free common', insight: 'High-rise inventory creating leverage for tenants.' },
  'Bed-Stuy':      { medianRent: 2800, dom: 19, concessions: 'Minimal', insight: 'Rapidly appreciating. Act before summer.' },
};

// ─── Readiness scoring (mirrors src/lib/readiness.ts) ─────────────────────────
function calculateReadiness(p: Record<string, unknown>): number {
  let score = 0;
  if (p.budget_tier || p.max_monthly_rent) score += 10;
  if (Array.isArray(p.territory) && p.territory.length > 0) score += 10;
  if (p.timeline || p.move_in_date) score += 10;
  if (p.fear) score += 10;
  if (p.accuracy_rating === 'Yes, this is me') score += 20;
  else if (p.accuracy_rating === 'Mostly') score += 10;

  const vault = (p.vault as Record<string, boolean>) ?? {};
  if (p.mode === 'Rent') {
    if (vault.w2) score += 10;
    if (vault.bank) score += 10;
    if (vault.guarantor) score += 10;
    if (vault.landlord) score += 10;
    if (vault.id) score += 10;
  } else {
    if (vault.w2) score += 10;
    if (vault.bank) score += 10;
    if (vault.rebny) score += 10;
    if (vault.preapproval) score += 10;
    if (vault.attorney) score += 10;
  }
  return Math.min(score, 100);
}

function scoreLabel(score: number): string {
  if (score >= 75) return 'Connect Ready';
  if (score >= 40) return 'Building Profile';
  return 'Just Started';
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ─── Email template ──────────────────────────────────────────────────────────
function buildEmail(opts: {
  firstName: string;
  email: string;
  score: number;
  territory: string[];
  mode: 'Buy' | 'Rent';
  fear: string;
  vault: Record<string, boolean>;
  weekOf: string;
}): string {
  const { firstName, score, territory, mode, fear, vault, weekOf } = opts;
  const label = scoreLabel(score);
  const bar = scoreBar(score);
  const primaryTerritory = territory[0] ?? 'NYC';

  const vaultKeys = mode === 'Rent'
    ? ['w2', 'bank', 'guarantor', 'landlord', 'id']
    : ['w2', 'bank', 'rebny', 'preapproval', 'attorney'];
  const vaultLabels: Record<string, string> = {
    w2: 'W-2 / Tax Returns', bank: 'Bank Statements', rebny: 'REBNY Financial Statement',
    preapproval: 'Mortgage Pre-Approval', attorney: 'Real Estate Attorney',
    guarantor: 'Guarantor Letter', landlord: 'Landlord References', id: 'Government ID',
  };
  const doneDocs = vaultKeys.filter(k => vault[k]);
  const missingDocs = vaultKeys.filter(k => !vault[k]);

  const buyerStat = BUYER_STATS[primaryTerritory];
  const renterStat = RENTER_STATS[primaryTerritory];
  const hasStat = mode === 'Buy' ? !!buyerStat : !!renterStat;

  const marketSection = hasStat ? (mode === 'Buy' ? `
    <tr><td style="padding: 32px 0 0;">
      <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #6E6A65; margin: 0 0 16px;">Market — ${primaryTerritory}</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:33%; padding-right: 16px;">
            <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #C8B89A; margin: 0 0 4px; font-weight: 400;">$${(buyerStat.median / 1000000).toFixed(2)}M</p>
            <p style="font-size: 10px; color: #6E6A65; margin: 0; letter-spacing: 0.1em; text-transform: uppercase;">Median Price</p>
          </td>
          <td style="width:33%; padding-right: 16px;">
            <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #C8B89A; margin: 0 0 4px; font-weight: 400;">${buyerStat.dom}d</p>
            <p style="font-size: 10px; color: #6E6A65; margin: 0; letter-spacing: 0.1em; text-transform: uppercase;">Days on Market</p>
          </td>
          <td style="width:33%;">
            <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: ${buyerStat.ratio >= 1 ? '#8B3A3A' : '#4A7C59'}; margin: 0 0 4px; font-weight: 400;">${(buyerStat.ratio * 100).toFixed(0)}%</p>
            <p style="font-size: 10px; color: #6E6A65; margin: 0; letter-spacing: 0.1em; text-transform: uppercase;">List/Sale Ratio</p>
          </td>
        </tr>
      </table>
      <p style="font-size: 12px; color: #A8A49E; margin: 20px 0 0; font-style: italic; line-height: 1.6;">${buyerStat.insight}</p>
    </td></tr>` : `
    <tr><td style="padding: 32px 0 0;">
      <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #6E6A65; margin: 0 0 16px;">Market — ${primaryTerritory}</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:33%; padding-right: 16px;">
            <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #C8B89A; margin: 0 0 4px; font-weight: 400;">$${renterStat.medianRent.toLocaleString()}</p>
            <p style="font-size: 10px; color: #6E6A65; margin: 0; letter-spacing: 0.1em; text-transform: uppercase;">Median Rent / Mo</p>
          </td>
          <td style="width:33%; padding-right: 16px;">
            <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #C8B89A; margin: 0 0 4px; font-weight: 400;">${renterStat.dom}d</p>
            <p style="font-size: 10px; color: #6E6A65; margin: 0; letter-spacing: 0.1em; text-transform: uppercase;">Avg Days Listed</p>
          </td>
          <td style="width:33%;">
            <p style="font-size: 11px; color: #A8A49E; margin: 0; line-height: 1.5;">${renterStat.concessions}</p>
            <p style="font-size: 10px; color: #6E6A65; margin: 4px 0 0; letter-spacing: 0.1em; text-transform: uppercase;">Concessions</p>
          </td>
        </tr>
      </table>
      <p style="font-size: 12px; color: #A8A49E; margin: 20px 0 0; font-style: italic; line-height: 1.6;">${renterStat.insight}</p>
    </td></tr>`) : '';

  const vaultSection = missingDocs.length > 0 ? `
    <tr><td style="padding: 32px 0 0;">
      <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #6E6A65; margin: 0 0 16px;">Your Vault — ${doneDocs.length}/${vaultKeys.length} ready</p>
      ${missingDocs.slice(0, 3).map(k => `
        <p style="font-size: 11px; color: #6E6A65; margin: 0 0 8px; padding-left: 12px; border-left: 1px solid #2A2A27;">
          <span style="color: #3A3A37;">○</span>&nbsp;&nbsp;${vaultLabels[k]}
        </p>`).join('')}
      ${doneDocs.length > 0 ? `<p style="font-size: 10px; color: #4A4A47; margin: 12px 0 0; letter-spacing: 0.05em;">${doneDocs.length} document${doneDocs.length > 1 ? 's' : ''} ready — keep going.</p>` : ''}
    </td></tr>` : `
    <tr><td style="padding: 32px 0 0;">
      <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #4A7C59; margin: 0 0 8px;">Your Vault — Complete</p>
      <p style="font-size: 12px; color: #A8A49E;">All ${vaultKeys.length} documents ready. You're prepared to move.</p>
    </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="dark" />
<title>homey. — your weekly brief</title>
</head>
<body style="margin:0; padding:0; background:#0D0D0B; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0D0D0B;">
    <tr><td align="center" style="padding: 40px 20px 60px;">

      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0" border="0">

        <!-- Header -->
        <tr><td style="padding-bottom: 40px; border-bottom: 1px solid #1E1E1B;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #C8B89A; margin: 0; font-style: italic; letter-spacing: -0.02em; font-weight: 400;">homey.</p>
              </td>
              <td align="right">
                <p style="font-size: 10px; color: #3A3A37; margin: 0; letter-spacing: 0.15em; text-transform: uppercase; line-height: 1.4;">Week of<br />${weekOf}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding: 40px 0 0;">
          <p style="font-size: 11px; color: #6E6A65; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 12px;">Your brief${firstName ? `, ${firstName}` : ''}</p>
          <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; color: #F0EDE8; margin: 0; line-height: 1.25; font-weight: 400;">
            ${score >= 75 ? "You're ready to move." : score >= 40 ? "You're making progress." : "Your search is taking shape."}
          </p>
          ${fear ? `<p style="font-size: 13px; color: #6E6A65; margin: 16px 0 0; line-height: 1.6; font-style: italic;">The concern you named — ${fear.toLowerCase()} — is the right thing to be thinking about.</p>` : ''}
        </td></tr>

        <!-- Readiness score -->
        <tr><td style="padding: 32px 0 0;">
          <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #6E6A65; margin: 0 0 16px;">Readiness</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width: 60px;">
                <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 36px; color: #C8B89A; margin: 0; line-height: 1; font-weight: 400;">${score}</p>
              </td>
              <td style="padding-left: 16px; vertical-align: middle;">
                <p style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #4A7C59; margin: 0 0 4px; letter-spacing: 0.05em;">${bar}</p>
                <p style="font-size: 10px; color: #6E6A65; margin: 0; letter-spacing: 0.15em; text-transform: uppercase;">${label}</p>
              </td>
            </tr>
          </table>
          ${score < 75 ? `<p style="font-size: 11px; color: #4A4A47; margin: 12px 0 0;">${75 - score} points from agent connection.</p>` : ''}
        </td></tr>

        <!-- Market intel -->
        ${marketSection}

        <!-- Vault status -->
        ${vaultSection}

        <!-- Divider -->
        <tr><td style="padding: 40px 0;"><div style="height:1px; background:#1E1E1B;"></div></td></tr>

        <!-- CTA -->
        <tr><td style="padding-bottom: 48px;">
          <a href="${APP_URL}/dashboard" style="display:inline-block; padding: 16px 32px; background:#C8B89A; color:#0D0D0B; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; text-decoration: none;">
            View Your Dashboard &rarr;
          </a>
          <p style="font-size: 10px; color: #3A3A37; margin: 20px 0 0; line-height: 1.6;">
            This brief is generated from your homey. profile.<br />
            <a href="${APP_URL}/dashboard" style="color: #4A4A47; text-decoration: underline;">Update your profile</a> &nbsp;·&nbsp;
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(opts.email)}" style="color: #4A4A47; text-decoration: underline;">Unsubscribe</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top: 1px solid #1A1A17; padding-top: 24px;">
          <p style="font-size: 10px; color: #2A2A27; margin: 0; line-height: 1.8; letter-spacing: 0.05em;">
            homey. · New York City · <a href="${APP_URL}" style="color: #2A2A27; text-decoration: none;">homeypocket.ai</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Allow manual trigger via POST with optional { dryRun: true }
  let dryRun = false;
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      dryRun = body?.dryRun === true;
    } catch { /* no body */ }
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Fetch all complete buyer profiles with their auth email
  const [{ data: buyers }, { data: renters }] = await Promise.all([
    admin.from('buyer_profiles')
      .select('*, profile:profiles!buyer_profiles_user_id_fkey(full_name, email)')
      .eq('is_partial', false),
    admin.from('renter_profiles')
      .select('*, profile:profiles!renter_profiles_user_id_fkey(full_name, email)')
      .eq('is_partial', false),
  ]);

  const allProfiles = [
    ...(buyers ?? []).map((b: any) => ({ ...b, mode: 'Buy' as const })),
    ...(renters ?? []).map((r: any) => ({ ...r, mode: 'Rent' as const })),
  ];

  const results: { email: string; status: string }[] = [];

  for (const p of allProfiles) {
    const email: string = p.profile?.email;
    if (!email) continue;

    const firstName = (p.profile?.full_name ?? '').split(' ')[0];
    const score = calculateReadiness(p);
    const html = buildEmail({
      firstName,
      email,
      score,
      territory: p.territory ?? [],
      mode: p.mode,
      fear: p.fear ?? '',
      vault: p.vault ?? {},
      weekOf,
    });

    if (dryRun) {
      results.push({ email, status: 'dry-run' });
      continue;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `Your homey. brief — ${p.territory?.[0] ?? 'NYC'}, ${weekOf}`,
        html,
      }),
    });

    results.push({ email, status: res.ok ? 'sent' : `error:${res.status}` });
  }

  return new Response(JSON.stringify({ sent: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
