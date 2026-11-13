// AI-assisted: see docs/AI_LOG.md #20

export const TRIP_REQUEST_TIMEOUT_MS = 20_000;

export function getTripRequestRemainingSeconds(
  firstSeenAt,
  now = Date.now()
) {
  if (
    !Number.isFinite(firstSeenAt) ||
    !Number.isFinite(now)
  ) {
    return 0;
  }

  const remainingMs =
    TRIP_REQUEST_TIMEOUT_MS - (now - firstSeenAt);

  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function isTripRequestExpired(firstSeenAt, now = Date.now()) {
  return getTripRequestRemainingSeconds(firstSeenAt, now) === 0;
}
