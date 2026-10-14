import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PrintButton } from "@/components/admin/PrintButton";
import { requireActiveAdmin } from "@/lib/admin/guards";
import { orderQrCodeSvg, qrDisplayUrl } from "@/lib/qr/order-qr";

export const metadata: Metadata = { title: "QR counter card" };

const PRINT_CSS = `
@page { size: 105mm 148mm; margin: 0; }
@media print {
  html, body { background: #F3EADB !important; }
  [data-print-hide] { display: none !important; }
  [data-card-sheet] { padding: 0 !important; min-height: 0 !important; }
  [data-card] { box-shadow: none !important; border: 0 !important; margin: 0 !important; }
}
[data-card] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

export default function QrCardPage() {
  return (
    <main data-card-sheet className="flex min-h-dvh flex-col items-center bg-paper px-4 py-8">
      <style>{PRINT_CSS}</style>
      <Suspense fallback={<p className="text-muted">Loading the card…</p>}>
        <Card />
      </Suspense>
    </main>
  );
}

async function Card() {
  await requireActiveAdmin();
  const qr = await orderQrCodeSvg();

  return (
    <>
      <div data-print-hide className="mb-6 flex w-full max-w-[105mm] flex-wrap items-center justify-between gap-3">
        <Link href="/admin/settings#qr-heading" className="inline-flex min-h-11 items-center font-semibold underline decoration-sorrel underline-offset-4">
          Back to settings
        </Link>
        <PrintButton />
        <p className="w-full text-[15px] text-muted">
          A6 (105 × 148 mm). In the print window choose A6 paper, or Save as PDF. Turn off headers and footers.
        </p>
      </div>

      <article
        data-card
        aria-label="Counter card"
        className="flex h-[148mm] w-[105mm] flex-col items-center border border-hairline bg-cream px-[9mm] pb-[8mm] pt-[9mm] text-center text-pimento"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- printed artwork; the SVG must load at full fidelity */}
        <img src="/brand/flowers-kitchen_horizontal_full-colour.svg" alt="Flowers Kitchen" className="h-auto w-[56mm]" />

        <p className="mt-[6mm] flex items-center gap-3 text-[10pt] font-semibold uppercase tracking-[0.32em] text-sorrel">
          <span aria-hidden className="h-px w-[8mm] bg-allspice" />
          Scan to order
          <span aria-hidden className="h-px w-[8mm] bg-allspice" />
        </p>

        <div className="mt-[3mm] w-[60mm]" dangerouslySetInnerHTML={{ __html: qr }} />

        <p className="mt-[3mm] font-display text-[17pt] font-semibold leading-[1.15] tracking-[-0.01em]">
          Skip the queue — order and pay on your phone
        </p>
        <p className="mt-auto text-[9.5pt] font-semibold uppercase tracking-[0.18em]">Collection only · Halal</p>
        <p className="mt-[1.5mm] text-[9pt] text-muted">{qrDisplayUrl()}</p>
      </article>
    </>
  );
}
