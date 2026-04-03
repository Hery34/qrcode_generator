import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import type { BusinessCardRow } from '@/lib/types';

export const publicCardSelect = `
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
  business_contacts (
    id,
    business_card_id,
    full_name,
    job_title,
    email,
    phone,
    mobile,
    website,
    linkedin_url,
    notes,
    is_primary
  )
`;

export async function getPublishedCardBySlug(slug: string): Promise<BusinessCardRow | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('business_cards')
    .select(publicCardSelect)
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error) {
    return null;
  }

  return data as BusinessCardRow;
}
