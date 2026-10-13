import { SIDES } from "@/lib/menu";
import { Dotted } from "./Dotted";

const [first, ...rest] = SIDES.split(" · ");
const items = [first.charAt(0).toLowerCase() + first.slice(1), ...rest];

export function SidesSentence({
  prefix = "Every box comes with",
  className = "",
}: {
  prefix?: string;
  className?: string;
}) {
  return (
    <p className={className}>
      {prefix} <Dotted items={items} />
    </p>
  );
}
