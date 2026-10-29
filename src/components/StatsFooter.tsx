import React, { useEffect, useRef, useState } from 'react';

interface StatConfig {
  icon: string;
  target: number;
  suffix: string;
  decimals: number;
  label: string;
  delay: string;
}

const STATS_DATA: StatConfig[] = [
  {
    icon: '>',
    target: 500,
    suffix: '+',
    decimals: 0,
    label: 'Breakout Videos / Day',
    delay: '0.5s',
  },
  {
    icon: '*',
    target: 5,
    suffix: 'x',
    decimals: 0,
    label: 'Daily Sync Runs (6AM-9PM)',
    delay: '0.58s',
  },
  {
    icon: '#',
    target: 100,
    suffix: '%',
    decimals: 0,
    label: 'Mistral Topic Accuracy',
    delay: '0.66s',
  },
  {
    icon: '<',
    target: 45,
    suffix: 's',
    decimals: 0,
    label: 'Shorts Teleprompter Pace',
    delay: '0.74s',
  },
];

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export const StatsFooter: React.FC = () => {
  const footerRef = useRef<HTMLElement>(null);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [displayValues, setDisplayValues] = useState<string[]>(
    STATS_DATA.map((s) => (0).toFixed(s.decimals))
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTriggered) {
            setHasTriggered(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, [hasTriggered]);

  useEffect(() => {
    if (!hasTriggered) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setDisplayValues(STATS_DATA.map((s) => s.target.toFixed(s.decimals)));
      return;
    }

    const timeouts: number[] = [];
    const animFrames: number[] = [];

    STATS_DATA.forEach((stat, i) => {
      const duration = 1500 + i * 80;
      const startOffset = 480 + i * 90;

      const tId = window.setTimeout(() => {
        const startTime = performance.now();

        function update(currentTime: number) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const currentVal = stat.target * easeOutCubic(progress);

          setDisplayValues((prev) => {
            const next = [...prev];
            next[i] = currentVal.toFixed(stat.decimals);
            return next;
          });

          if (progress < 1) {
            const rId = requestAnimationFrame(update);
            animFrames.push(rId);
          } else {
            setDisplayValues((prev) => {
              const next = [...prev];
              next[i] = stat.target.toFixed(stat.decimals);
              return next;
            });
          }
        }

        const rId = requestAnimationFrame(update);
        animFrames.push(rId);
      }, startOffset);

      timeouts.push(tId);
    });

    return () => {
      timeouts.forEach((id) => clearTimeout(id));
      animFrames.forEach((id) => cancelAnimationFrame(id));
    };
  }, [hasTriggered]);

  return (
    <footer className="stats-footer" ref={footerRef}>
      <div className="stats-grid">
        {STATS_DATA.map((stat, i) => (
          <div
            key={stat.label}
            className="stat-item anim"
            style={{ '--d': stat.delay } as React.CSSProperties}
          >
            <div className="stat-top">
              <span className="stat-icon">{stat.icon}</span>
              <div className="stat-number">
                <span className="stat-val">{displayValues[i]}</span>
                <span className="stat-suffix">{stat.suffix}</span>
              </div>
            </div>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
    </footer>
  );
};

