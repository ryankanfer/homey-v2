'use client';
// Version: 2.1.2 - Hierarchical Territory System (Metadata-Rich)

import { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────

const BOROUGHS: Record<string, {
  neighborhoods: Record<string, {
    summary: string;
    precision: 'solid' | 'dashed' | 'glow' | 'planning' | 'colloquial';
    micros: Record<string, { summary: string; precision: 'solid' | 'dashed' | 'glow' | 'planning' | 'colloquial' }>;
  }>;
}> = {
  Manhattan: {
    neighborhoods: {
      'Chelsea': {
        summary: 'Contains the High Line and numerous art galleries between 10th and 11th Ave.',
        precision: 'solid',
        micros: {
          'Meatpacking District': { summary: 'Commercial and nightlife area shared with West Village.', precision: 'solid' },
          'West Chelsea Arts District': { summary: 'Concentration of galleries west of 10th Avenue.', precision: 'solid' }
        }
      },
      'Chinatown': {
        summary: 'Commercial and residential area in Lower Manhattan with a deep historic district.',
        precision: 'solid',
        micros: {
          'Two Bridges': { summary: 'Waterfront area along the East River under the Manhattan and Brooklyn Bridges.', precision: 'solid' }
        }
      },
      'Financial District (FiDi)': {
        summary: 'Lower Manhattan commercial hub centered around Wall St and the WTC.',
        precision: 'solid',
        micros: {
          'South Street Seaport': { summary: 'Historic area featuring 19th-century architecture and piers.', precision: 'solid' },
          'Stone Street Historic District': { summary: 'Pedestrian-only street with historic architecture.', precision: 'solid' }
        }
      },
      'Greenwich Village': {
        summary: 'Historic district known for its diagonal street grid and proximity to Washington Square Park.',
        precision: 'solid',
        micros: {
          'Gold Coast': { summary: 'Residential stretch primarily located along lower 5th Avenue.', precision: 'solid' }
        }
      },
      'Harlem': {
        summary: 'Residential and cultural area in Upper Manhattan with historic landmarks.',
        precision: 'solid',
        micros: {
          'Central Harlem': { summary: 'Residential heart of the neighborhood.', precision: 'solid' },
          'East Harlem': { summary: 'Area between 96th St and the Harlem River.', precision: 'solid' },
          'Hamilton Heights': { summary: 'Historic district featuring Neo-Gothic architecture.', precision: 'solid' },
          'Manhattanville': { summary: 'Area adjacent to Columbia University\'s expansion site.', precision: 'solid' },
          'Sugar Hill': { summary: 'Historic residential area in the northern section.', precision: 'solid' },
          'West Harlem': { summary: 'Residential section near Riverside Park.', precision: 'solid' }
        }
      },
      'Lower East Side (LES)': {
        summary: 'Residential and commercial area between the East Village and Chinatown.',
        precision: 'solid',
        micros: {
          'Alphabet City': { summary: 'Section featuring Avenues A, B, C, and D.', precision: 'solid' },
          'Dimes Square': { summary: 'Intersection of Canal, Division, and Ludlow Streets.', precision: 'solid' },
          'Loisaida': { summary: 'Area reflecting the cultural roots of the LES community.', precision: 'solid' },
          'Two Bridges': { summary: 'Waterfront section along the East River.', precision: 'solid' }
        }
      },
      'Midtown East': {
        summary: 'Commercial district with residential enclaves near the East River.',
        precision: 'solid',
        micros: {
          'Sutton Place': { summary: 'Residential enclave located near the East River.', precision: 'solid' },
          'Tudor City': { summary: 'Planned residential community near the United Nations.', precision: 'solid' },
          'Turtle Bay': { summary: 'Area featuring the UN Headquarters and East River views.', precision: 'solid' }
        }
      },
      'Midtown West': {
        summary: 'Commercial and transportation hub containing the Theater District.',
        precision: 'solid',
        micros: {
          'Garment District': { summary: 'Manufacturing and commercial area focused on fashion.', precision: 'solid' },
          'Penn District': { summary: 'Area surrounding Penn Station and Madison Square Garden.', precision: 'solid' },
          'Times Square': { summary: 'Intersection of Broadway and Seventh Avenue.', precision: 'solid' }
        }
      },
      'SoHo': {
        summary: 'District known for cast-iron architecture and commercial retail.',
        precision: 'solid',
        micros: {
          'Cast Iron Historic District': { summary: 'Large concentration of 19th-century cast-iron buildings.', precision: 'solid' },
          'Hudson Square': { summary: 'Former printing district north of Tribeca.', precision: 'solid' }
        }
      },
      'Tribeca': {
        summary: 'Former industrial area characterized by large-scale loft buildings.',
        precision: 'solid',
        micros: {
          'Tribeca East': { summary: 'Section near Broadway and City Hall.', precision: 'solid' },
          'Tribeca North': { summary: 'Area between Laight St and Canal St.', precision: 'solid' },
          'Tribeca South': { summary: 'Section bordering the World Trade Center site.', precision: 'solid' },
          'Tribeca West': { summary: 'Residential area closer to the Hudson River.', precision: 'solid' }
        }
      },
      'Upper East Side (UES)': {
        summary: 'Residential area between Central Park and the East River.',
        precision: 'solid',
        micros: {
          'Carnegie Hill': { summary: 'Residential area near Central Park and 92nd St.', precision: 'solid' },
          'Lenox Hill': { summary: 'Southern section containing major medical centers.', precision: 'solid' },
          'Yorkville': { summary: 'Section located north of 79th Street.', precision: 'solid' }
        }
      },
      'Upper West Side (UWS)': {
        summary: 'Residential area bounded by Central Park and Riverside Park.',
        precision: 'solid',
        micros: {
          'Lincoln Square': { summary: 'Cultural hub containing Lincoln Center.', precision: 'solid' },
          'Manhattan Valley': { summary: 'Northern residential section near 106th St.', precision: 'solid' }
        }
      },
      'Washington Heights': {
        summary: 'Residential area in Upper Manhattan featuring hilly terrain.',
        precision: 'solid',
        micros: {
          'Fort George': { summary: 'Area containing Highbridge Park.', precision: 'solid' }
        }
      },
      'West Village': {
        summary: 'Residential district characterized by narrow streets and townhouses.',
        precision: 'solid',
        micros: {
          'Meatpacking District': { summary: 'Nightlife and commercial hub shared with Chelsea.', precision: 'solid' }
        }
      }
    }
  },
  Brooklyn: {
    neighborhoods: {
      'Bedford-Stuyvesant (Bed-Stuy)': {
        summary: 'Known for its concentration of late 19th-century brownstone architecture.',
        precision: 'solid',
        micros: {
          'Stuyvesant Heights': { summary: 'Historic district bounded by Tompkins Ave and Malcolm X Blvd.', precision: 'solid' }
        }
      },
      'Bushwick': {
        summary: 'Industrial and residential area with numerous converted loft spaces.',
        precision: 'solid',
        micros: {
          'Bushwick Collective Area': { summary: 'Area centered on Troutman St featuring outdoor murals.', precision: 'solid' }
        }
      },
      'Carroll Gardens': {
        summary: 'Area known for front gardens and 19th-century residential architecture.',
        precision: 'solid',
        micros: {
          'Carroll Gardens Historic District': { summary: 'Section featuring brownstones with large front yards.', precision: 'solid' }
        }
      },
      'Crown Heights': {
        summary: 'Residential area featuring diverse architecture and proximity to the Brooklyn Museum.',
        precision: 'solid',
        micros: {
          'Weeksville': { summary: 'Historic site within the neighborhood.', precision: 'solid' }
        }
      },
      'DUMBO': {
        summary: 'Waterfront area containing converted industrial buildings and waterfront parks.',
        precision: 'solid',
        micros: {
          'Fulton Ferry': { summary: 'Historic landing area near the Brooklyn Bridge.', precision: 'solid' },
          'Vinegar Hill': { summary: 'Former industrial area east of the Brooklyn Bridge.', precision: 'solid' }
        }
      },
      'Flatbush': {
        summary: 'Large residential area containing Victorian-era architecture.',
        precision: 'solid',
        micros: {
          'Beverley Square East': { summary: 'Planned residential section featuring detached homes.', precision: 'solid' },
          'Beverley Square West': { summary: 'Historic area with late 19th-century architecture.', precision: 'solid' },
          'Ditmas Park': { summary: 'Historic district known for its detached Victorian homes.', precision: 'solid' },
          'Victorian Flatbush': { summary: 'Broader section containing several historic districts.', precision: 'solid' }
        }
      },
      'Fort Greene': {
        summary: 'Residential area centered on Fort Greene Park.',
        precision: 'solid',
        micros: {
          'BAM District': { summary: 'Area surrounding the Brooklyn Academy of Music.', precision: 'solid' }
        }
      },
      'Gowanus': {
        summary: 'Industrial and residential area centered around the Gowanus Canal.',
        precision: 'solid',
        micros: {}
      },
      'Park Slope': {
        summary: 'Residential area located adjacent to Prospect Park.',
        precision: 'solid',
        micros: {
          'North Slope': { summary: 'Section closest to Atlantic Terminal.', precision: 'solid' },
          'South Slope': { summary: 'Residential area located south of 9th Street.', precision: 'solid' }
        }
      },
      'Red Hook': {
        summary: 'Nautical and industrial area with waterfront access and cobblestone streets.',
        precision: 'solid',
        micros: {
          'Columbia Waterfront District': { summary: 'Linear park area shared with Cobble Hill.', precision: 'solid' }
        }
      },
      'Sunset Park': {
        summary: 'Area featuring an industrial waterfront and a large park with hill views.',
        precision: 'solid',
        micros: {
          'Industry City': { summary: 'Commercial and creative complex in former industrial buildings.', precision: 'solid' }
        }
      },
      'Williamsburg': {
        summary: 'Large neighborhood with significant industrial and residential sections.',
        precision: 'solid',
        micros: {
          'East Williamsburg': { summary: 'Industrial and residential area bordering Bushwick.', precision: 'solid' },
          'North Williamsburg': { summary: 'Section bordering the East River and McCarren Park.', precision: 'solid' },
          'South Williamsburg': { summary: 'Residential and cultural section south of Broadway.', precision: 'solid' },
          'Williamsburg Waterfront': { summary: 'Area along the East River featuring park space.', precision: 'solid' }
        }
      }
    }
  },
  Queens: {
    neighborhoods: {
      'Astoria': {
        summary: 'Residential and commercial area between the East River and the BQE.',
        precision: 'solid',
        micros: {
          'Astoria Heights': { summary: 'Residential section near LaGuardia Airport.', precision: 'solid' },
          'Ditmars-Steinway': { summary: 'Commercial and residential bypass with numerous storefronts.', precision: 'solid' },
          'Little Egypt': { summary: 'Commercial section focused along Steinway Street.', precision: 'solid' }
        }
      },
      'Flushing': {
        summary: 'Major commercial center at the eastern end of the 7 train.',
        precision: 'solid',
        micros: {
          'Flushing Chinatown': { summary: 'The central commercial portion of the neighborhood.', precision: 'solid' }
        }
      },
      'Forest Hills': {
        summary: 'Residential area featuring garden architecture and Forest Hills Stadium.',
        precision: 'solid',
        micros: {
          'Forest Hills Gardens': { summary: 'Private community featuring Tudor-style architecture.', precision: 'solid' }
        }
      },
      'Jackson Heights': {
        summary: 'Residential area containing historic garden apartment blocks.',
        precision: 'solid',
        micros: {
          'Historic District': { summary: 'Section featuring planned 1920s garden apartment blocks.', precision: 'solid' },
          'Little India': { summary: 'Commercial area centered along 74th Street.', precision: 'solid' }
        }
      },
      'Long Island City (LIC)': {
        summary: 'Waterfront area containing high-rise residential and commercial development.',
        precision: 'solid',
        micros: {
          'Court Square': { summary: 'Inland section containing a major transit hub.', precision: 'solid' },
          'Dutch Kills': { summary: 'Mixed industrial and residential section north of LIC.', precision: 'solid' },
          'Hunters Point': { summary: 'Waterfront section containing Gantry Plaza State Park.', precision: 'solid' }
        }
      },
      'Sunnyside': {
        summary: 'Residential neighborhood with transit access through the 7 train.',
        precision: 'solid',
        micros: {
          'Sunnyside Gardens': { summary: 'Planned community known for its courtyard gardens.', precision: 'solid' }
        }
      },
      'Whitestone': {
        summary: 'Suburban-style residential area in northern Queens.',
        precision: 'solid',
        micros: {
          'Malba': { summary: 'Residential enclave along the East River.', precision: 'solid' }
        }
      }
    }
  },
  'Bronx': {
    neighborhoods: {
      'Fordham': {
        summary: 'Area adjacent to Fordham University and the New York Botanical Garden.',
        precision: 'solid',
        micros: {
          'Belmont': { summary: 'Commercial and residential area centered on Arthur Avenue.', precision: 'solid' }
        }
      },
      'Mott Haven': {
        summary: 'South Bronx area with industrial and new residential buildings.',
        precision: 'solid',
        micros: {
          'Piano District': { summary: 'Section formerly containing piano manufacturing facilities.', precision: 'solid' }
        }
      },
      'Riverdale': {
        summary: 'Hilly residential area in the Northwest Bronx bordering Westchester.',
        precision: 'solid',
        micros: {
          'Fieldston': { summary: 'Private residential community featuring historic architecture.', precision: 'solid' },
          'North Riverdale': { summary: 'Northernmost section bordering Yonkers.', precision: 'solid' },
          'Spuyten Duyvil': { summary: 'Southern section at the confluence of the Hudson and Harlem Rivers.', precision: 'solid' }
        }
      },
      'South Bronx': {
        summary: 'Historically industrial and residential area in the lower Bronx.',
        precision: 'solid',
        micros: {
          'Port Morris': { summary: 'Industrial waterfront section of the South Bronx.', precision: 'solid' }
        }
      }
    }
  },
  'Staten Island': {
    neighborhoods: {
      'St. George': {
        summary: 'Area and transit hub containing the Staten Island Ferry terminal.',
        precision: 'solid',
        micros: {
          'St. George Waterfront': { summary: 'Commercial and transportation area bordering the harbor.', precision: 'solid' }
        }
      },
      'Stapleton': {
        summary: 'Residential area featuring historic Victorian-era homes.',
        precision: 'solid',
        micros: {
          'Stapleton Heights': { summary: 'Hilly residential section with hilltop views.', precision: 'solid' }
        }
      },
      'Tottenville': {
        summary: 'Residential neighborhood at the southernmost tip of Staten Island.',
        precision: 'solid',
        micros: {
          'Tottenville Shore': { summary: 'Area bordering the Raritan Bay.', precision: 'solid' }
        }
      }
    }
  }
};

const BUY_TIERS = ['Under $750K', '$750K – $1.2M', '$1.2M – $2M', '$2M – $3.5M', '$3.5M+'];

const BUY_TIMELINES = [
  { label: 'I needed to start yesterday', value: 'Immediate' },
  { label: '3–6 months', sub: 'Real but not panicked', value: '3-6 months' },
  { label: '6–12 months', sub: 'Being strategic', value: '6-12 months' },
  { label: 'Whenever the right place appears', value: 'Flexible' },
];

const RENT_TIMELINES = [
  { label: 'ASAP', sub: 'Ready to sign today', value: 'ASAP' },
  { label: '15–30 days', value: '15-30 days' },
  { label: '30–60 days', sub: 'Standard lease break', value: '30-60 days' },
  { label: 'Flexible', value: 'Flexible' },
];

const BUY_FEARS = [
  { label: 'Overpaying at the top of the market', value: 'Overpaying' },
  { label: 'Hidden structural or co-op board issues', value: 'Issues' },
  { label: 'Moving too slowly — losing the right place', value: 'Speed' },
  { label: 'Waiving contingencies I shouldn\'t', value: 'Risk' },
];

const RENT_FEARS = [
  { label: '15% broker fees — feels like theft', value: 'Fees' },
  { label: 'Bidding wars on apartments I can afford', value: 'Competition' },
  { label: 'Getting disqualified on income requirements', value: 'Qualification' },
  { label: 'Predatory management after signing', value: 'Management' },
];

const TICKER_LINES = (name: string, territory: string[], budget: string, fear: string) => [
  `Mapping ${territory.length ? territory.slice(0, 2).join(' & ') : 'your territory'} inventory…`,
  `Calibrating ${budget || 'your ceiling'} against current comps…`,
  fear ? `Flagging ${fear.toLowerCase().split(' ').slice(0, 3).join(' ')} against your timeline…` : 'Evaluating timeline friction…',
  'Cross-referencing competing buyer profiles…',
  `Building ${name.split(' ')[0]}'s leverage map.`,
];

// ─── STEP TRANSITION VARIANTS ───────────────────────────────────────────────

const stepVariants = {
  enter: { opacity: 0, y: 10 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ─── REF CAPTURE (agent referral) ───────────────────────────────────────────
// Reads ?ref= from the URL and stores it in a module-level variable so the
// parent component can forward it to /review as a URL param.
// We avoid sessionStorage entirely — it breaks on iOS Safari (ITP) when
// links are opened from iMessage or email clients.

let _capturedAgentRef: string | null = null;

function RefCapture() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) _capturedAgentRef = ref;
  }, [searchParams]);
  return null;
}

