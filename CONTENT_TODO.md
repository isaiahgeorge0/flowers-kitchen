# Content to confirm before launch

Every placeholder still on the site, grouped by what the client needs to supply. Nothing here is invented: each item shows as an obvious placeholder (£XX, 00:00, XXXX, "To be confirmed", "Photo to follow") until it's filled in.

## 1. Business and legal details

Used on `/privacy` and `/terms`. All four live in the `legal` constant in `lib/site.ts`.

- **Legal entity name.** The business behind Flowers Kitchen: a limited company, partnership or sole trader name. Shows as "[Legal entity name — XXXX]".
- **Full postal address.** Street number and postcode. Shows as "XX St Helen's Street, Ipswich XXXX XXX". The rest of the site just says "St Helen's Street, Ipswich" (`address` in `lib/site.ts`). Add the postcode to the JSON-LD in `app/(site)/layout.tsx` too.
- **Shop email.** For privacy requests and order questions. Shows as "[shop email — XXXX]".
- **Founding year.** The primary logo artwork reads "FLOWERS & SONS · EST. XXXX". It appears in the footer and on the link-preview image (`app/opengraph-image.tsx`). The logo files in `public/brand/` need re-exporting with the real year. Don't edit the SVGs by hand.
- **"Last updated" date** on both policies. Shows as "XXXX". Set it when the client signs off the wording.

## 2. Phone number

- **Shop phone.** The header, site menu, footer, the home page's Find us section, `/find-us` and `/terms` show **01632 960000**, an Ofcom fictional number. Replace `phone` in `lib/site.ts` (display text and `tel:` link).
- **Phone in emails.** Set `shopPhone` in `lib/site.ts` so it appears in the cancellation and "ready" emails. Until then they say "reply to this email".
- **JSON-LD.** Add `telephone` in `app/(site)/layout.tsx` once confirmed. A TODO there marks the spot.

## 3. Privacy policy decisions (`app/(site)/privacy/page.tsx`)

The page is a full draft and needs the client's review before launch. It's marked "Draft — to be reviewed by the client before launch" at the top of the file.

- **How long enquiries are kept.** "XX months after we last hear from you". There's a TODO in the file.
- **How long orders are kept.** "X years, for our accounts". Usually set by the accountant.
- **Check the processors list.** Vercel (hosting and cookieless visitor counts), Supabase (storage), Resend (email) and Stripe (payments). Tell us if you add any other service.
- **"We don't use your details for marketing."** If the client ever wants a mailing list, this line and the lawful basis need updating first.

## 4. Terms of sale decisions (`app/(site)/terms/page.tsx`)

This page is also a full draft, marked the same way.

- **Uncollected orders.** How long an order is kept, and whether it's refunded. Shown in a dashed "To be confirmed — XXXX" box.
- **Cancellations and refunds.** Whether customers can cancel after paying, up to when, and what happens if something is wrong with the food. Shown in a dashed box.
- **VAT.** "Prices include VAT where applicable (VAT status to be confirmed — XXXX)". Is the business VAT-registered?
- **The wording overall.** "Your order", "Collection", "Allergens", "Prices and payment" and "The law" (England and Wales) describe how the site works today. Confirm they match how the shop runs.

## 5. Menu

- **Real prices.** Every box is priced in Admin → Menu. The development seed (`supabase/seed_dev_menu.sql`) sets every box to £10.00. Check every box and every paid option before taking real orders. The home and menu pages fall back to "£XX" (`lib/menu.ts`) for any box without a live price.
- **Allergens.** Each box needs its full allergen list in Admin → Menu. The seed says "TO BE CONFIRMED". Until a list is entered, the order cards say "To be confirmed" (`components/order/OrderBoxCard.tsx`) and the item sheet says "To be confirmed. Please ask us before you order." (`components/order/ItemSheet.tsx`). Check the sides too: rice & peas, white rice, mac & cheese, festival, coleslaw.
- **Most popular.** `/order` shows the featured boxes (Jerk Chicken, Fried Chicken, BBQ Chicken) under "Most popular" and the rest under "More boxes". The featured flag is `is_featured_item` on the active menu. Confirm these three really are the best sellers.
- **Catering prices.** The catering builder shows "From £XX per head" and "Estimated total £XX" (`lib/catering.ts`) until per-head pricing is set.
- **JSON-LD price range.** Add `priceRange` in `app/(site)/layout.tsx` once prices are set.

## 6. Opening hours

