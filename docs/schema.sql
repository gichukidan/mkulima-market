-- Starting point for Supabase/PostgreSQL. UNTESTED: review, add RLS policies and indexes before use.
create extension if not exists postgis;
create table profiles (id uuid primary key references auth.users, display_name text, roles text[] default '{buyer}', county text, created_at timestamptz default now());
create table sellers (id uuid primary key references profiles(id), business_name text, description text, area geography(point,4326), verified boolean default false, verified_until date);
create table markets (id bigserial primary key, name text, county text, location geography(point,4326), coords_verified boolean default false);
create table listings (id bigserial primary key, seller_id uuid references sellers(id), commodity text, grade text, quantity_kg numeric, price_per_kg numeric, negotiable boolean, status text default 'available' check (status in ('available','almost_out','paused','sold')), area geography(point,4326), market_id bigint references markets(id), created_at timestamptz default now());
create table buyer_requests (id bigserial primary key, buyer_id uuid references profiles(id), commodity text, quantity_kg numeric, target_price numeric, deadline date, location geography(point,4326), status text default 'open');
create table offers (id bigserial primary key, request_id bigint references buyer_requests(id), seller_id uuid references sellers(id), price_per_kg numeric, quantity_kg numeric, status text default 'sent');
create table reviews (id bigserial primary key, seller_id uuid references sellers(id), reviewer_id uuid references profiles(id), transaction_id bigint, stars int check (stars between 1 and 5), body text, unique (seller_id, reviewer_id, transaction_id));
create table transporters (id uuid primary key references profiles(id), vehicle text, capacity_kg numeric, base geography(point,4326), service_km numeric, pricing_method text);
create table quote_requests (id bigserial primary key, requester_id uuid references profiles(id), transporter_id uuid references transporters(id), pickup geography(point,4326), destination geography(point,4326), load_kg numeric, status text default 'sent');
create table price_reports (id bigserial primary key, commodity text, market_id bigint references markets(id), unit text, price_type text check (price_type in ('reported','asking','confirmed')), price numeric, reported_on date, source text);
create index on listings using gist (area);
create index on markets using gist (location);