// ─── OPTION BUTTON ──────────────────────────────────────────────────────────

function OptionBtn({
  label,
  sub,
  selected,
  onClick,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'w-full text-left border px-6 py-5 transition-all duration-300 relative overflow-hidden group',
        selected
          ? 'border-[#C8B89A] bg-[#C8B89A]/5'
          : 'border-[#2A2A27] hover:border-[#6E6A65] bg-transparent',
      )}
    >
      <span className={cn('block text-sm font-medium transition-colors', selected ? 'text-[#C8B89A]' : 'text-[#F0EDE8]/80 group-hover:text-[#F0EDE8]')}>
        {label}
      </span>
      {sub && (
        <span className="block text-[11px] text-[#6E6A65] mt-1 font-normal tracking-wide">
          {sub}
        </span>
      )}
    </button>
  );
}

// ─── CONTINUE BUTTON ─────────────────────────────────────────────────────────

function ContinueBtn({
  disabled,
  onClick,
  label = 'Continue',
}: {
  disabled: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'mt-12 flex items-center gap-3 text-[#F0EDE8] group transition-all duration-300',
        'text-[11px] font-bold uppercase tracking-[0.2em]',
        'disabled:opacity-20 disabled:cursor-default',
      )}
    >
      <span className="border-b border-[#F0EDE8]/30 group-hover:border-[#F0EDE8] pb-1 transition-all">
        {label}
      </span>
      <ArrowRight className="w-3.5 h-3.5 translate-y-[-1px] group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

