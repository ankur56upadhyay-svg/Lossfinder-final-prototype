/**
 * demoData.js — Built-in sample subscriptions and fallback statement data
 */

export const DEMO_SUBSCRIPTIONS = [
  {
    id: 'netflix',
    merchantKey: 'netflix',
    name: 'Netflix India',
    category: 'Streaming',
    what: 'Standard HD plan',
    code: 'CARD/RECUR/NETFLIX_MUM',
    mech: 'Card',
    price: 649,
    per: 'mo',
    was: 499,
    status: { kind: 'hike', label: 'Price hike' },
    evidence: [
      'Found 12 monthly charges of ₹499 and ₹649.',
      'March: ₹499 → ₹649 (+₹150/mo, +₹1,800/yr).',
      'Charges before March were steady at ₹499 for 6 months consecutively.',
      'Automatic card recurring debit with no re-authorization required.'
    ],
    history: [
      { l: "May '25", a: 499 }, { l: "Jun '25", a: 499 }, { l: "Jul '25", a: 499 },
      { l: "Aug '25", a: 499 }, { l: "Sep '25", a: 499 }, { l: "Oct '25", a: 499 },
      { l: "Nov '25", a: 649 }, { l: "Dec '25", a: 649 }, { l: "Jan '26", a: 649 },
      { l: "Feb '26", a: 649 }, { l: "Mar '26", a: 649 }, { l: "Apr '26", a: 649 }
    ],
    explain: 'Netflix raised its standard monthly tier from ₹499 to ₹649. Your card was charged the higher amount automatically under RBI e-mandate rules without requiring a fresh OTP.'
  },
  {
    id: 'cultfit',
    merchantKey: 'cult-fit',
    name: 'Cult.fit Gym Pass',
    category: 'Fitness',
    what: 'Unlimited gym access',
    code: 'ACH/DR/CULTFIT_HEALTH/BLR',
    mech: 'Bank mandate',
    price: 1850,
    per: 'mo',
    was: null,
    status: { kind: 'unused', label: 'Likely unused' },
    evidence: [
      'Found 8 monthly debits of ₹1,850 via NACH bank mandate.',
      'Last physical gym check-in was 94 days ago.',
      '3 consecutive auto-debits totaling ₹5,550 paid with zero attendance recorded.',
      'Mandate continues active status through bank standing instructions.'
    ],
    history: [
      { l: "Sep '25", a: 1850 }, { l: "Oct '25", a: 1850 }, { l: "Nov '25", a: 1850 },
      { l: "Dec '25", a: 1850 }, { l: "Jan '26", a: 1850 }, { l: "Feb '26", a: 1850 },
      { l: "Mar '26", a: 1850 }, { l: "Apr '26", a: 1850 }
    ],
    explain: 'A monthly fitness subscription paid through an automated bank mandate. Charges continue every month regardless of gym check-in frequency.'
  },
  {
    id: 'spotify',
    merchantKey: 'spotify',
    name: 'Spotify Premium',
    category: 'Music',
    what: 'Individual music plan',
    code: 'UPI/AUTOPAY/SPOTIFY_INDIA',
    mech: 'UPI AutoPay',
    price: 119,
    per: 'mo',
    was: null,
    status: { kind: 'active', label: 'Active' },
    evidence: [
      'Found 12 monthly charges of ₹119 consistently on the 14th of each month.',
      'No unannounced price increases detected.',
      'Active streaming activity verified within the past 4 days.',
      'Authorized via UPI AutoPay recurring standing instruction.'
    ],
    history: [
      { l: "May '25", a: 119 }, { l: "Jun '25", a: 119 }, { l: "Jul '25", a: 119 },
      { l: "Aug '25", a: 119 }, { l: "Sep '25", a: 119 }, { l: "Oct '25", a: 119 },
      { l: "Nov '25", a: 119 }, { l: "Dec '25", a: 119 }, { l: "Jan '26", a: 119 },
      { l: "Feb '26", a: 119 }, { l: "Mar '26", a: 119 }, { l: "Apr '26", a: 119 }
    ],
    explain: 'Consistent monthly music subscription renewing via UPI AutoPay with no rate adjustments.'
  },
  {
    id: 'prime',
    merchantKey: 'amazon-prime',
    name: 'Amazon Prime',
    category: 'Shopping',
    what: 'Annual membership',
    code: 'CARD/RECUR/AMZN_PRIME',
    mech: 'Card',
    price: 1499,
    per: 'yr',
    was: null,
    status: { kind: 'active', label: 'Active' },
    evidence: [
      'Found 2 annual membership renewals at ₹1,499 each exactly 365 days apart.',
      'Annualized rate equivalent to ₹125/month.',
      'Card e-mandate registered with issuing bank.'
    ],
    history: [
      { l: "Apr '25", a: 1499 },
      { l: "Apr '26", a: 1499 }
    ],
    explain: 'Yearly Amazon Prime membership covering delivery, video, and music perks.'
  },
  {
    id: 'hotstar',
    merchantKey: 'disney-hotstar',
    name: 'Disney+ Hotstar',
    category: 'Streaming',
    what: 'Super Annual Tier',
    code: 'UPI/NOVI_DIGITAL/HOTSTAR_REC',
    mech: 'UPI AutoPay',
    price: 899,
    per: 'yr',
    was: 499,
    status: { kind: 'hike', label: 'Price hike' },
    evidence: [
      'Found 2 annual renewals: November 2024 at ₹499 and November 2025 at ₹899.',
      'Annual renewal cost increased by +₹400 (+80%).',
      'Mandate processed through UPI AutoPay mandate.'
    ],
    history: [
      { l: "Nov '24", a: 499 },
      { l: "Nov '25", a: 899 }
    ],
    explain: 'Disney+ Hotstar increased annual plan pricing by ₹400 before renewal. The updated rate was charged automatically against your saved mandate.'
  },
  {
    id: 'sonyliv',
    merchantKey: 'sonyliv',
    name: 'SonyLIV Premium',
    category: 'Streaming',
    what: 'Sports & Live TV',
    code: 'APPLE/SONYLIV/IN_SUB',
    mech: 'App store',
    price: 299,
    per: 'mo',
    was: null,
    status: { kind: 'trial', label: 'Trial converted' },
    evidence: [
      'December: ₹1 micro-authorization trial debit.',
      'January to April: regular ₹299 monthly subscription renewals.',
      'Converted from introductory promotional rate to full recurring plan.'
    ],
    history: [
      { l: "Dec '25", a: 1 },
      { l: "Jan '26", a: 299 },
      { l: "Feb '26", a: 299 },
      { l: "Mar '26", a: 299 },
      { l: "Apr '26", a: 299 }
    ],
    explain: 'Started with an introductory ₹1 promo or trial billed through the app store, and automatically converted to a standard ₹299 recurring charge.'
  }
];

