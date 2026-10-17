"use client";

import { useEffect, useRef } from "react";

export function Heading({ children, sub }: { children: string; sub?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  // Fokus na nagłówku nowego kroku: czytnik ekranu od razu czyta pytanie.
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <div className="flex flex-col gap-2 md:gap-3">
      <h1
        ref={ref}
        tabIndex={-1}
        className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] outline-none md:text-5xl md:leading-[1.05] md:tracking-[-0.025em]"
      >
        {children}
      </h1>
      {sub && <p className="text-[15px] leading-relaxed text-tekst-2 md:text-lg">{sub}</p>}
    </div>
  );
}
