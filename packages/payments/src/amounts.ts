import { type Money, addMoney, money, multiplyMoney, subtractMoney } from "@riaya/core";

/**
 * Platform fee split. Family pays a fee ON TOP of the caregiver's gross; the
 * caregiver's fee is deducted from their payout.
 *
 * Fee model (locked Sprint 4, supersedes the literal reading of `.claude`
 * non-negotiable #5): the family-side cap applies to `familyGross`
 * (grossAmount + family fee), NOT to the bare grossAmount. The subsidy still can
 * never make the family pay more than `familyGross - employerSubsidy`, and can
 * never exceed `familyGross` (no negative `familyPays`).
 */
export type FeeConfig = {
  /** Fee added on top of gross, charged to the family (12%). */
  familyFeeRate: number;
  /** Fee deducted from the caregiver's payout (8%). */
  caregiverFeeRate: number;
};

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  familyFeeRate: 0.12,
  caregiverFeeRate: 0.08,
};

export type EscrowAmounts = {
  /** Caregiver's gross for the session (rate × duration). */
  grossAmount: Money;
  /** Total the family owes before any employer subsidy (gross + family fee). */
  familyGross: Money;
  /** Family platform fee (12% of gross), charged on top. */
  platformFeeFromFamily: Money;
  /** Caregiver platform fee (8% of gross), deducted from payout. */
  platformFeeFromCaregiver: Money;
  /** What the caregiver receives (gross − caregiver fee). */
  caregiverPayout: Money;
  /** Employer contribution toward this booking (0 if no benefit). */
  employerSubsidy: Money;
  /** What the family actually pays (familyGross − subsidy, never negative). */
  familyPays: Money;
};

/**
 * Compute every stored escrow amount from the booking gross and (optional)
 * employer subsidy. All integer centimes; never floats. Throws if the subsidy
 * exceeds what the family owes (would imply a negative family charge) — the
 * caller must cap the subsidy at `familyGross` first.
 */
export function computeEscrowAmounts(
  grossAmount: Money,
  employerSubsidy: Money = money(0),
  config: FeeConfig = DEFAULT_FEE_CONFIG
): EscrowAmounts {
  const platformFeeFromFamily = multiplyMoney(grossAmount, config.familyFeeRate);
  const platformFeeFromCaregiver = multiplyMoney(grossAmount, config.caregiverFeeRate);
  const caregiverPayout = subtractMoney(grossAmount, platformFeeFromCaregiver);
  const familyGross = addMoney(grossAmount, platformFeeFromFamily);

  if (employerSubsidy > familyGross) {
    throw new Error(`Employer subsidy (${employerSubsidy}) exceeds family total (${familyGross})`);
  }
  const familyPays = subtractMoney(familyGross, employerSubsidy);

  return {
    grossAmount,
    familyGross,
    platformFeeFromFamily,
    platformFeeFromCaregiver,
    caregiverPayout,
    employerSubsidy,
    familyPays,
  };
}

/**
 * Cap a desired employer subsidy so it never exceeds what the family owes
 * (`familyGross`) — Riaya non-negotiable #5. Returns the largest subsidy that is
 * both ≤ the available employer budget and ≤ familyGross.
 */
export function capSubsidy(desired: Money, availableBudget: Money, familyGross: Money): Money {
  return money(Math.max(0, Math.min(desired, availableBudget, familyGross)));
}
