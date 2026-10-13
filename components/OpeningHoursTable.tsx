import { openingHoursRows } from "@/lib/ordering/hours";
import { getOrderingSettings } from "@/lib/ordering/menu";

export async function OpeningHoursTable({ className = "" }: { className?: string }) {
  const { openingHours } = await getOrderingSettings();
  return (
    <table className={`w-full ${className}`}>
      <caption className="sr-only">Opening hours</caption>
      <tbody>
        {openingHoursRows(openingHours).map(({ day, hours }) => (
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
