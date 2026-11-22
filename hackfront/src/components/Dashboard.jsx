import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { computeTotals } from '../engine/totals';
import CountUp from './CountUp';
import PaymentReviewPanel from './PaymentReviewPanel';
import { annualCost, attentionRank, money, paymentReason, reportCsv } from './dashboardView';
import './Dashboard.css';

const TOUR_KEY = 'lf_dashboard_tour_done_v1';
const PAGE_SIZE = 12;
const decisionLabels = { keep: 'Keep', consider_cancelling: 'Plan to cancel', review: 'Remind me' };

function CoachTour({ step, setStep, onClose }) {
  const content = [
    ['Your yearly picture', 'These cards show estimated yearly spend and the extra cost of detected price rises.'],
    ['Every payment in one place', 'Each row is a recurring payment we found. Open the details to inspect the evidence.'],
    ['Take action', 'See cancel steps for guided instructions. The app cannot cancel a bank payment for you.']
  ];
  return <div className="lf-coach" role="dialog" aria-label="Dashboard tour" aria-live="polite">
    <span className="lf-coach-count">STEP {step + 1} OF 3</span>
    <h2>{content[step][0]}</h2>
    <p>{content[step][1]}</p>
    <div className="lf-coach-actions">
      <button type="button" className="af-btn af-btn-ghost" onClick={onClose}>Skip</button>
      <button type="button" className="af-btn af-btn-primary" onClick={() => step < 2 ? setStep(step + 1) : onClose()}>{step < 2 ? 'Next' : 'Done'}</button>
    </div>
  </div>;
}

