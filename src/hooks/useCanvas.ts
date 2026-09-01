"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasState } from "@/lib/types";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

/**
 * Pan and zoom for the infinite canvas.
 *
 * Two things the previous version got wrong:
 *
 *   - Zoom was applied about the origin, so the content slid away from the
 *     cursor as you scrolled. Zoom now anchors on the pointer, which is what
 *     every map and design tool does and what hands expect.
 *
 *   - Panning triggered on any left-click that hit the container directly,
 *     which fought with selecting and dragging. Panning is now explicit:
 *     middle mouse, or space held down.
 */
export function useCanvas() {
  const [state, setState] = useState<CanvasState>({ zoom: 1, panX: 0, panY: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);

  const last = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Space as a pan modifier, ignored while typing.
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      );
    };

    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping()) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    // Releasing space while the tab is unfocused would otherwise leave the
    // canvas stuck in pan mode.
    const blur = () => setSpaceHeld(false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  /** Zooms about a point in screen space, keeping it fixed under the cursor. */
  const zoomAt = useCallback((factor: number, clientX: number, clientY: number) => {
    setState((prev) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom * factor));
      if (next === prev.zoom) return prev;

      const rect = containerRef.current?.getBoundingClientRect();
      const px = clientX - (rect?.left ?? 0);
      const py = clientY - (rect?.top ?? 0);

      // World coordinate under the cursor stays put across the zoom.
      const worldX = (px - prev.panX) / prev.zoom;
      const worldY = (py - prev.panY) / prev.zoom;

      return { zoom: next, panX: px - worldX * next, panY: py - worldY * next };
    });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Pinch-zoom on a trackpad arrives as ctrl+wheel.
        zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY);
      } else {
        setState((prev) => ({ ...prev, panX: prev.panX - e.deltaX, panY: prev.panY - e.deltaY }));
      }
    },
    [zoomAt],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const wantsPan = e.button === 1 || (e.button === 0 && spaceHeld);
      if (!wantsPan) return;
      e.preventDefault();
      setPanning(true);
      last.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [spaceHeld],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!panning) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      setState((prev) => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
    },
    [panning],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setPanning(false);
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
  }, []);

  /** Screen point to canvas coordinates. Used when placing new notes. */
  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      return {
        x: (clientX - (rect?.left ?? 0) - state.panX) / state.zoom,
        y: (clientY - (rect?.top ?? 0) - state.panY) / state.zoom,
      };
    },
    [state],
  );

  const zoomIn = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    zoomAt(1.25, (rect?.left ?? 0) + (rect?.width ?? 0) / 2, (rect?.top ?? 0) + (rect?.height ?? 0) / 2);
  }, [zoomAt]);

  const zoomOut = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    zoomAt(0.8, (rect?.left ?? 0) + (rect?.width ?? 0) / 2, (rect?.top ?? 0) + (rect?.height ?? 0) / 2);
  }, [zoomAt]);

  const resetView = useCallback(() => setState({ zoom: 1, panX: 0, panY: 0 }), []);

  /** Frames a set of items so everything is visible at once. */
  const fitTo = useCallback(
    (items: { x: number; y: number; width: number; height: number }[]) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || items.length === 0) {
        resetView();
        return;
      }

      const minX = Math.min(...items.map((i) => i.x));
      const minY = Math.min(...items.map((i) => i.y));
      const maxX = Math.max(...items.map((i) => i.x + i.width));
      const maxY = Math.max(...items.map((i) => i.y + i.height));

      const padding = 80;
      const zoom = Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          Math.min(
            (rect.width - padding * 2) / Math.max(1, maxX - minX),
            (rect.height - padding * 2) / Math.max(1, maxY - minY),
          ),
        ),
      );

      setState({
        zoom,
        panX: rect.width / 2 - ((minX + maxX) / 2) * zoom,
        panY: rect.height / 2 - ((minY + maxY) / 2) * zoom,
      });
    },
    [resetView],
  );

  return {
    state,
    containerRef,
    spaceHeld,
    panning,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    toCanvas,
    zoomIn,
    zoomOut,
    resetView,
    fitTo,
  };
}
