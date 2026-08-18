import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import teamLogo from './assets/images/pharaohs_fc_logo_1786236242642.jpg';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  handleFirestoreError, 
  OperationType,
  auth,
  googleProvider,
  signInWithPopup,
  firebaseSignOut
} from './lib/firebase';
import { 
  Trophy, 
  Users, 
  Calendar, 
  BarChart3, 
  LogIn, 
  LogOut, 
  PlusCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight,
  Flame,
  Award,
  Zap,
  RefreshCw,
  Search,
  UserCheck,
  MessageCircle,
  ExternalLink,
  Globe,
  Trash2,
  Eye,
  EyeOff,
  Film,
  Sparkles,
  TrendingUp,
  Activity,
  Crown,
  Star,
  Download,
  UploadCloud,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Maximize2,
  X,
  Clock,
  MapPin,
  Timer
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { translations, Language } from './translations';
import { IntroAnimation } from './components/IntroAnimation';
import { PromoVideoPlayer } from './components/PromoVideoPlayer';
import { TeamTasksSection } from './components/TeamTasksSection';
import { FcMobileCardsSection } from './components/FcMobileCardsSection';
import { TacticalBoard } from './components/TacticalBoard';
import { MatchCountdownWidget } from './components/MatchCountdownWidget';
import { IndividualAwardsSection } from './components/IndividualAwardsSection';
import { TotalGoalsSummaryCard } from './components/TotalGoalsSummaryCard';
import { AnimatedCounter } from './components/AnimatedCounter';
import { PlayerComparisonSection } from './components/PlayerComparisonSection';
import { exportMatchReportPdf } from './utils/exportMatchPdf';

export interface Player {
  id: string;
  name: string;
  username: string;
  position?: string;
  goals: number;
  assists: number;
  matchesPlayed: number;
  avatar: string;
}

interface MatchRecord {
  id: string;
  date: string;
  opponent: string;
  result: 'W' | 'D' | 'L';
  teamGoals: number;
  opponentGoals: number;
  scorers: { playerId: string; goals: number }[];
  assisters: { playerId: string; assists: number }[];
  mvpPlayerId?: string;
  playerRatings?: { playerId: string; rating: number }[];
  notes?: string;
}

export interface UpcomingMatch {
  id: string;
  opponent: string;
  date: string;
  time?: string;
  location?: string;
  competition?: string;
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

function getPlayerAverageRating(playerId: string, matches: MatchRecord[]): number | null {
  const ratings: number[] = [];
  matches.forEach(m => {
    if (m.playerRatings && Array.isArray(m.playerRatings)) {
      const found = m.playerRatings.find(r => r.playerId === playerId);
      if (found && typeof found.rating === 'number' && found.rating > 0) {
        ratings.push(found.rating);
      }
    }
  });
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Number((sum / ratings.length).toFixed(1));
}

function formatMatchDate(dateStr: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const d = new Date(year, month - 1, day);
  const currentYear = new Date().getFullYear();
  if (year !== currentYear) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const BUILTIN_ACCOUNTS = [
  { username: 'ali hossam', pass: 'AH24112013', name: 'Ali Hossam', pos: 'Forward', initialGoals: 0, initialAssists: 0 },
  { username: 'yassen amr', pass: '12345678', name: 'Yassen Amr', pos: 'Midfielder', initialGoals: 0, initialAssists: 0 },
  { username: 'sief ahmed', pass: '123456789', name: 'Sief Ahmed', pos: 'Winger', initialGoals: 0, initialAssists: 0 },
  { username: 'ali mohamed', pass: '12345678910', name: 'Ali Mohamed', pos: 'Midfielder', initialGoals: 0, initialAssists: 0 },
  { username: 'ahmed hossam', pass: 'ahmedhossam', name: 'Ahmed Hossam', pos: 'Defender', initialGoals: 0, initialAssists: 0 },
  { username: 'yaseen', pass: 'yaseen12345678', name: 'Yaseen', pos: 'Forward', initialGoals: 0, initialAssists: 0 },
  { username: 'youssef', pass: 'youssef123456', name: 'Youssef', pos: 'Midfielder', initialGoals: 0, initialAssists: 0 },
  { username: 'adam', pass: 'adam123456', name: 'Adam', pos: 'Defender', initialGoals: 0, initialAssists: 0 },
  { username: 'ziad', pass: 'ziad123456', name: 'Ziad', pos: 'Midfielder', initialGoals: 0, initialAssists: 0 },
];

const MASTER_USERNAME = 'ali hossam';

function removeUndefinedFields<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // Ignore iframe storage quota or security errors
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    // Ignore
  }
}

function getSavedUser(): typeof BUILTIN_ACCOUNTS[0] | null {
  const saved = safeLocalStorageGet('fc_elite_current_user');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.username) {
        const found = BUILTIN_ACCOUNTS.find(
          a => a.username.toLowerCase() === parsed.username.toLowerCase()
        );
        if (found) return found;
        return parsed;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getGlobalPlayers(): Player[] {
  const saved = safeLocalStorageGet('fc_elite_global_players') || safeLocalStorageGet('fc_elite_players');
  let currentPlayers: Player[] = [];
  if (saved) {
    try { 
      const parsed: Player[] = JSON.parse(saved);
      currentPlayers = parsed.filter(p => 
        p.username !== 'aser' && 
        p.name?.toLowerCase() !== 'aser'
      );
    } catch (e) { /* fallback */ }
  }

  if (currentPlayers.length === 0) {
    currentPlayers = BUILTIN_ACCOUNTS.map((acc, idx) => ({
      id: `p-${idx + 1}`,
      name: acc.name,
      username: acc.username,
      position: acc.pos,
      goals: acc.initialGoals,
      assists: acc.initialAssists,
      matchesPlayed: 0,
      avatar: acc.name.split(' ').map(n => n[0]).join('').toUpperCase()
    }));
  } else {
    // Ensure built-in accounts are restored if missing
    BUILTIN_ACCOUNTS.forEach((acc, idx) => {
      const exists = currentPlayers.some(p => 
        p.username.toLowerCase() === acc.username.toLowerCase() || 
        p.name.toLowerCase() === acc.name.toLowerCase()
      );
      if (!exists) {
        currentPlayers.push({
          id: `p-${idx + 1}`,
          name: acc.name,
          username: acc.username,
          position: acc.pos,
          goals: acc.initialGoals,
          assists: acc.initialAssists,
          matchesPlayed: 0,
          avatar: acc.name.split(' ').map(n => n[0]).join('').toUpperCase()
        });
      }
    });
  }

  return currentPlayers;
}

function getGlobalMatches(): MatchRecord[] {
  const saved = safeLocalStorageGet('fc_elite_global_matches') || safeLocalStorageGet('fc_elite_matches');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { /* fallback */ }
  }
  return [];
}

function getGlobalUpcomingMatches(): UpcomingMatch[] {
  const saved = safeLocalStorageGet('fc_elite_upcoming_matches');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { /* fallback */ }
  }
  return [];
}

function getCountdownString(dateStr: string, timeStr?: string, lang: Language = 'ar'): string {
  try {
    const matchTime = new Date(`${dateStr}T${timeStr || '00:00'}`);
    const now = new Date();
    const diffMs = matchTime.getTime() - now.getTime();
    
    if (diffMs < 0) {
      const isToday = now.toISOString().split('T')[0] === dateStr;
      if (isToday) return lang === 'ar' ? 'اليوم!' : 'Today!';
      return lang === 'ar' ? 'مكتملة' : 'Completed';
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays === 0) {
      if (diffHours === 0) return lang === 'ar' ? 'قريباً جداً!' : 'Starting Soon!';
      return lang === 'ar' ? `خلال ${diffHours} ساعة` : `In ${diffHours} hrs`;
    }
    if (diffDays === 1) return lang === 'ar' ? 'غداً!' : 'Tomorrow!';
    return lang === 'ar' ? `بعد ${diffDays} يوم` : `In ${diffDays} days`;
  } catch (e) {
    return dateStr;
  }
}

export function computePlayerStats(basePlayers: Player[], matchesList: MatchRecord[]): Player[] {
  if (!basePlayers || !Array.isArray(basePlayers)) return [];

  return basePlayers.map(p => {
    let goalsFromMatches = 0;
    let assistsFromMatches = 0;
    let matchesCount = 0;

    if (Array.isArray(matchesList)) {
      matchesList.forEach(m => {
        // Count goals scored in this match
        if (m.scorers && Array.isArray(m.scorers)) {
          m.scorers.forEach(s => {
            if (
              s.playerId && (
                s.playerId === p.id ||
                s.playerId.toLowerCase() === p.name.toLowerCase() ||
                s.playerId.toLowerCase() === p.username.toLowerCase()
              )
            ) {
              const g = typeof s.goals === 'number' ? s.goals : (parseInt(String(s.goals), 10) || 1);
              goalsFromMatches += g;
            }
          });
        }

        // Count assists recorded in this match
        if (m.assisters && Array.isArray(m.assisters)) {
          m.assisters.forEach(a => {
            if (
              a.playerId && (
                a.playerId === p.id ||
                a.playerId.toLowerCase() === p.name.toLowerCase() ||
                a.playerId.toLowerCase() === p.username.toLowerCase()
              )
            ) {
              const ast = typeof a.assists === 'number' ? a.assists : (parseInt(String(a.assists), 10) || 1);
              assistsFromMatches += ast;
            }
          });
        }

        // Check player match participation
        const scoredInMatch = (m.scorers || []).some(s => 
          s.playerId === p.id || 
          s.playerId?.toLowerCase() === p.name.toLowerCase() || 
          s.playerId?.toLowerCase() === p.username.toLowerCase()
        );
        const assistedInMatch = (m.assisters || []).some(a => 
          a.playerId === p.id || 
          a.playerId?.toLowerCase() === p.name.toLowerCase() || 
          a.playerId?.toLowerCase() === p.username.toLowerCase()
        );
        const mvpInMatch = m.mvpPlayerId === p.id || 
          m.mvpPlayerId?.toLowerCase() === p.name.toLowerCase() || 
          m.mvpPlayerId?.toLowerCase() === p.username.toLowerCase();
        const ratedInMatch = (m.playerRatings || []).some(r => 
          r.playerId === p.id || 
          r.playerId?.toLowerCase() === p.name.toLowerCase() || 
          r.playerId?.toLowerCase() === p.username.toLowerCase()
        );

        if (scoredInMatch || assistedInMatch || mvpInMatch || ratedInMatch) {
          matchesCount++;
        } else if (!m.playerRatings || m.playerRatings.length === 0) {
          matchesCount++;
        }
      });
    }

    return {
      ...p,
      goals: goalsFromMatches,
      assists: assistsFromMatches,
      matchesPlayed: matchesCount
    };
  });
}

function getUserPlayers(username: string): Player[] {
  const key = `fc_elite_user_${username.toLowerCase().replace(/\s+/g, '_')}_players`;
  const saved = safeLocalStorageGet(key);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { /* fallback */ }
  }
  return getGlobalPlayers();
}

function getUserMatches(username: string): MatchRecord[] {
  const key = `fc_elite_user_${username.toLowerCase().replace(/\s+/g, '_')}_matches`;
  const saved = safeLocalStorageGet(key);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { /* fallback */ }
  }
  return getGlobalMatches();
}

