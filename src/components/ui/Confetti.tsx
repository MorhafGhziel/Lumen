"use client";

import { useCallback } from "react";

/**
 * Confetti, on a single canvas, with no dependency.
 *
 * Reserved for genuine milestones — a first page, a finished checklist — never
 * for routine actions. Celebration that fires on everything stops meaning
 * anything, and quickly becomes the thing people want turned off.
 *
 * The engine lives at module scope rather than in component state: there is
 * one overlay per document, it outlives any component that triggers it, and
 * keeping the mutable canvas out of React means no refs are touched during
 * render.
 *
 * Skipped entirely when the visitor asks for reduced motion.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  width: number;
  height: number;
  color: string;
  life: number;
}

const COLORS = ["#ff6a1a", "#ffb110", "#6f66f2", "#3f9ae8", "#1faa5b", "#d472cc"];

let canvas: HTMLCanvasElement | null = null;
let frame: number | null = null;
let particles: Particle[] = [];

function teardown() {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  canvas?.remove();
  canvas = null;
  particles = [];
}

function tick() {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) {
    teardown();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter((p) => {
    p.vy += 0.32; // gravity
    p.vx *= 0.99; // drag
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.vr;
    p.life -= 0.008;
    if (p.life <= 0 || p.y > window.innerHeight + 40) return false;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
    ctx.restore();
    return true;
  });

  if (particles.length > 0) {
    frame = requestAnimationFrame(tick);
  } else {
    teardown();
  }
}

function burst(origin?: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const ox = origin?.x ?? window.innerWidth / 2;
  const oy = origin?.y ?? window.innerHeight / 3;

  for (let i = 0; i < 90; i++) {
    const angle = (Math.PI * 2 * i) / 90 + Math.random() * 0.4;
    const speed = 5 + Math.random() * 9;
    particles.push({
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      width: 6 + Math.random() * 6,
      height: 3 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
    });
  }

  if (frame === null) frame = requestAnimationFrame(tick);
}

/** Returns a stable function that fires confetti from a point, or the centre. */
export function useConfetti() {
  return useCallback((origin?: { x: number; y: number }) => burst(origin), []);
}
