'use client';

import { useEffect, useRef, useState } from 'react';

type AnimatedStatProps = {
  durationMs?: number;
  suffix?: string;
  value: number;
};

export default function AnimatedStat({ durationMs = 1200, suffix = '', value }: AnimatedStatProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [started, setStarted] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.45 },
    );

    const node = containerRef.current;
    if (node) {
      observer.observe(node);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) {
      return;
    }

    const startTime = performance.now();
    let raf = 0;

    const animate = (timestamp: number) => {
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, started, value]);

  return (
    <span ref={containerRef}>
      {displayValue}
      {suffix}
    </span>
  );
}
