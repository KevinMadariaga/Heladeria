import { cn } from "@/lib/utils";

/** Logo Kathy en SVG (sticker lila, cono + café). Usa las fuentes de marca cargadas con next/font. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <svg
      viewBox={compact ? "30 58 340 134" : "0 0 400 260"}
      role="img"
      aria-label="Kathy Coffe Heladería"
      className={cn("h-auto select-none", className)}
    >
      <g>
        {/* Sticker: contorno blanco grueso sobre lila */}
        {compact ? (
          <rect x="40" y="68" width="320" height="114" rx="57" fill="#d9bdf5" stroke="#ffffff" strokeWidth="12" />
        ) : (
        <path
          d="M60 120 C40 70 110 60 140 75 C150 30 230 25 250 70 C290 40 360 60 345 115 C380 130 375 205 320 210 C290 245 120 245 85 215 C30 210 25 140 60 120Z"
          fill="#d9bdf5"
          stroke="#ffffff"
          strokeWidth="14"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 6px 10px rgb(91 26 126 / .3))" }}
        />
        )}
        {!compact && (
          <>
            {/* Cono */}
            <g transform="translate(150 28)">
              <path d="M12 58 L32 112 L52 58Z" fill="#E2A35A" stroke="#3D0F57" strokeWidth="4" strokeLinejoin="round" />
              <path d="M20 66 L44 90 M30 60 L50 80 M16 78 L38 100 M44 66 L24 90 M34 60 L18 74 M48 78 L30 100" stroke="#7A4A2E" strokeWidth="2" />
              <path d="M4 58 C-6 40 14 22 24 28 C26 6 52 8 52 26 C68 24 70 50 60 58Z" fill="#F7B9DA" stroke="#3D0F57" strokeWidth="4" strokeLinejoin="round" />
              <g strokeWidth="3" strokeLinecap="round">
                <path d="M20 40 l4 -3" stroke="#5B1A7E" />
                <path d="M36 30 l3 3" stroke="#E2A35A" />
                <path d="M46 44 l4 -2" stroke="#B98AE6" />
                <path d="M30 48 l2 3" stroke="#7A4A2E" />
              </g>
            </g>
            {/* Taza */}
            <g transform="translate(220 52)" stroke="#3D0F57" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 0 c-6 8 6 10 0 18 M24 -4 c-6 8 6 10 0 18 M36 0 c-6 8 6 10 0 18" fill="none" />
              <path d="M0 28 h52 c0 26 -10 38 -26 38 c-16 0 -26 -12 -26 -38Z" fill="#ffffff" />
              <path d="M52 34 c14 0 14 18 -2 20" fill="none" />
              <ellipse cx="26" cy="29" rx="22" ry="5" fill="#7A4A2E" strokeWidth="2" />
              <path d="M-8 68 h68" />
            </g>
          </>
        )}
        <text
          x="200"
          y={compact ? 152 : 178}
          textAnchor="middle"
          fontFamily="var(--font-pacifico), cursive"
          fontSize="82"
          fill="#3D0F57"
          stroke="#ffffff"
          strokeWidth="10"
          paintOrder="stroke"
        >
          Kathy
        </text>
        {!compact && (
          <text
            x="200"
            y="222"
            textAnchor="middle"
            fontFamily="var(--font-fredoka), sans-serif"
            fontWeight="600"
            fontSize="26"
            fill="#3D0F57"
            stroke="#ffffff"
            strokeWidth="6"
            paintOrder="stroke"
          >
            Coffe Heladería
          </text>
        )}
      </g>
    </svg>
  );
}
