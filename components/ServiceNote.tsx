import { serviceNotes } from "@/lib/site";
import { Dotted } from "./Dotted";

export function ServiceNote({ className = "" }: { className?: string }) {
  return (
    <p className={className}>
      <Dotted items={serviceNotes} />
    </p>
  );
}
