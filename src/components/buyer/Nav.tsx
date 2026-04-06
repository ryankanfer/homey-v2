'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavProps {
  isAuthenticated: boolean;
  userInitials?: string;
  warnBeforeLeave?: boolean;
}

export function Nav({ isAuthenticated, userInitials = 'U', warnBeforeLeave }: NavProps) {
  const router = useRouter();

  const handleLogoClick = () => {
    if (warnBeforeLeave && !confirm('Leave? Your progress is saved locally and will be here when you return.')) return;
    router.push('/');
  };

  return (
    <nav className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-[#2A2A27] sticky top-0 bg-[#0D0D0B]/80 backdrop-blur-md z-50">
      <span
        className="font-serif italic text-xl md:text-2xl text-[#C8B89A] tracking-tighter cursor-pointer"
        onClick={handleLogoClick}
      >
        homey.
      </span>
      <div className="flex items-center gap-6">
        {isAuthenticated ? (
          <div className="w-8 h-8 rounded-full bg-[#1A1A17] border border-[#2A2A27] flex items-center justify-center font-serif text-[#C8B89A] text-xs shadow-[0_0_15px_rgba(200,184,154,0.1)]">
            {userInitials}
          </div>
        ) : (
          <button
            onClick={() => router.push('/auth')}
            className="text-[10px] font-bold text-[#C8B89A] uppercase tracking-widest hover:text-[#E8DCC8] transition-colors flex items-center gap-2"
          >
            Sign in <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </nav>
  );
}
