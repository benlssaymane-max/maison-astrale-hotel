# Maison Astrale Hotel

Site vitrine ultra premium pour hôtel de luxe avec moteur de réservation et paiement Stripe Checkout.

## Production
- https://maison-astrale-hotel.vercel.app

## Stack
- HTML/CSS/JavaScript
- API serverless Vercel (`/api`)
- Stripe Checkout

## Configuration Stripe (Vercel)
Ajouter dans Vercel Project Settings > Environment Variables:
- `STRIPE_SECRET_KEY` = votre clé secrète Stripe (live ou test)

## Développement local
```bash
npm install
vercel dev
```

## Endpoints
- `POST /api/check-availability`
- `POST /api/create-checkout-session`

## Notes
- La logique de disponibilité est côté serveur pour éviter la manipulation côté client.
- Le paiement est redirigé vers Stripe Checkout (sécurisé).
