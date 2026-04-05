'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator } from 'lucide-react';

const BUDGET_DEFAULTS: Record<string, number> = {
  'Under $750K': 650000,
  '$750K – $1.2M': 950000,
  '$1.2M – $2M': 1500000,
  '$2M – $3.5M': 2500000,
  '$3.5M+': 4000000,
};

interface CalculatorViewProps {
  budgetTier: string;
}

export function CalculatorView({ budgetTier }: CalculatorViewProps) {
  const [price, setPrice] = useState(1000000);
  const [downPercent, setDownPercent] = useState(20);
  const [maint, setMaint] = useState(1500);
  const [rate] = useState(6.5);

  useEffect(() => {
    if (budgetTier && BUDGET_DEFAULTS[budgetTier]) {
      setPrice(BUDGET_DEFAULTS[budgetTier]);
    }
  }, [budgetTier]);

  const downPayment = price * (downPercent / 100);
  const loanAmount = price - downPayment;
  const monthlyRate = rate / 100 / 12;
  const numPayments = 30 * 12;
  const monthlyMortgage =
    monthlyRate === 0
      ? loanAmount / numPayments
      : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

  const totalMonthly = monthlyMortgage + maint;
  const postClosingReq = totalMonthly * 24;
  const requiredIncome = (totalMonthly / 0.28) * 12;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="mb-6">
        <div className="text-[10px] text-[#A8956E] font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
          <Calculator className="w-4 h-4" /> Reality Check
        </div>
        <h2 className="font-serif text-4xl mb-2 text-[#F0EDE8]">Financial Stress Tester</h2>
        <p className="text-[#A8A49E] font-light max-w-xl">
          Standard calculators ignore NYC realities. We calculate strict Co-op DTI limits and post-closing
          liquidity minimums to prevent board rejection.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-6 rounded-sm space-y-8">
          {[
            { label: 'Purchase Price', value: `$${price.toLocaleString()}`, min: 300000, max: 5000000, step: 25000, state: price, setter: setPrice },
            { label: `Down Payment (${downPercent}%)`, value: `$${downPayment.toLocaleString()}`, min: 10, max: 100, step: 5, state: downPercent, setter: setDownPercent },
            { label: 'Maintenance / HOA (Monthly)', value: `$${maint.toLocaleString()}`, min: 500, max: 5000, step: 100, state: maint, setter: setMaint },
          ].map(({ label, value, min, max, step, state, setter }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-4">
                <span className="text-[#6E6A65] uppercase tracking-widest font-bold">{label}</span>
                <span className="text-[#F0EDE8] font-serif">{value}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={state}
                onChange={e => setter(Number(e.target.value))}
                className="w-full accent-[#C8B89A]"
              />
            </div>
          ))}
        </div>

        <div className="glass p-8 rounded-sm bg-[#C8B89A]/5 flex flex-col justify-center">
          <div className="mb-8">
            <h4 className="text-[10px] text-[#6E6A65] uppercase tracking-widest font-bold mb-2">
              Total Monthly Obligation
            </h4>
            <div className="font-serif text-5xl text-[#C8B89A]">${Math.round(totalMonthly).toLocaleString()}</div>
            <p className="text-xs text-[#A8A49E] mt-2 italic">Mortgage + Maintenance/HOA</p>
          </div>

          <div className="space-y-4 pt-6 border-t border-[#2A2A27]">
            <div className="flex justify-between items-center p-3 bg-[#1A1A17]/50 border border-[#2A2A27]">
              <span className="text-xs text-[#A8A49E]">Required Income (28% DTI)</span>
              <span className="text-sm font-bold text-[#F0EDE8]">${Math.round(requiredIncome).toLocaleString()}/yr</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#1A1A17]/50 border border-[#2A2A27]">
              <span className="text-xs text-[#A8A49E]">Post-Closing Liquidity (24mo)</span>
              <span className="text-sm font-bold text-[#F0EDE8]">${Math.round(postClosingReq).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
