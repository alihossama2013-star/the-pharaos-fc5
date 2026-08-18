import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  Sparkles, 
  Download, 
  Edit3, 
  Save, 
  X, 
  Crown, 
  Zap, 
  ShieldCheck, 
  Star, 
  CheckCircle2, 
  User, 
  Image as ImageIcon,
  Flame,
  Award
} from 'lucide-react';
import { db, doc, setDoc, collection, onSnapshot, handleFirestoreError, removeUndefinedFields, OperationType } from '../lib/firebase';
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

export interface FcCardData {
  playerId: string;
  ovr: number;
  position: string;
  edition: string;
  theme: 'gold' | 'crimson' | 'emerald' | 'purple';
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  skillMoves: number;
  weakFoot: number;
  photoUrl?: string;
}

interface FcMobileCardsSectionProps {
  players: Player[];
  currentUser: { username: string; name: string } | null;
  isMasterUser: boolean;
  lang: 'ar' | 'en';
  t: Record<string, string>;
}

// Default presets for built-in players or fallbacks
const DEFAULT_CARD_PRESETS: Record<string, Partial<FcCardData>> = {
  'ali hossam': {
    ovr: 96,
    position: 'ST',
    edition: 'PHARAOH PRIME ICON',
    theme: 'gold',
    pac: 96,
    sho: 97,
    pas: 92,
    dri: 95,
    def: 52,
    phy: 88,
    skillMoves: 5,
    weakFoot: 5
  },
  'yassen amr': {
    ovr: 93,
    position: 'CM',
    edition: 'PHARAOH MASTER',
    theme: 'gold',
    pac: 88,
    sho: 89,
    pas: 95,
    dri: 93,
    def: 84,
    phy: 85,
    skillMoves: 4,
    weakFoot: 5
  },
  'sief ahmed': {
    ovr: 92,
    position: 'RW',
    edition: 'TOTW GOLD',
    theme: 'gold',
    pac: 96,
    sho: 88,
    pas: 89,
    dri: 94,
    def: 45,
    phy: 78,
    skillMoves: 5,
    weakFoot: 4
  },
  'ali mohamed': {
    ovr: 91,
    position: 'CAM',
    edition: 'BLACK DIAMOND',
    theme: 'purple',
    pac: 87,
    sho: 86,
    pas: 93,
    dri: 92,
    def: 65,
    phy: 80,
    skillMoves: 4,
    weakFoot: 4
  },
  'ahmed hossam': {
    ovr: 94,
    position: 'CB',
    edition: 'PHARAOH SHIELD',
    theme: 'emerald',
    pac: 86,
    sho: 72,
    pas: 85,
    dri: 83,
    def: 96,
    phy: 93,
    skillMoves: 3,
    weakFoot: 4
  },
  'yaseen': {
    ovr: 91,
    position: 'ST',
    edition: 'FUTURE STAR',
    theme: 'crimson',
    pac: 93,
    sho: 91,
    pas: 82,
    dri: 89,
    def: 42,
    phy: 83,
    skillMoves: 4,
    weakFoot: 4
  }
};

function getDefaultCardData(player: Player): FcCardData {
  const usernameKey = player.username.toLowerCase();
  const preset = DEFAULT_CARD_PRESETS[usernameKey];

  return {
    playerId: player.id,
    ovr: preset?.ovr || Math.min(99, 85 + (player.goals * 2) + player.assists),
    position: preset?.position || player.position || 'ST',
    edition: preset?.edition || 'PHARAOHS FC EDITION',
    theme: preset?.theme || 'gold',
    pac: preset?.pac || 88,
    sho: preset?.sho || Math.min(99, 80 + player.goals * 3),
    pas: preset?.pas || Math.min(99, 80 + player.assists * 3),
    dri: preset?.dri || 87,
    def: preset?.def || 60,
    phy: preset?.phy || 82,
    skillMoves: preset?.skillMoves || 4,
    weakFoot: preset?.weakFoot || 4,
    photoUrl: preset?.photoUrl || ''
  };
}

