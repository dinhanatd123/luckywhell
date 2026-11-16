import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  ArrowRight,
  Cloud,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CloudSyncModal } from './components/CloudSyncModal';
import { ConfirmModal } from './components/ConfirmModal';
import { LuckyWheelCanvas } from './components/LuckyWheelCanvas';
import { ParticipantsTab } from './components/ParticipantsTab';
import { PrizesTab } from './components/PrizesTab';
import { WinnerModal } from './components/WinnerModal';
import { WinnersTab } from './components/WinnersTab';
import { createDefaultWorkspace } from './data/seedData';
import { auth, googleProvider, testFirestoreConnection } from './services/firebase';
import {
  confirmAwardInCloud,
  deleteCloudEvent,
  deleteCloudPrize,
  saveWorkspaceToCloud,
  subscribeUserEvents,
  subscribeWorkspace,
  syncParticipantsReplaceAll,
  toggleCloudParticipantActive,
  undoWinnerInCloud,
  updateCloudEventMeta,
  upsertCloudPrize,
} from './services/firestoreSync';
import {
  CloudEventSummary,
  EventWorkspace,
  ManagementTab,
  Participant,
  Prize,
  ThemeMode,
  WinnerRecord,
} from './types/luckyWheel';
import { createId } from './utils/participants';
import { soundEngine } from './utils/soundEngine';

const LOCAL_STORAGE_KEY = 'lucky_wheel_studio_v1';

function loadInitialWorkspace(): EventWorkspace {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return createDefaultWorkspace();
    const parsed = JSON.parse(raw) as Partial<EventWorkspace>;
    if (!parsed || !Array.isArray(parsed.participants) || !Array.isArray(parsed.prizes)) {
      return createDefaultWorkspace();
    }
    return {
      id: typeof parsed.id === 'string' ? parsed.id : 'default_local',
      title:
        typeof parsed.title === 'string' && parsed.title.trim()
          ? parsed.title
          : 'Vòng Quay May Mắn — Gala Trao Thưởng 2026',
      theme:
        parsed.theme === 'gala' || parsed.theme === 'light' || parsed.theme === 'cyber'
          ? parsed.theme
          : 'cyber',
      spinDuration:
        typeof parsed.spinDuration === 'number'
          ? Math.min(15, Math.max(3, parsed.spinDuration))
          : 6,
      autoRemoveWinner:
        typeof parsed.autoRemoveWinner === 'boolean' ? parsed.autoRemoveWinner : true,
      selectedPrizeId:
        typeof parsed.selectedPrizeId === 'string' ? parsed.selectedPrizeId : '',
      participants: parsed.participants,
      prizes: parsed.prizes,
      winners: Array.isArray(parsed.winners) ? parsed.winners : [],
      updatedAt:
        typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return createDefaultWorkspace();
  }
}

