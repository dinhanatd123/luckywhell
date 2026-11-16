# Firestore Security Specification

## 1. Data Invariants
1. **Event Ownership**: Every `LuckyEvent` document under `/events/{eventId}` is strictly owned by `ownerId == request.auth.uid`. No unauthenticated user or other authenticated user may read, list, create, update, or delete another user's events.
2. **Subcollection Master Gate**: Every `Participant`, `Prize`, and `WinnerRecord` under `/events/{eventId}/...` must carry `eventId` matching the path `{eventId}` and `ownerId == request.auth.uid`, and its parent `/events/{eventId}` document must exist and be owned by `request.auth.uid`.
3. **Immutable Identity & Creation Time**: `ownerId`, `eventId`, and `createdAt` are immutable once created. `createdAt` and `updatedAt` must equal `request.time` (server timestamp).
4. **Numeric & String Bounds**:
   - All document IDs match `^[a-zA-Z0-9_\-]+$` and length `1..128`.
   - `spinDuration` is between `3` and `15`.
   - `remainingQuantity` is always `>= 0` and `<= totalQuantity` (`1..10000`).
   - `theme` is strictly one of `'cyber'`, `'gala'`, `'light'`.
5. **Verified Email**: All operations require `request.auth != null && request.auth.token.email_verified == true`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/List**: `list /events` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Write `/events/evt1` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Cross-Tenant List Scraping**: `list /events` without `where('ownerId', '==', uid)` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Create**: Create `/events/evt1` with `ownerId: "victim_uid"` while signed in as `"attacker_uid"` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: Create `/events/evt1` with an extra key `isAdmin: true` -> `PERMISSION_DENIED`.
6. **ID Poisoning**: Create `/events/../../etc/passwd` or 500-char ID -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: Create `/events/evt1` with client-supplied `createdAt: "2020-01-01"` instead of `request.time` -> `PERMISSION_DENIED`.
8. **Ownership Hijack on Update**: Update `/events/evt1` changing `ownerId` -> `PERMISSION_DENIED`.
9. **Immutable Field Mutation**: Update `/events/evt1` changing `createdAt` -> `PERMISSION_DENIED`.
10. **Orphan Subcollection Write**: Create `/events/nonexistent/participants/p1` -> `PERMISSION_DENIED`.
11. **Value Poisoning on Prize**: Update `/events/evt1/prizes/pr1` setting `remainingQuantity: 9999` > `totalQuantity` or negative `-1` -> `PERMISSION_DENIED`.
12. **Type / Size Poisoning on Participant**: Update `/events/evt1/participants/p1` setting `name` to a 10,000-char string -> `PERMISSION_DENIED`.
