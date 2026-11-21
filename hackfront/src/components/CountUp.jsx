import React, { useState, useEffect } from 'react';

export default function CountUp({
  to = 0,
  duration = 600,
  prefix = '',
  suffix = '',
  format = true
}) {
  const [val, setVal] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return Number(to) || 0;
    }
    return 0;
  });

  useEffect(() => {
    const endVal = Number(to) || 0;

    // Immediately resolve if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(endVal);
      return;
    }

    let start = null;
    let animId = null;
    const startVal = 0;

    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Premium cubic-bezier(0.16, 1, 0.3, 1) approx easing curve: 1 - Math.pow(1 - progress, 3)
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(startVal + (endVal - startVal) * eased));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setVal(endVal);
      }
    }

    animId = requestAnimationFrame(step);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [to, duration]);

  const display = format ? val.toLocaleString('en-IN') : val;
  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
