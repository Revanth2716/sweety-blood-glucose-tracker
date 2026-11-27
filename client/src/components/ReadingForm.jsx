import { useMemo, useState } from 'react';
import { todayISO } from '../lib/dates.js';
import { MESSAGES, SLOTS, validateReading } from '../lib/readings.js';
import { STATUS_LABELS, classifyReading, targetFor } from '../lib/targets.js';

/**
 * The form used to add a reading and to edit an existing one.
 *
 * The messages come from the assignment and are shown exactly as written. Errors returned by
 * the API (for example "You already have an After lunch reading for this date.") are shown next
 * to the field they belong to.
 *
 * @param {{
 *   initialValues?: { date?: string, slot?: string, value?: number | string },
 *   onSubmit: (values: { date: string, slot: string, value: number }) => Promise<void>,
 *   onCancel?: () => void,
 *   submitLabel?: string,
 *   title?: string
 * }} props
 */
export default function ReadingForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save reading',
  title = 'Add a reading',
}) {
  const [values, setValues] = useState(() => ({
    date: initialValues?.date ?? todayISO(),
    slot: initialValues?.slot ?? 'morning',
    value:
      initialValues?.value === undefined || initialValues?.value === null
        ? ''
        : String(initialValues.value),
  }));
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const target = targetFor(values.slot);

  // A live preview of where the value would land, while the user is still typing.
  const preview = useMemo(() => {
    const raw = values.value.trim();
    if (!/^\d+$/.test(raw)) {
      return null;
    }

    const value = Number(raw);
    if (value < 40 || value > 600) {
      return null;
    }

    const status = classifyReading(value, values.slot);
    return { status, statusLabel: STATUS_LABELS[status] };
  }, [values.value, values.slot]);

  /**
   * @param {import('react').ChangeEvent<HTMLInputElement | HTMLSelectElement>} event
   */
  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  /**
   * @param {import('react').FormEvent<HTMLFormElement>} event
   */
  async function handleSubmit(event) {
    event.preventDefault();
    setGeneralError('');

    const validationErrors = validateReading(values, todayISO());
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ date: values.date, slot: values.slot, value: Number(values.value) });
    } catch (error) {
      if (error?.field && ['value', 'date', 'slot'].includes(error.field)) {
        setErrors({ [error.field]: error.message });
      } else {
        setGeneralError(error?.message ?? MESSAGES.valueRequired);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h2>{title}</h2>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" name="date" type="date" value={values.date} onChange={handleChange} />
          {errors.date ? (
            <p className="field-error" role="alert">
              {errors.date}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="slot">Time slot</label>
          <select id="slot" name="slot" value={values.slot} onChange={handleChange}>
            {SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
          {errors.slot ? (
            <p className="field-error" role="alert">
              {errors.slot}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="value">Glucose value (mg/dl)</label>
          <input
            id="value"
            name="value"
            type="number"
            inputMode="numeric"
            step="1"
            min="40"
            max="600"
            placeholder="e.g. 110"
            value={values.value}
            onChange={handleChange}
          />
          {errors.value ? (
            <p className="field-error" role="alert">
              {errors.value}
            </p>
          ) : preview ? (
            <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`pill ${preview.status}`}>{preview.statusLabel}</span>
              <span>{target.label}</span>
            </p>
          ) : (
            <p className="muted">{target.label}</p>
          )}
        </div>

        {generalError ? (
          <p className="form-error" role="alert">
            {generalError}
          </p>
        ) : null}

        <div className="form-actions">
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? 'Saving…' : submitLabel}
          </button>
          {onCancel ? (
            <button type="button" className="button ghost" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
