import { useCallback, useEffect, useState } from 'react';
import { apiFetch, API_BASE_URL } from '../api/client.js';
import { useAuth } from '../context/useAuth.js';
import { useToast } from '../context/useToast.js';
import { DEFAULT_TARGETS } from '../lib/targets.js';

/**
 * The settings of the patient: the targets, the goals, the care team and the export.
 */
export default function SettingsPage() {
  const { token, user } = useAuth();
  const { notify } = useToast();
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [careTeam, setCareTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const profile = await apiFetch('/profile', { token });
      setTargets({ ...DEFAULT_TARGETS, ...profile.targets });
      setCareTeam(profile.careTeam);
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
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   */
  function handleChange(event) {
    const { name, value } = event.target;
    setTargets((current) => ({ ...current, [name]: Number(value) }));
  }

  /**
   * @param {import('react').FormEvent<HTMLFormElement>} event
   */
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await apiFetch('/profile/targets', { method: 'PUT', body: targets, token });
      notify('Your targets were saved.');
    } catch (saveError) {
      setError(saveError.message);
      notify(saveError.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { name: 'fastingMin', label: 'Fasting from', unit: 'mg/dl' },
    { name: 'fastingMax', label: 'Fasting to', unit: 'mg/dl' },
    { name: 'postMealMin', label: 'After a meal from', unit: 'mg/dl' },
    { name: 'postMealMax', label: 'After a meal to', unit: 'mg/dl' },
    { name: 'tirGoal', label: 'Time in range goal', unit: '%' },
    { name: 'a1cGoal', label: 'A1C goal', unit: '%' },
  ];

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>
            Your <span className="gradient-text">targets</span>
          </h1>
          <p className="muted">
            The ranges that decide whether a reading is low, in range or high for {user?.name}.
          </p>
        </div>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="columns">
        <section className="card">
          <h2>Targets and goals</h2>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="target-grid">
              {fields.map((field) => (
                <div className="field" key={field.name}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="number"
                    step={field.name === 'a1cGoal' ? '0.1' : '1'}
                    value={targets[field.name]}
                    onChange={handleChange}
                  />
                  <small className="muted">{field.unit}</small>
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button type="submit" className="button primary" disabled={saving || loading}>
                {saving ? 'Saving…' : 'Save targets'}
              </button>
            </div>
          </form>
        </section>

        <div className="stack">
          <section className="card">
            <h2>Care team</h2>
            {loading ? (
              <p className="muted">Loading…</p>
            ) : careTeam.length === 0 ? (
              <p className="muted">
                No doctor is linked to your account yet. A doctor can add you with your email
                address.
              </p>
            ) : (
              <ul className="plain-list">
                {careTeam.map((doctor) => (
                  <li key={doctor.id}>
                    <strong>{doctor.name}</strong>
                    <span className="muted">{doctor.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>Your data</h2>
            <p className="muted">
              Download every reading as a CSV file to open it in a spreadsheet or to share it with
              your doctor.
            </p>
            <a
              className="button ghost"
              href={`${API_BASE_URL}/readings.csv`}
              onClick={(event) => {
                // The token is needed, so the file is fetched with the header and downloaded.
                event.preventDefault();
                downloadCsv(token);
              }}
            >
              Download CSV
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Download the readings as a CSV file.
 *
 * @param {string} token
 */
async function downloadCsv(token) {
  const response = await fetch(`${API_BASE_URL}/readings.csv`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sweety-readings.csv';
  link.click();
  URL.revokeObjectURL(url);
}
