"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import type { LngLat } from "../lib/mock-data";

type RouteThumbProps = {
  line: LngLat[];
  stops?: LngLat[];
  color?: string;
  strokeWidth?: number;
  className?: string;
};

const SIZE = { width: 400, height: 240 };
const PAD = 28;

/**
 * Miniatura trasy bez kafelków mapy: sama linia na tle w barwie mapy. Lżejsza niż osobna instancja
 * MapLibre na każdą kartę (WebGL), a trasa i tak jest tu najważniejsza.
 */
export function RouteThumb({
  line,
  stops = [],
  color = "var(--color-glebia)",
  strokeWidth = 5,
  className = "",
}: RouteThumbProps) {
  const { path, points, start } = useMemo(() => {
    const all = [...line, ...stops];
    // Rzut równoodległościowy: na tej skali (kilka km) wystarczy skrócić długość geograficzną o cos(φ).
    const k = Math.cos((52.23 * Math.PI) / 180);
    const xs = all.map(([lng]) => lng * k);
    const ys = all.map(([, lat]) => lat);
    const [minX, maxX, minY, maxY] = [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...ys),
      Math.max(...ys),
    ];
    const scale = Math.min(
      (SIZE.width - PAD * 2) / (maxX - minX || 1),
      (SIZE.height - PAD * 2) / (maxY - minY || 1),
    );
    const offsetX = (SIZE.width - (maxX - minX) * scale) / 2;
    const offsetY = (SIZE.height - (maxY - minY) * scale) / 2;
    const toXY = ([lng, lat]: LngLat) => [
      offsetX + (lng * k - minX) * scale,
      offsetY + (maxY - lat) * scale,
    ];
    const xy = line.map(toXY);
    return {
      path: xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(""),
      points: stops.map(toXY),
      start: xy[0],
    };
  }, [line, stops]);

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SIZE.width} ${SIZE.height}`}
      preserveAspectRatio="xMidYMid slice"
      className={`block bg-mapa ${className}`}
    >
      <defs>
        <pattern
          id="kwartaly"
          width="36"
          height="36"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-12)"
        >
          <path d="M0 0H36M0 0V36" stroke="#fff" strokeWidth="3" />
        </pattern>
      </defs>
      {/* Umowne kwartały ulic: tylko faktura, nie prawdziwa siatka */}
      <rect width="100%" height="100%" fill="url(#kwartaly)" opacity="0.7" />
      <path
        d={path}
        fill="none"
        stroke="#fff"
        strokeWidth={strokeWidth + 4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
      {points.map(([x, y], index) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: kolejność punktów jest stała
          key={index}
          cx={x}
          cy={y}
          r={4.5}
          fill="#fff"
          stroke={color}
          strokeWidth={2.5}
        />
      ))}
      {start && (
        <g>
          <circle cx={start[0]} cy={start[1]} r={18} fill="var(--color-glebia)" opacity="0.14" />
          <circle
            cx={start[0]}
            cy={start[1]}
            r={8}
            fill="var(--color-glebia)"
            stroke="#fff"
            strokeWidth={3}
          />
        </g>
      )}
    </svg>
  );
}
