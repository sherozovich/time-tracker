"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function MotionSection({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        type: "spring",
        stiffness: 180,
        damping: 24,
        mass: 0.6,
        delay,
      }}
    >
      {children}
    </motion.section>
  );
}
