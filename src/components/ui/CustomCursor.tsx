"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos     = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const raf     = useRef<number>(0);
  const [isTouch, setIsTouch] = useState(true); // default true = hidden until proven desktop

  useEffect(() => {
    // Only show custom cursor on devices that support hover (non-touch)
    if (typeof window === "undefined") return;
    const isTouchDevice = window.matchMedia("(hover: none)").matches;
    if (isTouchDevice) return; // leave isTouch = true → render null
    setIsTouch(false);

    const onMove = (e: MouseEvent) => { pos.current = { x: e.clientX, y: e.clientY }; };
    const onDown = () => dotRef.current?.classList.add("tz-cur-pressed");
    const onUp   = () => dotRef.current?.classList.remove("tz-cur-pressed");

    const loop = () => {
      const { x, y } = pos.current;
      const rx = ringPos.current.x + (x - ringPos.current.x) * 0.12;
      const ry = ringPos.current.y + (y - ringPos.current.y) * 0.12;
      ringPos.current = { x: rx, y: ry };
      if (dotRef.current)  dotRef.current.style.transform  = `translate(${x}px,${y}px)`;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px,${ry}px)`;
      raf.current = requestAnimationFrame(loop);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup",   onUp);
    raf.current = requestAnimationFrame(loop);
    document.documentElement.style.cursor = "none";

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup",   onUp);
      cancelAnimationFrame(raf.current);
      document.documentElement.style.cursor = "";
    };
  }, []);

  // Return null on touch devices — no DOM nodes at all
  if (isTouch) return null;

  return (
    <>
      <div ref={dotRef} className="tz-cursor-dot fixed top-0 left-0 pointer-events-none z-[99999] w-2 h-2 -ml-1 -mt-1 rounded-full bg-violet-500 dark:bg-cyan-400" />
      <div ref={ringRef} className="tz-cursor-ring fixed top-0 left-0 pointer-events-none z-[99998] w-8 h-8 -ml-4 -mt-4 rounded-full border border-violet-400/50 dark:border-cyan-400/40" />
    </>
  );
}
