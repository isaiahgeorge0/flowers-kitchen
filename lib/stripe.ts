import "server-only";
import Stripe from "stripe";
import { stripeEnv } from "./env";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  client ??= new Stripe(stripeEnv().secretKey);
  return client;
}