const CustomTooltip = ({ active, payload, t }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0C0C0C] border border-[#D4AF37]/50 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[180px] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
          <span className="font-bold text-white truncate max-w-[120px]">{data.opponent}</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
            data.result === 'W' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            data.result === 'D' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {data.result === 'W' ? t.win : data.result === 'D' ? t.draw : t.loss} ({data.teamGoals}-{data.opponentGoals})
          </span>
        </div>
        <div className="text-[10px] text-white/50 flex justify-between font-mono">
          <span>{data.date}</span>
          <span className="text-[#D4AF37] font-bold">#{data.matchNum}</span>
        </div>
        <div className="text-[11px] font-mono space-y-0.5 pt-1">
          <div className="flex justify-between text-[#D4AF37]">
            <span>{t.points}:</span>
            <span className="font-bold">+{data.resultPts} (Total: {data.cumulativePts})</span>
          </div>
          <div className="flex justify-between text-green-400">
            <span>{t.goalsFor}:</span>
            <span className="font-bold">+{data.teamGoals}</span>
          </div>
          {data.cumulativeTeamGoals !== undefined && (
            <div className="flex justify-between text-emerald-300 font-bold border-t border-white/5 pt-0.5">
              <span>{t.cumulativeGoalsScored || "Cumulative Goals"}:</span>
              <span>{data.cumulativeTeamGoals}</span>
            </div>
          )}
          <div className="flex justify-between text-red-400">
            <span>{t.goalsAgainst}:</span>
            <span className="font-bold">+{data.opponentGoals}</span>
          </div>
          {data.cumulativeOppGoals !== undefined && (
            <div className="flex justify-between text-red-300 text-[10px]">
              <span>{t.cumulativeGoalsConceded || "Cumul. Conceded"}:</span>
              <span>{data.cumulativeOppGoals}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const WinRateTooltip = ({ active, payload, t }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0C0C0C] border border-[#FFD700]/50 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[190px] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
          <span className="font-bold text-white truncate max-w-[120px]">vs {data.opponent}</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
            data.result === 'W' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            data.result === 'D' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {data.result === 'W' ? t.win : data.result === 'D' ? t.draw : t.loss} ({data.teamGoals}-{data.opponentGoals})
          </span>
        </div>
        <div className="text-[10px] text-white/50 flex justify-between font-mono">
          <span>{data.date}</span>
          <span className="text-[#FFD700] font-bold">Match #{data.matchNum}</span>
        </div>
        <div className="text-[11px] font-mono space-y-1 pt-1">
          <div className="flex justify-between text-[#FFD700] font-black">
            <span>{t.winRatePercentage || "Win Rate %"}:</span>
            <span className="text-sm">{data.winRate}%</span>
          </div>
          <div className="flex justify-between text-emerald-400 text-[10px]">
            <span>{t.winsCount || "Wins"} / Total:</span>
            <span>{data.cumulativeWins} / {data.cumulativeMatches}</span>
          </div>
          {data.rollingWinRate !== undefined && (
            <div className="flex justify-between text-amber-300 text-[10px] border-t border-white/5 pt-0.5">
              <span>{t.rollingWinRate5 || "5-Match Rolling Rate"}:</span>
              <span>{data.rollingWinRate}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};



const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/CTQK9jgbJxPAoAG3HwoPeu";

export default function App() {
  // Intro Animation State
  const [showIntro, setShowIntro] = useState<boolean>(true);

  // Language State (Defaults to Arabic 'ar')
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('fc_elite_lang') as Language) || 'ar');
  const t = translations[lang];

  // Helper for position translations
  const getPosLabel = (pos: string) => {
    if (lang !== 'ar') return pos;
    const p = pos.toLowerCase();
    if (p.includes('forward')) return t.forward;
    if (p.includes('midfield')) return t.midfielder;
    if (p.includes('winger')) return t.winger;
    if (p.includes('defend')) return t.defender;
    if (p.includes('goalkeep') || p.includes('gk')) return t.goalkeeper;
    return pos;
  };

  // Navigation
  const [activeTab, setActiveTab] = useState<'HOME' | 'STATS' | 'MATCH' | 'TASKS' | 'TEAM' | 'CARDS' | 'TACTICS' | 'AWARDS' | 'JOIN'>('HOME');

  // Auth State
  const [currentUser, setCurrentUser] = useState<typeof BUILTIN_ACCOUNTS[0] | null>(getSavedUser);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const handleUserLogin = (account: typeof BUILTIN_ACCOUNTS[0]) => {
    setCurrentUser(account);
    safeLocalStorageSet('fc_elite_current_user', JSON.stringify(account));
    setViewScope('OFFICIAL');
    setLoginError('');
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    safeLocalStorageRemove('fc_elite_current_user');
  };

  // Data Scope View (For non-master users: 'OFFICIAL' vs 'PERSONAL')
  const [viewScope, setViewScope] = useState<'OFFICIAL' | 'PERSONAL'>('OFFICIAL');

  const isMasterUser = Boolean(
    currentUser && (
      currentUser.username.toLowerCase() === MASTER_USERNAME ||
      currentUser.username.toLowerCase().includes('ali') ||
      currentUser.name.toLowerCase().includes('ali')
    )
  );

  // App Data & Stats
  const [players, setPlayers] = useState<Player[]>(getGlobalPlayers);
  const [matches, setMatches] = useState<MatchRecord[]>(getGlobalMatches);
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>(getGlobalUpcomingMatches);

  // Upcoming Matches Form State (Ali Hossam Exclusive)
  const [upcomingOpponent, setUpcomingOpponent] = useState('');
  const [upcomingDate, setUpcomingDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [upcomingTime, setUpcomingTime] = useState('18:00');
  const [upcomingLocation, setUpcomingLocation] = useState('');
  const [upcomingCompetition, setUpcomingCompetition] = useState('Friendly Match');
  const [upcomingNotes, setUpcomingNotes] = useState('');
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);

  // Real-time Firestore Sync across all devices
  useEffect(() => {
    // Subscribe to Players
    const unsubPlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      if (!snapshot.empty) {
        const docsData: Player[] = [];
        snapshot.forEach(d => {
          const p = d.data() as Player;
          const isDeletedAccount = 
            p.username === 'aser' || 
            p.name?.toLowerCase() === 'aser';

          if (isDeletedAccount) {
            deleteDoc(doc(db, 'players', d.id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `players/${d.id}`));
          } else {
            docsData.push(p);
          }
        });

        // Restore missing built-in accounts (e.g., ahmed, adam) in Firestore & state
        BUILTIN_ACCOUNTS.forEach((acc, idx) => {
          const exists = docsData.some(p => 
            p.username.toLowerCase() === acc.username.toLowerCase() || 
            p.name.toLowerCase() === acc.name.toLowerCase()
          );
          if (!exists) {
            const restoredPlayer: Player = {
              id: `p-${idx + 1}`,
              name: acc.name,
              username: acc.username,
              position: acc.pos,
              goals: acc.initialGoals,
              assists: acc.initialAssists,
              matchesPlayed: 0,
              avatar: acc.name.split(' ').map(n => n[0]).join('').toUpperCase()
            };
            docsData.push(restoredPlayer);
            setDoc(doc(db, 'players', restoredPlayer.id), removeUndefinedFields(restoredPlayer)).catch(err => handleFirestoreError(err, OperationType.WRITE, `players/${restoredPlayer.id}`));
          }
        });

        docsData.sort((a, b) => {
          const numA = parseInt(a.id.replace('p-', '')) || 0;
          const numB = parseInt(b.id.replace('p-', '')) || 0;
          return numA - numB;
        });
        localStorage.setItem('fc_elite_global_players', JSON.stringify(docsData));
        localStorage.setItem('fc_elite_players', JSON.stringify(docsData));
        setPlayers(docsData);
      } else {
        // Seed initial players to Firestore if empty
        const initial = BUILTIN_ACCOUNTS.map((acc, idx) => ({
          id: `p-${idx + 1}`,
          name: acc.name,
          username: acc.username,
          position: acc.pos,
          goals: acc.initialGoals,
          assists: acc.initialAssists,
          matchesPlayed: 0,
          avatar: acc.name.split(' ').map(n => n[0]).join('').toUpperCase()
        }));
        initial.forEach(p => {
          setDoc(doc(db, 'players', p.id), removeUndefinedFields(p)).catch(err => handleFirestoreError(err, OperationType.WRITE, `players/${p.id}`));
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'players');
    });

    // Subscribe to Matches
    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      if (!snapshot.empty) {
        const matchDocs: MatchRecord[] = [];
        snapshot.forEach(d => {
          matchDocs.push(d.data() as MatchRecord);
        });
        matchDocs.sort((a, b) => Number(b.id) - Number(a.id));
        localStorage.setItem('fc_elite_global_matches', JSON.stringify(matchDocs));
        localStorage.setItem('fc_elite_matches', JSON.stringify(matchDocs));
        setMatches(matchDocs);
      } else {
        localStorage.setItem('fc_elite_global_matches', JSON.stringify([]));
        setMatches([]);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'matches');
    });

    // Subscribe to Upcoming Matches (Global real-time sync)
    const unsubUpcoming = onSnapshot(collection(db, 'upcoming_matches'), (snapshot) => {
      if (!snapshot.empty) {
        const docs: UpcomingMatch[] = [];
        snapshot.forEach(d => {
          docs.push(d.data() as UpcomingMatch);
        });
        docs.sort((a, b) => {
          const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
          const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
          return timeA - timeB;
        });
        localStorage.setItem('fc_elite_upcoming_matches', JSON.stringify(docs));
        setUpcomingMatches(docs);
      } else {
        localStorage.setItem('fc_elite_upcoming_matches', JSON.stringify([]));
        setUpcomingMatches([]);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'upcoming_matches');
    });

    return () => {
      unsubPlayers();
      unsubMatches();
      unsubUpcoming();
    };
  }, []);

  // New Match Form State
  const [matchDate, setMatchDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [opponent, setOpponent] = useState('');
  const [teamGoals, setTeamGoals] = useState('0');
  const [opponentGoals, setOpponentGoals] = useState('0');
  const [matchResult, setMatchResult] = useState<'W' | 'D' | 'L'>('W');
  const [selectedScorers, setSelectedScorers] = useState<{ playerId: string; goals: number }[]>([
    { playerId: '', goals: 1 }
  ]);
  const [selectedAssisters, setSelectedAssisters] = useState<{ playerId: string; assists: number }[]>([
    { playerId: '', assists: 1 }
  ]);
  const [mvpPlayerId, setMvpPlayerId] = useState('');
  const [matchNotes, setMatchNotes] = useState('');
  const [playerRatingsInput, setPlayerRatingsInput] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<MatchRecord | null>(null);

  // Notification Banner for freshly added matches
  const [newMatchAlert, setNewMatchAlert] = useState<{ match: MatchRecord; mvpPlayer: Player | null } | null>(null);
  const [syncStatusToast, setSyncStatusToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const jsonFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const csvFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Chart Mode for Stats View
  const [chartType, setChartType] = useState<'TREND' | 'BAR' | 'AREA' | 'CUMULATIVE_GOALS'>('TREND');

  // Dynamically calculate actual goals & assists from match history for complete precision
  const effectivePlayers = React.useMemo(() => {
    return computePlayerStats(players, matches);
  }, [players, matches]);

  // Derived Totals
  const totalGoals = React.useMemo(() => {
    const goalsFromMatches = matches.reduce((sum, m) => sum + (m.teamGoals || 0), 0);
    const goalsFromScorers = effectivePlayers.reduce((sum, p) => sum + p.goals, 0);
    return Math.max(goalsFromMatches, goalsFromScorers);
  }, [matches, effectivePlayers]);

  const totalAssists = React.useMemo(() => {
    return effectivePlayers.reduce((sum, p) => sum + p.assists, 0);
  }, [effectivePlayers]);
  
  const wins = matches.filter(m => m.result === 'W').length;
  const draws = matches.filter(m => m.result === 'D').length;
  const losses = matches.filter(m => m.result === 'L').length;

  let currentWinStreak = 0;
  for (const m of matches) {
    if (m.result === 'W') {
      currentWinStreak++;
    } else {
      break;
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const found = BUILTIN_ACCOUNTS.find(
      a => a.username.toLowerCase() === loginUsername.trim().toLowerCase() && a.pass === loginPassword
    );
    if (found) {
      handleUserLogin(found);
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError(t.invalidCreds || 'Invalid username or password credentials');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoginError('');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email || '';
      const name = user.displayName || user.email?.split('@')[0] || 'Pharaohs Player';
      const cleanUsername = (user.email?.split('@')[0] || name).toLowerCase().replace(/[^a-z0-9]/g, '_');

      // Check if user is Captain Ali Hossam
      const isAli = email.toLowerCase() === 'alihossama2013@gmail.com' ||
        email.toLowerCase().includes('alihossam') ||
        name.toLowerCase().includes('ali');

      if (isAli) {
        // Log in as Master Creator Ali Hossam
        const masterAcc = BUILTIN_ACCOUNTS[0];
        handleUserLogin(masterAcc);
        setSyncStatusToast({ message: lang === 'ar' ? 'مرحباً كابتن علي حسام (المسؤول الأول)' : 'Welcome Captain Ali Hossam (Master Admin)' });
        setTimeout(() => setSyncStatusToast(null), 3500);
        return;
      }

      // Check if user matches any built-in squad account
      const matchedBuiltin = BUILTIN_ACCOUNTS.find(acc =>
        acc.username.toLowerCase() === cleanUsername ||
        name.toLowerCase().includes(acc.name.toLowerCase()) ||
        acc.name.toLowerCase().includes(name.toLowerCase())
      );

      if (matchedBuiltin) {
        handleUserLogin(matchedBuiltin);
        setSyncStatusToast({ message: `${lang === 'ar' ? 'تم تسجيل الدخول:' : 'Logged in:'} ${matchedBuiltin.name}` });
        setTimeout(() => setSyncStatusToast(null), 3500);
        return;
      }

      // Generic authenticated team member account with global real-time sync access
      const customGoogleAccount = {
        name,
        username: cleanUsername,
        pass: 'google_oauth_auth',
        pos: 'Player / Supporter',
        initialGoals: 0,
        initialAssists: 0
      };

      handleUserLogin(customGoogleAccount);
      setSyncStatusToast({ message: `${lang === 'ar' ? 'تم تسجيل الدخول بحساب Google:' : 'Signed in with Google:'} ${name}` });
      setTimeout(() => setSyncStatusToast(null), 3500);
    } catch (err: any) {
      console.warn('Google Sign-In notice:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setLoginError(err?.message || (lang === 'ar' ? 'تعذر تسجيل الدخول بواسطة Google' : 'Could not sign in with Google'));
      }
    }
  };

  const handleQuickLogin = (account: typeof BUILTIN_ACCOUNTS[0]) => {
    handleUserLogin(account);
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent.trim() || !currentUser || !isMasterUser) return;

    const tg = parseInt(teamGoals, 10) || 0;
    const og = parseInt(opponentGoals, 10) || 0;

    // Filter valid entries and aggregate goals/assists per player
    const validScorers = selectedScorers.filter(s => s.playerId !== '');
    const validAssisters = selectedAssisters.filter(a => a.playerId !== '');

    const scorerGoalCounts: Record<string, number> = {};
    validScorers.forEach(s => {
      scorerGoalCounts[s.playerId] = (scorerGoalCounts[s.playerId] || 0) + (s.goals || 1);
    });

    const assisterCounts: Record<string, number> = {};
    validAssisters.forEach(a => {
      assisterCounts[a.playerId] = (assisterCounts[a.playerId] || 0) + (a.assists || 1);
    });

    const ratingsArray: { playerId: string; rating: number }[] = Object.entries(playerRatingsInput)
      .filter(([_, rating]) => typeof rating === 'number' && rating > 0)
      .map(([playerId, rating]) => ({ playerId, rating: Number(rating) }));

    const newMatch: MatchRecord = {
      id: Date.now().toString(),
      date: formatMatchDate(matchDate),
      opponent,
      result: matchResult,
      teamGoals: tg,
      opponentGoals: og,
      scorers: Object.entries(scorerGoalCounts).map(([playerId, goals]) => ({ playerId, goals })),
      assisters: Object.entries(assisterCounts).map(([playerId, assists]) => ({ playerId, assists })),
      ...(mvpPlayerId ? { mvpPlayerId } : {}),
      ...(ratingsArray.length > 0 ? { playerRatings: ratingsArray } : {}),
      ...(matchNotes.trim() ? { notes: matchNotes.trim() } : {})
    };

    // SAVE GLOBALLY FOR ALL ACCOUNTS TO FIRESTORE
    const currentGlobalMatches = matches;
    const updatedMatches = [newMatch, ...currentGlobalMatches];
    const updatedPlayers = computePlayerStats(players, updatedMatches);

    try {
      // Write new match document to Firestore
      await setDoc(doc(db, 'matches', newMatch.id), removeUndefinedFields(newMatch));

      // Write updated players to Firestore
      await Promise.all(
        updatedPlayers.map(p => setDoc(doc(db, 'players', p.id), removeUndefinedFields(p)))
      );

      setSyncStatusToast({ message: lang === 'ar' ? 'تم تسجيل وحفظ المباراة ومزامنتها عالمياً مع جميع الحسابات!' : 'Match logged and synced globally to all accounts!' });
      setTimeout(() => setSyncStatusToast(null), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `matches/${newMatch.id}`);
    }

    localStorage.setItem('fc_elite_global_players', JSON.stringify(updatedPlayers));
    localStorage.setItem('fc_elite_global_matches', JSON.stringify(updatedMatches));
    localStorage.setItem('fc_elite_players', JSON.stringify(updatedPlayers));
    localStorage.setItem('fc_elite_matches', JSON.stringify(updatedMatches));

    setPlayers(updatedPlayers);
    setMatches(updatedMatches);

    // Trigger New Match & Selected MVP Alert Notification
    const mvpObj = mvpPlayerId ? players.find(p => p.id === mvpPlayerId) || null : null;
    setNewMatchAlert({ match: newMatch, mvpPlayer: mvpObj });

    // Reset Form
    setOpponent('');
    setTeamGoals('0');
    setOpponentGoals('0');
    setSelectedScorers([{ playerId: '', goals: 1 }]);
    setSelectedAssisters([{ playerId: '', assists: 1 }]);
    setMvpPlayerId('');
    setPlayerRatingsInput({});
    setMatchNotes('');
    setMatchDate(new Date().toISOString().split('T')[0]);
    setActiveTab('HOME');
  };

  const handleAddUpcomingMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upcomingOpponent.trim() || !currentUser || !isMasterUser) return;

    const newUpcoming: UpcomingMatch = {
      id: Date.now().toString(),
      opponent: upcomingOpponent.trim(),
      date: upcomingDate || new Date().toISOString().split('T')[0],
      time: upcomingTime || '18:00',
      location: upcomingLocation.trim() || 'Home Pitch',
      competition: upcomingCompetition.trim() || 'Friendly Match',
      notes: upcomingNotes.trim(),
      createdBy: currentUser.name || MASTER_USERNAME,
      createdAt: new Date().toISOString()
    };

    const updated = [...upcomingMatches, newUpcoming].sort((a, b) => {
      const tA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const tB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return tA - tB;
    });

    try {
      await setDoc(doc(db, 'upcoming_matches', newUpcoming.id), removeUndefinedFields(newUpcoming));
      setSyncStatusToast({ message: lang === 'ar' ? 'تمت إضافة المباراة ومزامنتها عالمياً!' : 'Upcoming match scheduled and synced!' });
      setTimeout(() => setSyncStatusToast(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `upcoming_matches/${newUpcoming.id}`);
    }

    localStorage.setItem('fc_elite_upcoming_matches', JSON.stringify(updated));
    setUpcomingMatches(updated);

    // Reset Form
    setUpcomingOpponent('');
    const tomorrow = new Date(Date.now() + 86400000);
    setUpcomingDate(tomorrow.toISOString().split('T')[0]);
    setUpcomingTime('18:00');
    setUpcomingLocation('');
    setUpcomingCompetition('Friendly Match');
    setUpcomingNotes('');
    setShowUpcomingModal(false);
  };

  const handleDeleteUpcomingMatch = async (id: string) => {
    if (!currentUser || !isMasterUser) return;
    const updated = upcomingMatches.filter(m => m.id !== id);

    try {
      await deleteDoc(doc(db, 'upcoming_matches', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `upcoming_matches/${id}`);
    }

    localStorage.setItem('fc_elite_upcoming_matches', JSON.stringify(updated));
    setUpcomingMatches(updated);
  };

  const handleConvertUpcomingToMatch = (uMatch: UpcomingMatch) => {
    setOpponent(uMatch.opponent);
    setMatchDate(uMatch.date);
    setActiveTab('MATCH');
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const resetAllStats = async () => {
    if (confirm('Are you sure you want to reset TEAM stats for ALL accounts across all devices?')) {
      const reset = BUILTIN_ACCOUNTS.map((acc, idx) => ({
        id: `p-${idx + 1}`,
        name: acc.name,
        username: acc.username,
        position: acc.pos,
        goals: 0,
        assists: 0,
        matchesPlayed: 0,
        avatar: acc.name.split(' ').map(n => n[0]).join('').toUpperCase()
      }));

      try {
        // Reset Firestore players
        await Promise.all(reset.map(p => setDoc(doc(db, 'players', p.id), removeUndefinedFields(p))));

        // Delete Firestore matches
        await Promise.all(matches.map(m => deleteDoc(doc(db, 'matches', m.id))));

        setSyncStatusToast({ message: lang === 'ar' ? 'تمت إعادة ضبط جميع البيانات بنجاح ومزامنتها عالمياً' : 'All team stats reset and synced globally' });
        setTimeout(() => setSyncStatusToast(null), 3000);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'reset_all_stats');
      }

      localStorage.setItem('fc_elite_global_players', JSON.stringify(reset));
      localStorage.setItem('fc_elite_global_matches', JSON.stringify([]));
      localStorage.setItem('fc_elite_players', JSON.stringify(reset));
      localStorage.setItem('fc_elite_matches', JSON.stringify([]));
      setPlayers(reset);
      setMatches([]);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    const matchToDelete = matches.find(m => m.id === matchId);
    if (!matchToDelete) return;

    const updatedMatches = matches.filter(m => m.id !== matchId);
    const updatedPlayers = computePlayerStats(players, updatedMatches);

    try {
      await deleteDoc(doc(db, 'matches', matchId));
      await Promise.all(
        updatedPlayers.map(p => setDoc(doc(db, 'players', p.id), removeUndefinedFields(p)))
      );
      setSyncStatusToast({ message: lang === 'ar' ? 'تم حذف المباراة وتحديث الإحصائيات عالمياً' : 'Match deleted and stats updated globally' });
      setTimeout(() => setSyncStatusToast(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `matches/${matchId}`);
    }

    localStorage.setItem('fc_elite_global_players', JSON.stringify(updatedPlayers));
    localStorage.setItem('fc_elite_global_matches', JSON.stringify(updatedMatches));
    localStorage.setItem('fc_elite_players', JSON.stringify(updatedPlayers));
    localStorage.setItem('fc_elite_matches', JSON.stringify(updatedMatches));

    setPlayers(updatedPlayers);
    setMatches(updatedMatches);
  };

  const handleDeleteLastMatch = () => {
    if (matches.length > 0) {
      handleDeleteMatch(matches[0].id);
    }
  };

  const handleExportMatchesCSV = () => {
    if (matches.length === 0) return;

    const headers = [
      'Match ID',
      'Date',
      'Opponent',
      'Result',
      'The Pharaohs Goals',
      'Opponent Goals',
      'MVP',
      'Goal Scorers',
      'Assists',
      'Notes'
    ];

    const rows = matches.map(m => {
      const mvpPlayer = m.mvpPlayerId ? players.find(p => p.id === m.mvpPlayerId)?.name || '' : '';
      const scorers = (m.scorers || [])
        .map(s => {
          const p = players.find(player => player.id === s.playerId);
          return p ? `${p.name}${s.goals > 1 ? ` (${s.goals})` : ''}` : '';
        })
        .filter(Boolean)
        .join('; ');

      const assisters = (m.assisters || [])
        .map(a => {
          const p = players.find(player => player.id === a.playerId);
          return p ? `${p.name}${a.assists > 1 ? ` (${a.assists})` : ''}` : '';
        })
        .filter(Boolean)
        .join('; ');

      return [
        m.id,
        m.date,
        m.opponent,
        m.result,
        m.teamGoals,
        m.opponentGoals,
        mvpPlayer,
        scorers,
        assisters,
        m.notes || ''
      ];
    });

    const escapeCSVField = (field: any) => {
      const stringified = String(field ?? '');
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };

    const csvLines = [
      headers.map(escapeCSVField).join(','),
      ...rows.map(row => row.map(escapeCSVField).join(','))
    ];

    const csvContent = '\uFEFF' + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pharaohs_fc_match_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMatchesJSON = () => {
    if (matches.length === 0) return;

    const exportData = {
      team: "The Pharaohs FC",
      exportedAt: new Date().toISOString(),
      matchCount: matches.length,
      matches: matches.map(m => {
        const mvpPlayer = m.mvpPlayerId ? players.find(p => p.id === m.mvpPlayerId)?.name || '' : '';
        const scorersFormatted = (m.scorers || []).map(s => {
          const p = players.find(player => player.id === s.playerId);
          return { playerId: s.playerId, name: p?.name || '', goals: s.goals };
        });
        const assistersFormatted = (m.assisters || []).map(a => {
          const p = players.find(player => player.id === a.playerId);
          return { playerId: a.playerId, name: p?.name || '', assists: a.assists };
        });

        return {
          id: m.id,
          date: m.date,
          opponent: m.opponent,
          result: m.result,
          teamGoals: m.teamGoals,
          opponentGoals: m.opponentGoals,
          mvpPlayer: mvpPlayer,
          mvpPlayerId: m.mvpPlayerId,
          scorers: scorersFormatted,
          assisters: assistersFormatted,
          playerRatings: m.playerRatings || [],
          notes: m.notes || ''
        };
      })
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pharaohs_fc_match_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let importedMatches: MatchRecord[] = [];
      if (Array.isArray(data)) {
        importedMatches = data;
      } else if (data && Array.isArray(data.matches)) {
        importedMatches = data.matches;
      } else {
        throw new Error('Invalid JSON format');
      }

      // Format and clean match records
      const normalizedMatches: MatchRecord[] = importedMatches.map((m: any, idx: number) => ({
        id: String(m.id || Date.now() + idx),
        date: m.date || new Date().toISOString().split('T')[0],
        opponent: m.opponent || 'Opponent',
        result: (m.result === 'W' || m.result === 'D' || m.result === 'L') ? m.result : 'W',
        teamGoals: typeof m.teamGoals === 'number' ? m.teamGoals : (parseInt(m.teamGoals, 10) || 0),
        opponentGoals: typeof m.opponentGoals === 'number' ? m.opponentGoals : (parseInt(m.opponentGoals, 10) || 0),
        mvpPlayerId: m.mvpPlayerId || (m.mvpPlayer ? (players.find(p => p.name.toLowerCase() === String(m.mvpPlayer).toLowerCase())?.id || '') : ''),
        scorers: Array.isArray(m.scorers) ? m.scorers.map((s: any) => ({
          playerId: s.playerId || (players.find(p => p.name.toLowerCase() === String(s.name || s.playerName).toLowerCase())?.id || ''),
          goals: typeof s.goals === 'number' ? s.goals : (parseInt(s.goals, 10) || 1)
        })).filter((s: any) => Boolean(s.playerId)) : [],
        assisters: Array.isArray(m.assisters) ? m.assisters.map((a: any) => ({
          playerId: a.playerId || (players.find(p => p.name.toLowerCase() === String(a.name || a.playerName).toLowerCase())?.id || ''),
          assists: typeof a.assists === 'number' ? a.assists : (parseInt(a.assists, 10) || 1)
        })).filter((a: any) => Boolean(a.playerId)) : [],
        playerRatings: Array.isArray(m.playerRatings) ? m.playerRatings : [],
        notes: m.notes || ''
      }));

      // Merge with existing or replace
      const mergedMap = new Map<string, MatchRecord>();
      // Keep existing matches
      matches.forEach(m => mergedMap.set(m.id, m));
      // Overwrite/insert imported
      normalizedMatches.forEach(m => mergedMap.set(m.id, m));
      const combinedMatches = Array.from(mergedMap.values()).sort((a, b) => Number(b.id) - Number(a.id));

      // Push all matches directly to Firestore to sync globally with other devices
      for (const m of combinedMatches) {
        await setDoc(doc(db, 'matches', m.id), removeUndefinedFields(m));
      }

      // Recompute and push players stats to Firestore
      const updatedPlayers = computePlayerStats(players, combinedMatches);
      for (const p of updatedPlayers) {
        await setDoc(doc(db, 'players', p.id), removeUndefinedFields(p));
      }

      // Update local storage and React state
      localStorage.setItem('fc_elite_global_matches', JSON.stringify(combinedMatches));
      localStorage.setItem('fc_elite_matches', JSON.stringify(combinedMatches));
      localStorage.setItem('fc_elite_global_players', JSON.stringify(updatedPlayers));
      localStorage.setItem('fc_elite_players', JSON.stringify(updatedPlayers));

      setMatches(combinedMatches);
      setPlayers(updatedPlayers);
      setSyncStatusToast({ message: t.importSuccessMsg || 'Data imported and synced globally to all accounts!' });
      setTimeout(() => setSyncStatusToast(null), 4500);
    } catch (err) {
      console.error('Import error:', err);
      setSyncStatusToast({ message: t.importErrorMsg || 'Failed to parse import file.', isError: true });
      setTimeout(() => setSyncStatusToast(null), 4500);
    }

    if (e.target) e.target.value = '';
  };

  const handleImportCSVFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        throw new Error('CSV is empty or missing data rows');
      }

      // Helper to parse CSV line handling quoted fields
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let insideQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              insideQuotes = !insideQuotes;
            }
          } else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const rows = lines.slice(1);
      const parsedMatches: MatchRecord[] = [];

      rows.forEach((rowStr, idx) => {
        const cols = parseCSVLine(rowStr);
        if (cols.length < 5) return;

        const id = cols[0] && cols[0].length > 4 ? cols[0] : String(Date.now() + idx);
        const date = cols[1] || new Date().toISOString().split('T')[0];
        const opponent = cols[2] || 'Opponent';
        const rawRes = cols[3]?.toUpperCase();
        const result: 'W' | 'D' | 'L' = (rawRes === 'W' || rawRes === 'D' || rawRes === 'L') ? rawRes : 'W';
        const teamGoals = parseInt(cols[4], 10) || 0;
        const opponentGoals = parseInt(cols[5], 10) || 0;
        const mvpName = cols[6] || '';
        const mvpPlayerId = mvpName ? (players.find(p => p.name.toLowerCase() === mvpName.toLowerCase())?.id || '') : '';
        
        // Scorers format: "Player Name (2); Other Player"
        const scorersCol = cols[7] || '';
        const scorers: { playerId: string; goals: number }[] = [];
        if (scorersCol) {
          scorersCol.split(';').forEach(entry => {
            const trimmed = entry.trim();
            if (!trimmed) return;
            const matchCount = trimmed.match(/\((\d+)\)/);
            const count = matchCount ? parseInt(matchCount[1], 10) : 1;
            const cleanName = trimmed.replace(/\(\d+\)/, '').trim();
            const matchedPlayer = players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
            if (matchedPlayer) {
              scorers.push({ playerId: matchedPlayer.id, goals: count });
            }
          });
        }

        // Assisters format: "Player Name (1); Other Player"
        const assistersCol = cols[8] || '';
        const assisters: { playerId: string; assists: number }[] = [];
        if (assistersCol) {
          assistersCol.split(';').forEach(entry => {
            const trimmed = entry.trim();
            if (!trimmed) return;
            const matchCount = trimmed.match(/\((\d+)\)/);
            const count = matchCount ? parseInt(matchCount[1], 10) : 1;
            const cleanName = trimmed.replace(/\(\d+\)/, '').trim();
            const matchedPlayer = players.find(p => p.name.toLowerCase() === cleanName.toLowerCase());
            if (matchedPlayer) {
              assisters.push({ playerId: matchedPlayer.id, assists: count });
            }
          });
        }

        const notes = cols[9] || '';

        parsedMatches.push({
          id,
          date,
          opponent,
          result,
          teamGoals,
          opponentGoals,
          mvpPlayerId,
          scorers,
          assisters,
          notes
        });
      });

      if (parsedMatches.length === 0) {
        throw new Error('No valid matches found in CSV');
      }

      // Merge matches
      const mergedMap = new Map<string, MatchRecord>();
      matches.forEach(m => mergedMap.set(m.id, m));
      parsedMatches.forEach(m => mergedMap.set(m.id, m));
      const combined = Array.from(mergedMap.values()).sort((a, b) => Number(b.id) - Number(a.id));

      // Push all to Firestore cloud database
      for (const m of combined) {
        await setDoc(doc(db, 'matches', m.id), removeUndefinedFields(m));
      }

      const updatedPlayers = computePlayerStats(players, combined);
      for (const p of updatedPlayers) {
        await setDoc(doc(db, 'players', p.id), removeUndefinedFields(p));
      }

      localStorage.setItem('fc_elite_global_matches', JSON.stringify(combined));
      localStorage.setItem('fc_elite_matches', JSON.stringify(combined));
      localStorage.setItem('fc_elite_global_players', JSON.stringify(updatedPlayers));
      localStorage.setItem('fc_elite_players', JSON.stringify(updatedPlayers));

      setMatches(combined);
      setPlayers(updatedPlayers);
      setSyncStatusToast({ message: t.importSuccessMsg || 'Data imported and synced globally to all accounts!' });
      setTimeout(() => setSyncStatusToast(null), 4500);
    } catch (err) {
      console.error('CSV import error:', err);
      setSyncStatusToast({ message: t.importErrorMsg || 'Failed to parse CSV file.', isError: true });
      setTimeout(() => setSyncStatusToast(null), 4500);
    }

    if (e.target) e.target.value = '';
  };

  const sortedScorers = React.useMemo(() => {
    return [...effectivePlayers].sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  }, [effectivePlayers]);

  const activeUserPlayer = React.useMemo(() => {
    return effectivePlayers.find(p => p.username === currentUser?.username) || null;
  }, [effectivePlayers, currentUser]);

  return (
    <div className="w-full h-full bg-[#050505] text-white font-sans flex overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {showIntro && (
        <IntroAnimation lang={lang} onComplete={() => setShowIntro(false)} />
      )}
      
      {/* SIDEBAR PANEL (Matching Design HTML) */}
      <aside className="w-[320px] hidden md:flex border-r border-white/10 p-8 flex-col justify-between bg-[#080808] shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3.5">
            <img 
              src={teamLogo} 
              alt="The Pharaohs FC Crest" 
              referrerPolicy="no-referrer"
              className="w-14 h-14 object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]"
            />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[#D4AF37] leading-tight">{t.appTitle}</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5 font-mono">{t.appSubtitle}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Language Switcher in Sidebar */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-white/40 block mb-0.5 font-mono">{t.language}</span>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {lang === 'ar' ? 'العربية' : 'English'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = lang === 'ar' ? 'en' : 'ar';
                  setLang(next);
                  localStorage.setItem('fc_elite_lang', next);
                }}
                className="px-3 py-1 bg-[#D4AF37] hover:bg-[#c2a030] text-black font-extrabold text-xs rounded-lg transition-all"
              >
                {lang === 'ar' ? 'English' : 'العربية'}
              </button>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase text-white/40 block mb-1">{t.systemStatus}</span>
              <p className="text-sm font-medium text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                {t.authOnline}
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-xs text-white/60 leading-relaxed space-y-1">
              <p className="flex justify-between">
                <span>{t.registeredAccounts}:</span>
                <span className="text-white font-bold">{BUILTIN_ACCOUNTS.length}</span>
              </p>
              <p className="flex justify-between">
                <span>{t.database}:</span>
                <span className="text-white font-bold">{t.staticLocal}</span>
              </p>
              <p className="flex justify-between">
                <span>{t.matchHistory}:</span>
                <span className="text-[#D4AF37] font-bold">[{matches.length} {t.loggedMatches}]</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {currentUser && (
            <div className="space-y-2">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/40 uppercase">{t.loggedIn}</p>
                  <p className="text-xs font-bold text-[#D4AF37]">{currentUser.name}</p>
                </div>
                <button
                  onClick={handleUserLogout}
                  className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title={t.signOut}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={() => setActiveTab('HOME')}
                className="w-full py-3 bg-[#D4AF37] text-black text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-[#c2a030] transition-colors"
              >
                {t.launchApp}
              </button>
            </div>
          )}

          <button
            onClick={resetAllStats}
            className="w-full py-2 text-[10px] text-white/30 hover:text-red-400 transition-colors uppercase tracking-widest text-center block"
          >
            {t.resetTeamData}
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col bg-[#050505] items-center justify-center overflow-hidden h-full">
        
        {/* MAIN CONTENT CONTAINER (Optimized for 9:16 Aspect Ratio) */}
        <div className="relative w-full max-w-[440px] mx-auto h-full flex flex-col bg-[#111] overflow-hidden sm:border-x sm:border-white/10 sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)]">

          {/* Header */}
          <header className="py-2.5 sm:py-4 px-3 sm:px-6 flex justify-between items-center bg-[#111] z-10 shrink-0 border-b border-white/5">
            <button 
              onClick={() => setActiveTab('TEAM')}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center gap-1 border border-white/5 shrink-0"
              title={t.squadRosterTitle}
            >
              <div className="w-4 sm:w-5 h-0.5 bg-white"></div>
              <div className="w-4 sm:w-5 h-0.5 bg-white"></div>
              <div className="w-4 sm:w-5 h-0.5 bg-white"></div>
            </button>

            <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer" onClick={() => setActiveTab('HOME')}>
              <img 
                src={teamLogo} 
                alt="The Pharaohs FC Logo" 
                referrerPolicy="no-referrer"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]"
              />
              <div className="text-start">
                <p className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-widest font-mono">{t.appTitle}</p>
                <p className="text-xs font-bold text-white tracking-wide truncate max-w-[95px] sm:max-w-[160px]">
                  {currentUser ? currentUser.name.toUpperCase() : t.squadHub}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const next = lang === 'ar' ? 'en' : 'ar';
                  setLang(next);
                  localStorage.setItem('fc_elite_lang', next);
                }}
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all active:scale-95 shrink-0"
                title={lang === 'ar' ? 'English' : 'العربية'}
              >
                <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="font-mono text-[10px] font-bold uppercase">{lang === 'ar' ? 'EN' : 'عربي'}</span>
              </button>

              {currentUser && (
                <button
                  type="button"
                  onClick={handleUserLogout}
                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs rounded-xl flex items-center gap-1 transition-all active:scale-95 shrink-0"
                  title={t.logOut}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-mono tracking-wider hidden sm:inline">{t.logOut}</span>
                </button>
              )}
            </div>
          </header>

          {/* SCREEN CONTENT AREA */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6 scrollbar-thin">
            
            {/* NEW MATCH LOGGED TOAST NOTIFICATION ALERT */}
            <AnimatePresence>
              {newMatchAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="bg-gradient-to-r from-amber-950 via-black to-yellow-950 border-2 border-[#FFD700] p-4 rounded-2xl shadow-[0_0_30px_rgba(255,215,0,0.35)] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#FFD700] text-black font-extrabold flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-pulse">
                        <Trophy className="w-5 h-5 fill-black text-black" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-extrabold bg-[#FFD700] text-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {t.newMatchAlertTitle}
                          </span>
                          <span className="text-[10px] text-white/50 font-mono">{newMatchAlert.match.date}</span>
                        </div>
                        <h4 className="text-sm font-black text-white mt-1 flex items-center gap-2 flex-wrap">
                          <span>vs {newMatchAlert.match.opponent}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                            newMatchAlert.match.result === 'W' ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
                            newMatchAlert.match.result === 'D' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                            'bg-red-500/20 text-red-400 border border-red-500/40'
                          }`}>
                            {newMatchAlert.match.teamGoals} - {newMatchAlert.match.opponentGoals} ({newMatchAlert.match.result === 'W' ? t.win : newMatchAlert.match.result === 'D' ? t.draw : t.loss})
                          </span>
                        </h4>

                        {/* MVP Highlight Box in Toast */}
                        {newMatchAlert.mvpPlayer && (
                          <div className="mt-2.5 p-2.5 bg-black/70 border border-[#D4AF37]/80 rounded-xl flex items-center gap-2.5 shadow-md">
                            <div className="w-8 h-8 rounded-full bg-[#D4AF37] text-black font-black text-xs flex items-center justify-center ring-2 ring-[#FFD700] shrink-0">
                              {newMatchAlert.mvpPlayer.avatar}
                            </div>
                            <div>
                              <p className="text-[9px] text-[#FFD700] font-mono font-extrabold uppercase flex items-center gap-1">
                                <Crown className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" />
                                {t.selectedMvpNotice}
                              </p>
                              <p className="text-xs font-extrabold text-white flex items-center gap-1.5">
                                <span>{newMatchAlert.mvpPlayer.name}</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNewMatchAlert(null)}
                      className="p-1.5 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                      title={t.dismiss}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CLOUD SYNC STATUS TOAST */}
            <AnimatePresence>
              {syncStatusToast && (
                <motion.div
                  initial={{ opacity: 0, y: -15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.96 }}
                  className={`p-3.5 rounded-2xl border shadow-xl flex items-center justify-between gap-3 ${
                    syncStatusToast.isError
                      ? 'bg-red-950/80 border-red-500/50 text-red-200 shadow-red-950/40'
                      : 'bg-gradient-to-r from-[#1c1605] to-[#2b2208] border-[#FFD700]/70 text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.2)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      syncStatusToast.isError ? 'bg-red-500/20 text-red-400' : 'bg-[#FFD700] text-black font-bold'
                    }`}>
                      {syncStatusToast.isError ? <AlertCircle className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">{t.cloudSyncActive}</p>
                      <p className="text-xs font-bold truncate text-white">{syncStatusToast.message}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSyncStatusToast(null)}
                    className="p-1 text-white/40 hover:text-white rounded-lg transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LOGIN PROMPT (If Logged Out) */}
            {!currentUser && (
              <div className="space-y-5 py-2 max-w-lg mx-auto">
                <div className="text-center space-y-2">
                  <img 
                    src={teamLogo} 
                    alt="The Pharaohs FC Logo" 
                    referrerPolicy="no-referrer"
                    className="w-28 h-28 object-contain mx-auto drop-shadow-[0_0_18px_rgba(212,175,55,0.45)]"
                  />
                  <h2 className="text-xl font-bold text-[#D4AF37]">{t.portalTitle}</h2>
                  <p className="text-xs text-white/50">{t.portalSubtitle}</p>
                </div>

                {/* Persistent Session Notice */}
                <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl flex items-center gap-2.5 text-[#D4AF37] text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <p className="leading-snug">{t.staySignedInNotice}</p>
                </div>

                {loginError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
                    {loginError}
                  </div>
                )}



                <form onSubmit={handleLogin} className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div>
                    <label className="text-[10px] uppercase text-white/40 mb-1 block font-mono">{t.username}</label>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="e.g. ali hossam"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-white/40 mb-1 block font-mono">{t.password}</label>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder={t.password}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 ltr:pr-10 rtl:pl-10 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute ltr:right-3 rtl:left-3 text-white/40 hover:text-white/80 transition-colors p-1 flex items-center justify-center"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-[#D4AF37]" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#D4AF37] text-black text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-[#c2a030] transition-colors shadow-md"
                  >
                    {t.logIn}
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-white/30">{lang === 'ar' ? 'أو' : 'OR'}</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-95"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{lang === 'ar' ? 'تسجيل الدخول بحساب Google' : 'Sign in with Google Account'}</span>
                  </button>
                </form>

              </div>
            )}

            {/* TAB: HOME */}
            {currentUser && activeTab === 'HOME' && (
              <>
                {/* Mobile Logged-in Account & Logout Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-9 h-9 rounded-full bg-[#D4AF37] text-black font-extrabold text-xs flex items-center justify-center shrink-0 shadow-md">
                      {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] text-white/40 font-mono uppercase">{t.loggedInAs}</p>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full font-mono font-bold">
                          {t.sessionSaved}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">
                        {currentUser.name}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUserLogout}
                    className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.switchAccount}</span>
                  </button>
                </div>

                {/* View Scope Selector for Non-Master Accounts */}
                {!isMasterUser && (
                  <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setViewScope('OFFICIAL')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center ${
                        viewScope === 'OFFICIAL'
                          ? 'bg-[#D4AF37] text-black shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {t.officialStandings}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewScope('PERSONAL')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center ${
                        viewScope === 'PERSONAL'
                          ? 'bg-[#D4AF37] text-black shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {t.personalRecords}
                    </button>
                  </div>
                )}

                {/* Scope Indicator Banner */}
                <div className={`px-3 py-2 rounded-xl border text-[11px] flex items-center justify-between ${
                  isMasterUser
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]'
                    : viewScope === 'OFFICIAL'
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                }`}>
                  <span className="font-bold flex items-center gap-1.5">
                    {isMasterUser ? (
                      <>{t.masterAccountBanner}</>
                    ) : viewScope === 'OFFICIAL' ? (
                      <>{t.officialDataBanner}</>
                    ) : (
                      <>{t.personalDataBanner}</>
                    )}
                  </span>
                </div>

                {/* PERSISTENT LIVE MATCH COUNTDOWN WIDGET AT TOP OF HOME TAB */}
                <MatchCountdownWidget
                  upcomingMatches={upcomingMatches}
                  lang={lang}
                  isMasterUser={isMasterUser}
                  teamLogo={teamLogo}
                  onScheduleClick={() => {
                    setActiveTab('MATCH');
                    setShowUpcomingModal(true);
                  }}
                  onLogResultClick={handleConvertUpcomingToMatch}
                />

                {/* Season Summary Card */}
                <motion.div 
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 24 }}
                  className="bg-gradient-to-br from-[#D4AF37] to-[#8A6D00] p-4 sm:p-6 rounded-3xl text-black shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">{t.seasonSummary}</p>
                      <h2 className="text-2xl sm:text-3xl font-black mt-0.5 tracking-tight flex items-center gap-1">
                        <AnimatedCounter value={wins} />-<AnimatedCounter value={draws} />-<AnimatedCounter value={losses} />
                      </h2>
                      <p className="text-[10px] font-bold uppercase opacity-60 mt-0.5">{t.recordWDL}</p>
                    </div>

                    {/* Current Win Streak Badge */}
                    <div className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl flex items-center gap-2 border shadow-md shrink-0 transition-all ${
                      currentWinStreak > 0
                        ? 'bg-black text-[#FFD700] border-black/80 shadow-[0_0_15px_rgba(0,0,0,0.3)]'
                        : 'bg-black/15 text-black/80 border-black/20'
                    }`}>
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        currentWinStreak > 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-black/10 text-black/50'
                      }`}>
                        <Flame className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${currentWinStreak > 0 ? 'text-[#FFD700] fill-[#FFD700] animate-bounce' : 'text-black/50'}`} />
                      </div>
                      <div className="text-start">
                        <p className="text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider opacity-80 leading-none">
                          {t.currentWinStreak}
                        </p>
                        <p className="text-xs sm:text-sm font-black font-mono leading-none mt-1 flex items-center gap-1">
                          <AnimatedCounter value={currentWinStreak} />
                          <span className="text-[9px] sm:text-[10px] opacity-70 uppercase">{t.winStreak}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between text-xs font-bold border-t border-black/15 pt-3">
                    <span className="flex items-center gap-1.5">
                      <span>{t.goals}:</span>
                      <AnimatedCounter value={totalGoals} className="text-black font-black" />
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span>{t.assists}:</span>
                      <AnimatedCounter value={totalAssists} className="text-black font-black" />
                    </span>
                  </div>
                </motion.div>

                {/* ANIMATED TOTAL GOALS SUMMARY CARD (HOME TAB) */}
                <TotalGoalsSummaryCard 
                  totalGoals={totalGoals} 
                  totalAssists={totalAssists} 
                  matches={matches} 
                  players={effectivePlayers} 
                  t={t} 
                  lang={lang} 
                />

                {/* Personal Player Highlight */}
                {activeUserPlayer && (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-xs flex items-center justify-center">
                        {activeUserPlayer.avatar}
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-mono">{t.yourStats}</p>
                        <p className="text-xs font-bold text-white">{activeUserPlayer.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs font-mono">
                      {(() => {
                        const userRating = getPlayerAverageRating(activeUserPlayer.id, matches);
                        return userRating !== null ? (
                          <div className="text-center">
                            <span className="text-[9px] text-[#FFD700] block">{t.rating}</span>
                            <span className="font-bold text-[#FFD700]">⭐ {userRating.toFixed(1)}</span>
                          </div>
                        ) : null;
                      })()}
                      <div className="text-center">
                        <span className="text-[9px] text-white/40 block">{t.goals}</span>
                        <span className="font-bold text-[#D4AF37]">
                          <AnimatedCounter value={activeUserPlayer.goals} />
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] text-white/40 block">{t.assists}</span>
                        <span className="font-bold text-white">
                          <AnimatedCounter value={activeUserPlayer.assists} />
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Animated Form Guide & Win Rate Badge Row */}
                {matches.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-white/40 block mb-1">
                        {t.formGuideTitle}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {matches.slice(0, 6).map((m, idx) => (
                          <motion.div
                            key={m.id || idx}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: idx * 0.08 }}
                            className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center font-mono border shadow-sm transition-transform hover:scale-110 cursor-default ${
                              m.result === 'W' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
                              m.result === 'D' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :
                              'bg-red-500/20 text-red-400 border-red-500/40'
                            }`}
                            title={`${m.opponent} (${m.teamGoals}-${m.opponentGoals}) - ${m.date}`}
                          >
                            {m.result === 'W' ? 'W' : m.result === 'D' ? 'D' : 'L'}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-black/40 px-3.5 py-2 rounded-xl border border-white/5 shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] font-mono font-extrabold text-xs">
                        {Math.round((wins / matches.length) * 100)}%
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-white/40 uppercase block">{t.winRateTitle}</span>
                        <span className="text-xs font-bold text-[#D4AF37] font-mono">{wins} {t.win} / {matches.length} {t.mCount}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* UPCOMING MATCHES FIXTURES SECTION (HOME TAB) */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-[#12100a] via-[#0d0d0d] to-[#070707] border-2 border-[#D4AF37]/50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_0_30px_rgba(212,175,55,0.15)] space-y-3 sm:space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shrink-0">
                        <Clock className="w-4 h-4 text-[#FFD700]" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-[#FFD700] uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                          <span>{t.upcomingSectionTitle}</span>
                          <span className="text-[9px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] px-2 py-0.5 rounded-full font-mono normal-case">
                            🌍 Live Sync
                          </span>
                        </h3>
                        <p className="text-[9px] sm:text-[10px] text-white/40">{t.upcomingSectionSubtitle}</p>
                      </div>
                    </div>

                    {isMasterUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('MATCH');
                          setShowUpcomingModal(true);
                        }}
                        className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#FFD700] text-black font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t.logUpcomingMatchBtn}</span>
                        <span className="sm:hidden">+</span>
                      </button>
                    )}
                  </div>

                  {upcomingMatches.length === 0 ? (
                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-center space-y-2">
                      <Calendar className="w-8 h-8 text-white/20 mx-auto" />
                      <p className="text-xs text-white/50">{t.noUpcomingMatches}</p>
                      {isMasterUser && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('MATCH');
                            setShowUpcomingModal(true);
                          }}
                          className="text-xs text-[#D4AF37] font-bold hover:underline"
                        >
                          {t.logUpcomingMatchBtn}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingMatches.map((u) => {
                        const countdown = getCountdownString(u.date, u.time, lang);
                        return (
                          <div 
                            key={u.id}
                            className="p-3.5 sm:p-4 bg-gradient-to-r from-black/80 via-black/50 to-black/80 border border-[#D4AF37]/30 hover:border-[#D4AF37]/70 rounded-2xl transition-all space-y-2 relative"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/5 pb-2">
                              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-white/60">
                                <span className="flex items-center gap-1 text-[#D4AF37] font-bold">
                                  <Calendar className="w-3 h-3" />
                                  {u.date}
                                </span>
                                {u.time && (
                                  <span className="flex items-center gap-1 text-white/80">
                                    <Clock className="w-3 h-3 text-[#D4AF37]" />
                                    {u.time}
                                  </span>
                                )}
                              </div>

                              <span className="px-2.5 py-0.5 text-[10px] font-black font-mono bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#FFD700] rounded-full shadow-sm animate-pulse">
                                ⏳ {countdown}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <img src={teamLogo} alt="The Pharaohs" className="w-7 h-7 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(212,175,55,0.4)]" />
                                <span className="text-xs sm:text-sm font-extrabold text-white truncate">{t.appTitle}</span>
                              </div>

                              <span className="text-xs font-black text-[#FFD700] uppercase font-mono px-2 py-0.5 bg-[#D4AF37]/10 rounded-lg shrink-0">VS</span>

                              <div className="text-end min-w-0">
                                <span className="text-xs sm:text-sm font-extrabold text-white truncate block">{u.opponent}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1.5 text-[10px] text-white/50 border-t border-white/5">
                              <div className="flex items-center gap-2 flex-wrap">
                                {u.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-[#D4AF37]" />
                                    {u.location}
                                  </span>
                                )}
                                {u.competition && (
                                  <span className="bg-white/5 px-2 py-0.5 rounded text-[9px] text-white/70">
                                    🏆 {u.competition}
                                  </span>
                                )}
                              </div>

                              {isMasterUser && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleConvertUpcomingToMatch(u)}
                                    className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40 rounded-lg text-[10px] font-bold transition-all"
                                    title={t.logFinalResult}
                                  >
                                    ⚽ {t.logFinalResult}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUpcomingMatch(u.id)}
                                    className="p-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-lg text-[10px] transition-all"
                                    title={t.deleteUpcomingMatch}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {u.notes && (
                              <p className="text-[10px] text-white/60 italic bg-black/40 p-2 rounded-xl border border-white/5">
                                📝 {u.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>

                {/* LATEST MATCH & MVP SPOTLIGHT BADGE CARD */}
                {matches.length > 0 && (() => {
                  const latest = matches[0];
                  const latestMvp = latest.mvpPlayerId ? players.find(p => p.id === latest.mvpPlayerId) : null;
                  const scorersList = (latest.scorers || []).map(s => {
                    const p = players.find(pl => pl.id === s.playerId);
                    return p ? { name: p.name, goals: s.goals } : null;
                  }).filter(Boolean);

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-b from-[#1c180b] via-[#0e0e0e] to-[#080808] border-2 border-[#D4AF37]/60 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_0_35px_rgba(212,175,55,0.22)] space-y-3 sm:space-y-4 relative overflow-hidden"
                    >
                      {/* Top Glow Aura */}
                      <div className="absolute -top-12 -right-12 w-32 sm:w-36 h-32 sm:h-36 bg-[#D4AF37]/25 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 sm:pb-3 z-10 relative gap-2">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shrink-0 shadow-[0_0_10px_rgba(212,175,55,0.4)]">
                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFD700] animate-spin" style={{ animationDuration: '8s' }} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[11px] sm:text-xs font-black text-[#FFD700] uppercase tracking-wide truncate">
                              {t.latestMatchSpotlight}
                            </h3>
                            <p className="text-[9px] sm:text-[10px] text-white/40 font-mono truncate">{latest.date} • {t.matchLogsHistory}</p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-black font-mono rounded-lg sm:rounded-xl border shrink-0 shadow-sm ${
                          latest.result === 'W' ? 'bg-green-500/20 text-green-400 border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.2)]' :
                          latest.result === 'D' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :
                          'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}>
                          {latest.result === 'W' ? t.win : latest.result === 'D' ? t.draw : t.loss} ({latest.teamGoals}-{latest.opponentGoals})
                        </span>
                      </div>

                      {/* Scoreboard Box */}
                      <div className="flex items-center justify-between bg-black/60 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/10 gap-1.5 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <img src={teamLogo} alt="The Pharaohs" className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                          <div className="min-w-0">
                            <p className="text-[11px] sm:text-xs font-extrabold text-white truncate max-w-[70px] sm:max-w-none">{t.appTitle}</p>
                            <p className="text-[9px] sm:text-[10px] text-[#D4AF37] font-mono font-bold">{latest.teamGoals} {t.goals}</p>
                          </div>
                        </div>

                        <div className="text-center font-black font-mono bg-[#D4AF37]/10 px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl border border-[#D4AF37]/30 shrink-0">
                          <span className="text-base sm:text-lg text-[#FFD700] tracking-wider sm:tracking-widest">{latest.teamGoals} : {latest.opponentGoals}</span>
                        </div>

                        <div className="text-end min-w-0">
                          <p className="text-[11px] sm:text-xs font-extrabold text-white truncate max-w-[70px] sm:max-w-[110px]">{latest.opponent}</p>
                          <p className="text-[9px] sm:text-[10px] text-white/40 font-mono">{latest.opponentGoals} {t.goals}</p>
                        </div>
                      </div>

                      {/* MVP Highlight Badge */}
                      {latestMvp ? (
                        <motion.div 
                          initial={{ scale: 0.96 }}
                          animate={{ scale: 1 }}
                          className="p-2.5 sm:p-3.5 bg-gradient-to-r from-[#282109] via-black to-[#282109] border-2 border-[#FFD700]/70 rounded-xl sm:rounded-2xl relative overflow-hidden flex items-center justify-between gap-2 shadow-xl"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 z-10 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#FFD700] to-[#FFF5C0] text-black font-black text-xs sm:text-sm flex items-center justify-center ring-2 ring-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.6)]">
                                {latestMvp.avatar}
                              </div>
                              <div className="absolute -top-1.5 -right-1 bg-black rounded-full p-0.5 border border-[#FFD700]">
                                <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-[#FFD700] fill-[#FFD700] animate-pulse" />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] sm:text-[9px] font-mono font-black uppercase bg-[#FFD700] text-black px-1.5 sm:px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1 shadow-sm shrink-0">
                                  <Star className="w-2.5 h-2.5 fill-black" />
                                  {t.manOfTheMatch}
                                </span>
                              </div>
                              <h4 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFE58F] via-[#D4AF37] to-[#FFD700] mt-0.5 truncate">
                                {latestMvp.name}
                              </h4>
                              <p className="text-[9px] sm:text-[10px] text-white/60 font-mono truncate">
                                {latestMvp.goals} {t.gCount} / {latestMvp.assists} {t.aCount} ({t.seasonSummary})
                              </p>
                            </div>
                          </div>

                          <div className="text-end shrink-0 z-10">
                            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-[#FFD700] fill-[#FFD700]/20 animate-bounce" />
                          </div>
                        </motion.div>
                      ) : (
                        <div className="p-2.5 sm:p-3 bg-black/40 border border-white/5 rounded-xl sm:rounded-2xl text-center text-[10px] sm:text-[11px] text-white/40 italic">
                          {t.manOfTheMatch}: --
                        </div>
                      )}

                      {/* Scorers & Assisters summary pill */}
                      {scorersList.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-white/70 bg-black/40 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-white/5">
                          <span className="text-[#D4AF37] font-bold shrink-0">⚽ {t.goalScorers}:</span>
                          <span className="truncate">
                            {scorersList.map(s => `${s?.name} (${s?.goals})`).join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Player Ratings logged for this match */}
                      {latest.playerRatings && latest.playerRatings.length > 0 && (
                        <div className="bg-black/60 p-2.5 rounded-xl border border-[#D4AF37]/30 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FFD700]">
                            <Star className="w-3.5 h-3.5 fill-[#FFD700] text-[#FFD700]" />
                            <span>{t.ratingLogNotice}:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {latest.playerRatings.map(pr => {
                              const p = players.find(player => player.id === pr.playerId);
                              if (!p) return null;
                              return (
                                <span key={pr.playerId} className="inline-flex items-center gap-1 bg-[#1a1505] border border-[#FFD700]/40 px-2 py-0.5 rounded-md text-[10px]">
                                  <span className="text-white font-bold">{p.name}:</span>
                                  <span className="text-[#FFD700] font-mono font-black">⭐ {pr.rating.toFixed(1)}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })()}

                {/* Top Scorers Section */}
                <section className="space-y-3">
                  <div className="flex justify-between items-end">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-[#D4AF37]" />
                      {t.topScorers}
                    </h3>
                    <button 
                      onClick={() => setActiveTab('STATS')}
                      className="text-[10px] text-[#D4AF37] uppercase font-bold tracking-widest hover:underline"
                    >
                      {t.viewAll}
                    </button>
                  </div>

                  <motion.div 
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.06,
                          delayChildren: 0.03
                        }
                      }
                    }}
                    className="space-y-1.5"
                  >
                    {sortedScorers.slice(0, 5).map((player, idx) => (
                      <motion.div 
                        key={player.id}
                        variants={{
                          hidden: { opacity: 0, y: 14, scale: 0.97 },
                          show: { 
                            opacity: 1, 
                            y: 0, 
                            scale: 1,
                            transition: { type: 'spring', stiffness: 280, damping: 22 }
                          }
                        }}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-white/30 w-5">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-sm font-medium text-white">{player.name}</span>
                        </div>
                        <span className={`text-sm font-bold font-mono ${idx === 0 ? 'text-[#D4AF37]' : 'text-white/50'}`}>
                          <AnimatedCounter value={player.goals} />
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                </section>

                {/* Player Roster List Section with Staggered Entrance Animation */}
                <section className="space-y-3 pt-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#D4AF37]" />
                        {t.squadRosterTitle || "Squad Roster"}
                      </h3>
                      <p className="text-[10px] text-white/40">{t.registeredPlayersDesc || "Registered team players"}</p>
                    </div>
                    <span className="text-[10px] font-mono text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                      {players.length} {t.playersCount || "Players"}
                    </span>
                  </div>

                  <motion.div 
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.06,
                          delayChildren: 0.04
                        }
                      }
                    }}
                    className="space-y-2"
                  >
                    {effectivePlayers.map((player) => {
                      const mvpCount = matches.filter(m => m.mvpPlayerId === player.id).length;
                      const avgRating = getPlayerAverageRating(player.id, matches);
                      return (
                        <motion.div 
                          key={player.id}
                          variants={{
                            hidden: { opacity: 0, y: 16, scale: 0.97 },
                            show: { 
                              opacity: 1, 
                              y: 0, 
                              scale: 1,
                              transition: { type: 'spring', stiffness: 280, damping: 22 }
                            }
                          }}
                          className="p-3 bg-white/5 hover:bg-white/[0.08] rounded-2xl border border-white/5 hover:border-[#D4AF37]/30 transition-all flex items-center justify-between shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] font-bold text-xs flex items-center justify-center shadow-inner">
                              {player.avatar}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                                {player.name}
                                {player.username === currentUser.username && (
                                  <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded font-normal">
                                    {t.you}
                                  </span>
                                )}
                                {mvpCount > 0 && (
                                  <span className="text-[9px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                                    <Award className="w-2.5 h-2.5" />
                                    {mvpCount} {t.mvp}
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-white/40 font-mono">@{player.username}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
                            {avgRating !== null && (
                              <div className="text-right">
                                <span className="text-[9px] text-[#FFD700] block">{t.rating}</span>
                                <span className="font-bold text-[#FFD700]">⭐ {avgRating.toFixed(1)}</span>
                              </div>
                            )}
                            <div className="text-right">
                              <span className="text-[9px] text-white/30 block">{t.goals}</span>
                              <span className="font-bold text-[#D4AF37]">{player.goals}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] text-white/30 block">{t.assists}</span>
                              <span className="font-bold text-white/70">{player.assists}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </section>

                {/* Quick Log Match CTA - Master Account Only */}
                {isMasterUser && (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{t.playedAMatch}</p>
                      <p className="text-[10px] text-white/50">{t.recordGoalsResult}</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('MATCH')}
                      className="px-3 py-2 bg-[#D4AF37] text-black text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1 hover:bg-[#c2a030] transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      {t.logBtn}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* TAB: STATS */}
            {currentUser && activeTab === 'STATS' && (
              <div className="space-y-6">

                {/* Player Radar Head-to-Head Comparison View */}
                <PlayerComparisonSection 
                  players={effectivePlayers} 
                  matches={matches} 
                  lang={lang} 
                  t={t} 
                />

                {/* Match Results Trend Chart Section (Recharts) */}
                <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                        {t.matchTrendTitle}
                      </h3>
                      <p className="text-[10px] text-white/40">{t.matchTrendDesc}</p>
                    </div>
                    {matches.length > 0 && (
                      <span className="text-[10px] font-mono px-2 py-1 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-lg font-bold">
                        {Math.min(matches.length, 10)} {t.mCount}
                      </span>
                    )}
                  </div>

                  {matches.length === 0 ? (
                    <div className="text-center py-8 bg-black/30 rounded-xl border border-white/5">
                      <BarChart3 className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/40 italic">{t.noMatchesLogged}</p>
                    </div>
                  ) : (
                    (() => {
                      const last10 = [...matches].slice(0, 10).reverse();
                      let accumPts = 0;
                      let accumTeamGoals = 0;
                      let accumOppGoals = 0;
                      const trendData = last10.map((m, idx) => {
                        const pts = m.result === 'W' ? 3 : m.result === 'D' ? 1 : 0;
                        accumPts += pts;
                        accumTeamGoals += m.teamGoals;
                        accumOppGoals += m.opponentGoals;
                        return {
                          id: m.id,
                          matchNum: idx + 1,
                          shortName: `#${idx + 1}`,
                          opponent: m.opponent,
                          date: m.date,
                          result: m.result,
                          resultPts: pts,
                          cumulativePts: accumPts,
                          teamGoals: m.teamGoals,
                          opponentGoals: m.opponentGoals,
                          cumulativeTeamGoals: accumTeamGoals,
                          cumulativeOppGoals: accumOppGoals
                        };
                      });

                      const totalPtsIn10 = last10.reduce((acc, m) => acc + (m.result === 'W' ? 3 : m.result === 'D' ? 1 : 0), 0);
                      const winsIn10 = last10.filter(m => m.result === 'W').length;
                      const drawsIn10 = last10.filter(m => m.result === 'D').length;
                      const lossesIn10 = last10.filter(m => m.result === 'L').length;

                      return (
                        <div className="space-y-3">
                          {/* Mini Stats Summary Pill */}
                          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono bg-black/40 p-2.5 rounded-xl border border-white/5">
                            <div>
                              <span className="text-[9px] text-white/40 block">{t.points}</span>
                              <span className="font-bold text-[#D4AF37]">{totalPtsIn10}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-white/40 block">{t.win}</span>
                              <span className="font-bold text-green-400">{winsIn10}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-white/40 block">{t.draw}</span>
                              <span className="font-bold text-yellow-400">{drawsIn10}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-white/40 block">{t.loss}</span>
                              <span className="font-bold text-red-400">{lossesIn10}</span>
                            </div>
                          </div>

                          {/* Chart Type Selector Toggle */}
                          <div className="flex flex-wrap bg-black/60 p-1 rounded-xl border border-white/10 text-[10px] font-mono font-bold gap-1">
                            <button
                              type="button"
                              onClick={() => setChartType('TREND')}
                              className={`flex-1 py-1 px-2 rounded-lg transition-all min-w-[70px] text-center ${
                                chartType === 'TREND'
                                  ? 'bg-[#D4AF37] text-black shadow'
                                  : 'text-white/60 hover:text-white'
                              }`}
                            >
                              📈 {t.chartPointsView}
                            </button>
                            <button
                              type="button"
                              onClick={() => setChartType('CUMULATIVE_GOALS')}
                              className={`flex-1 py-1 px-2 rounded-lg transition-all min-w-[85px] text-center ${
                                chartType === 'CUMULATIVE_GOALS'
                                  ? 'bg-[#D4AF37] text-black shadow'
                                  : 'text-white/60 hover:text-white'
                              }`}
                            >
                              ⚽ {t.chartCumulativeGoalsView || "Cumulative Goals"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setChartType('BAR')}
                              className={`flex-1 py-1 px-2 rounded-lg transition-all min-w-[70px] text-center ${
                                chartType === 'BAR'
                                  ? 'bg-[#D4AF37] text-black shadow'
                                  : 'text-white/60 hover:text-white'
                              }`}
                            >
                              📊 {t.chartGoalsView}
                            </button>
                            <button
                              type="button"
                              onClick={() => setChartType('AREA')}
                              className={`flex-1 py-1 px-2 rounded-lg transition-all min-w-[70px] text-center ${
                                chartType === 'AREA'
                                  ? 'bg-[#D4AF37] text-black shadow'
                                  : 'text-white/60 hover:text-white'
                              }`}
                            >
                              🌊 Area Fill
                            </button>
                          </div>

                          {/* Recharts Animated Container */}
                          <div className="h-60 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              {chartType === 'TREND' ? (
                                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                  <XAxis 
                                    dataKey="shortName" 
                                    stroke="#ffffff40" 
                                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                                  />
                                  <YAxis 
                                    stroke="#ffffff40" 
                                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                                  />
                                  <Tooltip content={<CustomTooltip t={t} />} />
                                  <Legend 
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                    formatter={(value) => <span className="text-white/70">{value}</span>}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="cumulativePts" 
                                    name={t.cumulativePoints} 
                                    stroke="#D4AF37" 
                                    strokeWidth={3}
                                    animationDuration={1500}
                                    animationEasing="ease-in-out"
                                    dot={{ fill: '#D4AF37', r: 4, strokeWidth: 2, stroke: '#000' }}
                                    activeDot={{ r: 7, fill: '#FFD700', stroke: '#FFF' }}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="teamGoals" 
                                    name={t.goalsFor} 
                                    stroke="#22c55e" 
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    animationDuration={1500}
                                    dot={{ fill: '#22c55e', r: 3 }}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="opponentGoals" 
                                    name={t.goalsAgainst} 
                                    stroke="#ef4444" 
                                    strokeWidth={2}
                                    strokeDasharray="3 3"
                                    animationDuration={1500}
                                    dot={{ fill: '#ef4444', r: 3 }}
                                  />
                                </LineChart>
                              ) : chartType === 'CUMULATIVE_GOALS' ? (
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="cumGoalsGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="cumOppGoalsGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                  <XAxis 
                                    dataKey="shortName" 
                                    stroke="#ffffff40" 
                                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                                  />
                                  <YAxis 
                                    stroke="#ffffff40" 
                                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                                  />
                                  <Tooltip content={<CustomTooltip t={t} />} />
                                  <Legend 
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                    formatter={(value) => <span className="text-white/70">{value}</span>}
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="cumulativeTeamGoals" 
                                    name={t.cumulativeGoalsScored || "Cumulative Goals Scored"} 
                                    stroke="#22c55e" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#cumGoalsGrad)" 
                                    animationDuration={1500}
                                    animationEasing="ease-in-out"
                                    dot={{ fill: '#22c55e', r: 4, strokeWidth: 2, stroke: '#000' }}
                                    activeDot={{ r: 7, fill: '#4ade80', stroke: '#FFF' }}
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="cumulativeOppGoals" 
                                    name={t.cumulativeGoalsConceded || "Cumulative Goals Conceded"} 
                                    stroke="#ef4444" 
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    fillOpacity={0.3} 
                                    fill="url(#cumOppGoalsGrad)" 
                                    animationDuration={1500}
                                    animationEasing="ease-in-out"
                                    dot={{ fill: '#ef4444', r: 3 }}
                                  />
                                </AreaChart>
                              ) : chartType === 'BAR' ? (
                                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                  <XAxis 
                                    dataKey="shortName" 
                                    stroke="#ffffff40" 
                                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                                  />
                                  <YAxis 
                                    stroke="#ffffff40" 
                                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                                  />
                                  <Tooltip content={<CustomTooltip t={t} />} />
                                  <Legend 
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                    formatter={(value) => <span className="text-white/70">{value}</span>}
                                  />
                                  <Bar 
                                    dataKey="teamGoals" 
                                    name={t.goalsFor} 
                                    fill="#22c55e" 
                                    radius={[4, 4, 0, 0]}
                                    animationDuration={1400}
                                  />
                                  <Bar 
                                    dataKey="opponentGoals" 
                                    name={t.goalsAgainst} 
                                    fill="#ef4444" 
                                    radius={[4, 4, 0, 0]}
                                    animationDuration={1400}
                                  />
                                </BarChart>
                              ) : (
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.6}/>
                                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5}/>
                                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                  <XAxis 
                                    dataKey="shortName" 
                                    stroke="#ffffff40" 
                                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                                  />
                                  <YAxis 
                                    stroke="#ffffff40" 
                                    tick={{ fill: '#ffffff60', fontSize: 10 }}
                                  />
                                  <Tooltip content={<CustomTooltip t={t} />} />
                                  <Legend 
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                    formatter={(value) => <span className="text-white/70">{value}</span>}
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="cumulativePts" 
                                    name={t.cumulativePoints} 
                                    stroke="#D4AF37" 
                                    fillOpacity={1} 
                                    fill="url(#goldGrad)" 
                                    animationDuration={1500}
                                  />
                                  <Area 
                                    type="monotone" 
                                    dataKey="teamGoals" 
                                    name={t.goalsFor} 
                                    stroke="#22c55e" 
                                    fillOpacity={1} 
                                    fill="url(#greenGrad)" 
                                    animationDuration={1500}
                                  />
                                </AreaChart>
                              )}
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Win-Rate Percentage Trend Chart (Last 20 Matches) */}
                <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#FFD700]" />
                        {t.winRateTrendTitle || "Win-Rate Trend Over Time (Last 20 Matches)"}
                      </h3>
                      <p className="text-[10px] text-white/40">{t.winRateTrendDesc || "Interactive Recharts trend showing team win-rate evolution & performance across the last 20 matches"}</p>
                    </div>
                    {matches.length > 0 && (
                      <span className="text-[10px] font-mono px-2 py-1 bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 rounded-lg font-bold">
                        {Math.min(matches.length, 20)} Matches
                      </span>
                    )}
                  </div>

                  {matches.length === 0 ? (
                    <div className="text-center py-8 bg-black/30 rounded-xl border border-white/5">
                      <BarChart3 className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/40 italic">{t.noMatchesLogged}</p>
                    </div>
                  ) : (
                    (() => {
                      const last20 = [...matches].slice(0, 20).reverse();
                      let cumWins = 0;
                      const winRateData = last20.map((m, idx) => {
                        if (m.result === 'W') cumWins++;
                        const matchNum = idx + 1;
                        const winRate = Math.round((cumWins / matchNum) * 100);

                        // Calculate 5-match rolling win rate
                        const startIdx = Math.max(0, idx - 4);
                        const recentWindow = last20.slice(startIdx, idx + 1);
                        const recentWins = recentWindow.filter(rm => rm.result === 'W').length;
                        const rollingWinRate = Math.round((recentWins / recentWindow.length) * 100);

                        return {
                          id: m.id,
                          matchNum,
                          shortName: `#${matchNum}`,
                          opponent: m.opponent,
                          date: m.date,
                          result: m.result,
                          teamGoals: m.teamGoals,
                          opponentGoals: m.opponentGoals,
                          winRate,
                          rollingWinRate,
                          cumulativeWins: cumWins,
                          cumulativeMatches: matchNum
                        };
                      });

                      const latestWinRate = winRateData.length > 0 ? winRateData[winRateData.length - 1].winRate : 0;
                      const totalWinsIn20 = last20.filter(m => m.result === 'W').length;
                      const totalDrawsIn20 = last20.filter(m => m.result === 'D').length;
                      const totalLossesIn20 = last20.filter(m => m.result === 'L').length;

                      return (
                        <div className="space-y-3">
                          {/* Mini Stats Summary Pill */}
                          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono bg-black/40 p-2.5 rounded-xl border border-white/5">
                            <div>
                              <span className="text-[9px] text-white/40 block">{t.overallWinRate || "Overall Win Rate"}</span>
                              <span className="font-bold text-[#FFD700] text-sm">{latestWinRate}%</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-white/40 block">{t.winsCount || "Wins"}</span>
                              <span className="font-bold text-green-400">{totalWinsIn20} / {last20.length}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-white/40 block">{t.draw}</span>
                              <span className="font-bold text-yellow-400">{totalDrawsIn20}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-white/40 block">{t.loss}</span>
                              <span className="font-bold text-red-400">{totalLossesIn20}</span>
                            </div>
                          </div>

                          {/* Recharts Area Chart for Win Rate % */}
                          <div className="h-64 sm:h-72 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={winRateData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="winRateGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FFD700" stopOpacity={0.6}/>
                                    <stop offset="95%" stopColor="#FFD700" stopOpacity={0.05}/>
                                  </linearGradient>
                                  <linearGradient id="rollingGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis 
                                  dataKey="shortName" 
                                  stroke="#ffffff40" 
                                  tick={{ fill: '#ffffff60', fontSize: 10 }}
                                />
                                <YAxis 
                                  domain={[0, 100]} 
                                  stroke="#ffffff40" 
                                  tick={{ fill: '#ffffff60', fontSize: 10 }}
                                  unit="%"
                                />
                                <Tooltip content={<WinRateTooltip t={t} />} />
                                <ReferenceLine 
                                  y={50} 
                                  stroke="#FFD700" 
                                  strokeDasharray="4 4" 
                                  label={{ value: t.winRateBenchmark || 'Target (50%)', fill: '#FFD700', fontSize: 10, position: 'insideTopLeft' }} 
                                />
                                <Legend 
                                  wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                  formatter={(value) => <span className="text-white/70">{value}</span>}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="winRate" 
                                  name={t.winRatePercentage || "Win Rate %"} 
                                  stroke="#FFD700" 
                                  strokeWidth={2.5}
                                  fillOpacity={1} 
                                  fill="url(#winRateGrad)" 
                                  activeDot={{ r: 6, fill: '#FFD700', stroke: '#fff', strokeWidth: 2 }}
                                  animationDuration={1500}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="rollingWinRate" 
                                  name={t.rollingWinRate5 || "5-Match Rolling Rate"} 
                                  stroke="#22c55e" 
                                  strokeWidth={1.5}
                                  strokeDasharray="3 3"
                                  fillOpacity={1} 
                                  fill="url(#rollingGrad)" 
                                  animationDuration={1500}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#D4AF37]" />
                    {t.squadLeaderboard}
                  </h3>
                  <span className="text-[10px] text-white/40 uppercase font-mono">{players.length} {t.playersCount}</span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlayer}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <motion.div 
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.06,
                        delayChildren: 0.03
                      }
                    }
                  }}
                  className="space-y-2"
                >
                  {sortedScorers
                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((player, rank) => (
                      <motion.div 
                        key={player.id} 
                        variants={{
                          hidden: { opacity: 0, y: 16, scale: 0.97 },
                          show: { 
                            opacity: 1, 
                            y: 0, 
                            scale: 1,
                            transition: { type: 'spring', stiffness: 280, damping: 22 }
                          }
                        }}
                        className={`p-3 rounded-xl border transition-colors flex items-center justify-between ${
                          rank === 0 
                            ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30' 
                            : 'bg-white/5 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                              {player.name}
                              {player.username === currentUser.username && (
                                <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded font-normal">
                                  {t.you}
                                </span>
                              )}
                              {(() => {
                                const mvpCount = matches.filter(m => m.mvpPlayerId === player.id).length;
                                return mvpCount > 0 ? (
                                  <span className="text-[9px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                                    <Award className="w-2.5 h-2.5" />
                                    {mvpCount} {t.mvp}
                                  </span>
                                ) : null;
                              })()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
                          {(() => {
                            const avgRating = getPlayerAverageRating(player.id, matches);
                            return avgRating !== null ? (
                              <div className="text-right">
                                <span className="text-[9px] text-[#FFD700] block">{t.rating}</span>
                                <span className="font-bold text-[#FFD700]">⭐ {avgRating.toFixed(1)}</span>
                              </div>
                            ) : null;
                          })()}
                          <div className="text-right">
                            <span className="text-[9px] text-white/30 block">{t.goals}</span>
                            <span className="font-bold text-[#D4AF37]">{player.goals}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-white/30 block">{t.assists}</span>
                            <span className="font-bold text-white/70">{player.assists}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </motion.div>
              </div>
            )}

            {/* TAB: MATCH */}
            {currentUser && activeTab === 'MATCH' && (
              <div className="space-y-4">

                {/* UPCOMING MATCHES MANAGEMENT SECTION (MATCH TAB) */}
                <div className="bg-gradient-to-br from-[#181409] to-[#0a0a0a] border-2 border-[#D4AF37]/50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#FFD700] shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#FFD700] uppercase tracking-wide flex items-center gap-2">
                          <span>{t.upcomingSectionTitle}</span>
                          <span className="text-[9px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] px-2 py-0.5 rounded-full font-mono normal-case">
                            👑 Ali Hossam
                          </span>
                        </h3>
                        <p className="text-[10px] text-white/40">{t.upcomingSectionSubtitle}</p>
                      </div>
                    </div>

                    {isMasterUser && (
                      <button
                        type="button"
                        onClick={() => setShowUpcomingModal(!showUpcomingModal)}
                        className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#FFD700] text-black font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>{showUpcomingModal ? t.dismiss : t.logUpcomingMatchBtn}</span>
                      </button>
                    )}
                  </div>

                  {/* Non-Master Notice */}
                  {!isMasterUser && (
                    <div className="p-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl text-xs text-[#D4AF37] font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-[#FFD700]" />
                      <span>{t.onlyAliCanLogUpcoming}</span>
                    </div>
                  )}

                  {/* Upcoming Match Scheduling Form (Ali Hossam Exclusive) */}
                  {isMasterUser && showUpcomingModal && (
                    <motion.form 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      onSubmit={handleAddUpcomingMatch} 
                      className="space-y-3 bg-black/70 p-4 rounded-2xl border border-[#D4AF37]/50 shadow-2xl"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-[#FFD700] uppercase font-mono flex items-center gap-1.5">
                          <PlusCircle className="w-4 h-4" />
                          {t.logUpcomingMatchBtn}
                        </span>
                        <span className="text-[10px] text-white/40">👑 Ali Hossam Exclusive</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase text-[#D4AF37] font-bold mb-1 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-[#D4AF37]" />
                            {t.upcomingMatchDate}
                          </label>
                          <input
                            type="date"
                            value={upcomingDate}
                            onChange={(e) => setUpcomingDate(e.target.value)}
                            required
                            className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] font-mono [color-scheme:dark]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase text-[#D4AF37] font-bold mb-1 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-[#D4AF37]" />
                            {t.upcomingMatchTime}
                          </label>
                          <input
                            type="time"
                            value={upcomingTime}
                            onChange={(e) => setUpcomingTime(e.target.value)}
                            required
                            className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] font-mono [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase text-[#D4AF37] font-bold mb-1 block font-mono">{t.upcomingOpponent}</label>
                          <input
                            type="text"
                            value={upcomingOpponent}
                            onChange={(e) => setUpcomingOpponent(e.target.value)}
                            placeholder={t.opponentPlaceholder}
                            required
                            className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase text-[#D4AF37] font-bold mb-1 block font-mono">{t.upcomingCompetition}</label>
                          <select
                            value={upcomingCompetition}
                            onChange={(e) => setUpcomingCompetition(e.target.value)}
                            className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                          >
                            <option value="Friendly Match">Friendly Match (مباراة ودية)</option>
                            <option value="Championship Cup">Championship Cup (كأس البطولة)</option>
                            <option value="League Fixture">League Fixture (الدوري الرسمي)</option>
                            <option value="Tournament Final">Tournament Final (نهائي الدورة)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase text-[#D4AF37] font-bold mb-1 block font-mono">{t.upcomingLocation}</label>
                          <input
                            type="text"
                            value={upcomingLocation}
                            onChange={(e) => setUpcomingLocation(e.target.value)}
                            placeholder="e.g., Main Pitch / Cairo Field"
                            className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase text-[#D4AF37] font-bold mb-1 block font-mono">{t.upcomingNotes}</label>
                          <input
                            type="text"
                            value={upcomingNotes}
                            onChange={(e) => setUpcomingNotes(e.target.value)}
                            placeholder="e.g., Bring dark jerseys, 7v7 format..."
                            className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                      </div>

                      <div className="pt-1 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowUpcomingModal(false)}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
                        >
                          {t.dismiss}
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:from-[#FFD700] hover:to-[#FFF] text-black font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.saveUpcomingMatch}</span>
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {/* Upcoming Matches Cards List */}
                  {upcomingMatches.length === 0 ? (
                    <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl text-center text-xs text-white/40 italic">
                      {t.noUpcomingMatches}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {upcomingMatches.map((u) => {
                        const countdown = getCountdownString(u.date, u.time, lang);
                        return (
                          <div key={u.id} className="p-3.5 bg-black/60 border border-[#D4AF37]/30 rounded-2xl space-y-2 relative hover:border-[#D4AF37]/70 transition-all">
                            <div className="flex items-center justify-between text-[10px] border-b border-white/10 pb-1.5">
                              <span className="text-[#FFD700] font-mono font-bold flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {u.date} {u.time ? `• ${u.time}` : ''}
                              </span>
                              <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#FFD700] px-2 py-0.5 rounded-full font-mono font-bold">
                                ⏳ {countdown}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 font-bold text-xs">
                              <span className="text-white truncate">{t.appTitle}</span>
                              <span className="text-[#D4AF37] font-mono text-[10px]">VS</span>
                              <span className="text-white truncate">{u.opponent}</span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-white/50 pt-1">
                              <span className="truncate">📍 {u.location || 'Home Turf'} ({u.competition || 'Friendly'})</span>
                              {isMasterUser && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleConvertUpcomingToMatch(u)}
                                    className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/40 rounded text-[9px] font-bold hover:bg-green-500/30 transition-colors"
                                  >
                                    ⚽ {t.logFinalResult}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUpcomingMatch(u.id)}
                                    className="p-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-[9px] hover:bg-red-500/30 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#D4AF37]" />
                      {isMasterUser ? t.recordMatchResult : t.matchLogsHistory}
                    </h3>
                    <p className="text-xs text-white/40">
                      {isMasterUser ? t.logGoalsAssistsDesc : t.viewMatchResultsDesc}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Hidden inputs for JSON/CSV imports */}
                    <input
                      ref={jsonFileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportJSONFile}
                      className="hidden"
                    />
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSVFile}
                      className="hidden"
                    />

                    {isMasterUser && (
                      <>
                        <button
                          type="button"
                          onClick={() => jsonFileInputRef.current?.click()}
                          className="text-xs text-[#FFD700] hover:text-white flex items-center gap-1.5 font-mono font-bold bg-[#FFD700]/15 hover:bg-[#FFD700]/30 px-3 py-1.5 rounded-xl border border-[#FFD700]/40 transition-colors shadow-sm"
                          title={t.importMatchesJSON}
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-[#FFD700]" />
                          <span>{t.importJSONBtn}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => csvFileInputRef.current?.click()}
                          className="text-xs text-[#FFD700] hover:text-white flex items-center gap-1.5 font-mono font-bold bg-[#FFD700]/15 hover:bg-[#FFD700]/30 px-3 py-1.5 rounded-xl border border-[#FFD700]/40 transition-colors shadow-sm"
                          title={t.importMatchesCSV}
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-[#FFD700]" />
                          <span>{t.importCSVBtn}</span>
                        </button>
                      </>
                    )}

                    {matches.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={handleExportMatchesCSV}
                          className="text-xs text-[#D4AF37] hover:text-[#FFD700] flex items-center gap-1.5 font-mono font-bold bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 px-3 py-1.5 rounded-xl border border-[#D4AF37]/30 transition-colors shadow-sm"
                          title={t.exportMatchesCSV}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>{t.exportCSVBtn}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleExportMatchesJSON}
                          className="text-xs text-[#D4AF37] hover:text-[#FFD700] flex items-center gap-1.5 font-mono font-bold bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 px-3 py-1.5 rounded-xl border border-[#D4AF37]/30 transition-colors shadow-sm"
                          title={t.exportMatchesJSON}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{t.exportJSONBtn}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Live Match Sync Notice Banner */}
                <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl text-xs leading-relaxed text-[#D4AF37]">
                  <p className="font-bold flex items-center gap-1.5">
                    <span className="shrink-0 text-sm">🌍</span>
                    <span>{t.masterMatchNotice}</span>
                  </p>
                </div>

                {/* Match Logging Form - Accessible strictly to Ali (isMasterUser) */}
                {currentUser && isMasterUser ? (
                  <form onSubmit={handleAddMatch} className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] uppercase text-white/40 mb-1 flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                          {t.matchDate}
                        </label>
                        <input
                          type="date"
                          value={matchDate}
                          onChange={(e) => setMatchDate(e.target.value)}
                          required
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37] font-mono [color-scheme:dark]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] uppercase text-white/40 mb-1 block font-mono">{t.opponentName}</label>
                        <input
                          type="text"
                          value={opponent}
                          onChange={(e) => setOpponent(e.target.value)}
                          placeholder={t.opponentPlaceholder}
                          required
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase text-white/40 mb-1 block font-mono">{t.pharaohsGoals}</label>
                        <input
                          type="number"
                          min="0"
                          value={teamGoals}
                          onChange={(e) => setTeamGoals(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-white/40 mb-1 block font-mono">{t.opponentGoals}</label>
                        <input
                          type="number"
                          min="0"
                          value={opponentGoals}
                          onChange={(e) => setOpponentGoals(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase text-white/40 mb-1 block font-mono">{t.result}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['W', 'D', 'L'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setMatchResult(r)}
                            className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                              matchResult === r
                                ? r === 'W' 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                                  : r === 'D' 
                                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' 
                                  : 'bg-red-500/20 text-red-400 border-red-500/50'
                                : 'bg-black/30 text-white/40 border-white/5 hover:text-white'
                            }`}
                          >
                            {r === 'W' ? t.win : r === 'D' ? t.draw : t.loss}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Goal Scorers Multi-Selector */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase text-white/40 font-mono">{t.goalScorers}</label>
                        <button
                          type="button"
                          onClick={() => setSelectedScorers([...selectedScorers, { playerId: '', goals: 1 }])}
                          className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1 font-mono font-bold"
                        >
                          {t.addScorer}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {selectedScorers.map((scorer, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <select
                              value={scorer.playerId}
                              onChange={(e) => {
                                const updated = [...selectedScorers];
                                updated[index].playerId = e.target.value;
                                setSelectedScorers(updated);
                              }}
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                            >
                              <option value="">{t.selectPlayer}</option>
                              {players.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>

                            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-1 py-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...selectedScorers];
                                  if (updated[index].goals > 1) {
                                    updated[index].goals -= 1;
                                    setSelectedScorers(updated);
                                  }
                                }}
                                className="px-1.5 text-xs text-white/60 hover:text-white"
                              >
                                -
                              </button>
                              <span className="px-1.5 text-xs font-mono font-bold text-[#D4AF37]">{scorer.goals}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...selectedScorers];
                                  updated[index].goals += 1;
                                  setSelectedScorers(updated);
                                }}
                                className="px-1.5 text-xs text-white/60 hover:text-white"
                              >
                                +
                              </button>
                            </div>

                            {selectedScorers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setSelectedScorers(selectedScorers.filter((_, i) => i !== index))}
                                className="text-white/40 hover:text-red-400 px-1 text-xs"
                                title="Remove"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assisters Multi-Selector */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase text-white/40 font-mono">{t.assistsTitle}</label>
                        <button
                          type="button"
                          onClick={() => setSelectedAssisters([...selectedAssisters, { playerId: '', assists: 1 }])}
                          className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1 font-mono font-bold"
                        >
                          {t.addAssist}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {selectedAssisters.map((assister, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <select
                              value={assister.playerId}
                              onChange={(e) => {
                                const updated = [...selectedAssisters];
                                updated[index].playerId = e.target.value;
                                setSelectedAssisters(updated);
                              }}
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                            >
                              <option value="">{t.selectPlayer}</option>
                              {players.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>

                            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-1 py-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...selectedAssisters];
                                  if (updated[index].assists > 1) {
                                    updated[index].assists -= 1;
                                    setSelectedAssisters(updated);
                                  }
                                }}
                                className="px-1.5 text-xs text-white/60 hover:text-white"
                              >
                                -
                              </button>
                              <span className="px-1.5 text-xs font-mono font-bold text-white">{assister.assists}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...selectedAssisters];
                                  updated[index].assists += 1;
                                  setSelectedAssisters(updated);
                                }}
                                className="px-1.5 text-xs text-white/60 hover:text-white"
                              >
                                +
                              </button>
                            </div>

                            {selectedAssisters.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setSelectedAssisters(selectedAssisters.filter((_, i) => i !== index))}
                                className="text-white/40 hover:text-red-400 px-1 text-xs"
                                title="Remove"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Man of the Match (MVP) Selection */}
                    <div>
                      <label className="text-[10px] uppercase text-white/40 mb-1 flex items-center gap-1 font-mono">
                        <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {t.manOfTheMatch}
                      </label>
                      <select
                        value={mvpPlayerId}
                        onChange={(e) => setMvpPlayerId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                      >
                        <option value="">{t.selectMVPPlaceholder}</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            ⭐ {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Player Performance Ratings (Ali Hossam Special Feature) */}
                    <div className="space-y-2 bg-[#1a1505] p-3 rounded-2xl border border-[#FFD700]/40 shadow-inner">
                      <div className="flex items-center justify-between border-b border-[#FFD700]/20 pb-2">
                        <label className="text-[11px] font-black uppercase text-[#FFD700] font-mono flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
                          {t.playerRatingsTitle}
                        </label>
                        <span className="text-[9px] bg-[#FFD700]/20 text-[#FFD700] px-2 py-0.5 rounded-full font-mono font-bold">
                          1.0 - 10.0
                        </span>
                      </div>
                      <p className="text-[10px] text-white/60 leading-tight">
                        {t.playerRatingsDesc}
                      </p>

                      <div className="space-y-2 pt-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                        {players.map((p) => {
                          const ratingVal = playerRatingsInput[p.id] ?? '';
                          return (
                            <div key={p.id} className="flex items-center justify-between gap-2 bg-black/60 p-2 rounded-xl border border-white/10 hover:border-[#D4AF37]/50 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4AF37] text-black font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                                  {p.avatar}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{p.name}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <select
                                  value={ratingVal}
                                  onChange={(e) => {
                                    const val = e.target.value ? parseFloat(e.target.value) : 0;
                                    setPlayerRatingsInput(prev => ({
                                      ...prev,
                                      [p.id]: val
                                    }));
                                  }}
                                  className="bg-black border border-[#FFD700]/50 rounded-lg px-2 py-1 text-xs text-[#FFD700] font-mono font-bold focus:outline-none focus:border-[#FFD700]"
                                >
                                  <option value="">-- {t.noRating} --</option>
                                  {[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3, 2, 1].map((r) => (
                                    <option key={r} value={r}>⭐ {r.toFixed(1)} / 10</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Match Summary / Notes */}
                    <div>
                      <label className="text-[10px] uppercase text-white/40 mb-1 block font-mono">{t.matchSummaryNotes}</label>
                      <textarea
                        value={matchNotes}
                        onChange={(e) => setMatchNotes(e.target.value)}
                        placeholder={t.notesPlaceholder}
                        rows={2}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37] resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#D4AF37] text-black text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-[#c2a030] transition-colors mt-2"
                    >
                      {t.saveMatchRecord}
                    </button>
                  </form>
                ) : currentUser ? (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center space-y-1.5">
                    <ShieldCheck className="w-7 h-7 text-[#D4AF37] mx-auto opacity-60" />
                    <p className="text-xs font-bold text-white">
                      {lang === 'ar' ? 'تسجيل المباريات وتعديل بطاقات FC مقتصر على حساب علي فقط' : 'Logging matches and editing FC cards is restricted to Ali.'}
                    </p>
                    <p className="text-[10px] text-white/50">
                      {lang === 'ar' ? 'يمكنك مشاهدة النتائج والإحصائيات والبطاقات أدناه.' : 'You can view all results, statistics, and cards below.'}
                    </p>
                  </div>
                ) : null}

                {/* Match Logs History */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-white/50 uppercase font-mono">{t.recentMatches}</h4>
                    <div className="flex items-center gap-2">
                      {matches.length > 0 && (
                        <button
                          type="button"
                          onClick={handleExportMatchesCSV}
                          className="text-[10px] text-[#D4AF37] hover:text-[#FFD700] flex items-center gap-1 font-mono font-bold bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 px-2.5 py-1 rounded-lg border border-[#D4AF37]/30 transition-colors"
                          title={t.exportMatchesCSV}
                        >
                          <Download className="w-3 h-3" />
                          {t.exportCSVBtn}
                        </button>
                      )}
                      {matches.length > 0 && (isMasterUser || viewScope === 'PERSONAL') && (
                        <button
                          type="button"
                          onClick={handleDeleteLastMatch}
                          className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-mono font-bold bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg border border-red-500/20 transition-colors"
                          title={t.deleteLastMatch}
                        >
                          <Trash2 className="w-3 h-3" />
                          {t.deleteLastMatch}
                        </button>
                      )}
                    </div>
                  </div>
                  {matches.length === 0 ? (
                    <p className="text-xs text-white/30 italic text-center py-4 bg-white/5 rounded-xl border border-white/5">
                      {t.noMatchesLogged}
                    </p>
                  ) : (
                    <motion.div 
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: { opacity: 0 },
                        show: {
                          opacity: 1,
                          transition: {
                            staggerChildren: 0.08,
                            delayChildren: 0.04
                          }
                        }
                      }}
                      className="space-y-2"
                    >
                      {matches.map((m) => {
                        const mvpPlayer = m.mvpPlayerId ? players.find(p => p.id === m.mvpPlayerId) : null;
                        return (
                          <motion.div 
                            key={m.id} 
                            variants={{
                              hidden: { opacity: 0, y: 18, scale: 0.97 },
                              show: { 
                                opacity: 1, 
                                y: 0, 
                                scale: 1,
                                transition: { type: 'spring', stiffness: 280, damping: 22 }
                              }
                            }}
                            onClick={() => setSelectedMatchForModal(m)}
                            className="p-3.5 bg-white/5 hover:bg-white/[0.08] rounded-2xl border border-white/10 hover:border-[#D4AF37]/40 transition-all cursor-pointer space-y-2 text-xs shadow-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] group relative overflow-hidden"
                          >
                          {/* Accent corner indicator */}
                          <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#D4AF37]/20 to-transparent rounded-bl-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-extrabold text-white text-sm group-hover:text-[#D4AF37] transition-colors">{m.opponent}</p>
                                <span className="text-[10px] text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity font-mono font-bold flex items-center gap-0.5">
                                  <Maximize2 className="w-3 h-3" />
                                </span>
                              </div>
                              <p className="text-[10px] text-white/40 font-mono">{m.date}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 text-xs font-mono font-black rounded-lg border ${
                                m.result === 'W' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                m.result === 'D' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
                                'bg-red-500/20 text-red-400 border-red-500/30'
                              }`}>
                                {m.teamGoals} - {m.opponentGoals}
                              </span>
                              {(isMasterUser || viewScope === 'PERSONAL') && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMatch(m.id);
                                  }}
                                  className="text-white/30 hover:text-red-400 p-1.5 transition-colors rounded-lg hover:bg-white/10 z-10"
                                  title={t.deleteMatch}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Highlighted MVP Badge */}
                          {mvpPlayer && (
                            <div className="flex items-center gap-2 bg-gradient-to-r from-[#2a2209] via-black to-[#1a1403] border border-[#FFD700]/70 text-[#FFD700] px-3 py-1.5 rounded-xl text-[11px] font-extrabold w-fit my-1 shadow-[0_0_12px_rgba(255,215,0,0.25)]">
                              <Crown className="w-4 h-4 shrink-0 text-[#FFD700] fill-[#FFD700] animate-pulse" />
                              <span className="flex items-center gap-1">
                                <span className="text-[#D4AF37]">{t.mvp}:</span>
                                <span className="text-white font-black">{mvpPlayer.name}</span>
                              </span>
                            </div>
                          )}

                          {((m.scorers && m.scorers.length > 0) || (m.assisters && m.assisters.length > 0)) && (
                            <div className="text-[10px] text-white/60 pt-1.5 border-t border-white/5 space-y-0.5">
                              {m.scorers && m.scorers.length > 0 && (
                                <div>
                                  <span className="text-[#D4AF37] font-bold mr-1">⚽ {t.goals}:</span>
                                  {m.scorers.map(s => {
                                    const p = players.find(player => player.id === s.playerId);
                                    return p ? `${p.name}${s.goals > 1 ? ` (${s.goals})` : ''}` : null;
                                  }).filter(Boolean).join(', ')}
                                </div>
                              )}
                              {m.assisters && m.assisters.length > 0 && (
                                <div>
                                  <span className="text-white/40 font-bold mr-1">🅰️ {t.assists}:</span>
                                  {m.assisters.map(a => {
                                    const p = players.find(player => player.id === a.playerId);
                                    return p ? `${p.name}${a.assists > 1 ? ` (${a.assists})` : ''}` : null;
                                  }).filter(Boolean).join(', ')}
                                </div>
                              )}
                            </div>
                          )}

                          {m.playerRatings && m.playerRatings.length > 0 && (
                            <div className="text-[10px] text-white/70 pt-1.5 border-t border-white/5 space-y-1">
                              <div className="flex items-center gap-1 font-bold text-[#FFD700]">
                                <Star className="w-3 h-3 fill-[#FFD700]" />
                                <span>{t.matchRatings}:</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {m.playerRatings.slice(0, 4).map(pr => {
                                  const p = players.find(player => player.id === pr.playerId);
                                  if (!p) return null;
                                  return (
                                    <span key={pr.playerId} className="inline-flex items-center gap-1 bg-black/60 border border-[#D4AF37]/30 px-2 py-0.5 rounded-md text-[10px]">
                                      <span className="text-white/80 font-bold">{p.name}:</span>
                                      <span className="text-[#FFD700] font-mono font-black">⭐ {pr.rating.toFixed(1)}</span>
                                    </span>
                                  );
                                })}
                                {m.playerRatings.length > 4 && (
                                  <span className="text-[10px] text-[#D4AF37] font-mono font-bold flex items-center gap-0.5 self-center">
                                    +{m.playerRatings.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {m.notes && (
                            <div className="text-[10px] text-white/70 italic bg-black/30 px-2.5 py-1.5 rounded-lg border border-white/5 mt-1 line-clamp-1">
                              "{m.notes}"
                            </div>
                          )}

                          {/* Expand Modal CTA Prompt */}
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMatchForModal(m);
                              }}
                              className="text-[10px] text-[#D4AF37] hover:text-[#FFD700] flex items-center gap-1 font-mono font-bold bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 px-2.5 py-1 rounded-lg border border-[#D4AF37]/30 transition-colors shadow-sm"
                            >
                              <Maximize2 className="w-3 h-3" />
                              <span>{t.viewMatchDetails || "View Details"}</span>
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
                </div>
              </div>
            )}

            {/* TAB: TEAM */}
            {currentUser && activeTab === 'TEAM' && (
              <div className="space-y-4">

                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#D4AF37]" />
                    {t.squadRosterTitle}
                  </h3>
                  <p className="text-xs text-white/40">{t.registeredPlayersDesc}</p>
                </div>

                <motion.div 
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.08,
                        delayChildren: 0.05
                      }
                    }
                  }}
                  className="space-y-2"
                >
                  {effectivePlayers.map((player) => {
                    const mvpCount = matches.filter(m => m.mvpPlayerId === player.id).length;
                    const avgRating = getPlayerAverageRating(player.id, matches);
                    return (
                      <motion.div 
                        key={player.id}
                        variants={{
                          hidden: { opacity: 0, y: 18, scale: 0.97 },
                          show: { 
                            opacity: 1, 
                            y: 0, 
                            scale: 1,
                            transition: { type: 'spring', stiffness: 280, damping: 22 }
                          }
                        }}
                        className="p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-[#D4AF37]/30 transition-all flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] font-bold text-xs flex items-center justify-center shadow-inner">
                            {player.avatar}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                              {player.name}
                              {mvpCount > 0 && (
                                <span className="text-[9px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                  <Award className="w-2.5 h-2.5" />
                                  {mvpCount} {t.mvp}
                                </span>
                              )}
                              {avgRating !== null && (
                                <span className="text-[9px] bg-[#FFD700]/15 border border-[#FFD700]/40 text-[#FFD700] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-[#FFD700]" />
                                  {avgRating.toFixed(1)}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-white/40 font-mono">@{player.username}</p>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          {avgRating !== null && (
                            <span className="text-[10px] text-[#FFD700] font-bold block">⭐ {avgRating.toFixed(1)}</span>
                          )}
                          <span className="text-xs font-bold text-[#D4AF37] block">{player.goals} {t.gCount}</span>
                          <span className="text-[10px] text-white/40">{player.assists} {t.aCount}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            )}

            {/* TAB: CARDS (FC Mobile Player Cards) */}
            {currentUser && activeTab === 'CARDS' && (
              <FcMobileCardsSection
                players={effectivePlayers}
                currentUser={currentUser}
                isMasterUser={isMasterUser}
                lang={lang}
                t={t}
              />
            )}

            {/* TAB: TACTICS (Digital Tactical Board) */}
            {currentUser && activeTab === 'TACTICS' && (
              <TacticalBoard
                players={effectivePlayers}
                currentUser={currentUser}
                isMasterUser={isMasterUser}
                lang={lang}
              />
            )}

            {/* TAB: AWARDS (Individual Awards: Player of the Month & Golden Boot) */}
            {currentUser && activeTab === 'AWARDS' && (
              <IndividualAwardsSection
                players={effectivePlayers}
                matches={matches}
                currentUser={currentUser}
                isMasterUser={isMasterUser}
                lang={lang}
                t={t}
              />
            )}

            {/* TAB: TASKS (Squad Tasks & Missions - Synced across all accounts via Firebase, imported/completed by Ali Hossam) */}
            {currentUser && activeTab === 'TASKS' && (
              <TeamTasksSection
                players={effectivePlayers}
                currentUser={currentUser}
                isMasterUser={isMasterUser}
                lang={lang}
              />
            )}

            {/* TAB: JOIN */}
            {currentUser && activeTab === 'JOIN' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-[#25D366]/20 text-[#25D366] px-2.5 py-0.5 rounded-full border border-[#25D366]/30 font-mono">
                      {t.whatsappGroup}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-[#25D366] fill-[#25D366]" />
                    <span>{t.joinSectionTitle}</span>
                  </h3>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    {t.joinSectionDesc}
                  </p>
                </div>

                {/* Promo Video Showcase Card */}
                <PromoVideoPlayer lang={lang} isMasterUser={isMasterUser} />

                <div className="bg-gradient-to-br from-emerald-950 via-emerald-900/60 to-black p-5 sm:p-6 rounded-3xl border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(37,211,102,0.15)] relative overflow-hidden space-y-6">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#25D366]/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#25D366] text-black font-black flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(37,211,102,0.5)]">
                        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 fill-black text-[#25D366]" />
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest font-mono block">
                          OFFICIAL COMMUNITY
                        </span>
                        <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                          {t.appTitle} WhatsApp Group
                        </h4>
                        <p className="text-xs text-emerald-300/80 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
                          <span>Official Squad Channel</span>
                        </p>
                      </div>
                    </div>

                    <a
                      href={WHATSAPP_GROUP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-5 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs rounded-2xl shadow-[0_4px_20px_rgba(37,211,102,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 z-10"
                    >
                      <MessageCircle className="w-4 h-4 fill-black" />
                      <span>{t.joinGroup}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="pt-4 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                    <div className="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-white/90">{t.whatsappFeature1}</span>
                    </div>
                    <div className="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-white/90">{t.whatsappFeature2}</span>
                    </div>
                    <div className="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-white/90">{t.whatsappFeature3}</span>
                    </div>
                    <div className="flex items-start gap-2.5 bg-black/40 p-3 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-white/90">{t.whatsappFeature4}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* BOTTOM NAVIGATION BAR (Optimized for 9:16 Portrait Layout) */}
          <nav className="grid grid-cols-9 items-center py-2 sm:py-2.5 bg-[#0c0c0c]/95 backdrop-blur-md border-t border-white/10 shrink-0 z-20 px-0.5">
            <button 
              onClick={() => setActiveTab('HOME')}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all py-1 px-0.5 min-w-0 ${activeTab === 'HOME' ? 'opacity-100 scale-105' : 'opacity-35 hover:opacity-75'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'HOME' ? 'bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]' : 'bg-white'}`}></div>
              <span className={`text-[7px] sm:text-[8.5px] font-black tracking-tight truncate max-w-full leading-none ${activeTab === 'HOME' ? 'text-[#D4AF37]' : 'text-white'}`}>{t.navHome}</span>
            </button>

            <button 
              onClick={() => setActiveTab('STATS')}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all py-1 px-0.5 min-w-0 ${activeTab === 'STATS' ? 'opacity-100 scale-105' : 'opacity-35 hover:opacity-75'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'STATS' ? 'bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]' : 'bg-white'}`}></div>
              <span className={`text-[7px] sm:text-[8.5px] font-black tracking-tight truncate max-w-full leading-none ${activeTab === 'STATS' ? 'text-[#D4AF37]' : 'text-white'}`}>{t.navStats}</span>
            </button>

            <button 
              onClick={() => setActiveTab('MATCH')}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all py-1 px-0.5 min-w-0 ${activeTab === 'MATCH' ? 'opacity-100 scale-105' : 'opacity-35 hover:opacity-75'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'MATCH' ? 'bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]' : 'bg-white'}`}></div>
              <span className={`text-[7px] sm:text-[8.5px] font-black tracking-tight truncate max-w-full leading-none ${activeTab === 'MATCH' ? 'text-[#D4AF37]' : 'text-white'}`}>{t.navMatch}</span>
            </button>

            <button 
              onClick={() => setActiveTab('TASKS')}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all py-1 px-0.5 min-w-0 ${activeTab === 'TASKS' ? 'opacity-100 scale-105' : 'opacity-35 hover:opacity-75'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'TASKS' ? 'bg-[#FFD700] shadow-[0_0_6px_#FFD700]' : 'bg-white'}`}></div>
              <span className={`text-[7px] sm:text-[8.5px] font-black tracking-tight truncate max-w-full leading-none ${activeTab === 'TASKS' ? 'text-[#FFD700]' : 'text-white'}`}>{t.navTasks || 'TASKS'}</span>
            </button>

            <button 
              onClick={() => setActiveTab('TEAM')}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all py-1 px-0.5 min-w-0 ${activeTab === 'TEAM' ? 'opacity-100 scale-105' : 'opacity-35 hover:opacity-75'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'TEAM' ? 'bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]' : 'bg-white'}`}></div>
              <span className={`text-[7px] sm:text-[8.5px] font-black tracking-tight truncate max-w-full leading-none ${activeTab === 'TEAM' ? 'text-[#D4AF37]' : 'text-white'}`}>{t.navTeam}</span>
            </button>

            <button 
              onClick={() => setActiveTab('CARDS')}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all py-1 px-0.5 min-w-0 ${activeTab === 'CARDS' ? 'opacity-100 scale-105' : 'opacity-35 hover:opacity-75'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'CARDS' ? 'bg-[#FFD700] shadow-[0_0_6px_#FFD700]' : 'bg-white'}`}></div>
              <span className={`text-[7px] sm:text-[8.5px] font-black tracking-tight truncate max-w-full leading-none ${activeTab === 'CARDS' ? 'text-[#FFD700]' : 'text-white'}`}>{t.navFcCards || "CARDS"}</span>
            </button>

            <button 
              onClick={() => setActiveTab('TACTICS')}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all py-1 px-0.5 min-w-0 ${activeTab === 'TACTICS' ? 'opacity-100 scale-105' : 'opacity-35 hover:opacity-75'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'TACTICS' ? 'bg-[#FFD700] shadow-[0_0_6px_#FFD700]' : 'bg-white'}`}></div>
              <span className={`text-[7px] sm:text-[8.5px] font-black tracking-tight truncate max-w-full leading-none ${activeTab === 'TACTICS' ? 'text-[#FFD700]' : 'text-white'}`}>{t.navTactics || "TACTIC"}</span>
            </button>

            <button 
              onClick={() => setActiveTab('AWARDS')}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all py-1 px-0.5 min-w-0 ${activeTab === 'AWARDS' ? 'opacity-100 scale-105' : 'opacity-35 hover:opacity-75'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'AWARDS' ? 'bg-[#FFD700] shadow-[0_0_6px_#FFD700]' : 'bg-white'}`}></div>
              <span className={`text-[7px] sm:text-[8.5px] font-black tracking-tight truncate max-w-full leading-none ${activeTab === 'AWARDS' ? 'text-[#FFD700]' : 'text-white'}`}>{t.navAwards || "AWARDS"}</span>
            </button>

            <button 
              onClick={() => setActiveTab('JOIN')}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all py-1 px-0.5 min-w-0 ${activeTab === 'JOIN' ? 'opacity-100 scale-105' : 'opacity-35 hover:opacity-75'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'JOIN' ? 'bg-[#25D366] shadow-[0_0_6px_#25D366]' : 'bg-white'}`}></div>
              <span className={`text-[7px] sm:text-[8.5px] font-black tracking-tight truncate max-w-full leading-none ${activeTab === 'JOIN' ? 'text-[#25D366]' : 'text-white'}`}>{t.navJoin}</span>
            </button>
          </nav>

        </div>
      </main>

      {/* EXPANDABLE MATCH DETAILS MODAL WITH SMOOTH SLIDE-IN ANIMATION */}
      <AnimatePresence>
        {selectedMatchForModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedMatchForModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ 
                type: 'spring', 
                stiffness: 340, 
                damping: 24, 
                mass: 0.85 
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#121212] border border-[#D4AF37]/40 rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-[0_10px_50px_rgba(0,0,0,0.9)] space-y-5 my-auto relative overflow-hidden"
            >
              {/* Glow background accent */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, duration: 0.25 }}
                className="flex items-start justify-between gap-3 border-b border-white/10 pb-4 relative z-10"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/30">
                      📅 {selectedMatchForModal.date}
                    </span>
                    <span className={`px-2.5 py-0.5 text-xs font-black rounded-full uppercase font-mono ${
                      selectedMatchForModal.result === 'W' ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
                      selectedMatchForModal.result === 'D' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                      'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}>
                      {selectedMatchForModal.result === 'W' ? t.win || 'WIN' : selectedMatchForModal.result === 'D' ? t.draw || 'DRAW' : t.loss || 'LOSS'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1.5 flex items-center gap-2">
                    <span>VS {selectedMatchForModal.opponent}</span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportMatchReportPdf({
                      match: selectedMatchForModal,
                      players: effectivePlayers,
                      lang,
                      teamName: 'The Pharaohs FC'
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                    title={t.exportMatchPdfDesc || "Export clean PDF match report"}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-mono">{t.exportMatchPdfBtn || "Export PDF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMatchForModal(null)}
                    className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-colors shrink-0 border border-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>

              {/* Score Board Banner */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="bg-gradient-to-r from-black via-[#1c1809] to-black border border-[#D4AF37]/40 rounded-2xl p-4 flex items-center justify-between text-center relative z-10 shadow-inner"
              >
                <div className="flex-1">
                  <p className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">The Pharaohs FC</p>
                  <p className="text-3xl font-black text-white font-mono mt-0.5">{selectedMatchForModal.teamGoals}</p>
                </div>
                <div className="px-3 font-mono text-xs text-white/40 font-black uppercase tracking-widest bg-white/5 py-1 rounded-lg border border-white/10">FT</div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white/70 uppercase tracking-wider truncate">{selectedMatchForModal.opponent}</p>
                  <p className="text-3xl font-black text-white font-mono mt-0.5">{selectedMatchForModal.opponentGoals}</p>
                </div>
              </motion.div>

              {/* MVP Spotlight Banner */}
              {selectedMatchForModal.mvpPlayerId && (() => {
                const mvp = effectivePlayers.find(p => p.id === selectedMatchForModal.mvpPlayerId || p.name.toLowerCase() === selectedMatchForModal.mvpPlayerId.toLowerCase() || p.username.toLowerCase() === selectedMatchForModal.mvpPlayerId.toLowerCase());
                if (!mvp) return null;
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="bg-gradient-to-r from-[#2a2209] via-black to-[#1a1403] border border-[#FFD700] rounded-2xl p-3.5 flex items-center gap-3 shadow-[0_0_20px_rgba(255,215,0,0.2)] relative z-10"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4AF37] text-black font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                      {mvp.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-[#FFD700] text-[10px] font-bold uppercase font-mono">
                        <Crown className="w-3.5 h-3.5 fill-[#FFD700] animate-bounce" />
                        <span>MAN OF THE MATCH (MVP)</span>
                      </div>
                      <p className="text-base font-black text-white truncate">{mvp.name}</p>
                    </div>
                    <div className="px-2.5 py-1 bg-[#FFD700]/20 text-[#FFD700] font-mono text-xs font-bold rounded-lg border border-[#FFD700]/40 shrink-0">
                      ⭐ MVP
                    </div>
                  </motion.div>
                );
              })()}

              {/* Goals & Assists Breakdown */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10"
              >
                {/* Scorers */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#D4AF37] uppercase font-mono">
                    <span className="text-sm">⚽</span>
                    <span>{t.goalScorers || "Goal Scorers"}</span>
                  </div>
                  {selectedMatchForModal.scorers && selectedMatchForModal.scorers.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {selectedMatchForModal.scorers.map(s => {
                        const p = effectivePlayers.find(player => player.id === s.playerId || player.name.toLowerCase() === s.playerId.toLowerCase() || player.username.toLowerCase() === s.playerId.toLowerCase());
                        if (!p) return null;
                        return (
                          <div key={s.playerId} className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold text-[10px] flex items-center justify-center">
                                {p.avatar}
                              </div>
                              <span className="text-xs font-bold text-white">{p.name}</span>
                            </div>
                            <span className="text-xs font-mono font-black text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-lg border border-[#D4AF37]/30">
                              ⚽ {s.goals} {s.goals > 1 ? 'Goals' : 'Goal'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 italic">{t.noRating || "No scorers logged"}</p>
                  )}
                </div>

                {/* Assisters */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-400 uppercase font-mono">
                    <span className="text-sm">🅰️</span>
                    <span>{t.assistsTitle || "Assists"}</span>
                  </div>
                  {selectedMatchForModal.assisters && selectedMatchForModal.assisters.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {selectedMatchForModal.assisters.map(a => {
                        const p = effectivePlayers.find(player => player.id === a.playerId || player.name.toLowerCase() === a.playerId.toLowerCase() || player.username.toLowerCase() === a.playerId.toLowerCase());
                        if (!p) return null;
                        return (
                          <div key={a.playerId} className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center">
                                {p.avatar}
                              </div>
                              <span className="text-xs font-bold text-white">{p.name}</span>
                            </div>
                            <span className="text-xs font-mono font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/30">
                              🅰️ {a.assists} {a.assists > 1 ? 'Assists' : 'Assist'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 italic">{t.noRating || "No assists logged"}</p>
                  )}
                </div>
              </motion.div>

              {/* Detailed Player Ratings */}
              {selectedMatchForModal.playerRatings && selectedMatchForModal.playerRatings.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2.5 relative z-10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#FFD700] uppercase font-mono">
                      <Star className="w-4 h-4 fill-[#FFD700] text-[#FFD700]" />
                      <span>{t.matchRatings || "Player Performance Ratings"}</span>
                    </div>
                    <span className="text-[10px] text-[#D4AF37] font-mono font-bold bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                      1.0 - 10.0
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                    {selectedMatchForModal.playerRatings.map(pr => {
                      const p = players.find(player => player.id === pr.playerId);
                      if (!p) return null;
                      const ratingNum = pr.rating;
                      const ratingBadgeStyle = ratingNum >= 8.5
                        ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/50'
                        : ratingNum >= 7.0
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : ratingNum >= 6.0
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                        : 'bg-red-500/20 text-red-400 border-red-500/40';

                      return (
                        <div key={pr.playerId} className="flex items-center justify-between bg-black/50 p-2 rounded-xl border border-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-white/10 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {p.avatar}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white leading-tight">{p.name}</p>
                              <p className="text-[9px] text-white/40 uppercase font-mono">{getPosLabel(p.position)}</p>
                            </div>
                          </div>

                          <div className={`px-2.5 py-1 rounded-lg border font-mono font-black text-xs ${ratingBadgeStyle}`}>
                            ⭐ {ratingNum.toFixed(1)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Tactical Notes / Summary */}
              {selectedMatchForModal.notes && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="bg-black/60 border border-white/10 rounded-2xl p-3.5 space-y-1 relative z-10"
                >
                  <p className="text-[10px] uppercase font-mono font-bold text-[#D4AF37]">{t.matchSummaryNotes || "Match Summary & Notes"}</p>
                  <p className="text-xs text-white/80 leading-relaxed italic">
                    "{selectedMatchForModal.notes}"
                  </p>
                </motion.div>
              )}

              {/* Modal Footer with PDF Export & Dismiss */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32, duration: 0.25 }}
                className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 relative z-10"
              >
                <button
                  type="button"
                  onClick={() => exportMatchReportPdf({
                    match: selectedMatchForModal,
                    players: effectivePlayers,
                    lang,
                    teamName: 'The Pharaohs FC'
                  })}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white hover:text-[#D4AF37] font-bold text-xs rounded-xl border border-white/15 hover:border-[#D4AF37]/50 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  <span>{t.exportMatchPdfBtn || "Export PDF Report"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMatchForModal(null)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#D4AF37] hover:bg-[#c2a030] text-black font-extrabold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-md cursor-pointer"
                >
                  {t.dismiss || "Close"}
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

