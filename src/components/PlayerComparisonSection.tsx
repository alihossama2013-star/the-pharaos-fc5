import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  ArrowLeftRight, 
  Trophy, 
  Flame, 
  Star, 
  Award, 
  TrendingUp, 
  Sparkles, 
  Zap,
  Target,
  Shield,
  BarChart2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  Tooltip 
} from 'recharts';
import { Player, MatchRecord } from '../types';
import { Language } from '../translations';

interface PlayerComparisonSectionProps {
  players: Player[];
  matches: MatchRecord[];
  lang: Language;
  t?: any;
}

export const PlayerComparisonSection: React.FC<PlayerComparisonSectionProps> = ({
  players,
  matches,
  lang
}) => {
  const isAr = lang === 'ar';

  // Initialize selected players with first two players if available
  const [playerAId, setPlayerAId] = useState<string>(() => {
    if (players.length > 0) return players[0].id;
    return '';
  });

  const [playerBId, setPlayerBId] = useState<string>(() => {
    if (players.length > 1) return players[1].id;
    if (players.length > 0) return players[0].id;
    return '';
  });

  // Calculate detailed stats for any player
  const getPlayerFullStats = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return null;

    // Goals & Assists from effective player
    const goals = player.goals || 0;
    const assists = player.assists || 0;
    const goalContributions = goals + assists;

    // Matches played
    let matchCount = 0;
    const ratings: number[] = [];
    let mvpCount = 0;

    matches.forEach(m => {
      const scored = (m.scorers || []).some(s => 
        s.playerId === player.id || 
        s.playerId?.toLowerCase() === player.name.toLowerCase() || 
        s.playerId?.toLowerCase() === player.username.toLowerCase()
      );
      const assisted = (m.assisters || []).some(a => 
        a.playerId === player.id || 
        a.playerId?.toLowerCase() === player.name.toLowerCase() || 
        a.playerId?.toLowerCase() === player.username.toLowerCase()
      );
      const isMvp = m.mvpPlayerId === player.id || 
        m.mvpPlayerId?.toLowerCase() === player.name.toLowerCase() || 
        m.mvpPlayerId?.toLowerCase() === player.username.toLowerCase();

      if (isMvp) mvpCount++;

      const ratingEntry = (m.playerRatings || []).find(r => 
        r.playerId === player.id || 
        r.playerId?.toLowerCase() === player.name.toLowerCase() || 
        r.playerId?.toLowerCase() === player.username.toLowerCase()
      );

      if (ratingEntry && typeof ratingEntry.rating === 'number' && ratingEntry.rating > 0) {
        ratings.push(ratingEntry.rating);
      }

      if (scored || assisted || isMvp || ratingEntry) {
        matchCount++;
      } else if (!m.playerRatings || m.playerRatings.length === 0) {
        matchCount++;
      }
    });

    const avgRating = ratings.length > 0 
      ? Number((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)) 
      : 0;

    const winMatchesWithPlayer = matches.filter(m => {
      const isWin = m.result === 'W';
      const participated = (m.scorers || []).some(s => s.playerId === player.id) ||
        (m.assisters || []).some(a => a.playerId === player.id) ||
        m.mvpPlayerId === player.id ||
        (m.playerRatings || []).some(r => r.playerId === player.id);
      return isWin && participated;
    }).length;

    const winRate = matchCount > 0 ? Math.round((winMatchesWithPlayer / matchCount) * 100) : 0;

    return {
      player,
      goals,
      assists,
      goalContributions,
      matchesPlayed: player.matchesPlayed || matchCount,
      avgRating,
      hasRating: ratings.length > 0,
      mvpCount,
      winRate
    };
  };

  const statsA = useMemo(() => getPlayerFullStats(playerAId), [playerAId, players, matches]);
  const statsB = useMemo(() => getPlayerFullStats(playerBId), [playerBId, players, matches]);

  // Swap Players handler
  const handleSwapPlayers = () => {
    const temp = playerAId;
    setPlayerAId(playerBId);
    setPlayerBId(temp);
  };

  // Find max values across all players for clean normalization (0 - 100)
  const maxValues = useMemo(() => {
    let maxGoals = 1;
    let maxAssists = 1;
    let maxGA = 1;
    let maxMatches = 1;
    let maxMvp = 1;

    players.forEach(p => {
      const g = p.goals || 0;
      const a = p.assists || 0;
      if (g > maxGoals) maxGoals = g;
      if (a > maxAssists) maxAssists = a;
      if (g + a > maxGA) maxGA = g + a;
      if ((p.matchesPlayed || 0) > maxMatches) maxMatches = p.matchesPlayed || 1;
    });

    matches.forEach(m => {
      if (m.mvpPlayerId) {
        // count max mvps
      }
    });

    // Count max MVPs
    const mvpCounts: Record<string, number> = {};
    matches.forEach(m => {
      if (m.mvpPlayerId) {
        mvpCounts[m.mvpPlayerId] = (mvpCounts[m.mvpPlayerId] || 0) + 1;
      }
    });
    Object.values(mvpCounts).forEach(c => {
      if (c > maxMvp) maxMvp = c;
    });

    return {
      goals: Math.max(maxGoals, 5),
      assists: Math.max(maxAssists, 5),
      ga: Math.max(maxGA, 8),
      matches: Math.max(maxMatches, matches.length, 5),
      mvp: Math.max(maxMvp, 3)
    };
  }, [players, matches]);

  // Build Radar Chart Data
  const radarData = useMemo(() => {
    if (!statsA || !statsB) return [];

    const norm = (val: number, max: number) => {
      if (max <= 0) return 0;
      return Math.min(100, Math.round((val / max) * 100));
    };

    return [
      {
        metric: isAr ? 'الأهداف' : 'Goals',
        fullLabel: isAr ? `الأهداف (${statsA.goals} vs ${statsB.goals})` : `Goals (${statsA.goals} vs ${statsB.goals})`,
        valA: norm(statsA.goals, maxValues.goals),
        valB: norm(statsB.goals, maxValues.goals),
        rawA: statsA.goals,
        rawB: statsB.goals,
        unit: ''
      },
      {
        metric: isAr ? 'التمريرات' : 'Assists',
        fullLabel: isAr ? `التمريرات (${statsA.assists} vs ${statsB.assists})` : `Assists (${statsA.assists} vs ${statsB.assists})`,
        valA: norm(statsA.assists, maxValues.assists),
        valB: norm(statsB.assists, maxValues.assists),
        rawA: statsA.assists,
        rawB: statsB.assists,
        unit: ''
      },
      {
        metric: isAr ? 'المعدل ⭐' : 'Rating ⭐',
        fullLabel: isAr ? `التقييم (${statsA.avgRating || 0} vs ${statsB.avgRating || 0})` : `Avg Rating (${statsA.avgRating || 0} vs ${statsB.avgRating || 0})`,
        valA: statsA.avgRating ? Math.round((statsA.avgRating / 10) * 100) : 10,
        valB: statsB.avgRating ? Math.round((statsB.avgRating / 10) * 100) : 10,
        rawA: statsA.avgRating || 0,
        rawB: statsB.avgRating || 0,
        unit: '/10'
      },
      {
        metric: isAr ? 'المساهمات' : 'G + A',
        fullLabel: isAr ? `المساهمات التهديفية (${statsA.goalContributions} vs ${statsB.goalContributions})` : `Goal Contributions (${statsA.goalContributions} vs ${statsB.goalContributions})`,
        valA: norm(statsA.goalContributions, maxValues.ga),
        valB: norm(statsB.goalContributions, maxValues.ga),
        rawA: statsA.goalContributions,
        rawB: statsB.goalContributions,
        unit: ''
      },
      {
        metric: isAr ? 'رجل المباراة' : 'MVP',
        fullLabel: isAr ? `أفضل لاعب (${statsA.mvpCount} vs ${statsB.mvpCount})` : `MVP Awards (${statsA.mvpCount} vs ${statsB.mvpCount})`,
        valA: norm(statsA.mvpCount, maxValues.mvp),
        valB: norm(statsB.mvpCount, maxValues.mvp),
        rawA: statsA.mvpCount,
        rawB: statsB.mvpCount,
        unit: ''
      },
      {
        metric: isAr ? 'المباريات' : 'Matches',
        fullLabel: isAr ? `المباريات الملعوبة (${statsA.matchesPlayed} vs ${statsB.matchesPlayed})` : `Matches Played (${statsA.matchesPlayed} vs ${statsB.matchesPlayed})`,
        valA: norm(statsA.matchesPlayed, maxValues.matches),
        valB: norm(statsB.matchesPlayed, maxValues.matches),
        rawA: statsA.matchesPlayed,
        rawB: statsB.matchesPlayed,
        unit: ''
      }
    ];
  }, [statsA, statsB, maxValues, isAr]);

  // Custom Radar Tooltip
  const RadarCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && statsA && statsB) {
      const dataItem = payload[0].payload;
      return (
        <div className="bg-[#0c0c0c]/95 border border-[#FFD700]/50 p-3 rounded-2xl shadow-2xl text-xs space-y-2 min-w-[200px] backdrop-blur-md">
          <p className="font-bold text-white border-b border-white/10 pb-1 flex items-center justify-between">
            <span className="text-[#FFD700]">{dataItem.metric}</span>
            <span className="text-[10px] text-white/50">{dataItem.unit ? `${dataItem.unit}` : ''}</span>
          </p>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between text-[#FFD700]">
              <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                <span className="w-2 h-2 rounded-full bg-[#FFD700]" />
                <span className="truncate">{statsA.player.name}:</span>
              </div>
              <span className="font-black text-sm">{dataItem.rawA}{dataItem.unit}</span>
            </div>
            <div className="flex items-center justify-between text-[#00E5FF]">
              <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                <span className="truncate">{statsB.player.name}:</span>
              </div>
              <span className="font-black text-sm">{dataItem.rawB}{dataItem.unit}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Quick Preset Matches
  const popularPresets = useMemo(() => {
    const list: { nameA: string; nameB: string; label: string }[] = [];
    if (players.length >= 2) {
      list.push({
        nameA: players[0].id,
        nameB: players[1].id,
        label: `${players[0].name.split(' ')[0]} 🆚 ${players[1].name.split(' ')[0]}`
      });
    }
    if (players.length >= 4) {
      list.push({
        nameA: players[2].id,
        nameB: players[3].id,
        label: `${players[2].name.split(' ')[0]} 🆚 ${players[3].name.split(' ')[0]}`
      });
    }
    if (players.length >= 3) {
      list.push({
        nameA: players[0].id,
        nameB: players[2].id,
        label: `${players[0].name.split(' ')[0]} 🆚 ${players[2].name.split(' ')[0]}`
      });
    }
    return list;
  }, [players]);

  if (players.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center text-white/50 text-xs">
        {isAr ? 'لا يوجد لاعبين متاحين للمقارنة' : 'No players available for comparison'}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-white/[0.07] via-white/[0.04] to-black/60 border border-white/15 p-4 sm:p-6 rounded-3xl space-y-6 shadow-2xl backdrop-blur-sm">
      {/* Header with Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-black uppercase tracking-wider bg-[#FFD700]/20 text-[#FFD700] px-2.5 py-0.5 rounded-full border border-[#FFD700]/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {isAr ? 'مقارنة الرادار التفاعلية' : 'Interactive Radar Analysis'}
            </span>
            <span className="text-[9px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              Side-by-Side
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-1.5">
            <BarChart2 className="w-5 h-5 text-[#FFD700]" />
            <span>{isAr ? 'مقارنة اللاعبين المباشرة (رادار الأداء)' : 'Side-by-Side Player Radar Comparison'}</span>
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            {isAr 
              ? 'اختر أي لاعبين لمقارنة الأهداف، التمريرات، معدل التقييم، والمساهمات في مخطط راداري تفاعلي'
              : 'Select two players to compare goals, assists, average ratings, and match impact on a visual radar chart'}
          </p>
        </div>

        {/* Quick Presets */}
        {popularPresets.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-white/40 font-mono hidden sm:inline">{isAr ? 'مقارنات سريعة:' : 'Quick:'}</span>
            {popularPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPlayerAId(preset.nameA);
                  setPlayerBId(preset.nameB);
                }}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FFD700]/40 rounded-xl text-[11px] font-bold text-white transition-all active:scale-95 flex items-center gap-1"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center bg-black/40 p-3 sm:p-4 rounded-2xl border border-white/10">
        {/* Player A Dropdown */}
        <div className="sm:col-span-5 space-y-1.5">
          <label className="text-[10px] font-mono uppercase text-[#FFD700] font-bold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFD700] shadow-[0_0_8px_#FFD700]" />
            {isAr ? 'اللاعب الأول (الذهبي)' : 'Player A (Gold)'}
          </label>
          <div className="relative">
            <select
              value={playerAId}
              onChange={(e) => setPlayerAId(e.target.value)}
              className="w-full bg-[#141208] border border-[#FFD700]/40 hover:border-[#FFD700] text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#FFD700] transition-colors appearance-none cursor-pointer"
            >
              {players.map(p => (
                <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                  {p.name} ({p.goals} ⚽ / {p.assists} 🅰️)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 ltr:right-0 rtl:left-0 flex items-center px-3 text-[#FFD700]">
              ▼
            </div>
          </div>
        </div>

        {/* Swap Button in Center */}
        <div className="sm:col-span-1 flex justify-center py-1 sm:py-0">
          <button
            type="button"
            onClick={handleSwapPlayers}
            title={isAr ? 'تبديل اللاعبين' : 'Swap Players'}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-[#FFD700] hover:text-black text-white border border-white/20 hover:border-[#FFD700] flex items-center justify-center transition-all shadow-md active:scale-90"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Player B Dropdown */}
        <div className="sm:col-span-5 space-y-1.5">
          <label className="text-[10px] font-mono uppercase text-[#00E5FF] font-bold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
            {isAr ? 'اللاعب الثاني (السماوي)' : 'Player B (Cyan)'}
          </label>
          <div className="relative">
            <select
              value={playerBId}
              onChange={(e) => setPlayerBId(e.target.value)}
              className="w-full bg-[#081318] border border-[#00E5FF]/40 hover:border-[#00E5FF] text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#00E5FF] transition-colors appearance-none cursor-pointer"
            >
              {players.map(p => (
                <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                  {p.name} ({p.goals} ⚽ / {p.assists} 🅰️)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 ltr:right-0 rtl:left-0 flex items-center px-3 text-[#00E5FF]">
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Main Comparison Area: Side-by-Side Cards & Radar Chart */}
      {statsA && statsB && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Player A Detailed Card (Left) */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-b from-[#1a1606] via-[#120f04] to-black p-4 rounded-3xl border-2 border-[#FFD700]/50 shadow-[0_0_25px_rgba(255,215,0,0.15)] relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD700]/10 rounded-full blur-2xl pointer-events-none" />

              {/* Avatar & Name Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D4AF37] via-[#FFD700] to-[#FFF5C0] text-black font-black text-base flex items-center justify-center ring-2 ring-[#FFD700] shadow-md shrink-0">
                  {statsA.player.avatar || statsA.player.name[0]}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-mono uppercase bg-[#FFD700]/20 text-[#FFD700] px-2 py-0.5 rounded-full font-bold">
                    {statsA.player.position || 'Player'}
                  </span>
                  <h4 className="text-base font-black text-white truncate mt-0.5">
                    {statsA.player.name}
                  </h4>
                  <p className="text-[10px] text-white/40 font-mono truncate">@{statsA.player.username}</p>
                </div>
              </div>

              {/* Key Highlights Grid */}
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-black/50 p-2.5 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-white/40 uppercase block">{isAr ? 'الأهداف' : 'Goals'}</span>
                  <span className="text-xl font-black text-[#FFD700] flex items-center justify-center gap-1">
                    ⚽ {statsA.goals}
                  </span>
                </div>
                <div className="bg-black/50 p-2.5 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-white/40 uppercase block">{isAr ? 'التمريرات' : 'Assists'}</span>
                  <span className="text-xl font-black text-[#FFD700] flex items-center justify-center gap-1">
                    🅰️ {statsA.assists}
                  </span>
                </div>
                <div className="bg-black/50 p-2.5 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-white/40 uppercase block">{isAr ? 'المعدل' : 'Rating'}</span>
                  <span className="text-base font-black text-[#FFD700] flex items-center justify-center gap-1">
                    ⭐ {statsA.avgRating > 0 ? statsA.avgRating.toFixed(1) : '--'}
                  </span>
                </div>
                <div className="bg-black/50 p-2.5 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-white/40 uppercase block">{isAr ? 'رجل المباراة' : 'MVP'}</span>
                  <span className="text-base font-black text-[#FFD700] flex items-center justify-center gap-1">
                    🏆 {statsA.mvpCount}
                  </span>
                </div>
              </div>

              {/* Goal Contribution Total */}
              <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 p-2.5 rounded-2xl flex items-center justify-between text-xs font-mono">
                <span className="text-[#FFD700] font-bold">{isAr ? 'مجموع المساهمات (G+A):' : 'Total G+A:'}</span>
                <span className="text-sm font-black text-white">{statsA.goalContributions}</span>
              </div>
            </div>
          </div>

          {/* Radar Chart Visualizer (Center) */}
          <div className="lg:col-span-6 bg-black/50 border border-white/10 rounded-3xl p-3 sm:p-5 relative overflow-hidden shadow-inner flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-xs font-mono border-b border-white/5 pb-2 mb-1 px-1">
              <span className="text-[#FFD700] font-bold flex items-center gap-1.5 truncate max-w-[140px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFD700]" />
                {statsA.player.name}
              </span>
              <span className="text-xs font-black uppercase text-white/30 px-2 py-0.5 bg-white/5 rounded-full">
                VS
              </span>
              <span className="text-[#00E5FF] font-bold flex items-center gap-1.5 truncate max-w-[140px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" />
                {statsB.player.name}
              </span>
            </div>

            {/* Recharts Radar */}
            <div className="h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#ffffff20" />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    tick={{ fill: '#ffffff90', fontSize: 11, fontWeight: 700 }}
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    stroke="#ffffff25"
                    tick={{ fill: '#ffffff40', fontSize: 9 }}
                  />
                  <Tooltip content={<RadarCustomTooltip />} />
                  <Radar
                    name={statsA.player.name}
                    dataKey="valA"
                    stroke="#FFD700"
                    fill="#FFD700"
                    fillOpacity={0.45}
                    strokeWidth={2.5}
                    animationDuration={1200}
                    dot={{ r: 4, fill: '#FFD700', stroke: '#000', strokeWidth: 1 }}
                  />
                  <Radar
                    name={statsB.player.name}
                    dataKey="valB"
                    stroke="#00E5FF"
                    fill="#00E5FF"
                    fillOpacity={0.35}
                    strokeWidth={2.5}
                    animationDuration={1200}
                    dot={{ r: 4, fill: '#00E5FF', stroke: '#000', strokeWidth: 1 }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    formatter={(value) => <span className="text-white/80 font-bold px-1">{value}</span>}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Player B Detailed Card (Right) */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-b from-[#05171a] via-[#041013] to-black p-4 rounded-3xl border-2 border-[#00E5FF]/50 shadow-[0_0_25px_rgba(0,229,255,0.15)] relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#00E5FF]/10 rounded-full blur-2xl pointer-events-none" />

              {/* Avatar & Name Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00A3BF] via-[#00E5FF] to-[#E0FBFF] text-black font-black text-base flex items-center justify-center ring-2 ring-[#00E5FF] shadow-md shrink-0">
                  {statsB.player.avatar || statsB.player.name[0]}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-mono uppercase bg-[#00E5FF]/20 text-[#00E5FF] px-2 py-0.5 rounded-full font-bold">
                    {statsB.player.position || 'Player'}
                  </span>
                  <h4 className="text-base font-black text-white truncate mt-0.5">
                    {statsB.player.name}
                  </h4>
                  <p className="text-[10px] text-white/40 font-mono truncate">@{statsB.player.username}</p>
                </div>
              </div>

              {/* Key Highlights Grid */}
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-black/50 p-2.5 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-white/40 uppercase block">{isAr ? 'الأهداف' : 'Goals'}</span>
                  <span className="text-xl font-black text-[#00E5FF] flex items-center justify-center gap-1">
                    ⚽ {statsB.goals}
                  </span>
                </div>
                <div className="bg-black/50 p-2.5 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-white/40 uppercase block">{isAr ? 'التمريرات' : 'Assists'}</span>
                  <span className="text-xl font-black text-[#00E5FF] flex items-center justify-center gap-1">
                    🅰️ {statsB.assists}
                  </span>
                </div>
                <div className="bg-black/50 p-2.5 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-white/40 uppercase block">{isAr ? 'المعدل' : 'Rating'}</span>
                  <span className="text-base font-black text-[#00E5FF] flex items-center justify-center gap-1">
                    ⭐ {statsB.avgRating > 0 ? statsB.avgRating.toFixed(1) : '--'}
                  </span>
                </div>
                <div className="bg-black/50 p-2.5 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-white/40 uppercase block">{isAr ? 'رجل المباراة' : 'MVP'}</span>
                  <span className="text-base font-black text-[#00E5FF] flex items-center justify-center gap-1">
                    🏆 {statsB.mvpCount}
                  </span>
                </div>
              </div>

              {/* Goal Contribution Total */}
              <div className="bg-[#00E5FF]/10 border border-[#00E5FF]/30 p-2.5 rounded-2xl flex items-center justify-between text-xs font-mono">
                <span className="text-[#00E5FF] font-bold">{isAr ? 'مجموع المساهمات (G+A):' : 'Total G+A:'}</span>
                <span className="text-sm font-black text-white">{statsB.goalContributions}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Head-to-Head Detailed Category Metrics Table */}
      {statsA && statsB && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center justify-between font-mono uppercase">
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#FFD700]" />
              {isAr ? 'المقارنة الرقمية المباشرة' : 'Head-to-Head Detailed Breakdown'}
            </span>
            <span className="text-[10px] text-white/40">
              {statsA.player.name} vs {statsB.player.name}
            </span>
          </h4>

          <div className="space-y-2 font-mono text-xs">
            {/* Metric Rows */}
            {[
              {
                label: isAr ? 'الأهداف المسجلة' : 'Goals Scored',
                valA: statsA.goals,
                valB: statsB.goals,
                format: (v: number) => `${v}`,
                icon: '⚽'
              },
              {
                label: isAr ? 'التمريرات الحاسمة' : 'Assists',
                valA: statsA.assists,
                valB: statsB.assists,
                format: (v: number) => `${v}`,
                icon: '🅰️'
              },
              {
                label: isAr ? 'المساهمات التهديفية الكلية' : 'Goal Contributions (G+A)',
                valA: statsA.goalContributions,
                valB: statsB.goalContributions,
                format: (v: number) => `${v}`,
                icon: '🔥'
              },
              {
                label: isAr ? 'متوسط تقييم المباريات' : 'Average Match Rating',
                valA: statsA.avgRating,
                valB: statsB.avgRating,
                format: (v: number) => v > 0 ? `⭐ ${v.toFixed(1)}/10` : '--',
                icon: '⭐'
              },
              {
                label: isAr ? 'جوائز رجل المباراة (MVP)' : 'Man of the Match (MVP)',
                valA: statsA.mvpCount,
                valB: statsB.mvpCount,
                format: (v: number) => `${v}`,
                icon: '🏆'
              },
              {
                label: isAr ? 'المباريات الملعوبة' : 'Matches Played',
                valA: statsA.matchesPlayed,
                valB: statsB.matchesPlayed,
                format: (v: number) => `${v}`,
                icon: '🏟️'
              }
            ].map((metric, idx) => {
              const diff = metric.valA - metric.valB;
              const aWins = diff > 0;
              const bWins = diff < 0;
              const isTie = diff === 0;

              return (
                <div 
                  key={idx} 
                  className="bg-white/5 hover:bg-white/[0.08] p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2 transition-colors"
                >
                  {/* Player A Value */}
                  <div className="w-24 text-center sm:text-start flex items-center gap-1.5">
                    <span className={`font-black text-sm ${aWins ? 'text-[#FFD700]' : 'text-white/60'}`}>
                      {metric.format(metric.valA)}
                    </span>
                    {aWins && (
                      <span className="text-[9px] bg-[#FFD700]/20 text-[#FFD700] px-1.5 py-0.5 rounded font-bold">
                        {isAr ? 'متفوق' : 'Lead'}
                      </span>
                    )}
                  </div>

                  {/* Metric Label in Middle */}
                  <div className="flex-1 text-center min-w-0 px-2">
                    <p className="text-[11px] font-bold text-white/90 truncate flex items-center justify-center gap-1">
                      <span>{metric.icon}</span>
                      <span>{metric.label}</span>
                    </p>
                  </div>

                  {/* Player B Value */}
                  <div className="w-24 text-center sm:text-end flex items-center justify-end gap-1.5">
                    {bWins && (
                      <span className="text-[9px] bg-[#00E5FF]/20 text-[#00E5FF] px-1.5 py-0.5 rounded font-bold">
                        {isAr ? 'متفوق' : 'Lead'}
                      </span>
                    )}
                    <span className={`font-black text-sm ${bWins ? 'text-[#00E5FF]' : 'text-white/60'}`}>
                      {metric.format(metric.valB)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
