import { useEffect, useRef, useState } from 'react';

/**
 * A number that counts up to its value when it appears.
 *
 * @param {{
 *   value: number | null,
 *   decimals?: number,
 *   duration?: number,
 *   suffix?: string,
 *   prefix?: string
 * }} props
 */
export default function AnimatedNumber({
  value,
  decimals = 0,
  duration = 900,
  prefix = '',
  suffix = '',
}) {
  const [display, setDisplay] = useState(0);
  const frame = useRef(null);
  const previous = useRef(null);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (value === null || value === undefined) {
      previous.current = null;
      setDisplay(0);
      return undefined;
    }

    if (reduceMotion) {
      setDisplay(value);
      previous.current = value;
      return undefined;
    }

    const from = previous.current ?? 0;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(from + (value - from) * eased);

      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        previous.current = value;
      }
    }

    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current) {
        cancelAnimationFrame(frame.current);
      }
    };
  }, [value, duration]);

  if (value === null || value === undefined) {
    return <span>–</span>;
  }

  const formatted = display.toFixed(decimals);

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
