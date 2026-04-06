'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Send, X, Lock, Briefcase, Calculator,
  AlertTriangle, ShieldCheck, Link as LinkIcon, Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Nav } from '@/components/buyer/Nav';
import { VaultItem } from '@/components/buyer/VaultItem';
import { CalculatorView } from '@/components/buyer/CalculatorView';
import { MarketStat } from '@/components/buyer/MarketStat';
import { ProfileEditModal } from '@/components/buyer/ProfileEditModal';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { VAULT_UNLOCK_THRESHOLD, REALITY_CHECK_UNLOCK_THRESHOLD, AGENT_UNLOCK_THRESHOLD } from '@/lib/readiness';
import { NEIGHBORHOOD_STATS, RENTER_NEIGHBORHOOD_STATS } from '@/types/profile';
import type { ChatMessage } from '@/types/profile';

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'The NYC market is designed to be overwhelming. Let\'s cut through the noise. Paste a listing URL, or ask me a strategic question.',
  timestamp: new Date(),
};

export default function DashboardPage() {
  const router = useRouter();
  const { profile, updateProfile, readinessScore } = useProfile();

  const [activeTab, setActiveTab] = useState<'strategy' | 'vault' | 'calculator' | 'market'>('strategy');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAgentConnect, setShowAgentConnect] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Park Slope');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isVaultUnlocked = readinessScore >= VAULT_UNLOCK_THRESHOLD;
  const isRealityCheckUnlocked = readinessScore >= REALITY_CHECK_UNLOCK_THRESHOLD;
  const isAgentUnlocked = readinessScore >= AGENT_UNLOCK_THRESHOLD;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (isAgentUnlocked && !profile.isPartial) {
      const dismissed = localStorage.getItem('homey_agent_dismissed');
      if (!dismissed) {
        const t = setTimeout(() => setShowAgentConnect(true), 3500);
        return () => clearTimeout(t);
      }
    }
  }, [isAgentUnlocked, profile.isPartial]);

  // Enforce locked tab constraints
  useEffect(() => {
    if (activeTab === 'vault' && !isVaultUnlocked) setActiveTab('strategy');
    if (activeTab === 'calculator' && !isRealityCheckUnlocked) setActiveTab('strategy');
  }, [isVaultUnlocked, isRealityCheckUnlocked, activeTab]);

  const sendChat = async () => {
    const content = chatInput.trim();
    if (!content) return;
    const isUrl = /https?:\/\/[^\s]+/.test(content);
    const userMsg: ChatMessage = { role: 'user', content, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatHistory, userMsg].map(m => ({ role: m.role, content: m.content })),
          profile: { mode: profile.mode, timeline: profile.timeline, budgetTier: profile.budgetTier, territory: profile.territory, fear: profile.fear, frictionData: profile.frictionData },
          isUrlAnalysis: isUrl,
        }),
      });
      const { text } = await res.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: text, timestamp: new Date() }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please try again.", timestamp: new Date() }]);
    }
    setIsTyping(false);
  };

  const toggleVault = (item: keyof typeof profile.vault) => {
    updateProfile({ vault: { ...profile.vault, [item]: !profile.vault[item] } });
  };

  const parseBudget = (tier: string) => {
    if (!tier) return Infinity;
    const clean = tier.replace(/[$,]/g, '').toUpperCase();
    if (clean.endsWith('K')) return parseFloat(clean) * 1000;
    if (clean.endsWith('M')) return parseFloat(clean) * 1_000_000;
    return parseFloat(clean) || Infinity;
  };
  const needsPivot = parseBudget(profile.budgetTier) < 750_000 &&
    (profile.territory?.includes('West Village / Greenwich') || profile.territory?.includes('Park Slope'));

  const userInitials = profile.fullName ? profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-[#0D0D0B] flex flex-col">
      <Nav isAuthenticated userInitials={userInitials} />

      <ProfileEditModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} />

      <div className="max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Profile card */}
          <div className="glass p-6 rounded-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8B89A]/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A8956E] to-[#C8B89A] flex items-center justify-center font-serif text-[#0D0D0B] text-xl relative group">
                {userInitials}
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="absolute inset-0 bg-[#0D0D0B]/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity transition-all"
                >
                  <Info className="w-4 h-4 text-[#F0EDE8]" />
                </button>
              </div>
              <div>
                <h3 className="font-medium text-[#F0EDE8] flex items-center gap-2">
                  {profile.mode === 'Rent' ? 'Renter' : profile.mode === 'Buy' ? 'Buyer' : 'Strategic Profile'}
                  <button onClick={() => setShowEditModal(true)} className="p-1 hover:bg-[#2A2A27] rounded-full transition-colors">
                    <Info className="w-3 h-3 text-[#6E6A65]" />
                  </button>
                </h3>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A8A49E]">
                  <span className={cn('w-1.5 h-1.5 rounded-full', profile.isPartial ? 'bg-[#6E6A65]' : 'bg-[#4A7C59] animate-pulse')} />
                  {profile.isPartial ? 'Limited Protocol' : 'Active Protocol'}
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] text-[#6E6A65] font-bold uppercase tracking-widest">Readiness Score</span>
                <span className="font-serif text-2xl text-[#C8B89A]">
                  {readinessScore}<span className="text-sm text-[#6E6A65] ml-1">/100</span>
                </span>
              </div>
              <div className="h-1 bg-[#2A2A27] w-full">
                <div className="h-full bg-[#C8B89A] transition-all duration-1000" style={{ width: `${readinessScore}%` }} />
              </div>
              <button
                onClick={() => setShowScoreInfo(!showScoreInfo)}
                className="mt-2 text-[10px] text-[#6E6A65] hover:text-[#F0EDE8] flex items-center gap-1 transition-colors"
              >
                <Info className="w-3 h-3" /> What this means
              </button>
              <AnimatePresence>
                {showScoreInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[10px] text-[#A8A49E] mt-2 leading-relaxed bg-[#0D0D0B] p-2 border border-[#2A2A27] rounded-sm"
                  >
                    Complete your Vault documents to reach 90.<br />
                    At 75+, your agent connection unlocks.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation */}
          <div className="glass p-6 rounded-sm">
            <h4 className="text-[10px] text-[#6E6A65] font-bold uppercase tracking-widest mb-4">Navigational Modules</h4>
            <div className="space-y-2">
              {[
                { id: 'strategy', label: 'Strategy Room', sub: 'Guidance & Chat', locked: false },
                { id: 'vault', label: 'The Vault', sub: isVaultUnlocked ? 'Board Package & Prep' : 'Complete profile to unlock', locked: !isVaultUnlocked },
                { id: 'calculator', label: 'Reality Check', sub: isRealityCheckUnlocked ? 'Financial Stress Test' : 'Unlock via The Vault', locked: !isRealityCheckUnlocked },
                { id: 'market', label: 'Market Interpreter', sub: 'Data translation', locked: false },
              ].map(tab => (
                <button
                  key={tab.id}
                  disabled={tab.locked}
                  onClick={() => !tab.locked && setActiveTab(tab.id as any)}
                  className={cn(
                    'w-full p-4 text-left border transition-all relative rounded-sm',
                    activeTab === tab.id ? 'bg-[#C8B89A]/5 border-[#C8B89A]' : 'bg-[#1A1A17]/30 border-[#2A2A27] hover:border-[#A8956E]',
                    tab.locked && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {tab.locked && <Lock className="w-3 h-3 absolute top-4 right-4 text-[#6E6A65]" />}
                  <div className={cn('text-xs font-medium mb-1', activeTab === tab.id ? 'text-[#E8DCC8]' : 'text-[#A8A49E]')}>
                    {tab.label}
                  </div>
                  <div className="text-[9px] text-[#6E6A65] uppercase tracking-widest">{tab.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="space-y-8 min-w-0">
          {activeTab === 'strategy' && (
            <>
              {/* Next Move hero */}
              <div className="glass p-8 rounded-sm border-l-4 border-[#C8B89A] relative overflow-hidden">
                <div className="text-[10px] text-[#6E6A65] uppercase tracking-widest font-bold mb-4">Your Next Move</div>
                {profile.isPartial || readinessScore < 40 ? (
                  <>
                    <h2 className="font-serif text-3xl md:text-4xl text-[#F0EDE8] mb-3">Finish your profile.</h2>
                    <p className="text-[#A8A49E] font-light mb-8 max-w-lg">
                      {profile.mode === 'Rent' 
                        ? 'We need to confirm your move-in timing and qualification status to build your roadmap.' 
                        : '3 questions stand between you and a clear strategy.'}
                    </p>
                    <button
                      onClick={() => router.push('/interview')}
                      className="px-6 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all flex items-center gap-2"
                    >
                      Pick up where you left off <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : readinessScore < 75 ? (
                  <>
                    <h2 className="font-serif text-3xl md:text-4xl text-[#F0EDE8] mb-3">Secure your financial identity.</h2>
                    <p className="text-[#A8A49E] font-light mb-8 max-w-lg">
                      Your biggest friction point right now is {profile.fear?.toLowerCase() || 'the unknown'}. Assemble your Vault before your next open house.
                    </p>
                    <button
                      onClick={() => setActiveTab('vault')}
                      className="px-6 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all flex items-center gap-2"
                    >
                      Open The Vault <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="font-serif text-3xl md:text-4xl text-[#F0EDE8] mb-3">You're ready for a real conversation.</h2>
                    <p className="text-[#A8A49E] font-light mb-8 max-w-lg">Your agent has your full profile and is expecting you.</p>
                    <button
                      onClick={() => setShowAgentConnect(true)}
                      className="px-6 py-4 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all flex items-center gap-2"
                    >
                      Initiate connection <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Context cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { 
                    title: 'Why this is hard', 
                    body: profile.mode === 'Rent' 
                      ? `Listing transparency is low. For your $${(profile.maxMonthlyRent || 0).toLocaleString()} budget, you're competing against hundreds of applicants for the same few clean units.`
                      : `A target of ${profile.budgetTier || 'your budget'} in NYC means competing against all-cash buyers. Perfection is impossible; leverage is required.` 
                  },
                  { 
                    title: 'What to prepare next', 
                    body: profile.mode === 'Rent'
                      ? 'Assemble your "Qualification Packet" (Paystubs, Reference Letters, ID) today. In this market, you have to offer within 30 minutes of the viewing.'
                      : 'Do not step into an open house without a verified pre-approval and proof of liquid post-closing funds.' 
                  },
                  { 
                    title: 'What to avoid', 
                    body: profile.mode === 'Rent'
                      ? "Paying a 15% broker fee for a 'no-fee' apartment in disguise. We will help you audit the management history before you sign."
                      : "Getting emotionally attached to a layout before validating the building's financial health." 
                  },
                ].map(card => (
                  <div key={card.title} className="glass p-6 rounded-sm border-t border-[#2A2A27]">
                    <h4 className="text-[10px] font-bold text-[#6E6A65] uppercase tracking-widest mb-2">{card.title}</h4>
                    <p className="text-xs text-[#A8A49E] leading-relaxed">{card.body}</p>
                  </div>
                ))}
              </div>

              {needsPivot && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-[#8B3A3A]/50 bg-[#8B3A3A]/10 p-6 rounded-sm relative overflow-hidden flex flex-col md:flex-row gap-6 items-start md:items-center"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8B3A3A]" />
                  <AlertTriangle className="w-6 h-6 text-[#8B3A3A] shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-[#F0EDE8] mb-1 uppercase tracking-widest">Guidance Intervention</h4>
                    <p className="text-xs text-[#A8A49E] leading-relaxed">
                      A budget of <strong>{profile.budgetTier}</strong> in <strong>{profile.territory[0]}</strong> puts you in the bottom 5% of inventory, leading to extreme bidding wars and poor quality.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Chat */}
              <section className="glass rounded-sm overflow-hidden flex flex-col h-[420px] md:h-[500px]">
                <div className="p-4 border-b border-[#2A2A27] flex items-center gap-3 bg-[#1A1A17]/50">
                  <div className="w-8 h-8 rounded-full bg-[#C8B89A]/10 border border-[#C8B89A]/20 flex items-center justify-center font-bold text-[10px] text-[#A8956E]">H</div>
                  <div>
                    <h4 className="text-xs font-medium text-[#F0EDE8]">Strategy Intelligence</h4>
                    <p className="text-[9px] text-[#6E6A65] uppercase tracking-widest">Guidance OS is active</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                  {chatHistory.map((msg, i) => {
                    const isUrl = /https?:\/\/[^\s]+/.test(msg.content);
                    return (
                      <div key={i} className={cn('flex gap-4 max-w-[85%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
                        <div className={cn(
                          'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[10px]',
                          msg.role === 'assistant' ? 'bg-[#C8B89A]/10 border border-[#C8B89A]/20 text-[#A8956E]' : 'bg-[#1A1A17] border border-[#2A2A27] text-[#6E6A65]'
                        )}>
                          {msg.role === 'assistant' ? 'H' : 'U'}
                        </div>
                        <div className={cn(
                          'p-4 rounded-sm text-sm leading-relaxed',
                          msg.role === 'assistant' ? 'bg-[#1A1A17] border border-[#2A2A27] text-[#A8A49E]' : 'bg-[#C8B89A]/10 border border-[#C8B89A]/20 text-[#E8DCC8]'
                        )}>
                          {isUrl && msg.role === 'user' ? (
                            <div className="flex items-center gap-2 text-[#C8B89A] italic">
                              <LinkIcon className="w-4 h-4" /> Property Link Submitted for Analysis
                            </div>
                          ) : (
                            <div className="prose-homey">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#C8B89A]/10 border border-[#C8B89A]/20 flex items-center justify-center font-bold text-[10px] text-[#A8956E]">H</div>
                      <div className="bg-[#1A1A17] border border-[#2A2A27] p-4 rounded-sm flex gap-1 items-center">
                        {[0, 0.2, 0.4].map(d => (
                          <div key={d} className="w-1.5 h-1.5 bg-[#A8956E] rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-[#1A1A17]/50 border-t border-[#2A2A27]">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Ask a question, or paste a StreetEasy link for brutal analysis..."
                        className="w-full bg-[#0D0D0B] border border-[#2A2A27] p-4 text-sm outline-none focus:border-[#C8B89A] transition-colors text-[#F0EDE8] placeholder:text-[#6E6A65] pr-10"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendChat()}
                      />
                      {/https?:\/\/[^\s]+/.test(chatInput) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C8B89A]">
                          <ShieldCheck className="w-5 h-5 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={sendChat}
                      className="bg-[#C8B89A] text-[#0D0D0B] px-6 font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'vault' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <div className="text-[10px] text-[#A8956E] font-bold tracking-[0.2em] uppercase mb-4">The Vault</div>
                <h2 className="font-serif text-4xl mb-2 text-[#F0EDE8]">Action Plan & Board Prep</h2>
                <p className="text-[#A8A49E] font-light max-w-xl">
                  NYC real estate is won in the paperwork. Assemble your financial identity here proactively to increase your Readiness Score and beat competing buyers.
                </p>
              </div>
              <div className="glass p-8 rounded-sm">
                <h3 className="text-sm font-bold text-[#F0EDE8] uppercase tracking-widest mb-6 flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-[#C8B89A]" /> {profile.mode === 'Rent' ? 'Rental Qualifications' : 'Document Assembly'}
                </h3>
                <div className="space-y-4">
                  {profile.mode === 'Rent' ? (
                    <>
                      <VaultItem title="Recent Paystubs (Last 3)" desc="Standard income verification. Rent must be max 1/40th of annual income." checked={profile.vault?.w2} onToggle={() => toggleVault('w2')} />
                      <VaultItem title="Bank Statements (Last 2 Months)" desc="Proof of liquidity for upfront costs (first month + security + fee)." checked={profile.vault?.bank} onToggle={() => toggleVault('bank')} />
                      <VaultItem title="Government ID" desc="Color copy of license or passport." checked={profile.vault?.id} onToggle={() => toggleVault('id')} />
                      <VaultItem title="Guarantor Documents" desc="If you don't meet the 40x rule, your guarantor needs to prepare their 80x docs." checked={profile.vault?.guarantor} onToggle={() => toggleVault('guarantor')} />
                      <VaultItem title="Landlord Reference Letter" desc="Proof of good standing from your previous landlord." checked={profile.vault?.landlord} onToggle={() => toggleVault('landlord')} />
                    </>
                  ) : (
                    <>
                      <VaultItem title="W-2s & Tax Returns (Last 2 Years)" desc="Essential for pre-approval and co-op boards. Redact SSNs before saving." checked={profile.vault?.w2} onToggle={() => toggleVault('w2')} />
                      <VaultItem title="Bank & Investment Statements (Last 2 Months)" desc="Proof of funds. Must show liquid cash to cover closing costs and post-closing liquidity." checked={profile.vault?.bank} onToggle={() => toggleVault('bank')} />
                      <VaultItem title="Mortgage Pre-Approval Letter" desc="Sellers in NYC will not look at an offer without this. Must be dated within 90 days." checked={profile.vault?.preapproval} onToggle={() => toggleVault('preapproval')} />
                      <VaultItem title="Draft REBNY Financial Statement" desc="The standardized NYC financial disclosure. Fill this out now, not when you're rushing to offer." checked={profile.vault?.rebny} onToggle={() => toggleVault('rebny')} />
                      <VaultItem title="Connect Real Estate Attorney" desc="Offers mean nothing until contracts are signed. Have a vetted NYC attorney on standby." checked={profile.vault?.attorney} onToggle={() => toggleVault('attorney')} />
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'calculator' && <CalculatorView mode={profile.mode} budgetTier={profile.budgetTier} maxMonthlyRent={profile.maxMonthlyRent} />}

          {activeTab === 'market' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <div className="text-[10px] text-[#A8956E] font-bold tracking-[0.2em] uppercase mb-4">Market Interpreter</div>
                <h2 className="font-serif text-4xl mb-2 text-[#F0EDE8]">Data Translation</h2>
                <p className="text-[#A8A49E] font-light max-w-xl">
                  Raw data is useless without context. Here is what the numbers actually mean for your specific search parameters.
                </p>
              </div>
              <div className="glass p-8 rounded-sm">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                  <h3 className="text-[10px] text-[#6E6A65] font-bold uppercase tracking-widest">Neighborhood Pulse</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {Object.keys(profile.mode === 'Rent' ? RENTER_NEIGHBORHOOD_STATS : NEIGHBORHOOD_STATS).map(nbhd => (
                      <button
                        key={nbhd}
                        onClick={() => setSelectedNeighborhood(nbhd)}
                        className={cn(
                          'px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap',
                          selectedNeighborhood === nbhd ? 'bg-[#C8B89A] text-[#0D0D0B] border-[#C8B89A]' : 'border-[#2A2A27] text-[#6E6A65] hover:border-[#A8956E]'
                        )}
                      >
                        {nbhd}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {profile.mode === 'Rent' ? (
                    <>
                      <MarketStat label="Median Rent" value={`$${RENTER_NEIGHBORHOOD_STATS[selectedNeighborhood]?.medianRent?.toLocaleString() || '-'}`} delta="↑ 2.1% YoY" up />
                      <MarketStat label="Avg. Days on Market" value={RENTER_NEIGHBORHOOD_STATS[selectedNeighborhood]?.dom || '-'} delta="↓ 4 days vs Q1" />
                      <MarketStat label="Concessions" value={RENTER_NEIGHBORHOOD_STATS[selectedNeighborhood]?.concessions || '-'} delta="Tight market" />
                    </>
                  ) : (
                    <>
                      <MarketStat label="Median Sale Price" value={`$${((NEIGHBORHOOD_STATS[selectedNeighborhood]?.median || 1) / 1000000).toFixed(2)}M`} delta="↑ 4.2% YoY" up />
                      <MarketStat label="Avg. Days on Market" value={NEIGHBORHOOD_STATS[selectedNeighborhood]?.dom || '-'} delta="↓ 8 days vs Q1" />
                      <MarketStat label="Sale-to-List Ratio" value={NEIGHBORHOOD_STATS[selectedNeighborhood]?.ratio || '-'} delta="↑ bidding activity" up />
                    </>
                  )}
                </div>
                <div className="border-l-2 border-[#A8956E] pl-6 py-2">
                  <div className="text-[10px] text-[#A8956E] font-bold uppercase tracking-widest mb-2">OS Translation</div>
                  <p className="text-[#F0EDE8] font-light leading-relaxed italic">
                    "{profile.mode === 'Rent' ? RENTER_NEIGHBORHOOD_STATS[selectedNeighborhood]?.insight : NEIGHBORHOOD_STATS[selectedNeighborhood]?.insight}"
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* Agent connect modal */}
      <AnimatePresence>
        {showAgentConnect && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0D0D0B]/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-xl w-full relative"
            >
              <button
                onClick={() => { setShowAgentConnect(false); localStorage.setItem('homey_agent_dismissed', 'true'); }}
                className="absolute -top-12 right-0 text-[#6E6A65] hover:text-[#A8A49E]"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="text-center mb-10">
                <h2 className="font-serif text-4xl mb-4 text-[#F0EDE8]">The Threshold Moment</h2>
              </div>
              <div className="glass p-8 rounded-sm mb-8 border-t-2 border-[#C8B89A]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-[#C8B89A]/20 border-2 border-[#C8B89A] flex items-center justify-center font-serif text-2xl text-[#C8B89A]">R</div>
                  <div>
                    <h3 className="font-medium text-[#F0EDE8] text-lg">Ryan Kanfer</h3>
                    <p className="text-[10px] text-[#6E6A65] uppercase tracking-widest">Licensed Agent, Brown Harris Stevens / Founder, homey.</p>
                  </div>
                </div>
                <p className="text-sm text-[#A8A49E] font-light leading-relaxed mb-6 italic">
                  "I've been watching your profile take shape. Your ceiling is {profile.budgetTier}, you're focused on {profile.territory?.[0] || 'NYC'}, and I know your biggest concern is {profile.fear?.toLowerCase() || 'the process'}. Let's talk."
                </p>
                <button
                  onClick={() => setShowAgentConnect(false)}
                  className="w-full py-5 bg-[#C8B89A] text-[#0D0D0B] font-bold text-[10px] uppercase tracking-widest hover:bg-[#E8DCC8] transition-all flex justify-center items-center gap-2"
                >
                  Schedule a call <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
