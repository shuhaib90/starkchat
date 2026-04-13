"use client";

import { useState, useCallback, useRef } from "react";

export function useTilt(maxRotation = 4) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    
    // Calculate relative mouse position (0 to 1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Map to rotation range
    const rotateY = (x - 0.5) * maxRotation * 2;
    const rotateX = (y - 0.5) * -maxRotation * 2;
    
    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(8px)`,
      transition: "transform 100ms ease-out",
    });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [maxRotation]);

  const onMouseLeave = useCallback(() => {
    setStyle({
      transform: `perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)`,
      transition: "transform 600ms ease-out",
    });
  }, []);

  return {
    style,
    onMouseMove,
    onMouseLeave
  };
}
