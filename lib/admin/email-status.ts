const GRACE_MS = 2 * 60_000;

/** True when an email due since `dueSince` still hasn't been stamped as sent two minutes later. */
export function emailOverdue(sentAt: string | null | undefined, dueSince: string | null, now = Date.now()) {
  return !sentAt && dueSince !== null && now - Date.parse(dueSince) > GRACE_MS;
}
