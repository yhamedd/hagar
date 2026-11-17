/**
 * Technician and service lists change rarely but are requested on every
 * booking. Let the CDN answer for a minute and refresh in the background, so
 * most visitors never wait on the database; an admin edit shows up within
 * about a minute.
 */
export const PUBLIC_CATALOG_CACHE = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
} as const;