// ─── PROFILE PANEL (desktop sidecar) ─────────────────────────────────────────

function ProfilePanel({
  name,
  mode,
  timeline,
  budget,
  territory,
  fear,
}: {
  name: string;
  mode: string;
  timeline: string;
  budget: string;
  territory: string[];
  fear: string;
}) {
  const fields = [
    { label: 'Name', value: name },
    { label: 'Mode', value: mode ? (mode === 'Buy' ? 'Buy in NYC' : 'Rent in NYC') : '' },
    { label: 'Timeline', value: timeline },
    { label: 'Budget', value: budget },
    { 
      label: 'Neighborhoods', 
      value: territory.length 
        ? territory.slice(0, 2).map(t => t.split('(')[0].trim()).join(', ') + (territory.length > 2 ? ` +${territory.length - 2}` : '')
        : '' 
    },
    { label: 'Primary Concern', value: fear },
  ];
  
  const filledCount = fields.filter(f => f.value && f.value !== '').length;
  const pct = Math.round((filledCount / fields.length) * 100);

  return (
    <aside className="hidden lg:flex flex-col border border-[#2A2A27] bg-[#0D0D0B] w-[280px] h-fit sticky top-12 p-8 shrink-0">
      <h2 className="font-serif italic text-[20px] text-[#F0EDE8] mb-10">Your Profile</h2>

      <div className="flex flex-col gap-8">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6E6A65] mb-1.5">
              {label}
            </p>
            <p className={cn(
              'text-[13px] transition-colors duration-500', 
              value ? 'text-[#F0EDE8]' : 'text-[#3A3A37]'
            )}>
              {value || 'Not set'}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-[#2A2A27]">
        <div className="flex justify-between items-end mb-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F0EDE8]">
            Profile Readiness
          </p>
          <p className="text-[11px] font-serif italic text-[#C8B89A]">
            {pct}%
          </p>
        </div>
        <div className="h-[2px] bg-[#2A2A27] w-full overflow-hidden">
          <motion.div
            className="h-full bg-[#C8B89A]"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </aside>
  );
}

