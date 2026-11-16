import React, { useState } from 'react';
import { Award, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Prize } from '../types/luckyWheel';
import { createId } from '../utils/participants';

interface PrizesTabProps {
  prizes: Prize[];
  selectedPrizeId: string;
  onSelectPrize: (id: string) => void;
  onAddPrize: (prize: Prize) => void;
  onUpdatePrize: (prize: Prize) => void;
  onDeletePrize: (id: string) => void;
}

export const PrizesTab: React.FC<PrizesTabProps> = ({
  prizes,
  selectedPrizeId,
  onSelectPrize,
  onAddPrize,
  onUpdatePrize,
  onDeletePrize,
}) => {
  const [name, setName] = useState('');
  const [reward, setReward] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editReward, setEditReward] = useState('');
  const [editTotal, setEditTotal] = useState(1);
  const [editRemaining, setEditRemaining] = useState(1);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().slice(0, 120);
    const cleanReward = reward.trim().slice(0, 160);
    if (!cleanName || !cleanReward) return;
    const qty = Math.min(10000, Math.max(1, Math.floor(quantity) || 1));

    const newPrize: Prize = {
      id: createId('prize'),
      name: cleanName,
      reward: cleanReward,
      totalQuantity: qty,
      remainingQuantity: qty,
      order: prizes.length,
    };
    onAddPrize(newPrize);
    setName('');
    setReward('');
    setQuantity(1);
  };

  const startEdit = (prize: Prize) => {
    setEditingId(prize.id);
    setEditName(prize.name);
    setEditReward(prize.reward);
    setEditTotal(prize.totalQuantity);
    setEditRemaining(prize.remainingQuantity);
  };

  const saveEdit = (prize: Prize) => {
    const cleanName = editName.trim().slice(0, 120);
    const cleanReward = editReward.trim().slice(0, 160);
    if (!cleanName || !cleanReward) return;
    const total = Math.min(10000, Math.max(1, Math.floor(editTotal) || 1));
    const remaining = Math.min(total, Math.max(0, Math.floor(editRemaining) || 0));

    onUpdatePrize({
      ...prize,
      name: cleanName,
      reward: cleanReward,
      totalQuantity: total,
      remainingQuantity: remaining,
    });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-4" data-testid="prizes-tab-panel">
      {/* Add Prize Form */}
      <form onSubmit={handleAdd} className="rounded-xl surface-elevated p-3.5 flex flex-col gap-2.5">
        <div className="text-xs font-semibold text-[var(--text-secondary)]">
          Thêm hạng mục giải thưởng
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên giải (VD: Giải Khuyến Khích)"
            aria-label="Tên giải thưởng mới"
            maxLength={120}
            className="studio-input rounded-lg px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="Phần thưởng (VD: 1.000.000 VNĐ)"
            aria-label="Mô tả phần thưởng"
            maxLength={160}
            className="studio-input rounded-lg px-3 py-2 text-xs"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span>Số lượng giải:</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="studio-input w-20 rounded-lg px-2.5 py-1.5 text-xs font-mono-tabular"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--accent-primary-fg)',
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Thêm giải</span>
          </button>
        </div>
      </form>

      {/* Prize List */}
      <div className="max-h-[380px] overflow-y-auto flex flex-col gap-2">
        {prizes.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-hairline)] p-6 text-center text-xs text-[var(--text-muted)]">
            Chưa có giải thưởng nào. Hãy thêm hạng mục giải ở trên.
          </div>
        ) : (
          prizes.map((prize) => {
            const isSelected = prize.id === selectedPrizeId;
            const isEditing = editingId === prize.id;

            if (isEditing) {
              return (
                <div
                  key={prize.id}
                  className="rounded-xl border border-[var(--border-strong)] surface-elevated p-3 flex flex-col gap-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="Sửa tên giải"
                      className="studio-input rounded-lg px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={editReward}
                      onChange={(e) => setEditReward(e.target.value)}
                      aria-label="Sửa phần thưởng"
                      className="studio-input rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <label className="flex items-center gap-1.5">
                        <span>Còn lại:</span>
                        <input
                          type="number"
                          min={0}
                          max={editTotal}
                          value={editRemaining}
                          onChange={(e) => setEditRemaining(Number(e.target.value))}
                          className="studio-input w-16 rounded px-2 py-1 text-xs font-mono-tabular"
                        />
                      </label>
                      <label className="flex items-center gap-1.5">
                        <span>Tổng:</span>
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={editTotal}
                          onChange={(e) => setEditTotal(Number(e.target.value))}
                          className="studio-input w-16 rounded px-2 py-1 text-xs font-mono-tabular"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        aria-label="Hủy sửa giải"
                        className="rounded-lg border border-[var(--border-hairline)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(prize)}
                        aria-label="Lưu sửa giải"
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
                        style={{
                          background: 'var(--accent-primary)',
                          color: 'var(--accent-primary-fg)',
                        }}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={prize.id}
                className={`rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border-hairline)] hover:bg-[var(--bg-surface-elevated)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Award
                        className="h-4 w-4 shrink-0 text-[var(--accent-gold)]"
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {prize.name}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-[var(--accent-gold)]">
                      {prize.reward}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
                      Còn {prize.remainingQuantity} / {prize.totalQuantity} giải
                      {prize.remainingQuantity === 0 && ' · Đã trao hết'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectPrize(prize.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                          : 'border border-[var(--border-hairline)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      {isSelected ? 'Đang chọn' : 'Quay giải này'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(prize)}
                      aria-label={`Sửa ${prize.name}`}
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePrize(prize.id)}
                      aria-label={`Xóa ${prize.name}`}
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-red-500/15 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
