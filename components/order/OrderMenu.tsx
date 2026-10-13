"use client";

import { useEffect, useState } from "react";
import { captureOrderSource } from "@/lib/ordering/order-source";
import type { MenuBox, OrderingSettings } from "@/lib/ordering/types";
import { useOrderingStatus } from "@/lib/ordering/use-ordering-status";
import { BasketBar } from "./BasketBar";
import { ItemSheet } from "./ItemSheet";
import { OrderBoxCard } from "./OrderBoxCard";
import { OrderingBanner } from "./OrderingBanner";

export function OrderMenu({ boxes, settings }: { boxes: MenuBox[]; settings: OrderingSettings }) {
  const state = useOrderingStatus(settings);
  const [selected, setSelected] = useState<MenuBox | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const canOrder = state?.canOrder === true;

  useEffect(captureOrderSource, []);

  return (
    <>
      <OrderingBanner state={state} leadMinutes={settings.leadMinutes} daysAhead={settings.daysAhead} />

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {boxes.map((box) => (
          <li key={box.id}>
            <OrderBoxCard box={box} canOrder={canOrder} onAdd={() => setSelected(box)} />
          </li>
        ))}
      </ul>

      <ItemSheet box={selected} canOrder={canOrder} onClose={() => setSelected(null)} onAdded={setAnnouncement} />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <BasketBar />
    </>
  );
}
