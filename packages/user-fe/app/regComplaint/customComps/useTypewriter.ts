"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseTypewriterOptions {
  speed?: number; // ms per character
  onComplete?: () => void;
}

export function useTypewriter(options: UseTypewriterOptions = {}) {
  const { speed = 25, onComplete } = options;
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const rafRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const targetRef = useRef("");
  const cancelledRef = useRef(false);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsTyping(false);
  }, []);

  const skipToEnd = useCallback(() => {
    stop();
    setDisplayText(targetRef.current);
    onComplete?.();
  }, [stop, onComplete]);

  const start = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        stop();
        targetRef.current = text;
        indexRef.current = 0;
        cancelledRef.current = false;
        setDisplayText("");
        setIsTyping(true);

        let lastTime = 0;

        const tick = (timestamp: number) => {
          if (cancelledRef.current) {
            resolve();
            return;
          }

          if (timestamp - lastTime >= speed) {
            lastTime = timestamp;
            indexRef.current++;
            const current = text.slice(0, indexRef.current);
            setDisplayText(current);

            if (indexRef.current >= text.length) {
              setIsTyping(false);
              onComplete?.();
              resolve();
              return;
            }
          }

          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      });
    },
    [speed, onComplete, stop]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { displayText, isTyping, start, stop, skipToEnd };
}
