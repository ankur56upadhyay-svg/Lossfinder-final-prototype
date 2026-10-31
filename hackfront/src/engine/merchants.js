/**
 * merchants.js — Merchant pattern matching, category enrichment, and mechanism detection
 */

export const KNOWN_MERCHANTS = [
  { regex: /NETFLIX/i, name: 'Netflix', category: 'Streaming', mech: 'Card', merchantKey: 'netflix' },
  { regex: /SPOTIFY/i, name: 'Spotify Premium', category: 'Music', mech: 'UPI AutoPay', merchantKey: 'spotify' },
  { regex: /HOTSTAR|NOVI.*DIGITAL/i, name: 'Disney+ Hotstar', category: 'Streaming', mech: 'UPI AutoPay', merchantKey: 'disney-hotstar' },
  { regex: /CULTFIT|CULT\.FIT/i, name: 'Cult.fit', category: 'Fitness', mech: 'Bank mandate', merchantKey: 'cult-fit' },
  { regex: /AMAZON.*PRIME/i, name: 'Amazon Prime', category: 'Shopping', mech: 'Card', merchantKey: 'amazon-prime' },
  { regex: /SONYLIV/i, name: 'SonyLIV', category: 'Streaming', mech: 'App store', merchantKey: 'sonyliv' },
  { regex: /FITPRIME|FIT_PRIME/i, name: 'FitPrime Gym', category: 'Fitness', mech: 'Bank mandate', merchantKey: 'fitprime-gym' },
  { regex: /YOUTUBE.*PREM/i, name: 'YouTube Premium', category: 'Streaming', mech: 'Card', merchantKey: 'youtube-premium' },
  { regex: /GOOGLE.*ONE/i, name: 'Google One', category: 'Cloud Storage', mech: 'Card', merchantKey: 'google-one' },
  { regex: /APPLE.*MUSIC/i, name: 'Apple Music', category: 'Music', mech: 'App store', merchantKey: 'apple-music' },
  { regex: /SWIGGY/i, name: 'Swiggy', category: 'Food Delivery', mech: '—', merchantKey: 'swiggy' },
  { regex: /ZOMATO/i, name: 'Zomato', category: 'Food Delivery', mech: '—', merchantKey: 'zomato' },
  { regex: /\bJIO\b|JIO_/i, name: 'Jio', category: 'Telecom', mech: 'UPI AutoPay', merchantKey: 'jio' },
  { regex: /AIRTEL/i, name: 'Airtel', category: 'Telecom', mech: 'UPI AutoPay', merchantKey: 'airtel' },
  { regex: /CHATGPT|OPENAI/i, name: 'ChatGPT Plus', category: 'AI Tools', mech: 'Card', merchantKey: 'chatgpt-plus' },
  { regex: /GITHUB/i, name: 'GitHub Copilot', category: 'Developer Tools', mech: 'Card', merchantKey: 'github-copilot' },
  { regex: /ICLOUD/i, name: 'Apple iCloud', category: 'Cloud Storage', mech: 'App store', merchantKey: 'apple-icloud' }
];

export function cleanMerchantName(raw) {
  if (!raw) return 'Unknown Service';
  let str = String(raw).trim();
  // Strip common bank prefixes and codes
  str = str.replace(/^(CARD|ACH|UPI|POS|NEFT|IMPS|RTGS|DR|CR)[\/\-_:\s]+/i, '');
  str = str.replace(/[\/\-_:\s]+(MUM|BLR|DEL|HYD|CHE|PUN|KOL|MAA|DR|CR|\d+)$/i, '');
  str = str.replace(/[_\/]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Title case
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || raw;
}

export function detectMechanism(narration) {
  const n = (narration || '').toUpperCase();
  if (/UPI|AUTOPAY|VPA/i.test(n)) return 'UPI AutoPay';
  if (/ACH|NACH|ECS|MANDATE|STANDING/i.test(n)) return 'Bank mandate';
  if (/APPLE|ITUNES|GOOGLE PLAY|APPSTORE/i.test(n)) return 'App store';
  return 'Card';
}

export function enrichTransactions(transactions) {
  return transactions.map(tx => {
    const narration = tx.narration || tx.description || '';
    let matched = null;

    for (let i = 0; i < KNOWN_MERCHANTS.length; i++) {
      if (KNOWN_MERCHANTS[i].regex.test(narration)) {
        matched = KNOWN_MERCHANTS[i];
        break;
      }
    }

    if (matched) {
      return {
        ...tx,
        merchant: matched.name,
        merchantKey: matched.merchantKey,
        category: matched.category,
        mech: matched.mech
      };
    }

    const clean = cleanMerchantName(narration);
    return {
      ...tx,
      merchant: clean,
      merchantKey: clean.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: 'Other',
      mech: detectMechanism(narration)
    };
  });
}
