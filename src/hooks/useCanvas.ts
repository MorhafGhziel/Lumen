"use client";

import { useCallback, useRef, useState } from "react";
import type { CanvasState } from "@/lib/types";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

export function useCanvas() {
  const [state, setState] = useState<CanvasState>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setState((prev) => ({
        ...prev,
        zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom + delta * prev.zoom)),
      }));
    } else {
      // Pan
      setState((prev) => ({
        ...prev,
        panX: prev.panX - e.deltaX,
        panY: prev.panY - e.deltaY,
      }));
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only pan on middle-click or space+left-click (handled via the space key state)
    if (e.button === 1 || (e.button === 0 && e.currentTarget === e.target)) {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setState((prev) => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, prev.zoom * 1.2),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, prev.zoom / 1.2),
    }));
  }, []);

  const resetView = useCallback(() => {
    setState({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  return {
    state,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    zoomIn,
    zoomOut,
    resetView,
  };
}
