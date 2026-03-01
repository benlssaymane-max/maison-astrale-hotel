const ROOM_CATALOG = {
  suite_signature: {
    name: "Suite Signature Mer",
    nightlyRateCents: 180000,
    inventory: 6
  },
  chambre_prestige: {
    name: "Chambre Prestige Jardin",
    nightlyRateCents: 110000,
    inventory: 10
  },
  penthouse_astrale: {
    name: "Penthouse Astrale",
    nightlyRateCents: 320000,
    inventory: 2
  }
};

function parseDateInput(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function calculateNights(checkin, checkout) {
  const oneDay = 24 * 60 * 60 * 1000;
  const diff = checkout.getTime() - checkin.getTime();
  return Math.floor(diff / oneDay);
}

function hashForAvailability(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildQuote({ roomId, checkinStr, checkoutStr, guests }) {
  const room = ROOM_CATALOG[roomId];
  if (!room) {
    return { error: "invalid_room" };
  }

  const checkin = parseDateInput(checkinStr);
  const checkout = parseDateInput(checkoutStr);
  if (!checkin || !checkout) {
    return { error: "invalid_dates" };
  }

  const nights = calculateNights(checkin, checkout);
  if (nights < 1 || nights > 30) {
    return { error: "invalid_stay_length" };
  }

  const guestsCount = Number(guests);
  if (!Number.isInteger(guestsCount) || guestsCount < 1 || guestsCount > 4) {
    return { error: "invalid_guests" };
  }

  const availabilitySeed = hashForAvailability(`${roomId}-${checkinStr}-${checkoutStr}`);
  const reserved = availabilitySeed % room.inventory;
  const remaining = room.inventory - reserved;

  const subtotalCents = room.nightlyRateCents * nights;
  const cityTaxCents = 450 * guestsCount * nights;
  const serviceFeeCents = Math.round(subtotalCents * 0.045);
  const totalCents = subtotalCents + cityTaxCents + serviceFeeCents;

  return {
    room,
    nights,
    guests: guestsCount,
    checkinStr,
    checkoutStr,
    remaining,
    subtotalCents,
    cityTaxCents,
    serviceFeeCents,
    totalCents
  };
}

module.exports = {
  ROOM_CATALOG,
  buildQuote
};
