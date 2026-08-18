import { jsPDF } from 'jspdf';
import { MatchRecord, Player } from '../types';
import { Language } from '../translations';

export interface ExportMatchPdfOptions {
  match: MatchRecord;
  players: Player[];
  lang?: Language;
  teamName?: string;
}

export function exportMatchReportPdf({
  match,
  players,
  lang = 'en',
  teamName = 'THE PHARAOHS FC'
}: ExportMatchPdfOptions): void {
  // Create A4 PDF in portrait orientation
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Colors
  const primaryGold = [212, 175, 55]; // #D4AF37
  const darkBg = [20, 20, 20];
  const charcoal = [40, 40, 40];
  const lightGray = [245, 245, 245];
  const borderGray = [220, 220, 220];
  const textDark = [30, 30, 30];
  const textMuted = [100, 100, 100];
  const greenWin = [34, 197, 94];
  const yellowDraw = [234, 179, 8];
  const redLoss = [239, 68, 68];

  // Helper for text alignment
  const centerText = (text: string, currentY: number, size: number, isBold: boolean = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(text, pageWidth / 2, currentY, { align: 'center' });
  };

  // --- HEADER SECTION ---
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Gold accent top bar
  doc.setFillColor(primaryGold[0], primaryGold[1], primaryGold[2]);
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  // Club Title
  doc.setTextColor(primaryGold[0], primaryGold[1], primaryGold[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(teamName.toUpperCase(), pageWidth / 2, 15, { align: 'center' });

  // Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL MATCHDAY PERFORMANCE & STATISTICAL REPORT', pageWidth / 2, 22, { align: 'center' });

  // Metadata Subline
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 200);
  doc.text(`DATE: ${match.date}   |   MATCH ID: #${match.id}   |   GENERATED: ${new Date().toLocaleDateString('en-US')}`, pageWidth / 2, 29, { align: 'center' });

  y = 46;

  // --- SCOREBOARD SECTION ---
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, 'FD');

  // Inner result color badge
  const resultColor = match.result === 'W' ? greenWin : match.result === 'D' ? yellowDraw : redLoss;
  const resultLabel = match.result === 'W' ? 'VICTORY (WIN)' : match.result === 'D' ? 'DRAW' : 'DEFEAT (LOSS)';
  
  doc.setFillColor(resultColor[0], resultColor[1], resultColor[2]);
  doc.roundedRect(margin + 5, y + 4, 34, 6, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(resultLabel, margin + 22, y + 8.2, { align: 'center' });

  // Score display
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('THE PHARAOHS FC', margin + 35, y + 21, { align: 'center' });

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGold[0], primaryGold[1], primaryGold[2]);
  doc.text(`${match.teamGoals}`, margin + 75, y + 23, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('VS', pageWidth / 2, y + 21, { align: 'center' });

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.text(`${match.opponentGoals}`, margin + contentWidth - 75, y + 23, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const cleanOpponent = match.opponent.toUpperCase();
  doc.text(cleanOpponent.length > 20 ? cleanOpponent.slice(0, 20) + '...' : cleanOpponent, margin + contentWidth - 35, y + 21, { align: 'center' });

  y += 42;

  // --- MVP SPOTLIGHT (If available) ---
  const mvp = match.mvpPlayerId ? players.find(p => p.id === match.mvpPlayerId || p.name.toLowerCase() === match.mvpPlayerId?.toLowerCase() || p.username.toLowerCase() === match.mvpPlayerId?.toLowerCase()) : null;
  
  if (mvp) {
    doc.setFillColor(254, 249, 231); // Warm gold tint
    doc.setDrawColor(primaryGold[0], primaryGold[1], primaryGold[2]);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

    doc.setTextColor(primaryGold[0], primaryGold[1], primaryGold[2]);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('★ MAN OF THE MATCH (MVP):', margin + 6, y + 9);

    doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.setFontSize(11);
    doc.text(mvp.name.toUpperCase(), margin + 62, y + 9);

    if (mvp.position) {
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`(${mvp.position})`, margin + 65 + (mvp.name.length * 2.3), y + 9);
    }

    y += 18;
  }

  // --- KEY MATCH EVENTS (SCORERS & ASSISTERS) ---
  const colWidth = (contentWidth - 6) / 2;

  // Scorers Box
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, colWidth, 32, 2, 2, 'FD');

  doc.setTextColor(primaryGold[0], primaryGold[1], primaryGold[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('⚽ GOAL SCORERS', margin + 5, y + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  let scorerY = y + 14;
  if (match.scorers && match.scorers.length > 0) {
    match.scorers.slice(0, 3).forEach(s => {
      const p = players.find(player => player.id === s.playerId || player.name.toLowerCase() === s.playerId.toLowerCase() || player.username.toLowerCase() === s.playerId.toLowerCase());
      const pName = p ? p.name : s.playerId;
      doc.text(`• ${pName}`, margin + 6, scorerY);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.goals} goal${s.goals > 1 ? 's' : ''}`, margin + colWidth - 20, scorerY);
      doc.setFont('helvetica', 'normal');
      scorerY += 5.5;
    });
    if (match.scorers.length > 3) {
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`+ ${match.scorers.length - 3} additional scorers`, margin + 6, scorerY);
    }
  } else {
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('No goals recorded', margin + 6, scorerY);
  }

  // Assisters Box
  const col2X = margin + colWidth + 6;
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(col2X, y, colWidth, 32, 2, 2, 'FD');

  doc.setTextColor(59, 130, 246); // Blue
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('🅰️ ASSISTS / PLAYMAKERS', col2X + 5, y + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  let assistY = y + 14;
  if (match.assisters && match.assisters.length > 0) {
    match.assisters.slice(0, 3).forEach(a => {
      const p = players.find(player => player.id === a.playerId || player.name.toLowerCase() === a.playerId.toLowerCase() || player.username.toLowerCase() === a.playerId.toLowerCase());
      const pName = p ? p.name : a.playerId;
      doc.text(`• ${pName}`, col2X + 6, assistY);
      doc.setFont('helvetica', 'bold');
      doc.text(`${a.assists} assist${a.assists > 1 ? 's' : ''}`, col2X + colWidth - 20, assistY);
      doc.setFont('helvetica', 'normal');
      assistY += 5.5;
    });
    if (match.assisters.length > 3) {
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`+ ${match.assisters.length - 3} additional assisters`, col2X + 6, assistY);
    }
  } else {
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('No assists recorded', col2X + 6, assistY);
  }

  y += 38;

  // --- SQUAD PERFORMANCE RATINGS TABLE ---
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(margin, y, contentWidth, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAYER', margin + 4, y + 4.8);
  doc.text('POSITION', margin + 60, y + 4.8);
  doc.text('GOALS', margin + 98, y + 4.8, { align: 'center' });
  doc.text('ASSISTS', margin + 122, y + 4.8, { align: 'center' });
  doc.text('MATCH RATING (1-10)', margin + contentWidth - 20, y + 4.8, { align: 'center' });

  y += 7;

  // Render Table Rows
  const participantIds = new Set<string>();
  (match.scorers || []).forEach(s => participantIds.add(s.playerId));
  (match.assisters || []).forEach(a => participantIds.add(a.playerId));
  (match.playerRatings || []).forEach(r => participantIds.add(r.playerId));
  if (match.mvpPlayerId) participantIds.add(match.mvpPlayerId);

  let rowsToRender = players.filter(p => participantIds.has(p.id) || participantIds.has(p.username) || participantIds.has(p.name.toLowerCase()));
  
  // If no specific participants, fallback to all registered squad players
  if (rowsToRender.length === 0) {
    rowsToRender = players.slice(0, 10);
  }

  rowsToRender.forEach((p, idx) => {
    // Alternate row colors for clean readability
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentWidth, 7, 'F');
    }

    const gScored = (match.scorers || []).find(s => s.playerId === p.id || s.playerId === p.username || s.playerId?.toLowerCase() === p.name.toLowerCase())?.goals || 0;
    const aMade = (match.assisters || []).find(a => a.playerId === p.id || a.playerId === p.username || a.playerId?.toLowerCase() === p.name.toLowerCase())?.assists || 0;
    const ratingEntry = (match.playerRatings || []).find(r => r.playerId === p.id || r.playerId === p.username || r.playerId?.toLowerCase() === p.name.toLowerCase());
    const ratingStr = ratingEntry && ratingEntry.rating > 0 ? `${ratingEntry.rating.toFixed(1)} ★` : '--';

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(margin, y + 7, margin + contentWidth, y + 7);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', p.id === match.mvpPlayerId ? 'bold' : 'normal');

    const displayName = p.id === match.mvpPlayerId ? `${p.name} (MVP)` : p.name;
    doc.text(displayName, margin + 4, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(p.position || 'Squad', margin + 60, y + 4.8);

    doc.setTextColor(gScored > 0 ? primaryGold[0] : textMuted[0], gScored > 0 ? primaryGold[1] : textMuted[1], gScored > 0 ? primaryGold[2] : textMuted[2]);
    doc.setFont('helvetica', gScored > 0 ? 'bold' : 'normal');
    doc.text(`${gScored}`, margin + 98, y + 4.8, { align: 'center' });

    doc.setTextColor(aMade > 0 ? 59 : textMuted[0], aMade > 0 ? 130 : textMuted[1], aMade > 0 ? 246 : textMuted[2]);
    doc.setFont('helvetica', aMade > 0 ? 'bold' : 'normal');
    doc.text(`${aMade}`, margin + 122, y + 4.8, { align: 'center' });

    doc.setTextColor(ratingEntry && ratingEntry.rating >= 8.5 ? primaryGold[0] : textDark[0], ratingEntry && ratingEntry.rating >= 8.5 ? primaryGold[1] : textDark[1], ratingEntry && ratingEntry.rating >= 8.5 ? primaryGold[2] : textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(ratingStr, margin + contentWidth - 20, y + 4.8, { align: 'center' });

    y += 7;
  });

  y += 5;

  // --- TACTICAL NOTES & SUMMARY ---
  if (match.notes && y < 255) {
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setTextColor(primaryGold[0], primaryGold[1], primaryGold[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TACTICAL NOTES & SUMMARY:', margin + 4, y + 5.5);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const splitNotes = doc.splitTextToSize(`"${match.notes}"`, contentWidth - 8);
    doc.text(splitNotes, margin + 4, y + 10.5);

    y += 22;
  }

  // --- FOOTER SECTION ---
  doc.setDrawColor(primaryGold[0], primaryGold[1], primaryGold[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, 280, pageWidth - margin, 280);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('THE PHARAOHS FC INTERNAL MATCH AUDIT • CLOUD SYNCHRONIZED ACROSS ALL SQUAD ACCOUNTS', margin, 285);
  doc.text('PAGE 1 OF 1', pageWidth - margin, 285, { align: 'right' });

  // Trigger download
  const cleanDate = (match.date || 'match').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanOpp = (match.opponent || 'opponent').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `PharaohsFC_Match_${cleanOpp}_${cleanDate}.pdf`;
  
  doc.save(filename);
}
