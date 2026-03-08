-- 曲目海報：新增 poster_url 欄位與 Storage bucket（可上傳海報圖）
-- 在 Supabase SQL Editor 執行

ALTER TABLE public.repertoire
  ADD COLUMN IF NOT EXISTS poster_url text DEFAULT '';

-- Storage bucket 供曲目海報上傳（公開讀取，建議 5MB 內 jpg/png/webp）
INSERT INTO storage.buckets (id, name, public)
VALUES ('repertoire-posters', 'repertoire-posters', true)
ON CONFLICT (id) DO NOTHING;

-- 已登入者可上傳、更新、刪除
CREATE POLICY "repertoire-posters authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'repertoire-posters');

CREATE POLICY "repertoire-posters authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'repertoire-posters');

CREATE POLICY "repertoire-posters authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'repertoire-posters');

-- 公開讀取（public bucket 通常已可讀，此為明確允許 anon 讀取）
CREATE POLICY "repertoire-posters public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'repertoire-posters');
