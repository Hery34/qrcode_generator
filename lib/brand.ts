/** Identité fixe — non modifiable dans l’interface */
export const BRAND_COMPANY_NAME = 'Annexx';

/** Logo officiel (`public/`) */
export const BRAND_LOGO_URL = '/logo.png';

/** Site web officiel — non modifiable */
export const BRAND_WEBSITE_URL = 'https://www.annexx.com/';

/** Accroche par défaut (synthèse du pitch com’ — courte, lisible sur fiche / QR) */
export const BRAND_DEFAULT_TAGLINE =
  'Self-stockage pour particuliers et pros : box de 1 à 100 m², centres sécurisés, accès 7j/7, sans engagement.';

/** Description par défaut (synthèse B2C & B2B — quelques phrases, pas le boilerplate intégral) */
export const BRAND_DEFAULT_DESCRIPTION =
  'Annexx est un acteur français du self-stockage avec un réseau national de centres sécurisés. Vous louez la surface dont vous avez besoin, en ligne, avec une offre claire pour les ménages comme pour les entreprises.';

/**
 * Couleur d’accent (QR, boutons, en-têtes) — source unique pour la charte.
 * Les variables CSS `--brand`, `--brand-hover`, … sont injectées sur `<body>` depuis ces valeurs.
 */
export const BRAND_ACCENT_HEX = '#CD2927';

export const BRAND_ACCENT_HOVER_HEX = '#E04A48';
export const BRAND_INK_HEX = '#8F221F';
export const BRAND_DEEP_HEX = '#6E1B19';
export const BRAND_SOFT_HEX = '#FFF0F0';
export const BRAND_MIST_HEX = '#FFE8E7';
export const BRAND_CREAM_HEX = '#FAF6F6';

/** Appliqué sur `<body>` pour alimenter `globals.css` / Tailwind (`var(--brand)`, etc.) */
export const brandCssVariables = {
  '--brand': BRAND_ACCENT_HEX,
  '--brand-hover': BRAND_ACCENT_HOVER_HEX,
  '--brand-ink': BRAND_INK_HEX,
  '--brand-deep': BRAND_DEEP_HEX,
  '--brand-soft': BRAND_SOFT_HEX,
  '--brand-mist': BRAND_MIST_HEX,
  '--brand-cream': BRAND_CREAM_HEX,
} as const;
