/**
 * A friendly message for a period or a day without any readings.
 *
 * @param {{ title?: string, message?: string, children?: any }} props
 */
export default function EmptyState({
  title = 'No readings yet',
  message = 'No readings recorded for this period yet. Add your first reading to see the numbers here.',
  children,
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
      {children}
    </div>
  );
}
