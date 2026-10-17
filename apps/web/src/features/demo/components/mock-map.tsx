import type { MockPlace } from "../lib/mock-data";

type MockMapProps = {
  places?: MockPlace[];
  routePlaces?: MockPlace[];
  className?: string;
};

// Szkicowa mapa placeholder w barwach Sawy. Prawdziwa mapa (Mapbox) wchodzi później, po tokenie w .env.local.
export function MockMap({ places = [], routePlaces = [], className = "" }: MockMapProps) {
  const routePoints = routePlaces.map((place) => `${place.x},${place.y}`).join(" ");

  return (
    <svg
      role="img"
      aria-label="Szkicowa mapa Warszawy (dane testowe)"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full ${className}`}
    >
      <rect width="1000" height="1000" fill="#EEF3F0" />

      {/* Parki */}
      <path d="M90 140 h230 v170 h-230 Z" fill="#D6EEE2" />
      <path d="M700 760 h220 v150 h-220 Z" fill="#D6EEE2" />

      {/* Osiedla */}
      <path d="M600 90 h300 v200 h-300 Z M120 620 h200 v180 h-200 Z" fill="#E9EEEB" />

      {/* Wisła */}
      <path
        d="M-20 820 C 150 780, 260 860, 420 800 S 720 700, 1020 740"
        fill="none"
        stroke="#B9E2D3"
        strokeWidth="46"
        strokeLinecap="round"
      />

      {/* Ulice */}
      <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
        <path d="M-20 300 H1020" strokeWidth="18" />
        <path d="M-20 560 C 300 540, 600 600, 1020 520" strokeWidth="22" />
        <path d="M250 -20 V1020" strokeWidth="16" />
        <path d="M520 -20 V1020" strokeWidth="22" />
        <path d="M790 -20 V1020" strokeWidth="14" />
        <path d="M -20 900 L 1020 180" strokeWidth="12" />
        <path d="M80 -20 L 620 1020" strokeWidth="10" />
      </g>

      {/* Tory tramwajowe */}
      <path d="M-20 430 H1020" stroke="#CFD8D4" strokeWidth="5" strokeDasharray="14 10" fill="none" />

      {/* Trasa */}
      {routePlaces.length > 1 && (
        <polyline
          points={routePoints}
          fill="none"
          stroke="#17706F"
          strokeWidth="11"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.9"
        />
      )}

      {/* Punkty */}
      {places.map((place) => {
        const onRoute = routePlaces.some((stop) => stop.id === place.id);
        return (
          <g key={place.id} transform={`translate(${place.x} ${place.y})`}>
            <circle r={onRoute ? 14 : 9} fill={onRoute ? "#F2755F" : "#17706F"} stroke="#fff" strokeWidth="4" />
          </g>
        );
      })}

      {/* Lokalizacja użytkownika (placeholder, stała) */}
      <g transform="translate(455 470)">
        <circle r="30" fill="#17706F" opacity="0.14" />
        <circle r="9" fill="#17706F" stroke="#fff" strokeWidth="4" />
      </g>
    </svg>
  );
}
