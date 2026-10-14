# Content to confirm before launch

Placeholders still on the site, and decisions the owners need to make. Nothing here is invented: each item shows as an obvious placeholder until it's filled in.

## Menu

- **Real prices.** Every box is priced in Admin → Menu. The development seed uses test prices only; check every box and every paid option before taking real orders. Pages with no live price show "£XX".
- **Allergens.** Each box needs its full allergen list in Admin → Menu (it's required to save). Check the sides too: rice & peas, white rice, mac & cheese, festival, coleslaw.

## Opening hours

- **Opening hours.** Set them in Admin → Settings → Opening hours. Until then the footer and Find us show "00:00 – 00:00" and online ordering stays closed.
- **ASAP time.** Currently 20 minutes (Admin → Settings → Collection times). Last ASAP orders are this long before closing.

## Collection slots (decisions)

- **Orders per slot.** Default 6 per 15-minute slot. Is that right for a busy Friday? Count boxes rather than orders? (Today it counts orders, whatever their size.)
- **Slot length.** Default 15 minutes; 10, 20, 30 or 60 are available.
- **First and last slot.** The first slot of a day starts once the ASAP time has passed after opening (e.g. 12:00 opening, 20 min → 12:30 on a 15-minute grid). The last slot ends at closing. Confirm.
- **Days ahead.** Default 7. Same-day booking stops 30 minutes before closing.
- **Paid into a full slot.** If a slot fills while someone is paying, their order is kept and marked "Over slot capacity" on the kitchen board. Someone may want to call them.
- **Pause.** While paused, customers can still book later times (Settings → "Take orders for later times while paused"). Confirm that's wanted.
- **Late-night sessions.** A session running past midnight belongs to the day it opened.

## Contact and print

- **Shop phone number.** The header, footer and Find us show **01632 960000**, an Ofcom fictional number. Replace `phone` in `lib/site.ts` with the real number (display text and `tel:` link). Also set `shopPhone` there so it appears in the cancellation and "ready" emails (today they say "reply to this email").
- **Privacy policy and terms.** `/privacy` and `/terms` are placeholders ("Policy to follow — XXXX"). Add the real wording before launch.
- **Web address on the QR artwork.** The QR code itself links to `NEXT_PUBLIC_SITE_URL/order?src=qr`. The printed text under it reads "flowerskitchen.XXX/order" (`QR_DISPLAY_URL` in `lib/qr/order-qr.ts`). Update it once the domain is live, and set `NEXT_PUBLIC_SITE_URL` to the real https address before printing.
- **Stripe business details.** Business name, statement descriptor ("FLOWERS KITCHEN") and support email in the Stripe dashboard.
