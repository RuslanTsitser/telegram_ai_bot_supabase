create table if not exists public.food_analysis (
  id uuid default gen_random_uuid() primary key,
  chat_id bigint not null,
  user_id bigint not null,
  message_id bigint not null,
  description text not null,
  mass numeric not null,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  sugar numeric not null,
  fats numeric not null,
  saturated_fats numeric not null,
  fiber numeric not null,
  nutrition_score integer not null,
  recommendation text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  has_image boolean default false not null,
  image_file_id text,
  user_text text,
  constraint food_analysis_message_chat_unique unique (message_id, chat_id)
);

-- Add indexes for common queries
create index if not exists food_analysis_chat_id_idx on public.food_analysis(chat_id);
create index if not exists food_analysis_user_id_idx on public.food_analysis(user_id);
create index if not exists food_analysis_created_at_idx on public.food_analysis(created_at);

-- Add RLS policies
alter table public.food_analysis enable row level security;

create policy "Enable read access for authenticated users"
  on public.food_analysis for select
  to authenticated
  using (true);

create policy "Enable insert for service role"
  on public.food_analysis for insert
  to service_role
  with check (true); 