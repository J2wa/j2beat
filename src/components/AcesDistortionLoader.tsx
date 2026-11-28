import { useEffect, useId, useRef } from 'react';
import {
  ACES_LETTER_LAYOUT,
  ACES_LOGO_BODY,
  ACES_LOGO_DOT,
  ACES_LOGO_DOT_CENTER,
} from '../lib/acesLogo';

interface AcesDistortionLoaderProps {
  stage?: string;
  subtitle?: string;
  elapsedSeconds?: number;
  variant?: 'hero' | 'compact' | 'splash';
  className?: string;
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function AcesDistortionLoader({
  stage = 'Analyzing audio',
  subtitle,
  elapsedSeconds,
  variant = 'hero',
  className = '',
}: AcesDistortionLoaderProps) {
  const uid = useId().replace(/:/g, '');
  const turbRef = useRef<SVGFETurbulenceElement | null>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const cyanRef = useRef<SVGGElement | null>(null);
  const cobaltRef = useRef<SVGGElement | null>(null);
  const sliceTopRef = useRef<SVGGElement | null>(null);
  const sliceMidRef = useRef<SVGGElement | null>(null);

  const isCompact = variant === 'compact';
  const showWordmark = !isCompact;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let rafId = 0;
    let lastTick = 0;
    const start = performance.now();

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      // Smooth ~30fps cadence for crisp signal-warp aesthetics with minimal overhead.
      if (now - lastTick < 32) return;
      lastTick = now;

      const t = (now - start) / 1000;
      const cycle = t % 2.8;
      // Short organic signal-lock burst twice per cycle (one strong, one micro-flutter).
      const mainBurst =
        cycle > 0.35 && cycle < 0.72
          ? Math.sin(((cycle - 0.35) / 0.37) * Math.PI)
          : 0;
      const microBurst =
        cycle > 1.75 && cycle < 1.98
          ? Math.sin(((cycle - 1.75) / 0.23) * Math.PI) * 0.58
          : 0;
      const burst = Math.max(mainBurst, microBurst);

      const wave = 0.5 + 0.5 * Math.sin(t * 2.1);
      const freqX = 0.008 + wave * 0.009 + burst * 0.022;
      const freqY = 0.045 + 0.03 * Math.cos(t * 1.6) + burst * 0.14;
      const scale = (isCompact ? 4.5 : 6.5) + wave * 4 + burst * (isCompact ? 18 : 26);

      if (turbRef.current) {
        turbRef.current.setAttribute(
          'baseFrequency',
          `${freqX.toFixed(4)} ${freqY.toFixed(4)}`,
        );
        if (burst > 0.65) {
          turbRef.current.setAttribute('seed', String(Math.floor(t * 18) % 97));
        }
      }

      if (dispRef.current) {
        dispRef.current.setAttribute('scale', scale.toFixed(2));
      }

      const splitX = 2.2 + burst * (isCompact ? 12 : 18);
      const splitY = Math.sin(t * 6.5) * (0.8 + burst * 3.5);
      if (cyanRef.current) {
        cyanRef.current.setAttribute(
          'transform',
          `translate(${(-splitX).toFixed(2)} ${(-splitY).toFixed(2)})`,
        );
        cyanRef.current.setAttribute('opacity', (0.28 + burst * 0.42).toFixed(2));
      }
      if (cobaltRef.current) {
        cobaltRef.current.setAttribute(
          'transform',
          `translate(${splitX.toFixed(2)} ${splitY.toFixed(2)})`,
        );
        cobaltRef.current.setAttribute('opacity', (0.35 + burst * 0.4).toFixed(2));
      }

      if (sliceTopRef.current) {
        const shift = burst > 0.15 ? Math.sin(t * 42) * burst * 24 : 0;
        sliceTopRef.current.setAttribute('transform', `translate(${shift.toFixed(2)} 0)`);
        sliceTopRef.current.setAttribute('opacity', burst > 0.15 ? '0.92' : '0');
      }
      if (sliceMidRef.current) {
        const shift = burst > 0.2 ? -Math.cos(t * 36) * burst * 28 : 0;
        sliceMidRef.current.setAttribute('transform', `translate(${shift.toFixed(2)} 0)`);
        sliceMidRef.current.setAttribute('opacity', burst > 0.2 ? '0.88' : '0');
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isCompact]);

  const filterId = `aces-warp-${uid}`;
  const glowId = `aces-glow-${uid}`;
  const sliceTopId = `aces-slice-top-${uid}`;
  const sliceMidId = `aces-slice-mid-${uid}`;
  const logoClipId = `aces-logo-clip-${uid}`;
  const scanGradId = `aces-scan-grad-${uid}`;

