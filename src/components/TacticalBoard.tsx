import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Crown, 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  Check, 
  Sparkles, 
  ShieldAlert, 
  Zap, 
  Award, 
  X, 
  Plus, 
  ArrowRight, 
  Sliders,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Player } from '../App';
import { Language, translations } from '../translations';

export type MatchCondition = 'WINNING' | 'LOSING' | 'DRAWING';

export type FormationKey = 
  | '2-2'
  | '2-1-1'
  | '1-1-2'
  | '1-2-1'
  | '1-1-1-1'
  | '3-1-0'
  | '1-0-3';

export interface TacticalPosition {
  id: string;
  role: string; // e.g. 'GK', 'CB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'ST', 'LW', 'RW'
  label: string;
  x: number; // Percentage 0-100 from left
  y: number; // Percentage 0-100 from top (0 = Top/Attacking Goal, 100 = Bottom/Our GK Goal)
  playerId?: string | null;
  // Animation trajectory offset for simulation mode
  runX?: number;
  runY?: number;
}

export interface TacticalBoardData {
  formation: FormationKey;
  condition: MatchCondition;
  positions: TacticalPosition[];
  notes: string;
  updatedAt?: string;
  updatedBy?: string;
}

// 7 Required Formations with 1 GK + 4 Field Players (5 total positions)
export const FORMATION_PRESETS: Record<FormationKey, { name: string; desc: string; positions: TacticalPosition[] }> = {
  '2-2': {
    name: '2 - 2 (Box 2-2)',
    desc: '2 Center Backs, 2 Strikers',
    positions: [
      { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 90, runX: 0, runY: -2 },
      { id: 'cb1', role: 'CB', label: 'CB (L)', x: 28, y: 66, runX: -4, runY: -6 },
      { id: 'cb2', role: 'CB', label: 'CB (R)', x: 72, y: 66, runX: 4, runY: -6 },
      { id: 'st1', role: 'ST', label: 'ST (L)', x: 32, y: 22, runX: -8, runY: -8 },
      { id: 'st2', role: 'ST', label: 'ST (R)', x: 68, y: 22, runX: 8, runY: -8 }
    ]
  },
  '2-1-1': {
    name: '2 - 1 - 1 (Pyramid)',
    desc: '2 Center Backs, 1 Midfielder, 1 Striker',
    positions: [
      { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 90, runX: 0, runY: -2 },
      { id: 'cb1', role: 'CB', label: 'CB (L)', x: 26, y: 68, runX: -5, runY: -5 },
      { id: 'cb2', role: 'CB', label: 'CB (R)', x: 74, y: 68, runX: 5, runY: -5 },
      { id: 'cm', role: 'CM', label: 'CM', x: 50, y: 46, runX: 0, runY: -10 },
      { id: 'st', role: 'ST', label: 'ST', x: 50, y: 20, runX: 0, runY: -10 }
    ]
  },
  '1-1-2': {
    name: '1 - 1 - 2 (Funnel)',
    desc: '1 Center Back, 1 Midfielder, 2 Strikers',
    positions: [
      { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 90, runX: 0, runY: -2 },
      { id: 'cb', role: 'CB', label: 'CB', x: 50, y: 72, runX: 0, runY: -6 },
      { id: 'cm', role: 'CM', label: 'CM', x: 50, y: 48, runX: 0, runY: -10 },
      { id: 'st1', role: 'ST', label: 'ST (L)', x: 30, y: 22, runX: -10, runY: -8 },
      { id: 'st2', role: 'ST', label: 'ST (R)', x: 70, y: 22, runX: 10, runY: -8 }
    ]
  },
  '1-2-1': {
    name: '1 - 2 - 1 (Diamond)',
    desc: '1 Center Back, 2 Wingbacks, 1 Striker',
    positions: [
      { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 90, runX: 0, runY: -2 },
      { id: 'cb', role: 'CB', label: 'CB', x: 50, y: 72, runX: 0, runY: -6 },
      { id: 'lwb', role: 'LWB', label: 'LWB', x: 18, y: 48, runX: -6, runY: -16 },
      { id: 'rwb', role: 'RWB', label: 'RWB', x: 82, y: 48, runX: 6, runY: -16 },
      { id: 'st', role: 'ST', label: 'ST', x: 50, y: 18, runX: 0, runY: -8 }
    ]
  },
  '1-1-1-1': {
    name: '1 - 1 - 1 - 1 (Spine / Y-Chain)',
    desc: '1 Center Back, 1 Defensive Mid, 1 Attacking Mid, 1 Striker',
    positions: [
      { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 90, runX: 0, runY: -2 },
      { id: 'cb', role: 'CB', label: 'CB', x: 50, y: 74, runX: 0, runY: -5 },
      { id: 'cdm', role: 'CDM', label: 'CDM', x: 50, y: 56, runX: 0, runY: -8 },
      { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 36, runX: 0, runY: -10 },
      { id: 'st', role: 'ST', label: 'ST', x: 50, y: 16, runX: 0, runY: -8 }
    ]
  },
  '3-1-0': {
    name: '3 - 1 - 0 (Ultra Defensive Wall)',
    desc: '3 Center Backs, 1 Attacking Mid, 0 Strikers',
    positions: [
      { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 90, runX: 0, runY: -2 },
      { id: 'cb1', role: 'CB', label: 'CB (L)', x: 22, y: 68, runX: -4, runY: -4 },
      { id: 'cb2', role: 'CB', label: 'CB (C)', x: 50, y: 70, runX: 0, runY: -5 },
      { id: 'cb3', role: 'CB', label: 'CB (R)', x: 78, y: 68, runX: 4, runY: -4 },
      { id: 'cam', role: 'CAM', label: 'CAM', x: 50, y: 38, runX: 0, runY: -12 }
    ]
  },
  '1-0-3': {
    name: '1 - 0 - 3 (All-Out Overload Attack)',
    desc: '1 Center Back, 0 Midfield, 1 Left Wing, 1 Striker, 1 Right Wing',
    positions: [
      { id: 'gk', role: 'GK', label: 'GK', x: 50, y: 90, runX: 0, runY: -2 },
      { id: 'cb', role: 'CB', label: 'CB', x: 50, y: 72, runX: 0, runY: -5 },
      { id: 'lw', role: 'LW', label: 'LW', x: 20, y: 22, runX: -8, runY: -10 },
      { id: 'st', role: 'ST', label: 'ST', x: 50, y: 16, runX: 0, runY: -8 },
      { id: 'rw', role: 'RW', label: 'RW', x: 80, y: 22, runX: 8, runY: -10 }
    ]
  }
};

