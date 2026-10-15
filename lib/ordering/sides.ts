import type { BasketAvailability, BasketFlag, CartLine, MenuBox } from "./types";

// Customer and kitchen wording for shared items that are out today. Names come from
// menu_components ("Festival", "Rice & peas"); sentences use them in lower case.

export const lowerFirst = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);

function joinWith(words: readonly string[], last: "or" | "and") {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} ${last} ${words.at(-1)}`;
}

/** "festival", "festival or coleslaw", "mac & cheese, festival or coleslaw" */
export const listOr = (names: readonly string[], lower = true) => joinWith(lower ? names.map(lowerFirst) : names, "or");

/** "Curry Goat and Wings" */
export const listAnd = (names: readonly string[]) => joinWith(names, "and");

export const missingSides = (box: Pick<MenuBox, "sides">) =>
  box.sides.filter((side) => !side.available).map((side) => side.name);

/** Box card note: "No festival today", or "No sides today, just the box and rice" when all are out. */
export function boxSidesNote(box: Pick<MenuBox, "sides" | "groups">) {
  const missing = missingSides(box);
  if (missing.length === 0) return null;
  if (missing.length === box.sides.length && box.sides.length > 1) {
    const group = box.groups.find((g) => g.required)?.name;
    return group ? `No sides today, just the box and ${group.toLowerCase()}` : "No sides today";
  }
  return `No ${listOr(missing)} today`;
}

/** The sides line on the box card, without anything that's out: "Rice & peas or white rice · Mac & cheese · Coleslaw". */
export function boxSidesLine(box: Pick<MenuBox, "sides" | "groups">) {
  const choices = box.groups
    .filter((group) => group.required)
    .map((group) => group.options.filter((option) => option.available).map((option) => option.name))
    .filter((names) => names.length > 0)
    .map((names) => [names[0], ...names.slice(1).map(lowerFirst)].join(" or "));
  return [...choices, ...box.sides.filter((side) => side.available).map((side) => side.name)];
}

/** Basket line and Stripe description: "(no festival today)". */
export const basketSidesNote = (missing: readonly string[]) =>
  missing.length ? `(no ${listOr(missing)} today)` : null;

/** Confirmation page and receipt: "Heads up: your box comes without festival today." */
export function orderHeadsUp(items: readonly { quantity: number; missingSides: readonly string[] }[]) {
  const missing = [...new Set(items.flatMap((item) => item.missingSides))];
  if (missing.length === 0) return null;
  const boxes = items.reduce((sum, item) => sum + item.quantity, 0);
  return `Heads up: your ${boxes === 1 ? "box comes" : "boxes come"} without ${listOr(missing)} today.`;
}

/** Kitchen card and shop email, under the item: "No festival". */
export const kitchenSidesNote = (missing: readonly string[]) =>
  missing.length ? `No ${listOr(missing)}` : null;

/** A basket line that can't be ordered as it is, worded like the checkout refusal. */
export function basketLineFlag(line: CartLine, availability: BasketAvailability | undefined): BasketFlag | null {
  const box = availability?.[line.boxId];
  if (!box) return null;
  for (const group of box.choices) {
    const gone = group.options.find((option) => line.optionIds.includes(option.id) && !option.available);
    if (!gone) continue;
    const other = group.max === 1 ? group.options.find((option) => option.available && !line.optionIds.includes(option.id)) : undefined;
    return {
      key: line.key,
      note: `${gone.name} has just run out.`,
      swap: other ? { fromId: gone.id, toId: other.id, toName: other.name } : null,
    };
  }
  return box.soldOut ? { key: line.key, note: "Sold out today.", swap: null } : null;
}

/** Shared items out today across the menu, included sides first: ["Festival", "Rice & peas"]. */
export function outToday(boxes: readonly MenuBox[]) {
  const sides = new Map<string, number>();
  const choices = new Map<string, number>();
  for (const box of boxes) {
    box.sides.forEach((side) => !side.available && sides.set(side.name, side.order));
    for (const group of box.groups) {
      for (const option of group.options) {
        if (option.component && !option.component.available) choices.set(option.component.name, option.component.order);
      }
    }
  }
  const sorted = (map: Map<string, number>) => [...map].sort((a, b) => a[1] - b[1]).map(([name]) => name);
  return [...sorted(sides), ...sorted(choices)];
}
