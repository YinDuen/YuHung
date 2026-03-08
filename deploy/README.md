# 部署到 Google Cloud VM（Nginx）

此專案是**靜態網站**（HTML/CSS/JS + Supabase），不需要在 VM 上跑 Node.js。用 Nginx 直接提供檔案即可。

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
# 用 scp、git clone 或上傳方式，把專案裡的這些檔案放進去：
# index.html, admin.html, styles.css, admin.css, script.js, admin.js, data-loader.js, config.js
# 以及 images（若有）、supabase 等
```

### 2. 使用專案裡的 Nginx 設定

```bash
# 複製設定（路徑請依你專案在 VM 上的位置調整）
sudo cp /var/www/yuhung/deploy/nginx-yuhung.conf /etc/nginx/sites-available/yuhung

# 編輯設定，確認 root 路徑正確
sudo nano /etc/nginx/sites-available/yuhung
# root 要等於你放網站的目錄，例如：root /var/www/yuhung;

# 啟用站台
sudo ln -s /etc/nginx/sites-available/yuhung /etc/nginx/sites-enabled/

# 若原本有 default 會佔 80 port，可關掉避免衝突
# sudo rm /etc/nginx/sites-enabled/default

# 測試設定
sudo nginx -t

# 重載 nginx
sudo systemctl reload nginx
```

### 3. 對外連線

- 用瀏覽器連 **http://你的VM的IP**（或你的網域），應會看到首頁。
- 後台：**http://你的VM的IP/admin.html**

### 4. 不需要在 VM 上跑 Node 或 port 3000

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

### 3. 其他可能原因

- **公司／學校網路**：若 VM 在受管網路內，出站可能只允許白名單，需請管理員放行 `*.supabase.co` 或 HTTPS 443。
- **DNS**：在 VM 上執行 `nslookup 你的專案ref.supabase.co`，若解析不到，可暫時在 `/etc/hosts` 手動設 IP，或改用可用的 DNS（例如 8.8.8.8）。

VM 能連到 Supabase 後，再使用 **nginx-yuhung-with-supabase-proxy.conf** 與 `config.js` 的 `/supabase-proxy` 設定，代理才會正常。
