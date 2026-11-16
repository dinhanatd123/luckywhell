import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDownAZ,
  Eye,
  EyeOff,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
  Trash2,
  Upload,
} from 'lucide-react';
import { Participant } from '../types/luckyWheel';
import {
  createId,
  deduplicateParticipants,
  parseParticipantLines,
  shuffleParticipants,
  sortParticipantsAZ,
} from '../utils/participants';
import { createSampleParticipants } from '../data/seedData';

interface ParticipantsTabProps {
  participants: Participant[];
  autoRemoveWinner: boolean;
  onToggleAutoRemove: (next: boolean) => void;
  onUpdateParticipants: (next: Participant[]) => void;
  onToggleParticipantActive: (id: string, active: boolean) => void;
}

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({
  participants,
  autoRemoveWinner,
  onToggleAutoRemove,
  onUpdateParticipants,
  onToggleParticipantActive,
}) => {
  const [singleName, setSingleName] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeCount = useMemo(
    () => participants.filter((p) => p.active).length,
    [participants]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('vi');
    if (!q) return participants;
    return participants.filter((p) => p.name.toLocaleLowerCase('vi').includes(q));
  }, [participants, searchQuery]);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = singleName.trim().slice(0, 120);
    if (!cleaned) return;
    const next: Participant[] = [
      ...participants,
      { id: createId('p'), name: cleaned, active: true, order: participants.length },
    ];
    onUpdateParticipants(next);
    setSingleName('');
  };

  const handleApplyBulk = (mode: 'replace' | 'append') => {
    const names = parseParticipantLines(bulkText);
    if (names.length === 0) {
      showNotice('Chưa có tên hợp lệ nào trong ô nhập.');
      return;
    }
    const newItems: Participant[] = names.map((name, idx) => ({
      id: createId('p'),
      name: name.slice(0, 120),
      active: true,
      order: mode === 'append' ? participants.length + idx : idx,
    }));
    const next = mode === 'replace' ? newItems : [...participants, ...newItems];
    onUpdateParticipants(next);
    setBulkText('');
    setBulkOpen(false);
    showNotice(`Đã cập nhật ${names.length} người tham gia.`);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const names = parseParticipantLines(text);
      if (names.length === 0) {
        showNotice('Không tìm thấy tên hợp lệ trong tệp.');
        return;
      }
      const next: Participant[] = names.map((name, idx) => ({
        id: createId('p'),
        name: name.slice(0, 120),
        active: true,
        order: idx,
      }));
      onUpdateParticipants(next);
      showNotice(`Đã nhập ${names.length} người từ ${file.name}.`);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleDeduplicate = () => {
    const deduped = deduplicateParticipants(participants);
    const removed = participants.length - deduped.length;
    onUpdateParticipants(deduped);
    showNotice(removed > 0 ? `Đã lọc ${removed} tên trùng lặp.` : 'Không có tên trùng lặp.');
  };

  const handleShuffle = () => {
    onUpdateParticipants(shuffleParticipants(participants));
    showNotice('Đã xáo trộn thứ tự danh sách.');
  };

  const handleSortAZ = () => {
    onUpdateParticipants(sortParticipantsAZ(participants));
    showNotice('Đã sắp xếp danh sách A-Z.');
  };

  const handleRestoreSample = () => {
    onUpdateParticipants(createSampleParticipants());
    showNotice('Đã khôi phục 12 nhân sự mẫu.');
  };

  const handleShowAll = () => {
    onUpdateParticipants(participants.map((p) => ({ ...p, active: true })));
    showNotice('Đã bật lại toàn bộ người tham gia.');
  };

  const handleDeleteOne = (id: string) => {
    const next = participants
      .filter((p) => p.id !== id)
      .map((p, idx) => ({ ...p, order: idx }));
    onUpdateParticipants(next);
  };

  return (
    <div className="flex flex-col gap-3.5" data-testid="participants-tab-panel">
      {/* Auto-remove toggle */}
      <div className="flex items-center justify-between gap-3 rounded-xl surface-elevated px-3.5 py-2.5">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Tự động loại người vừa trúng khỏi lượt quay tiếp theo
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={autoRemoveWinner}
          aria-label="Tự động loại người vừa trúng khỏi lượt quay tiếp theo"
          onClick={() => onToggleAutoRemove(!autoRemoveWinner)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
            autoRemoveWinner ? 'bg-[var(--accent-primary)]' : 'bg-slate-600/60'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              autoRemoveWinner ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Quick single add */}
      <form onSubmit={handleAddSingle} className="flex gap-2">
        <input
          type="text"
          value={singleName}
          onChange={(e) => setSingleName(e.target.value)}
          placeholder="Thêm tên người tham gia..."
          aria-label="Tên người tham gia mới"
          maxLength={120}
          className="studio-input flex-1 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          style={{
            background: 'var(--accent-primary)',
            color: 'var(--accent-primary-fg)',
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Thêm</span>
        </button>
      </form>

      {/* Bulk & File Import Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setBulkOpen((v) => !v);
            if (!bulkOpen) {
              setBulkText(participants.map((p) => p.name).join('\n'));
            }
          }}
          className="rounded-lg border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {bulkOpen ? 'Đóng nhập hàng loạt' : 'Nhập hàng loạt'}
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Nhập CSV / TXT</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileImport}
          className="hidden"
          aria-label="Chọn tệp CSV hoặc TXT"
        />

        <button
          type="button"
          onClick={handleDeduplicate}
          title="Lọc tên trùng lặp"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Lọc trùng</span>
        </button>

        <button
          type="button"
          onClick={handleShuffle}
          title="Xáo trộn ngẫu nhiên"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Xáo trộn</span>
        </button>

        <button
          type="button"
          onClick={handleSortAZ}
          title="Sắp xếp A-Z"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowDownAZ className="h-3.5 w-3.5" aria-hidden="true" />
          <span>A-Z</span>
        </button>

        <button
          type="button"
          onClick={handleRestoreSample}
          title="Khôi phục danh sách mẫu"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Mẫu</span>
        </button>
      </div>

      {bulkOpen && (
        <div className="rounded-xl surface-elevated p-3 flex flex-col gap-2">
          <label
            htmlFor="bulk-participants-textarea"
            className="text-xs font-medium text-[var(--text-secondary)]"
          >
            Dán danh sách từ Excel / Word / Zalo (mỗi người 1 dòng)
          </label>
          <textarea
            id="bulk-participants-textarea"
            rows={5}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'Nguyễn Văn A\nTrần Thị B\nLê Hoàng C'}
            className="studio-input w-full rounded-lg p-2.5 text-xs leading-relaxed"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleApplyBulk('append')}
              className="rounded-lg border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] whitespace-nowrap cursor-pointer"
            >
              Thêm nối tiếp
            </button>
            <button
              type="button"
              onClick={() => handleApplyBulk('replace')}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
              style={{
                background: 'var(--accent-primary)',
                color: 'var(--accent-primary-fg)',
              }}
            >
              Thay thế danh sách
            </button>
          </div>
        </div>
      )}

      {statusNotice && (
        <p className="text-xs font-medium text-[var(--accent-primary)]">{statusNotice}</p>
      )}

      {/* Search & unboxed count metadata */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] tabular-nums">
          <span>
            Đang trên vòng quay: <strong className="text-[var(--text-primary)]">{activeCount}</strong>/{participants.length}
          </span>
          {activeCount < participants.length && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleShowAll}
                className="font-medium text-[var(--accent-primary)] hover:underline cursor-pointer"
              >
                Hiện tất cả
              </button>
            </>
          )}
        </div>
        <div className="relative w-40">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên..."
            aria-label="Tìm người tham gia"
            className="studio-input w-full rounded-lg py-1 pr-2.5 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Participant List */}
      <div className="max-h-[340px] overflow-y-auto divide-y divide-[var(--border-hairline)] rounded-xl border border-[var(--border-hairline)]">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)]">
            Không có người tham gia nào phù hợp.
          </div>
        ) : (
          filtered.map((p, index) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--bg-surface-elevated)] transition-colors"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="w-6 shrink-0 text-right text-xs font-mono-tabular text-[var(--text-muted)]">
                  {index + 1}
                </span>
                <span
                  className={`truncate text-sm ${
                    p.active
                      ? 'font-medium text-[var(--text-primary)]'
                      : 'line-through text-[var(--text-muted)] opacity-60'
                  }`}
                >
                  {p.name}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleParticipantActive(p.id, !p.active)}
                  aria-label={p.active ? `Ẩn ${p.name}` : `Hiện ${p.name}`}
                  title={p.active ? 'Ẩn khỏi vòng quay' : 'Hiện lại trên vòng quay'}
                  className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {p.active ? (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteOne(p.id)}
                  aria-label={`Xóa ${p.name}`}
                  title="Xóa"
                  className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-red-500/15 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
