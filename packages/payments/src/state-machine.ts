/**
 * Escrow state machine (Module E). Mirrors the booking state machine's strict
 * transition-table style. No state may be skipped; every transition in the app
 * is paired with an AuditLog row in the same transaction (Riaya non-negotiable #4).
 *
 *   pending ──[gateway authorize]──→ authorized   (family card pre-authorized)
 *   authorized ──[session starts]──→ captured      (charge captured)
 *   authorized ──[booking cancel]──→ refunded      (released pre-auth, no charge)
 *   captured ──[dispute window passes / reviews]──→ released  (caregiver paid)
 *   captured ──[family disputes]──→ disputed        (admin mediates)
 *   captured ──[cancel w/ refund]──→ refunded        (admin / late cancel)
 *   disputed ──[admin: release]──→ released
 *   disputed ──[admin: refund]──→ refunded
 *
 * `released` and `refunded` are terminal.
 */
export type EscrowStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "released"
  | "refunded"
  | "disputed";

const TRANSITIONS: Record<EscrowStatus, readonly EscrowStatus[]> = {
  pending: ["authorized", "refunded"],
  authorized: ["captured", "refunded"],
  captured: ["released", "disputed", "refunded"],
  disputed: ["released", "refunded"],
  released: [],
  refunded: [],
};

export class EscrowTransitionError extends Error {
  constructor(
    public readonly from: EscrowStatus,
    public readonly to: EscrowStatus
  ) {
    super(`Illegal escrow transition: ${from} → ${to}`);
    this.name = "EscrowTransitionError";
  }
}

export function isTerminalEscrow(status: EscrowStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function canTransitionEscrow(from: EscrowStatus, to: EscrowStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertEscrowTransition(from: EscrowStatus, to: EscrowStatus): void {
  if (!canTransitionEscrow(from, to)) throw new EscrowTransitionError(from, to);
}
