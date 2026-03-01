const Stripe = require("stripe");
const { buildQuote, UPSELLS } = require("./lib/booking");

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
    const { roomId, checkin, checkout, guests, name, email, locale, upsells } = req.body || {};
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

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia"
    });

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const successUrl = `${origin}/?payment=success`;
    const cancelUrl = `${origin}/?payment=cancel`;

    const lineItems = [
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
    ];

    quote.upsells.forEach((item) => {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: UPSELLS[item].amountCents,
          product_data: {
            name: UPSELLS[item].name
          }
        }
      });
    });

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
        guests: String(quote.guests),
        upsells: quote.upsells.join(",") || "none"
      },
      line_items: lineItems
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
