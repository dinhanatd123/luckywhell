export const POINTER_ANGLE = -Math.PI / 2; // 12 o'clock in Canvas radians

export function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

/**
 * Assigns colors from `palette` to `count` slices such that no two adjacent
 * slices (including slice N-1 and slice 0) share the same color.
 */
export function assignSliceColors(count: number, palette: string[]): string[] {
  if (count <= 0 || palette.length === 0) {
    return [];
  }
  if (palette.length === 1) {
    return Array.from({ length: count }, () => palette[0]);
  }
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    let colorIndex = i % palette.length;
    if (i === count - 1 && count > 1 && palette[colorIndex] === result[0]) {
      colorIndex = (colorIndex + 1) % palette.length;
      if (colorIndex < 0 || palette[colorIndex] === result[i - 1]) {
        colorIndex = (colorIndex + 1) % palette.length;
      }
    }
    if (i > 0 && palette[colorIndex] === result[i - 1]) {
      colorIndex = (colorIndex + 1) % palette.length;
    }
    result.push(palette[colorIndex]);
  }
  return result;
}

/**
 * Given a wheel rotation angle (where slice `i` spans `[rotation + i*sliceAngle, rotation + (i+1)*sliceAngle)`),
 * returns the exact slice index currently underneath the 12 o'clock pointer (`POINTER_ANGLE`).
 */
export function getSliceIndexAtPointer(rotation: number, totalSlices: number): number {
  if (totalSlices <= 0) return -1;
  if (totalSlices === 1) return 0;

  const sliceAngle = (Math.PI * 2) / totalSlices;
  const relativeAngle = normalizeAngle(POINTER_ANGLE - rotation);
  const index = Math.floor(relativeAngle / sliceAngle);
  return Math.min(Math.max(index, 0), totalSlices - 1);
}

/**
 * Computes a target rotation angle >= currentAngle so that `winnerIndex` lands under
 * the 12 o'clock pointer after `extraRotations` full turns, with an optional safe
 * intra-slice jitter (`jitterRatio` in [-0.36, 0.36]).
 */
export function computeTargetSpinAngle(
  currentAngle: number,
  winnerIndex: number,
  totalSlices: number,
  extraRotations = 6,
  jitterRatio = 0
): number {
  if (totalSlices <= 0) return currentAngle;
  const sliceAngle = (Math.PI * 2) / totalSlices;
  const clampedJitter = Math.max(-0.36, Math.min(0.36, jitterRatio));
  const desiredSliceCenter = (winnerIndex + 0.5 + clampedJitter) * sliceAngle;
  const desiredMod = normalizeAngle(POINTER_ANGLE - desiredSliceCenter);
  const currentMod = normalizeAngle(currentAngle);

  let delta = desiredMod - currentMod;
  if (delta <= 0) {
    delta += Math.PI * 2;
  }

  return currentAngle + extraRotations * Math.PI * 2 + delta;
}

/**
 * Smooth Quartic Ease-Out deceleration curve (t in [0, 1]).
 */
export function easeOutQuart(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 4);
}

/**
 * Returns cryptographically unbiased random integer in [0, maxExclusive).
 */
export function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % maxExclusive);
  const buf = new Uint32Array(1);
  let val = 0;
  do {
    crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= limit);
  return val % maxExclusive;
}

/**
 * Returns cryptographically random float in [0, 1).
 */
export function secureRandomFloat(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

export function getOptimalFontSize(sliceCount: number, radius: number): number {
  const baseScale = Math.max(0.65, radius / 260);
  let raw = 16;
  if (sliceCount <= 6) raw = 18;
  else if (sliceCount <= 12) raw = 15.5;
  else if (sliceCount <= 24) raw = 13;
  else if (sliceCount <= 48) raw = 10.5;
  else if (sliceCount <= 80) raw = 8.5;
  else raw = 7;
  return Math.round(raw * baseScale * 10) / 10;
}

export function truncateLabel(label: string, sliceCount: number): string {
  const trimmed = label.trim();
  const maxChars =
    sliceCount <= 10 ? 22 : sliceCount <= 24 ? 18 : sliceCount <= 50 ? 14 : 11;
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars - 1)}…`;
}
