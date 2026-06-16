// Payments & escrow (Module E, Sprint 4). Pure logic + gateway abstraction.
// DB orchestration lives in apps/web (escrow-service) and apps/worker (sweeps).
export {
  type FeeConfig,
  type EscrowAmounts,
  DEFAULT_FEE_CONFIG,
  computeEscrowAmounts,
  capSubsidy,
} from "./amounts.js";
export {
  type EscrowStatus,
  EscrowTransitionError,
  isTerminalEscrow,
  canTransitionEscrow,
  assertEscrowTransition,
} from "./state-machine.js";
export {
  type GatewaySession,
  type CaptureResult,
  type RefundResult,
  type PayoutRef,
  type BankDetails,
  type PaymentGateway,
  DevGateway,
  gateway,
} from "./gateway.js";
