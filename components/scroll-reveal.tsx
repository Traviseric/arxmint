"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

export function ScrollReveal({
    children,
    delay = 0,
    className = "",
    direction = "up",
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
    direction?: "up" | "down" | "left" | "right" | "none";
}) {
    const prefersReducedMotion = useReducedMotion();

    const yOffset = direction === "up" ? 30 : direction === "down" ? -30 : 0;
    const xOffset = direction === "left" ? 30 : direction === "right" ? -30 : 0;

    if (prefersReducedMotion) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: yOffset, x: xOffset }}
            whileInView={{ opacity: 1, y: 0, x: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerContainer({
    children,
    className = "",
    staggerDelay = 0.1,
    delay = 0,
}: {
    children: ReactNode;
    className?: string;
    staggerDelay?: number;
    delay?: number;
}) {
    const prefersReducedMotion = useReducedMotion();

    if (prefersReducedMotion) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-10%" }}
            variants={{
                visible: {
                    transition: {
                        staggerChildren: staggerDelay,
                        delayChildren: delay,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({
    children,
    className = "",
    direction = "up",
}: {
    children: ReactNode;
    className?: string;
    direction?: "up" | "down" | "left" | "right" | "none";
}) {
    const prefersReducedMotion = useReducedMotion();

    const yOffset = direction === "up" ? 20 : direction === "down" ? -20 : 0;
    const xOffset = direction === "left" ? 20 : direction === "right" ? -20 : 0;

    if (prefersReducedMotion) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: yOffset, x: xOffset },
                visible: {
                    opacity: 1,
                    y: 0,
                    x: 0,
                    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
