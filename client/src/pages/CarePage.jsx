import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/useAuth.js';
import { useToast } from '../context/useToast.js';
import { formatDate } from '../lib/dates.js';
import TirGauge from '../components/TirGauge.jsx';
import InsightCards from '../components/InsightCards.jsx';
import EmptyState from '../components/EmptyState.jsx';

/**
 * The console of a doctor: the patients they look after, with the numbers of the last month.
 */
export default function CarePage() {
  const { token, user } = useAuth();
  const { notify } = useToast();
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [insights, setInsights] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await apiFetch('/care/patients', { token });
      setPatients(result.patients);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * @param {string} patientId
   */
  async function openPatient(patientId) {
    try {
      const result = await apiFetch(`/care/patients/${patientId}/insights`, { token });
      setSelected(patientId);
      setInsights(result);
    } catch (loadError) {
      notify(loadError.message, 'error');
    }
  }

  /**
   * @param {import('react').FormEvent<HTMLFormElement>} event
   */
  async function handleAdd(event) {
    event.preventDefault();
    setError('');

    try {
      await apiFetch('/care/patients', { method: 'POST', body: { email }, token });
      notify(`${email} was added to your care team.`);
      setEmail('');
      await load();
    } catch (addError) {
      setError(addError.message);
      notify(addError.message, 'error');
    }
  }

  /**
   * @param {string} patientId
   */
  async function handleRemove(patientId) {
    try {
      await apiFetch(`/care/patients/${patientId}`, { method: 'DELETE', token });
      notify('The patient was removed from your care team.');
      if (selected === patientId) {
        setSelected(null);
        setInsights(null);
      }
      await load();
    } catch (removeError) {
      notify(removeError.message, 'error');
    }
  }

  if (user?.role !== 'doctor') {
    return (
      <div className="stack">
        <header className="page-header">
          <div>
            <p className="eyebrow">Care team</p>
            <h1>
              The <span className="gradient-text">doctor console</span>
            </h1>
          </div>
        </header>

        <section className="card">
          <EmptyState
            title="This area is for doctors"
            glyph="⌘"
            message="Sign in with a doctor account to see the patients you look after."
          />
        </section>
      </div>
    );
  }

  const current = patients.find((patient) => patient.id === selected) ?? null;

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Care team</p>
          <h1>
            Your <span className="gradient-text">patients</span>
          </h1>
          <p className="muted">The numbers of the last 30 days of every patient you look after.</p>
        </div>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="card">
        <h2>Add a patient</h2>
        <form className="inline-form" onSubmit={handleAdd}>
          <input
            type="email"
            aria-label="Email of the patient"
            placeholder="patient@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" className="button primary">
            Add patient
          </button>
        </form>
        <p className="muted" style={{ marginTop: '0.6rem' }}>
          The patient needs an account with that email address.
        </p>
      </section>

      {loading ? (
        <section className="card">
          <p className="muted">Loading your patients…</p>
        </section>
      ) : patients.length === 0 ? (
        <section className="card">
          <EmptyState
            title="No patients yet"
            glyph="◇"
            message="Add a patient above to see their readings, their time in range and the patterns that stand out."
          />
        </section>
      ) : (
        <div className="patient-grid">
          {patients.map((patient) => (
            <article className="card patient-card" key={patient.id}>
              <div className="card-header">
                <div>
                  <h2>{patient.name}</h2>
                  <p className="muted">{patient.email}</p>
                </div>
                <span
                  className={`pill ${
                    patient.stats.timeInRange === null
                      ? 'neutral'
                      : patient.stats.timeInRange >= 70
                        ? 'in-range'
                        : 'high'
                  }`}
                >
                  {patient.stats.timeInRange === null
                    ? 'No data'
                    : `${patient.stats.timeInRange}% in range`}
                </span>
              </div>

              <div className="stat-grid">
                <div className="stat-card">
                  <span className="stat-label">Average</span>
                  <span className="stat-value">
                    {patient.stats.average ?? '–'}
                    <small>mg/dl</small>
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Readings</span>
                  <span className="stat-value">{patient.stats.count}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Adherence</span>
                  <span className="stat-value">{patient.adherence.percent}%</span>
                </div>
              </div>

              {patient.flags.length > 0 ? (
                <ul className="flag-list">
                  {patient.flags.map((flag) => (
                    <li key={flag.id}>{flag.title}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nothing stands out in this period.</p>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="button small ghost"
                  onClick={() => openPatient(patient.id)}
                >
                  Details
                </button>
                <button
                  type="button"
                  className="button small danger ghost"
                  onClick={() => handleRemove(patient.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {current && insights ? (
        <section className="card">
          <div className="card-header">
            <h2>{current.name} - the last 30 days</h2>
            <span className="muted">
              {formatDate(insights.period.from)} - {formatDate(insights.period.to)}
            </span>
          </div>

          <div className="columns" style={{ gridTemplateColumns: 'minmax(320px, 420px) 1fr' }}>
            <TirGauge
              percent={current.stats.timeInRange}
              caption="Time in range"
              legend={[
                { label: 'In range', value: current.stats.inRange, colour: 'var(--ok)' },
                { label: 'Below range', value: current.stats.belowRange, colour: 'var(--danger)' },
                { label: 'Above range', value: current.stats.aboveRange, colour: 'var(--warn)' },
                { label: 'Readings', value: current.stats.count },
              ]}
            />

            <div className="stack">
              <div className="stat-grid">
                <div className="stat-card">
                  <span className="stat-label">Adherence</span>
                  <span className="stat-value">{insights.adherence.percent}%</span>
                  <span className="stat-foot muted">
                    {insights.adherence.loggedSlots} of {insights.adherence.possibleSlots} slots
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Streak</span>
                  <span className="stat-value">{insights.adherence.streak}</span>
                  <span className="stat-foot muted">days in a row</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">A1C estimate</span>
                  <span className="stat-value">
                    {current.stats.estimatedA1c ?? '–'}
                    <small>%</small>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <h3 style={{ marginTop: '1.25rem' }}>What stands out</h3>
          <InsightCards patterns={insights.patterns} />
        </section>
      ) : null}
    </div>
  );
}
