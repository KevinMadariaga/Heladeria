"use client";

import { MotionConfig } from "motion/react";

// reducedMotion="user": Motion respeta prefers-reduced-motion en todas las animaciones.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
