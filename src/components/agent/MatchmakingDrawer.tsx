import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X } from 'lucide-react';
import { ClientRow } from './types';

function RadialScore({ score }: { score: number }) {
  const size = 40;
  const radius = 16;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 80 ? '#4A7C59' : score >= 60 ? '#C8B89A' : '#6E6A65';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#2A2A27" strokeWidth="2.5" />
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap="round"
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fontWeight="700" fill={color} fontFamily="serif">
        {score}
      </text>
    </svg>
  );
}

interface MatchmakingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  matches: { client: ClientRow; reason: string; score: number }[];
  listingUrl: string;
}

export function MatchmakingDrawer({ isOpen, onClose, matches, listingUrl }: MatchmakingDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 h-[60vh] bg-[#111110] border-t border-[#C8B89A]/30 z-[101] px-8 py-8 overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-[#C8B89A]" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8B89A]">Matchmaking Intelligence</h3>
                  </div>
                  <h2 className="font-serif text-3xl text-[#F0EDE8]">Found {matches.length} other matches for this listing</h2>
                  <p className="text-[#6E6A65] text-xs mt-1 truncate max-w-lg">{listingUrl}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-[#2A2A27] rounded-full transition-colors text-[#6E6A65]">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((match, i) => (
                  <motion.div 
                    key={match.client.client_id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 bg-[#1A1A18] border border-[#2A2A27] hover:border-[#C8B89A]/40 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-serif text-lg text-[#F0EDE8]">{match.client.profile?.full_name || 'Anonymous'}</h4>
                        <div className="text-[10px] text-[#A8A49E] uppercase tracking-widest mt-0.5">
                          {match.client.buyer_profile ? 'Buyer' : 'Renter'}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <RadialScore score={match.score} />
                        <span className="text-[9px] text-[#6E6A65] uppercase tracking-widest">match</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-[#A8A49E] italic mb-4 leading-relaxed">
                      "{match.reason}"
                    </p>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const body = `Hey! I just analyzed a listing for another client that feels like an strong match for your search. Check it out: ${listingUrl}`;
                          window.location.href = `mailto:${match.client.profile.email}?subject=Listing Match&body=${encodeURIComponent(body)}`;
                        }}
                        className="flex-1 py-2 bg-[#2A2A27] text-[#F0EDE8] text-[9px] font-bold uppercase tracking-widest hover:bg-[#C8B89A] hover:text-[#0D0D0B] transition-all flex items-center justify-center gap-2"
                      >
                         <Send className="w-3 h-3" /> Pitch via Email
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
