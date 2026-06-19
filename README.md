# Nail'art Studio — site Web

Site web mobile-first pour une prothésiste ongulaire.

Installation et exécution (Linux / macOS):

1. Installer dépendances

```bash
npm install
```

2. Lancer en mode développement

```bash
npm run dev
```

Le site sera disponible sur http://localhost:3000

Structure clé:
- `pages/` : pages Next.js (index, admin, api/...)
- `components/` : composants UI (Header, BookingCalendar, AdminDashboard...)
- `data/` : JSON simulant la base de données (services, bookings, settings)
- `styles/` : Tailwind global CSS

Notes:
- L'API est minimale et stocke les rendez-vous dans `data/bookings.json`.
- Pour un déploiement réel, remplacez la persistance par une vraie base de données.

Design: thème girly (rose poudré, nude, accents dorés), typographie élégante, coins arrondis.
