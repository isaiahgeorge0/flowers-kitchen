import "server-only";
import { z } from "zod";
import { supabase } from "@/lib/supabase-server";
import { BIG_ORDER_MESSAGE, MAX_LINE_QUANTITY, MAX_ORDER_QUANTITY } from "./limits";
import { mapBox, readMainMenuRows } from "./menu";
import { cartLineKey, type CartLine, type MenuBox } from "./types";

// Only ids and quantities are read from the browser. Every name and price comes from the database.
export const cartInputSchema = z
  .array(
    z.object({
      boxId: z.uuid(),
      optionIds: z.array(z.uuid()).max(10),
      quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
    }),
  )
  .min(1)
  .max(MAX_ORDER_QUANTITY);

export type CartInput = z.infer<typeof cartInputSchema>;

export type PricedLine = {
  boxId: string;
  name: string;
  basePence: number;
  optionsPence: number;
  unitPence: number;
  quantity: number;
  lineTotalPence: number;
  options: { groupId: string; groupName: string; optionId: string; optionName: string; pricePence: number }[];
};

export type PricedCart =
  | { ok: true; menuId: string | null; lines: PricedLine[]; totalPence: number; cart: CartLine[] }
  | { ok: false; message: string };

function priceLine(box: MenuBox, optionIds: string[], quantity: number): PricedLine | string {
  if (box.soldOut) return `Sorry, ${box.name} has sold out. Please remove it from your basket.`;

  const chosen = new Set(optionIds);
  if (chosen.size !== optionIds.length) return `Please choose again for ${box.name}.`;

  const options: PricedLine["options"] = [];
  for (const group of box.groups) {
    const picked = group.options.filter((option) => chosen.has(option.id));
    if (picked.length < group.min || picked.length > group.max || (group.required && picked.length === 0)) {
      return `Please choose your ${group.name.toLowerCase()} for ${box.name}.`;
    }
    for (const option of picked) {
      if (!option.available) {
        return `${option.name} isn't available right now. Please choose again for ${box.name}.`;
      }
      chosen.delete(option.id);
      options.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        pricePence: option.pricePence,
      });
    }
  }
  if (chosen.size > 0) return `Please choose again for ${box.name}.`;

  const optionsPence = options.reduce((sum, option) => sum + option.pricePence, 0);
  const unitPence = box.pricePence + optionsPence;
  if (unitPence <= 0) return `${box.name} can't be ordered online right now.`;

  return {
    boxId: box.id,
    name: box.name,
    basePence: box.pricePence,
    optionsPence,
    unitPence,
    quantity,
    lineTotalPence: unitPence * quantity,
    options,
  };
}

/** Reprices the basket from the live menu. Rejects anything hidden, sold out or not allowed. */
export async function priceCart(input: CartInput): Promise<PricedCart> {
  const rows = await readMainMenuRows(supabase);
  const boxes = new Map(
    rows
      .filter((row) => row.active_menus.status === "live" && row.is_available && row.menu_template_items.is_available)
      .map((row) => [row.id, mapBox(row)]),
  );

  // Same box and same choice stack into one line.
  const merged = new Map<string, CartInput[number]>();
  for (const line of input) {
    const key = cartLineKey(line.boxId, line.optionIds);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, quantity: existing.quantity + line.quantity } : line);
  }

  const totalQuantity = [...merged.values()].reduce((sum, line) => sum + line.quantity, 0);
  if (totalQuantity > MAX_ORDER_QUANTITY) return { ok: false, message: BIG_ORDER_MESSAGE };

  const lines: PricedLine[] = [];
  for (const line of merged.values()) {
    if (line.quantity > MAX_LINE_QUANTITY) {
      return { ok: false, message: `You can order up to ${MAX_LINE_QUANTITY} of each box. ${BIG_ORDER_MESSAGE}` };
    }
    const box = boxes.get(line.boxId);
    if (!box) return { ok: false, message: "Something in your basket is no longer on the menu. Please remove it." };
    const priced = priceLine(box, line.optionIds, line.quantity);
    if (typeof priced === "string") return { ok: false, message: priced };
    lines.push(priced);
  }

  return {
    ok: true,
    menuId: rows[0]?.active_menus.id ?? null,
    lines,
    totalPence: lines.reduce((sum, line) => sum + line.lineTotalPence, 0),
    cart: lines.map((line) => ({
      key: cartLineKey(line.boxId, line.options.map((option) => option.optionId)),
      boxId: line.boxId,
      name: line.name,
      optionIds: line.options.map((option) => option.optionId),
      optionLabels: line.options.map((option) => option.optionName),
      unitPence: line.unitPence,
      quantity: line.quantity,
    })),
  };
}
