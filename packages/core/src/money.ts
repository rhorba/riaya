declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

/** Integer centimes (MAD). 100 centimes = 1 dirham. NEVER a float. */
export type Money = Brand<number, "Money">;

export function money(centimes: number): Money {
  if (!Number.isInteger(centimes))
    throw new Error(`Money must be integer centimes, got: ${centimes}`);
  if (centimes < 0) throw new Error(`Money cannot be negative: ${centimes}`);
  return centimes as Money;
}

export function addMoney(a: Money, b: Money): Money {
  return money(a + b);
}

export function subtractMoney(a: Money, b: Money): Money {
  return money(a - b);
}

export function multiplyMoney(amount: Money, factor: number): Money {
  return money(Math.round(amount * factor));
}

/** Format for display: 1500 → "15,00 MAD" */
export function formatMoney(amount: Money, locale = "fr-MA"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

/** Platform fee from family side (12%) */
export function platformFeeFromFamily(grossAmount: Money): Money {
  return money(Math.round(grossAmount * 0.12));
}

/** Platform fee from caregiver side (8%) */
export function platformFeeFromCaregiver(grossAmount: Money): Money {
  return money(Math.round(grossAmount * 0.08));
}

/** Caregiver payout after platform fee */
export function caregiverPayout(grossAmount: Money): Money {
  return subtractMoney(grossAmount, platformFeeFromCaregiver(grossAmount));
}
