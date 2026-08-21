begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-logos',
  'business-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists business_logos_employer_upload on storage.objects;
drop policy if exists business_logos_employer_update on storage.objects;
drop policy if exists business_logos_employer_delete on storage.objects;
drop policy if exists business_logos_master_manage on storage.objects;

create policy business_logos_master_manage
on storage.objects for all to authenticated
using (bucket_id = 'business-logos' and public.is_wageflow_master())
with check (bucket_id = 'business-logos' and public.is_wageflow_master());

create policy business_logos_employer_upload
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-logos'
  and public.is_current_employer()
  and (storage.foldername(name))[1] = public.current_business_id()::text
);

create policy business_logos_employer_update
on storage.objects for update to authenticated
using (
  bucket_id = 'business-logos'
  and public.is_current_employer()
  and (storage.foldername(name))[1] = public.current_business_id()::text
)
with check (
  bucket_id = 'business-logos'
  and public.is_current_employer()
  and (storage.foldername(name))[1] = public.current_business_id()::text
);

create policy business_logos_employer_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-logos'
  and public.is_current_employer()
  and (storage.foldername(name))[1] = public.current_business_id()::text
);

commit;
