-- Yu-Hung 網站內容表（Supabase）
-- 在 Supabase Dashboard > SQL Editor 中執行此腳本

-- 關於（單一區塊：引言 + 多段落 + 圖片）
CREATE TABLE IF NOT EXISTS public.about (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead text NOT NULL DEFAULT '',
  paragraphs jsonb NOT NULL DEFAULT '[]',  -- ["段落1", "段落2", ...]
  image_url text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- 曲目與演出
CREATE TABLE IF NOT EXISTS public.repertoire (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meta text DEFAULT '',  -- 時間、地點等
  program jsonb NOT NULL DEFAULT '[]',  -- [{"zh":"曲目中文","en":"English","note":""}, ...]
  org text DEFAULT '',  -- 主辦單位等
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 影音
CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  video_url text DEFAULT '',
  thumbnail_url text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 聯絡（單一區塊）
CREATE TABLE IF NOT EXISTS public.contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intro text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  social_links jsonb NOT NULL DEFAULT '{"youtube":"","facebook":"","instagram":""}',
  updated_at timestamptz DEFAULT now()
);

-- RLS：允許所有人讀取，僅登入使用者可寫入
ALTER TABLE public.about ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repertoire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許所有人讀取 about" ON public.about FOR SELECT USING (true);
CREATE POLICY "允許已登入者管理 about" ON public.about FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "允許所有人讀取 repertoire" ON public.repertoire FOR SELECT USING (true);
CREATE POLICY "允許已登入者管理 repertoire" ON public.repertoire FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "允許所有人讀取 media" ON public.media FOR SELECT USING (true);
CREATE POLICY "允許已登入者管理 media" ON public.media FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "允許所有人讀取 contact" ON public.contact FOR SELECT USING (true);
CREATE POLICY "允許已登入者管理 contact" ON public.contact FOR ALL USING (auth.role() = 'authenticated');

-- 預設資料（僅在表為空時插入，可從後台修改）
INSERT INTO public.about (lead, paragraphs, image_url)
SELECT
  '自然而純真，是對廖宥閎的音樂最貼切的形容詞。',
  '[
    "2007年生於台北，五歲起即向姑姑廖皎含老師學習鋼琴，受廖老師的影響進入了音樂世界，培養了對鋼琴的熱愛。國中時就讀於南門國中音樂班，師事王麗君老師。現為師大附中高中部音樂班學生，師事廖皎含老師。",
    "自2014年參與鋼琴比賽，屢獲優異成績，包括第38、40屆河合鋼琴比賽殿軍、亞軍，台灣台北國際鋼琴大賽第二、三名，全國學生音樂比賽台北市西區第二名，亞洲愛琴海國際音樂大賽台灣初賽第一名。",
    "2019年，應致凡音樂院邀請，參與陳茂萱樂展系列五－鋼琴作品專場，於國家演奏廳演出陳茂萱第二號小奏鳴曲。",
    "歷年來參與樂享大師國際音樂營、致凡暑期音樂營，與不同老師學習，提升自身能力，並熱愛與音樂愛好者交流。"
  ]'::jsonb,
  'photo.jpg'
WHERE NOT EXISTS (SELECT 1 FROM public.about LIMIT 1);

INSERT INTO public.contact (intro, email, social_links)
SELECT
  '演出邀約、合作與教學諮詢，歡迎來信。',
  'contact@yuungliao.com',
  '{"youtube":"#","facebook":"#","instagram":"#"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.contact LIMIT 1);
