import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to animate progress from 0 to 1 when the element enters the viewport.
 * @param {any} deps - Dependency that triggers resetting and re-running the animation.
 * @param {number} duration - Eased animation duration in milliseconds.
 * @param {number} delay - Startup delay before animating in milliseconds.
 * @returns {[number, React.RefObject]} [progress, elementRef]
 */
export const useChartAnimation = (deps, duration = 800, delay = 50) => {
  const [progress, setProgress] = useState(0);
  const elementRef = useRef(null);
  const [hasIntersected, setHasIntersected] = useState(false);

  // Reset intersection status and progress when deps change
  useEffect(() => {
    setHasIntersected(false);
    setProgress(0);
  }, [deps]);

  // Set up IntersectionObserver
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasIntersected(true);
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.05, // trigger when 5% of the element is visible Y-wise
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [deps]);

  // Handle actual animation loop once visible
  useEffect(() => {
    if (!hasIntersected) return;

    let start = null;
    let animationFrameId = null;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const val = Math.min(elapsed / duration, 1);
      
      const easeVal = 1 - Math.pow(1 - val, 3); // easeOutCubic
      
      setProgress(easeVal);

      if (elapsed < duration) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    const timeoutId = setTimeout(() => {
      animationFrameId = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [hasIntersected, duration, delay]);

  return [progress, elementRef];
};
