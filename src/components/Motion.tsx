"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Card that tilts in 3D toward the pointer with a moving highlight. Touch
 * devices and reduced-motion visitors get a plain, static card.
 */
export function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useTransform(y, [0, 1], [7, -7]), spring);
  const rotateY = useSpring(useTransform(x, [0, 1], [-9, 9]), spring);
  const glare = useTransform([x, y], ([gx, gy]: number[]) =>
    `radial-gradient(circle at ${gx * 100}% ${gy * 100}%, rgba(255,255,255,0.38), rgba(255,255,255,0) 55%)`
  );

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <div style={{ perspective: 1100 }} className={className}>
      <motion.div
        className="relative h-full [transform-style:preserve-3d] will-change-transform"
        style={{ rotateX, rotateY }}
        onPointerMove={(event) => {
          if (event.pointerType === "touch") return;
          const rect = event.currentTarget.getBoundingClientRect();
          x.set((event.clientX - rect.left) / rect.width);
          y.set((event.clientY - rect.top) / rect.height);
        }}
        onPointerLeave={() => {
          x.set(0.5);
          y.set(0.5);
        }}
      >
        {children}
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-soft-light" style={{ background: glare }} />
      </motion.div>
    </div>
  );
}

/** Counts up from zero to `value` when scrolled into view. */
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    if (reduceMotion) {
      node.textContent = `${value}${suffix}`;
      return;
    }
    const controls = animate(0, value, {
      duration: 1.4,
      ease: EASE_OUT,
      onUpdate: (latest) => {
        node.textContent = `${Math.round(latest)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, reduceMotion, suffix, value]);

  // Server render and no-JS show the final value.
  return <span ref={ref} className="tabular-nums">{value}{suffix}</span>;
}

/** Endless horizontal ticker. The list is rendered twice so the loop is seamless. */
export function Marquee({ items }: { items: readonly string[] }) {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <ul key={copy} className="marquee-group">
            {items.map((item) => (
              <li key={item} className="marquee-item">
                <span>{item}</span>
                <span className="marquee-dot" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
