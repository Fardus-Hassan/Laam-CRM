'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type AuthWaveDotsProps = {
  className?: string;
};

/** Match the first CSS grid: radial-gradient 1px @ 22px, ~12% opacity */
const GAP = 22;
const RADIUS = 1;
const AMPLITUDE = 8;
const KX = 0.36;
const KY = 0.11;
const OMEGA = 1.05;
const DOT_ALPHA = 0.14;

/**
 * Same look as the original static brand dots, with ocean-swell motion.
 * Respects prefers-reduced-motion.
 */
export function AuthWaveDots({ className }: AuthWaveDotsProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = mq.matches;
    let raf = 0;
    let disposed = false;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let cssW = 0;
    let cssH = 0;
    let fill = 'rgb(255, 255, 255)';

    const resolveFill = () => {
      fill = getComputedStyle(canvas).color || 'rgb(255, 255, 255)';
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      cssW = parent.clientWidth;
      cssH = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(cssW / GAP) + 2;
      rows = Math.ceil(cssH / GAP) + 2;
      resolveFill();
    };

    const paint = (timeMs: number) => {
      const t = timeMs / 1000;
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = fill;
      ctx.globalAlpha = DOT_ALPHA;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * GAP + GAP / 2;
          const y0 = row * GAP + GAP / 2;
          const phase = col * KX + row * KY;
          const y = reduced ? y0 : y0 + Math.sin(phase - OMEGA * t) * AMPLITUDE;
          ctx.beginPath();
          ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (timeMs: number) => {
      if (disposed) return;
      paint(timeMs);
      if (!reduced) {
        raf = requestAnimationFrame(loop);
      }
    };

    const start = () => {
      cancelAnimationFrame(raf);
      if (reduced) {
        paint(0);
      } else {
        raf = requestAnimationFrame(loop);
      }
    };

    const onMotionPref = () => {
      reduced = mq.matches;
      start();
    };

    resize();
    start();

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) paint(0);
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    mq.addEventListener('change', onMotionPref);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq.removeEventListener('change', onMotionPref);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'auth-wave-dots pointer-events-none absolute inset-0 h-full w-full text-current',
        className,
      )}
      aria-hidden
    />
  );
}