export const FcMobileCardsSection: React.FC<FcMobileCardsSectionProps> = ({
  players,
  currentUser,
  isMasterUser,
  lang,
  t
}) => {
  const [cardsData, setCardsData] = useState<Record<string, FcCardData>>({});
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FcCardData | null>(null);
  const [exportingPlayerId, setExportingPlayerId] = useState<string | null>(null);
  const [isSavingCard, setIsSavingCard] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to safely parse and clamp numeric values
  const parseSafeNum = (val: any, min: number, max: number, defaultVal: number): number => {
    if (val === '' || val === null || val === undefined) return defaultVal;
    const num = typeof val === 'number' ? val : parseInt(String(val), 10);
    if (isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(max, num));
  };

  // Firestore real-time collection sync for FC Mobile cards across all devices & accounts
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onSnapshot(collection(db, 'fc_mobile_cards'), (snapshot) => {
        if (!snapshot.empty) {
          const updated: Record<string, FcCardData> = {};
          snapshot.forEach((docSnap) => {
            if (docSnap.id === 'all_player_cards') {
              const data = docSnap.data();
              if (data && typeof data === 'object') {
                Object.keys(data).forEach((k) => {
                  if (data[k] && typeof data[k] === 'object') {
                    updated[k] = data[k] as FcCardData;
                  }
                });
              }
            } else {
              const card = docSnap.data() as FcCardData;
              updated[docSnap.id] = card;
              if (card.playerId) {
                updated[card.playerId] = card;
              }
            }
          });
          setCardsData(prev => ({ ...prev, ...updated }));
          try {
            localStorage.setItem('pharaohs_fc_mobile_cards', JSON.stringify(updated));
          } catch (e) {}
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'fc_mobile_cards');
      });
    } catch (e) {
      console.warn('FC Cards listener init warning:', e);
    }

    // Load local cache if available
    try {
      const saved = localStorage.getItem('pharaohs_fc_mobile_cards');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCardsData(prev => ({ ...parsed, ...prev }));
      }
    } catch (e) {}

    return () => unsub();
  }, []);

  const getPlayerCard = (player: Player): FcCardData => {
    if (cardsData[player.id]) {
      return cardsData[player.id];
    }
    if (player.username && cardsData[player.username.toLowerCase()]) {
      return cardsData[player.username.toLowerCase()];
    }
    return getDefaultCardData(player);
  };

  const canEditCard = (player: Player) => {
    return isMasterUser || (currentUser && currentUser.username.toLowerCase() === player.username.toLowerCase());
  };

  const handleOpenEdit = (player: Player) => {
    if (!canEditCard(player)) return;
    const card = getPlayerCard(player);
    setEditForm({ ...card, playerId: player.id });
    setEditingPlayerId(player.id);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editForm) return;

    if (!file.type.startsWith('image/')) {
      alert(lang === 'ar' ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320; // Lightweight & high-res for portrait card
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
          setEditForm(prev => prev ? { ...prev, photoUrl: compressedDataUrl } : null);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCard = async () => {
    if (!editForm || !editingPlayerId) return;
    const targetPlayer = players.find(p => p.id === editingPlayerId);
    if (!targetPlayer) return;

    setIsSavingCard(true);

    // Sanitize and normalize card data
    const sanitizedCard: FcCardData = {
      playerId: targetPlayer.id,
      ovr: parseSafeNum(editForm.ovr, 70, 99, 88),
      position: (editForm.position || targetPlayer.position || 'ST').trim().toUpperCase(),
      edition: (editForm.edition || 'PHARAOHS FC EDITION').trim(),
      theme: editForm.theme || 'gold',
      pac: parseSafeNum(editForm.pac, 1, 99, 85),
      sho: parseSafeNum(editForm.sho, 1, 99, 85),
      pas: parseSafeNum(editForm.pas, 1, 99, 85),
      dri: parseSafeNum(editForm.dri, 1, 99, 85),
      def: parseSafeNum(editForm.def, 1, 99, 60),
      phy: parseSafeNum(editForm.phy, 1, 99, 80),
      skillMoves: parseSafeNum(editForm.skillMoves, 1, 5, 4),
      weakFoot: parseSafeNum(editForm.weakFoot, 1, 5, 4),
      photoUrl: (editForm.photoUrl || '').trim()
    };

    const cleanedData = removeUndefinedFields(sanitizedCard);

    const updatedCards = {
      ...cardsData,
      [targetPlayer.id]: sanitizedCard,
      [targetPlayer.username.toLowerCase()]: sanitizedCard
    };

    setCardsData(updatedCards);

    // Persist to local storage
    try {
      localStorage.setItem('pharaohs_fc_mobile_cards', JSON.stringify(updatedCards));
    } catch (e) {}

    // Persist to Firestore (Syncs live globally to all accounts)
    try {
      // 1. Save to individual player id document
      await setDoc(doc(db, 'fc_mobile_cards', targetPlayer.id), cleanedData, { merge: true });
      
      // 2. Save to username document
      if (targetPlayer.username) {
        await setDoc(doc(db, 'fc_mobile_cards', targetPlayer.username.toLowerCase()), cleanedData, { merge: true });
      }

      // 3. Save into summary document (exclude giant images from summary doc to avoid 1MB limit)
      const summaryCard = {
        ...cleanedData,
        photoUrl: cleanedData.photoUrl && cleanedData.photoUrl.length > 50000 ? '' : cleanedData.photoUrl
      };
      await setDoc(doc(db, 'fc_mobile_cards', 'all_player_cards'), {
        [targetPlayer.id]: summaryCard,
        [targetPlayer.username.toLowerCase()]: summaryCard
      }, { merge: true });

      setToastMessage(lang === 'ar' ? '✅ تم حفظ بطاقة FC ومزامنتها عالمياً!' : '✅ FC Card Saved & Synced Globally!');
      setEditingPlayerId(null);
      setEditForm(null);
    } catch (e) {
      console.error('Error saving FC card:', e);
      handleFirestoreError(e, OperationType.WRITE, `fc_mobile_cards/${targetPlayer.id}`);
      setToastMessage(lang === 'ar' ? '⚠️ تم الحفظ محلياً' : '⚠️ Saved locally');
    } finally {
      setIsSavingCard(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Export card as PNG using html2canvas with high scale & fallback
  const handleExportPNG = async (player: Player) => {
    const cardEl = cardRefs.current[player.id];
    if (!cardEl) return;

    setExportingPlayerId(player.id);

    try {
      // Temporary style adjustments for optimal html2canvas rendering
      const canvas = await html2canvas(cardEl, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      const cleanName = player.name.replace(/\s+/g, '_');
      link.download = `${cleanName}_FC_Mobile_Card.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToastMessage(`Downloaded ${player.name}'s FC Card!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('HTML2Canvas export error:', err);
      // Fallback: pure HTML5 Canvas renderer
      renderCanvasFallback(player, getPlayerCard(player));
    } finally {
      setExportingPlayerId(null);
    }
  };

  // HTML5 Canvas fallback renderer
  const renderCanvasFallback = (player: Player, card: FcCardData) => {
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw Obsidian Black Card Frame
    const grad = ctx.createLinearGradient(0, 0, 750, 1100);
    grad.addColorStop(0, '#0a0a0c');
    grad.addColorStop(0.5, '#141419');
    grad.addColorStop(1, '#050507');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 750, 1100);

    // Gold Border
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 730, 1080);

    // Player Name on top
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(player.name.toUpperCase(), 375, 90);

    // OVR & Position
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(card.ovr), 60, 180);
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(card.position, 60, 230);

    // Edition
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.fillText(card.edition, 375, 290);

    // Stats Grid
    const stats = [
      { label: 'PAC', val: card.pac },
      { label: 'DRI', val: card.dri },
      { label: 'SHO', val: card.sho },
      { label: 'DEF', val: card.def },
      { label: 'PAS', val: card.pas },
      { label: 'PHY', val: card.phy }
    ];

    ctx.font = 'bold 38px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    stats.forEach((st, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = col === 0 ? 180 : 500;
      const y = 650 + (row * 80);
      ctx.fillText(`${st.val} ${st.label}`, x, y);
    });

    // Footer
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.fillText('THE PHARAOHS FC • EA FC MOBILE', 375, 1030);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${player.name.replace(/\s+/g, '_')}_FC_Mobile_Card.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#D4AF37] text-black font-extrabold text-xs px-5 py-3 rounded-2xl shadow-[0_0_25px_rgba(212,175,55,0.6)] flex items-center gap-2 border border-black/20"
          >
            <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-black via-[#0d0d0d] to-[#121008] p-5 sm:p-6 rounded-3xl border border-[#D4AF37]/30 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase bg-[#D4AF37] text-black px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1 shadow-sm">
              <Zap className="w-3 h-3 fill-black text-[#D4AF37]" />
              EA FC MOBILE CARDS
            </span>
            {isMasterUser && (
              <span className="text-[10px] font-mono font-bold bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" />
                Master Creator
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF] via-[#D4AF37] to-[#FFD700] tracking-tight">
            {t.fcCardsTitle || "EA FC Mobile Player Cards"}
          </h2>
          <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
            {t.fcCardsSubtitle || "Custom black cards crafted for every player by Ali Hossam. Export as high-res PNG image!"}
          </p>

          <div className="pt-2 text-[11px] font-mono flex items-center gap-2 text-white/50 bg-black/40 p-2.5 rounded-xl border border-white/5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>
              {isMasterUser 
                ? (t.masterCardCreatorNotice || "👑 Captain Ali Hossam Master Creator: You can design & edit FC Mobile Card stats, edition title, and ratings for all players.") 
                : (t.restrictedCardNotice || "Card stats & customization are crafted by Captain Ali Hossam. You can view & download your card as a PNG image.")}
            </span>
          </div>
        </div>
      </div>

      {/* Cards Masonry Grid with Staggered Entrance Animation */}
      <motion.div 
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
        initial="hidden"
        animate="show"
        className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 [&>div]:break-inside-avoid"
      >
        {players.map((player) => {
          const card = getPlayerCard(player);
          const isUserCard = currentUser?.username === player.username;

          // Theme styling presets
          const themeStyles = {
            gold: {
              border: 'border-[#D4AF37]',
              glow: 'shadow-[0_0_35px_rgba(212,175,55,0.25)]',
              badgeBg: 'bg-gradient-to-br from-[#FFD700] via-[#D4AF37] to-[#997A15]',
              textGold: 'text-[#FFD700]',
              topGlow: 'from-[#D4AF37]/20 via-[#FFD700]/10 to-transparent'
            },
            crimson: {
              border: 'border-red-500',
              glow: 'shadow-[0_0_35px_rgba(239,68,68,0.25)]',
              badgeBg: 'bg-gradient-to-br from-red-500 via-red-700 to-black',
              textGold: 'text-red-400',
              topGlow: 'from-red-600/20 via-red-500/10 to-transparent'
            },
            emerald: {
              border: 'border-emerald-500',
              glow: 'shadow-[0_0_35px_rgba(16,185,129,0.25)]',
              badgeBg: 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-black',
              textGold: 'text-emerald-400',
              topGlow: 'from-emerald-500/20 via-emerald-400/10 to-transparent'
            },
            purple: {
              border: 'border-purple-500',
              glow: 'shadow-[0_0_35px_rgba(168,85,247,0.25)]',
              badgeBg: 'bg-gradient-to-br from-purple-400 via-purple-700 to-black',
              textGold: 'text-purple-300',
              topGlow: 'from-purple-500/20 via-purple-400/10 to-transparent'
            }
          };

          const currentTheme = themeStyles[card.theme || 'gold'];

          return (
            <motion.div 
              key={player.id} 
              variants={{
                hidden: { opacity: 0, y: 24, scale: 0.94 },
                show: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: { type: 'spring', stiffness: 280, damping: 22 }
                }
              }}
              className="break-inside-avoid inline-block w-full max-w-[340px] mx-auto space-y-3 mb-6"
            >
              
              {/* THE BLACK FC MOBILE CARD (Export Target in 9:16 Vertical Screen Space) */}
              <div 
                ref={(el) => { cardRefs.current[player.id] = el; }}
                className={`relative w-full aspect-[9/16] bg-[#070709] rounded-[28px] border-2 ${currentTheme.border} ${currentTheme.glow} p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none transition-transform hover:scale-[1.01]`}
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 20%, rgba(25,25,32,1) 0%, rgba(7,7,9,1) 100%)`
                }}
              >
                {/* Subtle Background EA FC Pattern Grid */}
                <div 
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(212,175,55,0.15) 1px, transparent 1px), linear-gradient(45deg, rgba(212,175,55,0.15) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                  }}
                />

                {/* Top Shield Accent Glow */}
                <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${currentTheme.topGlow} pointer-events-none`} />

                {/* 1. PLAYER NAME ON TOP (PROMINENT BANNER) */}
                <div className="relative z-10 w-full text-center pb-2 border-b border-white/10">
                  <div className="inline-block bg-black/70 px-4 py-1.5 rounded-2xl border border-white/15 shadow-inner">
                    <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF] via-[#FFD700] to-[#FFF] tracking-wider uppercase font-sans truncate drop-shadow">
                      {player.name}
                    </h3>
                  </div>
                  {isUserCard && (
                    <span className="text-[8px] font-mono uppercase font-bold text-[#D4AF37] block mt-0.5 tracking-widest">
                      ★ {t.you || "YOUR CARD"} ★
                    </span>
                  )}
                </div>

                {/* 2. CARD UPPER SECTION: OVR + POS & 9:16 PLAYER PORTRAIT */}
                <div className="relative z-10 grid grid-cols-12 gap-3 items-center my-2 flex-1">
                  
                  {/* Left Column: OVR Rating & Position */}
                  <div className="col-span-4 flex flex-col items-center justify-center space-y-1 bg-black/70 p-2.5 rounded-2xl border border-white/10 shadow-lg">
                    <span className={`text-3xl sm:text-4xl font-black font-serif ${currentTheme.textGold} tracking-tighter drop-shadow-md`}>
                      {card.ovr}
                    </span>
                    <span className="text-xs font-black text-white font-mono uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md">
                      {card.position}
                    </span>
                    
                    {/* Country / Team Badge */}
                    <div className="pt-1.5 flex flex-col items-center gap-1 border-t border-white/10 w-full mt-1">
                      <img 
                        src={teamLogo} 
                        alt="The Pharaohs FC" 
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 object-contain rounded-full border border-[#D4AF37]/50 shadow"
                      />
                      <span className="text-[8px] font-mono font-bold text-white/70 uppercase tracking-widest">EGY</span>
                    </div>
                  </div>

                  {/* Right Column: 9:16 Aspect Ratio Player Portrait Frame */}
                  <div className="col-span-8 flex justify-center items-center relative h-full min-h-[140px] sm:min-h-[160px]">
                    <div className="relative w-full aspect-[9/16] max-h-[185px] rounded-2xl p-1 bg-gradient-to-br from-[#D4AF37] via-white/20 to-black/80 shadow-2xl overflow-hidden border border-[#D4AF37]/40 flex items-center justify-center group">
                      {card.photoUrl ? (
                        <img 
                          src={card.photoUrl} 
                          alt={player.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#1a1810] via-[#0f0d08] to-[#0a0a0c] flex flex-col items-center justify-center text-[#D4AF37] border border-black/80 shadow-inner p-2">
                          <span className="font-black text-3xl sm:text-4xl drop-shadow">{player.avatar}</span>
                          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-1">PHARAOHS</span>
                        </div>
                      )}
                      
                      {/* Golden Ball Insignia */}
                      <img 
                        src={goldenBall} 
                        alt="Gold Ball" 
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 object-contain absolute bottom-1 right-1 drop-shadow-lg z-20 pointer-events-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. CARD EDITION TITLE */}
                <div className="relative z-10 text-center py-1">
                  <span className={`text-[10px] sm:text-[11px] font-black font-mono tracking-widest uppercase px-3 py-1 rounded-xl bg-black/80 border border-white/15 ${currentTheme.textGold} shadow-md`}>
                    {card.edition}
                  </span>
                </div>

                {/* 4. STATS BREAKDOWN GRID (6 Core FC Mobile Attributes) */}
                <div className="relative z-10 bg-black/75 rounded-2xl border border-white/10 p-2.5 space-y-1.5 shadow-inner">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
                    <div className="flex justify-between items-center border-b border-white/5 pb-0.5">
                      <span className="text-white/50 text-[10px] font-bold">PAC</span>
                      <span className="font-extrabold text-white">{card.pac}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-0.5">
                      <span className="text-white/50 text-[10px] font-bold">DRI</span>
                      <span className="font-extrabold text-white">{card.dri}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-0.5">
                      <span className="text-white/50 text-[10px] font-bold">SHO</span>
                      <span className="font-extrabold text-white">{card.sho}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-0.5">
                      <span className="text-white/50 text-[10px] font-bold">DEF</span>
                      <span className="font-extrabold text-white">{card.def}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/50 text-[10px] font-bold">PAS</span>
                      <span className="font-extrabold text-white">{card.pas}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/50 text-[10px] font-bold">PHY</span>
                      <span className="font-extrabold text-white">{card.phy}</span>
                    </div>
                  </div>

                  {/* Skill Moves & Weak Foot Stars */}
                  <div className="flex justify-around items-center pt-1.5 border-t border-white/10 text-[9px] font-mono text-white/60">
                    <div className="flex items-center gap-1">
                      <span>SM:</span>
                      <span className="text-[#FFD700] font-bold">{'★'.repeat(card.skillMoves)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>WF:</span>
                      <span className="text-[#FFD700] font-bold">{'★'.repeat(card.weakFoot)}</span>
                    </div>
                  </div>
                </div>

                {/* 5. CARD FOOTER BRANDING */}
                <div className="relative z-10 flex justify-between items-center pt-2 text-[8px] font-mono text-white/40 border-t border-white/5">
                  <span className="uppercase font-bold tracking-widest text-[#D4AF37]">THE PHARAOHS FC</span>
                  <span className="uppercase font-bold tracking-widest">EA FC MOBILE</span>
                </div>
              </div>

              {/* CARD ACTION BUTTONS */}
              <div className="flex items-center gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={() => handleExportPNG(player)}
                  disabled={exportingPlayerId === player.id}
                  className="flex-1 py-2 px-3 bg-[#D4AF37] hover:bg-[#FFD700] text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                  title={t.exportPngBtn || "Export Card as PNG"}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exportingPlayerId === player.id ? "Generating..." : (t.exportPngBtn || "Export PNG")}</span>
                </button>

                {canEditCard(player) && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(player)}
                    className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all shadow hover:border-[#D4AF37]"
                    title={t.editCardBtn || "Edit Card Stats"}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </button>
                )}
              </div>

            </motion.div>
          );
        })}
      </motion.div>

      {/* EDIT CARD & IMPORT PHOTO MODAL */}
      <AnimatePresence>
        {editingPlayerId && editForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#0e0e11] border border-[#D4AF37]/40 rounded-3xl p-5 sm:p-6 w-full max-w-lg space-y-4 text-white shadow-2xl relative my-8"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[#FFD700]" />
                  <h3 className="text-base font-bold text-[#D4AF37]">
                    {t.editCardBtn || "Edit Card Stats"} - {players.find(p => p.id === editingPlayerId)?.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingPlayerId(null); setEditForm(null); }}
                  className="p-1.5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                
                {/* 1. DEVICE PHOTO IMPORT SECTION */}
                <div className="bg-black/50 p-3.5 rounded-2xl border border-[#D4AF37]/30 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase text-[#FFD700] font-mono font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#FFD700]" />
                      <span>{t.importPhotoFromDevice || "📸 Import Photo from Device"}</span>
                    </label>
                    {editForm.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, photoUrl: '' })}
                        className="text-[9px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 underline"
                      >
                        <X className="w-3 h-3" />
                        <span>{t.removePhoto || "Remove Photo"}</span>
                      </button>
                    )}
                  </div>

                  {/* Hidden Device File Input */}
                  <input 
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />

                  {/* Photo Preview Box & Browse File Button */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/80 border border-[#D4AF37]/50 shrink-0 flex items-center justify-center shadow-md">
                      {editForm.photoUrl ? (
                        <img 
                          src={editForm.photoUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-white/30" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 px-3 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/35 border border-[#D4AF37]/60 text-[#FFD700] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all font-mono shadow"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>{t.chooseImageFile || "Choose Image File (JPG / PNG)"}</span>
                      </button>

                      <p className="text-[9px] text-white/50 leading-snug">
                        {t.photoUrlHelp || "Upload a photo from device or paste a URL. Syncs live across all devices worldwide."}
                      </p>
                    </div>
                  </div>

                  {/* Optional Direct Image URL Input */}
                  <div className="pt-1">
                    <input 
                      type="text"
                      value={editForm.photoUrl || ''}
                      onChange={(e) => setEditForm({ ...editForm, photoUrl: e.target.value })}
                      placeholder="https://... or data:image/..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-white/80 font-mono text-[10px] focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                {/* OVR & Position */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-white/50 font-mono block mb-1">
                      {t.ovr || "Overall (OVR)"} (80 - 99)
                    </label>
                    <input 
                      type="number"
                      min={80}
                      max={99}
                      value={editForm.ovr}
                      onChange={(e) => setEditForm({ ...editForm, ovr: Math.min(99, Math.max(1, Number(e.target.value))) })}
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-white/50 font-mono block mb-1">
                      {t.position || "Position"}
                    </label>
                    <select
                      value={editForm.position}
                      onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value="ST">ST (Forward)</option>
                      <option value="RW">RW (Right Winger)</option>
                      <option value="LW">LW (Left Winger)</option>
                      <option value="CAM">CAM (Attacking Mid)</option>
                      <option value="CM">CM (Central Mid)</option>
                      <option value="CDM">CDM (Defensive Mid)</option>
                      <option value="CB">CB (Center Back)</option>
                      <option value="LB">LB (Left Back)</option>
                      <option value="RB">RB (Right Back)</option>
                      <option value="GK">GK (Goalkeeper)</option>
                    </select>
                  </div>
                </div>

                {/* Card Edition & Theme */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-white/50 font-mono block mb-1">
                      {t.cardEdition || "Card Edition Title"}
                    </label>
                    <input 
                      type="text"
                      value={editForm.edition}
                      onChange={(e) => setEditForm({ ...editForm, edition: e.target.value })}
                      placeholder="e.g. PHARAOH PRIME ICON"
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-white/50 font-mono block mb-1">
                      {t.cardTheme || "Card Accent Theme"}
                    </label>
                    <select
                      value={editForm.theme}
                      onChange={(e) => setEditForm({ ...editForm, theme: e.target.value as any })}
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value="gold">{t.themeGoldBlack || "Pharaoh Gold & Black"}</option>
                      <option value="crimson">{t.themeBlackRed || "Pharaoh Crimson & Black"}</option>
                      <option value="emerald">{t.themeBlackEmerald || "Pharaoh Emerald & Black"}</option>
                      <option value="purple">{t.themeBlackPurple || "Cyber Obsidian & Black"}</option>
                    </select>
                  </div>
                </div>

                {/* 6 FC Mobile Core Attributes */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <p className="text-[10px] font-mono font-bold uppercase text-[#D4AF37]">
                    FC Mobile Attributes (1 - 99):
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2 font-mono">
                    <div>
                      <span className="text-[9px] text-white/40 block">PAC (Pace)</span>
                      <input 
                        type="number"
                        min={1}
                        max={99}
                        value={editForm.pac}
                        onChange={(e) => setEditForm({ ...editForm, pac: parseSafeNum(e.target.value, 1, 99, 85) })}
                        className="w-full bg-black/50 border border-white/15 rounded-lg p-1.5 text-center text-white font-bold focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-white/40 block">SHO (Shooting)</span>
                      <input 
                        type="number"
                        min={1}
                        max={99}
                        value={editForm.sho}
                        onChange={(e) => setEditForm({ ...editForm, sho: parseSafeNum(e.target.value, 1, 99, 85) })}
                        className="w-full bg-black/50 border border-white/15 rounded-lg p-1.5 text-center text-white font-bold focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-white/40 block">PAS (Passing)</span>
                      <input 
                        type="number"
                        min={1}
                        max={99}
                        value={editForm.pas}
                        onChange={(e) => setEditForm({ ...editForm, pas: parseSafeNum(e.target.value, 1, 99, 85) })}
                        className="w-full bg-black/50 border border-white/15 rounded-lg p-1.5 text-center text-white font-bold focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-white/40 block">DRI (Dribbling)</span>
                      <input 
                        type="number"
                        min={1}
                        max={99}
                        value={editForm.dri}
                        onChange={(e) => setEditForm({ ...editForm, dri: parseSafeNum(e.target.value, 1, 99, 85) })}
                        className="w-full bg-black/50 border border-white/15 rounded-lg p-1.5 text-center text-white font-bold focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-white/40 block">DEF (Defense)</span>
                      <input 
                        type="number"
                        min={1}
                        max={99}
                        value={editForm.def}
                        onChange={(e) => setEditForm({ ...editForm, def: parseSafeNum(e.target.value, 1, 99, 60) })}
                        className="w-full bg-black/50 border border-white/15 rounded-lg p-1.5 text-center text-white font-bold focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-white/40 block">PHY (Physical)</span>
                      <input 
                        type="number"
                        min={1}
                        max={99}
                        value={editForm.phy}
                        onChange={(e) => setEditForm({ ...editForm, phy: parseSafeNum(e.target.value, 1, 99, 80) })}
                        className="w-full bg-black/50 border border-white/15 rounded-lg p-1.5 text-center text-white font-bold focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Skill Moves & Weak Foot */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase text-white/50 font-mono block mb-1">
                      {t.skillMoves || "Skill Moves (1-5★)"}
                    </label>
                    <select
                      value={editForm.skillMoves}
                      onChange={(e) => setEditForm({ ...editForm, skillMoves: parseSafeNum(e.target.value, 1, 5, 4) })}
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value={1}>1 Star ★</option>
                      <option value={2}>2 Stars ★★</option>
                      <option value={3}>3 Stars ★★★</option>
                      <option value={4}>4 Stars ★★★★</option>
                      <option value={5}>5 Stars ★★★★★</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-white/50 font-mono block mb-1">
                      {t.weakFoot || "Weak Foot (1-5★)"}
                    </label>
                    <select
                      value={editForm.weakFoot}
                      onChange={(e) => setEditForm({ ...editForm, weakFoot: parseSafeNum(e.target.value, 1, 5, 4) })}
                      className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value={1}>1 Star ★</option>
                      <option value={2}>2 Stars ★★</option>
                      <option value={3}>3 Stars ★★★</option>
                      <option value={4}>4 Stars ★★★★</option>
                      <option value={5}>5 Stars ★★★★★</option>
                    </select>
                  </div>
                </div>

              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setEditingPlayerId(null); setEditForm(null); }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingCard}
                  onClick={handleSaveCard}
                  className="px-5 py-2 bg-[#D4AF37] hover:bg-[#FFD700] text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
                >
                  {isSavingCard ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>{lang === 'ar' ? 'جاري المزامنة...' : 'Syncing Live...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{t.saveCardBtn || "Save & Sync Card"}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
