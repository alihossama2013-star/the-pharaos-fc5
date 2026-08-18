import React from 'react';
import { motion } from 'motion/react';
import { Target, Flame, Trophy, TrendingUp, Sparkles } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { MatchRecord, Player } from '../types';

interface TotalGoalsSummaryCardProps {
  totalGoals: number;
  totalAssists: number;
  matches: MatchRecord[];
  players: Player[];
  t: Record<string, string>;
  lang: 'ar' | 'en';
}

export const TotalGoalsSummaryCard: React.FC<TotalGoalsSummaryCardProps> = ({
  totalGoals,
  totalAssists,
  matches,
  players,
  t,
  lang
}) => {
  const matchesCount = matches.length;
  const goalsPerMatch = matchesCount > 0 ? (totalGoals / matchesCount).toFixed(1) : '0.0';

  // Find top scorer
  const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0];

  return (
    <motion.div
      key={`total-goals-card-${totalGoals}-${matchesCount}`}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      className="bg-gradient-to-r from-black/85 via-[#161208] to-black/85 p-3.5 sm:p-5 rounded-2xl border-2 border-[#D4AF37]/50 hover:border-[#FFD700] shadow-[0_0_25px_rgba(212,175,55,0.18)] hover:shadow-[0_0_35px_rgba(255,215,0,0.35)] transition-shadow relative overflow-hidden group cursor-pointer"
    >
      {/* Ambient background gold glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#D4AF37]/20 rounded-full blur-3xl pointer-events-none group-hover:bg-[#FFD700]/30 transition-all" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#D4AF37]/30 to-[#FFD700]/20 border border-[#D4AF37]/60 flex items-center justify-center text-[#FFD700] shadow-[0_0_15px_rgba(212,175,55,0.3)] shrink-0">
            <Target className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5C0] via-[#D4AF37] to-[#FFD700] uppercase tracking-wide flex items-center gap-1.5 truncate">
              <span>{t.totalGoalsTitle || (lang === 'ar' ? 'إجمالي أهداف الفريق' : 'Total Squad Goals')}</span>
              <Sparkles className="w-3.5 h-3.5 text-[#FFD700] animate-pulse shrink-0" />
            </h3>
            <p className="text-[10px] text-white/50 truncate">
              {t.totalGoalsSummaryDesc || (lang === 'ar' ? 'السجل التهديفي الكامل لنادي الفراعنة' : 'Official season goalscoring record')}
            </p>
          </div>
        </div>

        {/* Live sync pill */}
        <div className="px-2.5 py-1 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FFD700] text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
          <span>{matchesCount} {t.mCount || (lang === 'ar' ? 'مباريات' : 'Matches')}</span>
        </div>
      </div>

      {/* Main Counter & Visual Presentation */}
      <div className="py-4 relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <motion.div
            key={`goal-number-${totalGoals}`}
            initial={{ scale: 0.85, filter: 'brightness(1.5)' }}
            animate={{ scale: 1, filter: 'brightness(1)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="flex items-center gap-2"
          >
            <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFFBE6] via-[#FFD700] to-[#C89B1C] drop-shadow-[0_4px_16px_rgba(212,175,55,0.4)] font-mono leading-none tracking-tight">
              <AnimatedCounter value={totalGoals} duration={1100} />
            </span>
          </motion.div>

          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black text-white/90 uppercase tracking-widest leading-none">
              ⚽ {t.goals || 'GOALS'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-[#D4AF37] mt-1 font-bold">
              {goalsPerMatch} {t.goalsPerMatch || (lang === 'ar' ? 'هدف / مباراة' : 'goals / match')}
            </span>
          </div>
        </div>

        {/* Mini stats badges inside card */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto text-xs font-mono">
          <div className="bg-black/50 border border-white/10 rounded-2xl p-2.5 flex items-center gap-2.5 min-w-[120px]">
            <div className="w-7 h-7 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
              <Flame className="w-3.5 h-3.5 text-[#FFD700]" />
            </div>
            <div>
              <span className="text-[9px] text-white/40 block leading-none">{t.assists || 'Assists'}</span>
              <span className="font-bold text-white text-sm">
                <AnimatedCounter value={totalAssists} duration={1000} />
              </span>
            </div>
          </div>

          <div className="bg-black/50 border border-white/10 rounded-2xl p-2.5 flex items-center gap-2.5 min-w-[120px]">
            <div className="w-7 h-7 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400 shrink-0">
              <Trophy className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div>
              <span className="text-[9px] text-white/40 block leading-none">{t.topScorers || 'Top Scorer'}</span>
              <span className="font-bold text-green-400 text-xs truncate block max-w-[85px]">
                {topScorer ? `${topScorer.name.split(' ')[0]} (${topScorer.goals})` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer subtle highlight bar */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-mono relative z-10">
        <span className="flex items-center gap-1 text-[#D4AF37]">
          <TrendingUp className="w-3 h-3 text-[#D4AF37]" />
          <span>{lang === 'ar' ? 'يتم التحديث والعد التلقائي فور تسجيل أي نتيجة' : 'Live count-up & pop-in animation on data updates'}</span>
        </span>
        <span className="text-white/30 hidden sm:inline">The Pharaohs FC</span>
      </div>
    </motion.div>
  );
};
