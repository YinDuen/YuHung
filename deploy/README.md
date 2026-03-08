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