  const svgMark = (
    <div className="aces-distortion-stage" aria-hidden="true">
      <div className="aces-distortion-aura" />
      <svg
        className="aces-distortion-svg"
        viewBox="300 290 680 530"
        fill="none"
        focusable="false"
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.012 0.06"
              numOctaves={2}
              seed={7}
              result="noise"
            />
            <feDisplacementMap
              ref={dispRef}
              in="SourceGraphic"
              in2="noise"
              scale={8}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <clipPath id={logoClipId}>
            <path d={ACES_LOGO_BODY} />
            <rect
              x={ACES_LOGO_DOT.x}
              y={ACES_LOGO_DOT.y}
              width={ACES_LOGO_DOT.w}
              height={ACES_LOGO_DOT.h}
            />
          </clipPath>
          <linearGradient id={scanGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
            <stop offset="46%" stopColor="#38BDF8" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="54%" stopColor="#2F7BFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2F7BFF" stopOpacity="0" />
          </linearGradient>
          <clipPath id={sliceTopId}>
            <rect x="300" y="420" width="680" height="74" />
          </clipPath>
          <clipPath id={sliceMidId}>
            <rect x="300" y="610" width="680" height="62" />
          </clipPath>
        </defs>

        {/* Expanding sonar rings from the signature Aces dot */}
        <g className="aces-distortion-rings">
          <circle
            className="aces-ring aces-ring--1"
            cx={ACES_LOGO_DOT_CENTER.x}
            cy={ACES_LOGO_DOT_CENTER.y}
            r="36"
          />
          <circle
            className="aces-ring aces-ring--2"
            cx={ACES_LOGO_DOT_CENTER.x}
            cy={ACES_LOGO_DOT_CENTER.y}
            r="36"
          />
        </g>

        {/* Distorted chromatic echo layers */}
        <g filter={`url(#${filterId})`}>
          <g ref={cyanRef} opacity="0.32" className="aces-ghost-cyan">
            <path d={ACES_LOGO_BODY} fill="#38BDF8" />
            <rect
              x={ACES_LOGO_DOT.x}
              y={ACES_LOGO_DOT.y}
              width={ACES_LOGO_DOT.w}
              height={ACES_LOGO_DOT.h}
              fill="#38BDF8"
            />
          </g>
          <g ref={cobaltRef} opacity="0.38" className="aces-ghost-cobalt">
            <path d={ACES_LOGO_BODY} fill="#2F7BFF" />
            <rect
              x={ACES_LOGO_DOT.x}
              y={ACES_LOGO_DOT.y}
              width={ACES_LOGO_DOT.w}
              height={ACES_LOGO_DOT.h}
              fill="#2F7BFF"
            />
          </g>

          {/* Primary geometric mark */}
          <path className="aces-distortion-body" d={ACES_LOGO_BODY} />

          {/* Glowing floating "i" dot */}
          <g className="aces-distortion-dot-wrap">
            <rect
              className="aces-distortion-dot-glow"
              filter={`url(#${glowId})`}
              x={ACES_LOGO_DOT.x - 10}
              y={ACES_LOGO_DOT.y - 10}
              width={ACES_LOGO_DOT.w + 20}
              height={ACES_LOGO_DOT.h + 20}
            />
            <rect
              className="aces-distortion-dot"
              x={ACES_LOGO_DOT.x}
              y={ACES_LOGO_DOT.y}
              width={ACES_LOGO_DOT.w}
              height={ACES_LOGO_DOT.h}
            />
          </g>

          {/* Seamless scan-beam clipped strictly inside the logo silhouette */}
          {!isCompact && (
            <g clipPath={`url(#${logoClipId})`}>
              <rect
                className="aces-distortion-beam"
                x="300"
                y="220"
                width="680"
                height="130"
                fill={`url(#${scanGradId})`}
              />
            </g>
          )}
        </g>

        {/* Periodic horizontal tape-flutter glitch slices */}
        <g clipPath={`url(#${sliceTopId})`}>
          <g ref={sliceTopRef} opacity="0">
            <path d={ACES_LOGO_BODY} fill="#D8E8FF" />
          </g>
        </g>
        <g clipPath={`url(#${sliceMidId})`}>
          <g ref={sliceMidRef} opacity="0">
            <path d={ACES_LOGO_BODY} fill="#6FA8FF" />
          </g>
        </g>

        {/* Monoline ACES INTELLIGENCE lettering wave */}
        {showWordmark && (
          <g transform={ACES_LETTER_LAYOUT.transform} className="aces-distortion-wordmark">
            {ACES_LETTER_LAYOUT.items.map((item) => (
              <g key={item.index} transform={`translate(${item.x} ${-ACES_LETTER_LAYOUT.glyphHeight})`}>
                <g
                  className="aces-distortion-glyph"
                  style={{ '--i': item.index } as React.CSSProperties}
                >
                  <path d={item.d} />
                </g>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );

  if (isCompact) {
    return (
      <div className={`aces-loader aces-loader--compact ${className}`.trim()}>
        {svgMark}
      </div>
    );
  }

  return (
    <div
      className={`aces-loader aces-loader--${variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      {svgMark}
      <div className="aces-loader-meta">
        <div className="aces-loader-eq" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <p className="aces-loader-stage">{stage}</p>
        {subtitle && <p className="aces-loader-subtitle">{subtitle}</p>}
        {typeof elapsedSeconds === 'number' && (
          <time className="aces-loader-time">{formatElapsed(elapsedSeconds)}</time>
        )}
      </div>
    </div>
  );
}
