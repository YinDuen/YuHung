# Yu-Hung Liao | 鋼琴家個人網頁

鋼琴家 **Yu-Hung Liao（廖宥閎）** 的個人官方網站。

## 內容

- **首頁**：姓名與簡短標語
- **關於**：簡介與經歷
- **曲目與演出**：獨奏、協奏曲、室內樂
- **影音**：演奏精選與錄音（可之後嵌入實際連結）
- **聯絡**：Email 與社群連結

## 使用方式

1. 用瀏覽器直接開啟 `index.html` 即可預覽。
2. 或使用本地伺服器（例如 VS Code Live Server、`npx serve .`）以獲得最佳體驗。

## 自訂

- **個人照片**：將您的個人照命名為 `photo.jpg` 放在專案根目錄（與 `index.html` 同層），首頁開頭會自動顯示。
- **背景鋼琴圖**：目前使用線上鋼琴琴鍵圖。若要改為自己的鋼琴照片，請將圖片命名為 `piano-keys.jpg` 放在專案根目錄，並在 `styles.css` 的 `.bg-piano-keys` 中把 `url("...")` 改為 `url("piano-keys.jpg")`。
- 在 `index.html` 中將「關於」區塊的 `.about-image-placeholder` 換成真實照片的 `<img>`。
- 在「影音」區塊的 `.media-card` 內加入實際的 YouTube / 音訊嵌入或連結。
- 在「聯絡」區塊更新 `contact@yuungliao.com` 與社群連結為真實網址。

## 後台管理（Supabase）

網站「關於」、「曲目」、「影音」、「聯絡」可由後台動態管理，資料存放在 Supabase。

### 1. 建立 Supabase 專案

1. 前往 [Supabase](https://supabase.com) 建立專案。
2. 在 **SQL Editor** 中執行 `supabase/migrations/001_initial_schema.sql` 的內容，建立資料表與預設資料。
3. 在 **Authentication > Providers** 啟用 Email，並在 **Authentication > Users** 中新增一位使用者（作為管理員帳密）。

### 2. 設定 config.js

在專案根目錄的 `config.js` 中填入你的 Supabase 網址與 anon key：

- **Project Settings > API**：複製 `Project URL` 與 `anon public` key。
- 將 `config.js` 內的 `SUPABASE_URL`、`SUPABASE_ANON_KEY` 替換成上述兩項。

### 3. 使用後台

- **請用本機伺服器開啟**（不要直接雙擊 `admin.html` 用 `file://` 開啟，否則會出現「Failed to fetch」無法登入）：
  - 在專案資料夾打開終端機，執行：`npx serve .`
  - 瀏覽器開啟：`http://localhost:3000/admin.html`
- 使用 Supabase 中建立的使用者 email / 密碼登入。
- 登入後可新增、修改、刪除「關於」、「曲目」、「影音」、「聯絡」的內容。
- 首頁 `index.html` 會自動從 Supabase 讀取並顯示最新內容；若未設定 Supabase，則顯示原本的靜態內容。

## 檔案結構

```
YuHung/
├── index.html       # 主頁
├── styles.css       # 樣式
├── script.js        # 導覽與捲動效果
├── config.js        # Supabase 設定（需自行填入）
├── data-loader.js   # 從 Supabase 載入首頁內容
├── admin.html       # 後台管理頁
├── admin.js         # 後台邏輯
├── admin.css        # 後台樣式
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # 資料表與 RLS
└── README.md
```

---

© Yu-Hung Liao
