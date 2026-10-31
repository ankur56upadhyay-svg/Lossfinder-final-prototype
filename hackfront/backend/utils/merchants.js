const MERCHANTS = [
  { m: ['NETFLIX'], id: 'netflix', name: 'Netflix India', what: 'Video streaming plan', category: 'Video streaming' },
  { m: ['SPOTIFY*FAMILY'], id: 'spotify-family', name: 'Spotify Family', what: 'Family music plan', category: 'Music' },
  { m: ['SPOTIFY'], id: 'spotify', name: 'Spotify', what: 'Music streaming', category: 'Music' },
  { m: ['PDFPRO', 'PDF PRO'], id: 'pdfpro', name: 'PDF Pro Editor', what: 'PDF editing software', category: 'Software' },
  { m: ['CLOUDSYNC'], id: 'cloudsync', name: 'CloudSync Storage', what: 'Cloud storage plan', category: 'Software' },
  { m: ['XYZ INS'], id: 'xyz-insurance', name: 'XYZ Insurance', what: 'Insurance premium', category: 'Insurance' },
  { m: ['NAMECHEAP'], id: 'namecheap', name: 'Namecheap', what: 'Domain name renewal', category: 'Software' },
  { m: ['YOUTUBE'], id: 'youtube', name: 'YouTube Premium', what: 'Ad-free video', category: 'Video streaming', mech: 'App store' },
  { m: ['FITNESS APP'], id: 'fitness-app-pro', name: 'Fitness App Pro', what: 'Fitness app plan', category: 'Fitness' },
  { m: ['APPSTORE*MINIAPP'], id: 'miniapp', name: 'Mini App', what: 'In-app subscription', category: 'Apps', mech: 'App store' },
  { m: ['AMAZON'], id: 'amazon', name: 'Amazon India', what: 'Online shopping', category: 'Shopping' },
  { m: ['HOTSTAR'], id: 'hotstar', name: 'Disney+ Hotstar', what: 'Super annual plan', category: 'Video streaming' },
  { m: ['SONYLIV'], id: 'sonyliv', name: 'Sony LIV Premium', what: 'Sports and live TV', category: 'Video streaming', mech: 'App store' },
  { m: ['CULTFIT', 'CULT.FIT'], id: 'cultfit', name: 'Cult.fit Gym Pass', what: 'Gym membership', category: 'Fitness', mech: 'Bank mandate' },
];

const NOISE_WORDS = new Set(['CARD', 'RECUR', 'ACH', 'DR', 'UPI', 'REC', 'SUBS', 'PVT', 'LTD', 'INDIA', 'COM', 'MUM', 'BLR', 'DEL']);

function findMerchant(text = '') {
  const t = text.toUpperCase();
  let best = null;
  let len = 0;

  for (const r of MERCHANTS) {
    for (const k of r.m) {
      if (t.includes(k) && k.length > len) {
        best = r;
        len = k.length;
      }
    }
  }

  if (best) {
    return {
      merchantKey: best.id,
      canonicalName: best.name,
      what: best.what,
      category: best.category,
      mech: best.mech || null
    };
  }

  // Unknown merchant
  const words = t.replace(/[^A-Z ]+/g, ' ').split(/\s+/).filter(w => w && !NOISE_WORDS.has(w));
  const name = words.map(w => w[0] + w.slice(1).toLowerCase()).join(' ') || 'Unknown Merchant';
  const key = (words.join('-').toLowerCase() || 'unknown').slice(0, 30);

  return {
    merchantKey: key,
    canonicalName: name,
    what: 'Unrecognised merchant',
    category: 'Other',
    mech: null
  };
}

function determineMechanism(row, merchantMech) {
  const BY = {
    UPI_AUTOPAY: 'UPI AutoPay',
    CARD_RECURRING: 'Card',
    E_MANDATE: 'Bank mandate',
  };

  if (merchantMech) return merchantMech;
  if (row.method && BY[row.method]) return BY[row.method];

  const t = (row.narration || row.description || '').toUpperCase();
  if (t.startsWith('ACH/')) return 'Bank mandate';
  if (t.startsWith('UPI/')) return 'UPI AutoPay';
  if (/^(APPLE|GOOGLE|APPSTORE)/.test(t)) return 'App store';
  return 'Card';
}

module.exports = {
  MERCHANTS,
  findMerchant,
  determineMechanism
};
