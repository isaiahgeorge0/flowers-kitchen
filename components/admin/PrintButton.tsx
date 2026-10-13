"use client";

import { buttonClasses } from "@/components/Button";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClasses("primary", "md", "min-h-12")}>
      Print card
    </button>
  );
}