export const SAMPLE_STATEMENT_CSV = `Date,Narration,Withdrawal Amount(INR),Deposit Amount(INR),Balance(INR)
01/05/2025,CARD/RECUR/NETFLIX_MUM/9912,499.00,,45210.00
14/05/2025,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,45091.00
01/06/2025,CARD/RECUR/NETFLIX_MUM/9912,499.00,,44592.00
14/06/2025,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,44473.00
01/07/2025,CARD/RECUR/NETFLIX_MUM/9912,499.00,,43974.00
14/07/2025,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,43855.00
01/08/2025,CARD/RECUR/NETFLIX_MUM/9912,499.00,,43356.00
14/08/2025,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,43237.00
01/09/2025,CARD/RECUR/NETFLIX_MUM/9912,499.00,,42738.00
05/09/2025,ACH/DR/CULTFIT_HEALTH/BLR/4412,1850.00,,40888.00
14/09/2025,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,40769.00
01/10/2025,CARD/RECUR/NETFLIX_MUM/9912,499.00,,40270.00
05/10/2025,ACH/DR/CULTFIT_HEALTH/BLR/4412,1850.00,,38420.00
14/10/2025,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,38301.00
01/11/2025,CARD/RECUR/NETFLIX_MUM/9912,649.00,,37652.00
05/11/2025,ACH/DR/CULTFIT_HEALTH/BLR/4412,1850.00,,35802.00
14/11/2025,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,35683.00
20/11/2025,UPI/NOVI_DIGITAL/HOTSTAR_REC,899.00,,34784.00
01/12/2025,CARD/RECUR/NETFLIX_MUM/9912,649.00,,34135.00
05/12/2025,ACH/DR/CULTFIT_HEALTH/BLR/4412,1850.00,,32285.00
14/12/2025,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,32166.00
15/12/2025,APPLE/SONYLIV/IN_SUB,1.00,,32165.00
01/01/2026,CARD/RECUR/NETFLIX_MUM/9912,649.00,,31516.00
05/01/2026,ACH/DR/CULTFIT_HEALTH/BLR/4412,1850.00,,29666.00
14/01/2026,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,29547.00
15/01/2026,APPLE/SONYLIV/IN_SUB,299.00,,29248.00
01/02/2026,CARD/RECUR/NETFLIX_MUM/9912,649.00,,28599.00
05/02/2026,ACH/DR/CULTFIT_HEALTH/BLR/4412,1850.00,,26749.00
14/02/2026,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,26630.00
15/02/2026,APPLE/SONYLIV/IN_SUB,299.00,,26331.00
01/03/2026,CARD/RECUR/NETFLIX_MUM/9912,649.00,,25682.00
05/03/2026,ACH/DR/CULTFIT_HEALTH/BLR/4412,1850.00,,23832.00
14/03/2026,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,23713.00
15/03/2026,APPLE/SONYLIV/IN_SUB,299.00,,23414.00
01/04/2026,CARD/RECUR/NETFLIX_MUM/9912,649.00,,22765.00
05/04/2026,ACH/DR/CULTFIT_HEALTH/BLR/4412,1850.00,,20915.00
14/04/2026,UPI/AUTOPAY/SPOTIFY_INDIA/8811,119.00,,20796.00
15/04/2026,APPLE/SONYLIV/IN_SUB,299.00,,20497.00
25/04/2026,CARD/RECUR/AMZN_PRIME,1499.00,,18998.00`;

export const SAMPLE_USAGE_CSV = `Date,Service,Activity
05/09/2025,Cult.fit,Gym check-in
12/09/2025,Cult.fit,Gym check-in
28/09/2025,Cult.fit,Gym check-in
15/04/2026,Spotify,Streamed 25 tracks
20/04/2026,Netflix,Streamed 2 episodes`;
