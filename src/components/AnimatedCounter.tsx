import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  glowOnUpdate?: boolean;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  className = '',
  prefix = '',
  suffix = '',
  glowOnUpdate = true
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const [isPopping, setIsPopping] = useState<boolean>(false);
  const prevValueRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const isFirstRender = useRef<boolean>(true);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    prevValueRef.current = value;

    // Trigger pop effect on update (or initial mount)
    setIsPopping(true);
    const popTimer = setTimeout(() => {
      setIsPopping(false);
    }, 600);

    if (startValue === endValue && !isFirstRender.current) {
      setDisplayValue(endValue);
      return () => clearTimeout(popTimer);
    }
    isFirstRender.current = false;

    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth ease-out cubic curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateCounter);

    return () => {
      clearTimeout(popTimer);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  return (
    <motion.span
      key={`counter-${value}`}
      initial={{ scale: 0.82, opacity: 0.85, y: 2 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        y: 0
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 500, 
        damping: 16, 
        mass: 0.7 
      }}
      className={`inline-flex items-center justify-center font-mono font-black tabular-nums transition-colors ${className} ${
        isPopping && glowOnUpdate ? 'drop-shadow-[0_0_12px_rgba(255,215,0,0.7)]' : ''
      }`}
    >
      {prefix}
      {displayValue}
      {suffix}
    </motion.span>
  );
};
