/**
 * A friendly message for a period or a day without any readings.
 *
 * @param {{ title?: string, message?: string, glyph?: string, children?: any }} props
 */
export default function EmptyState({
  title = 'No readings yet',
  message = 'No readings recorded for this period yet. Add your first reading to see the numbers here.',
  glyph = '◌',
  children,
}) {
  return (
    <div className="empty-state">
      <div className="empty-glyph" aria-hidden="true">
        {glyph}
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {children}
    </div>
  );
}
