"use client";

import { type RefObject, useEffect, useRef } from "react";

// Ile pikseli palec musi przejść, zanim uznamy gest za przeciąganie i wybierzemy oś (histereza).
const SLOP_PX = 8;
// Prędkość liczymy z ostatnich ~100 ms ruchu, nie z całego gestu.
const VELOCITY_WINDOW_MS = 100;

export type VerticalDragHandlers = {
  /** Czy ten gest ma przesuwać arkusz. dy > 0 to ruch w dół. Wywoływane raz, po przekroczeniu progu. */
  shouldStart: (dy: number, target: EventTarget | null) => boolean;
  onStart: () => void;
  /** Przesunięcie od początku przeciągania (px). */
  onMove: (dy: number) => void;
  /** Prędkość w chwili puszczenia (px/s, dodatnia w dół). */
  onEnd: (velocity: number) => void;
};

/** Elementy, które same obsługują przeciąganie (suwak) albo wpisywanie: z nich gest nie startuje. */
function isOwnGesture(target: EventTarget | null) {
  return target instanceof Element && target.closest('input, textarea, [data-no-drag="true"]');
}

/**
 * Pionowe przeciąganie arkusza palcem i myszą. Działa na zdarzeniach dotyku z passive: false,
 * bo tylko tak można przejąć gest od przewijania, gdy treść jest już na górze (jak w iOS).
 * Poziomy ruch oddajemy dalej, np. karcie opowieści, którą przesuwa się w bok.
 */
export function useVerticalDrag(
  ref: RefObject<HTMLElement | null>,
  handlers: VerticalDragHandlers,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let startX = 0;
    let startY = 0;
    let state: "idle" | "pending" | "dragging" | "ignored" = "idle";
    let samples: { y: number; t: number }[] = [];
    let didDrag = false;

    function begin(x: number, y: number, target: EventTarget | null) {
      state = isOwnGesture(target) ? "ignored" : "pending";
      startX = x;
      startY = y;
      samples = [{ y, t: performance.now() }];
    }

    // Zwraca true, gdy gest należy do arkusza i trzeba zablokować domyślne zachowanie.
    function move(x: number, y: number, target: EventTarget | null) {
      if (state === "idle" || state === "ignored") return false;
      const dx = x - startX;
      const dy = y - startY;
      if (state === "pending") {
        if (Math.abs(dx) < SLOP_PX && Math.abs(dy) < SLOP_PX) return false;
        if (Math.abs(dx) > Math.abs(dy) || !handlersRef.current.shouldStart(dy, target)) {
          state = "ignored";
          return false;
        }
        state = "dragging";
        didDrag = true;
        // Liczymy od chwili przejęcia, żeby arkusz nie przeskoczył o próg.
        startY = y;
        handlersRef.current.onStart();
      }
      const now = performance.now();
      samples.push({ y, t: now });
      while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW_MS) samples.shift();
      handlersRef.current.onMove(y - startY);
      return true;
    }

    function end() {
      if (state === "dragging") {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = (last.t - first.t) / 1000;
        // Palec, który stał przed puszczeniem, nie rzuca arkuszem.
        const isStale = performance.now() - last.t > VELOCITY_WINDOW_MS;
        const velocity = dt > 0 && !isStale ? (last.y - first.y) / dt : 0;
        handlersRef.current.onEnd(velocity);
      }
      state = "idle";
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length > 1) {
        end();
        state = "ignored";
        return;
      }
      const touch = event.touches[0];
      begin(touch.clientX, touch.clientY, event.target);
    }
    function onTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (touch && move(touch.clientX, touch.clientY, event.target) && event.cancelable) {
        event.preventDefault();
      }
    }

    function onMouseDown(event: MouseEvent) {
      if (event.button !== 0) return;
      begin(event.clientX, event.clientY, event.target);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    function onMouseMove(event: MouseEvent) {
      if (move(event.clientX, event.clientY, event.target)) event.preventDefault();
    }
    function onMouseUp() {
      end();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    // Po przeciągnięciu nie klikamy w to, nad czym puszczono palec.
    function onClickCapture(event: MouseEvent) {
      if (!didDrag) return;
      didDrag = false;
      event.preventDefault();
      event.stopPropagation();
    }
    function onPointerDown() {
      didDrag = false;
    }

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    element.addEventListener("mousedown", onMouseDown);
    element.addEventListener("pointerdown", onPointerDown, true);
    element.addEventListener("click", onClickCapture, true);
    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
      element.removeEventListener("mousedown", onMouseDown);
      element.removeEventListener("pointerdown", onPointerDown, true);
      element.removeEventListener("click", onClickCapture, true);
      onMouseUp();
    };
  }, [ref]);
}

/** Opór za granicą: im dalej, tym mniej element idzie za palcem (WWDC 2018). */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
