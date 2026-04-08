import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Brain, Copy, AlertTriangle, CheckCircle2, Minus, ChevronDown, ArrowLeft, Check,
  MessageSquare, Eye, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ClientRow, ActiveProfile, ClientAIIntelligence, VaultDoc } from './types';
import { FrictionTelemetry, synthesizeAnomalies } from './FrictionTelemetry';
import { LiquidityDecayForecast } from './LiquidityDecayForecast';
import { ScoreArc, JourneyMinimap, JOURNEY_STAGES, deriveJourneyStage } from './agentUtils';
import { IntelligenceDesk } from './IntelligenceDesk';
import { StrategyMirror } from './StrategyMirror';

// Constants
const BUYER_DOCS: { key: keyof VaultDoc; label: string }[] = [
  { key: 'w2', label: 'W-2s & Tax Returns' },
  { key: 'bank', label: 'Bank Statements' },
  { key: 'preapproval', label: 'Pre-Approval' },
  { key: 'rebny', label: 'REBNY Statement' },
  { key: 'attorney', label: 'Attorney' },
];

const RENTER_DOCS: { key: keyof VaultDoc; label: string }[] = [
  { key: 'w2', label: 'Paystubs' },
  { key: 'bank', label: 'Bank Statements' },
  { key: 'id', label: 'Gov. ID' },
  { key: 'guarantor', label: 'Guarantor Docs' },
  { key: 'landlord', label: 'Landlord Ref.' },
];

interface ClientSpotlightProps {
  selectedClient: ClientRow;
  activeProfile: ActiveProfile;
  onClose: () => void;
  vibe: string;
  suggestedTouch: any;
  logTouchDate: (id: string, type: string) => void;
  intelligenceData: ClientAIIntelligence | null;
  isGeneratingIntelligence: boolean;
  generateIntelligence: () => void;
  listingUrl: string;
  setListingUrl: (url: string) => void;
  submitListing: () => void;
  isStreaming: boolean;
  streamingAnalysis: string;
  analyses: any[];
}

