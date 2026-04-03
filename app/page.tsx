'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import Image from 'next/image';
import {
  BRAND_ACCENT_HEX,
  BRAND_COMPANY_NAME,
  BRAND_DEFAULT_DESCRIPTION,
  BRAND_DEFAULT_TAGLINE,
  BRAND_LOGO_URL,
  BRAND_WEBSITE_URL,
} from '@/lib/brand';
import { createBrowserSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { buildPublicCardUrl, createSlug, sanitizeFileName } from '@/lib/utils';
import type { BusinessCardInput, BusinessCardRow, BusinessContactInput } from '@/lib/types';

type FormState = {
  slug: string;
  companyTagline: string;
  companyDescription: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  companyPhone: string;
  companyEmail: string;
  contactFullName: string;
  contactJobTitle: string;
  contactEmail: string;
  contactPhone: string;
  contactMobile: string;
  contactWebsite: string;
  contactLinkedinUrl: string;
  contactNotes: string;
};

const defaultForm: FormState = {
  slug: '',
  companyTagline: BRAND_DEFAULT_TAGLINE,
  companyDescription: BRAND_DEFAULT_DESCRIPTION,
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
  country: 'France',
  companyPhone: '',
  companyEmail: '',
  contactFullName: '',
  contactJobTitle: '',
  contactEmail: '',
  contactPhone: '',
  contactMobile: '',
  contactWebsite: '',
  contactLinkedinUrl: '',
  contactNotes: '',
};

const cardSelect = `
  id,
  slug,
  company_name,
  company_tagline,
  company_description,
  address_line_1,
  address_line_2,
  postal_code,
  city,
  country,
  company_phone,
  company_email,
  company_website,
  logo_url,
  accent_color,
  is_published,
  created_at,
  updated_at
`;

function mapRowToForm(card: BusinessCardRow): FormState {
  const primaryContact = card.business_contacts?.find((contact) => contact.is_primary) ?? card.business_contacts?.[0];

  return {
    slug: card.slug ?? '',
    companyTagline: (card.company_tagline ?? '').trim() || BRAND_DEFAULT_TAGLINE,
    companyDescription: (card.company_description ?? '').trim() || BRAND_DEFAULT_DESCRIPTION,
    addressLine1: card.address_line_1 ?? '',
    addressLine2: card.address_line_2 ?? '',
    postalCode: card.postal_code ?? '',
    city: card.city ?? '',
    country: card.country ?? 'France',
    companyPhone: card.company_phone ?? '',
    companyEmail: card.company_email ?? '',
    contactFullName: primaryContact?.full_name ?? '',
    contactJobTitle: primaryContact?.job_title ?? '',
    contactEmail: primaryContact?.email ?? '',
    contactPhone: primaryContact?.phone ?? '',
    contactMobile: primaryContact?.mobile ?? '',
    contactWebsite: primaryContact?.website ?? '',
    contactLinkedinUrl: primaryContact?.linkedin_url ?? '',
    contactNotes: primaryContact?.notes ?? '',
  };
}

function mapFormToCardInput(form: FormState): BusinessCardInput {
  return {
    slug: createSlug(form.slug),
    company_name: BRAND_COMPANY_NAME,
    company_tagline: form.companyTagline.trim() || null,
    company_description: form.companyDescription.trim() || null,
    address_line_1: form.addressLine1.trim() || null,
    address_line_2: form.addressLine2.trim() || null,
    postal_code: form.postalCode.trim() || null,
    city: form.city.trim() || null,
    country: form.country.trim() || null,
    company_phone: form.companyPhone.trim() || null,
    company_email: form.companyEmail.trim() || null,
    company_website: BRAND_WEBSITE_URL,
    logo_url: BRAND_LOGO_URL,
    accent_color: BRAND_ACCENT_HEX,
    is_published: true,
  };
}

function mapFormToContactInput(form: FormState, businessCardId: string): BusinessContactInput {
  return {
    business_card_id: businessCardId,
    full_name: form.contactFullName.trim(),
    job_title: form.contactJobTitle.trim() || null,
    email: form.contactEmail.trim() || null,
    phone: form.contactPhone.trim() || null,
    mobile: form.contactMobile.trim() || null,
    website: form.contactWebsite.trim() || null,
    linkedin_url: form.contactLinkedinUrl.trim() || null,
    notes: form.contactNotes.trim() || null,
    is_primary: true,
  };
}

export default function Home() {
  const [form, setForm] = useState<FormState>(() => ({ ...defaultForm }));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recentCards, setRecentCards] = useState<BusinessCardRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const qrCardRef = useRef<HTMLDivElement>(null);
  const supabaseReady = isSupabaseConfigured();
  const publicUrl = form.slug ? buildPublicCardUrl(form.slug) : '';

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }

    let isCancelled = false;

    async function loadCards() {
      setIsLoadingCards(true);
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase
        .from('business_cards')
        .select(`${cardSelect}, business_contacts (*)`)
        .order('updated_at', { ascending: false })
        .limit(6);

      if (isCancelled) {
        return;
      }

      if (error) {
        setFeedback(`Impossible de charger les fiches : ${error.message}`);
      } else {
        setRecentCards((data as BusinessCardRow[]) ?? []);
      }

      setIsLoadingCards(false);
    }

    void loadCards();

    return () => {
      isCancelled = true;
    };
  }, [supabaseReady]);

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const refreshRecentCards = async (focusId?: string) => {
    if (!supabaseReady) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from('business_cards')
      .select(`${cardSelect}, business_contacts (*)`)
      .order('updated_at', { ascending: false })
      .limit(6);

    if (error) {
      setFeedback(`Fiche enregistrée, mais la liste n’a pas pu être rafraîchie : ${error.message}`);
      return;
    }

    const nextCards = (data as BusinessCardRow[]) ?? [];
    setRecentCards(nextCards);

    if (!focusId) {
      return;
    }

    const focusedCard = nextCards.find((card) => card.id === focusId);
    if (focusedCard) {
      setForm(mapRowToForm(focusedCard));
    }
  };

  const saveCard = () => {
    if (!supabaseReady) {
      setFeedback('Configuration Supabase manquante : impossible d’enregistrer.');
      return;
    }

    const cardPayload = mapFormToCardInput(form);
    if (!cardPayload.slug) {
      setFeedback('Le slug public est obligatoire.');
      return;
    }

    if (!form.contactFullName.trim()) {
      setFeedback('Ajoute au moins un contact principal.');
      return;
    }

    startTransition(() => {
      void (async () => {
        const supabase = createBrowserSupabaseClient();

        const { data: savedCard, error: cardError } = await supabase
          .from('business_cards')
          .upsert(cardPayload, { onConflict: 'slug' })
          .select(cardSelect)
          .single();

        if (cardError || !savedCard) {
          setFeedback(`Enregistrement impossible : ${cardError?.message ?? 'réponse vide'}`);
          return;
        }

        const cardId = savedCard.id;
        const { data: existingContacts, error: contactLookupError } = await supabase
          .from('business_contacts')
          .select('id')
          .eq('business_card_id', cardId)
          .eq('is_primary', true)
          .limit(1);

        if (contactLookupError) {
          setFeedback(`Fiche enregistrée, mais le contact principal n’a pas pu être synchronisé : ${contactLookupError.message}`);
          await refreshRecentCards(cardId);
          return;
        }

        const contactPayload = mapFormToContactInput(form, cardId);
        if (existingContacts && existingContacts.length > 0) {
          const { error: updateContactError } = await supabase
            .from('business_contacts')
            .update(contactPayload)
            .eq('id', existingContacts[0].id);

          if (updateContactError) {
            setFeedback(`Fiche enregistrée, mais le contact principal n’a pas pu être mis à jour : ${updateContactError.message}`);
            await refreshRecentCards(cardId);
            return;
          }
        } else {
          const { error: insertContactError } = await supabase
            .from('business_contacts')
            .insert(contactPayload);

          if (insertContactError) {
            setFeedback(`Fiche enregistrée, mais le contact principal n’a pas pu être créé : ${insertContactError.message}`);
            await refreshRecentCards(cardId);
            return;
          }
        }

        setFeedback(`Fiche publiée : ${buildPublicCardUrl(savedCard.slug)}`);
        await refreshRecentCards(cardId);
      })();
    });
  };

  const loadCardIntoForm = (card: BusinessCardRow) => {
    setForm(mapRowToForm(card));
    setFeedback(`Fiche « ${card.slug} » chargée.`);
  };

  const resetToNewCard = () => {
    setForm({ ...defaultForm });
    setFeedback('Nouvelle fiche : indique un slug public distinct pour créer une autre carte.');
  };

  const downloadDataUrl = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const captureQrCardPng = () => {
    const el = qrCardRef.current;
    if (!el) {
      throw new Error('Élément carte introuvable.');
    }
    return toPng(el, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#f8fafc',
    });
  };

  const exportToPNG = async () => {
    if (!qrCardRef.current || !publicUrl) {
      return;
    }

    try {
      const dataUrl = await captureQrCardPng();
      downloadDataUrl(dataUrl, `${sanitizeFileName(form.slug || 'carte-qr')}.png`);
    } catch (err) {
      console.error(err);
      setFeedback(
        err instanceof Error ? `Export PNG impossible : ${err.message}` : 'Export PNG impossible.',
      );
    }
  };

  const exportToPDF = async () => {
    if (!qrCardRef.current || !publicUrl) {
      return;
    }

    try {
      const dataUrl = await captureQrCardPng();
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const props = pdf.getImageProperties(dataUrl);
      const imageWidth = pageWidth - 24;
      const imageHeight = (props.height * imageWidth) / props.width;
      const imageY = Math.max(16, (pageHeight - imageHeight) / 2);

      pdf.addImage(dataUrl, 'PNG', 12, imageY, imageWidth, imageHeight);
      pdf.save(`${sanitizeFileName(form.slug || 'carte-qr')}.pdf`);
    } catch (err) {
      console.error(err);
      setFeedback(
        err instanceof Error ? `Export PDF impossible : ${err.message}` : 'Export PDF impossible.',
      );
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 text-slate-950" style={{ background: 'var(--gradient-page)' }}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">AnnexxCard QR code generator</h1>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_25px_90px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">Fiche entreprise</h2>
                <p className="mt-1 text-sm text-slate-600">Les champs ci-dessous alimentent la page publique et le QR code.</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={resetToNewCard}
                  disabled={isPending}
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Nouvelle fiche
                </button>
                <button
                  type="button"
                  onClick={saveCard}
                  disabled={isPending}
                  className="rounded-full bg-brand-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isPending ? 'Enregistrement...' : 'Publier la fiche'}
                </button>
              </div>
            </div>
            {feedback ? (
              <p className="mb-4 text-sm text-slate-700" role="status">
                {feedback}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Slug public</span>
                <input
                  value={form.slug}
                  onChange={(event) => handleFieldChange('slug', createSlug(event.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono outline-none transition focus:border-brand"
                  placeholder="atelier-durand"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Accroche</span>
                <input
                  value={form.companyTagline}
                  onChange={(event) => handleFieldChange('companyTagline', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                  placeholder="Une phrase d’accroche (modifiable)"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  value={form.companyDescription}
                  onChange={(event) => handleFieldChange('companyDescription', event.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                  placeholder="Quelques phrases sur l’entreprise (modifiable)"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Adresse</span>
                <input
                  value={form.addressLine1}
                  onChange={(event) => handleFieldChange('addressLine1', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                  placeholder="12 rue des Entrepreneurs"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Complément d’adresse</span>
                <input
                  value={form.addressLine2}
                  onChange={(event) => handleFieldChange('addressLine2', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                  placeholder="Bâtiment B, 2e étage"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Code postal</span>
                <input
                  value={form.postalCode}
                  onChange={(event) => handleFieldChange('postalCode', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                  placeholder="75010"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Ville</span>
                <input
                  value={form.city}
                  onChange={(event) => handleFieldChange('city', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                  placeholder="Paris"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Pays</span>
                <input
                  value={form.country}
                  onChange={(event) => handleFieldChange('country', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                  placeholder="France"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Téléphone entreprise</span>
                <input
                  value={form.companyPhone}
                  onChange={(event) => handleFieldChange('companyPhone', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                  placeholder="+33 1 80 00 00 00"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Email entreprise</span>
                <input
                  value={form.companyEmail}
                  onChange={(event) => handleFieldChange('companyEmail', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                  placeholder="contact@entreprise.fr"
                />
              </label>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-8">
              <h3 className="text-xl font-semibold tracking-[-0.03em]">Contact principal</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Nom complet</span>
                  <input
                    value={form.contactFullName}
                    onChange={(event) => handleFieldChange('contactFullName', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                    placeholder="Marie Durand"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Poste</span>
                  <input
                    value={form.contactJobTitle}
                    onChange={(event) => handleFieldChange('contactJobTitle', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                    placeholder="Directrice commerciale"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <input
                    value={form.contactEmail}
                    onChange={(event) => handleFieldChange('contactEmail', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                    placeholder="marie@entreprise.fr"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Téléphone fixe</span>
                  <input
                    value={form.contactPhone}
                    onChange={(event) => handleFieldChange('contactPhone', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                    placeholder="+33 1 80 00 00 01"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Mobile</span>
                  <input
                    value={form.contactMobile}
                    onChange={(event) => handleFieldChange('contactMobile', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                    placeholder="+33 6 00 00 00 00"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Site perso / landing</span>
                  <input
                    value={form.contactWebsite}
                    onChange={(event) => handleFieldChange('contactWebsite', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                    placeholder="https://..."
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">LinkedIn</span>
                  <input
                    value={form.contactLinkedinUrl}
                    onChange={(event) => handleFieldChange('contactLinkedinUrl', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                    placeholder="https://www.linkedin.com/in/..."
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Notes</span>
                  <textarea
                    value={form.contactNotes}
                    onChange={(event) => handleFieldChange('contactNotes', event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-brand"
                    placeholder="Informations complémentaires visibles sur la page publique."
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-brand-deep/30 bg-brand-deep p-6 text-white shadow-[0_25px_90px_-40px_rgba(110,27,25,0.42)]">
            <div className="mb-5">
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">QR & exports</h2>
              <p className="mt-1 text-sm text-slate-300">La carte exportée encode l’URL publique de la fiche.</p>
            </div>

            <div
              ref={qrCardRef}
              className="rounded-[2rem] p-6 text-slate-950"
              style={{ background: 'linear-gradient(180deg, #fafafa 0%, #fff5f5 100%)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Carte publique</div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{BRAND_COMPANY_NAME}</h3>
                  <p className="mt-2 text-sm text-slate-600">{form.companyTagline.trim() || BRAND_DEFAULT_TAGLINE}</p>
                </div>
                <div className="shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                  <Image
                    src={BRAND_LOGO_URL}
                    alt={`Logo ${BRAND_COMPANY_NAME}`}
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 object-contain"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-center rounded-[1.75rem] bg-white p-6 shadow-[0_20px_40px_-25px_rgba(15,23,42,0.45)]">
                {publicUrl ? (
                  <div className="relative inline-flex">
                    <QRCode value={publicUrl} size={220} fgColor={BRAND_ACCENT_HEX} level="H" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                      <div className="rounded-xl border-2 border-white bg-white p-1 shadow-sm">
                        <Image
                          src={BRAND_LOGO_URL}
                          alt=""
                          width={50}
                          height={50}
                          unoptimized
                          className="h-[50px] w-[50px] object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 text-center text-sm text-slate-500">
                    Indique un slug public pour générer le QR.
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">URL encodée</div>
                  <div className="mt-2 break-all rounded-2xl bg-white px-4 py-3 font-mono text-sm text-slate-700">
                    {publicUrl || 'L’URL publique apparaîtra ici.'}
                  </div>
                </div>
                <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white/70 p-4">
                  <div className="text-sm font-medium">{form.contactFullName || 'Contact principal'}</div>
                  <div className="text-sm text-slate-600">{form.contactJobTitle || 'Fonction'}</div>
                  <div className="text-sm text-slate-600">{form.contactEmail || 'email@entreprise.fr'}</div>
                  <div className="text-sm text-slate-600">{form.contactMobile || form.contactPhone || '+33 ...'}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={exportToPNG}
                disabled={!publicUrl}
                className="rounded-full bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Exporter en PNG
              </button>
              <button
                type="button"
                onClick={exportToPDF}
                disabled={!publicUrl}
                className="rounded-full bg-brand px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Exporter en PDF
              </button>
              {publicUrl ? (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/15 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Ouvrir la page publique
                </a>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_25px_90px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="mb-5">
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">Fiches récentes</h2>
              <p className="mt-1 text-sm text-slate-600">
                Clique une fiche pour la modifier. Utilise « Nouvelle fiche » dans le formulaire pour en créer une autre.
              </p>
            </div>

            {!supabaseReady ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Ajoute `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, puis redémarre le serveur Next.
              </div>
            ) : isLoadingCards ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Chargement des fiches...
              </div>
            ) : recentCards.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Aucune fiche enregistrée pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {recentCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => loadCardIntoForm(card)}
                    className="w-full rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left transition hover:border-brand hover:bg-brand-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-slate-900">{card.company_name}</div>
                        <div className="mt-1 truncate font-mono text-xs text-slate-500">{card.slug}</div>
                      </div>
                      <div
                        className="h-4 w-4 rounded-full border border-slate-200"
                        style={{ backgroundColor: BRAND_ACCENT_HEX }}
                      />
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      {card.city || card.country ? [card.city, card.country].filter(Boolean).join(', ') : 'Sans localisation'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
