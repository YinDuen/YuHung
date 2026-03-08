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

### 如何驗證 anon key 是否有效

- **方式一（瀏覽器）**：用本機或 VM 上的網址開啟 **`test-supabase.html`**（例如 `http://localhost:3000/test-supabase.html` 或 `http://你的IP/test-supabase.html`）。頁面會對 Supabase 發一筆讀取請求並顯示結果：**HTTP 200** 表示 key 有效；**401** 表示 key 無效或過期；若出現 **Failed to fetch**，多半是 CORS 或網路問題，可改用 Nginx 代理或在本機用 `npx serve .` 開同來源再測。
- **方式二（指令列）**：在終端機執行（替換 `你的ANON_KEY` 與 `你的專案ref`）。**Windows 請用 CMD 或 Git Bash，並打 `curl.exe`**（不要用 PowerShell 的 curl 別名，否則可能沒有輸出）：
  ```bash
  curl.exe -s -w "HTTP 狀態碼: %{http_code}\n" -o nul -H "apikey: 你的ANON_KEY" -H "Authorization: Bearer 你的ANON_KEY" "https://你的專案ref.supabase.co/rest/v1/about?select=lead&limit=1"
  ```
  Linux / Mac 把 `-o nul` 改成 `-o /dev/null`。輸出 **HTTP 狀態碼: 200** 表示 key 有效；**401** 表示無效。

### 若部署到自己的網域或 VM（登入出現 CORS / preflight 失敗）

Supabase 託管版在 Dashboard **可能沒有**獨立的 CORS / Allowed Origins 設定，可依序嘗試以下兩種方式。

**方式一：Authentication 的 URL 設定（先試）**

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard) → 你的專案。
2. 左側選 **Authentication** → **URL Configuration**。
3. 將 **Site URL** 改成你後台的網址（例如 `http://你的VM的IP` 或 `https://你的網域.com`，不要加路徑）。
4. 在 **Redirect URLs** 新增同一網址（例如 `http://你的VM的IP/**` 或 `https://你的網域.com/**`）。
5. 儲存後再試登入。

若仍失敗，改用方式二。

**方式二：用 Nginx 反向代理（避開 CORS，一定可行）**

讓瀏覽器只對「你的網站」發請求，由 Nginx 代為轉發到 Supabase，就不會發生跨來源請求、也不受 CORS 影響。做法如下：

1. 在 VM 上使用專案裡的 **`deploy/nginx-yuhung-with-supabase-proxy.conf`**（內含 Supabase 代理設定），並把其中的 `YOUR_SUPABASE_PROJECT_REF` 改成你的專案 ref（Supabase 網址中間那段，例如 `cgrlvepdnboidphhzhiw`）。
2. 部署到 VM 的 **config.js** 改為使用代理路徑（見該設定檔內說明），例如：  
   `SUPABASE_URL = window.location.origin + '/supabase-proxy'`  
   或本機開發時仍用直接連線的 Supabase 網址。
3. 重載 Nginx 後，再從你的網址開 admin 登入。

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
├── index.html          # 主頁
├── styles.css          # 樣式
├── script.js           # 導覽與捲動效果
├── config.js           # Supabase 設定（需自行填入）
├── supabase-client.js  # 依官方文件建立單一 Supabase client
├── data-loader.js      # 從 Supabase 載入首頁內容
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
