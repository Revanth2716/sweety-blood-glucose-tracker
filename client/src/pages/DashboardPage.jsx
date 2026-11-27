import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/useAuth.js';
import { formatDate, todayISO } from '../lib/dates.js';
import ReadingForm from '../components/ReadingForm.jsx';
import ReadingList from '../components/ReadingList.jsx';
import EmptyState from '../components/EmptyState.jsx';

const PAGE_SIZE = 10;

/**
 * The dashboard: add, edit and delete the readings of a day and browse the full history.
 */
export default function DashboardPage() {
  const { user, token } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [dayReadings, setDayReadings] = useState([]);
  const [allReadings, setAllReadings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [day, all] = await Promise.all([
        apiFetch(`/readings?date=${selectedDate}&limit=${PAGE_SIZE}`, { token }),
        apiFetch(`/readings?page=${page}&limit=${PAGE_SIZE}`, { token }),
      ]);

      setDayReadings(day.data);
      setAllReadings(all.data);
      setPagination(all.pagination);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, page, token]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * @param {{ date: string, slot: string, value: number }} values
   */
  async function handleCreate(values) {
    await apiFetch('/readings', { method: 'POST', body: values, token });
    await load();
  }

  /**
   * @param {{ date: string, slot: string, value: number }} values
   */
  async function handleUpdate(values) {
    await apiFetch(`/readings/${editing.id}`, { method: 'PUT', body: values, token });
    setEditing(null);
    await load();
  }

  /**
   * @param {any} reading
   */
  async function handleDelete(reading) {
    const confirmed = window.confirm(
      `Delete the ${reading.slotLabel} reading of ${formatDate(reading.date)}?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(`/readings/${reading.id}`, { method: 'DELETE', token });
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const firstShown = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastShown = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1>Hello, {user?.name}</h1>
          <p className="muted">Record up to four readings a day and keep track of your glucose.</p>
        </div>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="columns">
        <ReadingForm
          key={editing?.id ?? 'new'}
          initialValues={editing ?? undefined}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={editing ? () => setEditing(null) : undefined}
          submitLabel={editing ? 'Update reading' : 'Add reading'}
          title={editing ? 'Edit reading' : 'Add a reading'}
        />

        <section className="card">
          <div className="card-header">
            <h2>Readings on {formatDate(selectedDate)}</h2>
            <input
              className="date-input"
              type="date"
              aria-label="Select a date"
              value={selectedDate}
              max={todayISO()}
              onChange={(event) => {
                setPage(1);
                setSelectedDate(event.target.value);
              }}
            />
          </div>

          {loading ? (
            <p className="muted">Loading readings…</p>
          ) : dayReadings.length === 0 ? (
            <EmptyState
              title="Nothing recorded for this day"
              message="Add a reading with the form to start your record for this day."
            />
          ) : (
            <ReadingList readings={dayReadings} onEdit={setEditing} onDelete={handleDelete} />
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h2>All readings</h2>
        </div>

        {loading ? (
          <p className="muted">Loading readings…</p>
        ) : allReadings.length === 0 ? (
          <EmptyState
            title="No readings yet"
            message="Your readings will appear here once you record your first one."
          />
        ) : (
          <>
            <ReadingList readings={allReadings} showDate onEdit={setEditing} onDelete={handleDelete} />
            <div className="pagination">
              <button
                type="button"
                className="button small ghost"
                disabled={pagination.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <span className="muted">
                Showing {firstShown}–{lastShown} of {pagination.total}
              </span>
              <button
                type="button"
                className="button small ghost"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
