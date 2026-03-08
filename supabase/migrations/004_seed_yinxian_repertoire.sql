-- 音弦聯盟（2025.02.08）— 海報上半部廖宥閎鋼琴曲目
-- 在 Supabase SQL Editor 執行。海報圖可於後台「曲目」編輯該筆後上傳。

INSERT INTO public.repertoire (title, meta, program, org, sort_order) VALUES
(
  '音弦聯盟（廖宥閎 鋼琴）',
  '2025.02.08 19:30 · 文化大學建國校區大夏館表演廳 · 台北市建國南路二段231號',
  '[
    {"zh":"巴赫：平均律第二冊第2號 C小調前奏與賦格 BWV.871","en":"J.S. Bach: Prelude and Fugue No.2 in C minor from the Well-tempered Clavier Book II BWV.871","note":""},
    {"zh":"貝多芬：第26號鋼琴奏鳴曲 降E大調 作品81a「告別」","en":"L.v. Beethoven: Piano Sonata No.26 in E-flat Major Op.81a \"Les Adieux\"","note":""},
    {"zh":"蕭邦：練習曲 作品25之11「冬風」","en":"F. Chopin: Etude Op.25 No.11 \"Winter Wind\"","note":""},
    {"zh":"蕭邦：第4號敘事曲 F小調 作品52","en":"F. Chopin: Ballade No.4 in F minor Op.52","note":""},
    {"zh":"德布西：版畫 L.100","en":"C. Debussy: Estampes L.100","note":""}
  ]'::jsonb,
  '主辦單位／含光藝術工作室',
  3
);
