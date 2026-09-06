import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * True when the request proves knowledge of the shared `CRON_SECRET`, supplied
 * either as an `Authorization: Bearer <secret>` header or a `?secret=<secret>`
 * query parameter (some schedulers can only do one or the other). Always false
 * when `CRON_SECRET` is unset, so an unconfigured deployment exposes nothing.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ") && safeEqual(header.slice("Bearer ".length), secret)) {
    return true;
  }

  const param = new URL(request.url).searchParams.get("secret");
  return param !== null && safeEqual(param, secret);
}
