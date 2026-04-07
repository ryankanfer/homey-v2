'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Send, X, Lock, Briefcase,
  AlertTriangle, ShieldCheck, Link as LinkIcon, Info, MessageSquare,
  Zap, RotateCcw, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Nav } from '@/components/buyer/Nav';
import { VaultItem } from '@/components/buyer/VaultItem';
import { CalculatorView } from '@/components/buyer/CalculatorView';
import { MarketStat } from '@/components/buyer/MarketStat';
import { ProfileEditModal } from '@/components/buyer/ProfileEditModal';
import { ReadinessArc } from '@/components/buyer/ReadinessArc';
import { NYCNeighborhoodMap } from '@/components/buyer/NYCNeighborhoodMap';
import { VaultUploader } from '@/components/buyer/VaultUploader';
import { VaultIntelligence } from '@/components/buyer/VaultIntelligence';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { VAULT_UNLOCK_THRESHOLD, REALITY_CHECK_UNLOCK_THRESHOLD, AGENT_UNLOCK_THRESHOLD } from '@/lib/readiness';
import { NEIGHBORHOOD_STATS, RENTER_NEIGHBORHOOD_STATS } from '@/types/profile';
import type { ChatMessage } from '@/types/profile';

const GENERIC_INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'The NYC market is designed to be overwhelming. Let\'s cut through the noise. Paste a listing URL, or ask me anything about your search.',
  timestamp: new Date(),
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, updateProfile, readinessScore } = useProfile();
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<'strategy' | 'vault' | 'calculator' | 'market'>('strategy');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([GENERIC_INITIAL_MESSAGE]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAgentConnect, setShowAgentConnect] = useState(false);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('Park Slope');
  const [agentQuoteIndex, setAgentQuoteIndex] = useState(0);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const agentQuoteInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const agentQuoteRaw = `I've been watching your profile take shape. Your ceiling is ${profile.budgetTier || 'your budget'}, you're focused on ${profile.territory?.[0] || 'NYC'}, and I know your biggest concern is ${profile.fear?.toLowerCase() || 'the process'}. Let's talk.`;
  const agentQuoteWords = agentQuoteRaw.split(' ');

  const scoreLabel = readinessScore >= 75
    ? 'Connect Ready'
    : readinessScore >= 40
      ? 'Building Profile'
      : 'Just Started';

  // DEV: force-unlock for development — remove before launch
  const isVaultUnlocked = true; // readinessScore >= VAULT_UNLOCK_THRESHOLD;
  const isRealityCheckUnlocked = true; // readinessScore >= REALITY_CHECK_UNLOCK_THRESHOLD;
  const isAgentUnlocked = readinessScore >= AGENT_UNLOCK_THRESHOLD;

  // Personalize opening message once profile is available
  useEffect(() => {
    const budget = profile.mode === 'Rent'
      ? (profile.maxMonthlyRent ? `$${profile.maxMonthlyRent.toLocaleString()}/mo ceiling` : '')
      : (profile.budgetTier || '');
    const territory = profile.territory?.slice(0, 2).join(' and ') || '';
    const fearRaw = (profile.fear || '').split('/').pop()?.trim() || '';
    const fear = fearRaw.replace(/_/g, ' ');

    const parts = [budget, territory, fear].filter(Boolean);
    if (parts.length === 0) return;

    const firstName = profile.fullName?.split(' ')[0];
    const greeting = firstName ? `${firstName} — ` : '';
    const context = `${greeting}I've read your profile. ${parts.join(', ')}. `;
    const suggestions = profile.mode === 'Rent'
      ? "You can paste a listing URL for instant analysis, ask me about the 40x rule, or tell me what you've seen so far."
      : "You can paste a listing URL for instant analysis, ask me about co-op boards, or tell me what you've seen so far.";

    setChatHistory([{
      role: 'assistant',
      content: `${context}${suggestions}`,
      timestamp: new Date(),
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    if (showAgentConnect) {
      setAgentQuoteIndex(0);
      let i = 0;
      agentQuoteInterval.current = setInterval(() => {
        i += 1;
        setAgentQuoteIndex(i);
        if (i >= agentQuoteWords.length) {
          if (agentQuoteInterval.current) clearInterval(agentQuoteInterval.current);
        }
      }, 45);
    } else {
      if (agentQuoteInterval.current) clearInterval(agentQuoteInterval.current);
    }
    return () => { if (agentQuoteInterval.current) clearInterval(agentQuoteInterval.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAgentConnect]);

  // Enforce locked tab constraints
  useEffect(() => {
    if (activeTab === 'vault' && !isVaultUnlocked) setActiveTab('strategy');
    if (activeTab === 'calculator' && !isRealityCheckUnlocked) setActiveTab('strategy');
  }, [isVaultUnlocked, isRealityCheckUnlocked, activeTab]);

  // Load Persisted Chat History
  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      const { data, error } = await supabase
        .from('strategy_chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (data && !error) {
        setChatHistory((data as any[]).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at)
        })));
      }
    };
    fetchChats();
  }, [user, supabase]);

  const sendMessage = async (content: string) => {
    const isUrl = /https?:\/\/[^\s]+/.test(content);
    const userMsg: ChatMessage = { role: 'user', content, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setLastFailedMessage(null);
    setIsTyping(true);

    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatHistory, userMsg].map(m => ({ role: m.role, content: m.content })),
          profile: { mode: profile.mode, timeline: profile.timeline, budgetTier: profile.budgetTier, territory: profile.territory, fear: profile.fear, frictionData: profile.frictionData },
          isUrlAnalysis: isUrl,
          userId: user?.id,
        }),
      });
      const { text } = await res.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: text, timestamp: new Date() }]);
    } catch {
      setLastFailedMessage(content);
      setChatHistory(prev => [...prev, { role: 'assistant', content: '__error__', timestamp: new Date() }]);
    }
    setIsTyping(false);
  };

  const sendChat = async () => {
    const content = chatInput.trim();
    if (!content || isTyping) return;
    setChatInput('');
    await sendMessage(content);
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

  // Situation intelligence — derived from profile, no API call
  const vaultKeys = profile.mode === 'Rent'
    ? (['w2', 'bank', 'id', 'guarantor', 'landlord'] as const)
    : (['w2', 'bank', 'preapproval', 'rebny', 'attorney'] as const);
  const vaultChecked = vaultKeys.filter(k => profile.vault?.[k]).length;

  type InsightType = { id: string; type: 'risk' | 'action' | 'watch'; label: string; text: string; prompt: string };
  const situationInsights: InsightType[] = [];

  if (vaultChecked === 0 && !profile.isPartial) {
    situationInsights.push({
      id: 'vault-empty',
      type: 'risk',
      label: 'No documents assembled',
      text: profile.mode === 'Rent'
        ? 'Landlords in NYC choose the tenant who shows up ready. Without a qualification packet today, you will lose apartments to applicants who have one.'
        : 'You cannot make a credible offer without a pre-approval letter in hand. Every day without one is a listing you cannot act on.',
      prompt: 'What documents do I need to assemble first?',
    });
  }

  if ((profile.timeline === 'ASAP' || profile.timeline === '1-3 months') && readinessScore < 60) {
    situationInsights.push({
      id: 'timeline-pressure',
      type: 'risk',
      label: 'Timeline vs. preparation gap',
      text: profile.mode === 'Rent'
        ? 'You have weeks, not months. The rental market moves in hours. Your qualification packet needs to exist before your first viewing — not after.'
        : `A ${profile.timeline} timeline is aggressive. Pre-approval, attorney on standby, and post-closing liquidity proof need to be ready now — not after you find the listing.`,
      prompt: 'What should I do this week to close the gap between my timeline and my preparation?',
    });
  }

  if (profile.fear) {
    const f = profile.fear.toLowerCase();
    if (f.includes('co-op') || f.includes('board')) {
      situationInsights.push({ id: 'fear-coop', type: 'watch', label: 'Co-op board is your real variable', text: 'Approval rates range from 5% to 95% depending on the building. Before you fall in love with a unit, research the board\'s history — rejection happens even with perfect financials.', prompt: 'How do I research a co-op board before making an offer?' });
    } else if (f.includes('bid') || f.includes('compet')) {
      situationInsights.push({ id: 'fear-bid', type: 'watch', label: 'Bidding wars are won on preparation', text: 'The strongest NYC offers aren\'t always the highest — they\'re the cleanest. Fewer contingencies, faster close, and proof of financial stability beats price alone.', prompt: 'How do I structure a competitive offer without the highest bid?' });
    } else if (f.includes('financ') || f.includes('afford')) {
      situationInsights.push({ id: 'fear-financial', type: 'watch', label: 'Your financial narrative matters', text: `Lenders want stable income, post-closing liquidity of 6+ months, and no unexplained deposits. At your price point, get ahead of this before you enter contract.`, prompt: 'What will lenders scrutinize most closely for my financial profile?' });
    }
  }

  if (readinessScore >= 40 && readinessScore < 75 && situationInsights.length < 3) {
    situationInsights.push({ id: 'score-progress', type: 'action', label: `${75 - readinessScore} points from agent connection`, text: `Your vault documents are the fastest path to closing this gap. Each one you complete moves the needle directly.`, prompt: 'Which vault documents will increase my readiness score the most?' });
  }

  // Priority actions
  type PriorityAction = { id: string; text: string; prompt: string };
  const priorityActions: PriorityAction[] = [];
  if (profile.isPartial) {
    priorityActions.push({ id: 'finish-profile', text: 'Complete your profile to unlock your full strategy', prompt: 'What information do I still need to provide to complete my profile?' });
  }
  if (vaultChecked === 0 && !profile.isPartial) {
    priorityActions.push({ id: 'first-doc', text: profile.mode === 'Rent' ? 'Upload your most recent paystubs to The Vault' : 'Get your mortgage pre-approval letter — this is step zero', prompt: profile.mode === 'Rent' ? 'How do I start my rental qualification packet?' : 'How do I choose the right lender for pre-approval?' });
  }
  if (profile.mode === 'Buy' && !profile.vault?.attorney) {
    priorityActions.push({ id: 'attorney', text: 'Identify a real estate attorney before your first offer', prompt: 'How do I find and vet a real estate attorney in NYC?' });
  }
  if (profile.territory?.length > 0 && situationInsights.length < 3) {
    priorityActions.push({ id: 'market-check', text: `Review the live market data for ${profile.territory[0]}`, prompt: `What should I know about the ${profile.territory[0]} market right now?` });
  }
  if (profile.mode === 'Rent' && profile.maxMonthlyRent && profile.maxMonthlyRent < 3000) {
    priorityActions.push({ id: 'rent-budget', text: 'Understand the 40x income rule before your first application', prompt: 'How does the 40x income rule work and do I qualify?' });
  }
  const topPriorityActions = priorityActions.slice(0, 3);

  // Prompt chips — shown until second message exists
  const showPromptChips = chatHistory.length <= 1;
  const promptChips = profile.mode === 'Rent'
    ? ['What is the 40x income rule?', 'How do I avoid broker fee scams?', 'What should I bring to a viewing?']
    : [
        profile.vault?.preapproval ? `What makes a competitive offer in ${profile.territory?.[0] || 'NYC'}?` : 'How do I get a pre-approval letter?',
        'What\'s the difference between a co-op and a condo?',
        `What is the market like in ${profile.territory?.[0] || 'my target area'} right now?`,
      ];

  return (
    <div className="min-h-screen bg-[#0D0D0B] flex flex-col">
      <Nav isAuthenticated userInitials={userInitials} />

      <ProfileEditModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} />

      <div className="max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12">
        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Profile card */}
          <div className="bg-[#141412] border border-[#2A2A27] p-6 rounded-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8B89A]/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="flex items-center gap-4 mb-4 relative z-10">
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
                  {profile.isPartial ? 'Setup incomplete' : 'Profile active'}
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center pt-2">
              <ReadinessArc score={readinessScore} label={scoreLabel} size={104} />
              <button
                onClick={() => setShowScoreInfo(!showScoreInfo)}
                className="mt-3 text-[10px] text-[#6E6A65] hover:text-[#F0EDE8] flex items-center gap-1 transition-colors"
              >
                <Info className="w-3 h-3" /> What this means
              </button>
              <AnimatePresence>
                {showScoreInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-[#A8A49E] mt-2 leading-relaxed bg-[#0D0D0B] p-3 border border-[#2A2A27] rounded-sm text-center w-full"
                  >
                    Complete your Vault documents to reach 90.<br />
                    At 75+, your agent connection unlocks.
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => setShowEditModal(true)}
                className="mt-4 text-[9px] text-[#6E6A65] hover:text-[#C8B89A] uppercase tracking-widest transition-colors"
              >
                Edit profile
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-[#141412] border border-[#2A2A27] p-6 rounded-sm">
            <h4 className="text-[10px] text-[#6E6A65] font-bold uppercase tracking-widest mb-4">Your Dashboard</h4>
            <div className="space-y-2">
              {[
                { id: 'strategy', label: 'Strategy Room', sub: 'Guidance + chat', locked: false },
                { id: 'vault', label: 'The Vault', sub: isVaultUnlocked ? 'Board Package & Prep' : `Score ${VAULT_UNLOCK_THRESHOLD}+ to unlock (you're at ${readinessScore})`, locked: !isVaultUnlocked },
                { id: 'calculator', label: 'Reality Check', sub: isRealityCheckUnlocked ? 'Financial Stress Test' : `Complete ${REALITY_CHECK_UNLOCK_THRESHOLD - readinessScore > 0 ? REALITY_CHECK_UNLOCK_THRESHOLD - readinessScore + ' more points' : 'The Vault'} to unlock`, locked: !isRealityCheckUnlocked },
                { id: 'market', label: 'Market Interpreter', sub: 'Data translation', locked: false },
              ].map(tab => (
                <button
                  key={tab.id}
                  disabled={tab.locked}
                  onClick={() => !tab.locked && setActiveTab(tab.id as any)}
                  className={cn(
                    'w-full p-4 text-left border transition-all relative rounded-sm',
                    activeTab === tab.id ? 'bg-[#C8B89A]/5 border-[#C8B89A]' : 'bg-[#1A1A17]/30 border-[#2A2A27] hover:border-[#A8956E]',
                    tab.locked && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {tab.locked && <Lock className="w-3 h-3 absolute top-4 right-4 text-[#6E6A65]" />}
                  <div className={cn('text-xs font-medium mb-1', activeTab === tab.id ? 'text-[#E8DCC8]' : 'text-[#A8A49E]')}>
                    {tab.label}
                  </div>
                  <div className="text-[9px] text-[#6E6A65] uppercase tracking-widest leading-relaxed">{tab.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Persistent agent CTA — visible once unlocked */}
          {isAgentUnlocked && (
            <button
              onClick={() => setShowAgentConnect(true)}
              className="w-full p-4 bg-[#C8B89A]/10 border border-[#C8B89A]/30 hover:border-[#C8B89A] hover:bg-[#C8B89A]/15 rounded-sm text-left transition-all group"
            >
              <div className="text-[9px] text-[#A8956E] font-bold uppercase tracking-widest mb-1">Your agent is ready</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#F0EDE8] group-hover:text-[#E8DCC8] transition-colors">Connect with Ryan</span>
                <ArrowRight className="w-3 h-3 text-[#C8B89A] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          )}
        </aside>

        {/* Right panel (desktop) / Main content (mobile) */}
        <main className="space-y-5 min-w-0 overflow-y-auto lg:max-h-[calc(100vh-10rem)] lg:sticky lg:top-8 scrollbar-hide">
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
                      Connect with your agent <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Situation Intelligence */}
              {situationInsights.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-[#141412] border border-[#2A2A27] rounded-sm overflow-hidden"
                >
                  <div className="px-5 py-3 border-b border-[#2A2A27] flex items-center gap-2">
                    <Zap className="w-3 h-3 text-[#A8956E]" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6E6A65]">Homey's read on your situation</span>
                  </div>
                  <div className="divide-y divide-[#2A2A27]">
                    {situationInsights.map((insight, i) => (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.08 }}
                        className="p-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('mt-1 w-1.5 h-1.5 rounded-full shrink-0', {
                            'bg-[#8B3A3A]': insight.type === 'risk',
                            'bg-[#C8B89A]': insight.type === 'action',
                            'bg-[#A8956E]': insight.type === 'watch',
                          })} />
                          <div className="flex-1 min-w-0">
                            <div className={cn('text-[10px] font-bold uppercase tracking-widest mb-1.5', {
                              'text-[#8B3A3A]': insight.type === 'risk',
                              'text-[#C8B89A]': insight.type === 'action',
                              'text-[#A8956E]': insight.type === 'watch',
                            })}>
                              {insight.label}
                            </div>
                            <p className="text-sm text-[#A8A49E] leading-relaxed">{insight.text}</p>
                            <button
                              onClick={() => sendMessage(insight.prompt)}
                              className="mt-2.5 text-[10px] text-[#6E6A65] hover:text-[#C8B89A] uppercase tracking-widest flex items-center gap-1 transition-colors group"
                            >
                              Ask Homey about this <ChevronRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Priority Actions */}
              {topPriorityActions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-[#141412] border border-[#2A2A27] rounded-sm overflow-hidden"
                >
                  <div className="px-5 py-3 border-b border-[#2A2A27]">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6E6A65]">Priority moves</span>
                  </div>
                  <div className="divide-y divide-[#2A2A27]">
                    {topPriorityActions.map((action) => {
                      const done = completedActions.has(action.id);
                      return (
                        <div key={action.id} className="flex items-start gap-3 px-5 py-4">
                          <button
                            onClick={() => setCompletedActions(prev => {
                              const next = new Set(prev);
                              done ? next.delete(action.id) : next.add(action.id);
                              return next;
                            })}
                            className={cn(
                              'mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors',
                              done ? 'bg-[#C8B89A] border-[#C8B89A]' : 'border-[#3A3A37] hover:border-[#A8956E]'
                            )}
                            aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {done && <span className="text-[#0D0D0B] text-[8px] font-black">✓</span>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm leading-snug', done ? 'text-[#6E6A65] line-through' : 'text-[#F0EDE8]')}>
                              {action.text}
                            </p>
                            {!done && (
                              <button
                                onClick={() => sendMessage(action.prompt)}
                                className="mt-1.5 text-[10px] text-[#6E6A65] hover:text-[#C8B89A] uppercase tracking-widest flex items-center gap-1 transition-colors group"
                              >
                                Ask Homey <ChevronRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {needsPivot && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-[#8B3A3A]/50 bg-[#8B3A3A]/10 p-6 rounded-sm relative overflow-hidden flex flex-col md:flex-row gap-6 items-start md:items-center"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8B3A3A]" />
                  <AlertTriangle className="w-6 h-6 text-[#8B3A3A] shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-[#F0EDE8] mb-1 uppercase tracking-widest">Heads up</h4>
                    <p className="text-xs text-[#A8A49E] leading-relaxed">
                      A budget of <strong>{profile.budgetTier}</strong> in <strong>{profile.territory[0]}</strong> puts you in the bottom 5% of inventory, leading to extreme bidding wars and poor quality.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Chat — all screen sizes */}
              <section className="bg-[#141412] border border-[#2A2A27] rounded-sm overflow-hidden flex flex-col h-[460px]">
                <div className="p-4 border-b border-[#2A2A27] flex items-center gap-3 bg-[#0D0D0B]/40 shrink-0">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] transition-all',
                    isTyping ? 'bg-[#C8B89A]/20 border-2 border-[#C8B89A] text-[#A8956E]' : 'bg-[#C8B89A]/10 border border-[#C8B89A]/20 text-[#A8956E]'
                  )}>H</div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#F0EDE8]">Strategy Intelligence</h4>
                    <p className="text-[9px] text-[#6E6A65] uppercase tracking-widest">Ask anything about your search</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
                  {chatHistory.map((msg, i) => {
                    const isUrl = /https?:\/\/[^\s]+/.test(msg.content);
                    const isError = msg.content === '__error__';
                    return (
                      <div key={i} className={cn('flex gap-3 max-w-[90%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}>
                        <div className={cn(
                          'w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[10px]',
                          msg.role === 'assistant' ? 'bg-[#C8B89A]/10 border border-[#C8B89A]/20 text-[#A8956E]' : 'bg-[#1A1A17] border border-[#2A2A27] text-[#6E6A65]'
                        )}>
                          {msg.role === 'assistant' ? 'H' : 'U'}
                        </div>
                        <div className={cn(
                          'p-3 rounded-sm text-sm leading-relaxed',
                          isError ? 'bg-[#8B3A3A]/10 border border-[#8B3A3A]/30 text-[#A8A49E]'
                            : msg.role === 'assistant' ? 'bg-[#1A1A17] border border-[#2A2A27] text-[#A8A49E]'
                            : 'bg-[#C8B89A]/10 border border-[#C8B89A]/20 text-[#E8DCC8]'
                        )}>
                          {isError ? (
                            <div className="flex items-center gap-3">
                              <span className="text-[#A8A49E]">Connection failed.</span>
                              {lastFailedMessage && (
                                <button
                                  onClick={() => sendMessage(lastFailedMessage)}
                                  className="flex items-center gap-1 text-[#C8B89A] hover:text-[#E8DCC8] text-xs transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3" /> Retry
                                </button>
                              )}
                            </div>
                          ) : isUrl && msg.role === 'user' ? (
                            <div className="flex items-center gap-2 text-[#C8B89A] italic">
                              <LinkIcon className="w-4 h-4" /> Listing submitted — analyzing now
                            </div>
                          ) : (
                            <div className="prose-homey"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#C8B89A]/10 border-2 border-[#C8B89A]/40 flex items-center justify-center font-bold text-[10px] text-[#A8956E]">H</div>
                      <div className="bg-[#1A1A17] border border-[#2A2A27] px-4 py-3 rounded-sm flex items-end gap-[3px]">
                        {[0, 0.1, 0.2, 0.3].map((d, idx) => (
                          <motion.div key={idx} className="w-[3px] rounded-full bg-[#A8956E]"
                            animate={{ height: ['6px', '14px', '6px'] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: d, ease: 'easeInOut' }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Prompt chips — shown until second message */}
                <AnimatePresence>
                  {showPromptChips && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-3 flex flex-wrap gap-2 shrink-0"
                    >
                      {promptChips.map(chip => (
                        <button
                          key={chip}
                          onClick={() => sendMessage(chip)}
                          className="text-[10px] px-3 py-1.5 border border-[#2A2A27] text-[#A8A49E] hover:border-[#A8956E] hover:text-[#F0EDE8] rounded-sm transition-all"
                        >
                          {chip}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-4 bg-[#0D0D0B]/40 border-t border-[#2A2A27] shrink-0">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Ask a strategic question or paste a listing URL…"
                        className="w-full bg-[#0D0D0B] border border-[#2A2A27] p-3 text-sm outline-none focus:border-[#C8B89A] transition-colors text-[#F0EDE8] placeholder:text-[#6E6A65] pr-8"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !isTyping && sendChat()}
                      />
                      {/https?:\/\/[^\s]+/.test(chatInput) && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C8B89A]">
                          <ShieldCheck className="w-4 h-4 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={sendChat}
                      disabled={isTyping || !chatInput.trim()}
                      className="bg-[#C8B89A] text-[#0D0D0B] px-4 hover:bg-[#E8DCC8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'vault' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <div className="text-[10px] text-[#A8956E] font-bold tracking-[0.2em] uppercase mb-4">The Vault</div>
                <h2 className="font-serif text-4xl mb-3 text-[#F0EDE8]">Action Plan & Board Prep</h2>
                <p className="text-[#A8A49E] font-light max-w-xl">
                  NYC real estate is won in the paperwork. Assemble your financial identity here proactively to increase your Readiness Score and beat competing buyers.
                </p>
              </div>
              <div className="bg-[#141412] border border-[#2A2A27] p-6 md:p-8 rounded-sm">
                {/* Vault progress ring */}
                {(() => {
                  const vaultKeys = profile.mode === 'Rent'
                    ? (['w2', 'bank', 'id', 'guarantor', 'landlord'] as const)
                    : (['w2', 'bank', 'preapproval', 'rebny', 'attorney'] as const);
                  const total = vaultKeys.length;
                  const checked = vaultKeys.filter(k => profile.vault?.[k]).length;
                  const pct = total > 0 ? checked / total : 0;
                  const r = 26; const cx = 34; const cy = 34;
                  const circ = 2 * Math.PI * r;
                  const filled = pct * circ;
                  const isComplete = checked === total;
                  return (
                    <div className="flex items-center gap-6 mb-8 pb-6 border-b border-[#2A2A27]">
                      <div className="relative shrink-0">
                        <svg width="68" height="68" viewBox="0 0 68 68">
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2A2A27" strokeWidth="4" />
                          <motion.circle
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={isComplete ? '#C8B89A' : '#4A7C59'}
                            strokeWidth="4"
                            strokeDasharray={`${filled} ${circ - filled}`}
                            strokeDashoffset={circ / 4}
                            strokeLinecap="round"
                            initial={{ strokeDasharray: `0 ${circ}` }}
                            animate={{ strokeDasharray: `${filled} ${circ - filled}` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={isComplete ? { filter: 'drop-shadow(0 0 6px rgba(200,184,154,0.5))' } : undefined}
                          />
                          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="700" fill={isComplete ? '#C8B89A' : '#F0EDE8'} fontFamily="serif">
                            {checked}
                          </text>
                          <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="#6E6A65" fontFamily="sans-serif" letterSpacing="0.5">
                            /{total}
                          </text>
                        </svg>
                      </div>
                      <div>
                        <AnimatePresence mode="wait">
                          {isComplete ? (
                            <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-[#C8B89A] mb-1">Vault Secured</div>
                              <p className="text-xs text-[#A8A49E]">Your financial identity is assembled. You are ready to compete.</p>
                            </motion.div>
                          ) : (
                            <motion.div key="progress" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-[#6E6A65] mb-1">
                                {total - checked} document{total - checked !== 1 ? 's' : ''} remaining
                              </div>
                              <p className="text-xs text-[#A8A49E]">Each item increases your Readiness Score and competitive position.</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-[#F0EDE8] uppercase tracking-widest flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-[#C8B89A]" /> Document Brain
                    </h3>
                    <VaultUploader userId={user?.id || 'anonymous'} onUploadComplete={() => {}} />
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-[#F0EDE8] uppercase tracking-widest flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-[#4A7C59]" /> Verified Intelligence
                    </h3>
                    <VaultIntelligence userId={user?.id || 'anonymous'} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'calculator' && <CalculatorView mode={profile.mode} budgetTier={profile.budgetTier} maxMonthlyRent={profile.maxMonthlyRent} frictionData={profile.frictionData} />}

          {activeTab === 'market' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <div className="text-[10px] text-[#A8956E] font-bold tracking-[0.2em] uppercase mb-4">Market Interpreter</div>
                <h2 className="font-serif text-4xl mb-3 text-[#F0EDE8]">Data Translation</h2>
                <p className="text-[#A8A49E] font-light max-w-xl">
                  Raw data is useless without context. Here is what the numbers actually mean for your specific search parameters.
                </p>
              </div>
              <div className="bg-[#141412] border border-[#2A2A27] p-6 md:p-8 rounded-sm">
                <div className="mb-8">
                  <h3 className="text-[10px] text-[#6E6A65] font-bold uppercase tracking-widest mb-4">Neighborhood Pulse</h3>
                  <NYCNeighborhoodMap
                    selected={selectedNeighborhood}
                    onSelect={setSelectedNeighborhood}
                    budgetTier={profile.mode === 'Rent' ? undefined : profile.budgetTier}
                    neighborhoodStats={profile.mode === 'Rent' ? RENTER_NEIGHBORHOOD_STATS : NEIGHBORHOOD_STATS}
                    mode={profile.mode === 'Rent' ? 'Rent' : 'Buy'}
                  />
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
                <div className="border-l-2 border-[#A8956E] pl-6 py-3">
                  <div className="text-[10px] text-[#A8956E] font-bold uppercase tracking-widest mb-2">What this means for you</div>
                  <p className="text-[#F0EDE8] font-light leading-relaxed italic">
                    "{profile.mode === 'Rent' ? RENTER_NEIGHBORHOOD_STATS[selectedNeighborhood]?.insight : NEIGHBORHOOD_STATS[selectedNeighborhood]?.insight}"
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* Global AI Strategist Overlay (Slide-over Drawer) */}
      <AnimatePresence>
        {showMobileChat && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileChat(false)}
              className="absolute inset-0 bg-[#000]/60 backdrop-blur-sm"
            />
            
            <motion.section 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full md:w-[480px] bg-[#0D0D0B] border-l border-[#2A2A27] flex flex-col shadow-2xl h-full"
            >
              <div className="p-6 border-b border-[#2A2A27] flex items-center justify-between bg-[#141412] shrink-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-[0_0_20px_rgba(200,184,154,0.1)]',
                    isTyping ? 'bg-[#C8B89A] text-[#0D0D0B]' : 'bg-[#C8B89A]/10 border border-[#C8B89A]/20 text-[#A8956E]'
                  )}>H</div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#F0EDE8]">Homey Strategist</h4>
                    <p className="text-[9px] text-[#6E6A65] uppercase tracking-widest font-bold">Encrypted Intelligence</p>
                  </div>
                </div>
                <button onClick={() => setShowMobileChat(false)} className="p-2 hover:bg-[#2A2A27] rounded-full transition-colors text-[#6E6A65] hover:text-[#F0EDE8]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {chatHistory.map((msg, i) => {
                  const isError = msg.content === '__error__';
                  const isUrl = /https?:\/\/[^\s]+/.test(msg.content);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('flex gap-4 max-w-[95%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[10px] mt-1',
                        msg.role === 'assistant' ? 'bg-[#C8B89A]/10 border border-[#C8B89A]/20 text-[#A8956E]' : 'bg-[#1A1A17] border border-[#2A2A27] text-[#6E6A65]'
                      )}>
                        {msg.role === 'assistant' ? 'H' : 'U'}
                      </div>
                      <div className={cn(
                        'p-4 rounded-sm text-sm leading-relaxed border',
                        isError ? 'bg-[#8B3A3A]/10 border-[#8B3A3A]/30 text-[#A8A49E]'
                          : msg.role === 'assistant' ? 'bg-[#1A1A17] border-[#2A2A27] text-[#A8A49E]'
                          : 'bg-[#C8B89A]/5 border-[#C8B89A]/20 text-[#E8DCC8]'
                      )}>
                        {isError ? (
                          <div className="flex items-center gap-3">
                            <span>Connection failed.</span>
                            {lastFailedMessage && (
                              <button onClick={() => sendMessage(lastFailedMessage)} className="flex items-center gap-1 text-[#C8B89A] hover:text-[#E8DCC8] transition-colors">
                                <RotateCcw className="w-3 h-3" /> Retry
                              </button>
                            )}
                          </div>
                        ) : isUrl && msg.role === 'user' ? (
                          <div className="flex items-center gap-2 text-[#C8B89A] italic">
                            <LinkIcon className="w-4 h-4" /> Listing submitted — analyzing now
                          </div>
                        ) : (
                          <div className="prose-homey"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {isTyping && (
                  <div className="flex gap-4 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[#C8B89A]/20 border border-[#C8B89A]/40 flex items-center justify-center font-bold text-[10px] text-[#A8956E]">H</div>
                    <div className="bg-[#1A1A17] border border-[#2A2A27] px-5 py-4 rounded-sm flex items-end gap-[3px]">
                      {[0, 0.1, 0.2, 0.3].map((d, idx) => (
                        <motion.div key={idx} className="w-[3px] rounded-full bg-[#A8956E]" animate={{ height: ['8px', '16px', '8px'] }} transition={{ duration: 0.8, repeat: Infinity, delay: d }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 bg-[#141412] border-t border-[#2A2A27] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Ask anything or paste a listing URL..."
                      className="w-full bg-[#0D0D0B] border border-[#2A2A27] p-4 text-sm outline-none focus:border-[#C8B89A] transition-colors text-[#F0EDE8] placeholder:text-[#6E6A65] pr-12"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !isTyping && sendChat()}
                    />
                    <ShieldCheck className={cn("absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", /https?:\/\/[^\s]+/.test(chatInput) ? "text-[#C8B89A] animate-pulse" : "text-[#2A2A27]")} />
                  </div>
                  <button
                    onClick={sendChat}
                    disabled={isTyping || !chatInput.trim()}
                    className="bg-[#C8B89A] text-[#0D0D0B] px-5 hover:bg-[#E8DCC8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={() => setShowMobileChat(true)}
          className="w-14 h-14 bg-[#C8B89A] rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(200,184,154,0.3)] hover:scale-110 transition-transform active:scale-95"
          aria-label="Summon Strategist"
        >
          <MessageSquare className="w-6 h-6 text-[#0D0D0B]" />
        </motion.button>
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
              <div className="text-center mb-8">
                <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#A8956E] mb-3">Your agent is ready</div>
                <h2 className="font-serif text-4xl text-[#F0EDE8]">Time to talk.</h2>
              </div>
              <div className="relative rounded-sm overflow-hidden border border-[#C8B89A]/30 mb-6">
                {/* Portrait header */}
                <div className="bg-gradient-to-b from-[#1A1812] to-[#0D0D0B] px-8 pt-8 pb-6 flex items-end gap-5 border-b border-[#2A2A27]">
                  <div className="relative shrink-0">
                    {/* Glow ring */}
                    <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 24px rgba(200,184,154,0.25), 0 0 48px rgba(200,184,154,0.1)' }} />
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#A8956E]/40 to-[#C8B89A]/20 border-2 border-[#C8B89A] flex items-center justify-center font-serif text-3xl text-[#C8B89A] relative z-10">
                      RK
                    </div>
                    {/* Active indicator */}
                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#4A7C59] rounded-full border-2 border-[#0D0D0B] z-20" />
                  </div>
                  <div className="pb-1">
                    <h3 className="font-serif text-2xl text-[#F0EDE8] mb-0.5">Ryan Kanfer</h3>
                    <p className="text-[10px] text-[#6E6A65] uppercase tracking-widest leading-relaxed">
                      Licensed Agent · Brown Harris Stevens<br />Founder, homey.
                    </p>
                  </div>
                </div>
                {/* Typewritten quote */}
                <div className="p-8 bg-[#0D0D0B]">
                  <p className="text-sm text-[#A8A49E] font-light leading-relaxed italic min-h-[4rem]">
                    &ldquo;{agentQuoteWords.slice(0, agentQuoteIndex).join(' ')}
                    {agentQuoteIndex < agentQuoteWords.length && (
                      <span className="inline-block w-[2px] h-[0.85em] bg-[#C8B89A] ml-0.5 align-middle animate-pulse" />
                    )}
                    {agentQuoteIndex >= agentQuoteWords.length && '\u201d'}
                  </p>
                </div>
                <div className="px-8 pb-8 bg-[#0D0D0B]">
                  <button
                    onClick={() => setShowAgentConnect(false)}
                    className="w-full py-5 bg-[#C8B89A] text-[#0D0D0B] font-bold text-xs uppercase tracking-widest hover:bg-[#E8DCC8] transition-all flex justify-center items-center gap-2"
                  >
                    Schedule a call <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
