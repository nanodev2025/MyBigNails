# Nail'art Studio — site Web

Site web mobile-first pour une prothésiste ongulaire avec gestion de rendez-vous et tableau de bord admin sécurisé.

## Installation et exécution (Linux / macOS)

### 1. Installer dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Copiez `.env.local.example` en `.env.local` et configurez les variables requises:

```bash
cp .env.local.example .env.local
```

### 3. Générer un mot de passe admin sécurisé

Utilisez le script fourni pour générer un hash bcrypt du mot de passe admin:

```bash
node scripts/generate-password-hash.js votre-mot-de-passe
```

Ajoutez le hash généré à votre fichier `.env.local`:

```env
ADMIN_PASSWORD_HASH=votre_hash_généré_ici
ADMIN_JWT_SECRET=une_chaine_aléatoire_complexe_d'au_moins_32_caractères
```

### 4. Lancer en mode développement

```bash
npm run dev
```

Le site sera disponible sur http://localhost:3000

## Structure clé

- `pages/` : pages Next.js (index, admin, api/...)
- `components/` : composants UI (Header, BookingCalendar, AdminDashboard...)
- `data/` : JSON simulant la base de données (services, bookings, settings)
- `styles/` : Tailwind global CSS
- `lib/auth.js` : Fonctions d'authentification et de sécurité
- `scripts/` : Scripts utilitaires (génération de hash, etc.)

## Sécurité

### Mesures implémentées

1. **Mot de passe admin hashé** : Utilisation de bcrypt pour le stockage sécurisé
2. **JWT sécurisés** : Tokens avec expiration et signature forte
3. **Cookies sécurisés** : HttpOnly, Secure (en production), SameSite=Strict
4. **Protection contre les attaques** :
   - Rate limiting sur les réservations
   - Protection CSRF via SameSite cookies
   - Headers de sécurité (CSP, X-Frame-Options, etc.)
5. **Gestion sécurisée des secrets** : 
   - Masquage des clés API dans les logs
   - Validation des variables d'environnement

### Bonnes pratiques

- **Ne jamais committer** `.env.local` ou les fichiers dans `.gitignore`
- Utiliser des mots de passe complexes (>12 caractères, mélange de types)
- Rotater régulièrement `ADMIN_JWT_SECRET`
- En production, configurer les variables d'environnement via la plateforme (Vercel, etc.)

### Changement de mot de passe admin

1. Connectez-vous à l'interface admin (`/admin/login`)
2. Utilisez l'interface pour changer le mot de passe
3. En production : copiez le hash généré dans les variables d'environnement de votre plateforme

## Déploiement

Pour un déploiement réel:

1. **Base de données** : Remplacez la persistance locale par Supabase ou une autre base de données
2. **Variables d'environnement** : Configurez-les dans les paramètres de votre plateforme
3. **HTTPS** : Assurez-vous que votre site utilise HTTPS (obligatoire pour les cookies Secure)

## Design

Thème girly (rose poudré, nude, accents dorés), typographie élégante, coins arrondis, optimisé pour mobile.
