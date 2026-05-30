# CineStream — Supabase Schema Documentation

To set up the Supabase backend for CineStream, run the following SQL queries in the **SQL Editor** of your Supabase Dashboard.

## 1. Profiles Table
Stores public profile information for users.

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select using (true);

create policy "Users can update their own profile" 
  on public.profiles for update using (auth.uid() = id);

-- Trigger to automatically create a profile for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'CineStream User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 2. Subscriptions Table
Handles active user subscription plans.

```sql
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  plan_id text not null, -- basic, standard, premium
  status text not null, -- active, cancelled, expired
  start_date timestamp with time zone not null default now(),
  end_date timestamp with time zone not null,
  source text not null default 'payment', -- payment, gift_code
  gift_code_used text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policies
create policy "Users can view their own subscriptions" 
  on public.subscriptions for select using (auth.uid() = user_id);

create policy "Service role or System can manage subscriptions" 
  on public.subscriptions for all using (auth.uid() = user_id);
```

## 3. Gift Codes Table
Redeemable codes for activating plans.

```sql
create table public.gift_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  plan_id text not null, -- basic, standard, premium
  duration_days integer not null default 30,
  is_used boolean not null default false,
  used_by uuid references auth.users on delete set null,
  used_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert demo gift codes
insert into public.gift_codes (code, plan_id, duration_days) values
('CINE30BASIC', 'basic', 30),
('CINE30STANDARD', 'standard', 30),
('CINE30PREMIUM', 'premium', 30),
('CINE90PREMIUM', 'premium', 90);

-- Enable RLS
alter table public.gift_codes enable row level security;

-- Policies
create policy "Anyone authenticated can select gift codes" 
  on public.gift_codes for select using (auth.role() = 'authenticated');

create policy "Anyone authenticated can update gift codes to redeem" 
  on public.gift_codes for update using (auth.role() = 'authenticated');
```

## 4. Content Table (Optional / Demo fallback)
Holds information about playable media content.

```sql
create table public.content (
  id text primary key,
  title text not null,
  type text not null, -- movie, series
  genre text,
  year integer,
  duration integer, -- in minutes
  imdb numeric(3,1),
  poster_url text,
  thumbnail_url text,
  description text,
  stream_url text not null,
  seasons integer,
  episodes text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.content enable row level security;

create policy "Content is public viewable" 
  on public.content for select using (true);
```

## 5. Watch History Table
Tracks video resume positions and continue watching lists.

```sql
create table public.watch_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content_id text not null,
  progress_seconds integer not null default 0,
  last_watched timestamp with time zone not null default now(),
  unique(user_id, content_id)
);

-- Enable RLS
alter table public.watch_history enable row level security;

-- Policies
create policy "Users can manage their own watch history" 
  on public.watch_history for all using (auth.uid() = user_id);
```

## 6. Watchlist Table
Tracks titles bookmarked by the user.

```sql
create table public.watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  content_id text not null,
  added_at timestamp with time zone not null default now(),
  unique(user_id, content_id)
);

-- Enable RLS
alter table public.watchlist enable row level security;

-- Policies
create policy "Users can manage their own watchlist" 
  on public.watchlist for all using (auth.uid() = user_id);
```
