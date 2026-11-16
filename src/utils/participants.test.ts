import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWinnersCsv,
  buildWinnersSummaryText,
  deduplicateParticipants,
  parseParticipantLines,
  shuffleParticipants,
  sortParticipantsAZ,
} from './participants';
import { Participant, WinnerRecord } from '../types/luckyWheel';

test('parseParticipantLines parses plain text and CSV rows while skipping header line', () => {
  const input = 'Họ và tên,Phòng ban\nNguyễn Văn A,Kỹ thuật\n\n  Trần Thị B  \nLê Văn C,Sales';
  const parsed = parseParticipantLines(input);
  assert.deepEqual(parsed, ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C']);
});

test('deduplicateParticipants removes case-insensitive duplicates and reindexes order', () => {
  const list: Participant[] = [
    { id: '1', name: 'Nguyễn Minh Anh', active: true, order: 0 },
    { id: '2', name: '  nguyễn minh anh ', active: true, order: 1 },
    { id: '3', name: 'Trần Bảo', active: false, order: 2 },
  ];
  const deduped = deduplicateParticipants(list);
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].id, '1');
  assert.equal(deduped[1].name, 'Trần Bảo');
  assert.equal(deduped[1].order, 1);
});

test('sortParticipantsAZ sorts Vietnamese names properly and shuffle preserves all items', () => {
  const list: Participant[] = [
    { id: '1', name: 'Vũ Linh', active: true, order: 0 },
    { id: '2', name: 'An Nguyễn', active: true, order: 1 },
    { id: '3', name: 'Đức Mạnh', active: true, order: 2 },
  ];
  const sorted = sortParticipantsAZ(list);
  assert.deepEqual(
    sorted.map((x) => x.name),
    ['An Nguyễn', 'Đức Mạnh', 'Vũ Linh']
  );

  const shuffled = shuffleParticipants(list);
  assert.equal(shuffled.length, 3);
  assert.deepEqual(
    shuffled.map((x) => x.id).sort(),
    ['1', '2', '3']
  );
});

test('buildWinnersCsv prepends UTF-8 BOM and escapes commas/quotes cleanly', () => {
  const winners: WinnerRecord[] = [
    {
      id: 'w1',
      participantId: 'p1',
      participantName: 'Nguyễn "Minh" Anh',
      prizeId: 'pr1',
      prizeName: 'Giải Nhất',
      prizeReward: '1.000.000 VNĐ, Quà tặng',
      awardedAt: '2026-11-16T10:00:00.000Z',
    },
  ];
  const csv = buildWinnersCsv(winners, 'Gala 2026');
  assert.ok(csv.startsWith('\uFEFFSTT,Sự kiện,Họ và Tên'));
  assert.ok(csv.includes('"Nguyễn ""Minh"" Anh"'));
  assert.ok(csv.includes('"1.000.000 VNĐ, Quà tặng"'));

  const summary = buildWinnersSummaryText(winners, 'Gala 2026');
  assert.ok(summary.includes('GALA 2026'));
  assert.ok(summary.includes('Giải Nhất'));
});
