import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  BRAND_ACCENT_HEX,
  BRAND_COMPANY_NAME,
  BRAND_DEFAULT_DESCRIPTION,
  BRAND_DEFAULT_TAGLINE,
  BRAND_LOGO_URL,
  BRAND_WEBSITE_URL,
} from '@/lib/brand';
import { getPublishedCardBySlug } from '@/lib/public-card';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = await getPublishedCardBySlug(slug);

  if (!card) {
    return {
      title: 'Fiche introuvable',
    };
  }

  return {
    title: `${BRAND_COMPANY_NAME} — Fiche publique`,
    description: (() => {
      const raw =
        card.company_tagline?.trim() ||
        card.company_description?.trim() ||
        BRAND_DEFAULT_DESCRIPTION;
      const max = 158;
      return raw.length <= max ? raw : `${raw.slice(0, max - 1).trimEnd()}…`;
    })(),
  };
}

export default async function PublicCardPage({ params }: PageProps) {
  const { slug } = await params;
  const card = await getPublishedCardBySlug(slug);

  if (!card) {
    notFound();
  }

  const primaryContact = card.business_contacts?.find((contact) => contact.is_primary) ?? card.business_contacts?.[0];
  const accentColor = BRAND_ACCENT_HEX;
  const displayTagline = card.company_tagline?.trim() || BRAND_DEFAULT_TAGLINE;
  const displayDescription = card.company_description?.trim() || BRAND_DEFAULT_DESCRIPTION;
  const addressLines = [card.address_line_1, card.address_line_2, [card.postal_code, card.city].filter(Boolean).join(' '), card.country]
    .map((line) => (line ?? '').trim())
    .filter(Boolean);

  return (
    <main
      className="min-h-screen px-4 py-8 text-slate-950"
      style={{ background: 'linear-gradient(180deg, var(--brand-mist) 0%, #f8fafc 100%)' }}
    >
      <div className="mx-auto max-w-4xl">
        <div
          className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.5)]"
          style={{ boxShadow: `0 30px 90px -40px ${accentColor}66` }}
        >
          <div
            className="px-6 py-8 sm:px-10"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, var(--brand-deep) 100%)`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Fiche publique</div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">{BRAND_COMPANY_NAME}</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-white/85">{displayTagline}</p>
              </div>
              <div className="shrink-0 overflow-hidden rounded-[1.5rem] bg-white/95 p-3">
                <Image
                  src={BRAND_LOGO_URL}
                  alt={BRAND_COMPANY_NAME}
                  width={88}
                  height={88}
                  className="h-[88px] w-[88px] object-contain"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[1.15fr_0.85fr]">
            <section>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Entreprise</h2>
                <p className="mt-4 text-base leading-8 text-slate-700">{displayDescription}</p>
              </div>

              {addressLines.length > 0 ? (
                <div className="mt-8">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Adresse</h2>
                  <div className="mt-4 space-y-1 text-base text-slate-700">
                    {addressLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {card.company_phone ? (
                  <a href={`tel:${card.company_phone}`} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-slate-300">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Téléphone</div>
                    <div className="mt-2 text-base font-medium text-slate-900">{card.company_phone}</div>
                  </a>
                ) : null}
                {card.company_email ? (
                  <a href={`mailto:${card.company_email}`} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-slate-300">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email</div>
                    <div className="mt-2 text-base font-medium text-slate-900">{card.company_email}</div>
                  </a>
                ) : null}
                <a
                  href={BRAND_WEBSITE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-brand/40 hover:bg-brand-soft/50 sm:col-span-2"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Site web</div>
                  <div className="mt-2 break-all text-base font-medium text-slate-900">
                    {new URL(BRAND_WEBSITE_URL).hostname}
                  </div>
                </a>
              </div>
            </section>

            <aside className="rounded-[1.75rem] bg-brand-deep p-6 text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Contact principal</div>
              <div className="mt-5 text-2xl font-semibold tracking-[-0.04em]">
                {primaryContact?.full_name ?? 'Contact non renseigné'}
              </div>
              {primaryContact?.job_title ? <div className="mt-2 text-sm text-white/70">{primaryContact.job_title}</div> : null}

              <div className="mt-6 space-y-3">
                {primaryContact?.email ? (
                  <a href={`mailto:${primaryContact.email}`} className="block rounded-[1.25rem] bg-white/8 px-4 py-3 text-sm transition hover:bg-white/12">
                    {primaryContact.email}
                  </a>
                ) : null}
                {primaryContact?.mobile ? (
                  <a href={`tel:${primaryContact.mobile}`} className="block rounded-[1.25rem] bg-white/8 px-4 py-3 text-sm transition hover:bg-white/12">
                    {primaryContact.mobile}
                  </a>
                ) : null}
                {!primaryContact?.mobile && primaryContact?.phone ? (
                  <a href={`tel:${primaryContact.phone}`} className="block rounded-[1.25rem] bg-white/8 px-4 py-3 text-sm transition hover:bg-white/12">
                    {primaryContact.phone}
                  </a>
                ) : null}
                {primaryContact?.website ? (
                  <a
                    href={primaryContact.website}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-[1.25rem] bg-white/8 px-4 py-3 text-sm transition hover:bg-white/12"
                  >
                    {primaryContact.website}
                  </a>
                ) : null}
                {primaryContact?.linkedin_url ? (
                  <a
                    href={primaryContact.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-[1.25rem] bg-white/8 px-4 py-3 text-sm transition hover:bg-white/12"
                  >
                    Profil LinkedIn
                  </a>
                ) : null}
              </div>

              <div className="mt-6">
                <a
                  href={`/carte/${slug}/vcf`}
                  className="flex w-full items-center justify-center rounded-[1.25rem] bg-white px-4 py-3.5 text-center text-sm font-semibold text-brand-deep shadow-sm transition hover:bg-white/95"
                >
                  Enregistrer dans mes contacts
                </a>
                <p className="mt-2 text-center text-xs leading-relaxed text-white/55">
                  Télécharge la carte de visite (.vcf) pour l’ajouter au carnet d’adresses (téléphone, Outlook, etc.).
                </p>
              </div>

              {primaryContact?.notes ? (
                <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-7 text-white/80">
                  {primaryContact.notes}
                </div>
              ) : null}
            </aside>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          <Link
            href="/"
            className="font-medium text-brand-ink underline decoration-brand/30 underline-offset-4 transition hover:text-brand"
          >
            Retour au générateur
          </Link>
        </div>
      </div>
    </main>
  );
}
