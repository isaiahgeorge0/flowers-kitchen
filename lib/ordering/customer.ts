// Checkout details. Shared so the form and the server give the same messages.

export type CustomerValues = { name: string; phone: string; email: string; note: string };
export type CustomerErrors = Partial<Record<keyof CustomerValues, string>>;

export const CUSTOMER_LIMITS = { name: 80, phone: 20, email: 254, note: 300 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "+44 7700 900123" → "07700900123". */
export function normalisePhone(value: string) {
  const compact = value.replace(/[\s\-().]/g, "");
  if (compact.startsWith("+44")) return `0${compact.slice(3)}`;
  if (compact.startsWith("0044")) return `0${compact.slice(4)}`;
  return compact;
}

export function cleanCustomer(values: CustomerValues): CustomerValues {
  return {
    name: values.name.trim().replace(/\s+/g, " "),
    phone: normalisePhone(values.phone.trim()),
    email: values.email.trim().toLowerCase(),
    note: values.note.trim(),
  };
}

export function validateCustomer(values: CustomerValues): CustomerErrors {
  const clean = cleanCustomer(values);
  const errors: CustomerErrors = {};
  if (clean.name.length < 2) errors.name = "Enter your name.";
  else if (clean.name.length > CUSTOMER_LIMITS.name) errors.name = `Keep your name under ${CUSTOMER_LIMITS.name} characters.`;
  if (!/^07\d{9}$/.test(clean.phone)) errors.phone = "Enter a UK mobile number, like 07700 900123.";
  if (!EMAIL_RE.test(clean.email) || clean.email.length > CUSTOMER_LIMITS.email) {
    errors.email = "Enter your email address, like name@example.com.";
  }
  if (clean.note.length > CUSTOMER_LIMITS.note) errors.note = `Keep your note under ${CUSTOMER_LIMITS.note} characters.`;
  return errors;
}