- **Opening hours.** Set them in Admin → Settings → Opening hours. Until then the footer and Find us show "00:00 – 00:00" (`lib/ordering/hours.ts`) and online ordering stays closed.
- **JSON-LD hours.** Add `openingHoursSpecification` in `app/(site)/layout.tsx` once confirmed.
- **ASAP time.** Currently 20 minutes (Admin → Settings → Collection times). Last ASAP orders are this long before closing.

## 7. Photography

Every placeholder below is a light panel with a hibiscus outline, the caption and "Photo to follow" (`components/Photo.tsx`).

| Where | Caption | File |
| --- | --- | --- |
| Home hero | Hero photo | `app/(site)/page.tsx` |
| Home catering band | Event photo | `app/(site)/page.tsx` |
| Home and `/menu` box cards (×7) | Food photo | `components/BoxCard.tsx`, set `image` per box in `lib/menu.ts` |
| `/order` box cards (×7) | Food photo | `components/order/OrderBoxCard.tsx`, set `image_url` on each `menu_template_items` row |
| Our story, top | Family archive photo | `app/(site)/our-story/page.tsx` |
| Our story, Jamaica | Archive photo | `app/(site)/our-story/page.tsx` |
| Our story, Ipswich | Ipswich photo | `app/(site)/our-story/page.tsx` |
| Our story, the brothers | Asher & Tajay photo | `app/(site)/our-story/page.tsx` |

- **Our story copy.** `app/(site)/our-story/page.tsx` is marked "Copy to be reviewed with the family before launch".

## 8. Collection slots (decisions)

- **Orders per slot.** Default 6 per 15-minute slot. Is that right for a busy Friday? Should it count boxes rather than orders? Today it counts orders, whatever their size.
- **Slot length.** Default 15 minutes; 10, 20, 30 or 60 are available.
- **First and last slot.** The first slot of the day starts once the ASAP time has passed after opening (e.g. 12:00 opening, 20 min → 12:30 on a 15-minute grid). The last slot ends at closing. Confirm.
- **Days ahead.** Default 7. Same-day booking stops 30 minutes before closing.
- **Paid into a full slot.** If a slot fills while someone is paying, their order is kept and marked "Over slot capacity" on the kitchen board. Someone may want to call them.
- **Pause.** While paused, customers can still book later times (Settings → "Take orders for later times while paused"). Confirm that's wanted.
- **Late-night sessions.** A session running past midnight belongs to the day it opened.

These rules are also written up in `lib/ordering/schedule.ts`.

## 9. Launch settings (for whoever deploys)

- **`NEXT_PUBLIC_SITE_URL=https://flowerskitchen.co.uk`** in Vercel (Production). Every absolute URL comes from it: canonical links, the Open Graph image, `sitemap.xml`, `robots.txt`, JSON-LD, Stripe return pages, and the QR code and the address printed under it (`lib/site-url.ts`). Locally it's `http://localhost:3000`.
- **Reprint the QR artwork after the domain is live.** The printed address now reads the real domain ("flowerskitchen.co.uk/order") from that setting.
- **Vercel Web Analytics.** Turn it on in the Vercel project (Analytics tab). It's cookieless; the `<Analytics />` component is already in `app/layout.tsx`.
- **Email addresses.** Orders and catering use separate addresses (`lib/env.ts`, `lib/email-senders.ts`). Set these in Vercel as plain addresses; the code adds the sender names "Flowers Kitchen" and "Flowers Kitchen Catering".
  - `ORDERS_FROM_EMAIL=orders@flowerskitchen.co.uk`: sends every order email (confirmation, ready, cancellation, and the shop's "New order" alert).
  - `ORDERS_TO_EMAIL=orders@flowerskitchen.co.uk`: gets the "New order" alert and customers' replies to order emails.
  - `ENQUIRY_FROM_EMAIL=catering@flowerskitchen.co.uk`: sends catering emails (the shop notification and the customer's "Thanks — we've got your enquiry").
  - `ENQUIRY_TO_EMAIL=catering@flowerskitchen.co.uk`: gets new enquiries and customers' replies to the confirmation.
- **Resend domain.** Verify flowerskitchen.co.uk in Resend before launch. Until then Resend only delivers to the account owner, so customer emails (order emails and the catering confirmation) won't reach customers. Make sure both the orders@ and catering@ inboxes exist so replies land somewhere.
- **Stripe business details.** Business name, statement descriptor ("FLOWERS KITCHEN") and support email in the Stripe dashboard. The support email should be orders@flowerskitchen.co.uk, to match the order emails.
