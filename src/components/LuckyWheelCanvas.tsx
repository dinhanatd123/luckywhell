import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Participant, ThemeMode } from '../types/luckyWheel';
import { soundEngine } from '../utils/soundEngine';
import { WHEEL_THEME_PALETTES } from '../utils/themeConfig';
import {
  assignSliceColors,
  computeTargetSpinAngle,
  easeOutQuart,
  getOptimalFontSize,
  getSliceIndexAtPointer,
  secureRandomFloat,
  secureRandomInt,
  truncateLabel,
} from '../utils/wheelMath';

interface LuckyWheelCanvasProps {
  participants: Participant[];
  theme: ThemeMode;
  spinDuration: number;
  disabled?: boolean;
  canSpin: boolean;
  onSpinStart?: () => void;
  onSpinComplete: (winner: Participant) => void;
}

export const LuckyWheelCanvas: React.FC<LuckyWheelCanvasProps> = ({
  participants,
  theme,
  spinDuration,
  disabled = false,
  canSpin,
  onSpinStart,
  onSpinComplete,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [canvasSize, setCanvasSize] = useState(500);

  // Mutable animation refs so 60fps loop never triggers React re-renders
  const rotationRef = useRef(0);
  const pointerTiltRef = useRef(0);
  const pointerVelRef = useRef(0);
  const ledPhaseRef = useRef(0);
  const isSpinningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const activeParticipants = useMemo(
    () => participants.filter((p) => p.active),
    [participants]
  );

  const palette = WHEEL_THEME_PALETTES[theme];
  const sliceColors = useMemo(
    () => assignSliceColors(activeParticipants.length, palette.sliceColors),
    [activeParticipants.length, palette.sliceColors]
  );

  // Keep latest callback/props in refs for animation loop
  const propsRef = useRef({
    activeParticipants,
    palette,
    sliceColors,
    onSpinComplete,
  });
  propsRef.current = {
    activeParticipants,
    palette,
    sliceColors,
    onSpinComplete,
  };

  // Responsive HiDPI size tracking
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const target = Math.max(280, Math.min(560, Math.floor(Math.min(rect.width, 560))));
      setCanvasSize(target);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const drawWheel = useCallback((sizeCss: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const targetPx = Math.round(sizeCss * dpr);
    if (canvas.width !== targetPx || canvas.height !== targetPx) {
      canvas.width = targetPx;
      canvas.height = targetPx;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, sizeCss, sizeCss);

    const { activeParticipants: items, palette: pal, sliceColors: colors } = propsRef.current;
    const cx = sizeCss / 2;
    const cy = sizeCss / 2;
    const outerRadius = sizeCss / 2 - 14;
    const wheelRadius = outerRadius - 20;
    const rotation = rotationRef.current;

    // 1. Subtle outer stage glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 4, 0, Math.PI * 2);
    ctx.shadowColor = pal.rimBorder;
    ctx.shadowBlur = isSpinningRef.current ? 22 : 10;
    ctx.fillStyle = pal.rimOuter;
    ctx.fill();
    ctx.restore();

    // 2. Outer metallic bezel ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = pal.rimOuter;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = pal.rimBorder;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, wheelRadius + 4, 0, Math.PI * 2);
    ctx.fillStyle = pal.rimInner;
    ctx.fill();

    // 3. Chasing LED bulbs along the bezel (24 LEDs)
    const ledCount = 24;
    const ledRingRadius = (outerRadius + wheelRadius + 4) / 2;
    const phase = Math.floor(ledPhaseRef.current);
    for (let i = 0; i < ledCount; i++) {
      const angle = (i / ledCount) * Math.PI * 2 - Math.PI / 2;
      const lx = cx + Math.cos(angle) * ledRingRadius;
      const ly = cy + Math.sin(angle) * ledRingRadius;

      const isLit = isSpinningRef.current
        ? (i + phase) % 3 === 0
        : (i + phase) % 2 === 0;

      ctx.beginPath();
      ctx.arc(lx, ly, isLit ? 3.8 : 2.8, 0, Math.PI * 2);
      if (isLit) {
        ctx.fillStyle = i % 2 === 0 ? pal.ledOn : pal.ledAlt;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = pal.ledOff;
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Compute hub radius up front so slice labels never collide with the hub
    const hubRadius = Math.max(34, Math.min(54, wheelRadius * 0.21));
    const maxTextWidth = Math.max(36, wheelRadius - hubRadius - 24);

    // 4. Wheel slices
    const count = items.length;
    if (count === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, wheelRadius, 0, Math.PI * 2);
      ctx.fillStyle = pal.rimInner;
      ctx.fill();
      ctx.fillStyle = pal.sliceText;
      ctx.font = '600 15px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Chưa có người tham gia', cx, cy - hubRadius - 22);
    } else {
      const sliceAngle = (Math.PI * 2) / count;
      const fontSize = getOptimalFontSize(count, wheelRadius);

      for (let i = 0; i < count; i++) {
        const startA = rotation + i * sliceAngle;
        const endA = startA + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, wheelRadius, startA, endA);
        ctx.closePath();
        ctx.fillStyle = colors[i] ?? pal.sliceColors[0];
        ctx.fill();

        if (count > 1) {
          ctx.lineWidth = count > 50 ? 0.8 : 1.5;
          ctx.strokeStyle = pal.sliceBorder;
          ctx.stroke();
        }

        // Radial label constrained cleanly between rim and hub
        const midA = startA + sliceAngle / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(midA);

        const label = truncateLabel(items[i].name, count);
        ctx.font = `600 ${fontSize}px "Be Vietnam Pro", sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const textRadius = wheelRadius - (count > 40 ? 12 : 16);
        ctx.lineWidth = 3;
        ctx.strokeStyle = pal.sliceTextStroke;
        ctx.lineJoin = 'round';
        ctx.strokeText(label, textRadius, 0, maxTextWidth);
        ctx.fillStyle = pal.sliceText;
        ctx.fillText(label, textRadius, 0, maxTextWidth);
        ctx.restore();
      }

      // 5. Boundary pegs along rim
      if (count > 1 && count <= 80) {
        for (let i = 0; i < count; i++) {
          const pegA = rotation + i * sliceAngle;
          const px = cx + Math.cos(pegA) * (wheelRadius - 1);
          const py = cy + Math.sin(pegA) * (wheelRadius - 1);
          ctx.beginPath();
          ctx.arc(px, py, count > 36 ? 2 : 3.2, 0, Math.PI * 2);
          ctx.fillStyle = pal.pegColor;
          ctx.fill();
        }
      }
    }

    // 6. Center hub bezel (button sits cleanly inside via HTML overlay)
    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius + 5, 0, Math.PI * 2);
    ctx.fillStyle = pal.hubOuter;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
    ctx.fillStyle = pal.hubInner;
    ctx.fill();

    // 7. Mechanical 12 o'clock pointer with spring-damper tilt
    ctx.save();
    ctx.translate(cx, cy - outerRadius + 2);
    ctx.rotate(pointerTiltRef.current);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    ctx.moveTo(-14, -10);
    ctx.lineTo(14, -10);
    ctx.lineTo(0, 26);
    ctx.closePath();
    ctx.fillStyle = pal.pointerFill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = pal.pointerStroke;
    ctx.stroke();

    // Pointer pivot rivet
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, -3, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = pal.pointerStroke;
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }, []);

  // Idle LED animation & pointer spring settling loop
  useEffect(() => {
    let mounted = true;
    let lastLedStep = 0;

    const tickIdle = (now: number) => {
      if (!mounted) return;
      if (!isSpinningRef.current) {
        if (now - lastLedStep > 420) {
          ledPhaseRef.current += 1;
          lastLedStep = now;
        }
        // Settle residual pointer tilt
        if (Math.abs(pointerTiltRef.current) > 0.001 || Math.abs(pointerVelRef.current) > 0.001) {
          pointerVelRef.current += -pointerTiltRef.current * 0.25;
          pointerVelRef.current *= 0.72;
          pointerTiltRef.current += pointerVelRef.current;
        } else {
          pointerTiltRef.current = 0;
          pointerVelRef.current = 0;
        }
        drawWheel(canvasSize);
      }
      rafRef.current = requestAnimationFrame(tickIdle);
    };

    rafRef.current = requestAnimationFrame(tickIdle);
    return () => {
      mounted = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [canvasSize, drawWheel]);

  // Redraw immediately when participants or theme change
  useEffect(() => {
    drawWheel(canvasSize);
  }, [activeParticipants, theme, canvasSize, drawWheel]);

  const startSpin = useCallback(() => {
    if (isSpinningRef.current || disabled || !canSpin) return;
    const items = propsRef.current.activeParticipants;
    if (items.length === 0) return;

    isSpinningRef.current = true;
    setIsSpinning(true);
    onSpinStart?.();

    const winnerIdx = secureRandomInt(items.length);
    const jitter = (secureRandomFloat() - 0.5) * 0.68; // keeps clearly inside slice away from border
    const extraTurns = Math.max(5, Math.round(spinDuration * 1.1));
    const startAngle = rotationRef.current;
    const targetAngle = computeTargetSpinAngle(
      startAngle,
      winnerIdx,
      items.length,
      extraTurns,
      jitter
    );

    const durationMs = Math.max(3000, Math.min(15000, spinDuration * 1000));
    const startTime = performance.now();
    lastFrameTimeRef.current = startTime;
    let lastSliceIdx = getSliceIndexAtPointer(startAngle, items.length);
    let lastLedTime = startTime;

    const animateSpin = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeOutQuart(progress);
      const nextAngle = startAngle + (targetAngle - startAngle) * eased;

      const dt = Math.max(1, now - lastFrameTimeRef.current);
      const angularSpeed = (nextAngle - rotationRef.current) / dt;
      lastFrameTimeRef.current = now;
      rotationRef.current = nextAngle;

      // Chasing LED lights accelerate/decelerate with wheel
      const ledInterval = 55 + progress * 140;
      if (now - lastLedTime > ledInterval) {
        ledPhaseRef.current += 1;
        lastLedTime = now;
      }

      // Detect peg crossing at 12 o'clock pointer
      const currentSliceIdx = getSliceIndexAtPointer(nextAngle, items.length);
      if (currentSliceIdx !== lastSliceIdx && items.length > 1) {
        lastSliceIdx = currentSliceIdx;
        // Kick pointer slightly counterclockwise as slice peg passes
        pointerTiltRef.current = -Math.min(0.45, 0.22 + angularSpeed * 18);
        pointerVelRef.current = 0.08;
        soundEngine.playTick(1 - progress);
      }

      // Spring-damper pointer physics
      pointerVelRef.current += -pointerTiltRef.current * 0.28;
      pointerVelRef.current *= 0.78;
      pointerTiltRef.current += pointerVelRef.current;

      drawWheel(canvasSize);

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        rotationRef.current = targetAngle;
        pointerTiltRef.current = 0;
        pointerVelRef.current = 0;
        drawWheel(canvasSize);

        isSpinningRef.current = false;
        setIsSpinning(false);

        const verifiedIdx = getSliceIndexAtPointer(targetAngle, items.length);
        const winner = items[verifiedIdx >= 0 ? verifiedIdx : winnerIdx];
        soundEngine.playFanfare();
        if (winner) {
          propsRef.current.onSpinComplete(winner);
        }
      }
    };

    requestAnimationFrame(animateSpin);
  }, [canSpin, canvasSize, disabled, drawWheel, onSpinStart, spinDuration]);

  // Keyboard shortcut: Space or Enter to spin when focus is not in inputs or modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        tag === 'BUTTON' ||
        target.isContentEditable
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      startSpin();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startSpin]);

  const wheelRadiusApprox = canvasSize / 2 - 34;
  const hubRadiusPx = Math.max(34, Math.min(54, wheelRadiusApprox * 0.21));
  const hubPx = Math.round(hubRadiusPx * 2);

  return (
    <div
      ref={containerRef}
      className="relative flex w-full items-center justify-center select-none"
      data-testid="wheel-stage"
      data-spinning={isSpinning ? 'true' : 'false'}
      data-active-count={activeParticipants.length}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: canvasSize, height: canvasSize }}
      >
        <canvas
          ref={canvasRef}
          data-testid="lucky-wheel-canvas"
          style={{ width: canvasSize, height: canvasSize }}
          className="block"
        />

        <button
          type="button"
          onClick={startSpin}
          disabled={isSpinning || disabled || !canSpin || activeParticipants.length === 0}
          aria-label="Quay vòng quay ngay"
          data-testid="spin-button"
          style={{ width: hubPx, height: hubPx }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full font-bold tracking-tight transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-primary)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 flex flex-col items-center justify-center shadow-lg cursor-pointer"
        >
          <span
            className="flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-white/25 text-center leading-tight"
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--accent-primary-fg)',
            }}
          >
            <span className="text-xs font-bold uppercase tracking-wider">
              {isSpinning ? 'Đang quay' : 'QUAY'}
            </span>
            {!isSpinning && (
              <span className="text-[10px] font-semibold opacity-90">NGAY</span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
};
