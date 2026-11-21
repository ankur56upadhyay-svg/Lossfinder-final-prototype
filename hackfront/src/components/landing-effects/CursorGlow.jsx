import React, { useEffect, useRef } from 'react';
import './CursorGlow.css';

/**
 * CursorGlow — Interactive ambient spotlight tracking the cursor across the landing page.
 * Uses requestAnimationFrame with linear interpolation (lerp) for smooth 60fps tracking
 * without React state re-renders.
 */
export default function CursorGlow() {
  const orbRef = useRef(null);
  const targetPos = useRef({ x: -1000, y: -1000 });
  const currentPos = useRef({ x: -1000, y: -1000 });
  const isVisible = useRef(false);
  const rafId = useRef(null);

  useEffect(() => {
    const orb = orbRef.current;
    if (!orb) return;

    // Center starting point smoothly if mouse is already in viewport
    const handleMouseMove = (e) => {
      targetPos.current.x = e.clientX;
      targetPos.current.y = e.clientY;

      if (!isVisible.current) {
        isVisible.current = true;
        orb.classList.add('af-cursor-glow-visible');
        // snap initial position so it doesn't fly from offscreen
        currentPos.current.x = e.clientX;
        currentPos.current.y = e.clientY;
      }
    };

    const handleMouseLeave = () => {
      isVisible.current = false;
      orb.classList.remove('af-cursor-glow-visible');
    };

    const renderLoop = () => {
      if (isVisible.current) {
        // Eased lerp follow (0.12 factor gives soft cinematic latency)
        currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.12;
        currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.12;

        orb.style.transform = `translate(-50%, -50%) translate3d(${currentPos.current.x.toFixed(1)}px, ${currentPos.current.y.toFixed(1)}px, 0)`;
      }

      rafId.current = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    rafId.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div className="af-cursor-glow-root" aria-hidden="true">
      <div ref={orbRef} className="af-cursor-glow-orb" />
    </div>
  );
}
