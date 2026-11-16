import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  CloudEventSummary,
  EventWorkspace,
  Participant,
  Prize,
  ThemeMode,
  WinnerRecord,
} from '../types/luckyWheel';
import { createId } from '../utils/participants';
import { db, handleFirestoreError, OperationType } from './firebase';

function sanitizeId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned.length > 0 ? cleaned : createId(fallbackPrefix);
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export function subscribeUserEvents(
  uid: string,
  onEvents: (events: CloudEventSummary[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const eventsRef = collection(db, 'events');
  const q = query(eventsRef, where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CloudEventSummary[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: typeof data.title === 'string' ? data.title : 'Sự kiện mới',
          theme:
            data.theme === 'gala' || data.theme === 'light' || data.theme === 'cyber'
              ? data.theme
              : 'cyber',
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      items.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      onEvents(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'events');
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeWorkspace(
  uid: string,
  eventId: string,
  callbacks: {
    onMeta: (meta: {
      title: string;
      theme: ThemeMode;
      spinDuration: number;
      autoRemoveWinner: boolean;
      selectedPrizeId: string;
      updatedAt: string;
    }) => void;
    onParticipants: (participants: Participant[]) => void;
    onPrizes: (prizes: Prize[]) => void;
    onWinners: (winners: WinnerRecord[]) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const eventPath = `events/${eventId}`;
  const unsubMeta = onSnapshot(
    doc(db, 'events', eventId),
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      callbacks.onMeta({
        title: typeof d.title === 'string' ? d.title : 'Vòng Quay May Mắn',
        theme:
          d.theme === 'gala' || d.theme === 'light' || d.theme === 'cyber'
            ? d.theme
            : 'cyber',
        spinDuration: typeof d.spinDuration === 'number' ? d.spinDuration : 6,
        autoRemoveWinner:
          typeof d.autoRemoveWinner === 'boolean' ? d.autoRemoveWinner : true,
        selectedPrizeId: typeof d.selectedPrizeId === 'string' ? d.selectedPrizeId : '',
        updatedAt: toIsoString(d.updatedAt),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, eventPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const participantsPath = `events/${eventId}/participants`;
  const unsubParticipants = onSnapshot(
    query(
      collection(db, 'events', eventId, 'participants'),
      where('ownerId', '==', uid)
    ),
    (snap) => {
      const list: Participant[] = snap.docs
        .map((d, idx) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name ?? '').slice(0, 120),
            active: Boolean(data.active),
            order: typeof data.order === 'number' ? data.order : idx,
            createdAt: toIsoString(data.createdAt),
          };
        })
        .sort((a, b) => a.order - b.order);
      callbacks.onParticipants(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, participantsPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const prizesPath = `events/${eventId}/prizes`;
  const unsubPrizes = onSnapshot(
    query(
      collection(db, 'events', eventId, 'prizes'),
      where('ownerId', '==', uid)
    ),
    (snap) => {
      const list: Prize[] = snap.docs
        .map((d, idx) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name ?? '').slice(0, 120),
            reward: String(data.reward ?? '').slice(0, 160),
            totalQuantity: typeof data.totalQuantity === 'number' ? data.totalQuantity : 1,
            remainingQuantity:
              typeof data.remainingQuantity === 'number' ? data.remainingQuantity : 0,
            order: typeof data.order === 'number' ? data.order : idx,
          };
        })
        .sort((a, b) => a.order - b.order);
      callbacks.onPrizes(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, prizesPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const winnersPath = `events/${eventId}/winners`;
  const unsubWinners = onSnapshot(
    query(
      collection(db, 'events', eventId, 'winners'),
      where('ownerId', '==', uid)
    ),
    (snap) => {
      const list: WinnerRecord[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            participantId: String(data.participantId ?? ''),
            participantName: String(data.participantName ?? '').slice(0, 120),
            prizeId: String(data.prizeId ?? ''),
            prizeName: String(data.prizeName ?? '').slice(0, 120),
            prizeReward: String(data.prizeReward ?? '').slice(0, 160),
            awardedAt: toIsoString(data.awardedAt),
          };
        })
        .sort((a, b) => b.awardedAt.localeCompare(a.awardedAt));
      callbacks.onWinners(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, winnersPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  return () => {
    unsubMeta();
    unsubParticipants();
    unsubPrizes();
    unsubWinners();
  };
}

/**
 * Persists a full workspace into Firestore (creates parent document first so security
 * rules' `isEventOwner(eventId)` sees the committed parent before writing subcollections).
 */
export async function saveWorkspaceToCloud(
  uid: string,
  workspace: EventWorkspace
): Promise<string> {
  const eventId = sanitizeId(
    workspace.id === 'default_local' ? createId('evt') : workspace.id,
    'evt'
  );
  const eventRef = doc(db, 'events', eventId);

  try {
    await setDoc(eventRef, {
      ownerId: uid,
      title: workspace.title.trim().slice(0, 160) || 'Vòng Quay May Mắn',
      theme: workspace.theme,
      spinDuration: Math.min(15, Math.max(3, Number(workspace.spinDuration) || 6)),
      autoRemoveWinner: Boolean(workspace.autoRemoveWinner),
      selectedPrizeId: sanitizeId(workspace.selectedPrizeId || '', 'prize').slice(0, 128),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${eventId}`);
  }

  const batch = writeBatch(db);

  workspace.participants.forEach((p, idx) => {
    const pid = sanitizeId(p.id, 'p');
    const pRef = doc(db, 'events', eventId, 'participants', pid);
    batch.set(pRef, {
      eventId,
      ownerId: uid,
      name: p.name.trim().slice(0, 120) || 'Thành viên',
      active: Boolean(p.active),
      order: idx,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  workspace.prizes.forEach((pr, idx) => {
    const prid = sanitizeId(pr.id, 'prize');
    const total = Math.min(10000, Math.max(1, Math.floor(pr.totalQuantity)));
    const rem = Math.min(total, Math.max(0, Math.floor(pr.remainingQuantity)));
    const prRef = doc(db, 'events', eventId, 'prizes', prid);
    batch.set(prRef, {
      eventId,
      ownerId: uid,
      name: pr.name.trim().slice(0, 120) || 'Giải thưởng',
      reward: pr.reward.trim().slice(0, 160) || 'Phần thưởng',
      totalQuantity: total,
      remainingQuantity: rem,
      order: idx,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  workspace.winners.forEach((w) => {
    const wid = sanitizeId(w.id, 'win');
    const wRef = doc(db, 'events', eventId, 'winners', wid);
    batch.set(wRef, {
      eventId,
      ownerId: uid,
      participantId: sanitizeId(w.participantId, 'p'),
      participantName: w.participantName.trim().slice(0, 120) || 'Người trúng thưởng',
      prizeId: sanitizeId(w.prizeId, 'prize'),
      prizeName: w.prizeName.trim().slice(0, 120) || 'Giải thưởng',
      prizeReward: w.prizeReward.trim().slice(0, 160) || 'Phần thưởng',
      awardedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${eventId}/batch`);
  }

  return eventId;
}

export async function updateCloudEventMeta(
  eventId: string,
  patch: Partial<Pick<EventWorkspace, 'title' | 'theme' | 'spinDuration' | 'autoRemoveWinner' | 'selectedPrizeId'>>
): Promise<void> {
  const path = `events/${eventId}`;
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.title !== undefined) {
    payload.title = patch.title.trim().slice(0, 160) || 'Vòng Quay May Mắn';
  }
  if (patch.theme !== undefined) payload.theme = patch.theme;
  if (patch.spinDuration !== undefined) {
    payload.spinDuration = Math.min(15, Math.max(3, Number(patch.spinDuration) || 6));
  }
  if (patch.autoRemoveWinner !== undefined) payload.autoRemoveWinner = Boolean(patch.autoRemoveWinner);
  if (patch.selectedPrizeId !== undefined) {
    payload.selectedPrizeId = patch.selectedPrizeId.slice(0, 128);
  }
  try {
    await updateDoc(doc(db, 'events', eventId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncParticipantsReplaceAll(
  uid: string,
  eventId: string,
  participants: Participant[]
): Promise<void> {
  const colRef = collection(db, 'events', eventId, 'participants');
  let existingDocs;
  try {
    existingDocs = await getDocs(query(colRef, where('ownerId', '==', uid)));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `events/${eventId}/participants`);
  }

  const batch = writeBatch(db);
  const nextIds = new Set(participants.map((p) => p.id));

  existingDocs.forEach((d) => {
    if (!nextIds.has(d.id)) {
      batch.delete(d.ref);
    }
  });

  const existingMap = new Map(existingDocs.docs.map((d) => [d.id, d]));

  participants.forEach((p, idx) => {
    const pid = sanitizeId(p.id, 'p');
    const ref = doc(db, 'events', eventId, 'participants', pid);
    const name = p.name.trim().slice(0, 120) || 'Thành viên';
    if (existingMap.has(pid)) {
      batch.update(ref, {
        name,
        active: Boolean(p.active),
        order: idx,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(ref, {
        eventId,
        ownerId: uid,
        name,
        active: Boolean(p.active),
        order: idx,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${eventId}/participants`);
  }
}

export async function toggleCloudParticipantActive(
  eventId: string,
  participantId: string,
  active: boolean
): Promise<void> {
  const path = `events/${eventId}/participants/${participantId}`;
  try {
    await updateDoc(doc(db, 'events', eventId, 'participants', participantId), {
      active,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertCloudPrize(
  uid: string,
  eventId: string,
  prize: Prize,
  isNew: boolean
): Promise<void> {
  const pid = sanitizeId(prize.id, 'prize');
  const path = `events/${eventId}/prizes/${pid}`;
  const total = Math.min(10000, Math.max(1, Math.floor(prize.totalQuantity)));
  const rem = Math.min(total, Math.max(0, Math.floor(prize.remainingQuantity)));
  const name = prize.name.trim().slice(0, 120) || 'Giải thưởng';
  const reward = prize.reward.trim().slice(0, 160) || 'Phần thưởng';

  try {
    if (isNew) {
      await setDoc(doc(db, 'events', eventId, 'prizes', pid), {
        eventId,
        ownerId: uid,
        name,
        reward,
        totalQuantity: total,
        remainingQuantity: rem,
        order: prize.order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'events', eventId, 'prizes', pid), {
        name,
        reward,
        totalQuantity: total,
        remainingQuantity: rem,
        order: prize.order,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteCloudPrize(eventId: string, prizeId: string): Promise<void> {
  const path = `events/${eventId}/prizes/${prizeId}`;
  try {
    await deleteDoc(doc(db, 'events', eventId, 'prizes', prizeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function confirmAwardInCloud(
  uid: string,
  eventId: string,
  winner: WinnerRecord,
  prizeRemainingAfter: number,
  hideParticipant: boolean
): Promise<void> {
  const batch = writeBatch(db);
  const wRef = doc(db, 'events', eventId, 'winners', sanitizeId(winner.id, 'win'));
  batch.set(wRef, {
    eventId,
    ownerId: uid,
    participantId: sanitizeId(winner.participantId, 'p'),
    participantName: winner.participantName.trim().slice(0, 120),
    prizeId: sanitizeId(winner.prizeId, 'prize'),
    prizeName: winner.prizeName.trim().slice(0, 120),
    prizeReward: winner.prizeReward.trim().slice(0, 160),
    awardedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  const prizeRef = doc(db, 'events', eventId, 'prizes', winner.prizeId);
  batch.update(prizeRef, {
    remainingQuantity: Math.max(0, prizeRemainingAfter),
    updatedAt: serverTimestamp(),
  });

  if (hideParticipant) {
    const partRef = doc(db, 'events', eventId, 'participants', winner.participantId);
    batch.update(partRef, {
      active: false,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${eventId}/award`);
  }
}

export async function undoWinnerInCloud(
  eventId: string,
  winner: WinnerRecord,
  nextPrizeRemaining: number | null,
  restoreParticipant: boolean
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'events', eventId, 'winners', winner.id));

  if (nextPrizeRemaining !== null) {
    batch.update(doc(db, 'events', eventId, 'prizes', winner.prizeId), {
      remainingQuantity: nextPrizeRemaining,
      updatedAt: serverTimestamp(),
    });
  }

  if (restoreParticipant) {
    batch.update(doc(db, 'events', eventId, 'participants', winner.participantId), {
      active: true,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${eventId}/undo`);
  }
}

export async function deleteCloudEvent(uid: string, eventId: string): Promise<void> {
  const subcols = ['participants', 'prizes', 'winners'] as const;
  for (const sub of subcols) {
    const snap = await getDocs(
      query(collection(db, 'events', eventId, sub), where('ownerId', '==', uid))
    );
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
  }
}
