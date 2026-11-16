import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignSliceColors,
  computeTargetSpinAngle,
  easeOutQuart,
  getOptimalFontSize,
  getSliceIndexAtPointer,
  normalizeAngle,
  truncateLabel,
} from './wheelMath';

test('assignSliceColors never assigns identical colors to adjacent slices including wrap-around', () => {
  const palette = ['#06B6D4', '#F59E0B', '#6366F1', '#10B981'];
  for (let count = 2; count <= 25; count++) {
    const colors = assignSliceColors(count, palette);
    assert.equal(colors.length, count);
    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      assert.notEqual(
        colors[i],
        colors[next],
        `Slice ${i} and ${next} collided for count=${count}`
      );
    }
  }
});

test('assignSliceColors handles single slice and empty cases cleanly', () => {
  assert.deepEqual(assignSliceColors(0, ['#000', '#fff']), []);
  assert.deepEqual(assignSliceColors(1, ['#000', '#fff']), ['#000']);
});

test('computeTargetSpinAngle always lands the chosen winnerIndex directly under the 12 oclock pointer', () => {
  const counts = [2, 3, 5, 12, 37, 100];
  for (const total of counts) {
    for (let winnerIndex = 0; winnerIndex < total; winnerIndex += Math.max(1, Math.floor(total / 4))) {
      const startAngle = 1.234;
      const targetAngle = computeTargetSpinAngle(startAngle, winnerIndex, total, 6, 0.25);
      assert.ok(targetAngle > startAngle + 5 * Math.PI * 2);
      const landed = getSliceIndexAtPointer(targetAngle, total);
      assert.equal(
        landed,
        winnerIndex,
        `Expected landed=${winnerIndex} for total=${total}, got ${landed}`
      );
    }
  }
});

test('getSliceIndexAtPointer handles negative and multi-turn angles safely', () => {
  assert.equal(getSliceIndexAtPointer(0, 0), -1);
  assert.equal(getSliceIndexAtPointer(123.45, 1), 0);
  const idx = getSliceIndexAtPointer(-Math.PI * 7.2, 8);
  assert.ok(idx >= 0 && idx < 8);
  assert.ok(normalizeAngle(-0.5) >= 0 && normalizeAngle(-0.5) < Math.PI * 2);
});

test('easeOutQuart starts at 0, ends at 1, and decelerates monotonically', () => {
  assert.equal(easeOutQuart(0), 0);
  assert.equal(easeOutQuart(1), 1);
  const a = easeOutQuart(0.25);
  const b = easeOutQuart(0.5);
  const c = easeOutQuart(0.75);
  assert.ok(a > 0 && a < b && b < c && c < 1);
  // Deceleration check: first quarter covers more distance than last quarter
  assert.ok(a > 1 - c);
});

test('typography scaling and label truncation adapt cleanly across 2..120 participants', () => {
  assert.ok(getOptimalFontSize(4, 260) > getOptimalFontSize(20, 260));
  assert.ok(getOptimalFontSize(20, 260) > getOptimalFontSize(90, 260));
  assert.equal(truncateLabel('Nguyễn Minh Anh', 12), 'Nguyễn Minh Anh');
  assert.ok(truncateLabel('Nguyễn Thị Hoàng Phương Thảo Vy', 40).endsWith('…'));
});
