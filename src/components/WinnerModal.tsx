import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Award, CheckCircle2, RotateCcw, Trophy } from 'lucide-react';
import { Participant, Prize } from '../types/luckyWheel';

interface WinnerModalProps {
  winner: Participant | null;
  prize: Prize | null;
  autoRemoveWinner: boolean;
  onConfirmAward: () => void;
  onCancelAbsent: (hideAbsentParticipant: boolean) => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  prize,
  autoRemoveWinner,
  onConfirmAward,
  onCancelAbsent,
}) => {
  const [hideAbsent, setHideAbsent] = useState(false);

  useEffect(() => {
    if (!winner) return;
    setHideAbsent(false);

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const colors = ['#06B6D4', '#F59E0B', '#F43F5E', '#10B981', '#FDE047'];
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.55 },
      colors,
    });
    const timer = window.setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        origin: { x: 0.12, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        origin: { x: 0.88, y: 0.6 },
        colors,
      });
    }, 240);

    return () => window.clearTimeout(timer);
  }, [winner]);

  if (!winner) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-modal-heading"
      data-testid="winner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="glass-panel relative w-full max-w-lg rounded-2xl p-6 sm:p-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-strong)]"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-gold)' }}
        >
          <Trophy className="h-9 w-9" aria-hidden="true" />
        </div>

        <p className="text-sm font-medium text-[var(--text-muted)]">
          Chúc mừng chủ nhân giải thưởng
        </p>

        <h2
          id="winner-modal-heading"
          data-testid="winner-name"
          className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] break-words"
        >
          {winner.name}
        </h2>

        {prize ? (
          <div className="mt-5 rounded-xl surface-elevated px-4 py-3.5">
            <div className="flex items-center justify-center gap-2 text-base font-semibold text-[var(--accent-primary)]">
              <Award className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{prize.name}</span>
            </div>
            <p className="mt-1 text-lg font-bold text-[var(--accent-gold)]">{prize.reward}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
              Còn lại trước khi trao: {prize.remainingQuantity}/{prize.totalQuantity} giải
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl surface-elevated px-4 py-3 text-sm text-[var(--text-secondary)]">
            Lượt quay phụ · Chưa chọn hạng mục giải thưởng cụ thể
          </div>
        )}

        {autoRemoveWinner && (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Khi xác nhận trao thưởng, tên người trúng sẽ tự động ẩn khỏi các lượt quay tiếp theo.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirmAward}
            data-testid="confirm-award-btn"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-transform active:scale-[0.99] cursor-pointer"
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--accent-primary-fg)',
            }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">Xác nhận Trao thưởng</span>
          </button>

          <div className="rounded-xl border border-[var(--border-hairline)] p-3">
            <label className="mb-2.5 flex cursor-pointer items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={hideAbsent}
                onChange={(e) => setHideAbsent(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--accent-primary)]"
              />
              <span>Ẩn người vắng mặt này khỏi vòng quay tiếp theo</span>
            </label>
            <button
              type="button"
              onClick={() => onCancelAbsent(hideAbsent)}
              data-testid="cancel-absent-btn"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-hairline)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Hủy & Quay lại (Vắng mặt)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
