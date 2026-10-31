import React, { useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

function calculateMode(data) {
  if (!data || !data.length) return null;
  const counts = {};
  let maxCount = 0;
  let mode = null;

  for (let i = 0; i < data.length; i++) {
    const val = data[i].a;
    counts[val] = (counts[val] || 0) + 1;
    if (counts[val] > maxCount) {
      maxCount = counts[val];
      mode = val;
    }
  }
  return mode;
}

function drawRoundedBar(ctx, x, y, width, height, radius) {
  if (height <= 0) return;
  if (radius > height) radius = height;
  if (radius > width / 2) radius = width / 2;

  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();
}

export default function PriceChart({ history = [] }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { theme } = useApp();
  const isDark = theme === 'dark';

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const barColor = isDark ? '#4D9AFF' : '#0B5FD8';
    const hikeColor = isDark ? '#FF6B6B' : '#D93025';
    const textColor = isDark ? '#8899AA' : '#5A6B80';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = container.clientWidth || 500;
    const displayHeight = displayWidth >= 700 ? 280 : 220;

    canvas.width = Math.floor(displayWidth * dpr);
    canvas.height = Math.floor(displayHeight * dpr);
    canvas.style.width = '100%';
    canvas.style.height = `${displayHeight}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    if (!history || !history.length) {
      ctx.fillStyle = textColor;
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No history data available', displayWidth / 2, displayHeight / 2);
      ctx.restore();
      return;
    }

    const modeAmount = calculateMode(history);
    let maxVal = 0;
    for (let i = 0; i < history.length; i++) {
      if (history[i].a > maxVal) maxVal = history[i].a;
    }
    if (maxVal <= 0) maxVal = 100;
    const yMax = Math.ceil((maxVal * 1.25) / 50) * 50;

    const padLeft = 52;
    const padRight = 16;
    const padTop = 26;
    const chartW = displayWidth - padLeft - padRight;
    const slotWidth = chartW / history.length;
    const rotateLabels = slotWidth < 44;
    const padBottom = rotateLabels ? 48 : 28;
    const chartH = displayHeight - padTop - padBottom;

    // Draw horizontal grid lines & Y-axis labels
    const gridSteps = 3;
    ctx.lineWidth = 1;
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let s = 0; s <= gridSteps; s++) {
      const gridVal = Math.round((yMax / gridSteps) * s);
      const yPos = padTop + chartH - (gridVal / yMax) * chartH;

      ctx.strokeStyle = gridColor;
      ctx.beginPath();
      ctx.moveTo(padLeft, yPos);
      ctx.lineTo(padLeft + chartW, yPos);
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.fillText(`₹${gridVal.toLocaleString('en-IN')}`, padLeft - 8, yPos);
    }

    // Draw bars and labels
    const barWidth = Math.max(8, Math.min(42, slotWidth * 0.62));
    let lastLabelRight = -Infinity;
    const labelStep = rotateLabels ? Math.max(1, Math.ceil(16 / slotWidth)) : 1;

    for (let j = 0; j < history.length; j++) {
      const item = history[j];
      const isHike = item.a !== modeAmount && item.a > (modeAmount || 0);
      ctx.fillStyle = isHike ? hikeColor : barColor;

      const barX = padLeft + (j * slotWidth) + (slotWidth - barWidth) / 2;
      const barH = (item.a / yMax) * chartH;
      const barY = padTop + chartH - barH;

      drawRoundedBar(ctx, barX, barY, barWidth, barH, 4);

      // Value text above bar
      const valText = `₹${item.a.toLocaleString('en-IN')}`;
      const isChange = j === 0 || j === history.length - 1 || item.a !== history[j - 1].a;
      ctx.font = '11px "IBM Plex Mono", monospace';
      const txtW = ctx.measureText(valText).width;
      const cx = barX + barWidth / 2;

      if ((slotWidth >= 44 || isChange) && cx - txtW / 2 >= lastLabelRight + 4) {
        ctx.fillStyle = isHike ? hikeColor : textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(valText, cx, barY - 4);
        lastLabelRight = cx + txtW / 2;
      }

      // X-axis label
      if (j % labelStep !== 0 && j !== history.length - 1) continue;
      ctx.save();
      ctx.fillStyle = textColor;
      ctx.font = '11px "IBM Plex Mono", monospace';

      if (rotateLabels) {
        ctx.translate(cx, padTop + chartH + 10);
        ctx.rotate(-Math.PI / 4);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.l, 0, 0);
      } else {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(item.l, cx, padTop + chartH + 6);
      }
      ctx.restore();
    }

    ctx.restore();
  }, [history, isDark]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <canvas ref={canvasRef} className="w-full block" />
    </div>
  );
}
