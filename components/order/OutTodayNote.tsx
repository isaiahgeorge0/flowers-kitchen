import { listOr } from "@/lib/ordering/sides";

/** Slim, quiet line at the top of the menu when a shared item is out: "Today: no festival. …" */
export function OutTodayNote({ names, className = "" }: { names: string[]; className?: string }) {
  if (names.length === 0) return null;
  return (
    <p role="note" className={`rounded-card border border-hairline bg-paper px-5 py-3 text-[15px] leading-[1.55] text-muted ${className}`} data-out-today>
      <span className="font-semibold text-pimento">Today: no {listOr(names)}.</span> Everything else is cooking as normal.
    </p>
  );
}
