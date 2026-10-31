import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

// ─── helpers ──────────────────────────────────────────────────────────────────

const MECH_CONFIG = {
  'Card':        { icon: 'credit_card',      color: '#0B5FD8' },
  'UPI AutoPay': { icon: 'smartphone',       color: '#10B981' },
  'Bank mandate':{ icon: 'account_balance',  color: '#8B5CF6' },
  'App store':   { icon: 'apps',             color: '#F59E0B' },
  'Other':       { icon: 'payments',         color: '#6B7280' },
};

function getMechConfig(mech) {
  if (!mech) return MECH_CONFIG.Other;
  for (const key of Object.keys(MECH_CONFIG)) {
    if (mech.toLowerCase().includes(key.toLowerCase())) return MECH_CONFIG[key];
  }
  return MECH_CONFIG.Other;
}

function fmt(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function getAnnualSpend(sub) {
  if (sub.status?.kind === 'ended') return 0;
  return sub.per === 'yr' ? sub.price : sub.price * 12;
}

function getAdjusted(sub, mode) {
  const a = getAnnualSpend(sub);
  return mode === 'monthly' ? Math.round(a / 12) : a;
}

function computeTotals(subs, mode) {
  let totalSpend = 0, activeCount = 0;
  for (const s of subs) {
    if (s.status?.kind !== 'ended') {
      activeCount++;
      totalSpend += getAdjusted(s, mode);
    }
  }
  return { totalSpend, activeCount, avgSpend: activeCount > 0 ? Math.round(totalSpend / activeCount) : 0 };
}

function groupByCategory(subs, mode) {
  const map = {};
  for (const s of subs) {
    const cat = s.category || s.what || 'Other';
    if (!map[cat]) map[cat] = { name: cat, total: 0, count: 0, names: [] };
    map[cat].names.push(s.name);
    if (s.status?.kind !== 'ended') {
      map[cat].count++;
      map[cat].total += getAdjusted(s, mode);
    }
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function groupByMechanism(subs, mode, totalSpend) {
  const map = {};
  for (const s of subs) {
    const mech = s.mech || 'Card';
    if (!map[mech]) map[mech] = { name: mech, total: 0, count: 0 };
    if (s.status?.kind !== 'ended') {
      map[mech].count++;
      map[mech].total += getAdjusted(s, mode);
    }
  }
  return Object.values(map)
    .map(m => ({ ...m, pct: totalSpend > 0 ? Math.round((m.total / totalSpend) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

function getHikesData(subs, mode) {
  const list = [];
  let totalExtraAnnual = 0;
  for (const s of subs) {
    const isHike = (s.status?.kind === 'hike') || (s.was && s.was < s.price);
    if (isHike && s.was) {
      const diff = s.price - s.was;
      const diffAnnual = s.per === 'yr' ? diff : diff * 12;
      totalExtraAnnual += diffAnnual;
      const pct = s.was > 0 ? Math.round((diff / s.was) * 100) : 0;
      const displayDiff = mode === 'monthly' && s.per !== 'yr' ? diff : (mode === 'yearly' ? diffAnnual : diff);
      list.push({ sub: s, oldPrice: s.was, newPrice: s.price, diff: displayDiff, diffAnnual, pct });
    }
  }
  const displayTotalExtra = mode === 'monthly' ? Math.round(totalExtraAnnual / 12) : totalExtraAnnual;
  return { list, totalExtra: displayTotalExtra, totalExtraAnnual };
}

function getSavingsOpportunities(subs, mode) {
  const opps = [];
  for (const s of subs) {
    const kind = s.status?.kind || 'unknown';
    const spend = getAdjusted(s, mode);
    if (kind === 'unknown') {
      opps.push({ sub: s, tag: 'Unknown Usage', tagClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', desc: 'No usage records uploaded. Upload a usage CSV to check if you are actively using this membership.', spend, action: 'detail' });
    } else if (kind === 'trial') {
      opps.push({ sub: s, tag: 'Trial Conversion', tagClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', desc: 'Converted from an introductory trial to full monthly billing. Re-evaluate if still needed.', spend, action: 'guide' });
    } else if (kind === 'ended') {
      opps.push({ sub: s, tag: 'Ended Service', tagClass: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300', desc: 'No charges found in 4+ months. Verify your account to ensure no unexpected residual mandates trigger.', spend: 0, action: 'detail' });
    } else if (kind === 'hike') {
      opps.push({ sub: s, tag: 'Price Hike', tagClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', desc: 'Price recently increased. Consider downgrading your tier or exploring competitive alternative services.', spend, action: 'guide' });
    }
  }
  return opps;
}

// ─── Mini canvas bar chart ─────────────────────────────────────────────────────

function CategoryChart({ categories, theme }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !categories.length) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const isDark = document.documentElement.classList.contains('dark');
    const barColor = isDark ? '#4D9AFF' : '#0B5FD8';
    const textColor = isDark ? '#8899AA' : '#5A6B80';
    const gridColor = isDark ? '#2A3040' : '#E2E5EA';

    const pad = { top: 12, bottom: 40, left: 12, right: 12 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const count = Math.min(categories.length, 7);
    const maxVal = Math.max(...categories.slice(0, count).map(c => c.total), 1);

    ctx.clearRect(0, 0, W, H);

    // grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = pad.top + (chartH / 3) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }

    const barW = Math.max(10, (chartW / count) * 0.6);
    const gap = chartW / count;

    for (let i = 0; i < count; i++) {
      const cat = categories[i];
      const barH = Math.max(4, (cat.total / maxVal) * chartH);
      const x = pad.left + gap * i + (gap - barW) / 2;
      const y = pad.top + chartH - barH;

      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]) : ctx.rect(x, y, barW, barH);
      ctx.fill();

      // label
      ctx.fillStyle = textColor;
      ctx.font = `500 ${Math.min(11, gap * 0.4)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      const label = cat.name.length > 9 ? cat.name.slice(0, 8) + '…' : cat.name;
      ctx.fillText(label, x + barW / 2, pad.top + chartH + 16);
    }
  }, [categories, theme]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '220px', display: 'block' }} />;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AnnualView() {
  const { subscriptions, isDemo, bankName, navigateTo, theme } = useApp();
  const [mode, setMode] = useState('yearly');

  const periodLabel = mode === 'yearly' ? 'year' : 'month';
  const periodShort  = mode === 'yearly' ? '/yr'  : '/mo';

  const totals     = computeTotals(subscriptions, mode);
  const categories = groupByCategory(subscriptions, mode);
  const mechanisms = groupByMechanism(subscriptions, mode, totals.totalSpend);
  const hikesData  = getHikesData(subscriptions, mode);
  const savingsOpps = getSavingsOpportunities(subscriptions, mode);

  if (!subscriptions.length) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="af-card flex flex-col items-center justify-center text-center py-16 px-6 shadow-sm">
          <span className="material-symbols-outlined text-5xl text-[#5A6B80] dark:text-[#8899AA] mb-4">bar_chart</span>
          <h3 className="text-xl font-bold text-[#0B1F3A] dark:text-[#E8ECF1] mb-2">No data to analyse</h3>
          <p className="text-sm text-[#5A6B80] dark:text-[#8899AA] mb-6 max-w-md">
            Upload a bank statement or load sample data to see your spending analytics.
          </p>
          <button type="button" onClick={() => navigateTo('upload')} className="af-btn af-btn-primary">
            <span className="material-symbols-outlined text-lg">upload_file</span>
            <span>Upload Statement</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Header + toggle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#E8ECF1]">
              Spending Analytics
            </h1>
            {isDemo && (
              <span className="af-demo-chip">
                <span className="material-symbols-outlined text-xs">science</span> Demo
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#5A6B80] dark:text-[#8899AA] mt-0.5">
            Annual and monthly projections based on detected recurring auto-debits.
          </p>
        </div>

        {/* Yearly / Monthly pill toggle */}
        <div className="inline-flex items-center p-1 rounded-full bg-[#E2E5EA]/70 dark:bg-[#2A3040] border border-[#E2E5EA] dark:border-[#2A3040] self-start sm:self-auto">
          {['yearly', 'monthly'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                mode === m
                  ? 'bg-[#0B1F3A] text-white dark:bg-[#E8ECF1] dark:text-[#0B1F3A] shadow-sm'
                  : 'text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1]'
              }`}
            >
              {m === 'yearly' ? 'Yearly Total' : 'Monthly Average'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview 3-metric cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="af-card p-5 shadow-sm border-l-4 border-l-blue-600 dark:border-l-blue-400">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#5A6B80] dark:text-[#8899AA] mb-1">Total Projected Spend</div>
          <div className="text-3xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#E8ECF1]">{fmt(totals.totalSpend)}</div>
          <div className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">Projected per {periodLabel} across all active mandates</div>
        </div>
        <div className="af-card p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#5A6B80] dark:text-[#8899AA] mb-1">Active Subscriptions</div>
          <div className="text-3xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#E8ECF1]">{totals.activeCount}</div>
          <div className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">Recurring services currently charging your accounts</div>
        </div>
        <div className="af-card p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#5A6B80] dark:text-[#8899AA] mb-1">Average Spend</div>
          <div className="text-3xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#E8ECF1]">{fmt(totals.avgSpend)}</div>
          <div className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">Average cost per active subscription / {periodLabel}</div>
        </div>
      </div>

      {/* ── Category chart + breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Chart */}
        <div className="af-card shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">bar_chart</span>
              Spend by Category
            </h2>
            <span className="text-xs text-[#5A6B80] dark:text-[#8899AA]">{mode === 'yearly' ? '₹ / year' : '₹ / month'}</span>
          </div>
          {categories.length > 0
            ? <CategoryChart categories={categories} theme={theme} />
            : <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] italic text-center py-8">No category data.</p>
          }
        </div>

        {/* Breakdown list */}
        <div className="af-card shadow-sm">
          <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">category</span>
            Category Breakdown
          </h2>
          {categories.length === 0
            ? <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] italic">No category data.</p>
            : (
              <div className="space-y-4">
                {categories.map(cat => {
                  const pctOfMax  = Math.round((cat.total / (categories[0].total || 1)) * 100);
                  const pctOfTotal = totals.totalSpend > 0 ? Math.round((cat.total / totals.totalSpend) * 100) : 0;
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div>
                          <span className="font-semibold text-[#0B1F3A] dark:text-[#E8ECF1]">{cat.name}</span>
                          <span className="text-xs text-[#5A6B80] dark:text-[#8899AA] ml-2">({cat.count} sub{cat.count === 1 ? '' : 's'})</span>
                        </div>
                        <div className="font-mono font-semibold text-[#0B1F3A] dark:text-[#E8ECF1]">
                          {fmt(cat.total)}
                          <span className="text-xs font-normal text-[#5A6B80] dark:text-[#8899AA] ml-1.5">({pctOfTotal}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E2E5EA]/80 dark:bg-[#2A3040] overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${pctOfMax}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-[#5A6B80] dark:text-[#8899AA] truncate">
                        {cat.names.join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* ── Payment method split ── */}
      <div className="af-card mb-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">account_balance_wallet</span>
          Payment Method Split
        </h2>
        {mechanisms.length === 0
          ? <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] italic">No payment mechanism records.</p>
          : (
            <div>
              {/* Stacked bar */}
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#E2E5EA] dark:bg-[#2A3040] mb-4">
                {mechanisms.filter(m => m.pct > 0).map(m => (
                  <div
                    key={m.name}
                    title={`${m.name}: ${m.pct}%`}
                    style={{ width: `${m.pct}%`, backgroundColor: getMechConfig(m.name).color }}
                    className="h-full transition-all duration-300"
                  />
                ))}
              </div>
              {/* Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {mechanisms.map(m => {
                  const cfg = getMechConfig(m.name);
                  return (
                    <div key={m.name} className="flex items-center justify-between p-3 rounded-lg bg-[#F5F6F8] dark:bg-[#0F1419] border border-[#E2E5EA] dark:border-[#2A3040]">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                        <span className="material-symbols-outlined text-base text-[#5A6B80] dark:text-[#8899AA]">{cfg.icon}</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[#0B1F3A] dark:text-[#E8ECF1]">{m.name}</div>
                          <div className="text-[11px] text-[#5A6B80] dark:text-[#8899AA]">{m.count} active service{m.count === 1 ? '' : 's'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs sm:text-sm font-semibold text-[#0B1F3A] dark:text-[#E8ECF1]">{fmt(m.total)}</div>
                        <div className="text-[11px] text-[#5A6B80] dark:text-[#8899AA]">{m.pct}% of total</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        }
      </div>

      {/* ── Price Hike impact ── */}
      <div className="af-card mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-red-600 dark:text-red-400">trending_up</span>
            Price Hike Impact
          </h2>
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">{hikesData.list.length} detected</span>
        </div>

        {hikesData.list.length === 0
          ? <div className="text-center py-8 text-[#5A6B80] dark:text-[#8899AA] text-xs italic">No price hikes detected among your active subscriptions.</div>
          : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#E2E5EA] dark:border-[#2A3040] text-[11px] font-semibold uppercase tracking-wider text-[#5A6B80] dark:text-[#8899AA]">
                      <th className="py-2.5 px-3">Subscription</th>
                      <th className="py-2.5 px-3">Old Price</th>
                      <th className="py-2.5 px-3">New Price</th>
                      <th className="py-2.5 px-3">Increase ({mode})</th>
                      <th className="py-2.5 px-3">Hike %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hikesData.list.map(h => (
                      <tr
                        key={h.sub.id}
                        className="border-b border-[#E2E5EA] dark:border-[#2A3040] text-xs sm:text-sm cursor-pointer hover:bg-[#F5F6F8] dark:hover:bg-[#0F1419] transition-colors"
                        onClick={() => navigateTo('detail', h.sub.id)}
                      >
                        <td className="py-3 px-3 font-semibold text-blue-600 dark:text-blue-400 hover:underline">{h.sub.name}</td>
                        <td className="py-3 px-3 font-mono text-[#5A6B80] dark:text-[#8899AA]">{fmt(h.oldPrice)}</td>
                        <td className="py-3 px-3 font-mono font-medium text-[#0B1F3A] dark:text-[#E8ECF1]">{fmt(h.newPrice)}</td>
                        <td className="py-3 px-3 font-mono font-semibold text-red-600 dark:text-red-400">+{fmt(h.diff)}{periodShort}</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            +{h.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2E5EA] dark:border-[#2A3040] flex items-center justify-between text-xs sm:text-sm">
                <span className="text-[#5A6B80] dark:text-[#8899AA]">Total extra cost from detected hikes:</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400 text-base">
                  +{fmt(hikesData.totalExtra)} {mode === 'yearly' ? 'per year' : 'per month'}
                </span>
              </div>
            </div>
          )
        }
      </div>

      {/* ── Savings opportunities ── */}
      <div className="af-card mb-8 shadow-sm">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-amber-500">savings</span>
            Identified Savings Opportunities
          </h2>
          <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-0.5">
            Actions you can take to stop unwanted charges or reduce monthly overhead.
          </p>
        </div>

        {savingsOpps.length === 0
          ? <div className="text-center py-8 text-[#5A6B80] dark:text-[#8899AA] text-xs italic">No immediate cancellation or savings alerts found.</div>
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savingsOpps.map((op, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#F5F6F8] dark:bg-[#0F1419] border border-[#E2E5EA] dark:border-[#2A3040] flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-[#E8ECF1] truncate">{op.sub.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${op.tagClass}`}>{op.tag}</span>
                    </div>
                    <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] leading-relaxed">{op.desc}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E5EA] dark:border-[#2A3040] text-xs">
                    <span className="font-mono font-semibold text-[#0B1F3A] dark:text-[#E8ECF1]">
                      {op.spend > 0 ? `${fmt(op.spend)}${periodShort}` : 'Ended'}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigateTo(op.action, op.sub.id)}
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      {op.action === 'guide' ? 'Review / Cancel' : 'Check Details'}
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* ── Bottom navigation ── */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E2E5EA] dark:border-[#2A3040]">
        <button type="button" onClick={() => navigateTo('dashboard')} className="af-btn af-btn-secondary">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Dashboard
        </button>
        <button type="button" onClick={() => navigateTo('upload')} className="af-btn af-btn-secondary">
          <span className="material-symbols-outlined text-base">upload_file</span>
          Upload Statement
        </button>
      </div>

    </main>
  );
}
