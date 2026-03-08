/**
 * Supabase 連線（依官方文件建立單一 client）
 * @see https://supabase.com/docs/reference/javascript/introduction
 * @see https://supabase.com/docs/reference/javascript/initializing
 *
 * 依賴：config.js（SUPABASE_URL, SUPABASE_ANON_KEY）、@supabase/supabase-js CDN
 * 使用：window.supabaseClient（若未設定 config 則為 null）
 */
(function () {
  'use strict';

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    window.supabaseClient = null;
    return;
  }

  var url = window.SUPABASE_URL;
  var key = window.SUPABASE_ANON_KEY;

  if (!url || !key || String(url).indexOf('YOUR_') === 0) {
    window.supabaseClient = null;
    return;
  }

  // Create a single supabase client for interacting with your database（官方範例）
  window.supabaseClient = window.supabase.createClient(url, key);
})();
