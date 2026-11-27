/**
 * The Sweety mark: a drop with a pulse line through it.
 *
 * @param {{ size?: number }} props
 */
export default function Logo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label="Sweety">
      <path
        d="M12 2.6c3.3 3.7 6.2 6.8 6.2 10.2a6.2 6.2 0 0 1-12.4 0C5.8 9.4 8.7 6.3 12 2.6Z"
        fill="#06121f"
        fillOpacity="0.88"
      />
      <path
        d="M6.6 12.6h2.7l1.4-2.7 2 5.2 1.6-3.3 1 1.9h2.1"
        stroke="#8ff3ff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