// ─── SYNTHESIS SCREEN ────────────────────────────────────────────────────────

function SynthesisScreen({
  name,
  territory,
  budget,
  fear,
}: {
  name: string;
  territory: string[];
  budget: string;
  fear: string;
}) {
  const [tickerIdx, setTickerIdx] = useState(0);
  const [showReveal, setShowReveal] = useState(false);
  const lines = TICKER_LINES(name, territory, budget, fear);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIdx(i => {
        if (i >= lines.length - 1) {
          clearInterval(interval);
          setTimeout(() => setShowReveal(true), 800);
          return i;
        }
        return i + 1;
      });
    }, 1400);
    return () => clearInterval(interval);
  }, [lines.length]);

  return (
    <div className="w-full max-w-[480px] flex flex-col">
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#A8956E] mb-10">
        Reading your responses…
      </p>
      <div className="flex flex-col gap-5 mb-14">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={i <= tickerIdx ? { opacity: i === tickerIdx ? 1 : 0.2, x: 0 } : { opacity: 0, x: -10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex items-center gap-4"
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-400"
              style={{ background: i === tickerIdx ? '#C8B89A' : '#3A3A37' }}
            />
            <span
              className="font-serif italic transition-all duration-400"
              style={{
                color: i === tickerIdx ? '#F0EDE8' : '#3A3A37',
                fontSize: i === tickerIdx ? '1.1rem' : '1rem',
              }}
            >
              {line}
            </span>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {showReveal && (
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif italic text-[#F0EDE8] leading-snug"
            style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}
          >
            We found some things worth discussing.
          </motion.h3>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const [step, setStep] = useState(1);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [expandedBorough, setExpandedBorough] = useState<string | null>(null);
  const [activeNeighborhood, setActiveNeighborhood] = useState<string | null>(null);
  const TOTAL_STEPS = 6;

  // Set default expanded borough on step 5 only once
  const [hasSetDefaultBorough, setHasSetDefaultBorough] = useState(false);
  useEffect(() => {
    if (step === 5 && !hasSetDefaultBorough && !profile.territory?.length) {
      setExpandedBorough('Manhattan');
      setHasSetDefaultBorough(true);
    }
  }, [step, hasSetDefaultBorough, profile.territory]);

  // ─── NAVIGATION ───────────────────────────────────────────────────────────

  function goNext(n: number) {
    setStep(n);
  }

  function goBack() {
    if (step > 1) setStep(s => s - 1);
  }

  // ─── SYNTHESIS ────────────────────────────────────────────────────────────

  async function handleSynthesize() {
    setIsSynthesizing(true);
    
    // Auto-calculate 40x status for renters if not set
    if (profile.mode === 'Rent' && profile.maxMonthlyRent) {
      const annual = profile.annualIncome || 0;
      const meets = annual >= (profile.maxMonthlyRent * 40);
      updateProfile({ meetsIncomeRequirement: meets });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch('/api/profile-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
        signal: controller.signal,
      });
      const { summary } = await res.json();
      updateProfile({ summary, isPartial: false });
    } catch {
      updateProfile({
        summary: 'Your parameters are set. We will navigate your timeline and budget constraints together.',
        isPartial: false,
      });
    } finally {
      clearTimeout(timeout);
    }
    const reviewPath = _capturedAgentRef
      ? `/review?ref=${encodeURIComponent(_capturedAgentRef)}`
      : '/review';
    setTimeout(() => router.push(reviewPath), 7500);
  }

  const nameValid = profile.fullName.trim().length >= 2;
  const timelines = profile.mode === 'Rent' ? RENT_TIMELINES : BUY_TIMELINES;
  const fears = profile.mode === 'Rent' ? RENT_FEARS : BUY_FEARS;
  const budgetDisplay = profile.mode === 'Rent'
    ? profile.maxMonthlyRent ? `$${profile.maxMonthlyRent.toLocaleString()}/mo` : ''
    : profile.budgetTier;

  if (isSynthesizing) {
    return (
      <div className="min-h-dvh bg-[#0D0D0B] flex">
        <main className="flex-1 flex items-center justify-center px-6 py-24 lg:px-24">
          <SynthesisScreen
            name={profile.fullName}
            territory={profile.territory}
            budget={budgetDisplay}
            fear={profile.fear}
          />
        </main>
        <div className="pr-12 py-12 hidden lg:flex items-center">
          <ProfilePanel
            name={profile.fullName}
            mode={profile.mode}
            timeline={profile.timeline}
            budget={budgetDisplay}
            territory={profile.territory}
            fear={profile.fear}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0D0D0B] flex overflow-hidden">
      <Suspense fallback={null}>
        <RefCapture />
      </Suspense>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 flex items-center justify-between px-10 py-8 z-40">
        <button
          type="button"
          onClick={goBack}
          style={{ visibility: step > 1 ? 'visible' : 'hidden' }}
          className="flex items-center gap-2 text-[#6E6A65] text-[10px] font-bold uppercase tracking-[0.2em] hover:text-[#F0EDE8] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>
        <span className="font-serif italic text-[24px] text-[#C8B89A] tracking-tight absolute left-1/2 -translate-x-1/2">homey.</span>
      </nav>

      {/* Main split layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left side: Questions */}
        <main className="flex-1 flex items-center justify-center px-6 py-24 lg:px-20 lg:py-12 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[480px] flex flex-col pt-20 pb-20"
            >
              {/* ── STEP 1: NAME ── */}
              {step === 1 && (
                <>
                  <h1 className="font-serif italic text-[#F0EDE8] leading-snug mb-12" style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)' }}>
                    What should we call you?
                  </h1>
                  <div className="relative group">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Your name"
                      value={profile.fullName}
                      onChange={e => updateProfile({ fullName: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && nameValid && goNext(2)}
                      autoComplete="name"
                      className="w-full bg-transparent border-b border-[#2A2A27] focus:border-[#F0EDE8] outline-none py-3 font-serif italic text-[26px] text-[#F0EDE8] placeholder:text-[#3A3A37] transition-colors"
                    />
                  </div>
                  <ContinueBtn disabled={!nameValid} onClick={() => goNext(2)} />
                </>
              )}

              {/* ── STEP 2: MODE ── */}
              {step === 2 && (
                <>
                  <h2 className="font-serif italic text-[#F0EDE8] leading-snug mb-12" style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)' }}>
                    {profile.fullName.split(' ')[0]}, are you buying or renting?
                  </h2>
                  <div className="flex flex-col gap-3">
                    <OptionBtn
                      label="Buy in NYC"
                      sub="Ownership — from co-ops to condos"
                      selected={profile.mode === 'Buy'}
                      onClick={() => {
                        updateProfile({ mode: 'Buy' });
                        setTimeout(() => goNext(3), 320);
                      }}
                    />
                    <OptionBtn
                      label="Rent in NYC"
                      sub="The right building, the right lease"
                      selected={profile.mode === 'Rent'}
                      onClick={() => {
                        updateProfile({ mode: 'Rent' });
                        setTimeout(() => goNext(3), 320);
                      }}
                    />
                  </div>
                </>
              )}

              {/* ── STEP 3: TIMELINE ── */}
              {step === 3 && (
                <>
                  <h2 className="font-serif italic text-[#F0EDE8] leading-snug mb-12" style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)' }}>
                    {profile.mode === 'Rent'
                      ? 'When do you need to move in?'
                      : 'How soon does this need to happen?'}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
                    {timelines.map(opt => (
                      <OptionBtn
                        key={opt.value}
                        label={opt.label}
                        sub={opt.sub}
                        selected={profile.timeline === opt.label && !profile.moveInDate}
                        onClick={() => {
                          updateProfile({ timeline: opt.label, moveInDate: undefined });
                          setTimeout(() => goNext(4), 320);
                        }}
                      />
                    ))}
                    <div className="col-span-full mt-4 flex flex-col gap-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6E6A65]">
                        Or pick a specific date
                      </p>
                      <input
                        type="date"
                        value={profile.moveInDate || ''}
                        onChange={e => {
                          updateProfile({ moveInDate: e.target.value, timeline: `Move on ${e.target.value}` });
                        }}
                        className="w-full bg-[#141412] border border-[#2A2A27] focus:border-[#C8B89A] outline-none px-5 py-4 text-sm text-[#C8B89A] font-serif transition-colors"
                      />
                    </div>
                  </div>
                  <ContinueBtn 
                    disabled={!profile.timeline && !profile.moveInDate} 
                    onClick={() => goNext(4)} 
                  />
                </>
              )}

              {/* ── STEP 4: BUDGET ── */}
              {step === 4 && (
                <>
                  <h2 className="font-serif italic text-[#F0EDE8] leading-snug mb-12" style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)' }}>
                    {profile.mode === 'Rent'
                      ? "Financial position check."
                      : "What's your ceiling?"}
                  </h2>

                  {profile.mode === 'Rent' ? (
                    <div className="space-y-10">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#6E6A65] mb-2">Max Monthly Rent</p>
                        <div className="relative group flex items-end gap-3 border-b border-[#2A2A27] focus-within:border-[#F0EDE8] transition-colors">
                          <span className="font-serif text-[26px] text-[#A8956E] pb-3">$</span>
                          <input
                            type="number"
                            placeholder="4500"
                            min={1000}
                            value={profile.maxMonthlyRent || ''}
                            onChange={e => {
                              const v = e.target.value ? Number(e.target.value) : undefined;
                              updateProfile({ maxMonthlyRent: v });
                            }}
                            className="w-full bg-transparent outline-none py-3 font-serif text-[26px] text-[#F0EDE8] transition-colors [appearance:textfield]"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <AnimatePresence mode="wait">
                          {profile.maxMonthlyRent && profile.maxMonthlyRent >= 1000 ? (
                            <motion.div
                              key="ledger"
                              initial={{ opacity: 0, y: 10, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: 'auto' }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                              className="mb-10 overflow-hidden"
                            >
                              <div className="bg-[#141412] border border-[#2A2A27] p-5 rounded-sm relative group overflow-hidden">
                                {/* Decorative background element */}
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#C8B89A]/5 rounded-full blur-2xl group-hover:bg-[#C8B89A]/10 transition-colors" />
                                
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#6E6A65] mb-6">Qualification Ledger</p>
                                
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between group/line">
                                    <span className="text-[10px] text-[#A8A49E] uppercase tracking-widest">Target Rent</span>
                                    <div className="flex-1 mx-4 border-b border-[#2A2A27] border-dashed group-hover/line:border-[#3A3A37] transition-colors" />
                                    <span className="font-mono text-[#F0EDE8] text-xs">${profile.maxMonthlyRent.toLocaleString()}</span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between group/line">
                                    <span className="text-[10px] text-[#A8A49E] uppercase tracking-widest">Multiplier</span>
                                    <div className="flex-1 mx-4 border-b border-[#2A2A27] border-dashed group-hover/line:border-[#3A3A37] transition-colors" />
                                    <span className="font-mono text-[#C8B89A] text-xs">× 40</span>
                                  </div>

                                  <div className="pt-4 border-t border-[#2A2A27] flex items-center justify-between">
                                    <span className="text-[10px] text-[#F0EDE8] font-bold uppercase tracking-[0.2em]">Annual Minimum</span>
                                    <motion.span 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="font-serif italic text-xl text-[#C8B89A]"
                                    >
                                      ${(profile.maxMonthlyRent * 40).toLocaleString()}
                                    </motion.span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>

                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#6E6A65] mb-4">
                          Does your household income meet this requirement?
                        </p>
                        <div className="flex flex-col gap-3">
                          <OptionBtn
                            label="Yes, we meet the requirement"
                            sub="Household income is 40x the monthly rent or higher"
                            selected={profile.meetsIncomeRequirement === true}
                            onClick={() => {
                              updateProfile({ meetsIncomeRequirement: true, usingGuarantor: false });
                              if (profile.maxMonthlyRent && profile.maxMonthlyRent >= 1000) {
                                setTimeout(() => goNext(5), 320);
                              }
                            }}
                          />
                          <OptionBtn
                            label="No, we'll likely need a guarantor"
                            sub="Income is below the threshold or still being verified"
                            selected={profile.meetsIncomeRequirement === false}
                            onClick={() => {
                              updateProfile({ meetsIncomeRequirement: false, usingGuarantor: true });
                              if (profile.maxMonthlyRent && profile.maxMonthlyRent >= 1000) {
                                setTimeout(() => goNext(5), 320);
                              }
                            }}
                          />
                        </div>
                      </div>
                      
                      <ContinueBtn
                        disabled={!profile.maxMonthlyRent || profile.maxMonthlyRent < 1000 || profile.meetsIncomeRequirement === undefined}
                        onClick={() => goNext(5)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {BUY_TIERS.map(tier => (
                        <OptionBtn
                          key={tier}
                          label={tier}
                          selected={profile.budgetTier === tier}
                          onClick={() => {
                            updateProfile({ budgetTier: tier });
                            setTimeout(() => goNext(5), 320);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 5: TERRITORY (HEIRARCHICAL) ── */}
              {step === 5 && (
                <>
                  <h2 className="font-serif italic text-[#F0EDE8] leading-snug mb-12" style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)' }}>
                    Map your territory.
                  </h2>
                  
                  <div className="flex flex-col gap-10">
                    {/* Selected Summary */}
                    {(profile.territory && profile.territory.length > 0) && (
                      <div className="flex flex-wrap gap-1.5 pb-6 border-b border-[#2A2A27]">
                        {profile.territory.map(t => (
                          <span key={t} className="text-[8px] bg-[#C8B89A] text-[#0D0D0B] font-black uppercase tracking-widest px-2 py-1 flex items-center gap-2">
                            {t.split('(').shift()?.trim()}
                            <button onClick={() => {
                              updateProfile({ territory: (profile.territory || []).filter(x => x !== t) });
                            }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-px bg-[#2A2A27]/20 border-y border-[#2A2A27]">
                      {Object.entries(BOROUGHS).map(([bName, borough]) => {
                        const isExpanded = expandedBorough === bName;
                        const selectedInBorough = (profile.territory || []).some(t => t.toLowerCase().includes(bName.toLowerCase()));

                        return (
                          <div key={bName} className="bg-[#0D0D0B]">
                            <button
                              onClick={() => {
                                setExpandedBorough(isExpanded ? null : bName);
                                setActiveNeighborhood(null); // Reset micros on borough change
                              }}
                              className="w-full flex items-center justify-between py-6 px-1 hover:bg-[#C8B89A]/5 transition-colors group"
                            >
                              <div className="flex items-center gap-4">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-[0.3em] transition-colors",
                                  isExpanded || selectedInBorough ? "text-[#C8B89A]" : "text-[#6E6A65] group-hover:text-[#A8A49E]"
                                )}>
                                  {bName}
                                </span>
                                {selectedInBorough && !isExpanded && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#C8B89A]" />
                                )}
                              </div>
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                              >
                                <ArrowRight className="w-3.5 h-3.5 text-[#6E6A65] rotate-90" />
                              </motion.div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                  className={cn(isExpanded ? "overflow-visible" : "overflow-hidden")}
                                >
                                  <div className="px-1 pb-10 grid grid-cols-2 gap-x-8 gap-y-1 items-start">
                                    {Object.entries(borough.neighborhoods)
                                      .sort((a, b) => a[0].localeCompare(b[0]))
                                      .map(([nName, nData]) => {
                                        const isNeighborhoodSelected = (profile.territory || []).includes(nName);
                                        const isActive = activeNeighborhood === nName;

                                        return (
                                          <div key={nName} className="flex flex-col">
                                            <div className="flex items-center gap-2 group/row relative group/parent">
                                                <button
                                                  onClick={() => {
                                                    setActiveNeighborhood(isActive ? null : nName);
                                                    const next = isNeighborhoodSelected
                                                      ? (profile.territory || []).filter(x => x !== nName)
                                                      : [...(profile.territory || []), nName];
                                                    updateProfile({ territory: next });
                                                  }}
                                                  className={cn(
                                                    "flex-1 text-left py-3 font-serif italic text-[17px] transition-all relative leading-tight",
                                                    isNeighborhoodSelected ? "text-[#C8B89A]" : "text-[#F0EDE8]/50 hover:text-[#F0EDE8]"
                                                  )}
                                                >
                                                  {nName}
                                                </button>
                                                
                                                {/* Neighborhood Hover Summary */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#0D0D0B] border border-[#2A2A27] opacity-0 group-hover/parent:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl">
                                                  <p className="text-[10px] leading-relaxed normal-case font-bold text-[#F0EDE8] mb-1.5 italic text-center">{nName}</p>
                                                  <p className="text-[9px] leading-relaxed normal-case font-normal text-[#A8A49E] line-clamp-4 text-center">{nData.summary}</p>
                                                </div>
                                            </div>
                                            
                                            <AnimatePresence>
                                              {isActive && (
                                                <motion.div
                                                  initial={{ height: 0, opacity: 0 }}
                                                  animate={{ height: 'auto', opacity: 1 }}
                                                  exit={{ height: 0, opacity: 0 }}
                                                  className="bg-[#141412] p-3 mt-1 border border-[#2A2A27] z-10 relative"
                                                >
                                                  <div className="flex flex-wrap gap-2">
                                                    {/* "ALL" Neighborhood Option */}
                                                    <button
                                                      onClick={() => {
                                                        const next = isNeighborhoodSelected
                                                          ? (profile.territory || []).filter(x => x !== nName)
                                                          : [...(profile.territory || []), nName];
                                                        updateProfile({ territory: next });
                                                      }}
                                                      className={cn(
                                                        "px-2 py-1 text-[8px] uppercase font-bold tracking-widest border transition-all relative whitespace-nowrap",
                                                        isNeighborhoodSelected ? "border-[#C8B89A] text-[#C8B89A] bg-[#C8B89A]/10" : "border-[#2A2A27] text-[#6E6A65] hover:border-[#6E6A65]",
                                                      )}
                                                    >
                                                      ALL {nName}
                                                    </button>

                                                    {Object.entries(nData.micros || {}).map(([mName, mData]) => {
                                                      const fullKey = `${mName} (${nName})`;
                                                      const isSel = (profile.territory || []).includes(fullKey);
                                                      return (
                                                        <button
                                                          key={mName}
                                                          onClick={() => {
                                                            const next = isSel
                                                              ? (profile.territory || []).filter(x => x !== fullKey)
                                                              : [...(profile.territory || []), fullKey];
                                                            updateProfile({ territory: next });
                                                          }}
                                                          className={cn(
                                                            "px-2 py-1 text-[8px] uppercase font-bold tracking-widest border transition-all relative group/tool whitespace-nowrap",
                                                            isSel ? "border-[#C8B89A] text-[#C8B89A] bg-[#C8B89A]/10" : "border-[#2A2A27] text-[#6E6A65] hover:border-[#6E6A65]",
                                                          )}
                                                        >
                                                          {mName}
                                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#0D0D0B] border border-[#2A2A27] opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-opacity z-[60] shadow-2xl">
                                                            <p className="text-[10px] leading-relaxed normal-case font-bold text-[#F0EDE8] mb-1.5 italic text-center">{mName}</p>
                                                            <p className="text-[9px] leading-relaxed normal-case font-normal text-[#A8A49E] line-clamp-4 text-center">{(mData as any).summary}</p>
                                                          </div>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <ContinueBtn
                    disabled={!profile.territory?.length}
                    onClick={() => goNext(6)}
                  />
                </>
              )}

              {/* ── STEP 6: ANXIETY ── */}
              {step === 6 && (
                <>
                  <h2 className="font-serif italic text-[#F0EDE8] leading-snug mb-12" style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.25rem)' }}>
                    What makes your stomach drop?
                  </h2>
                  <div className="flex flex-col gap-3">
                    {fears.map(f => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => updateProfile({ fear: f.label })}
                        aria-pressed={profile.fear === f.label}
                        className={cn(
                          'w-full border px-6 py-5 text-left flex items-center justify-between group transition-all duration-300',
                          profile.fear === f.label
                            ? 'border-[#C8B89A] bg-[#C8B89A]/5'
                            : 'border-[#2A2A27] hover:border-[#6E6A65]',
                        )}
                      >
                        <span className={cn('text-sm transition-colors', profile.fear === f.label ? 'text-[#C8B89A]' : 'text-[#F0EDE8]/80 group-hover:text-[#F0EDE8]')}>
                          {f.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <ContinueBtn
                    disabled={!profile.fear}
                    onClick={handleSynthesize}
                    label="Build my profile"
                  />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right side: Profile sidebar (desktop only) */}
        <div className="pr-10 py-10 hidden lg:flex items-center">
          <ProfilePanel
            name={profile.fullName}
            mode={profile.mode}
            timeline={profile.timeline}
            budget={budgetDisplay}
            territory={profile.territory ?? []}
            fear={profile.fear}
          />
        </div>
      </div>
    </div>
  );
}
