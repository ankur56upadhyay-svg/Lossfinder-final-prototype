const ordinaryPurchase = /\b(?:GROCERY|MARKET|RESTAURANT|CAFE|FOOD|FUEL|PETROL|PHARMACY|RENT|LOAN|EMI|SALARY|TRANSFER)\b/i;
const recurringClue = /\b(?:AUTOPAY|AUTO.?DEBIT|RECURRING|RECUR|MANDATE|SUBSCRIPTION|SUBS|MEMBERSHIP|RENEWAL|PRIME|STANDING\s+INSTRUCTION|NACH|ECS)\b/i;
const subscriptionCategories = new Set(['streaming', 'video streaming', 'music', 'cloud storage', 'fitness', 'software', 'ai tools', 'developer tools']);

export function assessPayment({ name = '', category = '', narrations = [], amounts = [] }) {
  const description = [name, ...narrations].join(' ');
  const ordinary = ordinaryPurchase.test(description) || ['food delivery', 'groceries'].includes(category.toLowerCase());
  const clue = recurringClue.test(description) || narrations.some(value => /\bACH\//i.test(value));
  const categoryMatch = subscriptionCategories.has(category.toLowerCase());
  const values = amounts.filter(value => Number(value) > 0);
  const stable = values.length >= 2 && Math.max(...values) / Math.min(...values) <= 1.15;
  if (ordinary) return { assessment: 'needs_review', assessmentReason: 'Regular purchases or bills can repeat without being subscriptions.' };
  if (clue && values.length >= 2) return { assessment: 'likely', assessmentReason: 'Recurring billing language appears in the statement.' };
  if (categoryMatch && stable && values.length >= 3) return { assessment: 'likely', assessmentReason: 'Recognised service with a stable payment pattern.' };
  return { assessment: 'needs_review', assessmentReason: 'The payment repeats, but the statement does not clearly identify a subscription.' };
}

export function countsAsSubscription(sub) {
  if (sub.classificationDecision === 'subscription') return true;
  if (sub.classificationDecision === 'other_recurring' || sub.classificationDecision === 'not_recurring') return false;
  return sub.assessment !== 'needs_review';
}
