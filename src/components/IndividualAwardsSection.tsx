import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Crown, 
  Star, 
  Calendar, 
  Award, 
  CheckCircle2, 
  HelpCircle, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Share2, 
  Sparkles, 
  Flame, 
  Zap, 
  ShieldCheck, 
  UserCheck, 
  Filter, 
  X, 
  Save, 
  Eye, 
  TrendingUp, 
  Medal,
  Check
} from 'lucide-react';
import { db, collection, doc, setDoc, deleteDoc, onSnapshot, handleFirestoreError, OperationType } from '../lib/firebase';
import teamLogo from '../assets/images/pharaohs_fc_logo_1786236242642.jpg';
import goldenBall from '../assets/images/golden_soccer_ball_1786327096088.jpg';

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

export interface IndividualAward {
  id: string;
  type: 'PLAYER_OF_THE_MONTH' | 'GOLDEN_BOOT';
  datePeriod: string; // e.g. "2026-08" or "August 2026"
  dateDisplay: string; // e.g. "August 2026" / "أغسطس 2026"
  playerId: string; // Player ID (e.g. "p-1") OR "NOT_DETECTED"
  playerName?: string;
  playerAvatar?: string;
  playerPos?: string;
  statGoals?: number;
  statAssists?: number;
  statMatches?: number;
  statRating?: number;
  title?: string;
  notes?: string;
  awardedBy?: string;
  awardedAt?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}

interface IndividualAwardsSectionProps {
  players: Player[];
  matches: any[];
  currentUser: { username: string; name: string } | null;
  isMasterUser: boolean;
  lang: 'ar' | 'en';
  t: Record<string, string>;
}

export const NOT_DETECTED_ID = 'NOT_DETECTED';

// Pre-defined month/period presets
const MONTH_OPTIONS_EN = [
  { value: '2026-08', label: 'August 2026' },
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-01', label: 'January 2026' },
  { value: 'SEASON-2025-2026', label: 'Season 2025/2026' },
  { value: 'ALL-TIME', label: 'All-Time Record' }
];

const MONTH_OPTIONS_AR = [
  { value: '2026-08', label: 'أغسطس 2026' },
  { value: '2026-07', label: 'يوليو 2026' },
  { value: '2026-06', label: 'يونيو 2026' },
  { value: '2026-05', label: 'مايو 2026' },
  { value: '2026-04', label: 'أبريل 2026' },
  { value: '2026-03', label: 'مارس 2026' },
  { value: '2026-02', label: 'فبراير 2026' },
  { value: '2026-01', label: 'يناير 2026' },
  { value: 'SEASON-2025-2026', label: 'موسم 2025/2026' },
  { value: 'ALL-TIME', label: 'السجل التاريخي الشامل' }
];

// Initial default awards if database is empty
const INITIAL_AWARDS: IndividualAward[] = [
  {
    id: 'award-potm-2026-08',
    type: 'PLAYER_OF_THE_MONTH',
    datePeriod: '2026-08',
    dateDisplay: 'August 2026',
    playerId: 'p-1',
    playerName: 'Ali Hossam',
    playerAvatar: 'AH',
    playerPos: 'Forward',
    statGoals: 8,
    statAssists: 5,
    statMatches: 4,
    statRating: 9.6,
    title: 'Player of the Month - August 2026',
    notes: 'Outstanding attacking leadership, hat-trick performance and decisive match-winning goals.',
    awardedBy: 'Ali Hossam',
    awardedAt: '2026-08-01T12:00:00.000Z',
    status: 'ACTIVE'
  },
  {
    id: 'award-boot-2026-08',
    type: 'GOLDEN_BOOT',
    datePeriod: '2026-08',
    dateDisplay: 'August 2026',
    playerId: 'p-1',
    playerName: 'Ali Hossam',
    playerAvatar: 'AH',
    playerPos: 'Forward',
    statGoals: 12,
    statAssists: 6,
    statMatches: 6,
    statRating: 9.8,
    title: 'Golden Boot - Top Goalscorer',
    notes: 'Leader of the Pharaohs goalscoring charts with unstoppable finishing.',
    awardedBy: 'Ali Hossam',
    awardedAt: '2026-08-01T12:00:00.000Z',
    status: 'ACTIVE'
  }
];

