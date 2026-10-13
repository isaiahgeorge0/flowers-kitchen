"use client";

import { useId, useState } from "react";
import { Button } from "@/components/Button";
import { ChoiceCard } from "@/components/catering/fields";
import { Eyebrow } from "@/components/Eyebrow";
import { cart } from "@/lib/ordering/cart-store";
import { MAX_LINE_QUANTITY } from "@/lib/ordering/limits";
import { formatPence } from "@/lib/ordering/money";
import type { MenuBox } from "@/lib/ordering/types";
import { QuantityStepper } from "./QuantityStepper";
import { Sheet, SheetClose } from "./Sheet";

export function ItemSheet({
  box,
  canOrder,
  onClose,
  onAdded,
}: {
  box: MenuBox | null;
  canOrder: boolean;
  onClose: () => void;
  onAdded: (message: string) => void;
}) {
  const titleId = useId();
  return (
    <Sheet open={box !== null} onClose={onClose} labelledBy={titleId}>
      {box && <ItemSheetBody key={box.id} box={box} canOrder={canOrder} titleId={titleId} onClose={onClose} onAdded={onAdded} />}
    </Sheet>
  );
}

function ItemSheetBody({
  box,
  canOrder,
  titleId,
  onClose,
  onAdded,
}: {
  box: MenuBox;
  canOrder: boolean;
  titleId: string;
  onClose: () => void;
  onAdded: (message: string) => void;
}) {
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [missing, setMissing] = useState<string[]>([]);

  const selectedOptions = box.groups.flatMap((group) =>
    group.options.filter((option) => chosen[group.id]?.includes(option.id)),
  );
  const unitPence = box.pricePence + selectedOptions.reduce((sum, option) => sum + option.pricePence, 0);

  function choose(groupId: string, optionId: string, single: boolean, checked: boolean) {
    setChosen((current) => {
      const list = current[groupId] ?? [];
      const next = single ? [optionId] : checked ? [...list, optionId] : list.filter((id) => id !== optionId);
      return { ...current, [groupId]: next };
    });
    setMissing((current) => current.filter((id) => id !== groupId));
  }

  function add() {
    const unmet = box.groups.filter((group) => {
      const count = chosen[group.id]?.length ?? 0;
      return count < group.min || count > group.max;
    });
    if (unmet.length > 0) {
      setMissing(unmet.map((group) => group.id));
      document.getElementById(`group-${unmet[0].id}`)?.focus();
      return;
    }
    cart.add({
      boxId: box.id,
      name: box.name,
      optionIds: selectedOptions.map((option) => option.id),
      optionLabels: selectedOptions.map((option) => option.name),
      unitPence,
      quantity,
    });
    onAdded(`Added ${quantity} ${box.name} ${quantity === 1 ? "box" : "boxes"} to your basket.`);
    onClose();
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 pb-4 pt-5">
        <div>
          <Eyebrow>Add to basket</Eyebrow>
          <h2 id={titleId} className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.015em]">
            {box.name}
          </h2>
        </div>
        <SheetClose onClick={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
        {box.description && <p className="text-[17px]">{box.description}</p>}
        <div className="mt-4 border-l-2 border-hairline pl-4 text-[15px]">
          <p className="font-semibold">Allergens</p>
          <p className="text-muted">{box.allergens || "To be confirmed. Please ask us before you order."}</p>
        </div>

        {box.groups.map((group) => {
          const single = group.max === 1;
          const isMissing = missing.includes(group.id);
          return (
            <fieldset
              key={group.id}
              id={`group-${group.id}`}
              tabIndex={-1}
              aria-describedby={isMissing ? `group-${group.id}-error` : undefined}
              className="mt-8"
            >
              <legend className="font-display text-xl font-semibold">
                Choose your {group.name.toLowerCase()}
                {group.required && <span className="ml-2 font-sans text-[13px] font-semibold uppercase tracking-[0.08em] text-sorrel">Required</span>}
              </legend>
              {isMissing && (
                <p id={`group-${group.id}-error`} className="mt-2 text-[15px] font-semibold text-sorrel">
                  Please choose your {group.name.toLowerCase()}.
                </p>
              )}
              <div className="mt-3 grid gap-2">
                {group.options.map((option) => {
                  const checked = chosen[group.id]?.includes(option.id) ?? false;
                  return (
                    <ChoiceCard
                      key={option.id}
                      compact
                      type={single ? "radio" : "checkbox"}
                      name={`group-${group.id}`}
                      value={option.id}
                      checked={checked}
                      disabled={!option.available}
                      onChange={() => choose(group.id, option.id, single, !checked)}
                      label={option.name}
                      description={
                        !option.available
                          ? "Not available today"
                          : option.pricePence > 0
                            ? `+${formatPence(option.pricePence)}`
                            : undefined
                      }
                    />
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="font-display text-xl font-semibold">How many</p>
          <QuantityStepper value={quantity} max={MAX_LINE_QUANTITY} onChange={setQuantity} label={`Number of ${box.name} boxes`} />
        </div>
      </div>

      <div className="border-t border-hairline px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {canOrder ? (
          <Button className="w-full" onClick={add}>
            Add {quantity} to basket · {formatPence(unitPence * quantity)}
          </Button>
        ) : (
          <>
            <Button className="w-full" disabled>
              Ordering is closed
            </Button>
            <p className="mt-3 text-center text-[15px] text-muted">You can still look through the menu.</p>
          </>
        )}
      </div>
    </>
  );
}
