-- 網站設定（單一區塊）：目前用於曲目輪播換頁秒數
-- 在 Supabase Dashboard > SQL Editor 中執行此腳本

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repertoire_interval int NOT NULL DEFAULT 10,  -- 曲目輪播每幾秒換頁
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許所有人讀取 settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "允許已登入者管理 settings" ON public.settings FOR ALL USING (auth.role() = 'authenticated');

-- 預設資料（僅在表為空時插入，可從後台修改）
INSERT INTO public.settings (repertoire_interval)
SELECT 10
WHERE NOT EXISTS (SELECT 1 FROM public.settings LIMIT 1);
