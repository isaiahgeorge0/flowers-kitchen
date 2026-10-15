"use client";

import { useEffect, useId, useOptimistic, useState, useTransition } from "react";
import { setSharedItemAvailableAction } from "@/app/admin/(protected)/menu/actions";
import { buttonClasses } from "@/components/Button";
import { Sheet, SheetClose } from "@/components/order/Sheet";
import type { PanelBox, PanelItem, SharedPanelData } from "@/lib/admin/shared-items";
import { listAnd, lowerFirst } from "@/lib/ordering/sides";

/** Boxes on sale that would have nothing left to choose in a required group, and that group's name. */
function sellsOut(boxes: PanelBox[], items: PanelItem[], switchingOff: string) {
  const on = new Map(items.map((item) => [item.id, item.id === switchingOff ? false : item.available]));
  const affected: string[] = [];
  let group = "";
  for (const box of boxes) {
    const empty = box.groups.find(
      (g) =>
        g.options.some((option) => option.componentId === switchingOff) &&
        !g.options.some((option) => option.available && (option.componentId ? on.get(option.componentId) !== false : true)),
    );
    if (empty) {
      affected.push(box.name);
      group ||= empty.name;
    }
  }
  return { affected, group };
}

function confirmText(item: PanelItem, data: SharedPanelData) {
  const name = lowerFirst(item.name);
  const { affected, group } = sellsOut(data.boxes, data.items, item.id);
  const back = `until ${group ? `a ${group.toLowerCase()}` : "it"} is back on`;
  if (affected.length === 0) return `Customers won't be able to choose ${name} on any box.`;
  if (affected.length === data.boxes.length) {
    return `Customers won't be able to choose ${name}. Every box will show as sold out ${back}.`;
  }
  return `Customers won't be able to choose ${name}. ${listAnd(affected)} will show as sold out ${back}.`;
}

/** One switch per shared choice and included side. Used on the menu page and the kitchen board. */
export function SharedIngredients({
  data,
  headingLevel = 2,
  stacked = false,
}: {
  data: SharedPanelData;
  headingLevel?: 2 | 3;
  /** One column, for the kitchen board drawer. */
  stacked?: boolean;
}) {
  const [items, setItems] = useOptimistic(data.items, (current: PanelItem[], change: { id: string; available: boolean }) =>
    current.map((item) => (item.id === change.id ? { ...item, available: change.available } : item)),
  );
  const [, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; at: number } | null>(null);
  const [confirming, setConfirming] = useState<PanelItem | null>(null);
  const titleId = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const apply = (item: PanelItem, available: boolean) => {
    setError(null);
    setPendingId(item.id);
    startTransition(async () => {
      setItems({ id: item.id, available });
      const result = await setSharedItemAvailableAction(item.id, available);
      setPendingId(null);
      if (!result.ok) return setError(result.message);
      const name = lowerFirst(item.name);
      setToast({
        text: available
          ? `${item.name} is back on.`
          : item.kind === "included"
            ? `Customers will see \u2018No ${name} today\u2019.`
            : `${item.name} is off on every box.`,
        at: Date.now(),
      });
    });
  };

  const toggle = (item: PanelItem) => {
    if (item.available && item.kind === "choice") setConfirming(item);
    else apply(item, !item.available);
  };

  const groups = [
    { kind: "choice" as const, title: "Choices", hint: "Customers pick one. When it's out, they can't choose it on any box." },
    { kind: "included" as const, title: "Included sides", hint: "In every box. When one's out, boxes still sell and customers see a note." },
  ];

  return (
    <div className="space-y-6" data-shared-ingredients>
      {groups.map((group) => {
        const list = items.filter((item) => item.kind === group.kind);
        if (list.length === 0) return null;
        return (
          <section key={group.kind} aria-label={group.title}>
            <Heading className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted">{group.title}</Heading>
            <p className="mt-1 text-[15px] text-muted">{group.hint}</p>
            <ul className={`mt-3 grid gap-2 ${stacked ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
              {list.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.available}
                    aria-busy={pendingId === item.id}
                    onClick={() => toggle(item)}
                    className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-card border px-5 py-3 text-left transition-colors duration-300 ease-out ${
                      item.available
                        ? "border-hairline bg-paper text-pimento hover:border-pimento"
                        : "border-sorrel bg-sorrel text-cream [--focus-ring:var(--color-cream)]"
                    }`}
                  >
                    <span className="text-[18px] font-semibold">{item.name}</span>
                    <span
                      className={`inline-flex min-h-8 items-center rounded-pill border px-3 text-[13px] font-semibold uppercase tracking-[0.08em] ${
                        item.available ? "border-mountain text-mountain" : "border-cream text-cream"
                      }`}
                    >
                      {item.available ? "Available" : "Out"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {error && (
        <p role="alert" className="text-[15px] font-semibold text-sorrel">
          {error}
        </p>
      )}
      <p role="status" aria-live="polite" className={toast ? "fixed inset-x-4 bottom-6 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-pill bg-pimento px-5 py-3 text-center text-[15px] font-semibold text-cream shadow-lift" : "sr-only"}>
        {toast?.text}
      </p>

      <Sheet open={confirming !== null} onClose={() => setConfirming(null)} labelledBy={titleId}>
        {confirming && (
          <div className="overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="font-display text-[28px] font-semibold leading-tight">
                Switch off {lowerFirst(confirming.name)}?
              </h2>
              <SheetClose onClick={() => setConfirming(null)} />
            </div>
            <p className="mt-3 text-[17px]">{confirmText(confirming, { ...data, items })}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setConfirming(null)} className={buttonClasses("secondary", "md", "min-h-14")}>
                Keep it on
              </button>
              <button
                type="button"
                onClick={() => {
                  apply(confirming, false);
                  setConfirming(null);
                }}
                className={buttonClasses("primary", "md", "min-h-14")}
              >
                Switch off
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
