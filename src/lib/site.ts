/** Single source of truth for the salon's public contact details and policies. */
export const SITE = {
  name: "Hagar Lashes & Nails",
  location: "Agora Mall, New Cairo",
  mapsUrl: "https://maps.app.goo.gl/EzPcSawmXD3QJhJ2A?g_st=ic",
  /** Salon WhatsApp in international format, digits only. */
  whatsappNumber: "201000062272",
  instapayDisplay: "0100 006 2272",
  instagramDmUrl: "https://ig.me/m/hagar.lashes",
  reviewUrl: "https://g.page/review/hagarlashes",
  depositEgp: 1000,
  depositHoldHours: 12,
  lateGraceMinutes: 20,
} as const;

export const DEPOSIT_SCREENSHOT_MESSAGE =
  "Hi, I just made a deposit for my booking. Here’s my payment screenshot.";

export const TOTAL_BOOKING_STEPS = 6;
