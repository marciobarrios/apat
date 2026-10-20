export type ImportState =
  | "queued"
  | "acquiring"
  | "extracting"
  | "validating"
  | "needs_review"
  | "ready"
  | "failed"
  | "cancelled"
  | "paid_outcome_unknown";
const transitions: Record<ImportState, readonly ImportState[]> = {
  queued: ["acquiring", "cancelled", "failed"],
  acquiring: ["extracting", "failed", "cancelled"],
  extracting: ["validating", "paid_outcome_unknown", "failed", "cancelled"],
  validating: ["needs_review", "failed", "cancelled"],
  needs_review: ["ready", "cancelled"],
  ready: [],
  failed: [],
  cancelled: [],
  paid_outcome_unknown: [],
};
export function transition(current: ImportState, next: ImportState): ImportState {
  if (!transitions[current].includes(next)) throw new Error("Invalid import transition");
  return next;
}
