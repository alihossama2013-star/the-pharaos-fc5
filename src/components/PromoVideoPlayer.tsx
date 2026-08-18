import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, Upload, Film, Maximize, Sparkles, Check, Lock, RefreshCw } from 'lucide-react';
import teamLogo from '../assets/images/pharaohs_fc_logo_1786236242642.jpg';
import goldenBallImg from '../assets/images/golden_soccer_ball_1786327096088.jpg';
import { translations, Language } from '../translations';
import { db, doc, onSnapshot } from '../lib/firebase';
import { saveVideoWithChunks, loadChunkedVideo, deleteVideoWithChunks } from '../lib/videoStorage';

interface PromoVideoPlayerProps {
  lang: Language;
  isMasterUser?: boolean;
}

export const PromoVideoPlayer: React.FC<PromoVideoPlayerProps> = ({ lang, isMasterUser }) => {
  const t = translations[lang];

  // Video State
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('pharaohs_promo_video_url') || null;
    } catch (e) {
      return null;
    }
  });
  const [isLoadingPromoChunk, setIsLoadingPromoChunk] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(15);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default Canvas/Animation duration
  const DEFAULT_DURATION = 15;

  // Real-time Firestore Sync for Promo Video across all accounts & devices worldwide
  useEffect(() => {
    try {
      const promoDocRef = doc(db, 'promo_video', 'main');
      const unsubscribe = onSnapshot(promoDocRef, async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.isChunked) {
            setIsLoadingPromoChunk(true);
            const blobUrl = await loadChunkedVideo('promo_video', 'main', data.fileType || 'video/mp4');
            if (blobUrl) {
              setCustomVideoUrl(blobUrl);
              try {
                localStorage.setItem('pharaohs_promo_video_url', blobUrl);
              } catch (e) {}
            }
            setIsLoadingPromoChunk(false);
          } else if (data.videoUrl) {
            setCustomVideoUrl(data.videoUrl);
            try {
              localStorage.setItem('pharaohs_promo_video_url', data.videoUrl);
            } catch (e) {}
          } else {
            setCustomVideoUrl(null);
            localStorage.removeItem('pharaohs_promo_video_url');
          }
        } else {
          // If no remote promo video document exists, clear local custom video
          setCustomVideoUrl(null);
          localStorage.removeItem('pharaohs_promo_video_url');
        }
      }, (err) => {
        console.warn('Firestore promo video listener fallback:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Promo video Firestore initialization fallback:', e);
    }
  }, []);

  // Handle Custom Video Upload and Sync to Firestore for all accounts
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 40 * 1024 * 1024) {
        alert(lang === 'ar' ? 'حجم الفيديو كبير جداً (الحد الأقصى 40 ميجابايت)' : 'Video file too large (Max 40MB)');
        return;
      }

      setUploadProgress(0);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const dataUrl = evt.target?.result as string;
        if (dataUrl) {
          try {
            const blobUrl = await saveVideoWithChunks(
              'promo_video',
              'main',
              {
                title: 'Official Pharaohs FC Promo Video',
                uploadedBy: 'Ali Hossam (Master)',
                fileType: file.type || 'video/mp4'
              },
              dataUrl,
              file.type || 'video/mp4',
              (progress) => setUploadProgress(progress)
            );

            setCustomVideoUrl(blobUrl);
            setIsPlaying(true);
            setCurrentTime(0);
          } catch (err) {
            console.error('Error saving promo video to Firestore:', err);
            const localUrl = URL.createObjectURL(file);
            setCustomVideoUrl(localUrl);
          } finally {
            setUploadProgress(null);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetCustomVideo = async () => {
    if (!confirm(lang === 'ar' ? 'هل تريد استعادة الفيديو الترويجي الافتراضي للنادي لجميع الحسابات؟' : 'Reset promo video to default for all accounts worldwide?')) {
      return;
    }
    setCustomVideoUrl(null);
    localStorage.removeItem('pharaohs_promo_video_url');
    setCurrentTime(0);
    setIsPlaying(true);

    try {
      await deleteVideoWithChunks('promo_video', 'main', true);
    } catch (err) {
      console.warn('Error removing promo video document:', err);
    }
  };

  // Timer loop for Default Animation if no real HTML5 video file is uploaded
  useEffect(() => {
    if (customVideoUrl) return;

    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= DEFAULT_DURATION) {
            return 0; // loop
          }
          return Math.min(prev + 0.1, DEFAULT_DURATION);
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, customVideoUrl]);

  // Audio synthesis effect for default animation when unmuted
  useEffect(() => {
    if (customVideoUrl || isMuted || !isPlaying) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.close().catch(() => {});
        return;
      }
      
      // Gentle cinematic gold chime tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.3);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);

      setTimeout(() => {
        try { ctx.close().catch(() => {}); } catch (e) {}
      }, 400);
    } catch (e) {
      // Ignore audio context autoplay restrictions
    }
  }, [Math.floor(currentTime), isMuted, isPlaying, customVideoUrl]);

  const togglePlay = () => {
    if (customVideoUrl && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (customVideoUrl && videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Determine keyframe scene index for default animation (0 to 4)
  const currentScene = Math.min(Math.floor((currentTime / DEFAULT_DURATION) * 4), 3);

  return (
    <div className="bg-[#121212] rounded-3xl border border-[#D4AF37]/30 p-4 sm:p-5 shadow-[0_0_30px_rgba(212,175,55,0.15)] space-y-4 relative overflow-hidden">
      {/* Background Gold Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest bg-[#D4AF37]/20 text-[#FFD700] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 font-mono flex items-center gap-1">
              <Film className="w-3 h-3 text-[#FFD700]" />
              <span>PROMO VIDEO</span>
            </span>
            <span className="text-[9px] text-white/50 font-mono uppercase">
              • {t.videoSlogan}
            </span>
          </div>
          <h4 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
            <span>{t.officialPromoVideo}</span>
            <Sparkles className="w-4 h-4 text-[#FFD700] animate-pulse" />
          </h4>
        </div>

        {/* Upload Custom Video Button - Restricted to Master Account */}
        {isMasterUser ? (
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="video/*,video/mp4,video/webm,video/ogg,video/quicktime,video/m4v,video/avi,video/mkv,video/3gpp"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProgress !== null}
              className="px-3 py-1.5 bg-black/60 hover:bg-black/90 text-[#FFD700] border border-[#D4AF37]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
            >
              {uploadProgress !== null ? (
                <RefreshCw className="w-3.5 h-3.5 text-[#FFD700] animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-[#FFD700]" />
              )}
              <span>{uploadProgress !== null ? `${uploadProgress}%` : t.uploadCustomVideo}</span>
            </button>

            {customVideoUrl && (
              <button
                onClick={handleResetCustomVideo}
                className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all"
                title={t.resetVideo}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 border border-[#D4AF37]/40 rounded-xl text-[11px] font-bold text-[#FFD700] shadow-sm">
            <Lock className="w-3.5 h-3.5 text-[#FFD700]" />
            <span>{t.protectedVideoNotice}</span>
          </div>
        )}
      </div>

      {/* Upload Progress Bar if active */}
      {uploadProgress !== null && (
        <div className="space-y-1 bg-black/60 p-2.5 rounded-xl border border-[#FFD700]/30">
          <div className="flex justify-between text-[11px] font-mono text-[#FFD700] font-bold">
            <span>{lang === 'ar' ? 'جاري مزامنة فيديو MP4 للنادي إلى السحابة...' : 'Syncing Promo MP4 Video to Cloud Database...'}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Video Screen Container */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full bg-black rounded-2xl border-2 border-[#D4AF37]/40 overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.8)] group flex items-center justify-center"
      >
        {isLoadingPromoChunk ? (
          <div className="text-center p-6 space-y-3">
            <RefreshCw className="w-8 h-8 text-[#FFD700] mx-auto animate-spin" />
            <p className="text-xs text-[#FFD700] font-mono font-bold">
              {lang === 'ar' ? 'جاري تحميل فيديو MP4 السحابي...' : 'Loading Cloud Promo Video...'}
            </p>
          </div>
        ) : customVideoUrl ? (
          /* HTML5 Video Element if user uploaded a video */
          <video
            ref={videoRef}
            src={customVideoUrl}
            autoPlay
            loop
            muted={isMuted}
            onError={() => {
              // Clear invalid video source and fallback to animated canvas player
              setCustomVideoUrl(null);
              localStorage.removeItem('pharaohs_promo_video_url');
            }}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                setDuration(videoRef.current.duration || 15);
              }
            }}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />
        ) : (
          /* Animated Teaser matching the uploaded Pharaohs FC Promo Video sequence */
          <div className="w-full h-full relative bg-gradient-to-b from-black via-[#0a0a05] to-black flex items-center justify-center overflow-hidden select-none">
            {/* Gold Particle Light Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0%,transparent_70%)] pointer-events-none" />

            <AnimatePresence mode="wait">
              {currentScene === 0 && (
                <motion.div
                  key="scene0"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.8 }}
                  className="text-center space-y-2 p-4 z-10"
                >
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full p-1 bg-gradient-to-br from-[#FFD700] via-[#B8860B] to-[#8B6508] shadow-[0_0_40px_rgba(255,215,0,0.5)]"
                  >
                    <img
                      src={teamLogo}
                      alt="The Pharaohs Logo"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </motion.div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#FFD700] tracking-widest uppercase font-mono">
                    الفرعنة
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-white/70 font-mono tracking-widest">
                    Since 2026 • EST. 2024
                  </p>
                </motion.div>
              )}

              {currentScene === 1 && (
                <motion.div
                  key="scene1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.8 }}
                  className="text-center space-y-3 p-4 z-10"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full overflow-hidden border-2 border-[#FFD700] shadow-[0_0_50px_rgba(255,215,0,0.7)]"
                  >
                    <img
                      src={goldenBallImg}
                      alt="Golden Soccer Ball"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  <div className="bg-black/60 px-4 py-1.5 rounded-full border border-[#D4AF37]/50 inline-block">
                    <span className="text-xs sm:text-sm font-black text-[#FFD700] tracking-wider uppercase font-mono">
                      MATCHDAY READY
                    </span>
                  </div>
                </motion.div>
              )}

              {currentScene === 2 && (
                <motion.div
                  key="scene2"
                  initial={{ opacity: 0, scale: 1.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.8 }}
                  className="text-center space-y-2 p-4 z-10"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-black/80 border-2 border-[#FFD700] p-2 shadow-[0_0_30px_rgba(212,175,55,0.6)] flex items-center justify-center">
                    <img src={teamLogo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                    سبع قلوب... اسم واحد
                  </h2>
                  <p className="text-xs text-[#FFD700] font-mono uppercase tracking-widest font-extrabold">
                    THE PHARAOHS FC
                  </p>
                </motion.div>
              )}

              {currentScene === 3 && (
                <motion.div
                  key="scene3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center space-y-2 p-4 z-10"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/40 text-[#FFD700] text-[10px] font-mono font-bold uppercase">
                    <Sparkles className="w-3 h-3" />
                    <span>OFFICIAL CLUB APP</span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-white to-[#D4AF37]">
                    THE PHARAOHS
                  </h2>
                  <p className="text-xs text-white/80 font-mono">
                    SIGN IN & JOIN THE SQUAD
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Video Overlay Control Bar */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 pointer-events-auto">
          {/* Top Info */}
          <div className="flex items-center justify-between text-white text-[10px] font-mono">
            <span className="bg-black/60 px-2 py-0.5 rounded-md border border-white/20">
              {customVideoUrl ? (t.customVideoActive) : ('PROMO TEASER')}
            </span>
            <span className="text-[#FFD700] font-bold">
              {Math.floor(currentTime)}s / {Math.floor(duration)}s
            </span>
          </div>

          {/* Center Play Big Button */}
          <button
            onClick={togglePlay}
            className="self-center w-12 h-12 rounded-full bg-[#FFD700] text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.6)] transform hover:scale-110 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-black" />
            ) : (
              <Play className="w-6 h-6 fill-black translate-x-0.5" />
            )}
          </button>

          {/* Bottom Bar: Seekbar & Buttons */}
          <div className="space-y-1.5">
            {/* Progress Bar */}
            <div
              className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                const newTime = pos * duration;
                setCurrentTime(newTime);
                if (customVideoUrl && videoRef.current) {
                  videoRef.current.currentTime = newTime;
                }
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] transition-all duration-100"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="p-1.5 bg-black/50 hover:bg-black/80 rounded-lg text-white"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-1.5 bg-black/50 hover:bg-black/80 rounded-lg text-white"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#FFD700]" />}
                </button>

                <button
                  onClick={() => {
                    setCurrentTime(0);
                    if (customVideoUrl && videoRef.current) {
                      videoRef.current.currentTime = 0;
                    }
                  }}
                  className="p-1.5 bg-black/50 hover:bg-black/80 rounded-lg text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 bg-black/50 hover:bg-black/80 rounded-lg text-white"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
