"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { cart } from "@/lib/ordering/cart-store";
import { clearOrderSource } from "@/lib/ordering/order-source";

// Ported from the template's checkout-confirmation-client polling: the page never decides
// payment itself; it waits for the Stripe webhook to mark the order paid.
const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_MS = 90_000;
const STILL_WAITING_AFTER_MS = 30_000;

type Status = { paymentStatus: string; orderStatus: string };

export function PaymentStatusPoller({ token, initial }: { token: string; initial: Status }) {
  const router = useRouter();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let stopped = false;
    const begin = Date.now();
    const poll = window.setInterval(async () => {
      const spent = Date.now() - begin;
      setElapsed(spent);
      if (spent >= POLL_MAX_MS) {
        window.clearInterval(poll);
        return;
      }
      try {
        const response = await fetch(`/api/orders/${token}`, { cache: "no-store" });
        if (!response.ok || stopped) return;
        const next = (await response.json()) as Status;
        if (next.paymentStatus !== initial.paymentStatus || next.orderStatus !== initial.orderStatus) {
          window.clearInterval(poll);
          router.refresh();
        }
      } catch {
        // Offline for a moment: try again on the next tick.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearInterval(poll);
    };
  }, [token, initial.paymentStatus, initial.orderStatus, router, startedAt]);

  if (elapsed >= POLL_MAX_MS) {
    return (
      <div role="status">
        <p className="text-lg">
          We haven&apos;t had confirmation from the bank yet. If your payment went through, we&apos;ll email your receipt.
          Please don&apos;t pay again.
        </p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setElapsed(0);
            setStartedAt(Date.now());
            router.refresh();
          }}
        >
          Check again
        </Button>
      </div>
    );
  }

  return (
    <p role="status" className="text-lg">
      {elapsed >= STILL_WAITING_AFTER_MS
        ? "Still waiting for confirmation from your bank. This can take a minute. Please don't pay again."
        : "Confirming your payment…"}
    </p>
  );
}

/** Empties the basket once the order is paid. */
export function ClearBasket() {
  useEffect(() => {
    cart.clear();
    clearOrderSource();
  }, []);
  return null;
}
