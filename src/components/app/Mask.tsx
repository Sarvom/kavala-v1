import { SAMPLE_NEIGHBOURS } from "@/lib/app/state";

/** A coloured circle with an eye mask: everyone starts masked. */
export function Mask({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false" style={{ flex: "none" }}>
      <circle cx="20" cy="20" r="20" fill={color} />
      <path
        d="M6 19c5-7 23-7 28 0-1 6-5 8.5-9.5 7.5-2.2-.5-3.4-2.2-4.5-3.5-1.1 1.3-2.3 3-4.5 3.5C11 27.5 7 25 6 19z"
        fill="#ffffff"
        fillOpacity="0.93"
      />
      <ellipse cx="14" cy="20" rx="3.2" ry="2.1" fill={color} />
      <ellipse cx="26" cy="20" rx="3.2" ry="2.1" fill={color} />
    </svg>
  );
}

/** Colour for a neighbour's mask; the user's own colour when it's them. */
export function maskColorFor(name: string, me: { maskName: string; maskColor: string }): string {
  if (name === me.maskName) return me.maskColor;
  return SAMPLE_NEIGHBOURS[name] ?? "#2e8c8c";
}
