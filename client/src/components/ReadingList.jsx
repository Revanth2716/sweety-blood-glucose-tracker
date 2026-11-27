import { formatDate, formatDateTime } from '../lib/dates.js';

/**
 * A table of readings with an edit and a delete button for every row.
 *
 * @param {{
 *   readings: any[],
 *   onEdit?: (reading: any) => void,
 *   onDelete?: (reading: any) => void,
 *   showDate?: boolean
 * }} props
 */
export default function ReadingList({ readings, onEdit, onDelete, showDate = false }) {
  return (
    <table className="table">
      <thead>
        <tr>
          {showDate ? <th>Date</th> : null}
          <th>Time slot</th>
          <th>Value</th>
          <th>Status</th>
          <th>Note</th>
          <th>Recorded</th>
          {onEdit || onDelete ? <th aria-label="Actions" /> : null}
        </tr>
      </thead>
      <tbody>
        {readings.map((reading) => (
          <tr key={reading.id}>
            {showDate ? <td>{formatDate(reading.date)}</td> : null}
            <td>{reading.slotLabel}</td>
            <td className="value-cell">
              {reading.value}
              <small className="muted"> mg/dl</small>
            </td>
            <td>
              <span className={`pill ${reading.status ?? 'neutral'}`}>
                {reading.statusLabel ?? '–'}
              </span>
            </td>
            <td className="note-cell">
              {reading.notes ? <span className="note-text">{reading.notes}</span> : null}
              {reading.tags && reading.tags.length > 0 ? (
                <span className="note-tags">
                  {reading.tags.map((tag) => (
                    <span className="mini-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </span>
              ) : null}
            </td>
            <td className="muted">{formatDateTime(reading.createdAt)}</td>
            {onEdit || onDelete ? (
              <td className="row-actions">
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
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
