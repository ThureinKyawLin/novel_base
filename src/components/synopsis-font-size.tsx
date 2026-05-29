"use client";

import { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";

const STORAGE_KEY = "novelbase-synopsis-font-size";
const DEFAULT_SIZE = 15;
const MIN_SIZE = 13;
const MAX_SIZE = 24;
const STEP = 1;

function getSavedSize(): number {
  if (typeof window === "undefined") return DEFAULT_SIZE;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_SIZE;
  const num = Number(saved);
  return num >= MIN_SIZE && num <= MAX_SIZE ? num : DEFAULT_SIZE;
}

/**
 * Font size +/- control for Synopsis. Persists in localStorage.
 */
export function SynopsisFontSizeControl() {
  const [size, setSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    setSize(getSavedSize());
  }, []);

  function changeSize(delta: number) {
    const newSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, size + delta));
    setSize(newSize);
    localStorage.setItem(STORAGE_KEY, String(newSize));
    // Dispatch custom event so SynopsisText picks it up
    window.dispatchEvent(new CustomEvent("synopsis-font-size", { detail: newSize }));
  }

  return (
    <div className="flex items-center gap-1 ml-auto">
      <button
        type="button"
        onClick={() => changeSize(-STEP)}
        disabled={size <= MIN_SIZE}
        className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
        aria-label="Decrease font size"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="text-xs text-muted-foreground min-w-[28px] text-center tabular-nums">
        {size}
      </span>
      <button
        type="button"
        onClick={() => changeSize(STEP)}
        disabled={size >= MAX_SIZE}
        className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
        aria-label="Increase font size"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Synopsis text that respects the user's chosen font size.
 */
export function SynopsisText({ text }: { text: string }) {
  const [size, setSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    setSize(getSavedSize());

    function onFontSizeChange(e: Event) {
      const detail = (e as CustomEvent<number>).detail;
      setSize(detail);
    }

    window.addEventListener("synopsis-font-size", onFontSizeChange);
    return () => window.removeEventListener("synopsis-font-size", onFontSizeChange);
  }, []);

  return (
    <p
      className="leading-relaxed whitespace-pre-wrap"
      style={{ fontSize: `${size}px` }}
    >
      {text}
    </p>
  );
}
