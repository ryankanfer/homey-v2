import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingDown, DollarSign, Clock, ArrowRight, Calculator, 
  ChevronDown, AlertTriangle, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveProfile } from './types';

// NYC market assumptions (conservative, based on historical data)
const NYC_ASSUMPTIONS = {
  avgAnnualAppreciation: 0.04, // 4% annual price growth (NYC 10-year avg)
  avgRentIncrease: 0.035,      // 3.5% annual rent growth
  currentMortgageRate: 0.065,  // 6.5%
  maintenancePercent: 0.015,   // 1.5% of purchase price / year
  closingCostPercent: 0.03,    // ~3% buyer closing costs
  brokerFee: 0.06,             // 6% seller-side (factored into price)
};

interface DecayForecastProps {
  profile: ActiveProfile;
}

interface ForecastResult {
  months: number;
  rentBurned: number;
  priceIncrease: number;
  buyingPowerChange: number;
  netCostOfWaiting: number;
  newMonthlyPayment: number;
  currentMonthlyPayment: number;
  paymentDelta: number;
}

function calculateForecast(
  waitMonths: number,
  currentRent: number,
  purchasePrice: number,
  downPercent: number,
  rateDropBps: number,
): ForecastResult {
  // Rent burned during wait
  const rentBurned = currentRent * waitMonths;

  // Price appreciation during wait
  const monthlyAppreciation = NYC_ASSUMPTIONS.avgAnnualAppreciation / 12;
  const futurePrice = purchasePrice * Math.pow(1 + monthlyAppreciation, waitMonths);
  const priceIncrease = futurePrice - purchasePrice;

  // Rate environment
  const currentRate = NYC_ASSUMPTIONS.currentMortgageRate;
  const futureRate = currentRate - (rateDropBps / 10000);

  // Current monthly payment
  const downPayment = purchasePrice * (downPercent / 100);
  const currentLoan = purchasePrice - downPayment;
  const currentMonthlyRate = currentRate / 12;
  const numPayments = 360;
  const currentMonthlyPayment = currentMonthlyRate === 0
    ? currentLoan / numPayments
    : (currentLoan * currentMonthlyRate * Math.pow(1 + currentMonthlyRate, numPayments)) /
      (Math.pow(1 + currentMonthlyRate, numPayments) - 1);

  // Future monthly payment (higher price, potentially lower rate)
  const futureDownPayment = futurePrice * (downPercent / 100);
  const futureLoan = futurePrice - futureDownPayment;
  const futureMonthlyRate = futureRate / 12;
  const newMonthlyPayment = futureMonthlyRate === 0
    ? futureLoan / numPayments
    : (futureLoan * futureMonthlyRate * Math.pow(1 + futureMonthlyRate, numPayments)) /
      (Math.pow(1 + futureMonthlyRate, numPayments) - 1);

  // Buying power change: how much more/less house can they afford at the new rate
  const buyingPowerAtCurrentRate = currentLoan;
  const maxPaymentForCurrentLoan = currentMonthlyPayment;
  const buyingPowerAtFutureRate = futureMonthlyRate === 0
    ? maxPaymentForCurrentLoan * numPayments
    : (maxPaymentForCurrentLoan * (Math.pow(1 + futureMonthlyRate, numPayments) - 1)) /
      (futureMonthlyRate * Math.pow(1 + futureMonthlyRate, numPayments));
  const buyingPowerChange = buyingPowerAtFutureRate - buyingPowerAtCurrentRate;

  // Net cost of waiting
  const netCostOfWaiting = rentBurned + priceIncrease - Math.max(0, buyingPowerChange);

  return {
    months: waitMonths,
    rentBurned,
    priceIncrease,
    buyingPowerChange,
    netCostOfWaiting,
    newMonthlyPayment,
    currentMonthlyPayment,
    paymentDelta: newMonthlyPayment - currentMonthlyPayment,
  };
}

function formatDollars(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `$${Math.round(n).toLocaleString()}`;
  return `$${Math.round(n)}`;
}

