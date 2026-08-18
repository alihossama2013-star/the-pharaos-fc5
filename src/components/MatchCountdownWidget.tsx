import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Calendar, 
  MapPin, 
  Trophy, 
  Sparkles, 
  Share2, 
  PlusCircle, 
  Check, 
  Flame, 
  Shield, 
  AlertCircle,
  ExternalLink,
  CalendarPlus,
  Play
} from 'lucide-react';
import { Language, translations } from '../translations';

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

interface MatchCountdownWidgetProps {
  upcomingMatches: UpcomingMatch[];
  lang: Language;
  isMasterUser: boolean;
  teamLogo: string;
  onScheduleClick?: () => void;
  onLogResultClick?: (match: UpcomingMatch) => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isLive: boolean;
  isToday: boolean;
  isUrgent: boolean;
  isCompleted: boolean;
}

function calculateTimeRemaining(dateStr: string, timeStr?: string): TimeLeft {
  try {
    const timePart = timeStr && timeStr.trim() ? timeStr.trim() : '18:00';
    // Format ISO string safely
    const targetDate = new Date(`${dateStr}T${timePart.length === 5 ? timePart + ':00' : timePart}`);
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();

    // Check if match is today
    const nowDayStr = now.toISOString().split('T')[0];
    const isToday = nowDayStr === dateStr;

    // Match is considered "Live / Underway" if it started less than 2.5 hours ago
    const isLive = diffMs <= 0 && diffMs >= -2.5 * 60 * 60 * 1000;
    const isCompleted = diffMs < -2.5 * 60 * 60 * 1000;

    if (diffMs <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMs: diffMs,
        isLive,
        isToday,
        isUrgent: isLive,
        isCompleted
      };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    const isUrgent = days === 0 && hours < 2;

    return {
      days,
      hours,
      minutes,
      seconds,
      totalMs: diffMs,
      isLive: false,
      isToday,
      isUrgent,
      isCompleted: false
    };
  } catch (e) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isLive: false,
      isToday: false,
      isUrgent: false,
      isCompleted: false
    };
  }
}

