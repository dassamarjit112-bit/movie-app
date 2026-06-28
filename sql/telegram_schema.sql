create table if not exists public.application_movies (
  id integer primary key, -- TMDB ID
  title text not null,
  telegram_file_id text,
  file_size_bytes bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.application_series (
  id integer primary key, -- TMDB ID
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.application_episodes (
  id uuid default gen_random_uuid() primary key,
  series_id integer references public.application_series on delete cascade not null,
  season_number integer not null,
  episode_number integer not null,
  telegram_file_id text,
  file_size_bytes bigint,
  unique(series_id, season_number, episode_number)
);

-- Enable RLS
alter table public.application_movies enable row level security;
alter table public.application_series enable row level security;
alter table public.application_episodes enable row level security;

-- Policies
create policy "Media data is public viewable" 
  on public.application_movies for select using (true);
create policy "Media data is public viewable" 
  on public.application_series for select using (true);
create policy "Media data is public viewable" 
  on public.application_episodes for select using (true);
