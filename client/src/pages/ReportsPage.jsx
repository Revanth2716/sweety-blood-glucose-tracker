import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/useAuth.js';
import { formatDate, todayISO } from '../lib/dates.js';
import ReportCards from '../components/ReportCards.jsx';
import ReadingList from '../components/ReadingList.jsx';
import EmptyState from '../components/EmptyState.jsx';
import TirGauge from '../components/TirGauge.jsx';
import Skeleton from '../components/Skeleton.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';

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
  const hasReadings = report && report.stats.count > 0;

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>
            Your glucose <span className="gradient-text">insights</span>
          </h1>
          <p className="muted">A day, a month so far or the month before.</p>
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
          <Skeleton lines={4} height={20} />
        </section>
      ) : report ? (
        <>
          <section className="card">
            <div className="card-header">
              <div>
                <h2>{report.range.label}</h2>
                <p className="muted">
                  {formatDate(report.range.from)}
                  {report.range.from !== report.range.to ? ` – ${formatDate(report.range.to)}` : ''}
                </p>
              </div>
              <span className="muted">compared with {report.previousRange.label}</span>
            </div>

            <ReportCards stats={report.stats} trend={report.trend} previousLabel="vs previous" />
          </section>

          {!hasReadings ? (
            <section className="card">
              <EmptyState
                title="No readings in this period"
                glyph="◌"
                message="There are no readings for this period yet. Record a reading and the numbers will show up here."
              />
            </section>
          ) : (
            <>
              <div className="columns" style={{ gridTemplateColumns: 'minmax(320px, 420px) 1fr' }}>
                <section className="card">
                  <div className="card-header">
                    <h2>Time in range</h2>
                    <span className="muted">70-180 mg/dl</span>
                  </div>
                  <TirGauge
                    percent={report.stats.timeInRange}
                    inRange={report.stats.inRange}
                    belowRange={report.stats.belowRange}
                    aboveRange={report.stats.aboveRange}
                    total={report.stats.count}
                  />
                </section>

                <section className="card">
                  <div className="card-header">
                    <h2>By time slot</h2>
                    <span className="muted">Average per slot</span>
                  </div>

                  {report.slots.length === 0 ? (
                    <p className="muted">No readings to break down.</p>
                  ) : (
                    <div className="stat-grid">
                      {report.slots.map((slot) => (
                        <div className="stat-card" key={slot.slot}>
                          <span className="stat-label">{slot.slotLabel}</span>
                          <span className="stat-value">
                            <AnimatedNumber value={slot.average} decimals={1} />
                            <small>mg/dl</small>
                          </span>
                          <span className="stat-foot muted">
                            {slot.count} reading{slot.count === 1 ? '' : 's'} · target{' '}
                            {slot.target.min}-{slot.target.max}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {showChart ? (
                <section className="card">
                  <div className="card-header">
                    <h2>Readings over the period</h2>
                    <span className="muted">The green band is the target range</span>
                  </div>
                  <Suspense fallback={<Skeleton lines={4} height={20} />}>
                    <GlucoseChart readings={report.readings} />
                  </Suspense>
                </section>
              ) : null}

              <section className="card">
                <div className="card-header">
                  <h2>Readings</h2>
                  <span className="muted">{report.stats.count} in this period</span>
                </div>
                <ReadingList readings={report.readings} showDate />
              </section>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
