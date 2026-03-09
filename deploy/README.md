# 部署到 Google Cloud VM（Nginx）

此專案是**靜態網站**（HTML/CSS/JS + Supabase），不需要在 VM 上跑 Node.js。用 Nginx 直接提供檔案即可。

---

## Google Cloud VM 與 Supabase 需要做什麼設定？（依官方文件）

依目前 Supabase 與 Google Cloud 文件，整理如下。

### Supabase 端：**不用**為 VM 做額外設定

- 我們是透過 **REST API / Auth（HTTPS）** 連 Supabase，不是直接連資料庫。
- Supabase 的 [Network Restrictions](https://supabase.com/docs/guides/platform/network-restrictions) 只適用於 **Postgres / database pooler 的連線**；**不適用**於 HTTPS API（PostgREST、Storage、Auth），也就是不影響用 supabase-js 或 Nginx 代理打 API 的連線。
- 因此：**不需要**在 Supabase Dashboard 把 GCP VM 的 IP 加入白名單，也不用為「VM 連 API」做任何 Supabase 端設定。

### Google Cloud 端：讓 VM 能對外發 HTTPS（443）

- VM 或 Nginx 要能連到 `https://你的專案ref.supabase.co`，必須允許 **出站（egress）** 的 **TCP 443** 到網際網路。
- 若使用 **default VPC**，通常已有允許對外連線的規則；若 VM 仍連不到 Supabase，請檢查：
  1. **VPC 網路 → 防火牆**：[Firewall rules](https://cloud.google.com/firewall/docs/using-firewalls) 裡是否有 **egress** 規則擋住出站；若有自訂 egress，需有一條 **Allow**、**tcp:443**、目的地為網際網路（例如 `0.0.0.0/0`）。
  2. **VM 沒有外部位址時**：需透過 [Cloud NAT](https://cloud.google.com/nat/docs/overview) 才能連外，請確認 NAT 已啟用且路由正確。
  3. **進階**：若使用 [Global network firewall policies](https://cloud.google.com/firewall/docs/use-network-firewall-policies)，可針對 FQDN（如 `*.supabase.co`）放行 egress，但一般 VPC 防火牆允許 443 出站即可。

**參考文件**：
- [Supabase: Network Restrictions](https://supabase.com/docs/guides/platform/network-restrictions)（說明僅限 DB，不影響 API）
- [GCP: Firewall rules](https://cloud.google.com/firewall/docs/using-firewalls)、[Create a firewall rule](https://cloud.google.com/compute/docs/samples/compute-firewall-create)

## 為何「連到 port 3000 會連到 /etc/nginx/sites-available」？

- **Port 3000** 通常是你本機用 `npx serve .` 開的，在 VM 上**不必**再開 port 3000。
- 若你在 VM 上把 nginx 或某個 server block 指到 `root /etc/nginx/sites-available`，瀏覽器就會變成在「看設定檔目錄」或錯誤路徑。  
  **正確做法**：`root` 要指到**網站檔案所在目錄**（例如 `/var/www/yuhung`），不是 nginx 的設定目錄。

## 建議步驟

### 1. 把網站檔案放到 VM

例如放到 `/var/www/yuhung`：

```bash
# 在 VM 上建立目錄
sudo mkdir -p /var/www/yuhung
# 用 scp、git clone 或上傳方式，把專案裡的這些檔案放進去
```

**若本機（或 file://）已看到改動，但 Nginx 上看不到（例如後台沒有曲目海報欄位、首頁沒有海報）**：代表 Nginx 提供的檔案不是最新版。常見原因是 **Nginx 的 root 目錄 ≠ 你執行 git pull 的目錄**。

**檢查方式（在 VM 上）：**

```bash
# 1. 看 Nginx 實際用哪個目錄（在設定檔裡）
grep -r "root " /etc/nginx/sites-enabled/
# 例如顯示 root /var/www/yuhung;

# 2. 看你在哪個目錄做 git pull
pwd
ls -la index.html admin.html data-loader.js
# 若 git pull 是在 /home/xxx/YuHung，而 Nginx root 是 /var/www/yuhung，兩邊不同就會看到舊版
```

**做法一：讓 Nginx 直接指到 git 目錄（建議）**

若你的 repo 在 VM 上是例如 `/home/你的帳號/YuHung`，把 Nginx 的 `root` 改成這個路徑，之後在該目錄做 `git pull` 就會立刻生效。

```bash
sudo nano /etc/nginx/sites-available/yuhung
# 把 root /var/www/yuhung; 改成 root /home/你的帳號/YuHung;
sudo nginx -t && sudo systemctl reload nginx
```

**做法二：git pull 後複製到 Nginx 目錄**

若你希望 Nginx 仍用 `/var/www/yuhung`，就在 **同一個 VM** 上、在 **clone 專案的那個目錄** 做 `git pull`，再複製到 Nginx root：

```bash
cd /path/to/your/YuHung   # 你 clone 的目錄
git pull
sudo cp -r index.html admin.html styles.css admin.css script.js admin.js data-loader.js config.js supabase-client.js /var/www/yuhung/
# 或整份覆蓋（注意不要蓋掉你在 VM 上改過的 config.js，若有的話先備份）
```

完整要覆蓋的檔案見 **`deploy/files-to-upload.txt`**。更新後在瀏覽器用 **Ctrl+Shift+R** 強制重新整理。

### 2. 使用專案裡的 Nginx 設定

**「放到 sites-available 並啟用」是什麼意思？**

- **sites-available/**：放「可用的」設定檔，只是擺著，Nginx 還不會用。
- **sites-enabled/**：放「已啟用」的設定；通常放的是**符號連結**，指到 sites-available 裡的某個檔。Nginx 只會讀取 sites-enabled 裡的內容。
- 所以流程是：**把設定檔放到 sites-available（新檔，不要覆蓋 default）→ 在 sites-enabled 裡做一個連結指向它 = 啟用**。

**要不要覆蓋 default？**  
不用覆蓋。建議**新增一個檔**（例如 `yuhung`），啟用後若希望 80 port 只給你的網站用，再**關掉** default 的啟用（刪掉 sites-enabled 裡對 default 的連結即可）。

```bash
# 複製設定成「新檔」yuhung（不覆蓋 default）
sudo cp /var/www/yuhung/deploy/nginx-yuhung.conf /etc/nginx/sites-available/yuhung

# 編輯設定，確認 root 路徑正確
sudo nano /etc/nginx/sites-available/yuhung
# root 要等於你放網站的目錄，例如：root /var/www/yuhung;

# 啟用 = 在 sites-enabled 裡做一個連結指向 yuhung
sudo ln -s /etc/nginx/sites-available/yuhung /etc/nginx/sites-enabled/yuhung

# 若希望用你 VM 的 IP 連進來時只看到你的網站，可「停用」default（刪掉連結，default 檔還在）
sudo rm /etc/nginx/sites-enabled/default

# 測試設定
sudo nginx -t

# 重載 nginx
sudo systemctl reload nginx
```

### 3. 對外連線

- 用瀏覽器連 **http://你的VM的IP**（或你的網域），應會看到首頁。
- 後台：**http://你的VM的IP/admin.html**

### 4. 本機可連 Supabase、VM 上卻 fetch 失敗時（必做）

本機（localhost）能連、VM 上開 admin 卻失敗，通常是：**從 VM 網址發出的請求是跨來源連 Supabase，被 CORS 擋下**。解法：在 VM 上改為「走 Nginx 代理」，讓瀏覽器只對你的 VM 發請求，由 Nginx 代轉到 Supabase（同來源就不會 CORS）。

請依序做：

| 步驟 | 說明 |
|------|------|
| ① Nginx 用代理版 | 在 VM 上改用 **`deploy/nginx-yuhung-with-supabase-proxy.conf`**（不要用只有靜態的 nginx-yuhung.conf）。把裡面的 `cgrlvepdnboidphhzhiw` 改成你的 Supabase 專案 ref，`root` 改成你網站目錄。 |
| ② VM 上的 config.js 改網址 | **部署在 VM 的** `config.js` 裡，把 `SUPABASE_URL` 改成 **同來源 + 代理路徑**，anon key 不變。例如 VM 上的 config.js 可只留這兩行：<br><br>`window.SUPABASE_URL = window.location.origin + '/supabase-proxy';`<br>`window.SUPABASE_ANON_KEY = '你的 anon key';` |
| ③ 重載 Nginx | `sudo nginx -t` 後執行 `sudo systemctl reload nginx`。 |
| ④ 確認 VM 能連外 | 在 VM 上執行：<br>`curl -s -o /dev/null -w "%{http_code}" -H "apikey: 你的KEY" -H "Authorization: Bearer 你的KEY" "https://你的專案ref.supabase.co/rest/v1/about?select=lead&limit=1"`<br>若得到 **200 或 401** 表示 VM 能連 Supabase；若逾時或失敗，請看下方「VM 連不到 Supabase」一節。 |

完成後，用 **http://你的VM的IP/admin.html** 再試登入或讀取資料。此時所有請求都是「瀏覽器 → 你的 VM → Nginx → Supabase」，不再跨來源，就不會再被 CORS 擋。

### 5. 不需要在 VM 上跑 Node 或 port 3000

- `npx serve .` 僅建議在**本機**使用，避免 `file://` 造成「Failed to fetch」。
- 在 VM 上由 **Nginx 直接提供靜態檔**即可，不需再開 port 3000。

## 若你希望「對外只開 80，內部用 3000」

若你堅持在 VM 上跑 Node（例如 `npx serve .`）並用 Nginx 轉發，可以這樣設（不建議，靜態站用上面方式即可）：

```nginx
server {
    listen 80 default_server;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

這樣外層只開 80，由 nginx 轉到本機 3000。但對目前這個靜態專案，直接讓 nginx 當 root 提供檔案較簡單也較省資源。

---

## 使用 Supabase 代理設定時出現 500

若改用 **nginx-yuhung-with-supabase-proxy.conf** 後出現 **500 Internal Server Error**、連首頁都打不開：

1. **先還原成「無代理」設定**，確認網站本身正常：
   - 用回 `deploy/nginx-yuhung.conf`（沒有 `/supabase-proxy/` 的那份）
   - `sudo nginx -t` 後 `sudo systemctl reload nginx`
   - 確認用 `http://你的IP/` 能打開首頁

2. **確認 root 路徑存在且正確**：
   - 設定裡的 `root /var/www/yuhung` 必須是 VM 上**實際放網站檔案的目錄**
   - 該目錄裡要有 `index.html`、`admin.html`、`config.js` 等
   - 若你實際路徑是 `/var/www/html/YuHung`，請把設定裡的 root 改成 `root /var/www/html/YuHung;`

3. **再換回代理版**：已移除容易導致 500 的 `if (OPTIONS)` 區塊，請重新複製最新的 **nginx-yuhung-with-supabase-proxy.conf** 到 sites-available，改好 root 與專案 ref 後再 `nginx -t` 與 `reload`。

4. **若你是用「子路徑」開站**（例如網址是 `http://IP/YuHung/`）：
   - 需要把網站檔案放在對應實體路徑（例如 root 的上一層，並用 `location /YuHung/ { alias /var/www/實際目錄/; }` 之類方式對應），或改為用網域／根路徑架站，避免 root 與網址路徑不一致。

---

## VM 連不到 Supabase 時（Nginx 代理要生效，VM 必須能連外）

Nginx 反向代理的流程是：**瀏覽器 → 你的 VM (Nginx) → Supabase**。若 **VM 本身連不到 Supabase**（出站被擋或 DNS 有問題），代理也會失敗，無法靠「只改 Nginx 設定」解決，必須先讓 VM 能對外連到 Supabase。

### 1. 在 VM 上確認能否連到 Supabase

SSH 進 VM 後執行（請換成你的專案 ref 與 anon key）：

```bash
# 測試 DNS 與連線（應有回應或 200）
curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: 你的ANON_KEY" -H "Authorization: Bearer 你的ANON_KEY" \
  "https://你的專案ref.supabase.co/rest/v1/about?select=lead&limit=1"
```

- 輸出 **200** 或 **401**：VM 能連 Supabase，問題在別處（例如瀏覽器 CORS）。
- 逾時、連線被拒、無輸出：VM **出站**到 Supabase 被擋，要處理網路／防火牆。

### 2. Google Cloud 上放行 VM 對外連線（HTTPS）

在 **Google Cloud Console**：

1. 左側選 **VPC 網路** → **防火牆**（或 **VPC network** → **Firewall**）。
2. 預設通常已有 **egress（出站）** 允許：若你的 VM 使用 **default** 網路，多數情況預設允許所有出站。若仍連不到，可新增一條 **出站規則**：
   - **方向**：Egress（出站）
   - **目標**：網路上的所有執行個體，或指定該 VM 的網路標籤
   - **允許**：tcp:443（HTTPS）
   - **目的地**：`0.0.0.0/0`（或僅允許 Supabase：需查 Supabase 的 IP 或使用 FQDN，多數情況用 0.0.0.0/0 較簡單）
3. 若 VM 透過 **Cloud NAT** 或 **無外部位址** 上網，請確認 NAT / 路由有允許對外 443。
4. 若專案有 **組織政策** 或 **防火牆** 限制僅能連特定網域，需把 `*.supabase.co` 或 `你的專案ref.supabase.co` 加入允許清單。

### 3. 已加 443 egress 仍失敗（curl 回傳 000 或逾時）— 逐步排查

在 VM 上依序執行下面指令，看卡在哪一步。

**① 看 curl 的實際錯誤（必做）**

```bash
curl -v --connect-timeout 10 \
  -H "apikey: 你的ANON_KEY" -H "Authorization: Bearer 你的ANON_KEY" \
  "https://你的專案ref.supabase.co/rest/v1/about?select=lead&limit=1"
```

看輸出最後的錯誤訊息，對照下表：

| 錯誤關鍵字 | 可能原因 | 建議 |
|------------|----------|------|
| `Could not resolve host` / `Name or service not known` | DNS 解析失敗 | 見下方 ② DNS |
| `Connection timed out` / `Operation timed out` | 連不到 Supabase（被擋或沒路徑） | 見 ③④⑤ |
| `Connection refused` | 對方或中間設備拒連 | 較少見，確認網址與 port 是否正確 |
| `SSL certificate` / `SSL_connect` 錯誤 | TLS 問題 | 試 `curl -k` 暫時略過憑證，若這樣能通代表是憑證／時間問題 |

**② 確認 DNS**

```bash
nslookup 你的專案ref.supabase.co
# 或
getent hosts 你的專案ref.supabase.co
```

- 若查不到：VM 可能無法用預設 DNS 連外。可改試 `8.8.8.8`：`nslookup 你的專案ref.supabase.co 8.8.8.8`；若用 8.8.8.8 能解析，需在 VM 或 VPC 設定使用可連外的 DNS（例如 8.8.8.8）。

**③ 確認 VM 有辦法連到外網（任意 HTTPS）**

```bash
curl -v --connect-timeout 5 https://www.google.com
```

- 若 **Google 也連不到**：代表 VM 對外 443 整體不通，不是只有 Supabase。常見原因：
  - **VM 沒有外部位址**，且 **沒有設 Cloud NAT**：在 GCP 左側 **網路** → **NAT**，為該 VPC/子網建立 Cloud NAT，讓沒有外部位址的 VM 透過 NAT 連外。
  - **Egress 規則沒套到這台 VM**：你加的是「防火牆政策」時，要確認該政策已**綁到**你的 VPC 或資料夾／組織，且規則的 **target** 有包含這台 VM（或該網路）；若是 **VPC 防火牆規則**，目標要選「網路上的所有執行個體」或該 VM 的網路標籤。
  - **有「拒絕」出站的規則**：若專案裡有 **Deny egress** 或 **Deny 0.0.0.0/0** 的規則，且**優先順序比你的 Allow 443 高**，會先被拒絕。請在 **VPC 網路 → 防火牆** 檢查所有 egress 規則的**優先順序**，確保 Allow 443 的優先順序**數字比 Deny 小**（數字越小優先越高）。

**④ 確認「443 egress」規則有套到這台 VM**

- 若你加的是 **VPC 防火牆規則**（VPC network → Firewall）：
  - **方向** 必須是 **Egress**。
  - **目標** 要包含這台 VM（例如「網路上的所有執行個體」或該 VM 的**網路標籤**；若 VM 沒加標籤，就不會被「依標籤」的規則套到）。
  - **允許**：tcp:443，**目的地**：0.0.0.0/0（或至少包含網際網路）。
- 若你加的是 **防火牆政策**（Network firewall policies / Hierarchical firewall policies）：
  - 該政策必須**已套用**到你這個專案／VPC／資料夾（依你用的類型而定）。
  - 政策內的規則同樣要 **Egress、Allow、tcp 443、目的地 0.0.0.0/0**，且沒有更高優先順序的 Deny 擋住。

**⑤ VM 沒有外部位址時一定要有 Cloud NAT**

- 在 GCP 主控台：**網路** → **NAT**（或 **VPC 網路** → **Cloud NAT**）。
- 為你 VM 所在的 **VPC 與區域** 建立 NAT 閘道，並允許該子網使用 NAT。沒有外部位址的 VM 只能靠 NAT 連外，單獨加 443 egress 不夠。

---

### 4. 其他可能原因

- **公司／學校網路**：若 VM 在受管網路內，出站可能只允許白名單，需請管理員放行 `*.supabase.co` 或 HTTPS 443。
- **DNS**：若 ② 用 8.8.8.8 能解析，可在 VM 上把預設 DNS 改為 8.8.8.8（或在該 VPC 的 DHCP 選項集設定）。

VM 能連到 Supabase 後，再使用 **nginx-yuhung-with-supabase-proxy.conf** 與 `config.js` 的 `/supabase-proxy` 設定，代理才會正常。