export function LiquidityDecayForecast({ profile }: DecayForecastProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [waitMonths, setWaitMonths] = useState(6);
  const [rateDropBps, setRateDropBps] = useState(50); // 0.5% default

  // Derive sensible defaults from profile
  const defaults = useMemo(() => {
    if (profile.kind === 'renter') {
      const rent = (profile as any).max_monthly_rent || 4000;
      // Estimate purchase equivalent: ~20x annual rent in NYC
      const estPurchasePrice = rent * 12 * 20;
      return { rent, price: estPurchasePrice, down: 20 };
    } else {
      const tierMap: Record<string, number> = {
        'Under $750K': 650000, '$750K – $1.2M': 950000, '$1.2M – $2M': 1500000,
        '$2M – $3.5M': 2750000, '$3.5M+': 4000000,
      };
      const price = tierMap[(profile as any).budget_tier || ''] || 1500000;
      // Estimate current rent from price (roughly 1/250 of price monthly)
      const rent = Math.round(price / 250);
      return { rent, price, down: 20 };
    }
  }, [profile]);

  const [currentRent, setCurrentRent] = useState(defaults.rent);
  const [purchasePrice, setPurchasePrice] = useState(defaults.price);

  const forecast = useMemo(
    () => calculateForecast(waitMonths, currentRent, purchasePrice, defaults.down, rateDropBps),
    [waitMonths, currentRent, purchasePrice, defaults.down, rateDropBps]
  );

  return (
    <div className="border border-[#2A2A27] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#141412] transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-[#8B3A3A]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8B3A3A]">
            Liquidity Decay Forecast
          </span>
        </div>
        <div className="flex items-center gap-3">
          {forecast.netCostOfWaiting > 0 && (
            <span className="text-[9px] font-bold text-[#8B3A3A] bg-[#8B3A3A]/10 px-2 py-0.5 border border-[#8B3A3A]/30">
              −{formatDollars(forecast.netCostOfWaiting)} if waiting {waitMonths}mo
            </span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 text-[#6E6A65] transition-transform", isOpen && "rotate-180")} />
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
            <div className="p-5 border-t border-[#2A2A27] space-y-6">
              {/* Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-[9px] mb-2">
                    <span className="text-[#6E6A65] uppercase tracking-widest font-bold">Wait Duration</span>
                    <span className="text-[#F0EDE8] font-serif">{waitMonths} months</span>
                  </div>
                  <input type="range" min={1} max={24} step={1} value={waitMonths}
                    onChange={e => setWaitMonths(Number(e.target.value))}
                    className="w-full accent-[#8B3A3A]" />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] mb-2">
                    <span className="text-[#6E6A65] uppercase tracking-widest font-bold">Rate Drop Assumption</span>
                    <span className="text-[#F0EDE8] font-serif">{(rateDropBps / 100).toFixed(2)}%</span>
                  </div>
                  <input type="range" min={0} max={200} step={25} value={rateDropBps}
                    onChange={e => setRateDropBps(Number(e.target.value))}
                    className="w-full accent-[#A8956E]" />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] mb-2">
                    <span className="text-[#6E6A65] uppercase tracking-widest font-bold">Current Monthly Rent</span>
                    <span className="text-[#F0EDE8] font-serif">${currentRent.toLocaleString()}</span>
                  </div>
                  <input type="range" min={1500} max={15000} step={250} value={currentRent}
                    onChange={e => setCurrentRent(Number(e.target.value))}
                    className="w-full accent-[#C8B89A]" />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] mb-2">
                    <span className="text-[#6E6A65] uppercase tracking-widest font-bold">Target Purchase Price</span>
                    <span className="text-[#F0EDE8] font-serif">${purchasePrice.toLocaleString()}</span>
                  </div>
                  <input type="range" min={300000} max={5000000} step={50000} value={purchasePrice}
                    onChange={e => setPurchasePrice(Number(e.target.value))}
                    className="w-full accent-[#C8B89A]" />
                </div>
              </div>

              {/* The Verdict */}
              <div className="bg-[#0D0D0B] border border-[#8B3A3A]/40 p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#8B3A3A]" />
                
                <div className="text-[9px] uppercase tracking-[0.2em] text-[#8B3A3A] font-bold mb-3 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> The Cost of Hesitation
                </div>

                <div className="font-serif text-4xl text-[#8B3A3A] mb-1">
                  −{formatDollars(forecast.netCostOfWaiting)}
                </div>
                <p className="text-[10px] text-[#A8A49E] mb-6">
                  Net financial loss from waiting {waitMonths} months to buy
                </p>

                {/* Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2.5 bg-[#141412] border border-[#2A2A27]">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3 h-3 text-[#8B3A3A]" />
                      <span className="text-[10px] text-[#A8A49E]">Unrecoverable rent burned</span>
                    </div>
                    <span className="text-xs font-bold text-[#C75050]">−{formatDollars(forecast.rentBurned)}</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-[#141412] border border-[#2A2A27]">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-3 h-3 text-[#8B3A3A]" />
                      <span className="text-[10px] text-[#A8A49E]">NYC price appreciation ({(NYC_ASSUMPTIONS.avgAnnualAppreciation * 100).toFixed(0)}%/yr)</span>
                    </div>
                    <span className="text-xs font-bold text-[#C75050]">−{formatDollars(forecast.priceIncrease)}</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 bg-[#141412] border border-[#2A2A27]">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-3 h-3 text-[#4A7C59]" />
                      <span className="text-[10px] text-[#A8A49E]">Buying power gain (if rate drops {(rateDropBps / 100).toFixed(2)}%)</span>
                    </div>
                    <span className={cn("text-xs font-bold", forecast.buyingPowerChange > 0 ? "text-[#4A7C59]" : "text-[#6E6A65]")}>
                      {forecast.buyingPowerChange > 0 ? '+' : ''}{formatDollars(forecast.buyingPowerChange)}
                    </span>
                  </div>
                </div>

                {/* Monthly payment comparison */}
                <div className="mt-4 pt-4 border-t border-[#2A2A27] flex items-center gap-4">
                  <div className="flex-1 text-center">
                    <div className="text-[8px] uppercase tracking-widest text-[#6E6A65] mb-1">Buy Today</div>
                    <div className="font-serif text-lg text-[#F0EDE8]">${Math.round(forecast.currentMonthlyPayment).toLocaleString()}/mo</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8B3A3A] shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="text-[8px] uppercase tracking-widest text-[#6E6A65] mb-1">Buy in {waitMonths}mo</div>
                    <div className="font-serif text-lg text-[#C75050]">${Math.round(forecast.newMonthlyPayment).toLocaleString()}/mo</div>
                  </div>
                  <div className="flex-1 text-center border-l border-[#2A2A27] pl-4">
                    <div className="text-[8px] uppercase tracking-widest text-[#6E6A65] mb-1">Delta</div>
                    <div className={cn("font-serif text-lg", forecast.paymentDelta > 0 ? "text-[#C75050]" : "text-[#4A7C59]")}>
                      {forecast.paymentDelta > 0 ? '+' : ''}{formatDollars(forecast.paymentDelta)}/mo
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent coaching note */}
              <div className="bg-[#141412] border border-[#C8B89A]/20 p-4">
                <div className="text-[9px] uppercase tracking-widest text-[#C8B89A] font-bold mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> How to Use This
                </div>
                <p className="text-xs text-[#A8A49E] leading-relaxed">
                  Share this forecast when a client says "let's wait for rates to drop." 
                  The math shows that even optimistic rate improvements rarely offset NYC price appreciation + rent burn. 
                  Frame it as: <em className="text-[#F0EDE8]">"I ran the numbers on waiting vs. buying now. 
                  Even if rates drop by {(rateDropBps / 100).toFixed(1)}%, you'd still lose {formatDollars(forecast.netCostOfWaiting)} — 
                  mostly in rent you'll never see again."</em>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
