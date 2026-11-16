import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Cloud, FolderPlus, LogIn, LogOut, Trash2, X } from 'lucide-react';
import { CloudEventSummary } from '../types/luckyWheel';

interface CloudSyncModalProps {
  open: boolean;
  user: User | null;
  activeCloudEventId: string | null;
  cloudEvents: CloudEventSummary[];
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  onClose: () => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSelectEvent: (eventId: string) => void;
  onSaveCurrentAsNewEvent: (customTitle?: string) => Promise<void>;
  onDeleteCloudEvent: (eventId: string) => Promise<void>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  open,
  user,
  activeCloudEventId,
  cloudEvents,
  syncStatus,
  syncError,
  onClose,
  onSignIn,
  onSignOut,
  onSelectEvent,
  onSaveCurrentAsNewEvent,
  onDeleteCloudEvent,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSaveCurrentAsNewEvent(newTitle.trim() || undefined);
      setNewTitle('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Cloud className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
            <h3 id="cloud-modal-title" className="text-base font-bold text-[var(--text-primary)]">
              Cơ sở dữ liệu Đám mây (Firebase Firestore)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại cơ sở dữ liệu"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {syncError && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
            {syncError}
          </div>
        )}

        {!user ? (
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Hiện tại dữ liệu sự kiện đang tự động lưu cục bộ trên trình duyệt. Đăng nhập bằng
              Google để lưu trữ lâu dài trên <strong>Cloud Firestore</strong>, quản lý nhiều sự kiện
              và đồng bộ thời gian thực giữa các thiết bị.
            </p>
            <button
              type="button"
              onClick={() => void onSignIn()}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer"
              style={{
                background: 'var(--accent-primary)',
                color: 'var(--accent-primary-fg)',
              }}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>Đăng nhập Google & Đồng bộ Cloud</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 rounded-xl surface-elevated px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {user.displayName || user.email}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {user.email} ·{' '}
                  {syncStatus === 'syncing'
                    ? 'Đang đồng bộ...'
                    : syncStatus === 'synced'
                    ? 'Đã đồng bộ Firestore'
                    : 'Sẵn sàng'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Đăng xuất</span>
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Tên sự kiện mới để lưu lên Cloud..."
                maxLength={160}
                className="studio-input flex-1 rounded-lg px-3 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'var(--accent-primary-fg)',
                }}
              >
                <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Lưu sự kiện mới</span>
              </button>
            </form>

            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
                Sự kiện đã lưu trên Firestore ({cloudEvents.length})
              </p>
              <div className="max-h-56 overflow-y-auto divide-y divide-[var(--border-hairline)] rounded-xl border border-[var(--border-hairline)]">
                {cloudEvents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                    Chưa có sự kiện nào trên Cloud. Nhấn "Lưu sự kiện mới" để tải lên ngay.
                  </div>
                ) : (
                  cloudEvents.map((ev) => {
                    const isCurrent = ev.id === activeCloudEventId;
                    return (
                      <div
                        key={ev.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 ${
                          isCurrent ? 'bg-[var(--accent-soft)]' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectEvent(ev.id);
                            onClose();
                          }}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {ev.title}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {isCurrent ? 'Đang mở trực tiếp' : 'Nhấn để chuyển sang sự kiện này'}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteCloudEvent(ev.id)}
                          aria-label={`Xóa sự kiện ${ev.title}`}
                          className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-red-500/15 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