export function IndividualAwardsSection({
  players,
  matches,
  currentUser,
  isMasterUser,
  lang,
  t
}: IndividualAwardsSectionProps) {
  const [awards, setAwards] = useState<IndividualAward[]>(() => {
    try {
      const saved = localStorage.getItem('fc_elite_individual_awards');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return INITIAL_AWARDS;
  });

  const [activeSection, setActiveSection] = useState<'ALL' | 'POTM' | 'GOLDEN_BOOT'>('ALL');
  const [selectedAwardId, setSelectedAwardId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingAward, setEditingAward] = useState<IndividualAward | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<'PLAYER_OF_THE_MONTH' | 'GOLDEN_BOOT'>('PLAYER_OF_THE_MONTH');
  const [formDatePeriod, setFormDatePeriod] = useState<string>('2026-08');
  const [formCustomDate, setFormCustomDate] = useState<string>('');
  const [formPlayerId, setFormPlayerId] = useState<string>('NOT_DETECTED');
  const [formGoals, setFormGoals] = useState<number>(0);
  const [formAssists, setFormAssists] = useState<number>(0);
  const [formMatches, setFormMatches] = useState<number>(0);
  const [formRating, setFormRating] = useState<number>(9.5);
  const [formNotes, setFormNotes] = useState<string>('');

  const monthOptions = lang === 'ar' ? MONTH_OPTIONS_AR : MONTH_OPTIONS_EN;

  // Real-time Firestore sync across all Google accounts and devices
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'individual_awards'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedAwards: IndividualAward[] = [];
        snapshot.forEach(docSnap => {
          loadedAwards.push(docSnap.data() as IndividualAward);
        });

        // Sort by date period descending
        loadedAwards.sort((a, b) => (b.datePeriod || '').localeCompare(a.datePeriod || ''));

        localStorage.setItem('fc_elite_individual_awards', JSON.stringify(loadedAwards));
        setAwards(loadedAwards);
      } else {
        // Seed initial awards into Firestore
        INITIAL_AWARDS.forEach(initialItem => {
          setDoc(doc(db, 'individual_awards', initialItem.id), initialItem).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `individual_awards/${initialItem.id}`);
          });
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'individual_awards');
    });

    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find latest/active Player of the Month
  const latestPotm = React.useMemo(() => {
    const potmList = awards.filter(a => a.type === 'PLAYER_OF_THE_MONTH');
    return potmList.length > 0 ? potmList[0] : null;
  }, [awards]);

  // Find latest/active Golden Boot
  const latestGoldenBoot = React.useMemo(() => {
    const bootList = awards.filter(a => a.type === 'GOLDEN_BOOT');
    return bootList.length > 0 ? bootList[0] : null;
  }, [awards]);

  // Filtered awards list
  const filteredAwards = React.useMemo(() => {
    if (activeSection === 'POTM') {
      return awards.filter(a => a.type === 'PLAYER_OF_THE_MONTH');
    }
    if (activeSection === 'GOLDEN_BOOT') {
      return awards.filter(a => a.type === 'GOLDEN_BOOT');
    }
    return awards;
  }, [awards, activeSection]);

  // Helper to open create modal
  const handleOpenCreateModal = (type: 'PLAYER_OF_THE_MONTH' | 'GOLDEN_BOOT') => {
    setEditingAward(null);
    setFormType(type);
    setFormDatePeriod('2026-08');
    setFormCustomDate('');
    setFormPlayerId('NOT_DETECTED');
    setFormGoals(type === 'GOLDEN_BOOT' ? 5 : 3);
    setFormAssists(2);
    setFormMatches(3);
    setFormRating(9.2);
    setFormNotes('');
    setShowModal(true);
  };

  // Helper to open edit modal
  const handleOpenEditModal = (award: IndividualAward) => {
    setEditingAward(award);
    setFormType(award.type);
    setFormDatePeriod(award.datePeriod || '2026-08');
    setFormCustomDate(award.dateDisplay || '');
    setFormPlayerId(award.playerId || 'NOT_DETECTED');
    setFormGoals(award.statGoals ?? 0);
    setFormAssists(award.statAssists ?? 0);
    setFormMatches(award.statMatches ?? 0);
    setFormRating(award.statRating ?? 9.0);
    setFormNotes(award.notes || '');
    setShowModal(true);
  };

  // Auto-suggest top scorer from match logs / roster
  const handleAutoSuggestTopScorer = () => {
    if (players.length === 0) return;
    const sorted = [...players].sort((a, b) => (b.goals || 0) - (a.goals || 0));
    const top = sorted[0];
    if (top) {
      setFormPlayerId(top.id);
      setFormGoals(top.goals);
      setFormAssists(top.assists);
      setFormMatches(top.matchesPlayed || 3);
      setFormNotes(lang === 'ar' ? `هداف الفريق برصيد ${top.goals} أهداف في المباريات الرسمية` : `Squad top goalscorer with ${top.goals} goals in official matches.`);
      showToast(lang === 'ar' ? `تم استيراد بيانات الهداف: ${top.name}` : `Imported top scorer stats: ${top.name}`);
    }
  };

  // Save Award to Firestore
  const handleSaveAward = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedPlayer = players.find(p => p.id === formPlayerId);
    const isNotDetected = formPlayerId === 'NOT_DETECTED';

    const selectedOption = monthOptions.find(o => o.value === formDatePeriod);
    const displayDate = formCustomDate.trim() || selectedOption?.label || formDatePeriod;

    const awardId = editingAward ? editingAward.id : `award-${formType === 'PLAYER_OF_THE_MONTH' ? 'potm' : 'boot'}-${formDatePeriod}-${Date.now()}`;

    const awardData: IndividualAward = {
      id: awardId,
      type: formType,
      datePeriod: formDatePeriod,
      dateDisplay: displayDate,
      playerId: formPlayerId,
      playerName: isNotDetected 
        ? (lang === 'ar' ? 'غير محدد (قيد التحديد)' : 'Not Detected (Pending)') 
        : (selectedPlayer?.name || 'Unknown Player'),
      playerAvatar: isNotDetected 
        ? '?' 
        : (selectedPlayer?.avatar || (selectedPlayer?.name ? selectedPlayer.name.slice(0, 2).toUpperCase() : 'FC')),
      playerPos: isNotDetected ? '' : (selectedPlayer?.position || ''),
      statGoals: Number(formGoals) || 0,
      statAssists: Number(formAssists) || 0,
      statMatches: Number(formMatches) || 0,
      statRating: Number(formRating) || 0,
      title: formType === 'PLAYER_OF_THE_MONTH' 
        ? (lang === 'ar' ? `لاعب الشهر - ${displayDate}` : `Player of the Month - ${displayDate}`)
        : (lang === 'ar' ? `الحذاء الذهبي - ${displayDate}` : `Golden Boot - ${displayDate}`),
      notes: formNotes.trim(),
      awardedBy: currentUser?.name || 'Ali Hossam',
      awardedAt: new Date().toISOString(),
      status: 'ACTIVE'
    };

    try {
      await setDoc(doc(db, 'individual_awards', awardId), awardData);
      
      // Update local state immediately for instant feedback
      setAwards(prev => {
        const filtered = prev.filter(a => a.id !== awardId);
        const updated = [awardData, ...filtered];
        localStorage.setItem('fc_elite_individual_awards', JSON.stringify(updated));
        return updated;
      });

      setShowModal(false);
      showToast(t.awardSavedSuccess || 'Award saved and published successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `individual_awards/${awardId}`);
      showToast(lang === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving award');
    }
  };

  // Delete Award from Firestore (Exclusive to Ali Hossam)
  const handleDeleteAward = async (id: string) => {
    if (!isMasterUser) {
      showToast(t.onlyAliCanDeleteAwards || (lang === 'ar' ? '👑 خاص بالكابتن علي حسام: لا يُسمح لأي حساب بحذف الجوائز الفردية سوى الكابتن علي حسام.' : 'Only Captain Ali Hossam is authorized to delete awards.'));
      return;
    }

    if (!window.confirm(t.deleteAwardConfirm || 'Are you sure you want to delete this award?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'individual_awards', id));
      setAwards(prev => {
        const updated = prev.filter(a => a.id !== id);
        localStorage.setItem('fc_elite_individual_awards', JSON.stringify(updated));
        return updated;
      });
      showToast(t.awardDeletedSuccess || 'Award deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `individual_awards/${id}`);
    }
  };

  const handleShareAward = (award: IndividualAward) => {
    const isNotDetected = award.playerId === 'NOT_DETECTED';
    const winnerName = isNotDetected 
      ? (lang === 'ar' ? 'غير محدد (قيد التحديد)' : 'Not Detected') 
      : (award.playerName || 'Pharaohs Player');
    const title = award.type === 'PLAYER_OF_THE_MONTH' ? '🌟 PLAYER OF THE MONTH' : '👟 GOLDEN BOOT WINNER';
    const text = `🏆 The Pharaohs FC Individual Award\n${title}\n📅 Period: ${award.dateDisplay}\n👑 Winner: ${winnerName}\n⚽ Goals: ${award.statGoals || 0} | 🅰️ Assists: ${award.statAssists || 0}\n⭐ Rating: ${award.statRating || 9.5}/10.0\n${award.notes ? `💬 Note: ${award.notes}\n` : ''}🇪🇬 Synced globally across all devices!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(award.id);
      setTimeout(() => setCopiedId(null), 2500);
      showToast(lang === 'ar' ? 'تم نسخ بطاقة الجائزة للمشاركة!' : 'Award details copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* TOAST ALERT NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#161616] border-2 border-[#FFD700] text-white px-5 py-3 rounded-2xl shadow-[0_10px_40px_rgba(255,215,0,0.35)] flex items-center gap-2.5 backdrop-blur-md"
          >
            <Sparkles className="w-5 h-5 text-[#FFD700] animate-spin" />
            <span className="text-xs font-bold text-white font-mono">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1402] via-[#0d0d0d] to-[#120f03] border border-[#D4AF37]/40 p-5 sm:p-7 shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#FFD700]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black font-black text-[10px] uppercase font-mono rounded-full tracking-widest shadow-md flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 fill-black" />
                {t.individualAwardsTitle || "INDIVIDUAL AWARDS"}
              </span>
              <span className="px-2.5 py-0.5 bg-white/10 text-white/70 text-[10px] font-mono rounded-full border border-white/10 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {t.syncedGloballyNotice ? (lang === 'ar' ? 'تزامن عالمي مباشر' : 'Live Global Sync') : 'Live Sync'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>{t.individualAwardsTitle || "The Pharaohs Individual Awards"}</span>
              <Crown className="w-7 h-7 text-[#FFD700] fill-[#FFD700] inline-block animate-pulse" />
            </h2>

            <p className="text-xs sm:text-sm text-white/70 max-w-xl leading-relaxed">
              {t.individualAwardsSubtitle || "Honoring outstanding individual excellence: Player of the Month and the Golden Boot award for The Pharaohs FC."}
            </p>
          </div>

          {/* Master Action Button */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => handleOpenCreateModal('PLAYER_OF_THE_MONTH')}
              className="flex-1 md:flex-initial px-4 py-3 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:from-[#c2a030] hover:to-[#e6c200] text-black font-extrabold text-xs rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.addNewAward || "+ Add New Award"}</span>
            </button>
          </div>
        </div>

        {/* Global Sync Notice Badge */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {isMasterUser ? (t.onlyAliCanManageAwards || "👑 Ali Hossam Master Control") : (t.viewerAwardsNotice || "🌐 Real-time synced awards")}
          </span>
          <span className="text-[#D4AF37] font-bold">
            {awards.length} {lang === 'ar' ? 'تتويج مسجل' : 'Awards Recorded'}
          </span>
        </div>
      </div>

      {/* FILTER BUTTONS / SECTION SWITCHER */}
      <div className="flex items-center gap-2 p-1.5 bg-black/60 border border-white/10 rounded-2xl overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSection('ALL')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'ALL'
              ? 'bg-[#D4AF37] text-black shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>{t.awardsFilterAll || "All Awards"}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20 font-bold">
            {awards.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('POTM')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'POTM'
              ? 'bg-[#FFD700] text-black shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>{t.playerOfTheMonth || "Player of the Month"}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20 font-bold">
            {awards.filter(a => a.type === 'PLAYER_OF_THE_MONTH').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('GOLDEN_BOOT')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeSection === 'GOLDEN_BOOT'
              ? 'bg-amber-400 text-black shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame className="w-3.5 h-3.5 fill-current" />
          <span>{t.goldenBoot || "Golden Boot"}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20 font-bold">
            {awards.filter(a => a.type === 'GOLDEN_BOOT').length}
          </span>
        </button>
      </div>

      {/* TWO CORE SECTIONS SPOTLIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ================= SECTION 1: PLAYER OF THE MONTH (POTM) ================= */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          onClick={() => latestPotm && setSelectedAwardId(selectedAwardId === latestPotm.id ? null : latestPotm.id)}
          className={`relative rounded-3xl bg-gradient-to-b from-[#1c1605] via-[#100e05] to-[#0a0a0a] border-2 cursor-pointer transition-all duration-300 ${
            latestPotm && selectedAwardId === latestPotm.id
              ? 'award-gold-pulse ring-2 ring-[#FFD700]/70'
              : latestPotm?.playerId === 'NOT_DETECTED'
                ? 'border-amber-500/40 hover:border-amber-400 hover:shadow-[0_12px_45px_rgba(245,158,11,0.25)]'
                : 'border-[#FFD700]/70 hover:border-[#FFD700] hover:shadow-[0_12px_45px_rgba(255,215,0,0.35)]'
          } p-5 sm:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden group`}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#FFD700]/15 rounded-full blur-3xl pointer-events-none group-hover:bg-[#FFD700]/25 transition-all duration-500" />

          <div className="space-y-4 relative z-10">
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#FFD700] text-black font-black flex items-center justify-center shadow-md">
                  <Star className="w-5 h-5 fill-black text-black" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[#FFD700] tracking-wider block">
                    SECTION 1 • POTM
                  </span>
                  <h3 className="text-lg font-black text-white">{t.playerOfTheMonth || "Player of the Month"}</h3>
                </div>
              </div>

              {latestPotm && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 rounded-xl text-xs font-mono font-black shadow-sm">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{latestPotm.dateDisplay}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              {t.potmDescription || "Monthly excellence award for the squad member with standout performance, goals, and leadership."}
            </p>

            {/* SPOTLIGHT WINNER CARD (OR NOT DETECTED) */}
            {latestPotm ? (
              <div className="relative rounded-2xl bg-black/70 border border-[#FFD700]/40 p-4 sm:p-5 space-y-4 shadow-inner">
                {/* Prominent Card Date Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-[#FFD700] font-bold">
                    <Calendar className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span>{lang === 'ar' ? 'فترة الجائزة:' : 'Award Period:'}</span>
                    <span className="text-white px-2 py-0.5 rounded bg-white/10 font-black">{latestPotm.dateDisplay}</span>
                  </div>
                  <span className="text-[10px] text-white/50">
                    {latestPotm.awardedAt ? new Date(latestPotm.awardedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : latestPotm.datePeriod}
                  </span>
                </div>

                {latestPotm.playerId === 'NOT_DETECTED' ? (
                  // NOT DETECTED VIEW
                  <div className="py-6 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-dashed border-amber-400/50 mx-auto flex items-center justify-center text-amber-400">
                      <HelpCircle className="w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-mono font-bold uppercase inline-flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{latestPotm.dateDisplay} • {t.notDetectedBadge || "Not Detected (Pending)"}</span>
                      </span>
                      <h4 className="text-base font-black text-white mt-2">{t.pendingAnnouncement || "Winner Pending Announcement"}</h4>
                      <p className="text-xs text-white/50 max-w-xs mx-auto mt-1">
                        {latestPotm.notes || (t.notDetectedDesc || "Winner has not been selected yet for this period. Awaiting Captain's decision.")}
                      </p>
                    </div>
                  </div>
                ) : (
                  // WINNER DETECTED VIEW
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar with luxury golden ring */}
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#FFD700] via-[#D4AF37] to-[#806010] text-black font-black text-xl sm:text-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.5)] ring-2 ring-[#FFD700]">
                          {latestPotm.playerAvatar || 'POTM'}
                        </div>
                        <div className="absolute -bottom-2 -right-1 bg-black text-[#FFD700] p-1 rounded-full border border-[#FFD700] shadow-md">
                          <Crown className="w-4 h-4 fill-[#FFD700]" />
                        </div>
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-[#FFD700] font-mono font-extrabold uppercase tracking-wider">
                          <Star className="w-3 h-3 fill-[#FFD700]" />
                          <span>{t.awardWinner || "WINNER SPOTLIGHT"}</span>
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                          {latestPotm.playerName}
                        </h4>
                        {latestPotm.playerPos && (
                          <span className="text-[11px] text-white/50 font-mono uppercase bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                            {latestPotm.playerPos}
                          </span>
                        )}
                      </div>

                      {/* Rating Badge */}
                      {latestPotm.statRating !== undefined && latestPotm.statRating > 0 && (
                        <div className="shrink-0 text-center bg-gradient-to-b from-[#FFD700]/20 to-black p-2.5 rounded-2xl border border-[#FFD700]/50 shadow-md">
                          <span className="text-[9px] text-[#FFD700] font-mono uppercase font-bold block">{t.ratingInPeriod || "Rating"}</span>
                          <span className="text-lg font-black font-mono text-[#FFD700]">⭐ {latestPotm.statRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 font-mono">
                      <div className="bg-white/5 p-2.5 rounded-xl text-center border border-white/5">
                        <span className="text-[10px] text-white/40 uppercase block">{t.goalsInPeriod || "Goals"}</span>
                        <span className="text-base font-black text-[#FFD700]">⚽ {latestPotm.statGoals ?? 0}</span>
                      </div>
                      <div className="bg-white/5 p-2.5 rounded-xl text-center border border-white/5">
                        <span className="text-[10px] text-white/40 uppercase block">{t.assistsInPeriod || "Assists"}</span>
                        <span className="text-base font-black text-blue-400">🅰️ {latestPotm.statAssists ?? 0}</span>
                      </div>
                      <div className="bg-white/5 p-2.5 rounded-xl text-center border border-white/5">
                        <span className="text-[10px] text-white/40 uppercase block">{t.matchesInPeriod || "Matches"}</span>
                        <span className="text-base font-black text-emerald-400">🏟️ {latestPotm.statMatches ?? 0}</span>
                      </div>
                    </div>

                    {/* Citation Notes */}
                    {latestPotm.notes && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-white/80 italic leading-relaxed">
                        "{latestPotm.notes}"
                      </div>
                    )}
                  </div>
                )}

                {/* Card Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleShareAward(latestPotm)}
                    className="text-xs text-[#FFD700] hover:text-white font-mono flex items-center gap-1.5 transition-colors p-1"
                  >
                    {copiedId === latestPotm.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">{lang === 'ar' ? 'تم النسخ!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'مشاركة البطاقة' : 'Share Card'}</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(latestPotm)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title={t.editAwardBtn || "Edit"}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {isMasterUser && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAward(latestPotm.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                        title={t.deleteAwardBtn || "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-white/40 bg-black/40 rounded-2xl border border-dashed border-white/10">
                {t.noAwardsLoggedCategory || "No awards recorded in this category yet."}
              </div>
            )}
          </div>

          {/* Quick Action Footer */}
          <div className="pt-4 mt-4 border-t border-white/10 flex justify-end relative z-10">
            <button
              type="button"
              onClick={() => handleOpenCreateModal('PLAYER_OF_THE_MONTH')}
              className="w-full sm:w-auto px-4 py-2 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border border-[#FFD700]/40 text-[#FFD700] hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تسجيل لاعب شهر جديد' : 'Log New POTM'}</span>
            </button>
          </div>
        </motion.div>


        {/* ================= SECTION 2: GOLDEN BOOT ================= */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          onClick={() => latestGoldenBoot && setSelectedAwardId(selectedAwardId === latestGoldenBoot.id ? null : latestGoldenBoot.id)}
          className={`relative rounded-3xl bg-gradient-to-b from-[#201304] via-[#120a02] to-[#0a0a0a] border-2 cursor-pointer transition-all duration-300 ${
            latestGoldenBoot && selectedAwardId === latestGoldenBoot.id
              ? 'award-gold-pulse ring-2 ring-amber-400/70'
              : latestGoldenBoot?.playerId === 'NOT_DETECTED'
                ? 'border-amber-500/40 hover:border-amber-400 hover:shadow-[0_12px_45px_rgba(245,158,11,0.25)]'
                : 'border-amber-400/70 hover:border-amber-400 hover:shadow-[0_12px_45px_rgba(245,158,11,0.35)]'
          } p-5 sm:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden group`}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/25 transition-all duration-500" />

          <div className="space-y-4 relative z-10">
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-black flex items-center justify-center shadow-md">
                  <Flame className="w-5 h-5 fill-black text-black" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider block">
                    SECTION 2 • GOLDEN BOOT
                  </span>
                  <h3 className="text-lg font-black text-white">{t.goldenBoot || "Golden Boot Trophy"}</h3>
                </div>
              </div>

              {latestGoldenBoot && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-mono font-black shadow-sm">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{latestGoldenBoot.dateDisplay}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              {t.goldenBootDescription || "The prestigious Golden Boot trophy awarded to the squad's top goalscorer."}
            </p>

            {/* SPOTLIGHT WINNER CARD (OR NOT DETECTED) */}
            {latestGoldenBoot ? (
              <div className="relative rounded-2xl bg-black/70 border border-amber-500/40 p-4 sm:p-5 space-y-4 shadow-inner">
                {/* Prominent Card Date Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'ar' ? 'فترة الجائزة:' : 'Award Period:'}</span>
                    <span className="text-white px-2 py-0.5 rounded bg-white/10 font-black">{latestGoldenBoot.dateDisplay}</span>
                  </div>
                  <span className="text-[10px] text-white/50">
                    {latestGoldenBoot.awardedAt ? new Date(latestGoldenBoot.awardedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : latestGoldenBoot.datePeriod}
                  </span>
                </div>

                {latestGoldenBoot.playerId === 'NOT_DETECTED' ? (
                  // NOT DETECTED VIEW
                  <div className="py-6 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-dashed border-amber-400/50 mx-auto flex items-center justify-center text-amber-400">
                      <HelpCircle className="w-8 h-8 animate-pulse" />
                    </div>
                    <div>
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-mono font-bold uppercase inline-flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{latestGoldenBoot.dateDisplay} • {t.notDetectedBadge || "Not Detected (Pending)"}</span>
                      </span>
                      <h4 className="text-base font-black text-white mt-2">{t.pendingAnnouncement || "Winner Pending Announcement"}</h4>
                      <p className="text-xs text-white/50 max-w-xs mx-auto mt-1">
                        {latestGoldenBoot.notes || (t.notDetectedDesc || "Winner has not been selected yet for this period. Awaiting Captain's decision.")}
                      </p>
                    </div>
                  </div>
                ) : (
                  // WINNER DETECTED VIEW
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {/* Golden Boot Visual Badge */}
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-700 text-black font-black text-xl sm:text-2xl flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.5)] ring-2 ring-amber-400">
                          {latestGoldenBoot.playerAvatar || '⚽'}
                        </div>
                        <div className="absolute -bottom-2 -right-1 bg-black text-amber-400 p-1 rounded-full border border-amber-400 shadow-md">
                          <Flame className="w-4 h-4 fill-amber-400" />
                        </div>
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono font-extrabold uppercase tracking-wider">
                          <Trophy className="w-3 h-3 fill-amber-400" />
                          <span>{t.awardWinner || "GOLDEN BOOT WINNER"}</span>
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                          {latestGoldenBoot.playerName}
                        </h4>
                        {latestGoldenBoot.playerPos && (
                          <span className="text-[11px] text-white/50 font-mono uppercase bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                            {latestGoldenBoot.playerPos}
                          </span>
                        )}
                      </div>

                      {/* Big Goals Counter Badge */}
                      <div className="shrink-0 text-center bg-gradient-to-b from-amber-500/20 to-black p-2.5 rounded-2xl border border-amber-400/50 shadow-md min-w-[70px]">
                        <span className="text-[9px] text-amber-400 font-mono uppercase font-bold block">{t.goals || "GOALS"}</span>
                        <span className="text-2xl font-black font-mono text-amber-300">⚽ {latestGoldenBoot.statGoals ?? 0}</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 font-mono">
                      <div className="bg-white/5 p-2.5 rounded-xl text-center border border-white/5">
                        <span className="text-[10px] text-white/40 uppercase block">{t.goalsInPeriod || "Total Goals"}</span>
                        <span className="text-base font-black text-amber-400">⚽ {latestGoldenBoot.statGoals ?? 0}</span>
                      </div>
                      <div className="bg-white/5 p-2.5 rounded-xl text-center border border-white/5">
                        <span className="text-[10px] text-white/40 uppercase block">{t.assistsInPeriod || "Assists"}</span>
                        <span className="text-base font-black text-blue-400">🅰️ {latestGoldenBoot.statAssists ?? 0}</span>
                      </div>
                      <div className="bg-white/5 p-2.5 rounded-xl text-center border border-white/5">
                        <span className="text-[10px] text-white/40 uppercase block">{t.matchesInPeriod || "Matches"}</span>
                        <span className="text-base font-black text-emerald-400">🏟️ {latestGoldenBoot.statMatches ?? 0}</span>
                      </div>
                    </div>

                    {/* Citation Notes */}
                    {latestGoldenBoot.notes && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-white/80 italic leading-relaxed">
                        "{latestGoldenBoot.notes}"
                      </div>
                    )}
                  </div>
                )}

                {/* Card Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleShareAward(latestGoldenBoot)}
                    className="text-xs text-amber-400 hover:text-white font-mono flex items-center gap-1.5 transition-colors p-1"
                  >
                    {copiedId === latestGoldenBoot.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">{lang === 'ar' ? 'تم النسخ!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'مشاركة البطاقة' : 'Share Card'}</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(latestGoldenBoot)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title={t.editAwardBtn || "Edit"}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {isMasterUser && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAward(latestGoldenBoot.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                        title={t.deleteAwardBtn || "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-white/40 bg-black/40 rounded-2xl border border-dashed border-white/10">
                {t.noAwardsLoggedCategory || "No awards recorded in this category yet."}
              </div>
            )}
          </div>

          {/* Quick Action Footer */}
          <div className="pt-4 mt-4 border-t border-white/10 flex justify-end relative z-10">
            <button
              type="button"
              onClick={() => handleOpenCreateModal('GOLDEN_BOOT')}
              className="w-full sm:w-auto px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تسجيل حذاء ذهبي جديد' : 'Log New Golden Boot'}</span>
            </button>
          </div>
        </motion.div>

      </div>

      {/* AWARDS HISTORY & HALL OF FAME LIST */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-[#FFD700]" />
            <h3 className="text-lg font-black text-white">{t.awardsHallOfFame || "Awards History & Hall of Fame"}</h3>
          </div>
          <span className="text-xs font-mono text-white/40">
            {filteredAwards.length} {lang === 'ar' ? 'سجل' : 'Records'}
          </span>
        </div>

        {filteredAwards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAwards.map((award) => {
              const isNotDetected = award.playerId === 'NOT_DETECTED';
              const isPotm = award.type === 'PLAYER_OF_THE_MONTH';

              return (
                <motion.div
                  key={award.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  onClick={() => setSelectedAwardId(selectedAwardId === award.id ? null : award.id)}
                  className={`bg-[#111] border-2 cursor-pointer transition-all duration-300 ${
                    selectedAwardId === award.id
                      ? 'award-gold-pulse ring-2 ring-[#FFD700]/70 z-10'
                      : isNotDetected 
                        ? 'border-white/10 hover:border-white/30 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]' 
                        : (isPotm 
                            ? 'border-[#FFD700]/40 hover:border-[#FFD700] hover:shadow-[0_10px_35px_rgba(255,215,0,0.28)]' 
                            : 'border-amber-400/40 hover:border-amber-400 hover:shadow-[0_10px_35px_rgba(245,158,11,0.28)]')
                  } rounded-2xl p-4 space-y-3 relative overflow-hidden group`}
                >
                  {/* Top Date Header Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-mono">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Calendar className={`w-3.5 h-3.5 ${isPotm ? 'text-[#FFD700]' : 'text-amber-400'}`} />
                      <span className="text-white/60">{lang === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                      <span className={`px-2 py-0.5 rounded font-black ${
                        isPotm ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {award.dateDisplay}
                      </span>
                    </div>
                    {award.awardedAt && (
                      <span className="text-[10px] text-white/40">
                        {new Date(award.awardedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-black font-black text-sm shrink-0 shadow-md ${
                        isNotDetected 
                          ? 'bg-white/10 text-white/60 border border-white/20' 
                          : (isPotm ? 'bg-gradient-to-tr from-[#D4AF37] to-[#FFD700]' : 'bg-gradient-to-tr from-amber-500 to-yellow-300')
                      }`}>
                        {isNotDetected ? '?' : award.playerAvatar}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase ${
                            isPotm ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isPotm ? '⭐ POTM' : '👟 GOLDEN BOOT'}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-white mt-1">
                          {isNotDetected ? (lang === 'ar' ? 'غير محدد (قيد التحديد)' : 'Not Detected') : award.playerName}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleShareAward(award)}
                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        title="Share"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(award)}
                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {isMasterUser && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAward(award.id)}
                          className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title={t.deleteAwardBtn || "Delete"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Stats Strip */}
                  <div className="flex items-center justify-between text-xs font-mono bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                    <span className="text-amber-300 font-bold">⚽ {award.statGoals ?? 0} Goals</span>
                    <span className="text-blue-400 font-bold">🅰️ {award.statAssists ?? 0} Assists</span>
                    {award.statRating !== undefined && award.statRating > 0 && (
                      <span className="text-[#FFD700] font-bold">⭐ {award.statRating.toFixed(1)}</span>
                    )}
                  </div>

                  {award.notes && (
                    <p className="text-[11px] text-white/60 italic line-clamp-2">
                      "{award.notes}"
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#111] border border-white/5 rounded-3xl text-white/40 text-xs">
            {t.noAwardsLoggedCategory || "No awards recorded yet."}
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD / EDIT INDIVIDUAL AWARD ================= */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-[#D4AF37]/50 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-[0_15px_60px_rgba(0,0,0,0.95)] space-y-5 my-auto relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#FFD700] text-black font-black flex items-center justify-center shadow-md">
                    <Trophy className="w-5 h-5 fill-black" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {editingAward ? (t.editAwardBtn || "Edit Individual Award") : (t.addNewAward || "Log Individual Award")}
                    </h3>
                    <p className="text-xs text-white/50 font-mono">
                      {t.syncedGloballyNotice || "Syncs live to all devices and accounts worldwide"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveAward} className="space-y-4">
                {/* Award Type Selection */}
                <div>
                  <label className="text-[10px] uppercase text-white/40 mb-1.5 block font-mono font-bold">
                    {t.awardStatus || "Award Category"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormType('PLAYER_OF_THE_MONTH')}
                      className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                        formType === 'PLAYER_OF_THE_MONTH'
                          ? 'bg-[#FFD700] text-black border-[#FFD700] shadow-md'
                          : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                      <span>{t.playerOfTheMonth || "Player of the Month"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormType('GOLDEN_BOOT')}
                      className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                        formType === 'GOLDEN_BOOT'
                          ? 'bg-amber-400 text-black border-amber-400 shadow-md'
                          : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Flame className="w-4 h-4 fill-current" />
                      <span>{t.goldenBoot || "Golden Boot"}</span>
                    </button>
                  </div>
                </div>

                {/* DATE SECTION */}
                <div className="space-y-2 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase text-[#D4AF37] font-mono font-bold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{t.dateSection || "Date & Period Section"}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Period Preset Dropdown */}
                    <div>
                      <span className="text-[9px] text-white/40 block mb-1 font-mono">{t.selectMonthYear || "Month / Period Preset"}</span>
                      <select
                        value={formDatePeriod}
                        onChange={(e) => setFormDatePeriod(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                      >
                        {monthOptions.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-[#161616] text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Date Label / Month Text */}
                    <div>
                      <span className="text-[9px] text-white/40 block mb-1 font-mono">{t.customDatePeriod || "Custom Display (Optional)"}</span>
                      <input
                        type="text"
                        value={formCustomDate}
                        onChange={(e) => setFormCustomDate(e.target.value)}
                        placeholder="e.g. August 2026 / أغسطس 2026"
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>

                {/* CHOOSING PLAYER SECTION WITH 'NOT DETECTED' OPTION */}
                <div className="space-y-2.5 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase text-[#FFD700] font-mono font-bold flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{t.choosePlayerForAward || "Choosing Player for the Award"}</span>
                    </label>

                    {/* Auto Suggest Top Scorer helper */}
                    <button
                      type="button"
                      onClick={handleAutoSuggestTopScorer}
                      className="text-[10px] text-[#FFD700] hover:underline font-mono flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-[#FFD700]" />
                      <span>{t.autoSuggestTopScorer || "Auto-Fill Top Scorer"}</span>
                    </button>
                  </div>

                  {/* Primary Dropdown */}
                  <select
                    value={formPlayerId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormPlayerId(val);
                      if (val !== 'NOT_DETECTED') {
                        const p = players.find(player => player.id === val);
                        if (p) {
                          setFormGoals(p.goals || 0);
                          setFormAssists(p.assists || 0);
                          setFormMatches(p.matchesPlayed || 1);
                        }
                      }
                    }}
                    className={`w-full bg-black/70 border rounded-xl px-3 py-3 text-xs font-bold focus:outline-none ${
                      formPlayerId === 'NOT_DETECTED'
                        ? 'border-amber-400/80 text-amber-300'
                        : 'border-[#D4AF37] text-white'
                    }`}
                  >
                    {/* CRITICAL: "NOT DETECTED" OPTION */}
                    <option value="NOT_DETECTED" className="bg-[#1c1402] text-amber-300 font-bold">
                      ❓ {t.notDetected || "Not Detected / Undetermined (لم يُحدد بعد)"}
                    </option>

                    {/* Squad Players */}
                    {players.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#161616] text-white">
                        ⚽ {p.name} ({p.position || 'Player'}) - {p.goals} Goals, {p.assists} Assists
                      </option>
                    ))}
                  </select>

                  {/* Quick Select Grid for Players & Not Detected */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                    {/* Not Detected Button */}
                    <button
                      type="button"
                      onClick={() => setFormPlayerId('NOT_DETECTED')}
                      className={`p-2 rounded-xl text-[11px] font-bold text-center border flex flex-col items-center gap-1 transition-all ${
                        formPlayerId === 'NOT_DETECTED'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                          : 'bg-black/40 border-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span className="truncate w-full">{lang === 'ar' ? 'غير محدد' : 'Not Detected'}</span>
                    </button>

                    {/* First 3 players */}
                    {players.slice(0, 7).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setFormPlayerId(p.id);
                          setFormGoals(p.goals || 0);
                          setFormAssists(p.assists || 0);
                          setFormMatches(p.matchesPlayed || 1);
                        }}
                        className={`p-2 rounded-xl text-[11px] font-bold text-center border flex flex-col items-center gap-1 transition-all ${
                          formPlayerId === p.id
                            ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] ring-1 ring-[#D4AF37]'
                            : 'bg-black/40 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-white/10 text-[9px] flex items-center justify-center font-black">
                          {p.avatar}
                        </span>
                        <span className="truncate w-full">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* STATS & CITATION (Visible even if Not Detected for future placeholder stats) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[9px] uppercase text-white/40 block mb-1 font-mono">{t.goalsInPeriod || "Goals"}</label>
                    <input
                      type="number"
                      min="0"
                      value={formGoals}
                      onChange={(e) => setFormGoals(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase text-white/40 block mb-1 font-mono">{t.assistsInPeriod || "Assists"}</label>
                    <input
                      type="number"
                      min="0"
                      value={formAssists}
                      onChange={(e) => setFormAssists(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase text-white/40 block mb-1 font-mono">{t.matchesInPeriod || "Matches"}</label>
                    <input
                      type="number"
                      min="0"
                      value={formMatches}
                      onChange={(e) => setFormMatches(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase text-white/40 block mb-1 font-mono">{t.ratingInPeriod || "Rating"}</label>
                    <input
                      type="number"
                      min="1.0"
                      max="10.0"
                      step="0.1"
                      value={formRating}
                      onChange={(e) => setFormRating(parseFloat(e.target.value) || 9.0)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Notes & Citation */}
                <div>
                  <label className="text-[10px] uppercase text-white/40 mb-1 block font-mono font-bold">
                    {t.awardNotes || "Award Citation & Highlights"}
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder={t.awardNotesPlaceholder || "e.g. Masterclass performance, clutch decisive goals..."}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:from-[#c2a030] hover:to-[#e6c200] text-black font-extrabold text-xs rounded-xl uppercase tracking-wider shadow-md flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{t.saveAndPublishAward || "Save & Sync Award"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
