import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/useAuth.js';
import { formatDate, todayISO } from '../lib/dates.js';
import ReportCards from '../components/ReportCards.jsx';
import ReadingList from '../components/ReadingList.jsx';
import EmptyState from '../components/EmptyState.jsx';

// The chart is loaded on demand, so that the charting library stays out of the main bundle.
const GlucoseChart = lazy(() => import('../components/GlucoseChart.jsx'));

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'month-to-date', label: 'Month to date' },
  { value: 'monthly', label: 'Monthly' },
];

/**
 * The reports page: a daily, a month to date and a monthly report.
 */
export default function ReportsPage() {
  const { token } = useAuth();
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await apiFetch(`/reports/${reportType}?date=${selectedDate}`, { token });
      setReport(result);
    } catch (loadError) {
      setError(loadError.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [reportType, selectedDate, token]);

  useEffect(() => {
    load();
  }, [load]);

  const showChart = reportType !== 'daily';

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="muted">Your glucose numbers for a day, a month so far or last month.</p>
        </div>

        <div className="controls">
          <div className="tabs" role="tablist" aria-label="Report type">
            {REPORT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                role="tab"
                aria-selected={reportType === type.value}
                className={`tab ${reportType === type.value ? 'active' : ''}`}
                onClick={() => setReportType(type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>

          <input
            className="date-input"
            type="date"
            aria-label="Select a date"
            value={selectedDate}
            max={todayISO()}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <section className="card">
          <p className="muted">Building the report…</p>
        </section>
      ) : report ? (
        <>
          <section className="card">
            <div className="card-header">
              <h2>{report.range.label}</h2>
              <span className="muted">
                {formatDate(report.range.from)}
                {report.range.from !== report.range.to ? ` – ${formatDate(report.range.to)}` : ''}
              </span>
            </div>

            <ReportCards stats={report.stats} />
          </section>

          {report.stats.count === 0 ? (
            <section className="card">
              <EmptyState
                title="No readings in this period"
                message="There are no readings for this period yet. Record a reading and the numbers will show up here."
              />
            </section>
          ) : (
            <>
              {showChart ? (
                <section className="card">
                  <h2>Readings over the period</h2>
                  <Suspense fallback={<p className="muted">Loading the chart…</p>}>
                    <GlucoseChart readings={report.readings} />
                  </Suspense>
                </section>
              ) : null}

              <section className="card">
                <h2>Readings</h2>
                <ReadingList readings={report.readings} showDate />
              </section>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
