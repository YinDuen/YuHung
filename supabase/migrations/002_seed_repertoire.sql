-- 曲目與演出：與目前 index.html 靜態內容一致的預設資料
-- 在 Supabase SQL Editor 執行（若已有曲目可略過或先 TRUNCATE public.repertoire CASCADE）
-- 前端會用相同 class（concert-card, concert-title, concert-meta, concert-program, concert-org）渲染，字體與樣式與現在一致

INSERT INTO public.repertoire (title, meta, program, org, sort_order) VALUES
(
  '琴韻綻放 個人鋼琴獨奏會',
  '2024.2.18 14:30 · 松菸誠品表演廳 · 台北市信義區菸廠路88號B2',
  '[
    {"zh":"史卡拉第：D小調奏鳴曲 K.1","en":"D. Scarlatti: Sonata in D Minor K.1","note":""},
    {"zh":"史卡拉第：D大調奏鳴曲 K.96","en":"D. Scarlatti: Sonata in D Major K.96","note":""},
    {"zh":"貝多芬：C大調第三號鋼琴奏鳴曲 作品2之3","en":"L.V. Beethoven: Piano Sonata No.3 in C Major Op.2 No.3","note":""},
    {"zh":"李斯特：第一號梅菲斯特圓舞曲 S.514","en":"F. Liszt: Mephisto Waltz No.1 S.514","note":""},
    {"zh":"聖桑：G小調第二號鋼琴協奏曲 作品22","en":"C. Saint-Saëns: Piano Concerto No.2 in G Minor Op.22","note":"（協力演出／廖皎含老師）"}
  ]'::jsonb,
  '主辦單位／含光藝術工作室 · 特別感謝 廖皎含老師 協力演出 · 贊助／東和樂器',
  2
),
(
  '一鍵鍾琴 個人鋼琴獨奏會',
  '2023.2.26 14:30 · 文水藝文中心 · 台北市中山區南京東路二段124號9樓',
  '[
    {"zh":"巴赫：G大調第五號法國組曲 作品816","en":"J.S. Bach: French Suite No.5 in G Major BWV816","note":""},
    {"zh":"海頓：C大調鋼琴奏鳴曲 作品50","en":"J. Haydn: Piano Sonata in C Major Hob.50","note":""},
    {"zh":"舒曼：阿貝格變奏曲 作品1","en":"R. Schumann: Abegg Variation Op.1","note":""},
    {"zh":"舒伯特：降B大調即興曲 作品142之3","en":"F. Schubert: Impromptu in B-Flat Major Op.142 No.3","note":""},
    {"zh":"李斯特：第十號匈牙利狂想曲","en":"F. Liszt: Hungarian Rhapsody No.10","note":""},
    {"zh":"蕭邦：G小調第一號敘事曲 作品23","en":"F. Chopin: Ballade No.1 in G Minor Op.23","note":""},
    {"zh":"陳茂萱：第十三號小奏鳴曲","en":"Mao-Shuen Chen: Sonatina No.13","note":""}
  ]'::jsonb,
  '主辦單位／含光藝術工作室',
  1
);
