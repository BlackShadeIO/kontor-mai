This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

Create a `.env.local` file in the root of your project with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in your Supabase project settings under "API".

SQL:

```
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.case_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  unit character varying DEFAULT 'pcs'::character varying,
  discount_percentage numeric DEFAULT 0,
  line_total numeric DEFAULT round(((quantity * unit_price) * ((1)::numeric - (discount_percentage / (100)::numeric))), 2),
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT case_items_pkey PRIMARY KEY (id),
  CONSTRAINT case_items_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id)
);
CREATE TABLE public.cases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id character varying NOT NULL DEFAULT ('CASE-'::text || nextval('case_id_sequence'::regclass)) UNIQUE,
  title character varying NOT NULL,
  description text,
  project_id uuid,
  user_id uuid NOT NULL,
  status character varying DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'sent'::character varying, 'accepted'::character varying, 'paid'::character varying, 'rejected'::character varying, 'cancelled'::character varying, 'overdue'::character varying]::text[])),
  priority character varying DEFAULT 'normal'::character varying CHECK (priority::text = ANY (ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'emergency'::character varying]::text[])),
  assigned_to uuid,
  due_date date,
  tags ARRAY,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  customer_id uuid,
  service_address text,
  estimated_duration integer,
  estimated_cost numeric,
  actual_cost numeric,
  completed_at timestamp with time zone,
  actual_duration integer,
  notes text,
  case_type character varying DEFAULT 'offer'::character varying CHECK (case_type::text = ANY (ARRAY['offer'::character varying, 'invoice'::character varying]::text[])),
  document_number character varying,
  amount numeric DEFAULT 0,
  currency character varying DEFAULT 'DKK'::character varying,
  vat_rate numeric DEFAULT 25.00,
  vat_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  payment_terms integer DEFAULT 30,
  valid_until date,
  sent_at timestamp with time zone,
  accepted_at timestamp with time zone,
  paid_at timestamp with time zone,
  CONSTRAINT cases_pkey PRIMARY KEY (id),
  CONSTRAINT cases_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT cases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT cases_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id),
  CONSTRAINT cases_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  website character varying,
  industry character varying,
  company_size character varying,
  logo_url text,
  address text,
  phone character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  email character varying,
  phone character varying,
  company_name character varying,
  street_address character varying NOT NULL,
  city character varying NOT NULL,
  postal_code character varying NOT NULL,
  country character varying DEFAULT 'Denmark'::character varying,
  notes text,
  customer_type character varying DEFAULT 'private'::character varying CHECK (customer_type::text = ANY (ARRAY['private'::character varying, 'business'::character varying]::text[])),
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cvr_number character varying,
  vat_number character varying,
  contact_person_first_name character varying,
  contact_person_last_name character varying,
  contact_person_title character varying,
  contact_person_email character varying,
  contact_person_phone character varying,
  billing_address_different boolean DEFAULT false,
  billing_street_address character varying,
  billing_city character varying,
  billing_postal_code character varying,
  billing_country character varying,
  industry character varying,
  website character varying,
  payment_terms integer DEFAULT 30,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.email_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id uuid,
  recipient_email character varying NOT NULL,
  recipient_name character varying,
  subject character varying NOT NULL,
  email_type character varying NOT NULL CHECK (email_type::text = ANY (ARRAY['offer'::character varying, 'invoice'::character varying, 'reminder'::character varying, 'other'::character varying]::text[])),
  document_number character varying,
  status character varying DEFAULT 'sent'::character varying CHECK (status::text = ANY (ARRAY['sent'::character varying, 'failed'::character varying, 'bounced'::character varying, 'delivered'::character varying, 'opened'::character varying]::text[])),
  smtp_config_id uuid,
  attachment_filename character varying,
  error_message text,
  email_content text,
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_history_pkey PRIMARY KEY (id),
  CONSTRAINT email_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT email_history_smtp_config_id_fkey FOREIGN KEY (smtp_config_id) REFERENCES public.smtp_configurations(id),
  CONSTRAINT email_history_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number character varying NOT NULL DEFAULT ('INV-'::text || nextval('invoice_number_sequence'::regclass)) UNIQUE,
  customer_id uuid NOT NULL,
  user_id uuid NOT NULL,
  offer_id uuid,
  title character varying NOT NULL,
  description text,
  total_amount numeric DEFAULT 0,
  status character varying DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'sent'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying]::text[])),
  due_date date,
  paid_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT invoices_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id)
);
CREATE TABLE public.offers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  offer_number character varying NOT NULL DEFAULT ('OFFER-'::text || nextval('offer_number_sequence'::regclass)) UNIQUE,
  customer_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  total_amount numeric DEFAULT 0,
  status character varying DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'sent'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'expired'::character varying]::text[])),
  valid_until date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT offers_pkey PRIMARY KEY (id),
  CONSTRAINT offers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT offers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_id uuid,
  first_name character varying,
  last_name character varying,
  avatar_url text,
  job_title character varying,
  bio text,
  phone character varying,
  timezone character varying DEFAULT 'UTC'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  user_id uuid NOT NULL,
  company_id uuid,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'completed'::character varying, 'paused'::character varying, 'cancelled'::character varying]::text[])),
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.smtp_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  host character varying NOT NULL,
  port integer NOT NULL,
  username character varying NOT NULL,
  password_encrypted text NOT NULL,
  use_tls boolean DEFAULT true,
  use_ssl boolean DEFAULT false,
  from_email character varying NOT NULL,
  from_name character varying,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT smtp_configurations_pkey PRIMARY KEY (id),
  CONSTRAINT smtp_configurations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  device_info jsonb,
  location_info jsonb,
  is_active boolean DEFAULT true,
  last_activity timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);