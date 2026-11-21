import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { computeTotals } from '../engine/totals';
import CountUp from './CountUp';
import PaymentReviewPanel from './PaymentReviewPanel';
import { annualCost, attentionRank, money, paymentReason, potentialSavings, reportCsv } from './dashboardView';
import './Dashboard.css';

const TOUR_KEY = 'lf_dashboard_tour_done_v1';
const PAGE_SIZE = 12;
const decisionLabels = { keep: 'Keep', consider_cancelling: 'Plan to cancel', review: 'Remind me' };

function guestStorageKey(bankName, subs) {
  const source = bankName + ':' + subs.map(sub => sub.id).sort().join('|');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return 'lf_guest_choices_' + (hash >>> 0).toString(16);
}

function CoachTour({ step, setStep, onClose }) {
  const content = [
    ['Your yearly picture', 'This is what you pay each year. Potential savings are estimates, so review the evidence before deciding.'],
    ['Every payment in one place', 'Each row is a recurring payment we found. Price changes and likely unused services appear first.'],
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
    paymentCandidates, reviewDecisions, saveReviewDecisions, showToast, statementCoverageDays, openAuthModal
  } = useApp();
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const [guestChoices, setGuestChoices] = useState({});
  const [optimistic, setOptimistic] = useState({});
  const [tourStep, setTourStep] = useState(null);
  const activeSubscriptions = subscriptions.filter(sub => !cancelledMap[sub.id]);
  const totals = computeTotals(activeSubscriptions);
  const storageKey = useMemo(() => guestStorageKey(bankName, subscriptions), [bankName, subscriptions]);
  const choices = user && !isDemo ? reviewDecisions : { ...reviewDecisions, ...guestChoices };
  const displayedChoices = { ...choices, ...optimistic };
  const planned = subscriptions.filter(sub => displayedChoices[sub.id] === 'consider_cancelling' && !cancelledMap[sub.id]);
  const plannedSavings = planned.reduce((sum, sub) => sum + annualCost(sub), 0);
  const markedSavings = subscriptions.filter(sub => cancelledMap[sub.id]).reduce((sum, sub) => sum + annualCost(sub), 0);
  const reviewFirst = [...activeSubscriptions].filter(sub => ['unused', 'hike'].includes(sub.status?.kind))
    .sort((a, b) => (a.status?.kind === 'unused' ? 0 : 1) - (b.status?.kind === 'unused' ? 0 : 1) || annualCost(b) - annualCost(a))[0];

  useEffect(() => {
    if (user && !isDemo) return;
    try { setGuestChoices(JSON.parse(localStorage.getItem(storageKey) || '{}')); }
    catch { setGuestChoices({}); }
  }, [storageKey, user, isDemo]);

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

  function finishTour() { localStorage.setItem(TOUR_KEY, '1'); setTourStep(null); }

  async function choose(sub, choice, withUndo = true) {
    const previous = displayedChoices[sub.id] ?? null;
    setOptimistic(current => ({ ...current, [sub.id]: choice }));
    const result = await saveReviewDecisions({ [sub.id]: choice });
    if (result.failed) {
      setOptimistic(current => ({ ...current, [sub.id]: previous }));
      showToast('Your choice was not saved. Please try again.');
      return;
    }
    if (!user || isDemo) {
      const next = { ...guestChoices };
      if (choice === null) delete next[sub.id]; else next[sub.id] = choice;
      setGuestChoices(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    }
    setOptimistic(current => { const next = { ...current }; delete next[sub.id]; return next; });
    showToast(choice === null ? 'Choice removed.' : `${sub.name}: ${decisionLabels[choice]}.`, withUndo ? {
      actionLabel: 'Undo', duration: 5000, onAction: () => choose(sub, previous, false)
    } : {});
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
        <button type="button" className="af-btn af-btn-secondary" onClick={downloadReport}>Download report</button>
        <button type="button" className="af-btn af-btn-secondary" onClick={() => navigateTo('upload')}>New statement</button>
      </div>
    </div>

    <PaymentReviewPanel />
    {statementCoverageDays !== null && statementCoverageDays < 90 && <p className="lf-note" role="note">Short statement: detection may miss yearly payments. Add more months for a fuller picture.</p>}
    <p className="lf-story">You're paying <strong>{money(totals.yearlySpend)}</strong> a year across {activeSubscriptions.length} {activeSubscriptions.length === 1 ? 'subscription' : 'subscriptions'}. {potentialSavings(activeSubscriptions) > 0 ? <>You could review about <strong>{money(potentialSavings(activeSubscriptions))}</strong> in possible savings.</> : 'No clear savings opportunity was flagged.'}</p>
    <div className={`lf-metrics ${tourStep === 0 ? 'lf-coach-target' : ''}`}>
      <div className="af-card lf-metric"><span className="lf-eyebrow">YEARLY SUBSCRIPTION SPEND</span><strong><CountUp to={totals.yearlySpend} duration={600} prefix="₹" /></strong><small>Across {subscriptions.length} detected payments</small></div>
      <div className="af-card lf-metric"><span className="lf-eyebrow">EXTRA FROM PRICE RISES</span><strong className="lf-danger"><CountUp to={totals.hikeExtra} duration={600} prefix="₹" /></strong><small>Estimated extra each year</small></div>
      <div className="af-card lf-metric"><span className="lf-eyebrow">POSSIBLY UNUSED</span><strong className="lf-warning"><CountUp to={totals.unusedAmount} duration={600} prefix="₹" /></strong><small>Check before cancelling</small></div>
    </div>
    {reviewFirst && <div className="lf-review-first"><div><span className="lf-eyebrow">REVIEW FIRST</span><p><strong>{reviewFirst.name}</strong> {reviewFirst.status?.kind === 'unused' ? 'may be unused' : 'had a price rise'} · {money(annualCost(reviewFirst))} a year</p></div><button type="button" className="af-btn af-btn-primary" onClick={() => navigateTo('guide', reviewFirst.id)}>See cancel steps</button></div>}

    <div className="lf-decision-summary" aria-live="polite">
      <span>You've marked {planned.length} {planned.length === 1 ? 'subscription' : 'subscriptions'} to cancel, with <strong>{money(plannedSavings)} a year</strong> in potential savings. {markedSavings > 0 && <span>Marked cancelled: {money(markedSavings)} a year.</span>}</span>
      {!user && <button type="button" className="lf-link" onClick={() => openAuthModal('login')}>Sign in and upload a statement to save choices across devices</button>}
    </div>

    <section className={`af-card lf-results ${tourStep === 1 ? 'lf-coach-target' : ''}`} aria-labelledby="results-title">
      <div className="lf-results-head">
        <div><h2 id="results-title">Detected subscriptions</h2><p>Sorted by what may need attention first</p></div>
        <label className="lf-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search service or transaction text" aria-label="Search subscriptions" /></label>
      </div>
      {filtered.length === 0 ? <p className="lf-no-results">No service matches “{search}”. Try another name.</p> : <div className="lf-table-wrap">
        <table className="af-table lf-sub-table">
          <thead><tr><th>Service</th><th className="lf-money-cell">Amount</th><th>Frequency</th><th>Status</th><th>Decision</th><th>Actions</th></tr></thead>
          <tbody>{filtered.slice(0, shown).map((sub, index) => {
            const choice = displayedChoices[sub.id];
            const cancelled = !!cancelledMap[sub.id];
            const reason = paymentReason(sub);
            const kind = sub.status?.kind || 'active';
            return <tr key={sub.id} className={cancelled ? 'lf-cancelled-row' : ''}>
              <td data-label="Service"><span className="lf-service-name" title={sub.name}>{sub.name}</span>{reason && <span className="lf-service-reason">{reason}</span>}<span className="af-code lf-narration" title={sub.code || ''}>{sub.code || ''}</span></td>
              <td data-label="Amount" className="lf-money-cell">{Number.isFinite(sub.was) && sub.was < sub.price && <del>{money(sub.was)}</del>}<strong>{money(sub.price)}</strong></td>
              <td data-label="Frequency">{sub.per === 'yr' ? 'Yearly' : 'Monthly'}</td>
              <td data-label="Status"><span className={`af-pill lf-status lf-status-${cancelled ? 'cancelled' : kind}`}>{cancelled ? 'Marked cancelled' : sub.status?.label || 'Active'}</span>{choice && <span className="af-pill lf-status-decision">{decisionLabels[choice]}</span>}</td>
              <td data-label="Decision"><div className="lf-choice-group" aria-label={`Decision for ${sub.name}`}>{[['keep','Keep'],['consider_cancelling','Cancel'],['review','Remind me']].map(([value,label]) => <button key={value} type="button" title={value === 'review' ? 'Adds this payment to your review list. No email or push notification is sent.' : undefined} className={choice === value ? 'is-selected' : ''} aria-pressed={choice === value} onClick={() => choose(sub, value)}>{label}</button>)}</div></td>
              <td data-label="Actions"><div className="lf-row-links"><button type="button" onClick={() => navigateTo('guide', sub.id)} className={tourStep === 2 && index === 0 ? 'lf-coach-target' : ''}>See cancel steps</button><button type="button" onClick={() => navigateTo('detail', sub.id)}>Details</button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
      {filtered.length > shown && <button type="button" className="af-btn af-btn-secondary lf-show-more" onClick={() => setShown(value => value + PAGE_SIZE)}>Show more ({filtered.length - shown} left)</button>}
      <p className="lf-results-foot">“Cancel” saves your plan. “Remind me” adds a review choice, without sending a notification. Open the guide and complete cancellation with the provider; we cannot stop payments for you.</p>
    </section>
    {tourStep !== null && <CoachTour step={tourStep} setStep={setTourStep} onClose={finishTour} />}
  </main>;
}
