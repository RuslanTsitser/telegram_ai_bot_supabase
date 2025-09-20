create table "public"."food_analysis" (
    "id" uuid not null default gen_random_uuid(),
    "chat_id" bigint not null,
    "user_id" bigint not null,
    "message_id" bigint not null,
    "description" text not null,
    "mass" numeric not null,
    "calories" numeric not null,
    "protein" numeric not null,
    "carbs" numeric not null,
    "sugar" numeric not null,
    "fats" numeric not null,
    "saturated_fats" numeric not null,
    "fiber" numeric not null,
    "nutrition_score" integer not null,
    "recommendation" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "has_image" boolean not null default false,
    "image_file_id" text,
    "user_text" text
);


alter table "public"."food_analysis" enable row level security;

create table "public"."message_relationships" (
    "user_message_id" bigint not null,
    "bot_message_id" bigint not null,
    "chat_id" bigint not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."message_relationships" enable row level security;

create table "public"."user_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "telegram_user_id" bigint not null,
    "height_cm" integer,
    "weight_kg" numeric(5,2),
    "target_weight_kg" numeric(5,2),
    "target_calories" integer,
    "target_protein_g" integer,
    "target_fats_g" integer,
    "target_carbs_g" integer,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."user_profiles" enable row level security;

create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "telegram_user_id" bigint not null,
    "username" text,
    "first_name" text,
    "last_name" text,
    "is_premium" boolean not null default false,
    "premium_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "last_activity" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."users" enable row level security;

CREATE INDEX food_analysis_chat_id_idx ON public.food_analysis USING btree (chat_id);

CREATE INDEX food_analysis_created_at_idx ON public.food_analysis USING btree (created_at);

CREATE UNIQUE INDEX food_analysis_message_chat_unique ON public.food_analysis USING btree (message_id, chat_id);

CREATE UNIQUE INDEX food_analysis_pkey ON public.food_analysis USING btree (id);

CREATE INDEX food_analysis_user_id_idx ON public.food_analysis USING btree (user_id);

CREATE INDEX idx_message_relationships_bot_message_id ON public.message_relationships USING btree (bot_message_id);

CREATE INDEX idx_message_relationships_chat_id ON public.message_relationships USING btree (chat_id);

CREATE UNIQUE INDEX message_relationships_pkey ON public.message_relationships USING btree (user_message_id, chat_id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE INDEX user_profiles_telegram_user_id_idx ON public.user_profiles USING btree (telegram_user_id);

CREATE UNIQUE INDEX user_profiles_telegram_user_id_unique_idx ON public.user_profiles USING btree (telegram_user_id);

CREATE INDEX users_is_premium_idx ON public.users USING btree (is_premium);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE INDEX users_telegram_user_id_idx ON public.users USING btree (telegram_user_id);

CREATE UNIQUE INDEX users_telegram_user_id_key ON public.users USING btree (telegram_user_id);

alter table "public"."food_analysis" add constraint "food_analysis_pkey" PRIMARY KEY using index "food_analysis_pkey";

alter table "public"."message_relationships" add constraint "message_relationships_pkey" PRIMARY KEY using index "message_relationships_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."food_analysis" add constraint "food_analysis_message_chat_unique" UNIQUE using index "food_analysis_message_chat_unique";

alter table "public"."user_profiles" add constraint "user_profiles_height_cm_check" CHECK (((height_cm > 0) AND (height_cm < 300))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_height_cm_check";

alter table "public"."user_profiles" add constraint "user_profiles_target_calories_check" CHECK (((target_calories > 0) AND (target_calories < 10000))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_target_calories_check";

alter table "public"."user_profiles" add constraint "user_profiles_target_carbs_g_check" CHECK (((target_carbs_g > 0) AND (target_carbs_g < 2000))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_target_carbs_g_check";

alter table "public"."user_profiles" add constraint "user_profiles_target_fats_g_check" CHECK (((target_fats_g > 0) AND (target_fats_g < 1000))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_target_fats_g_check";

alter table "public"."user_profiles" add constraint "user_profiles_target_protein_g_check" CHECK (((target_protein_g > 0) AND (target_protein_g < 1000))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_target_protein_g_check";

alter table "public"."user_profiles" add constraint "user_profiles_target_weight_kg_check" CHECK (((target_weight_kg > (0)::numeric) AND (target_weight_kg < (500)::numeric))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_target_weight_kg_check";

alter table "public"."user_profiles" add constraint "user_profiles_telegram_user_id_fkey" FOREIGN KEY (telegram_user_id) REFERENCES users(telegram_user_id) ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_telegram_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_weight_kg_check" CHECK (((weight_kg > (0)::numeric) AND (weight_kg < (500)::numeric))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_weight_kg_check";

alter table "public"."users" add constraint "users_telegram_user_id_key" UNIQUE using index "users_telegram_user_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_user_premium(user_telegram_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE telegram_user_id = user_telegram_id 
    AND is_premium = true 
    AND (premium_expires_at IS NULL OR premium_expires_at > now())
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_user_profile(p_telegram_user_id bigint, p_height_cm integer DEFAULT NULL::integer, p_weight_kg numeric DEFAULT NULL::numeric, p_target_weight_kg numeric DEFAULT NULL::numeric, p_target_calories integer DEFAULT NULL::integer, p_target_protein_g integer DEFAULT NULL::integer, p_target_fats_g integer DEFAULT NULL::integer, p_target_carbs_g integer DEFAULT NULL::integer)
 RETURNS user_profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_profile public.user_profiles;
BEGIN
  INSERT INTO public.user_profiles (
    telegram_user_id,
    height_cm,
    weight_kg,
    target_weight_kg,
    target_calories,
    target_protein_g,
    target_fats_g,
    target_carbs_g
  ) VALUES (
    p_telegram_user_id,
    p_height_cm,
    p_weight_kg,
    p_target_weight_kg,
    p_target_calories,
    p_target_protein_g,
    p_target_fats_g,
    p_target_carbs_g
  )
  ON CONFLICT (telegram_user_id) DO UPDATE SET
    height_cm = EXCLUDED.height_cm,
    weight_kg = EXCLUDED.weight_kg,
    target_weight_kg = EXCLUDED.target_weight_kg,
    target_calories = EXCLUDED.target_calories,
    target_protein_g = EXCLUDED.target_protein_g,
    target_fats_g = EXCLUDED.target_fats_g,
    target_carbs_g = EXCLUDED.target_carbs_g,
    updated_at = timezone('utc'::text, now())
  RETURNING * INTO v_profile;
  
  RETURN v_profile;
END;
$function$
;

grant delete on table "public"."food_analysis" to "anon";

grant insert on table "public"."food_analysis" to "anon";

grant references on table "public"."food_analysis" to "anon";

grant select on table "public"."food_analysis" to "anon";

grant trigger on table "public"."food_analysis" to "anon";

grant truncate on table "public"."food_analysis" to "anon";

grant update on table "public"."food_analysis" to "anon";

grant delete on table "public"."food_analysis" to "authenticated";

grant insert on table "public"."food_analysis" to "authenticated";

grant references on table "public"."food_analysis" to "authenticated";

grant select on table "public"."food_analysis" to "authenticated";

grant trigger on table "public"."food_analysis" to "authenticated";

grant truncate on table "public"."food_analysis" to "authenticated";

grant update on table "public"."food_analysis" to "authenticated";

grant delete on table "public"."food_analysis" to "service_role";

grant insert on table "public"."food_analysis" to "service_role";

grant references on table "public"."food_analysis" to "service_role";

grant select on table "public"."food_analysis" to "service_role";

grant trigger on table "public"."food_analysis" to "service_role";

grant truncate on table "public"."food_analysis" to "service_role";

grant update on table "public"."food_analysis" to "service_role";

grant delete on table "public"."message_relationships" to "anon";

grant insert on table "public"."message_relationships" to "anon";

grant references on table "public"."message_relationships" to "anon";

grant select on table "public"."message_relationships" to "anon";

grant trigger on table "public"."message_relationships" to "anon";

grant truncate on table "public"."message_relationships" to "anon";

grant update on table "public"."message_relationships" to "anon";

grant delete on table "public"."message_relationships" to "authenticated";

grant insert on table "public"."message_relationships" to "authenticated";

grant references on table "public"."message_relationships" to "authenticated";

grant select on table "public"."message_relationships" to "authenticated";

grant trigger on table "public"."message_relationships" to "authenticated";

grant truncate on table "public"."message_relationships" to "authenticated";

grant update on table "public"."message_relationships" to "authenticated";

grant delete on table "public"."message_relationships" to "service_role";

grant insert on table "public"."message_relationships" to "service_role";

grant references on table "public"."message_relationships" to "service_role";

grant select on table "public"."message_relationships" to "service_role";

grant trigger on table "public"."message_relationships" to "service_role";

grant truncate on table "public"."message_relationships" to "service_role";

grant update on table "public"."message_relationships" to "service_role";

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

create policy "Enable insert for service role"
on "public"."food_analysis"
as permissive
for insert
to service_role
with check (true);


create policy "Enable read access for authenticated users"
on "public"."food_analysis"
as permissive
for select
to authenticated
using (true);


create policy "Allow all operations from authenticated requests"
on "public"."message_relationships"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "Allow all operations from service role"
on "public"."message_relationships"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Allow delete without auth"
on "public"."user_profiles"
as permissive
for delete
to public
using (true);


create policy "Allow insert without auth"
on "public"."user_profiles"
as permissive
for insert
to public
with check (true);


create policy "Allow select without auth"
on "public"."user_profiles"
as permissive
for select
to public
using (true);


create policy "Allow update without auth"
on "public"."user_profiles"
as permissive
for update
to public
using (true)
with check (true);


create policy "Service role can do everything"
on "public"."user_profiles"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Service role can do everything"
on "public"."users"
as permissive
for all
to service_role
using (true)
with check (true);


CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_user_profiles_updated_at();


