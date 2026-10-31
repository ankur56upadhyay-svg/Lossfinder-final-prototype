const transactionRepository = require('../repositories/transactionRepository');
const usageRepository = require('../repositories/usageRepository');
const subscriptionRepository = require('../repositories/subscriptionRepository');
const { findMerchant, determineMechanism } = require('../utils/merchants');
const logger = require('../utils/logger');

const DAY = 86400000;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayNum(iso) {
  return Math.round(Date.parse(iso + 'T00:00:00Z') / DAY);
}

function fmtDay(iso) {
  return parseInt(iso.slice(8), 10) + ' ' + MON[+iso.slice(5, 7) - 1];
}

function fmtMonth(y, m) {
  return MON[m - 1] + ' ' + y;
}

function inr(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function eachMonth(first, last, fn) {
  let y = +first.slice(0, 4);
  let m = +first.slice(5, 7);
  while (true) {
    const key = y + '-' + ('0' + m).slice(-2);
    if (key > last.slice(0, 7)) break;
    fn(key, y, m);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
}

function collapseCharges(charges) {
  const kept = [];
  const dup = [];
  charges.forEach(c => {
    const prev = kept[kept.length - 1];
    if (prev && dayNum(c.date) - dayNum(prev.date) <= 7) {
      dup.push(c);
    } else {
      kept.push(c);
    }
  });
  return { kept, dup };
}

function detectCadence(kept) {
  const d = kept.map(c => dayNum(c.date));
  const gaps = [];
  for (let i = 1; i < d.length; i++) {
    gaps.push(d[i] - d[i - 1]);
  }

  // [name, days, min charges, tolerance]
  const intervals = [
    ['mo', 30.4, 3, 6],
    ['qtr', 91.3, 3, 12],
    ['yr', 365, 2, 20]
  ];

  for (const t of intervals) {
    const near = gaps.every(g => {
      const k = Math.round(g / t[1]);
      return k >= 1 && k <= 3 && Math.abs(g - k * t[1]) <= t[3];
    });
    const exactlyOne = gaps.some(g => Math.round(g / t[1]) === 1);
    if (kept.length >= t[2] && near && exactlyOne) {
      return t[0];
    }
  }
  return null;
}

function findHike(kept) {
  const amounts = kept.map(c => c.debit);
  const n = amounts.length;
  const last = amounts[n - 1];
  let r = 1;
  let q = 1;

  while (r < n && amounts[n - 1 - r] === last) r++;
  if (r === n) return null;

  const was = amounts[n - 1 - r];
  for (let i = n - 2 - r; i >= 0 && amounts[i] === was; i--) q++;

  if (last > was && (r >= 2 || q >= 3)) {
    return { was, last, at: kept[n - r] };
  }
  return null;
}

function isVariable(kept) {
  const amounts = kept.map(c => c.debit);
  const lo = Math.min(...amounts);
  const hi = Math.max(...amounts);
  const distinct = new Set(amounts).size;
  return distinct >= 3 && hi / lo >= 1.05;
}

function findTrial(context, kept) {
  const auth = context.find(c => c.status === 'AUTHORIZATION' || (c.debit === 0 && c.credit === 0));
  if (auth && auth.date < kept[0].date) {
    return { start: auth.date, trial: 0, price: kept[0].debit, tiny: false };
  }
  if (kept.length >= 2 && kept[0].debit <= 10 && kept[1].debit >= kept[0].debit * 10) {
    return { start: kept[0].date, trial: kept[0].debit, price: kept[1].debit, tiny: true };
  }
  return null;
}

function isEnded(lastISO, refISO, per) {
  const graceDays = { mo: 65, qtr: 200, yr: 400 }[per];
  return dayNum(refISO) - dayNum(lastISO) > graceDays;
}

function calculateMissingMonths(kept) {
  const have = new Set();
  const missing = [];
  kept.forEach(c => have.add(c.date.slice(0, 7)));
  eachMonth(kept[0].date, kept[kept.length - 1].date, (k, y, m) => {
    if (!have.has(k)) missing.push(fmtMonth(y, m));
  });
  return missing;
}

function buildHistory(kept, per) {
  if (per !== 'mo') {
    const sliceCount = per === 'yr' ? -2 : -4;
    return kept.slice(sliceCount).map(c => ({
      l: per === 'yr' ? c.date.slice(0, 4) : MON[+c.date.slice(5, 7) - 1],
      a: c.debit
    }));
  }
  const byMonth = {};
  kept.forEach(c => { byMonth[c.date.slice(0, 7)] = c.debit; });
  const out = [];
  eachMonth(kept[0].date, kept[kept.length - 1].date, (k, y, m) => {
    out.push({ l: MON[m - 1], a: byMonth[k] || 0 });
  });
  return out.slice(-12);
}

const subscriptionDetectionService = {
  async analyzeForUser(userId) {
    logger.info('Starting subscription detection for user', { userId });

    const rawRows = await transactionRepository.getAllDebitTransactionsByUser(userId);
    if (!rawRows || !rawRows.length) {
      logger.info('No transactions found for user', { userId });
      return [];
    }

    const usageEvents = await usageRepository.getUsageEventsByUser(userId);
    const usageByMerchant = {};
    for (const ue of usageEvents) {
      if (!usageByMerchant[ue.merchantKey]) {
        usageByMerchant[ue.merchantKey] = [];
      }
      usageByMerchant[ue.merchantKey].push(ue);
    }

    // Reference statement date (max transaction date)
    const refISO = rawRows.reduce((max, r) => (r.date > max ? r.date : max), '0000-00-00');

    // Group rows by merchant
    const seen = new Set();
    const groups = {};

    for (const r of rawRows) {
      const key = r.ref ? `${r.ref}|${r.date}|${r.debit}` : '';
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);

      const merchant = findMerchant(r.narration);
      const mKey = merchant.merchantKey;

      if (!groups[mKey]) {
        groups[mKey] = {
          merchant,
          charges: [],
          context: []
        };
      }

      if (r.status === 'DEBIT' && r.debit > 0) {
        groups[mKey].charges.push(r);
      } else {
        groups[mKey].context.push(r);
      }
    }

    const detectedSubs = [];

    for (const mKey of Object.keys(groups)) {
      const g = groups[mKey];
      g.charges.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

      const { kept, dup } = collapseCharges(g.charges);
      const dupDates = dup.map(c => fmtDay(c.date));

      const trial = kept.length ? findTrial(g.context, kept) : null;
      let effectiveKept = kept;
      if (trial && trial.tiny) {
        effectiveKept = kept.slice(1);
      }

      if (effectiveKept.length < 2) continue;

      const per = detectCadence(effectiveKept);
      const amounts = effectiveKept.map(c => c.debit);
      const lo = Math.min(...amounts);
      const hi = Math.max(...amounts);

      // Decoys and edge cases exclusion
      if (g.charges.every(c => c.method === 'UPI')) continue; // manual UPI
      if (hi / lo > 1.6) continue; // amounts too different
      if (!per) continue; // no cadence

      const last = effectiveKept[effectiveKept.length - 1];
      const hike = findHike(effectiveKept);
      const varies = !hike && isVariable(effectiveKept);
      const ended = isEnded(last.date, refISO, per);
      const mult = per === 'qtr' ? 4 : 1;
      const times = per === 'mo' ? 12 : per === 'qtr' ? 4 : 1;

      const recent = amounts.slice(-12);
      const price = varies
        ? Math.round(recent.reduce((s, x) => s + x, 0) / recent.length)
        : last.debit;

      const mech = determineMechanism(last, g.merchant.mech);
      const pct = hike ? Math.round(((hike.last - hike.was) / hike.was) * 100) : 0;
      const cycle = per === 'mo' ? 'every month' : per === 'qtr' ? 'every 3 months' : 'once a year';

      // Usage checks
      const merchantUsage = usageByMerchant[mKey] || [];
      let isUnused = false;
      let lastUsageDays = null;
      if (merchantUsage.length > 0) {
        merchantUsage.sort((a, b) => (a.eventDate > b.eventDate ? -1 : 1));
        const lastUsage = merchantUsage[0];
        lastUsageDays = dayNum(refISO) - dayNum(lastUsage.eventDate);
        if (lastUsageDays >= 60 && !ended) {
          isUnused = true;
        }
      }

      let status;
      if (ended) {
        status = { kind: 'ended', label: `Ended (last charge ${fmtDay(last.date)})` };
      } else if (isUnused) {
        status = { kind: 'unused', label: `Possibly unused (last active ${lastUsageDays} days ago)` };
      } else if (trial) {
        status = { kind: 'trial', label: `Trial converted (${inr(trial.trial)} trial, then ${inr(trial.price)})` };
      } else if (hike) {
        status = { kind: 'hike', label: `Price hike +${pct}%` };
      } else {
        status = { kind: 'active', label: varies ? `Active · varies ${inr(lo)}–${inr(hi)}` : 'Active' };
      }

      // Evidence assembly
      const ev = [];
      const missing = per === 'mo' ? calculateMissingMonths(effectiveKept) : [];

      if (ended) {
        ev.push(`Last charge was ${fmtDay(last.date)} ${last.date.slice(0, 4)}. Nothing charged since.`);
      } else if (isUnused) {
        ev.push(`Last recorded usage was ${lastUsageDays} days ago.`);
        ev.push(`Charges continued regularly (${inr(price)} ${cycle}) despite inactivity.`);
      } else if (trial) {
        ev.push(`${fmtDay(trial.start)}: trial started (${inr(trial.trial)})`);
        ev.push(`Paid plan from ${fmtDay(effectiveKept[0].date)}: ${inr(trial.price)} ${cycle}.`);
      } else if (hike) {
        ev.push(`${fmtDay(hike.at.date)}: ${inr(hike.was)} → ${inr(hike.last)} (+${inr(hike.last - hike.was)} per charge, +${inr((hike.last - hike.was) * times)}/yr)`);
      } else if (varies) {
        ev.push(`Amounts ranged ${inr(lo)}–${inr(hi)}; no lasting price change.`);
      } else if (per === 'qtr') {
        ev.push(`Billed ${inr(last.debit)} every 3 months.`);
      } else {
        ev.push(`Charged ${cycle} at ${inr(last.debit)}. No price change.`);
      }

      if (missing.length) {
        ev.push(`No charge in: ${missing.join(', ')}.`);
      }
      if (dupDates.length) {
        ev.push(`Two charges within a week on: ${dupDates.join(', ')} (possible double charge).`);
      }
      if (merchantUsage.length === 0) {
        ev.push('No usage data logged for this service.');
      }

      g.context.forEach(c => {
        if (c.status === 'REFUND') ev.push(`Refund of ${inr(c.credit)} on ${fmtDay(c.date)}.`);
        if (c.status === 'FAILED') ev.push(`Failed charge attempt on ${fmtDay(c.date)}.`);
      });

      const explain = `${g.merchant.what} charged ${cycle} through ${mech}.` +
        (hike ? ' The price went up and keeps renewing automatically unless you cancel.' : '') +
        (trial ? ' A free or ₹0 trial turned into a paid plan.' : '') +
        (isUnused ? ' No recent activity detected while recurring charges persist.' : '') +
        (ended ? ' It looks like this has stopped.' : '');

      let confidence = 1.0;
      if (missing.length > 0) confidence -= 0.1;
      if (varies) confidence -= 0.05;
      confidence = Math.max(0.6, confidence);

      // Estimate next expected date if active
      let nextExpectedDate = null;
      if (!ended) {
        const lastDateObj = new Date(last.date);
        if (per === 'mo') {
          lastDateObj.setMonth(lastDateObj.getMonth() + 1);
        } else if (per === 'qtr') {
          lastDateObj.setMonth(lastDateObj.getMonth() + 3);
        } else if (per === 'yr') {
          lastDateObj.setFullYear(lastDateObj.getFullYear() + 1);
        }
        nextExpectedDate = lastDateObj.toISOString().slice(0, 10);
      }

      const subRecord = {
        subscriptionId: `${userId}_${mKey}`,
        merchantKey: mKey,
        name: g.merchant.canonicalName,
        what: g.merchant.what,
        code: last.narration,
        mech: mech,
        category: g.merchant.category,
        price: price * mult,
        per: per === 'mo' ? 'mo' : 'yr',
        was: hike && status.kind === 'hike' ? hike.was * mult : undefined,
        status: status,
        confidence: confidence,
        lastPaymentDate: last.date,
        nextExpectedDate: nextExpectedDate,
        history: buildHistory(effectiveKept, per),
        evidence: ev.slice(0, 4),
        explain: explain
      };

      detectedSubs.push(subRecord);
    }

    // Persist results to Neo4j
    await subscriptionRepository.saveSubscriptions(userId, detectedSubs);
    logger.info(`Detected and persisted ${detectedSubs.length} subscriptions for user`, { userId });

    return detectedSubs;
  }
};

module.exports = subscriptionDetectionService;