interface TacticalBoardProps {
  players: Player[];
  currentUser: Player | null;
  isMasterUser: boolean;
  lang: Language;
}

export const TacticalBoard: React.FC<TacticalBoardProps> = ({
  players,
  currentUser,
  isMasterUser,
  lang
}) => {
  const t = translations[lang];

  // Selected Condition Tab
  const [activeCondition, setActiveCondition] = useState<MatchCondition>('WINNING');
  
  // Board state per condition
  const [formation, setFormation] = useState<FormationKey>('2-2');
  const [positions, setPositions] = useState<TacticalPosition[]>(FORMATION_PRESETS['2-2'].positions);
  const [tacticalNotes, setTacticalNotes] = useState<string>('');
  
  // UI States
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<TacticalPosition | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Default suggested tactical notes per condition
  const defaultNotes: Record<MatchCondition, { ar: string; en: string }> = {
    WINNING: {
      ar: 'الحفاظ على التنظيم الدفاعي، الضغط المتوسط، والاستحواذ لتأمين النتيجة مع مرتدات سريعة.',
      en: 'Maintain defensive shape, medium press, and control possession to secure the win.'
    },
    LOSING: {
      ar: 'ضغط عالي مباشر في منطقة المنافس، تكثيف الهجوم والزيادة العددية لحسم العودة.',
      en: 'All-out high press in opponent half, aggressive wing overlaps and direct forward runs.'
    },
    DRAWING: {
      ar: 'توازن تكتيكي، بناء لعب هادئ من الخلف واستغلال المساحات دون ترك ثغرات خلفية.',
      en: 'Balanced approach: controlled buildup, solid midfield coverage, and clinical finishing.'
    }
  };

  // Real-time Firestore sync listener for active condition
  useEffect(() => {
    if (!db) return;

    const docRef = doc(db, 'tactics', activeCondition);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as TacticalBoardData;
        if (data.formation && FORMATION_PRESETS[data.formation]) {
          setFormation(data.formation);
          setPositions(data.positions || FORMATION_PRESETS[data.formation].positions);
          setTacticalNotes(data.notes || defaultNotes[activeCondition][lang]);
        }
      } else {
        // Fallback default setup if first time
        const defaultPreset = activeCondition === 'LOSING' ? '1-0-3' : activeCondition === 'WINNING' ? '3-1-0' : '2-2';
        setFormation(defaultPreset as FormationKey);
        setPositions(FORMATION_PRESETS[defaultPreset as FormationKey].positions);
        setTacticalNotes(defaultNotes[activeCondition][lang]);
      }
    }, (error) => {
      console.warn('Tactics firestore listener error:', error);
    });

    return () => unsubscribe();
  }, [activeCondition, lang]);

  // Handle formation switch
  const handleFormationChange = (newFormation: FormationKey) => {
    setFormation(newFormation);
    const presetPositions = FORMATION_PRESETS[newFormation].positions;
    
    // Attempt to retain assigned players where role matches
    const updatedPositions = presetPositions.map(newPos => {
      const existingMatch = positions.find(p => p.playerId && p.role === newPos.role);
      return {
        ...newPos,
        playerId: existingMatch ? existingMatch.playerId : null
      };
    });

    setPositions(updatedPositions);
  };

  // Assign player to slot
  const handleAssignPlayer = (slotId: string, playerId: string | null) => {
    setPositions(prev => prev.map(pos => {
      if (pos.id === slotId) {
        return { ...pos, playerId };
      }
      // Unassign if player was already placed in another slot
      if (playerId && pos.playerId === playerId) {
        return { ...pos, playerId: null };
      }
      return pos;
    }));
    setSelectedSlot(null);
  };

  // Quick auto-assign players based on position & stats
  const handleAutoAssign = () => {
    const available = [...players];
    const newPositions = positions.map(pos => {
      // Find GK for GK
      if (pos.role === 'GK') {
        const gk = available.find(p => p.position === 'goalkeeper') || available[0];
        return { ...pos, playerId: gk ? gk.id : null };
      }
      // Match defenders
      if (pos.role.includes('CB') || pos.role.includes('WB')) {
        const def = available.find(p => p.position === 'defender' && !positions.some(posItem => posItem.playerId === p.id));
        if (def) return { ...pos, playerId: def.id };
      }
      // Match forwards
      if (pos.role.includes('ST') || pos.role.includes('W')) {
        const fwd = available.find(p => p.position === 'forward' && !positions.some(posItem => posItem.playerId === p.id));
        if (fwd) return { ...pos, playerId: fwd.id };
      }
      // Fallback first available player
      const unassigned = available.find(p => !positions.some(posItem => posItem.playerId === p.id));
      return { ...pos, playerId: unassigned ? unassigned.id : null };
    });

    setPositions(newPositions);
  };

  // Save to Firestore
  const handleSaveTactics = async () => {
    if (!isMasterUser) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const docData: TacticalBoardData = {
        formation,
        condition: activeCondition,
        positions,
        notes: tacticalNotes,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || 'Ali Hossam'
      };

      await setDoc(doc(db, 'tactics', activeCondition), docData, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving tactical board state:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Get condition badge styling
  const getConditionStyle = (cond: MatchCondition) => {
    switch (cond) {
      case 'WINNING':
        return {
          activeClass: 'bg-gradient-to-r from-emerald-600 to-green-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
          borderAccent: 'border-emerald-500/40',
          badgeText: t.winningCondition,
          glowBg: 'from-emerald-500/20'
        };
      case 'LOSING':
        return {
          activeClass: 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
          borderAccent: 'border-red-500/40',
          badgeText: t.losingCondition,
          glowBg: 'from-red-500/20'
        };
      case 'DRAWING':
      default:
        return {
          activeClass: 'bg-gradient-to-r from-yellow-600 to-amber-500 text-black border-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] font-black',
          borderAccent: 'border-yellow-500/40',
          badgeText: t.drawingCondition,
          glowBg: 'from-yellow-500/20'
        };
    }
  };

  const condStyle = getConditionStyle(activeCondition);

  return (
    <div className="space-y-5">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-widest bg-[#D4AF37]/20 text-[#FFD700] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FFD700]" />
              <span>LIVE MATCH TACTICS</span>
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            <span>{t.tacticalBoardTitle}</span>
          </h3>
          <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
            {t.tacticalBoardSubtitle}
          </p>
        </div>

        {/* Master Account Live Sync Banner */}
        <div className="p-2.5 bg-gradient-to-r from-black via-[#1a1505] to-black border border-[#D4AF37]/40 rounded-2xl text-[11px] leading-snug text-[#D4AF37] flex items-center gap-2.5 shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div>
            <p className="font-extrabold flex items-center gap-1">
              <span>{isMasterUser ? t.masterTacticsNotice : t.viewerTacticsNotice}</span>
            </p>
          </div>
        </div>
      </div>

      {/* MATCH CONDITION TABS (WINNING / LOSING / DRAWING) */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono font-bold uppercase text-white/50 tracking-wider block">
          1. MATCH CONDITION (حالة المباراة)
        </label>
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/60 rounded-2xl border border-white/10">
          {(['WINNING', 'LOSING', 'DRAWING'] as const).map(cond => {
            const isSelected = activeCondition === cond;
            const style = getConditionStyle(cond);
            return (
              <button
                key={cond}
                type="button"
                onClick={() => {
                  setActiveCondition(cond);
                  setSelectedSlot(null);
                }}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 border ${
                  isSelected 
                    ? style.activeClass 
                    : 'bg-white/5 text-white/60 border-transparent hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-xs">
                  {cond === 'WINNING' ? '🏆' : cond === 'LOSING' ? '⚡' : '⚖️'}
                </span>
                <span className="font-mono tracking-tight text-[11px] sm:text-xs">
                  {cond === 'WINNING' ? t.winningCondition : cond === 'LOSING' ? t.losingCondition : t.drawingCondition}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FORMATION SELECTOR & BOARD ACTION CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/10">
        <div>
          <label className="text-[10px] font-mono font-bold uppercase text-white/50 mb-1.5 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>2. {t.selectFormation} ({FORMATION_PRESETS[formation].name})</span>
          </label>
          <select
            value={formation}
            onChange={(e) => handleFormationChange(e.target.value as FormationKey)}
            disabled={!isMasterUser}
            className="w-full bg-black/60 border border-[#D4AF37]/40 rounded-xl px-3 py-2 text-xs text-[#FFD700] font-bold font-mono focus:outline-none focus:border-[#FFD700] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {Object.entries(FORMATION_PRESETS).map(([key, item]) => (
              <option key={key} value={key} className="bg-black text-white">
                ⚽ {item.name} -- {item.desc}
              </option>
            ))}
          </select>
        </div>

        {/* CONTROLS (ANIMATE, AUTO-ASSIGN, RESET) */}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setIsAnimating(!isAnimating)}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 shadow-sm font-mono ${
              isAnimating 
                ? 'bg-[#FFD700] text-black border-[#FFD700] animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.5)]' 
                : 'bg-white/10 text-white hover:bg-white/20 border-white/15'
            }`}
          >
            {isAnimating ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isAnimating ? t.pauseAnimation : t.animateBoard}</span>
          </button>

          {isMasterUser && (
            <>
              <button
                type="button"
                onClick={handleAutoAssign}
                className="py-2 px-3 text-xs font-bold rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#FFD700] border border-[#D4AF37]/30 transition-colors flex items-center gap-1 font-mono shrink-0"
                title="Auto-fill squad into positions"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto Fill</span>
              </button>

              <button
                type="button"
                onClick={() => setPositions(FORMATION_PRESETS[formation].positions)}
                className="py-2 px-3 text-xs font-bold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors flex items-center gap-1 font-mono shrink-0"
                title={t.clearBoard}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.clearBoard}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 9:16 VERTICAL STADIUM TACTICAL PITCH CONTAINER */}
      <div className="relative w-full max-w-[360px] sm:max-w-[400px] aspect-[9/16] mx-auto rounded-3xl overflow-hidden border-2 border-[#D4AF37]/50 shadow-[0_10px_40px_rgba(0,0,0,0.9)] bg-gradient-to-b from-[#092a15] via-[#0d3b1f] to-[#092a15] select-none">
        
        {/* Pitch Lighting & Grass Texture Lines */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_24px,rgba(0,0,0,0.08)_24px,rgba(0,0,0,0.08)_48px)] pointer-events-none" />
        
        {/* Top/Bottom Stadium Glow */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* PITCH MARKINGS (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-white/25 fill-none" strokeWidth="1.5">
          {/* Touchline Outer Box */}
          <rect x="5%" y="3%" width="90%" height="94%" rx="12" />
          
          {/* Halfway Line */}
          <line x1="5%" y1="50%" x2="95%" y2="50%" strokeDasharray="4 3" />
          
          {/* Center Circle */}
          <circle cx="50%" cy="50%" r="16%" />
          <circle cx="50%" cy="50%" r="1.5" fill="white" />

          {/* Top Penalty Box (Opponent Goal) */}
          <rect x="25%" y="3%" width="50%" height="18%" />
          <rect x="36%" y="3%" width="28%" height="7%" />
          <path d="M 38% 21% A 12% 12% 0 0 0 62% 21%" />

          {/* Bottom Penalty Box (Our Goal) */}
          <rect x="25%" y="79%" width="50%" height="18%" />
          <rect x="36%" y="90%" width="28%" height="7%" />
          <path d="M 38% 79% A 12% 12% 0 0 1 62% 79%" />

          {/* Goal Net Posts Top & Bottom */}
          <rect x="38%" y="1%" width="24%" height="2%" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" />
          <rect x="38%" y="97%" width="24%" height="2%" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" />

          {/* Corner Arcs */}
          <path d="M 5% 7% A 4% 4% 0 0 0 9% 3%" />
          <path d="M 95% 7% A 4% 4% 0 0 1 91% 3%" />
          <path d="M 5% 93% A 4% 4% 0 0 1 9% 97%" />
          <path d="M 95% 93% A 4% 4% 0 0 0 91% 97%" />

          {/* ANIMATED TACTICAL MOVEMENT ARROWS IN SIMULATION MODE */}
          {isAnimating && (
            <g className="animate-pulse opacity-60">
              {positions.map(pos => {
                if (!pos.runX && !pos.runY) return null;
                const startX = `${pos.x}%`;
                const startY = `${pos.y}%`;
                const endX = `${pos.x + (pos.runX || 0)}%`;
                const endY = `${pos.y + (pos.runY || 0)}%`;
                return (
                  <g key={`arrow-${pos.id}`}>
                    <line 
                      x1={startX} 
                      y1={startY} 
                      x2={endX} 
                      y2={endY} 
                      stroke="#FFD700" 
                      strokeWidth="2" 
                      strokeDasharray="4 2" 
                    />
                    <circle cx={endX} cy={endY} r="3" fill="#FFD700" />
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* MATCH CONDITION BADGE OVERLAY ON PITCH */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[10px] font-mono font-bold text-white shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-ping" />
          <span>{condStyle.badgeText}</span>
        </div>

        {/* FORMATION BADGE OVERLAY */}
        <div className="absolute top-4 right-4 z-10 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-[#D4AF37]/40 text-[10px] font-mono font-extrabold text-[#FFD700] shadow-lg">
          {formation}
        </div>

        {/* PLAYER AVATAR POSITIONS ON THE PITCH */}
        {positions.map(pos => {
          const assignedPlayer = pos.playerId ? players.find(p => p.id === pos.playerId) : null;
          
          // Calculate animated coordinates during simulation mode
          const currentX = isAnimating ? pos.x + (pos.runX || 0) : pos.x;
          const currentY = isAnimating ? pos.y + (pos.runY || 0) : pos.y;

          return (
            <motion.div
              key={pos.id}
              layoutId={`pos-${pos.id}`}
              animate={{
                left: `${currentX}%`,
                top: `${currentY}%`,
                x: '-50%',
                y: '-50%',
                scale: isAnimating ? [1, 1.08, 1] : 1
              }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 22,
                scale: isAnimating ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : undefined
              }}
              onClick={() => {
                if (isMasterUser) {
                  setSelectedSlot(pos);
                }
              }}
              className={`absolute z-20 flex flex-col items-center group cursor-pointer ${
                isMasterUser ? 'hover:scale-110 active:scale-95' : ''
              } transition-transform`}
            >
              {/* PLAYER AVATAR BADGE */}
              {assignedPlayer ? (
                <div className="relative">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#FFD700] via-[#D4AF37] to-black p-0.5 shadow-[0_0_15px_rgba(0,0,0,0.8)] relative overflow-hidden">
                    <div className="w-full h-full rounded-full bg-[#121212] flex items-center justify-center text-xs font-black text-[#FFD700] shadow-inner border border-[#FFD700]/50">
                      {assignedPlayer.avatar}
                    </div>
                  </div>

                  {/* Position Role Tag Badge */}
                  <div className="absolute -top-1 -right-1 bg-black text-[#FFD700] border border-[#FFD700]/60 text-[8px] font-mono font-black px-1.5 py-0.5 rounded-md shadow">
                    {pos.role}
                  </div>

                  {/* Master Edit Pencil Icon Indicator */}
                  {isMasterUser && (
                    <div className="absolute -bottom-1 -right-1 bg-[#D4AF37] text-black w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border border-black shadow opacity-0 group-hover:opacity-100 transition-opacity">
                      ✏️
                    </div>
                  )}
                </div>
              ) : (
                /* UNASSIGNED POSITION SLOT MARKER */
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-dashed border-[#FFD700]/70 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-center shadow-lg group-hover:border-[#FFD700] group-hover:bg-[#FFD700]/20 transition-all">
                  <Plus className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span className="text-[8px] font-mono font-bold text-white/90 leading-tight">
                    {pos.role}
                  </span>
                </div>
              )}

              {/* PLAYER NAME / POSITION PILL */}
              <div className="mt-1 px-2 py-0.5 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg text-center shadow-md max-w-[90px] truncate">
                <p className="text-[10px] font-black text-white truncate leading-tight">
                  {assignedPlayer ? assignedPlayer.name : pos.label}
                </p>
                {assignedPlayer && (
                  <p className="text-[8px] font-mono text-[#FFD700] leading-none font-bold">
                    ⚽ {assignedPlayer.goals}G • {pos.role}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* BOTTOM TACTICAL BALL DECORATION */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/80 px-2.5 py-0.5 rounded-full border border-white/10 text-[9px] font-mono text-white/60">
          <span>THE PHARAOHS FC STADIUM</span>
        </div>
      </div>

      {/* TACTICAL NOTES & INSTRUCTIONS INPUT */}
      <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-white flex items-center gap-2 font-mono">
            <Zap className="w-4 h-4 text-[#FFD700]" />
            <span>{t.tacticalNotes} ({condStyle.badgeText})</span>
          </label>
          <span className="text-[9px] font-mono text-white/40 uppercase">
            {isMasterUser ? 'Editable by Master' : 'Read Only'}
          </span>
        </div>

        <textarea
          value={tacticalNotes}
          onChange={(e) => setTacticalNotes(e.target.value)}
          disabled={!isMasterUser}
          placeholder={t.tacticalNotesPlaceholder}
          rows={3}
          className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37] disabled:opacity-75 resize-none leading-relaxed"
        />

        {/* SAVE & SYNC BUTTON (Master Ali Hossam Only) */}
        {isMasterUser && (
          <button
            type="button"
            onClick={handleSaveTactics}
            disabled={isSaving}
            className={`w-full py-3 text-xs font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg font-mono ${
              saveSuccess 
                ? 'bg-green-500 text-black border border-green-400' 
                : 'bg-[#D4AF37] hover:bg-[#c2a030] text-black'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.tacticsSavedSuccess}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t.saveTactics} ({condStyle.badgeText})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* PLAYER ASSIGNMENT MODAL (Master Ali Hossam Click on Pitch Slot) */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedSlot(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#121212] border border-[#D4AF37]/50 rounded-3xl p-5 max-w-md w-full shadow-[0_10px_40px_rgba(0,0,0,0.9)] space-y-4 relative overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <span className="text-[9px] font-mono font-bold text-[#FFD700] uppercase tracking-wider bg-[#FFD700]/10 px-2 py-0.5 rounded-md border border-[#FFD700]/30">
                    POSITION: {selectedSlot.role}
                  </span>
                  <h4 className="text-base font-extrabold text-white mt-1">
                    Select Player for {selectedSlot.label}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* UNASSIGN OPTION BUTTON */}
              {selectedSlot.playerId && (
                <button
                  type="button"
                  onClick={() => handleAssignPlayer(selectedSlot.id, null)}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove Player from {selectedSlot.role}</span>
                </button>
              )}

              {/* SQUAD PLAYERS LIST */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                {players.map(player => {
                  const isAlreadyAssignedInOtherSlot = positions.some(p => p.playerId === player.id && p.id !== selectedSlot.id);
                  const isCurrentlyAssignedHere = selectedSlot.playerId === player.id;

                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handleAssignPlayer(selectedSlot.id, player.id)}
                      className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isCurrentlyAssignedHere 
                          ? 'bg-[#FFD700]/20 border-[#FFD700] text-white shadow-md' 
                          : 'bg-white/5 border-white/10 hover:border-[#D4AF37]/50 text-white/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4AF37] text-black font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {player.avatar}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1">
                            <span>{player.name}</span>
                            {isAlreadyAssignedInOtherSlot && (
                              <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.2 rounded font-mono">
                                Placed elsewhere
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-white/40 font-mono">
                            @{player.username} • {player.position.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <span className="text-xs font-extrabold text-[#FFD700] block">
                          ⚽ {player.goals} Goals
                        </span>
                        <span className="text-[9px] text-white/40">
                          🅰️ {player.assists} Assists
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
