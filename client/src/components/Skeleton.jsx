/**
 * A shimmering placeholder while the data is loading.
 *
 * @param {{ lines?: number, height?: number, className?: string }} props
 */
export default function Skeleton({ lines = 3, height, className = '' }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton skeleton-line"
          style={{ width: `${100 - index * 12}%`, height }}
        />
      ))}
    </div>
  );
}