export default function App() {
  const [workspace, setWorkspace] = useState<EventWorkspace>(() => loadInitialWorkspace());
  const [activeTab, setActiveTab] = useState<ManagementTab>('participants');
  const [isMuted, setIsMuted] = useState(false);
  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<Participant | null>(null);

  // Inline editable event title
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(workspace.title);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Modals
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);

  // Firebase Auth & Cloud Sync state
  const [user, setUser] = useState<User | null>(null);
  const [cloudEvents, setCloudEvents] = useState<CloudEventSummary[]>([]);
  const [activeCloudEventId, setActiveCloudEventId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [syncError, setSyncError] = useState<string | null>(null);

  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const activeCloudIdRef = useRef(activeCloudEventId);
  activeCloudIdRef.current = activeCloudEventId;

  // Apply theme to document root for CSS variables & dark variant
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', workspace.theme);
  }, [workspace.theme]);

  // Persist locally on every change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      // Ignore storage quota errors
    }
  }, [workspace]);

  // Sync mute state to Web Audio synthesizer
  useEffect(() => {
    soundEngine.setMuted(isMuted);
  }, [isMuted]);

  // Test Firestore connection on boot
  useEffect(() => {
    void testFirestoreConnection();
  }, []);

  // Auth listener & user cloud events list
  useEffect(() => {
    let unsubEvents: (() => void) | null = null;
    let autoBootstrapped = false;

    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setSyncError(null);
      if (unsubEvents) {
        unsubEvents();
        unsubEvents = null;
      }

      if (!nextUser) {
        setCloudEvents([]);
        setActiveCloudEventId(null);
        setSyncStatus('local');
        return;
      }

      setSyncStatus('syncing');
      unsubEvents = subscribeUserEvents(
        nextUser.uid,
        (events) => {
          setCloudEvents(events);
          if (events.length === 0 && !autoBootstrapped) {
            autoBootstrapped = true;
            void saveWorkspaceToCloud(nextUser.uid, workspaceRef.current)
              .then((createdId) => {
                setActiveCloudEventId(createdId);
                setSyncStatus('synced');
              })
              .catch((err) => {
                setSyncStatus('error');
                setSyncError(err instanceof Error ? err.message : 'Lỗi đồng bộ Firestore');
              });
          } else if (events.length > 0 && !activeCloudIdRef.current) {
            setActiveCloudEventId(events[0].id);
          }
        },
        (err) => {
          setSyncStatus('error');
          setSyncError(err.message);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubEvents) unsubEvents();
    };
  }, []);

  // Subscribe to the active Cloud Event document & subcollections
  useEffect(() => {
    if (!user || !activeCloudEventId) return;
    setSyncStatus('syncing');

    const unsub = subscribeWorkspace(user.uid, activeCloudEventId, {
      onMeta: (meta) => {
        setWorkspace((prev) => ({
          ...prev,
          id: activeCloudEventId,
          title: meta.title,
          theme: meta.theme,
          spinDuration: meta.spinDuration,
          autoRemoveWinner: meta.autoRemoveWinner,
          selectedPrizeId: meta.selectedPrizeId,
          updatedAt: meta.updatedAt,
        }));
        setSyncStatus('synced');
      },
      onParticipants: (participants) => {
        setWorkspace((prev) => ({ ...prev, participants }));
      },
      onPrizes: (prizes) => {
        setWorkspace((prev) => ({ ...prev, prizes }));
      },
      onWinners: (winners) => {
        setWorkspace((prev) => ({ ...prev, winners }));
      },
      onError: (err) => {
        setSyncStatus('error');
        setSyncError(err.message);
      },
    });

    return () => unsub();
  }, [user, activeCloudEventId]);

  const activeParticipants = useMemo(
    () => workspace.participants.filter((p) => p.active),
    [workspace.participants]
  );

  const selectedPrize = useMemo(
    () => workspace.prizes.find((p) => p.id === workspace.selectedPrizeId) ?? null,
    [workspace.prizes, workspace.selectedPrizeId]
  );

  const nextAvailablePrize = useMemo(
    () =>
      workspace.prizes.find(
        (p) => p.id !== workspace.selectedPrizeId && p.remainingQuantity > 0
      ) ?? null,
    [workspace.prizes, workspace.selectedPrizeId]
  );

  const totalRemainingPrizes = useMemo(
    () => workspace.prizes.reduce((sum, p) => sum + p.remainingQuantity, 0),
    [workspace.prizes]
  );

  const withCloudGuard = useCallback(async (action: () => Promise<void>) => {
    try {
      setSyncError(null);
      await action();
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : 'Lỗi đồng bộ dữ liệu');
    }
  }, []);

  // Handlers
  const handleTitleCommit = () => {
    const clean = titleDraft.trim().slice(0, 160) || workspace.title;
    setEditingTitle(false);
    setTitleDraft(clean);
    setWorkspace((prev) => ({ ...prev, title: clean, updatedAt: new Date().toISOString() }));
    if (user && activeCloudEventId) {
      void withCloudGuard(() => updateCloudEventMeta(activeCloudEventId, { title: clean }));
    }
  };

  const handleThemeChange = (theme: ThemeMode) => {
    setWorkspace((prev) => ({ ...prev, theme, updatedAt: new Date().toISOString() }));
    if (user && activeCloudEventId) {
      void withCloudGuard(() => updateCloudEventMeta(activeCloudEventId, { theme }));
    }
  };

  const handleSpinDurationChange = (spinDuration: number) => {
    setWorkspace((prev) => ({ ...prev, spinDuration, updatedAt: new Date().toISOString() }));
    if (user && activeCloudEventId) {
      void withCloudGuard(() => updateCloudEventMeta(activeCloudEventId, { spinDuration }));
    }
  };

  const handleToggleAutoRemove = (autoRemoveWinner: boolean) => {
    setWorkspace((prev) => ({ ...prev, autoRemoveWinner, updatedAt: new Date().toISOString() }));
    if (user && activeCloudEventId) {
      void withCloudGuard(() => updateCloudEventMeta(activeCloudEventId, { autoRemoveWinner }));
    }
  };

  const handleSelectPrize = (selectedPrizeId: string) => {
    setWorkspace((prev) => ({ ...prev, selectedPrizeId, updatedAt: new Date().toISOString() }));
    if (user && activeCloudEventId) {
      void withCloudGuard(() => updateCloudEventMeta(activeCloudEventId, { selectedPrizeId }));
    }
  };

  const handleUpdateParticipants = (nextParticipants: Participant[]) => {
    setWorkspace((prev) => ({
      ...prev,
      participants: nextParticipants,
      updatedAt: new Date().toISOString(),
    }));
    if (user && activeCloudEventId) {
      void withCloudGuard(() =>
        syncParticipantsReplaceAll(user.uid, activeCloudEventId, nextParticipants)
      );
    }
  };

  const handleToggleParticipantActive = (id: string, active: boolean) => {
    setWorkspace((prev) => ({
      ...prev,
      participants: prev.participants.map((p) => (p.id === id ? { ...p, active } : p)),
      updatedAt: new Date().toISOString(),
    }));
    if (user && activeCloudEventId) {
      void withCloudGuard(() => toggleCloudParticipantActive(activeCloudEventId, id, active));
    }
  };

  const handleAddPrize = (prize: Prize) => {
    setWorkspace((prev) => ({
      ...prev,
      prizes: [...prev.prizes, prize],
      selectedPrizeId: prev.selectedPrizeId || prize.id,
      updatedAt: new Date().toISOString(),
    }));
    if (user && activeCloudEventId) {
      void withCloudGuard(() => upsertCloudPrize(user.uid, activeCloudEventId, prize, true));
    }
  };

  const handleUpdatePrize = (updated: Prize) => {
    setWorkspace((prev) => ({
      ...prev,
      prizes: prev.prizes.map((p) => (p.id === updated.id ? updated : p)),
      updatedAt: new Date().toISOString(),
    }));
    if (user && activeCloudEventId) {
      void withCloudGuard(() => upsertCloudPrize(user.uid, activeCloudEventId, updated, false));
    }
  };

  const handleDeletePrize = (id: string) => {
    setWorkspace((prev) => {
      const remaining = prev.prizes.filter((p) => p.id !== id);
      const nextSelected =
        prev.selectedPrizeId === id ? remaining[0]?.id ?? '' : prev.selectedPrizeId;
      return {
        ...prev,
        prizes: remaining,
        selectedPrizeId: nextSelected,
        updatedAt: new Date().toISOString(),
      };
    });
    if (user && activeCloudEventId) {
      void withCloudGuard(() => deleteCloudPrize(activeCloudEventId, id));
    }
  };

  const handleConfirmAward = () => {
    if (!pendingWinner) return;
    const prize = selectedPrize;
    const winnerRecord: WinnerRecord = {
      id: createId('win'),
      participantId: pendingWinner.id,
      participantName: pendingWinner.name,
      prizeId: prize?.id ?? 'bonus_prize',
      prizeName: prize?.name ?? 'Giải Phụ / Giao lưu',
      prizeReward: prize?.reward ?? 'Quà lưu niệm sự kiện',
      awardedAt: new Date().toISOString(),
    };

    const nextRemaining = prize ? Math.max(0, prize.remainingQuantity - 1) : 0;
    const shouldHide = workspace.autoRemoveWinner;

    setWorkspace((prev) => ({
      ...prev,
      winners: [winnerRecord, ...prev.winners],
      prizes: prize
        ? prev.prizes.map((p) =>
            p.id === prize.id ? { ...p, remainingQuantity: nextRemaining } : p
          )
        : prev.prizes,
      participants: shouldHide
        ? prev.participants.map((p) =>
            p.id === pendingWinner.id ? { ...p, active: false } : p
          )
        : prev.participants,
      updatedAt: new Date().toISOString(),
    }));

    if (user && activeCloudEventId && prize) {
      void withCloudGuard(() =>
        confirmAwardInCloud(user.uid, activeCloudEventId, winnerRecord, nextRemaining, shouldHide)
      );
    }

    setPendingWinner(null);
  };

  const handleCancelAbsent = (hideAbsentParticipant: boolean) => {
    if (pendingWinner && hideAbsentParticipant) {
      handleToggleParticipantActive(pendingWinner.id, false);
    }
    setPendingWinner(null);
  };

  const handleUndoWinner = (winner: WinnerRecord) => {
    const targetPrize = workspace.prizes.find((p) => p.id === winner.prizeId);
    const nextPrizeRem = targetPrize
      ? Math.min(targetPrize.totalQuantity, targetPrize.remainingQuantity + 1)
      : null;
    const hasParticipant = workspace.participants.some((p) => p.id === winner.participantId);

    setWorkspace((prev) => ({
      ...prev,
      winners: prev.winners.filter((w) => w.id !== winner.id),
      prizes:
        nextPrizeRem !== null
          ? prev.prizes.map((p) =>
              p.id === winner.prizeId ? { ...p, remainingQuantity: nextPrizeRem } : p
            )
          : prev.prizes,
      participants: hasParticipant
        ? prev.participants.map((p) =>
            p.id === winner.participantId ? { ...p, active: true } : p
          )
        : prev.participants,
      updatedAt: new Date().toISOString(),
    }));

    if (user && activeCloudEventId) {
      void withCloudGuard(() =>
        undoWinnerInCloud(activeCloudEventId, winner, nextPrizeRem, hasParticipant)
      );
    }
  };

  const handleResetAll = () => {
    const fresh = createDefaultWorkspace(activeCloudEventId ?? 'default_local');
    setWorkspace(fresh);
    setResetModalOpen(false);
    if (user && activeCloudEventId) {
      void withCloudGuard(async () => {
        await saveWorkspaceToCloud(user.uid, fresh);
      });
    }
  };

  const toggleProjectorMode = () => {
    setIsProjectorMode((prev) => {
      const next = !prev;
      try {
        if (next && document.documentElement.requestFullscreen && !document.fullscreenElement) {
          void document.documentElement.requestFullscreen().catch(() => {});
        } else if (!next && document.fullscreenElement && document.exitFullscreen) {
          void document.exitFullscreen().catch(() => {});
        }
      } catch {
        // Ignore fullscreen permission errors inside sandboxed iframes
      }
      return next;
    });
  };

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setIsProjectorMode(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleGoogleSignIn = async () => {
    setSyncError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/unauthorized-domain')) {
        setSyncError(
          `Tên miền "${window.location.hostname}" chưa được cấp phép trong Firebase Authentication (Authorized domains). Hãy thêm "${window.location.hostname}" vào Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setSyncError(
          err instanceof Error ? err.message : 'Không thể đăng nhập Google. Vui lòng thử lại.'
        );
      }
    }
  };

  const handleGoogleSignOut = async () => {
    await signOut(auth);
  };

  const handleSaveCurrentAsNewEvent = async (customTitle?: string) => {
    if (!user) return;
    const newId = createId('evt');
    const copy: EventWorkspace = {
      ...workspace,
      id: newId,
      title: customTitle || workspace.title,
      updatedAt: new Date().toISOString(),
    };
    await withCloudGuard(async () => {
      const createdId = await saveWorkspaceToCloud(user.uid, copy);
      setActiveCloudEventId(createdId);
    });
  };

  const handleDeleteCloudEvent = async (eventId: string) => {
    if (!user) return;
    await withCloudGuard(async () => {
      await deleteCloudEvent(user.uid, eventId);
      if (activeCloudEventId === eventId) {
        const next = cloudEvents.find((e) => e.id !== eventId);
        setActiveCloudEventId(next?.id ?? null);
      }
    });
  };

  return (
    <div className="studio-backdrop min-h-screen flex flex-col">
      {/* Top Bar (Clean Single-Row Contract) */}
      <header className="border-b border-[var(--border-hairline)] px-4 sm:px-6 py-3">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0">
              Lucky Studio
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Theme Switcher */}
            <div
              role="group"
              aria-label="Chọn giao diện màu sắc"
              className="flex items-center rounded-lg border border-[var(--border-hairline)] p-0.5 surface-elevated"
            >
              {(
                [
                  { id: 'cyber', label: 'Cyber Dark', short: 'Cyber' },
                  { id: 'gala', label: 'Festival Gala', short: 'Gala' },
                  { id: 'light', label: 'Clean Light', short: 'Sáng' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleThemeChange(t.id)}
                  data-testid={`theme-btn-${t.id}`}
                  aria-label={t.label}
                  className={`rounded-md px-2 sm:px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    workspace.theme === t.id
                      ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="sm:hidden">{t.short}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Sound Mute Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{isMuted ? 'Đã tắt tiếng' : 'Âm thanh'}</span>
            </button>

            {/* Projector / Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleProjectorMode}
              aria-label={isProjectorMode ? 'Thoát chế độ máy chiếu' : 'Chế độ máy chiếu'}
              data-testid="projector-mode-btn"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isProjectorMode ? (
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {isProjectorMode ? 'Thu nhỏ sân khấu' : 'Máy chiếu'}
              </span>
            </button>

            {/* Cloud Database Button */}
            <button
              type="button"
              onClick={() => setCloudModalOpen(true)}
              data-testid="cloud-db-btn"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                background: 'var(--accent-primary)',
                color: 'var(--accent-primary-fg)',
              }}
            >
              <Cloud className="h-4 w-4" aria-hidden="true" />
              <span>{user ? user.displayName?.split(' ')[0] || 'Cloud' : 'Lưu Cloud'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Grid */}
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col lg:flex-row items-stretch gap-6 px-4 sm:px-6 py-5">
        {/* Left / Center Stage (62% or 100% in Projector Mode) */}
        <section
          aria-label="Sân khấu vòng quay"
          className={`glass-panel flex flex-col justify-between rounded-2xl p-5 sm:p-6 transition-all ${
            isProjectorMode ? 'w-full' : 'w-full lg:w-[62%]'
          }`}
        >
          {/* Event Title (Click to edit) + Active Prize Selector */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={titleDraft}
                  maxLength={160}
                  autoFocus
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleCommit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleCommit();
                    if (e.key === 'Escape') {
                      setTitleDraft(workspace.title);
                      setEditingTitle(false);
                    }
                  }}
                  aria-label="Sửa tiêu đề sự kiện"
                  className="studio-input w-full rounded-lg px-3 py-1.5 text-xl sm:text-2xl font-bold"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(workspace.title);
                    setEditingTitle(true);
                  }}
                  title="Nhấn để sửa tiêu đề sự kiện"
                  className="group flex items-center gap-2 text-left cursor-pointer"
                >
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] [text-wrap:balance]">
                    {workspace.title}
                  </h1>
                  <Pencil
                    className="h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-60 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </button>
              )}

              {isProjectorMode && (
                <button
                  type="button"
                  onClick={toggleProjectorMode}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
                  <span>Mở bảng quản lý</span>
                </button>
              )}
            </div>

            {/* Active Prize Selector Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl surface-elevated px-3.5 py-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <label
                  htmlFor="active-prize-select"
                  className="text-xs font-medium text-[var(--text-muted)] whitespace-nowrap shrink-0"
                >
                  Đang quay cho giải:
                </label>
                <select
                  id="active-prize-select"
                  data-testid="active-prize-select"
                  value={workspace.selectedPrizeId}
                  onChange={(e) => handleSelectPrize(e.target.value)}
                  disabled={isSpinning}
                  className="studio-input min-w-0 w-full sm:flex-1 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold"
                >
                  {workspace.prizes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Còn {p.remainingQuantity}/{p.totalQuantity} giải)
                    </option>
                  ))}
                  <option value="">Quay giải phụ (Không gắn giải cố định)</option>
                </select>
              </div>
              {selectedPrize && (
                <div className="text-xs sm:text-sm font-semibold text-[var(--accent-gold)] whitespace-nowrap shrink-0 tabular-nums">
                  {selectedPrize.reward}
                </div>
              )}
            </div>

            {/* Out-of-stock Prize Suggestion */}
            {selectedPrize && selectedPrize.remainingQuantity === 0 && (
              <div
                data-testid="prize-exhausted-banner"
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200"
              >
                <span>
                  Hạng mục <strong>{selectedPrize.name}</strong> đã trao đủ (0/
                  {selectedPrize.totalQuantity}). Bạn vẫn có thể quay thêm giải phụ hoặc chuyển
                  giải.
                </span>
                {nextAvailablePrize && (
                  <button
                    type="button"
                    onClick={() => handleSelectPrize(nextAvailablePrize.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-400 whitespace-nowrap cursor-pointer"
                  >
                    <span>Chuyển sang {nextAvailablePrize.name}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Center Wheel Canvas */}
          <div className="my-4 flex flex-1 items-center justify-center">
            <LuckyWheelCanvas
              participants={workspace.participants}
              theme={workspace.theme}
              spinDuration={workspace.spinDuration}
              canSpin={activeParticipants.length > 0}
              disabled={pendingWinner !== null}
              onSpinStart={() => setIsSpinning(true)}
              onSpinComplete={(winner) => {
                setIsSpinning(false);
                setPendingWinner(winner);
              }}
            />
          </div>

          {/* Bottom Stage Quick Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-3.5">
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] tabular-nums">
              <span>
                Sẵn sàng: <strong className="text-[var(--text-primary)]">{activeParticipants.length}</strong> người
              </span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Nhấn phím Space để quay nhanh</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="whitespace-nowrap">Thời gian quay:</span>
                <select
                  aria-label="Thời gian quay (giây)"
                  value={workspace.spinDuration}
                  disabled={isSpinning}
                  onChange={(e) => handleSpinDurationChange(Number(e.target.value))}
                  className="studio-input rounded-lg px-2 py-1 text-xs font-mono-tabular"
                >
                  {[3, 4, 5, 6, 8, 10, 12, 15].map((sec) => (
                    <option key={sec} value={sec}>
                      {sec} giây
                    </option>
                  ))}
                </select>
              </label>

              {!isProjectorMode && (
                <button
                  type="button"
                  onClick={() => setIsProjectorMode(true)}
                  className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap cursor-pointer"
                >
                  <PanelRightClose className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ẩn bảng</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Right Tabbed Management Panel (38%) */}
        {!isProjectorMode && (
          <aside
            aria-label="Bảng quản lý sự kiện"
            className="glass-panel flex w-full lg:w-[38%] flex-col rounded-2xl p-4 sm:p-5"
          >
            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Quản lý sự kiện"
              className="grid grid-cols-3 gap-1 rounded-xl surface-elevated p-1"
            >
              {(
                [
                  {
                    id: 'participants',
                    label: 'Người tham gia',
                    shortLabel: 'Người chơi',
                    count: activeParticipants.length,
                  },
                  {
                    id: 'prizes',
                    label: 'Giải thưởng',
                    shortLabel: 'Giải thưởng',
                    count: totalRemainingPrizes,
                  },
                  {
                    id: 'winners',
                    label: 'Bảng vàng',
                    shortLabel: 'Bảng vàng',
                    count: workspace.winners.length,
                  },
                ] as const
              ).map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    data-testid={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-1.5 sm:px-2 py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap cursor-pointer tabular-nums ${
                      selected
                        ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="sm:hidden">{tab.shortLabel} ({tab.count})</span>
                    <span className="hidden sm:inline">{tab.label} ({tab.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Body */}
            <div className="mt-4 flex-1">
              {activeTab === 'participants' && (
                <ParticipantsTab
                  participants={workspace.participants}
                  autoRemoveWinner={workspace.autoRemoveWinner}
                  onToggleAutoRemove={handleToggleAutoRemove}
                  onUpdateParticipants={handleUpdateParticipants}
                  onToggleParticipantActive={handleToggleParticipantActive}
                />
              )}
              {activeTab === 'prizes' && (
                <PrizesTab
                  prizes={workspace.prizes}
                  selectedPrizeId={workspace.selectedPrizeId}
                  onSelectPrize={handleSelectPrize}
                  onAddPrize={handleAddPrize}
                  onUpdatePrize={handleUpdatePrize}
                  onDeletePrize={handleDeletePrize}
                />
              )}
              {activeTab === 'winners' && (
                <WinnersTab
                  eventTitle={workspace.title}
                  winners={workspace.winners}
                  onUndoWinner={handleUndoWinner}
                  onRequestResetAll={() => setResetModalOpen(true)}
                />
              )}
            </div>
          </aside>
        )}
      </main>

      {/* Winner Celebration Modal */}
      <WinnerModal
        winner={pendingWinner}
        prize={selectedPrize}
        autoRemoveWinner={workspace.autoRemoveWinner}
        onConfirmAward={handleConfirmAward}
        onCancelAbsent={handleCancelAbsent}
      />

      {/* Reset All Confirmation Modal */}
      <ConfirmModal
        open={resetModalOpen}
        title="Reset toàn bộ dữ liệu sự kiện?"
        description="Thao tác này sẽ xóa bảng vàng trúng thưởng hiện tại và khôi phục 12 nhân sự mẫu cùng 4 hạng mục giải thưởng ban đầu."
        confirmLabel="Xác nhận Reset"
        onConfirm={handleResetAll}
        onCancel={() => setResetModalOpen(false)}
      />

      {/* Cloud Database Modal */}
      <CloudSyncModal
        open={cloudModalOpen}
        user={user}
        activeCloudEventId={activeCloudEventId}
        cloudEvents={cloudEvents}
        syncStatus={syncStatus}
        syncError={syncError}
        onClose={() => setCloudModalOpen(false)}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
        onSelectEvent={(id) => setActiveCloudEventId(id)}
        onSaveCurrentAsNewEvent={handleSaveCurrentAsNewEvent}
        onDeleteCloudEvent={handleDeleteCloudEvent}
      />
    </div>
  );
}
