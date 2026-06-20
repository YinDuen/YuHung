-- 關於區與首頁圖片：新增 hero_image_url 欄位與 Storage bucket（可上傳人像照）
-- 在 Supabase SQL Editor 執行

ALTER TABLE public.about
  ADD COLUMN IF NOT EXISTS hero_image_url text DEFAULT '';

-- 既有資料若尚未設定首頁大頭照，預設沿用 repo 內的 pianist-portrait.jpg
UPDATE public.about
SET hero_image_url = 'pianist-portrait.jpg'
WHERE hero_image_url IS NULL OR hero_image_url = '';

-- Storage bucket 供關於區／首頁人像照上傳（公開讀取，建議 5MB 內 jpg/png/webp）
INSERT INTO storage.buckets (id, name, public)
VALUES ('about-images', 'about-images', true)
ON CONFLICT (id) DO NOTHING;

-- 已登入者可上傳、更新、刪除
CREATE POLICY "about-images authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'about-images');

CREATE POLICY "about-images authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'about-images');

CREATE POLICY "about-images authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'about-images');

-- 公開讀取（public bucket 通常已可讀，此為明確允許 anon 讀取）
CREATE POLICY "about-images public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'about-images');
