import { openingHours } from "@/lib/site";

export function OpeningHoursTable({ className = "" }: { className?: string }) {
  return (
    <table className={`w-full ${className}`}>
      <caption className="sr-only">Opening hours</caption>
      <tbody>
        {openingHours.map(({ day, hours }) => (
          <tr key={day} className="border-b border-hairline">
            <th
              scope="row"
              className="py-2.5 pr-6 text-left font-normal text-muted"
            >
              {day}
            </th>
            <td className="py-2.5 text-right tabular-nums">{hours}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
