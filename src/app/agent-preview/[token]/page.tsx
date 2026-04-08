import { notFound } from 'next/navigation';
import { verifyPreviewToken } from '@/lib/preview-token';
import Link from 'next/link';

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * /agent-preview/[token]
 *
 * Teaser page for agents who received an invitation email from a buyer.
 * Shows non-sensitive profile fields (territory, budget tier, timeline, mode).
 * Blurs the full profile with a CTA to sign up on homey.advsr.
 *
 * Token is a signed JWT with 48h expiry. No auth required to view the preview —
 * that's intentional: the agent shouldn't have to create an account just to
 * see what they'd be getting. The sign-up CTA converts them.
 */
export default async function AgentPreviewPage({ params }: Props) {
  const { token } = await params;
  const payload = await verifyPreviewToken(token);

  if (!payload) notFound();

  const { territory, budgetTier, timeline, mode } = payload;

  return (
    <div className="min-h-screen bg-[#0D0D0B] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[520px]">

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="text-[9px] text-[#A8956E] font-bold tracking-[0.25em] uppercase mb-3">
            homey. intelligence platform
          </p>
          <h1 className="font-serif italic text-[#F0EDE8] text-3xl leading-snug mb-3">
            Your client built their profile.
          </h1>
          <p className="text-[#A8A49E] text-sm font-light">
            They listed you as their agent. Here's what they shared.
          </p>
        </div>

        {/* Preview card */}
        <div className="border border-[#2A2A27] bg-[#141412] p-8 mb-6">
          <div className="text-[8px] text-[#6E6A65] uppercase tracking-widest mb-6 border-b border-[#2A2A27] pb-4">
            Profile Preview
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
            <div>
              <span className="text-[8px] text-[#6E6A65] uppercase tracking-widest block mb-1.5">Intent</span>
              <span className="font-serif text-[#C8B89A] text-lg">{mode} in NYC</span>
            </div>
            <div>
              <span className="text-[8px] text-[#6E6A65] uppercase tracking-widest block mb-1.5">Timeline</span>
              <span className="font-serif text-[#C8B89A] text-lg">{timeline || 'Flexible'}</span>
            </div>
            {budgetTier && (
              <div className="col-span-2">
                <span className="text-[8px] text-[#6E6A65] uppercase tracking-widest block mb-1.5">
                  {mode === 'Rent' ? 'Max Monthly Rent' : 'Budget Ceiling'}
                </span>
                <span className="font-serif text-[#C8B89A] text-lg">{budgetTier}</span>
              </div>
            )}
          </div>

          {territory.length > 0 && (
            <div className="mb-8">
              <span className="text-[8px] text-[#6E6A65] uppercase tracking-widest block mb-3">Territory</span>
              <div className="flex flex-wrap gap-2">
                {territory.slice(0, 5).map(t => (
                  <span
                    key={t}
                    className="text-[7px] bg-[#C8B89A]/10 text-[#C8B89A] border border-[#C8B89A]/30 px-2 py-1 uppercase tracking-widest font-bold"
                  >
                    {t.split('(')[0].trim()}
                  </span>
                ))}
                {territory.length > 5 && (
                  <span className="text-[7px] text-[#6E6A65] px-2 py-1 uppercase tracking-widest">
                    +{territory.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Blurred full profile teaser */}
          <div className="relative">
            <div className="blur-sm select-none pointer-events-none border border-[#2A2A27] bg-[#0D0D0B]/60 p-5 rounded-sm">
              <div className="text-[8px] text-[#6E6A65] uppercase tracking-widest mb-2">Readiness Score</div>
              <div className="font-serif text-3xl text-[#C8B89A] mb-1">87</div>
              <div className="text-[8px] text-[#A8956E] uppercase tracking-widest">High Intent</div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[#0D0D0B]/90 border border-[#2A2A27] px-4 py-2 text-center">
                <p className="text-[9px] text-[#A8A49E] uppercase tracking-widest">
                  Sign up to see full intelligence
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link
            href="/auth?role=agent"
            className="block w-full py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#DED2BC] transition-colors text-center"
          >
            Claim Profile on homey.advsr →
          </Link>
          <p className="text-[9px] text-[#6E6A65]">
            Free to start. Full readiness score, territory breakdown, and strategic context.
          </p>
        </div>

        <p className="text-center text-[8px] text-[#3A3A37] mt-8 uppercase tracking-widest">
          Preview expires in 48 hours · homey.advsr
        </p>
      </div>
    </div>
  );
}
