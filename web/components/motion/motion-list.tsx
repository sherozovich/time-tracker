"use client";
import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren: 0.04 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28, mass: 0.6 },
  },
};

type Props = {
  children: ReactNode;
  className?: string;
  as?: "ul" | "ol" | "div" | "dl";
};

export function MotionList({ children, className, as = "ul" }: Props) {
  const MotionTag =
    as === "ul"
      ? motion.ul
      : as === "ol"
        ? motion.ol
        : as === "dl"
          ? motion.dl
          : motion.div;
  return (
    <MotionTag
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </MotionTag>
  );
}

type ItemProps = {
  children: ReactNode;
  className?: string;
  layoutId?: string;
  as?: "li" | "div";
};

export function MotionItem({
  children,
  className,
  layoutId,
  as = "li",
}: ItemProps) {
  const MotionTag = as === "li" ? motion.li : motion.div;
  return (
    <MotionTag
      className={className}
      variants={item}
      layout
      layoutId={layoutId}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      {children}
    </MotionTag>
  );
}
