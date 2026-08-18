import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import teamLogo from '../assets/images/pharaohs_fc_logo_1786236242642.jpg';
import goldenBallImg from '../assets/images/golden_soccer_ball_1786327096088.jpg';
import { SkipForward } from 'lucide-react';

interface IntroAnimationProps {
  onComplete: () => void;
  lang?: 'ar' | 'en';
}

interface PhotoFrame {
  id: number;
  image: string;
  titleAr: string;
  titleEn: string;
  tagAr: string;
  tagEn: string;
  borderGlow: string;
}

const PHOTO_FRAMES: PhotoFrame[] = [
  {
    id: 1,
    image: teamLogo,
    titleAr: 'الفراعنة',
    titleEn: 'THE PHARAOHS FC',
    tagAr: 'شعار الفريق',
    tagEn: 'TEAM CREST',
    borderGlow: 'shadow-[0_0_50px_rgba(212,175,55,0.6)]'
  },
  {
    id: 2,
    image: goldenBallImg,
    titleAr: 'الكرة الذهبية',
    titleEn: 'GOLDEN SOCCER BALL',
    tagAr: 'كرة الفوز',
    tagEn: 'MATCH BALL',
    borderGlow: 'shadow-[0_0_60px_rgba(255,215,0,0.8)]'
  },
  {
    id: 3,
    image: teamLogo,
    titleAr: 'سبع قلوب... اسم واحد',
    titleEn: 'SEVEN HEARTS... ONE NAME',
    tagAr: 'شعار النادي',
    tagEn: 'TEAM MOTTO',
    borderGlow: 'shadow-[0_0_50px_rgba(212,175,55,0.7)]'
  },
  {
    id: 4,
    image: goldenBallImg,
    titleAr: 'جاهزون للمباراة',
    titleEn: 'MATCHDAY READY',
    tagAr: 'إشعال الحماس',
    tagEn: 'GAME TIME',
    borderGlow: 'shadow-[0_0_70px_rgba(255,223,0,0.9)]'
  },
  {
    id: 5,
    image: teamLogo,
    titleAr: 'درع البطولات 2026',
    titleEn: 'PHARAOHS CHAMPIONSHIP',
    tagAr: 'المقر الرسمي',
    tagEn: 'SQUAD HUB',
    borderGlow: 'shadow-[0_0_50px_rgba(212,175,55,0.6)]'
  },
  {
    id: 6,
    image: goldenBallImg,
    titleAr: 'انطلاق اللوحة',
    titleEn: 'ENTERING SQUAD DASHBOARD',
    tagAr: 'مرحباً بكم',
    tagEn: 'WELCOME',
    borderGlow: 'shadow-[0_0_80px_rgba(255,215,0,1)]'
  }
];

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete, lang = 'ar' }) => {
  const TOTAL_DURATION_MS = 15000; // 15 seconds total
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      if (elapsed >= TOTAL_DURATION_MS) {
        setElapsedMs(TOTAL_DURATION_MS);
        clearInterval(interval);
        onComplete();
      } else {
        setElapsedMs(elapsed);
      }
    }, 40); // 25fps smooth progress update

    return () => clearInterval(interval);
  }, [onComplete]);

  // Calculate frame index over 15 seconds (cycling through the 6 frames twice = 12 total steps)
  const totalSteps = PHOTO_FRAMES.length * 2; // 12 frame changes in 15s (~1.25s per frame)
  const stepDuration = TOTAL_DURATION_MS / totalSteps;
  const currentStep = Math.min(Math.floor(elapsedMs / stepDuration), totalSteps - 1);
  const currentFrameIndex = currentStep % PHOTO_FRAMES.length;
  const progressPercent = Math.min(100, (elapsedMs / TOTAL_DURATION_MS) * 100);

  const currentFrame = PHOTO_FRAMES[currentFrameIndex];

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden font-sans select-none">
      {/* Ambient Gold Radial Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/25 via-black to-black opacity-90" />

      {/* Floating Gold Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[#FFD700] opacity-40 animate-pulse"
            style={{
              width: `${(i % 4) + 2}px`,
              height: `${(i % 4) + 2}px`,
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
            }}
          />
        ))}
      </div>

      {/* Header bar with skip button */}
      <div className="w-full max-w-md flex items-center justify-end z-20 pt-1 sm:pt-2">
        <button
          type="button"
          onClick={onComplete}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-black/60 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold backdrop-blur-md hover:bg-[#D4AF37]/20 transition-all shadow-lg cursor-pointer active:scale-95"
        >
          <span>{lang === 'ar' ? 'تخطي' : 'Skip'}</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Frame Container - Photo Playback */}
      <div className="relative my-auto flex flex-col items-center justify-center w-full max-w-sm z-10 py-2 sm:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentFrame.id}-${currentStep}`}
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: -10 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="flex flex-col items-center text-center space-y-3 sm:space-y-5"
          >
            {/* Photo Card Container */}
            <div className={`relative p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#D4AF37]/30 via-black to-[#D4AF37]/20 border border-[#D4AF37]/50 ${currentFrame.borderGlow} transition-all duration-300`}>
              <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-xl sm:rounded-2xl overflow-hidden bg-black flex items-center justify-center relative shadow-2xl">
                <img
                  src={currentFrame.image}
                  alt={lang === 'ar' ? currentFrame.titleAr : currentFrame.titleEn}
                  className="w-full h-full object-cover object-center transform transition-transform duration-700 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Tag pill on photo frame */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#000] border border-[#D4AF37] text-[#D4AF37] px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-extrabold uppercase tracking-widest shadow-lg">
                {lang === 'ar' ? currentFrame.tagAr : currentFrame.tagEn}
              </div>
            </div>

            {/* Frame Title & Description */}
            <div className="space-y-1 pt-2 sm:pt-3">
              <h2 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFE58F] via-[#D4AF37] to-[#996B00] tracking-wide">
                {lang === 'ar' ? currentFrame.titleAr : currentFrame.titleEn}
              </h2>
              <p className="text-[9px] sm:text-[10px] text-[#D4AF37]/80 font-mono tracking-[0.25em] uppercase font-bold">
                ★ THE PHARAOHS FC ★
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Progress Bar & Sequence Indicators */}
      <div className="w-full max-w-sm space-y-2 sm:space-y-2.5 z-20 pb-2 sm:pb-4">
        {/* Frame Dots */}
        <div className="flex justify-center items-center gap-2">
          {PHOTO_FRAMES.map((f, idx) => (
            <div
              key={f.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentFrameIndex
                  ? 'w-7 bg-[#FFD700] shadow-[0_0_10px_#FFD700]'
                  : 'w-1.5 bg-[#D4AF37]/30'
              }`}
            />
          ))}
        </div>

        {/* 20-Second Progress Bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-[#D4AF37]/20">
          <div
            className="h-full bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#FFF5C0] rounded-full transition-all duration-75 ease-linear shadow-[0_0_12px_#FFD700]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

