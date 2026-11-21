import React, { useId } from 'react';
import './LandingBackdrop.css';

/**
 * LandingBackdrop — Cinematic 3D architectural perspective corridor with inward traveling light sweep
 * inspired by CRED website opening.
 *
 * Symmetrical dark corridor with curved vertical pillars, floor reflection,
 * synchronized inward light sweep from edges to center with anamorphic flare, and a slow camera push.
 */
export default function LandingBackdrop() {
  const baseId = useId();

  // 10 pillars on each side, decreasing in height, width, and spacing toward the one-point perspective horizon
  const pillarConfigs = [
    { height: 100, width: 'clamp(28px, 4.2vw, 56px)', opacity: 0.95 },
    { height: 91,  width: 'clamp(24px, 3.6vw, 48px)', opacity: 0.88 },
    { height: 82,  width: 'clamp(21px, 3.1vw, 42px)', opacity: 0.80 },
    { height: 73,  width: 'clamp(18px, 2.7vw, 36px)', opacity: 0.72 },
    { height: 64,  width: 'clamp(15px, 2.3vw, 30px)', opacity: 0.64 },
    { height: 55,  width: 'clamp(13px, 1.9vw, 25px)', opacity: 0.56 },
    { height: 46,  width: 'clamp(11px, 1.5vw, 20px)', opacity: 0.48 },
    { height: 38,  width: 'clamp(9px,  1.2vw, 16px)', opacity: 0.40 },
    { height: 30,  width: 'clamp(7px,  1.0vw, 13px)', opacity: 0.32 },
    { height: 22,  width: 'clamp(5px,  0.8vw, 10px)', opacity: 0.25 },
  ];

  return (
    <div
      className="af-landing-backdrop-root"
      aria-hidden="true"
    >
      {/* Camera push wrapper (scales 1 -> 1.045 over ~6.5s) */}
      <div className="af-camera-rig">
        {/* Deep Horizon Ambient Glow */}
        <div className="af-horizon-glow" />

        {/* Central Corridor Perspective Void */}
        <div className="af-corridor-container">
          {/* Left Pillar Colonnade (angled inward with 3D perspective) */}
          <div className="af-colonnade af-colonnade-left">
            {pillarConfigs.map((cfg, idx) => (
              <div
                key={`${baseId}-left-${idx}`}
                className={`af-pillar af-pillar-left af-pillar-${idx + 1}`}
                style={{
                  height: `${cfg.height}%`,
                  width: cfg.width,
                  opacity: cfg.opacity,
                }}
              >
                <div className="af-pillar-bevel" />
              </div>
            ))}
          </div>

          {/* Right Pillar Colonnade (Symmetrical opposite, angled inward) */}
          <div className="af-colonnade af-colonnade-right">
            {pillarConfigs.map((cfg, idx) => (
              <div
                key={`${baseId}-right-${idx}`}
                className={`af-pillar af-pillar-right af-pillar-${idx + 1}`}
                style={{
                  height: `${cfg.height}%`,
                  width: cfg.width,
                  opacity: cfg.opacity,
                }}
              >
                <div className="af-pillar-bevel" />
              </div>
            ))}
          </div>

          {/* Symmetrical Inward Light Sweep Beams */}
          <div className="af-light-beam af-light-beam-left" />
          <div className="af-light-beam af-light-beam-right" />

          {/* Floor Plane & Perspective Reflections */}
          <div className="af-corridor-floor">
            <div className="af-floor-horizon-line" />
            <div className="af-floor-light af-floor-light-left" />
            <div className="af-floor-light af-floor-light-right" />
          </div>

          {/* Center Convergence Flare (Burst at ~4.8s) */}
          <div className="af-flare-wrapper">
            <div className="af-centre-flare-radial" />
            <div className="af-centre-flare-streak" />
          </div>
        </div>

        {/* Cinematic Vignette Overlay */}
        <div className="af-backdrop-vignette" />

        {/* Headline Reading Protection Radial (Guarantees 100% crisp typography) */}
        <div className="af-text-readability-scrim" />
      </div>
    </div>
  );
}
