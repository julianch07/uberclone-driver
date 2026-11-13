// AI-assisted: see docs/AI_LOG.md #19

/**
 * Checks whether an asynchronous trip reconciliation still belongs
 * to the current driver and has not been superseded by another action.
 *
 * Subscription cleanup must not invalidate an already-started
 * reconciliation; its version and identity determine validity.
 */
export function isCurrentTripRecovery({
  mounted,
  currentKey,
  expectedKey,
  currentVersion,
  expectedVersion,
  selectedTripId,
}) {
  return (
    mounted === true &&
    currentKey === expectedKey &&
    currentVersion === expectedVersion &&
    selectedTripId === null
  );
}
