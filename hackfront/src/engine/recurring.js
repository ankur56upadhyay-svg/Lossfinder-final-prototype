/**
 * recurring.js — Detects recurring payment cycles, price hikes, and billing history
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthYear(date) {
  const d = new Date(date);
  const m = MONTHS[d.getMonth()];
  const y = String(d.getFullYear()).slice(-2);
  return `${m} '${y}`;
}

function calculateMedian(numbers) {
  if (!numbers || !numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function isDecoy(tx) {
  if (!tx || !tx.amount || tx.amount <= 0) return true;
  const narr = (tx.narration || '').toUpperCase();
  const merch = (tx.merchant || '').toUpperCase();
  const cat = (tx.category || '').toUpperCase();

  if (cat === 'FOOD DELIVERY' || /SWIGGY|ZOMATO/i.test(merch) || /SWIGGY|ZOMATO/i.test(narr)) return true;
  if (/RENT|LANDLORD/i.test(narr) || /RENT|LANDLORD/i.test(merch)) {
    if (tx.amount >= 5000) return true;
  }
  if (/SALARY|REFUND/i.test(narr)) return true;
  return false;
}

export function findRecurring(transactions) {
  const debits = transactions.filter(t => !isDecoy(t));
  const groups = {};

  debits.forEach(t => {
    const key = t.merchantKey || t.merchant || 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const subscriptions = [];

  Object.keys(groups).forEach(key => {
    const rawTxns = groups[key].sort((a, b) => new Date(a.date) - new Date(b.date));

    // 7-day de-duplication: collapse retried charges within 7 days
    const collapsed = [];
    rawTxns.forEach(tx => {
      if (!collapsed.length) {
        collapsed.push(tx);
      } else {
        const last = collapsed[collapsed.length - 1];
        const diffDays = Math.abs(new Date(tx.date) - new Date(last.date)) / (1000 * 60 * 60 * 24);
        if (diffDays >= 7) {
          collapsed.push(tx);
        }
      }
    });

    if (collapsed.length < 2) return;

    // Calculate intervals between consecutive debits
    const intervals = [];
    for (let i = 1; i < collapsed.length; i++) {
      const diff = Math.round((new Date(collapsed[i].date) - new Date(collapsed[i - 1].date)) / (1000 * 60 * 60 * 24));
      intervals.push(diff);
    }

    const medianInterval = calculateMedian(intervals);
    let per = 'mo';
    let isRecurring = false;

    if (medianInterval >= 20 && medianInterval <= 45) {
      per = 'mo';
      isRecurring = collapsed.length >= 2;
    } else if (medianInterval >= 300 && medianInterval <= 430) {
      per = 'yr';
      isRecurring = collapsed.length >= 2;
    } else if (medianInterval >= 5 && medianInterval <= 12) {
      per = 'wk';
      isRecurring = collapsed.length >= 3;
    }

    if (!isRecurring) return;

    const latest = collapsed[collapsed.length - 1];
    const first = collapsed[0];
    const prices = collapsed.map(t => t.amount);
    const currentPrice = latest.amount;

    // Detect price hikes: check if earlier charges had a sustained lower price
    let was = undefined;
    const earlierCharges = collapsed.slice(0, -1);
    if (earlierCharges.length > 0) {
      const earlierAmounts = earlierCharges.map(t => t.amount);
      const minEarlier = Math.min(...earlierAmounts);
      if (currentPrice > minEarlier && minEarlier > 10) {
        was = minEarlier;
      }
    }

    // Build history array
    const history = collapsed.map(t => ({
      l: formatMonthYear(t.date),
      a: t.amount,
      date: t.date
    }));

    // Generate evidence observations
    const evidence = [];
    evidence.push(`Found ${collapsed.length} recurring charges between ${first.date.toLocaleDateString ? first.date.toLocaleDateString('en-IN') : String(first.date).slice(0, 10)} and ${latest.date.toLocaleDateString ? latest.date.toLocaleDateString('en-IN') : String(latest.date).slice(0, 10)}.`);
    evidence.push(`Median billing cycle frequency is ${Math.round(medianInterval)} days (${per === 'yr' ? 'Yearly' : 'Monthly'}).`);

    if (was && was < currentPrice) {
      const diff = currentPrice - was;
      const annualImpact = per === 'yr' ? diff : diff * 12;
      evidence.push(`Price increase detected: changed from ₹${was} to ₹${currentPrice} (+₹${diff}/${per}).`);
      evidence.push(`Exact extra annual cost from this price hike: ₹${annualImpact.toLocaleString('en-IN')}.`);
    } else {
      evidence.push(`Consistent billing at ₹${currentPrice} per ${per === 'yr' ? 'year' : 'month'}.`);
    }

    evidence.push(`Charged through ${latest.mech || 'Card'} using descriptor "${latest.narration || ''}".`);

    // Check for ended / inactive state (no charge for > 65 days for monthly)
    const daysSinceLast = Math.round((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24));
    let statusKind = 'active';
    let statusLabel = 'Active';

    if (was && was < currentPrice) {
      statusKind = 'hike';
      statusLabel = 'Price hike';
    } else if (daysSinceLast > 65 && per === 'mo') {
      statusKind = 'ended';
      statusLabel = 'Ended';
    }

    subscriptions.push({
      id: key,
      merchantKey: key,
      name: latest.merchant,
      category: latest.category || 'Other',
      what: latest.category || 'Other',
      mech: latest.mech || 'Card',
      code: latest.narration || '',
      price: currentPrice,
      per: per === 'yr' ? 'yr' : 'mo',
      was: was,
      status: {
        kind: statusKind,
        label: statusLabel
      },
      evidence,
      history,
      explain: `${latest.merchant} charges ₹${currentPrice} per ${per === 'yr' ? 'year' : 'month'} via ${latest.mech || 'card'}.${was ? ` A price hike of +₹${currentPrice - was} was detected in historical transactions.` : ''}`,
      lastPaymentDate: latest.date
    });
  });

  return subscriptions;
}
