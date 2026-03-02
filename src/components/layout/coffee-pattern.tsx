export function CoffeePattern() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.06] dark:opacity-[0.04]">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="coffee-cups"
            x="0"
            y="0"
            width="180"
            height="180"
            patternUnits="userSpaceOnUse"
          >
            {/* Gelas kopi 1 — besar, kiri atas */}
            <g transform="translate(15, 10) scale(2)" fill="currentColor">
              <path d="M3 6h18v3a9 9 0 01-18 0V6z" />
              <path d="M21 8h2a4 4 0 010 8h-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 1c0.5-1.5 2-2 2-3.5M12 1c0.5-1.5 2-2 2-3.5M17 1c0.5-1.5 2-2 2-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="20" x2="21" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </g>
            {/* Gelas kopi 2 — sedang, kanan bawah */}
            <g transform="translate(105, 95) scale(1.6) rotate(6)" fill="currentColor">
              <path d="M3 6h18v3a9 9 0 01-18 0V6z" />
              <path d="M21 8h2a4 4 0 010 8h-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 1c0.5-1.5 2-2 2-3.5M14 1c0.5-1.5 2-2 2-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="20" x2="21" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#coffee-cups)"
          className="text-foreground"
        />
      </svg>
    </div>
  );
}
