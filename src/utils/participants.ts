import { Participant, WinnerRecord } from '../types/luckyWheel';
import { secureRandomInt } from './wheelMath';

export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Parses lines from a textarea or TXT/CSV file into clean participant names.
 * Supports comma-separated CSV rows (taking the first non-empty column if needed).
 */
export function parseParticipantLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => {
      const cleaned = line.trim();
      if (!cleaned) return '';
      // If CSV line with commas and no obvious full-name comma formatting, take first cell
      if (cleaned.includes(',') && !cleaned.includes(' - ')) {
        const firstCell = cleaned.split(',')[0]?.trim().replace(/^"|"$/g, '') ?? '';
        return firstCell;
      }
      return cleaned;
    })
    .filter((name) => name.length > 0)
    .filter((name, idx) => !(idx === 0 && /^(stt|họ và tên|ho va ten|tên|name)$/i.test(name)));
}

export function deduplicateParticipants(list: Participant[]): Participant[] {
  const seen = new Set<string>();
  const unique: Participant[] = [];
  for (const item of list) {
    const key = item.name.trim().toLocaleLowerCase('vi');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ ...item, order: unique.length });
  }
  return unique;
}

export function shuffleParticipants(list: Participant[]): Participant[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.map((item, idx) => ({ ...item, order: idx }));
}

export function sortParticipantsAZ(list: Participant[]): Participant[] {
  return [...list]
    .sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }))
    .map((item, idx) => ({ ...item, order: idx }));
}

export function formatAwardTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' · ' + date.toLocaleDateString('vi-VN');
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an Excel-compatible UTF-8 BOM CSV string for Vietnamese characters.
 */
export function buildWinnersCsv(winners: WinnerRecord[], eventTitle: string): string {
  const bom = '\uFEFF';
  const headers = ['STT', 'Sự kiện', 'Họ và Tên', 'Giải thưởng', 'Phần thưởng', 'Thời gian trúng'];
  const rows = winners.map((w, idx) => [
    idx + 1,
    eventTitle,
    w.participantName,
    w.prizeName,
    w.prizeReward,
    formatAwardTimestamp(w.awardedAt),
  ]);
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return bom + lines.join('\r\n');
}

export function buildWinnersSummaryText(winners: WinnerRecord[], eventTitle: string): string {
  if (winners.length === 0) {
    return `${eventTitle}\nChưa có người trúng thưởng.`;
  }
  const lines = winners.map(
    (w, idx) =>
      `${idx + 1}. ${w.participantName} — ${w.prizeName} (${w.prizeReward}) [${formatAwardTimestamp(w.awardedAt)}]`
  );
  return `KẾT QUẢ TRAO THƯỞNG: ${eventTitle.toUpperCase()}\n${lines.join('\n')}`;
}
