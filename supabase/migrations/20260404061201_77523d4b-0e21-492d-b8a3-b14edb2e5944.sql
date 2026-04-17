
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

create policy "Anyone can view product images"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "Authenticated users can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

create policy "Authenticated users can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images');

create policy "Authenticated users can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');
