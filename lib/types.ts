export type BusinessContactRow = {
  id: string;
  business_card_id: string;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  website: string | null;
  linkedin_url: string | null;
  notes: string | null;
  is_primary: boolean;
  created_at?: string;
};

export type BusinessCardRow = {
  id: string;
  slug: string;
  company_name: string;
  company_tagline: string | null;
  company_description: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_website: string | null;
  logo_url: string | null;
  accent_color: string | null;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
  business_contacts?: BusinessContactRow[];
};

export type BusinessCardInput = {
  slug: string;
  company_name: string;
  company_tagline: string | null;
  company_description: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_website: string | null;
  logo_url: string | null;
  accent_color: string | null;
  is_published: boolean;
};

export type BusinessContactInput = {
  business_card_id: string;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  website: string | null;
  linkedin_url: string | null;
  notes: string | null;
  is_primary: boolean;
};
