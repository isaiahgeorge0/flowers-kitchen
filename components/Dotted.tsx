import { Fragment } from "react";

export function Dotted({ items }: { items: readonly string[] }) {
  return items.map((item, i) => (
    <Fragment key={item}>
      {/* Non-breaking space keeps the dot with the previous item when lines wrap. */}
      {i > 0 && "\u00A0· "}
      <span className="whitespace-nowrap">{item}</span>
    </Fragment>
  ));
}
