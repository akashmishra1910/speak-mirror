"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.38,
        ease: [0.16, 1, 0.3, 1], // Apple/Stripe-style decel curve
      }}
      style={{ willChange: "transform, opacity" }}
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
