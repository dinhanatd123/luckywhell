import React, { useState } from 'react';
import { Check, Copy, Download, RotateCcw, Trash2, Trophy } from 'lucide-react';
import { WinnerRecord } from '../types/luckyWheel';
import {
  buildWinnersCsv,
  buildWinnersSummaryText,
  formatAwardTimestamp,
} from '../utils/participants';

interface WinnersTabProps {
  eventTitle: string;
  winners: WinnerRecord[];
  onUndoWinner: (winner: WinnerRecord) => void;
  onRequestResetAll: () => void;
}

export const WinnersTab: React.FC<WinnersTabProps> = ({
  eventTitle,
  winners,
  onUndoWinner,
  onRequestResetAll,
}) => {
  const [copied, setCopied] = useState(false);

  const handleExportCsv = () => {
    const csv = buildWinnersCsv(winners, eventTitle);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bang-vang-trung-thuong-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = async () => {
    const text = buildWinnersSummaryText(winners, eventTitle);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback textarea copy
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="flex flex-col gap-3.5" data-testid="winners-tab-panel">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          Tổng số đã trao: <strong className="text-[var(--text-primary)]">{winners.length}</strong>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={winners.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Xuất CSV</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            disabled={winners.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{copied ? 'Đã sao chép' : 'Sao chép kết quả'}</span>
          </button>
        </div>
      </div>

      {/* Honor Roll Table / List */}
      <div className="max-h-[340px] overflow-y-auto rounded-xl border border-[var(--border-hairline)]">
        {winners.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <Trophy className="h-8 w-8 text-[var(--text-muted)] opacity-55" aria-hidden="true" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              Bảng vàng đang chờ chủ nhân đầu tiên
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Nhấn QUAY NGAY và xác nhận trao thưởng để lưu vào lịch sử.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-hairline)]">
            {winners.map((w, idx) => (
              <div
                key={w.id}
                className="flex items-start justify-between gap-3 px-3.5 py-2.5 hover:bg-[var(--bg-surface-elevated)] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tabular text-xs text-[var(--text-muted)]">
                      #{winners.length - idx}
                    </span>
                    <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {w.participantName}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--accent-gold)] font-medium">
                    {w.prizeName} · {w.prizeReward}
                  </p>
                  <p className="mt-0.5 font-mono-tabular text-[11px] text-[var(--text-muted)]">
                    {formatAwardTimestamp(w.awardedAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onUndoWinner(w)}
                  aria-label={`Hoàn tác trao thưởng cho ${w.participantName}`}
                  title="Hoàn tác / Xóa lượt trúng này"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--border-hairline)] px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-red-400 hover:border-red-500/40 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Hoàn tác</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset All Data button */}
      <div className="pt-1 flex justify-end">
        <button
          type="button"
          onClick={onRequestResetAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/35 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Reset toàn bộ dữ liệu</span>
        </button>
      </div>
    </div>
  );
};