export default function Dashboard() {
  const {
    subscriptions, bankName, isDemo, demoSource, cancelledMap, navigateTo, user,
    paymentCandidates, reviewDecisions, saveReviewDecisions, showToast, statementCoverageDays
  } = useApp();
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [tourStep, setTourStep] = useState(null);
  const activeSubscriptions = subscriptions.filter(sub => !cancelledMap[sub.id]);
  const totals = computeTotals(activeSubscriptions);
  const canDecide = !!user && !isDemo;
  const choices = reviewDecisions;
  const displayedChoices = { ...choices, ...draft };
  const unsavedCount = Object.keys(draft).filter(id => draft[id] !== choices[id]).length;
  const planned = subscriptions.filter(sub => displayedChoices[sub.id] === 'consider_cancelling' && !cancelledMap[sub.id]);
  const plannedSavings = planned.reduce((sum, sub) => sum + annualCost(sub), 0);
  const markedSavings = subscriptions.filter(sub => cancelledMap[sub.id]).reduce((sum, sub) => sum + annualCost(sub), 0);

  useEffect(() => {
    if (!subscriptions.length) return;
    if (!localStorage.getItem(TOUR_KEY) || sessionStorage.getItem('lf_tour_replay')) {
      sessionStorage.removeItem('lf_tour_replay');
      setTourStep(0);
    }
    const replay = () => setTourStep(0);
    window.addEventListener('lf:replay-tour', replay);
    return () => window.removeEventListener('lf:replay-tour', replay);
  }, [subscriptions.length]);

  useEffect(() => { setShown(PAGE_SIZE); }, [search, subscriptions]);
  useEffect(() => { setDraft({}); setSaveError(''); }, [subscriptions, bankName]);

  function finishTour() { localStorage.setItem(TOUR_KEY, '1'); setTourStep(null); }

  function choose(sub, choice) {
    if (!canDecide) return;
    setDraft(current => {
      const next = { ...current };
      if (choice === choices[sub.id]) delete next[sub.id]; else next[sub.id] = choice;
      return next;
    });
    setSaveError('');
  }

  async function saveChoices() {
    if (!canDecide || !unsavedCount || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const changes = Object.fromEntries(Object.entries(draft).filter(([id, value]) => value !== choices[id]));
      const result = await saveReviewDecisions(changes);
      if (result.failed) {
        setSaveError(`${result.failed} choice${result.failed === 1 ? '' : 's'} could not be saved. Retry after checking your connection.`);
        return;
      }
      setDraft({});
      showToast('Choices saved. Open Saved decisions to see them grouped.');
    } catch {
      setSaveError('Could not save your choices. Please retry.');
    } finally { setSaving(false); }
  }

  function downloadReport() {
    const csv = reportCsv(subscriptions, displayedChoices, cancelledMap);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'loss-finder-report.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Report downloaded as CSV.');
  }

  const filtered = [...subscriptions]
    .sort((a, b) => attentionRank(a) - attentionRank(b) || annualCost(b) - annualCost(a))
    .filter(sub => (sub.name + ' ' + (sub.code || '')).toLowerCase().includes(search.trim().toLowerCase()));

  if (!subscriptions.length) return <main className="lf-standard-page">
    <PaymentReviewPanel />
    <div className="af-card lf-empty">
      <span className="material-symbols-outlined">search_off</span>
      <h1>{paymentCandidates?.length ? 'Review possible payments' : 'No subscriptions found'}</h1>
      <p>{paymentCandidates?.length ? 'Confirm any subscriptions above to include them in your results.' : 'We did not find a recurring payment. Try a statement covering at least three months or review your file format.'}</p>
      <button type="button" className="af-btn af-btn-primary" onClick={() => navigateTo('upload')}>Upload another statement</button>
    </div>
  </main>;

  return <main className="lf-standard-page lf-dashboard">
    <div className="lf-page-heading">
      <div>
        <div className="lf-heading-line"><h1>Subscriptions &amp; recurring payments</h1>{isDemo && <span className="af-demo-chip">Demo</span>}</div>
        <p>{isDemo ? (demoSource === 'aa' ? 'Fictional account data. No bank is connected.' : 'Sample statement') : bankName}</p>
      </div>
      <div className="lf-heading-actions">
        {canDecide && <button type="button" className="af-btn af-btn-primary" disabled={!unsavedCount || saving} onClick={saveChoices}>{saving ? 'Saving…' : unsavedCount ? `Save ${unsavedCount} choice${unsavedCount === 1 ? '' : 's'}` : 'Save choices'}</button>}
        <button type="button" className="af-btn af-btn-secondary" onClick={downloadReport}>Download report</button>
        <button type="button" className="af-btn af-btn-secondary" onClick={() => navigateTo('upload')}>New statement</button>
      </div>
    </div>

    <PaymentReviewPanel />
    {statementCoverageDays !== null && statementCoverageDays < 90 && <p className="lf-note" role="note">Short statement: detection may miss yearly payments. Add more months for a fuller picture.</p>}
    <div className={`lf-metrics ${tourStep === 0 ? 'lf-coach-target' : ''}`}>
      <div className="af-card lf-metric"><span className="lf-eyebrow">YEARLY SUBSCRIPTION SPEND</span><strong><CountUp to={totals.yearlySpend} duration={600} prefix="₹" /></strong><small>Across {subscriptions.length} detected payments</small></div>
      <div className="af-card lf-metric"><span className="lf-eyebrow">EXTRA FROM PRICE RISES</span><strong className="lf-danger"><CountUp to={totals.hikeExtra} duration={600} prefix="₹" /></strong><small>Estimated extra each year</small></div>
    </div>

    {canDecide && <div className="lf-decision-summary" aria-live="polite">
      <span>You've marked {planned.length} {planned.length === 1 ? 'subscription' : 'subscriptions'} to cancel, with <strong>{money(plannedSavings)} a year</strong> in potential savings. {markedSavings > 0 && <span>Marked cancelled: {money(markedSavings)} a year.</span>}</span>
    </div>}

    <section className={`af-card lf-results ${tourStep === 1 ? 'lf-coach-target' : ''}`} aria-labelledby="results-title">
      <div className="lf-results-head">
        <div><h2 id="results-title">Detected subscriptions</h2><p>Price rises appear first</p></div>
        <label className="lf-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search service or transaction text" aria-label="Search subscriptions" /></label>
      </div>
      {filtered.length === 0 ? <p className="lf-no-results">No service matches “{search}”. Try another name.</p> : <div className="lf-table-wrap">
        <table className="af-table lf-sub-table">
          <thead><tr><th>Service</th><th className="lf-money-cell">Amount</th><th>Frequency</th><th>Status</th>{canDecide && <th>Decision</th>}<th>Actions</th></tr></thead>
          <tbody>{filtered.slice(0, shown).map((sub, index) => {
            const choice = displayedChoices[sub.id];
            const cancelled = !!cancelledMap[sub.id];
            const reason = paymentReason(sub);
            const kind = ['unused', 'unknown'].includes(sub.status?.kind) ? 'active' : sub.status?.kind || 'active';
            return <tr key={sub.id} className={cancelled ? 'lf-cancelled-row' : ''}>
              <td data-label="Service"><span className="lf-service-name" title={sub.name}>{sub.name}</span>{reason && <span className="lf-service-reason">{reason}</span>}<span className="af-code lf-narration" title={sub.code || ''}>{sub.code || ''}</span></td>
              <td data-label="Amount" className="lf-money-cell">{Number.isFinite(sub.was) && sub.was < sub.price && <del>{money(sub.was)}</del>}<strong>{money(sub.price)}</strong></td>
              <td data-label="Frequency">{sub.per === 'yr' ? 'Yearly' : 'Monthly'}</td>
              <td data-label="Status"><span className={`af-pill lf-status lf-status-${cancelled ? 'cancelled' : kind}`}>{cancelled ? 'Marked cancelled' : kind === 'active' ? 'Active' : sub.status?.label || 'Active'}</span>{choice && <span className="af-pill lf-status-decision">{decisionLabels[choice]}{draft[sub.id] && ' · Unsaved'}</span>}</td>
              {canDecide && <td data-label="Decision"><div className="lf-choice-group" aria-label={`Decision for ${sub.name}`}>{[['keep','Keep'],['consider_cancelling','Cancel'],['review','Remind me']].map(([value,label]) => <button key={value} type="button" title={value === 'review' ? 'Adds this payment to your review list. No email or push notification is sent.' : undefined} className={choice === value ? 'is-selected' : ''} aria-pressed={choice === value} onClick={() => choose(sub, value)}>{label}</button>)}</div></td>}
              <td data-label="Actions"><div className="lf-row-links"><button type="button" onClick={() => navigateTo('guide', sub.id)} className={tourStep === 2 && index === 0 ? 'lf-coach-target' : ''}>See cancel steps</button><button type="button" onClick={() => navigateTo('detail', sub.id)}>Details</button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
      {filtered.length > shown && <button type="button" className="af-btn af-btn-secondary lf-show-more" onClick={() => setShown(value => value + PAGE_SIZE)}>Show more ({filtered.length - shown} left)</button>}
      {canDecide && <div className="lf-save-bar"><div><p>{unsavedCount ? `${unsavedCount} unsaved choice${unsavedCount === 1 ? '' : 's'}` : 'Your choices are saved'}</p><small>“Cancel” records your plan; it does not stop a payment. “Remind me” records a review choice without sending a notification.</small>{saveError && <p role="alert" className="lf-save-error">{saveError}</p>}</div><div className="lf-save-actions"><button type="button" className="af-btn af-btn-secondary" onClick={() => navigateTo('saved')}>Saved decisions</button><button type="button" className="af-btn af-btn-primary" disabled={!unsavedCount || saving} onClick={saveChoices}>{saving ? 'Saving…' : 'Save choices'}</button></div></div>}
    </section>
    {tourStep !== null && <CoachTour step={tourStep} setStep={setTourStep} onClose={finishTour} />}
  </main>;
}
