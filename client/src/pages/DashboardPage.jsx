import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/useAuth.js';
import { useToast } from '../context/useToast.js';
import { formatDate, todayISO } from '../lib/dates.js';
import { SLOTS } from '../lib/readings.js';
import { DEFAULT_TARGETS, TIR_BAND } from '../lib/targets.js';
import ReadingForm from '../components/ReadingForm.jsx';
import ReadingList from '../components/ReadingList.jsx';
import SlotCard from '../components/SlotCard.jsx';
import TirGauge from '../components/TirGauge.jsx';
import InsightCards from '../components/InsightCards.jsx';
import Skeleton from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

const PAGE_SIZE = 10;

/**
 * The dashboard: add, edit and delete the readings of a day and browse the full history.
 */
export default function DashboardPage() {
  const { user, token } = useAuth();
  const { notify } = useToast();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [dayReadings, setDayReadings] = useState([]);
  const [allReadings, setAllReadings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [presetSlot, setPresetSlot] = useState(null);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [day, all, profile, insight] = await Promise.all([
        apiFetch(`/readings?date=${selectedDate}&limit=${PAGE_SIZE}`, { token }),
        apiFetch(`/readings?page=${page}&limit=${PAGE_SIZE}`, { token }),
        apiFetch('/profile', { token }),
        apiFetch('/insights', { token }),
      ]);

      setDayReadings(day.data);
      setAllReadings(all.data);
      setPagination(all.pagination);
      setTargets({ ...DEFAULT_TARGETS, ...profile.targets });
      setInsights(insight);
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
    notify(`Reading of ${values.value} mg/dl saved.`);
    setPresetSlot(null);
    await load();
  }

  /**
   * @param {{ date: string, slot: string, value: number }} values
   */
  async function handleUpdate(values) {
    await apiFetch(`/readings/${editing.id}`, { method: 'PUT', body: values, token });
    notify('Reading updated.');
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
      notify('Reading deleted.');
      await load();
    } catch (deleteError) {
      setError(deleteError.message);
      notify(deleteError.message, 'error');
    }
  }

  const readingBySlot = useMemo(() => {
    const map = {};
    for (const reading of dayReadings) {
      map[reading.slot] = reading;
    }
    return map;
  }, [dayReadings]);

  const dayTir = useMemo(() => {
    if (dayReadings.length === 0) {
      return { percent: null, inRange: 0, belowRange: 0, aboveRange: 0, total: 0 };
    }

    let inRange = 0;
    let belowRange = 0;
    let aboveRange = 0;

    for (const reading of dayReadings) {
      if (reading.value < TIR_BAND.min) {
        belowRange += 1;
      } else if (reading.value > TIR_BAND.max) {
        aboveRange += 1;
      } else {
        inRange += 1;
      }
    }

    return {
      percent: Math.round((inRange / dayReadings.length) * 1000) / 10,
      inRange,
      belowRange,
      aboveRange,
      total: dayReadings.length,
    };
  }, [dayReadings]);

  const firstShown = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const lastShown = Math.min(pagination.page * pagination.limit, pagination.total);

  const formValues = editing ?? (presetSlot ? { date: selectedDate, slot: presetSlot } : undefined);
  const formKey = editing?.id ?? presetSlot ?? 'new';

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>
            Hello, <span className="gradient-text">{user?.name}</span>
          </h1>
          <p className="muted">Record up to four readings a day and keep track of your glucose.</p>
        </div>

        <div className="controls">
          <input
            className="date-input"
            type="date"
            aria-label="Select a date"
            value={selectedDate}
            max={todayISO()}
            onChange={(event) => {
              setPage(1);
              setSelectedDate(event.target.value);
              setPresetSlot(null);
            }}
          />
        </div>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="columns">
        <ReadingForm
          key={formKey}
          initialValues={formValues}
          onSubmit={editing ? handleUpdate : handleCreate}
          targets={targets}
          onCancel={
            editing || presetSlot
              ? () => {
                  setEditing(null);
                  setPresetSlot(null);
                }
              : undefined
          }
          submitLabel={editing ? 'Update reading' : 'Add reading'}
          title={editing ? 'Edit reading' : 'Add a reading'}
        />

        <div className="stack">
          <section className="card">
            <div className="card-header">
              <div>
                <h2>Readings on {formatDate(selectedDate)}</h2>
                <p className="muted">{dayReadings.length} of 4 slots recorded</p>
              </div>
            </div>

            {loading ? (
              <div className="slot-grid">
                {SLOTS.map((slot) => (
                  <div className="skeleton skeleton-card" key={slot.value} />
                ))}
              </div>
            ) : (
              <div className="slot-grid">
                {SLOTS.map((slot) => (
                  <SlotCard
                    key={slot.value}
                    slot={slot}
                    reading={readingBySlot[slot.value]}
                    onEdit={setEditing}
                    onDelete={handleDelete}
                    onAdd={(value) => {
                      setEditing(null);
                      setPresetSlot(value);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <h2>Time in range today</h2>
              <span className="muted">70-180 mg/dl</span>
            </div>
            <TirGauge
              percent={dayTir.percent}
              inRange={dayTir.inRange}
              belowRange={dayTir.belowRange}
              aboveRange={dayTir.aboveRange}
              total={dayTir.total}
            />
          </section>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Your last 30 days</h2>
          <span className="muted">How consistently you record, and what stands out</span>
        </div>

        {loading || !insights ? (
          <Skeleton lines={3} height={18} />
        ) : (
          <>
            <TirGauge
              percent={insights.adherence.percent}
              caption="Adherence"
              legend={[
                {
                  label: 'Slots filled in',
                  value: `${insights.adherence.loggedSlots} of ${insights.adherence.possibleSlots}`,
                },
                { label: 'Days in a row', value: insights.adherence.streak },
                {
                  label: 'Complete days',
                  value: `${insights.adherence.completeDays} of ${insights.adherence.days}`,
                },
              ]}
            />

            <div style={{ marginTop: '1.25rem' }}>
              <InsightCards patterns={insights.patterns} />
            </div>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>All readings</h2>
          <span className="muted">Your complete history</span>
        </div>

        {loading ? (
          <Skeleton lines={6} height={18} />
        ) : allReadings.length === 0 ? (
          <EmptyState
            title="No readings yet"
            glyph="◇"
            message="Your readings will appear here once you record your first one."
          />
        ) : (
          <>
            <ReadingList
              readings={allReadings}
              showDate
              onEdit={setEditing}
              onDelete={handleDelete}
            />
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
