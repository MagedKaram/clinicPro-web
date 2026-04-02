-- Migration 13: Add avatar_url to doctor_profiles
-- Run this on your Supabase project SQL editor

alter table public.doctor_profiles
  add column if not exists avatar_url text not null default '';

-- Storage bucket: doctor-avatars
-- Create manually in Supabase dashboard → Storage → New bucket
-- Settings: name=doctor-avatars, public=true, file size limit=2097152, allowed types=image/jpeg,image/png,image/webp
--
-- Or via SQL:
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'doctor-avatars',
  'doctor-avatars',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- RLS for storage: authenticated users can upload their own avatar
create policy "doctor_avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'doctor-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "doctor_avatars_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'doctor-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "doctor_avatars_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'doctor-avatars');
