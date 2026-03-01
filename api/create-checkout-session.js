const Stripe = require("stripe");
const { buildQuote } = require("./lib/booking");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({
      error: "stripe_not_configured",
      message: "Missing STRIPE_SECRET_KEY env var"
    });
  }

  try {
    const { roomId, checkin, checkout, guests, name, email, locale } = req.body || {};
    const quote = buildQuote({
      roomId,
      checkinStr: checkin,
      checkoutStr: checkout,
      guests
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

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia"
    });

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const successUrl = `${origin}/?payment=success`;
    const cancelUrl = `${origin}/?payment=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      locale: locale === "fr" ? "fr" : "en",
      metadata: {
        guest_name: name || "Guest",
        room_id: roomId,
        checkin,
        checkout,
        guests: String(quote.guests)
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: quote.subtotalCents,
            product_data: {
              name: `${quote.room.name} (${quote.nights} nuits)`
            }
          }
        },
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: quote.serviceFeeCents,
            product_data: {
              name: "Service premium"
            }
          }
        },
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: quote.cityTaxCents,
            product_data: {
              name: "Taxe de séjour"
            }
          }
        }
      ]
    });

    return res.status(200).json({
      checkoutUrl: session.url,
      quote: {
        totalCents: quote.totalCents,
        nights: quote.nights,
        roomName: quote.room.name
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "stripe_session_error", details: error.message });
  }
};
