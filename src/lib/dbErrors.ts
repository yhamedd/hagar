export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; cause?: unknown; data?: { code?: unknown } };
  if (value.code === "23505" || value.data?.code === "23505") return true;
  return isUniqueViolation(value.cause);
}
