const subscriptionRepository = require('../repositories/subscriptionRepository');
const transactionRepository = require('../repositories/transactionRepository');

function perYear(s) {
  return s.price * (s.per === 'mo' ? 12 : 1);
}

const analyticsService = {
  async getSummary(userId) {
    const subs = await subscriptionRepository.getSubscriptionsByUser(userId);

    // Filter out cancelled subscriptions for active spending calculations
    const liveSubs = subs.filter(s => s.status.kind !== 'cancelled' && s.status.kind !== 'ignored');

    let yearly = 0;
    let hikeExtra = 0;
    let hikeCount = 0;
    let unusedYearly = 0;
    let unusedCount = 0;
    let activeCount = 0;
    let endedCount = 0;
    let cancelledCount = 0;

    subs.forEach(s => {
      const y = perYear(s);
      if (s.status.kind === 'cancelled') {
        cancelledCount++;
      } else if (s.status.kind === 'ended') {
        endedCount++;
      } else {
        yearly += y;
        activeCount++;
        if (s.status.kind === 'unused') {
          unusedYearly += y;
          unusedCount++;
        }
      }

      if (s.was && s.price > s.was && s.status.kind !== 'cancelled') {
        hikeExtra += (s.price - s.was) * (s.per === 'mo' ? 12 : 1);
        hikeCount++;
      }
    });

    return {
      yearly,
      monthly: Math.round(yearly / 12),
      hikeExtra,
      hikeCount,
      unusedYearly,
      unusedCount,
      activeCount,
      endedCount,
      cancelledCount,
      totalCount: subs.length,
    };
  },

  async getCategories(userId) {
    const subs = await subscriptionRepository.getSubscriptionsByUser(userId);
    const liveSubs = subs.filter(s => s.status.kind !== 'cancelled' && s.status.kind !== 'ignored' && s.status.kind !== 'ended');

    const totalYearly = liveSubs.reduce((acc, s) => acc + perYear(s), 0);
    const catMap = {};

    liveSubs.forEach(s => {
      const cat = s.category || 'Other';
      const cost = perYear(s);
      if (!catMap[cat]) {
        catMap[cat] = {
          name: cat,
          yearlyTotal: 0,
          monthlyTotal: 0,
          count: 0,
          merchants: []
        };
      }
      catMap[cat].yearlyTotal += cost;
      catMap[cat].count++;
      catMap[cat].merchants.push(s.name);
    });

    const categories = Object.values(catMap).map(c => ({
      ...c,
      monthlyTotal: Math.round(c.yearlyTotal / 12),
      percentage: totalYearly > 0 ? Number(((c.yearlyTotal / totalYearly) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.yearlyTotal - a.yearlyTotal);

    return {
      totalYearly,
      categories
    };
  },

  async getMechanisms(userId) {
    const subs = await subscriptionRepository.getSubscriptionsByUser(userId);
    const liveSubs = subs.filter(s => s.status.kind !== 'cancelled' && s.status.kind !== 'ignored' && s.status.kind !== 'ended');

    const mechMap = {
      'Bank mandate': 0,
      'Card': 0,
      'App store': 0,
      'UPI AutoPay': 0
    };

    liveSubs.forEach(s => {
      const m = s.mech || 'Card';
      mechMap[m] = (mechMap[m] || 0) + perYear(s);
    });

    return mechMap;
  },

  async getSavings(userId) {
    const subs = await subscriptionRepository.getSubscriptionsByUser(userId);

    const unused = subs.filter(s => s.status.kind === 'unused');
    const cancelled = subs.filter(s => s.status.kind === 'cancelled');

    const potentialSavingsYearly = unused.reduce((sum, s) => sum + perYear(s), 0);
    const realizedSavingsYearly = cancelled.reduce((sum, s) => sum + perYear(s), 0);

    return {
      potentialSavingsYearly,
      realizedSavingsYearly,
      unusedSubscriptions: unused,
      cancelledSubscriptions: cancelled
    };
  },

  async getUpcoming(userId) {
    const subs = await subscriptionRepository.getSubscriptionsByUser(userId);
    const liveSubs = subs.filter(s => s.status.kind !== 'cancelled' && s.status.kind !== 'ignored' && s.status.kind !== 'ended');

    const upcoming = liveSubs
      .filter(s => s.nextExpectedDate)
      .map(s => ({
        id: s.id,
        name: s.name,
        expectedDate: s.nextExpectedDate,
        amount: s.price,
        per: s.per,
        mech: s.mech,
        confidence: s.confidence
      }))
      .sort((a, b) => (a.expectedDate < b.expectedDate ? -1 : 1));

    return upcoming;
  },

  async getMonthlyBreakdown(userId) {
    const txs = await transactionRepository.getAllDebitTransactionsByUser(userId);
    const byMonth = {};

    txs.forEach(t => {
      if (t.debit > 0 && t.date) {
        const monthKey = t.date.slice(0, 7); // YYYY-MM
        byMonth[monthKey] = (byMonth[monthKey] || 0) + t.debit;
      }
    });

    const months = Object.keys(byMonth).sort().map(m => ({
      month: m,
      totalDebit: byMonth[m]
    }));

    return months;
  }
};

module.exports = analyticsService;
