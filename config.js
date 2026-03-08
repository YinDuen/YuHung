// Supabase 設定（請替換為你的專案網址與 anon key）
// 從 Supabase Dashboard > Project Settings > API 取得
//
// 部署到自己的 VM/網域且登入出現 CORS 時：改用「反向代理」即可避開。
// 1. 在 VM 使用 deploy/nginx-yuhung-with-supabase-proxy.conf（並改裡面的 YOUR_SUPABASE_PROJECT_REF）
// 2. 下面改為使用代理網址（anon key 不變）：
//    window.SUPABASE_URL = window.location.origin + '/supabase-proxy';
//
window.SUPABASE_URL = 'https://cgrlvepdnboidphhzhiw.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncmx2ZXBkbmJvaWRwaGh6aGl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4ODM5MDAsImV4cCI6MjA4ODQ1OTkwMH0.1A8Bb32CUicm3cwp-j5ELMXetuGhm9TPRZEeLdWqaL8';
