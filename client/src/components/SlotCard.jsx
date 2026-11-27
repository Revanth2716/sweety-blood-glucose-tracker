import { targetFor } from '../lib/targets.js';

/**
 * One time slot of a day, with the reading that was recorded for it.
 *
 * @param {{
 *   slot: { value: string, label: string },
 *   reading?: any,
 *   onEdit?: (reading: any) => void,
 *   onDelete?: (reading: any) => void,
 *   onAdd?: (slot: string) => void
 * }} props
 */
export default function SlotCard({ slot, reading, onEdit, onDelete, onAdd }) {
  const target = reading?.target ?? targetFor(slot.value);

  return (
    <article className={`slot-card ${reading ? `status-${reading.status}` : ''}`}>
      <span className="slot-name">{slot.label}</span>

      {reading ? (
        <>
          <div className="slot-value">
            {reading.value}
            <small>mg/dl</small>
          </div>
          <div className="slot-target">
            <span className={`pill ${reading.status}`}>{reading.statusLabel}</span>{' '}
            <span>{target.label}</span>
          </div>
          {onEdit || onDelete ? (
            <div className="row-actions" style={{ marginTop: '0.6rem' }}>
              {onEdit ? (
                <button
                  type="button"
                  className="button small ghost"
                  onClick={() => onEdit(reading)}
                >
                  Edit
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className="button small danger ghost"
                  onClick={() => onDelete(reading)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="slot-empty">Not recorded</div>
          <div className="slot-target">{target.label}</div>
          {onAdd ? (
            <div style={{ marginTop: '0.6rem' }}>
              <button
                type="button"
                className="button small ghost"
                onClick={() => onAdd(slot.value)}
              >
                Add reading
              </button>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
