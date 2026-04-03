import { BRAND_WEBSITE_URL } from '@/lib/brand';
import type { BusinessCardRow, BusinessContactRow } from '@/lib/types';

/** vCard 3.0 — échappement RFC 2426 */
function escapeValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function splitDisplayName(full: string): { family: string; given: string } {
  const t = full.trim();
  if (!t) {
    return { family: '', given: '' };
  }
  const parts = t.split(/\s+/);
  if (parts.length === 1) {
    return { family: parts[0]!, given: '' };
  }
  return { family: parts[parts.length - 1]!, given: parts.slice(0, -1).join(' ') };
}

/** Plie les lignes > 75 octets (approx. caractères ASCII) — RFC 2426 */
function foldLine(line: string): string {
  const max = 75;
  if (line.length <= max) {
    return line;
  }
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, max));
  rest = rest.slice(max);
  while (rest.length > 0) {
    chunks.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  return chunks.join('\r\n');
}

function pushLine(lines: string[], property: string, value: string | null | undefined) {
  const v = (value ?? '').trim();
  if (!v) {
    return;
  }
  lines.push(foldLine(`${property}:${escapeValue(v)}`));
}

/**
 * Construit un vCard 3.0 à partir d’une fiche publiée et de son contact principal.
 */
export function buildVCardFromCard(card: BusinessCardRow): string {
  const primary: BusinessContactRow | undefined =
    card.business_contacts?.find((c) => c.is_primary) ?? card.business_contacts?.[0];

  const fn = primary?.full_name?.trim() || 'Contact';
  const { family, given } = splitDisplayName(fn);
  const org = (card.company_name ?? '').trim();
  const street = [card.address_line_1, card.address_line_2]
    .map((l) => (l ?? '').trim())
    .filter(Boolean)
    .join(', ');
  const locality = (card.city ?? '').trim();
  const region = '';
  const postal = (card.postal_code ?? '').trim();
  const country = (card.country ?? '').trim();

  const lines: string[] = [];
  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');
  lines.push(foldLine(`FN:${escapeValue(fn)}`));
  lines.push(
    foldLine(
      `N:${escapeValue(family)};${escapeValue(given)};;;`,
    ),
  );
  if (org) {
    pushLine(lines, 'ORG', org);
  }
  pushLine(lines, 'TITLE', primary?.job_title);

  if (street || locality || postal || country) {
    const adr = `;;${escapeValue(street)};${escapeValue(locality)};${escapeValue(region)};${escapeValue(postal)};${escapeValue(country)}`;
    lines.push(foldLine(`ADR;TYPE=WORK:${adr}`));
  }

  pushLine(lines, 'TEL;TYPE=WORK,VOICE', card.company_phone);
  if (primary?.mobile?.trim()) {
    pushLine(lines, 'TEL;TYPE=CELL,VOICE', primary.mobile);
  }
  if (primary?.phone?.trim()) {
    pushLine(lines, 'TEL;TYPE=WORK,VOICE', primary.phone);
  }

  pushLine(lines, 'EMAIL;TYPE=INTERNET,WORK', card.company_email);
  pushLine(lines, 'EMAIL;TYPE=INTERNET', primary?.email);

  const orgSite = (card.company_website ?? BRAND_WEBSITE_URL).trim();
  if (orgSite) {
    pushLine(lines, 'URL;TYPE=WORK', orgSite);
  }
  pushLine(lines, 'URL', primary?.website);
  pushLine(lines, 'URL', primary?.linkedin_url);

  pushLine(lines, 'NOTE', primary?.notes);

  lines.push('END:VCARD');

  return `${lines.join('\r\n')}\r\n`;
}
