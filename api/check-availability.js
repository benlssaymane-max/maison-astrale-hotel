const { buildQuote } = require("./lib/booking");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { roomId, checkin, checkout, guests, upsells } = req.body || {};
    const quote = buildQuote({
      roomId,
      checkinStr: checkin,
      checkoutStr: checkout,
      guests,
      upsells
    });

    if (quote.error) {
      return res.status(400).json({ error: quote.error });
    }

    if (quote.remaining < 1) {
      return res.status(409).json({
        error: "unavailable",
        message: "No suite is available for this date range."
      });
    }

    return res.status(200).json({
      available: true,
      remaining: quote.remaining,
      currency: "EUR",
      roomName: quote.room.name,
      nights: quote.nights,
      subtotalCents: quote.subtotalCents,
      cityTaxCents: quote.cityTaxCents,
      serviceFeeCents: quote.serviceFeeCents,
      extrasCents: quote.extrasCents,
      totalCents: quote.totalCents
    });
  } catch (error) {
    return res.status(500).json({ error: "internal_error", details: error.message });
  }
};