function ListingAccordion({ analysis }: { analysis: any }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-[#2A2A27] bg-[#141412] text-xs mb-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex justify-between items-center text-[9px] uppercase tracking-widest text-[#6E6A65] hover:text-[#C8B89A] transition-colors"
      >
        <span className="truncate w-48 text-left">{analysis.url}</span>
        <div className="flex items-center gap-2">
           <span className="opacity-50">{new Date(analysis.created_at).toLocaleDateString()}</span>
           <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-[#2A2A27] markdown-body space-y-2 max-h-64 overflow-y-auto">
              <ReactMarkdown>{analysis.analysis_markdown}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ClientSpotlight({
  selectedClient, activeProfile, onClose, vibe, suggestedTouch, logTouchDate,
  intelligenceData, isGeneratingIntelligence, generateIntelligence,
  listingUrl, setListingUrl, submitListing, isStreaming, streamingAnalysis, analyses
}: ClientSpotlightProps) {

  // Synthesize behavioral anomalies from profile + metadata
  const [copied, setCopied] = useState(false);

  const anomalies = useMemo(
    () => synthesizeAnomalies(selectedClient, activeProfile),
    [selectedClient, activeProfile]
  );

  const journeyStage = deriveJourneyStage(activeProfile, selectedClient);
  const stage = JOURNEY_STAGES[journeyStage - 1];

  const vaultKeys: (keyof VaultDoc)[] = ['w2', 'bank', 'preapproval', 'rebny', 'attorney'];
  const vaultDone = vaultKeys.filter(k => (activeProfile.vault as VaultDoc)?.[k]).length;
  const vaultTotal = activeProfile.kind === 'renter' ? 5 : 5;
  const vaultPct = vaultTotal > 0 ? vaultDone / vaultTotal : 0;

  const handleComms = (type: 'email' | 'text') => {
    logTouchDate(selectedClient.client_id, type);
    const emailBody = `Hey! Saw a 2BR pop up that might fit your budget. Want me to send the link?`;
    const subject = `Strategic Update regarding your ${activeProfile.kind} search`;

    if (type === 'email') {
      window.location.href = `mailto:${selectedClient.profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    } else {
      navigator.clipboard.writeText(emailBody).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      key="slideover"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 bg-[#111110] border-l border-[#2A2A27] overflow-y-auto px-4 md:px-8 py-6 md:py-8"
    >
      <div className="flex items-start justify-between mb-6 md:mb-8 border-b border-[#2A2A27]/50 pb-4 md:pb-6">
        <div className="flex items-start gap-3">
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-[#2A2A27] rounded-full transition-colors text-[#6E6A65] hover:text-[#F0EDE8] shrink-0 mt-0.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-serif text-2xl md:text-4xl text-[#F0EDE8] mb-2">
              {selectedClient.profile?.full_name || selectedClient.profile?.email?.split('@')[0] || 'Anonymous'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#A8A49E]">
              <span>{vibe}</span>
              <span className="hidden sm:inline">·</span>
              <span className="opacity-70 hidden sm:inline">{selectedClient.profile?.email}</span>
              <span>·</span>
              <span className="uppercase tracking-widest text-[9px] font-bold px-1.5 py-0.5 border border-[#2A2A27]">{selectedClient.status}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="hidden lg:block p-2 hover:bg-[#2A2A27] rounded-full transition-colors text-[#6E6A65] hover:text-[#F0EDE8] shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Journey Stage Banner */}
      <div className="flex items-center gap-4 mb-6 px-4 py-3 bg-[#141412] border border-[#2A2A27] rounded-sm">
        <div className="shrink-0">
          <div className="text-[9px] uppercase tracking-widest text-[#6E6A65] mb-1">Stage {journeyStage} of 6</div>
          <div className="font-serif text-base text-[#C8B89A]">{stage?.title}</div>
          <div className="text-[10px] text-[#6E6A65] italic">{stage?.feeling}</div>
        </div>
        <div className="flex-1 flex items-center justify-end">
          <JourneyMinimap stage={journeyStage} size="md" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-8">
          {/* Action Sandbox */}
          <div className="bg-[#141412] border border-[#C8B89A]/30 p-6 rounded-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-[#C8B89A]" />
             <div className="flex items-center gap-2 mb-4">
               <Brain className="w-4 h-4 text-[#C8B89A]" />
               <span className="text-[10px] uppercase tracking-widest text-[#C8B89A] font-bold">Suggested Action</span>
             </div>
             
             <div className="flex items-center justify-between bg-[#0D0D0B] p-4 border border-[#2A2A27] rounded-sm mb-4">
               <div>
                 <div className="text-sm text-[#F0EDE8]">{suggestedTouch.text}</div>
                 <div className="text-[10px] text-[#A8A49E] mt-1">Based on friction and last touch history</div>
               </div>
               <div className="flex gap-2">
                  <button
                    onClick={() => handleComms(suggestedTouch.type === 'email' ? 'email' : 'text')}
                    className="px-3 py-1.5 bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30 text-[9px] uppercase tracking-widest font-bold hover:bg-[#4A7C59]/20 transition-colors flex items-center gap-1.5"
                  >
                    {copied && suggestedTouch.type !== 'email' ? (
                      <><Check className="w-3 h-3" /> Copied!</>
                    ) : (
                      <>Log & Send {suggestedTouch.channel}</>
                    )}
                  </button>
               </div>
             </div>

             <div className="text-[10px] text-[#6E6A65] font-bold mb-2 uppercase tracking-widest">Quick Snippets</div>
             <div className="space-y-2">
               <div className="p-3 bg-[#0D0D0B] border border-[#2A2A27] text-sm text-[#A8A49E] cursor-pointer hover:border-[#C8B89A] transition-colors" onClick={() => navigator.clipboard.writeText('Hey! Saw a 2BR pop up that might fit your budget. Want me to send the link?')}>
                  Hey! Saw a 2BR pop up that might fit your budget. Want me to send the link? <Copy className="w-3 h-3 inline ml-2" />
               </div>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between border-b border-[#2A2A27] pb-2">
               <h3 className="text-xs font-bold uppercase tracking-widest text-[#6E6A65]">Deep Brief</h3>
               <button onClick={generateIntelligence} disabled={isGeneratingIntelligence} className="text-[9px] uppercase tracking-widest hover:text-[#C8B89A] transition-colors opacity-70">
                 {isGeneratingIntelligence ? 'Synthesizing...' : 'Regenerate'}
               </button>
             </div>
             {intelligenceData ? (
                <div className="space-y-6 text-[#A8A49E]">
                  <p className="text-sm italic leading-relaxed text-[#F0EDE8] border-l-2 border-[#C8B89A]/40 pl-4">{intelligenceData.narrative}</p>
                </div>
             ) : (
                <div className="bg-[#141412] border border-[#2A2A27] p-8 text-center text-[#6E6A65]">
                  <p className="text-xs">No synthesized brief for this client yet.</p>
                </div>
             )}
          </div>

          {/* Friction Telemetry — The Silent Observer */}
          <FrictionTelemetry anomalies={anomalies} />

          {/* Document Intelligence Desk */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A2A27] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#6E6A65]">Document Intelligence</h3>
            </div>
            <IntelligenceDesk clientId={selectedClient.client_id} />
          </div>

          {/* Strategy Mirror — The 1:1 Connection */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-[#2A2A27] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#6E6A65]">Strategist Mirror</h3>
            </div>
            <StrategyMirror clientId={selectedClient.client_id} />
          </div>
        </div>

        <div className="space-y-8">
           <div>
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6E6A65] border-b border-[#2A2A27] pb-2 mb-4">Profile Data</h3>
             <div className="space-y-4 text-xs">
                <div><span className="opacity-50 block mb-1">Budget</span> <span className="font-serif text-[#C8B89A] text-lg">{activeProfile.kind === 'renter' ? `$${activeProfile.max_monthly_rent||'—'}` : activeProfile.budget_tier}</span></div>
                <div><span className="opacity-50 block mb-1">Territory</span> {activeProfile.territory?.join(', ') || 'Any'}</div>
             </div>
           </div>

           <div>
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6E6A65] border-b border-[#2A2A27] pb-2 mb-4">Vault Status</h3>
             <div className="flex items-center gap-4 mb-4">
               {/* SVG progress ring */}
               <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0">
                 <circle cx="28" cy="28" r="22" fill="none" stroke="#2A2A27" strokeWidth="4" />
                 <circle
                   cx="28" cy="28" r="22" fill="none"
                   stroke={vaultPct >= 1 ? '#4A7C59' : vaultPct >= 0.5 ? '#A8956E' : '#6E6A65'}
                   strokeWidth="4"
                   strokeLinecap="round"
                   strokeDasharray={`${vaultPct * 138.2} 138.2`}
                   transform="rotate(-90 28 28)"
                   style={{ transition: 'stroke-dasharray 0.6s ease' }}
                 />
                 <text x="28" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill={vaultPct >= 1 ? '#4A7C59' : '#A8A49E'} fontFamily="serif">
                   {vaultDone}/{vaultTotal}
                 </text>
               </svg>
               <div>
                 <div className="text-xs text-[#F0EDE8] font-bold">{vaultPct >= 1 ? 'Vault Complete' : `${vaultTotal - vaultDone} doc${vaultTotal - vaultDone !== 1 ? 's' : ''} missing`}</div>
                 <div className="text-[10px] text-[#6E6A65] mt-0.5">{Math.round(vaultPct * 100)}% complete</div>
               </div>
             </div>
             <div className="flex flex-col gap-2">
              {(activeProfile.kind === 'buyer' ? BUYER_DOCS : RENTER_DOCS).map(doc => {
                const ready = !!(activeProfile.vault as VaultDoc)?.[doc.key];
                return (
                  <div key={doc.key} className={`flex justify-between items-center text-xs p-2 border ${ready ? 'border-[#4A7C59]/20 bg-[#4A7C59]/5' : 'border-[#2A2A27]'}`}>
                    <span className={ready ? 'text-[#4A7C59] font-medium' : 'text-[#6E6A65]'}>{doc.label}</span>
                    {ready ? <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7C59]" /> : <Minus className="w-3.5 h-3.5 text-[#3A3A37]" />}
                  </div>
                )
              })}
             </div>
           </div>

           {/* Last Activity */}
           <div>
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6E6A65] border-b border-[#2A2A27] pb-2 mb-3">Last Activity</h3>
             <div className="space-y-2 text-xs">
               {selectedClient.metadata?.last_meaningful_touch ? (() => {
                 const lmt = selectedClient.metadata.last_meaningful_touch;
                 const summary = typeof lmt === 'object' ? lmt.summary : lmt;
                 const date = typeof lmt === 'object' ? lmt.date : null;
                 const type = typeof lmt === 'object' ? lmt.type : null;
                 return (
                   <div className="flex items-start gap-2 p-2 border border-[#2A2A27] bg-[#141412]">
                     <MessageSquare className="w-3 h-3 text-[#6E6A65] mt-0.5 shrink-0" />
                     <div>
                       {type && <div className="text-[9px] uppercase tracking-widest text-[#6E6A65] mb-0.5">{type}</div>}
                       <div className="text-[#A8A49E]">{summary}</div>
                       {date && <div className="text-[9px] text-[#6E6A65] mt-0.5 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{new Date(date).toLocaleDateString()}</div>}
                     </div>
                   </div>
                 );
               })() : null}
               {analyses[0] ? (
                 <div className="flex items-start gap-2 p-2 border border-[#2A2A27] bg-[#141412]">
                   <Eye className="w-3 h-3 text-[#6E6A65] mt-0.5 shrink-0" />
                   <div>
                     <div className="text-[9px] uppercase tracking-widest text-[#6E6A65] mb-0.5">Last Listing Analyzed</div>
                     <div className="text-[#A8A49E] truncate w-44">{analyses[0].url}</div>
                     <div className="text-[9px] text-[#6E6A65] mt-0.5 flex items-center gap-1">
                       <Clock className="w-2.5 h-2.5" />
                       {new Date(analyses[0].created_at).toLocaleDateString()}
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="text-[10px] text-[#6E6A65] italic p-2">No recent activity recorded.</div>
               )}
             </div>
           </div>

           {/* Liquidity Decay Forecast — The Anti-Zillow */}
           <LiquidityDecayForecast profile={activeProfile} />

           <div>
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6E6A65] border-b border-[#2A2A27] pb-2 mb-4">Listing Pitcher</h3>
             <input type="url" placeholder="Paste Streeteasy URL..." value={listingUrl} onChange={e=>setListingUrl(e.target.value)} 
               className="w-full bg-[#141412] border border-[#2A2A27] px-3 py-2 text-xs focus:border-[#C8B89A] outline-none mb-2" />
             <button onClick={submitListing} disabled={isStreaming} className="w-full bg-[#C8B89A]/10 text-[#C8B89A] border border-[#C8B89A] py-2 text-[9px] uppercase tracking-widest font-bold hover:bg-[#C8B89A]/20 disabled:opacity-50 transition-colors mb-4">
               {isStreaming ? 'Analyzing...' : 'Analyze Fit'}
             </button>

             {streamingAnalysis && (
                <div className="mt-4 p-4 border border-[#A8956E] bg-[#A8956E]/5 text-xs markdown-body space-y-2">
                  <ReactMarkdown>{streamingAnalysis}</ReactMarkdown>
                </div>
              )}
              <div className="space-y-4">
                {analyses.map((ans, i) => (
                  <ListingAccordion key={ans.id || i} analysis={ans} />
                ))}
              </div>

            </div>
        </div>
      </div>
    </motion.div>
  );
}
