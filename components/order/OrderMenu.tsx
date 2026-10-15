"use client";

import { useEffect, useState } from "react";
import { captureOrderSource } from "@/lib/ordering/order-source";
import { outToday } from "@/lib/ordering/sides";
import type { MenuBox, OrderingSettings } from "@/lib/ordering/types";
import { h3 } from "@/lib/typography";
import { useOrderingStatus } from "@/lib/ordering/use-ordering-status";
import { BasketBar } from "./BasketBar";
import { ItemSheet } from "./ItemSheet";
import { OrderBoxCard } from "./OrderBoxCard";
import { OrderingBanner } from "./OrderingBanner";
import { OutTodayNote } from "./OutTodayNote";

/** "Most popular" holds the boxes featured in Admin → Menu; the rest follow under "More boxes". */
function groupBoxes(boxes: MenuBox[]) {
  const popular = boxes.filter((box) => box.featured);
  const more = boxes.filter((box) => !box.featured);
  if (popular.length === 0 || more.length === 0) {
    return [{ id: "boxes-all", title: "Boxes", visible: false, boxes }];
  }
  return [
    { id: "boxes-popular", title: "Most popular", visible: true, boxes: popular },
    { id: "boxes-more", title: "More boxes", visible: true, boxes: more },
  ];
}

/** Columns that leave no card alone on the last row at desktop widths. */
function gridColumns(count: number) {
  if (count % 3 !== 1) return "sm:grid-cols-2 lg:grid-cols-3";
  if (count % 4 === 0) return "sm:grid-cols-2 xl:grid-cols-4";
  return "sm:grid-cols-2 lg:grid-cols-4";
}

export function OrderMenu({ boxes, settings }: { boxes: MenuBox[]; settings: OrderingSettings }) {
  const state = useOrderingStatus(settings);
  const [selected, setSelected] = useState<MenuBox | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const canOrder = state?.canOrder === true;
  const groups = groupBoxes(boxes);

  useEffect(captureOrderSource, []);

  return (
    <>
      <OutTodayNote names={outToday(boxes)} className="mb-3" />
      <OrderingBanner state={state} leadMinutes={settings.leadMinutes} daysAhead={settings.daysAhead} />

      <div className="mt-10 flex flex-col gap-16">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={group.id}>
          <h2 id={group.id} className={group.visible ? h3 : "sr-only"}>
            {group.title}
          </h2>
          <ul className={`mt-6 grid gap-6 ${gridColumns(group.boxes.length)}`}>
            {group.boxes.map((box) => (
              <li key={box.id}>
                <OrderBoxCard box={box} canOrder={canOrder} onAdd={() => setSelected(box)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      </div>

      <ItemSheet box={selected} canOrder={canOrder} onClose={() => setSelected(null)} onAdded={setAnnouncement} />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <BasketBar />
    </>
  );
}