export const MatchCountdownWidget: React.FC<MatchCountdownWidgetProps> = ({
  upcomingMatches,
  lang,
  isMasterUser,
  teamLogo,
  onScheduleClick,
  onLogResultClick
}) => {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Update timer every second for accurate countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Find the closest active upcoming match
  const nextMatch = useMemo(() => {
    if (!upcomingMatches || upcomingMatches.length === 0) return null;

    // Filter matches that are not completed (future or within 3 hours of start)
    const validMatches = [...upcomingMatches].filter((m) => {
      try {
        const timePart = m.time && m.time.trim() ? m.time.trim() : '18:00';
        const targetTime = new Date(`${m.date}T${timePart.length === 5 ? timePart + ':00' : timePart}`).getTime();
        // Keep matches starting from now or started within the last 3 hours
        return targetTime >= Date.now() - (3 * 60 * 60 * 1000);
      } catch (e) {
        return true;
      }
    });

    if (validMatches.length === 0) {
      // Fallback to the latest match in the list if all are in past
      return upcomingMatches[0];
    }

    // Sort ascending by kickoff date/time
    validMatches.sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '18:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '18:00'}`).getTime();
      return timeA - timeB;
    });

    return validMatches[0];
  }, [upcomingMatches, nowTick]);

  const timeLeft = useMemo(() => {
    if (!nextMatch) return null;
    return calculateTimeRemaining(nextMatch.date, nextMatch.time);
  }, [nextMatch, nowTick]);

  // Generate Google Calendar Link
  const getGoogleCalendarUrl = (match: UpcomingMatch) => {
    const timePart = match.time && match.time.trim() ? match.time.trim() : '18:00';
    const startDate = new Date(`${match.date}T${timePart.length === 5 ? timePart + ':00' : timePart}`);
    const endDate = new Date(startDate.getTime() + 90 * 60 * 1000); // 90 min match

    const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const title = encodeURIComponent(`⚽ The Pharaohs FC vs ${match.opponent}`);
    const details = encodeURIComponent(
      `The Pharaohs FC upcoming match vs ${match.opponent}.\nCompetition: ${match.competition || 'Friendly'}\nVenue: ${match.location || 'Home Pitch'}\nNotes: ${match.notes || 'No extra notes'}`
    );
    const location = encodeURIComponent(match.location || 'Football Ground');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGCalDate(startDate)}/${formatGCalDate(endDate)}&details=${details}&location=${location}`;
  };

  // Download iCal (.ics) file
  const handleDownloadIcs = (match: UpcomingMatch) => {
    const timePart = match.time && match.time.trim() ? match.time.trim() : '18:00';
    const startDate = new Date(`${match.date}T${timePart.length === 5 ? timePart + ':00' : timePart}`);
    const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);

    const formatIcsDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The Pharaohs FC//Match Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:match-${match.id}-${Date.now()}@thepharaohsfc.app`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:⚽ The Pharaohs FC vs ${match.opponent}`,
      `DESCRIPTION:The Pharaohs FC match fixture vs ${match.opponent}. Competition: ${match.competition || 'Friendly'}. Notes: ${match.notes || 'None'}`,
      `LOCATION:${match.location || 'Home Pitch'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pharaohs_FC_vs_${match.opponent.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Share Match Details
  const handleShareMatch = async (match: UpcomingMatch) => {
    const text = `⚽ *THE PHARAOHS FC - UPCOMING MATCH* 🏆\n\n🆚 *Opponent:* ${match.opponent}\n📅 *Date:* ${match.date}\n⏰ *Kickoff:* ${match.time || '18:00'}\n📍 *Venue:* ${match.location || 'Home Pitch'}\n🏆 *Type:* ${match.competition || 'Friendly Match'}\n${match.notes ? `📝 *Notes:* ${match.notes}\n` : ''}\n🔥 Let's bring the victory!`;

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        // fallback
      }
    }
  };

  // If NO upcoming match is scheduled: Show clean persistent empty state widget
  if (!nextMatch || !timeLeft) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gradient-to-br from-[#161309] via-[#0d0d0d] to-[#080808] border-2 border-[#D4AF37]/30 hover:border-[#D4AF37]/50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_4px_25px_rgba(212,175,55,0.08)] relative overflow-hidden transition-all"
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5 text-center sm:text-start">
            <div className="w-12 h-12 rounded-2xl bg-black/60 border border-[#D4AF37]/40 flex items-center justify-center text-[#FFD700] shrink-0 shadow-inner">
              <Calendar className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="text-[10px] font-mono uppercase font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/30">
                  {t.nextMatchCountdown || 'Next Match Countdown'}
                </span>
                <span className="w-2 h-2 rounded-full bg-white/20" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white mt-1">
                {t.noMatchScheduledTitle || 'No Scheduled Match Yet'}
              </h3>
              <p className="text-[11px] text-white/50 max-w-md mt-0.5">
                {t.noMatchScheduledDesc || 'Stay tuned! The captain will schedule and publish the next fixture soon.'}
              </p>
            </div>
          </div>

          {isMasterUser && onScheduleClick && (
            <button
              type="button"
              onClick={onScheduleClick}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:from-[#FFD700] hover:to-[#FFF] text-black font-black text-xs rounded-xl shadow-[0_4px_15px_rgba(212,175,55,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.scheduleMatchNow || '+ Schedule Match Now'}</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Active Countdown Widget
  const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

  // Status Badge Logic
  const getStatusBadge = () => {
    if (timeLeft.isLive) {
      return (
        <span className="px-3 py-1 bg-red-600/30 border border-red-500 text-red-400 font-mono font-black text-xs rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>{t.matchUnderway || '🔴 MATCH UNDERWAY'}</span>
        </span>
      );
    }
    if (timeLeft.isToday) {
      return (
        <span className="px-3 py-1 bg-amber-500/20 border border-amber-400 text-[#FFD700] font-mono font-black text-xs rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,215,0,0.3)] animate-pulse">
          <Flame className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
          <span>{t.matchTodayBanner || '🔥 MATCH DAY TODAY'}</span>
        </span>
      );
    }
    if (timeLeft.isUrgent) {
      return (
        <span className="px-3 py-1 bg-orange-500/20 border border-orange-400 text-orange-300 font-mono font-black text-xs rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(249,115,22,0.3)] animate-pulse">
          <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
          <span>{t.kickoffImminent || '🚨 KICKOFF IMMINENT'}</span>
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FFD700] font-mono font-extrabold text-[11px] rounded-full flex items-center gap-1.5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
        <span>{t.nextMatchCountdown || 'NEXT FIXTURE COUNTDOWN'}</span>
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`w-full rounded-2xl sm:rounded-3xl border-2 shadow-2xl relative overflow-hidden transition-all ${
        timeLeft.isLive
          ? 'bg-gradient-to-br from-[#1a0808] via-[#0d0d0d] to-[#0a0505] border-red-500/60 shadow-[0_0_35px_rgba(239,68,68,0.25)]'
          : timeLeft.isToday
          ? 'bg-gradient-to-br from-[#1a1405] via-[#0d0d0d] to-[#070707] border-[#FFD700]/70 shadow-[0_0_35px_rgba(255,215,0,0.2)]'
          : 'bg-gradient-to-br from-[#141108] via-[#0c0c0c] to-[#050505] border-[#D4AF37]/50 shadow-[0_4px_30px_rgba(212,175,55,0.15)]'
      }`}
    >
      {/* Dynamic ambient backdrop lights */}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
        timeLeft.isLive ? 'bg-red-600/15' : 'bg-[#D4AF37]/15'
      }`} />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      {/* Main Container */}
      <div className="p-4 sm:p-6 relative z-10 space-y-4 sm:space-y-5">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {nextMatch.competition && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-white/70 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                <Trophy className="w-3 h-3 text-[#FFD700]" />
                <span>{nextMatch.competition}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-white/70">
            <span className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 text-[#FFD700] font-bold">
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
              {nextMatch.date}
            </span>
            {nextMatch.time && (
              <span className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 text-white font-bold">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                {nextMatch.time}
              </span>
            )}
          </div>
        </div>

        {/* Matchup Team VS Opponent Hero Display */}
        <div className="bg-black/60 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-inner">
          {/* Home Team */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            <img 
              src={teamLogo} 
              alt="The Pharaohs FC" 
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] shrink-0" 
            />
            <div className="min-w-0">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#D4AF37] block font-bold">
                {t.teamCrest || 'THE PHARAOHS FC'}
              </span>
              <h4 className="text-xs sm:text-base font-black text-white truncate">
                {t.appTitle}
              </h4>
            </div>
          </div>

          {/* VS Center Badge */}
          <div className="flex flex-col items-center justify-center px-3 py-1 bg-gradient-to-b from-[#D4AF37]/20 to-black/80 rounded-xl border border-[#D4AF37]/40 shadow-sm shrink-0">
            <span className="text-xs sm:text-sm font-black font-mono text-[#FFD700] tracking-widest">VS</span>
            <span className="text-[8px] text-white/40 font-mono uppercase">CLASH</span>
          </div>

          {/* Opponent Team */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 justify-end text-end">
            <div className="min-w-0">
              <span className="text-[9px] font-mono uppercase tracking-wider text-white/50 block font-bold">
                {t.opponentCrest || 'OPPONENT'}
              </span>
              <h4 className="text-xs sm:text-base font-black text-[#FFD700] truncate">
                {nextMatch.opponent}
              </h4>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/20 flex items-center justify-center text-white font-black text-xs sm:text-sm shrink-0 shadow-md">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
            </div>
          </div>
        </div>

        {/* 4-Digit Digital Live Countdown Matrix */}
        {!timeLeft.isCompleted && !timeLeft.isLive ? (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              
              {/* DAYS */}
              <div className="bg-gradient-to-b from-[#1c1809] to-[#0d0c07] border border-[#D4AF37]/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-center shadow-lg relative overflow-hidden group">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/50 to-transparent" />
                <span className="text-xl sm:text-3xl lg:text-4xl font-black font-mono text-[#FFD700] block tracking-tight">
                  {pad(timeLeft.days)}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase text-white/60 tracking-wider mt-0.5 block">
                  {t.daysShort || 'DAYS'}
                </span>
              </div>

              {/* HOURS */}
              <div className="bg-gradient-to-b from-[#1c1809] to-[#0d0c07] border border-[#D4AF37]/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/50 to-transparent" />
                <span className="text-xl sm:text-3xl lg:text-4xl font-black font-mono text-white block tracking-tight">
                  {pad(timeLeft.hours)}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase text-white/60 tracking-wider mt-0.5 block">
                  {t.hoursShort || 'HOURS'}
                </span>
              </div>

              {/* MINUTES */}
              <div className="bg-gradient-to-b from-[#1c1809] to-[#0d0c07] border border-[#D4AF37]/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/50 to-transparent" />
                <span className="text-xl sm:text-3xl lg:text-4xl font-black font-mono text-white block tracking-tight">
                  {pad(timeLeft.minutes)}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase text-white/60 tracking-wider mt-0.5 block">
                  {t.minsShort || 'MINS'}
                </span>
              </div>

              {/* SECONDS */}
              <div className="bg-gradient-to-b from-[#241e0a] to-[#0f0e08] border-2 border-[#FFD700]/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-center shadow-[0_0_20px_rgba(255,215,0,0.15)] relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-[#FFD700]" />
                <span className="text-xl sm:text-3xl lg:text-4xl font-black font-mono text-[#FFD700] block tracking-tight animate-pulse">
                  {pad(timeLeft.seconds)}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase text-[#FFD700]/80 tracking-wider mt-0.5 block">
                  {t.secsShort || 'SECS'}
                </span>
              </div>

            </div>
          </div>
        ) : timeLeft.isLive ? (
          <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-3.5 text-center space-y-1">
            <p className="text-base font-black text-red-400 flex items-center justify-center gap-2 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span>{t.matchUnderway || 'LIVE: MATCH IS CURRENTLY IN PROGRESS'}</span>
            </p>
            <p className="text-xs text-white/60 font-mono">
              {nextMatch.location ? `📍 ${nextMatch.location}` : 'Live on match ground'}
            </p>
          </div>
        ) : (
          <div className="bg-black/60 border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-xs font-bold text-white/70">
              {t.matchFinishedSoon || 'Match time reached. Ready for official score logging.'}
            </p>
          </div>
        )}

        {/* Location, Venue & Notes Bar */}
        {(nextMatch.location || nextMatch.notes) && (
          <div className="bg-black/40 rounded-xl p-2.5 sm:p-3 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            {nextMatch.location && (
              <div className="flex items-center gap-1.5 text-white/80 font-mono text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span><strong className="text-white">{t.venueTurf || 'Venue'}:</strong> {nextMatch.location}</span>
              </div>
            )}
            {nextMatch.notes && (
              <div className="text-white/60 text-[11px] italic truncate max-w-sm">
                "{nextMatch.notes}"
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: Calendar Sync, Share, and Captain Management */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          {/* Calendar & Share Group */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href={getGoogleCalendarUrl(nextMatch)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 hover:border-[#D4AF37]/50 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title={t.addToGoogleCalendar || 'Add to Google Calendar'}
            >
              <CalendarPlus className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">{t.addToGoogleCalendar || 'Google Calendar'}</span>
              <span className="sm:hidden">G-Cal</span>
            </a>

            <button
              type="button"
              onClick={() => handleDownloadIcs(nextMatch)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 hover:border-[#D4AF37]/50 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title={t.downloadIcsCalendar || 'Download .ics Calendar File'}
            >
              <Calendar className="w-3.5 h-3.5 text-[#FFD700]" />
              <span className="hidden sm:inline">.ICS File</span>
              <span className="sm:hidden">.ics</span>
            </button>

            <button
              type="button"
              onClick={() => handleShareMatch(nextMatch)}
              className={`px-3 py-1.5 border rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border-white/10'
              }`}
              title={t.shareMatchDetails || 'Share Match Details'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-white/70" />}
              <span>{copied ? (t.matchDetailsCopied || 'Copied!') : (t.shareMatchDetails || 'Share')}</span>
            </button>
          </div>

          {/* Captain Exclusive Actions */}
          {isMasterUser && (
            <div className="flex items-center gap-1.5 ms-auto">
              {onLogResultClick && (
                <button
                  type="button"
                  onClick={() => onLogResultClick(nextMatch)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-[11px] rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>{t.logFinalResult || 'Log Result'}</span>
                </button>
              )}

              {onScheduleClick && (
                <button
                  type="button"
                  onClick={onScheduleClick}
                  className="px-3 py-1.5 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#FFD700] border border-[#D4AF37]/50 font-bold text-[11px] rounded-xl transition-all flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.scheduleMatchNow || 'Schedule'}</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};
