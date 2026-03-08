(function () {
  'use strict';

  // 使用依官方文件初始化的單一 client（見 supabase-client.js）
  var supabase = window.supabaseClient;
  if (!supabase) {
    var el = document.getElementById('loginWrap');
    if (el) el.innerHTML = '<p class="error">請先在 config.js 設定 SUPABASE_URL 與 SUPABASE_ANON_KEY。</p>';
    return;
  }

  var loginWrap = document.getElementById('loginWrap');
  var headerLoggedOut = document.getElementById('headerLoggedOut');
  var headerLoggedIn = document.getElementById('headerLoggedIn');
  var userEmail = document.getElementById('userEmail');
  var adminNav = document.getElementById('adminNav');
  var adminMain = document.getElementById('adminMain');

  function showMsg(panelId, text, isError) {
    var el = document.getElementById(panelId + 'Msg');
    if (!el) return;
    el.innerHTML = '<div class="msg ' + (isError ? 'error' : 'success') + '">' + escapeHtml(text) + '</div>';
    setTimeout(function () { el.innerHTML = ''; }, 4000);
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /** 從影片連結取得縮圖 URL（支援 YouTube、youtu.be） */
  function getVideoThumbnailUrl(videoUrl) {
    if (!videoUrl || !videoUrl.trim()) return '';
    var u = videoUrl.trim();
    var ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return 'https://img.youtube.com/vi/' + ytMatch[1] + '/hqdefault.jpg';
    return '';
  }

  function formatLoginError(msg) {
    var isFileProtocol = window.location.protocol === 'file:';
    var isFetchError = !msg || (msg.toLowerCase().indexOf('fetch') !== -1) || (msg.toLowerCase().indexOf('network') !== -1);

    if (isFileProtocol && isFetchError) {
      return '無法連線至 Supabase。請勿直接開啟檔案（file://），改用以「本機伺服器」開啟頁面。例如在專案資料夾執行：npx serve . 然後用 http://localhost:3000/admin.html 登入。';
    }
    if (isFetchError) {
      return '連線至 Supabase 失敗（' + (msg || '網路錯誤') + '）。請檢查：1) config.js 的 SUPABASE_URL、SUPABASE_ANON_KEY 是否正確 2) 伺服器能否連外（可 ping supabase.co）3) Supabase 專案是否已暫停。';
    }
    return msg;
  }

  function switchPanel(panelId) {
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.admin-nav a').forEach(function (a) { a.classList.remove('active'); });
    var panel = document.getElementById('panel-' + panelId);
    var link = document.querySelector('.admin-nav a[data-panel="' + panelId + '"]');
    if (panel) panel.classList.add('active');
    if (link) link.classList.add('active');
    if (panelId === 'repertoire') loadRepertoire();
    if (panelId === 'media') loadMedia();
  }

  // 為請求加逾時，避免透過代理時無回應導致畫面卡住
  function withTimeout(promise, ms) {
    var timeout = new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('請求逾時（' + ms / 1000 + ' 秒）')); }, ms);
    });
    return Promise.race([promise, timeout]);
  }

  supabase.auth.onAuthStateChange(function (event, session) {
    if (session) {
      document.body.classList.add('logged-in');
      headerLoggedOut.style.display = 'none';
      headerLoggedIn.style.display = 'flex';
      loginWrap.style.display = 'none';
      adminNav.style.display = 'flex';
      adminMain.style.display = 'block';
      userEmail.textContent = session.user.email;
      var hash = (window.location.hash || '#about').slice(1);
      switchPanel(hash || 'about');
      // 登入後非同步載入關於／聯絡，加逾時與 catch 避免 hang
      withTimeout(supabase.from('about').select('*').limit(1).maybeSingle(), 15000).then(function (r) {
        if (r.data) {
          document.getElementById('aboutLead').value = r.data.lead || '';
          document.getElementById('aboutParagraphs').value = Array.isArray(r.data.paragraphs) ? r.data.paragraphs.join('\n') : '';
          document.getElementById('aboutImageUrl').value = r.data.image_url || '';
        }
      }).catch(function () {});
      withTimeout(supabase.from('contact').select('*').limit(1).maybeSingle(), 15000).then(function (r) {
        if (r.data) {
          var row = r.data;
          document.getElementById('contactIntro').value = row.intro || '';
          document.getElementById('contactEmail').value = row.email || '';
          var social = row.social_links || {};
          document.getElementById('contactYoutube').value = social.youtube || '';
          document.getElementById('contactFacebook').value = social.facebook || '';
          document.getElementById('contactInstagram').value = social.instagram || '';
        }
      }).catch(function () {});
    } else {
      document.body.classList.remove('logged-in');
      headerLoggedIn.style.display = 'none';
      headerLoggedOut.style.display = 'flex';
      loginWrap.style.display = 'block';
      adminNav.style.display = 'none';
      adminMain.style.display = 'none';
    }
  });

  window.addEventListener('hashchange', function () {
    var panelId = (window.location.hash || '#about').slice(1) || 'about';
    switchPanel(panelId);
  });

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var errEl = document.getElementById('loginError');
    var btn = document.querySelector('#loginForm button[type="submit"]');
    errEl.textContent = '';
    var originalBtnText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '登入中…';
    supabase.auth.signInWithPassword({
      email: document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value
    }).then(function (result) {
      if (result.error) {
        var msg = result.error.message || '登入失敗，請檢查帳號與密碼。';
        errEl.textContent = formatLoginError(msg);
      } else {
        errEl.textContent = '';
      }
    }).catch(function (err) {
      errEl.textContent = formatLoginError(err.message || '連線錯誤，請稍後再試。');
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = originalBtnText;
    });
  });

  document.getElementById('btnLogout').addEventListener('click', function () {
    supabase.auth.signOut();
  });

  document.querySelectorAll('.admin-nav a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.hash = a.getAttribute('data-panel');
    });
  });

  // ---------- 關於 ----------
  function loadAbout() {
    withTimeout(supabase.from('about').select('*').limit(1).maybeSingle(), 15000).then(function (r) {
      if (r.data) {
        document.getElementById('aboutLead').value = r.data.lead || '';
        document.getElementById('aboutParagraphs').value = Array.isArray(r.data.paragraphs) ? r.data.paragraphs.join('\n') : '';
        document.getElementById('aboutImageUrl').value = r.data.image_url || '';
      }
    }).catch(function () {});
  }

  document.getElementById('aboutForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var lead = document.getElementById('aboutLead').value.trim();
    var paraText = document.getElementById('aboutParagraphs').value.trim();
    var paragraphs = paraText ? paraText.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) : [];
    var image_url = document.getElementById('aboutImageUrl').value.trim();
    supabase.from('about').select('id').limit(1).maybeSingle().then(function (res) {
      var payload = { lead: lead, paragraphs: paragraphs, image_url: image_url, updated_at: new Date().toISOString() };
      if (res.data) {
        return supabase.from('about').update(payload).eq('id', res.data.id);
      } else {
        return supabase.from('about').insert(payload);
      }
    }).then(function (r) {
      if (r.error) throw r.error;
      showMsg('about', '已儲存');
    }).catch(function (err) {
      showMsg('about', err.message || '儲存失敗', true);
    });
  });

  // ---------- 曲目 ----------
  function loadRepertoire() {
    var listEl = document.getElementById('repertoireList');
    listEl.innerHTML = '<span class="loading">載入中…</span>';
    var req = supabase.from('repertoire').select('*').order('sort_order', { ascending: false });
    withTimeout(req, 15000).then(function (r) {
      if (r.error) {
        listEl.innerHTML = '<span class="error">' + escapeHtml(r.error.message) + '</span>';
        return;
      }
      var rows = r.data || [];
      if (rows.length === 0) {
        listEl.innerHTML = '<p class="text-muted">尚無曲目，請由上表新增。</p>';
        return;
      }
      listEl.innerHTML = rows.map(function (c) {
        var program = Array.isArray(c.program) ? c.program : [];
        var preview = program.slice(0, 2).map(function (p) { return (p.zh || '').slice(0, 30); }).join('、');
        return '<div class="item-card" data-id="' + escapeHtml(c.id) + '">' +
          '<div class="body"><h4>' + escapeHtml(c.title) + '</h4><p>' + escapeHtml(c.meta || '') + ' ' + escapeHtml(preview) + '</p></div>' +
          '<div class="actions">' +
          '<button type="button" class="btn btn-secondary btn-sm btn-edit-rep">編輯</button>' +
          '<button type="button" class="btn btn-danger btn-sm btn-delete-rep">刪除</button>' +
          '</div></div>';
      }).join('');
      listEl.querySelectorAll('.btn-delete-rep').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.item-card');
          var id = card.getAttribute('data-id');
          if (!confirm('確定刪除此筆曲目？')) return;
          supabase.from('repertoire').delete().eq('id', id).then(function (rr) {
            if (rr.error) return showMsg('repertoire', rr.error.message, true);
            card.remove();
            showMsg('repertoire', '已刪除');
          });
        });
      });
      listEl.querySelectorAll('.btn-edit-rep').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.item-card');
          var id = card.getAttribute('data-id');
          var item = rows.find(function (x) { return x.id === id; });
          if (!item) return;
          document.getElementById('repTitle').value = item.title || '';
          document.getElementById('repMeta').value = item.meta || '';
          var program = Array.isArray(item.program) ? item.program : [];
          document.getElementById('repProgram').value = program.map(function (p) {
            return [p.zh || '', p.en || '', p.note || ''].join(' | ').replace(/\s*\|\s*$/, '');
          }).join('\n');
          document.getElementById('repOrg').value = item.org || '';
          document.getElementById('repPosterUrl').value = item.poster_url || '';
          document.getElementById('repPosterFile').value = '';
          document.getElementById('repSortOrder').value = item.sort_order || 0;
          document.getElementById('repertoireForm').setAttribute('data-edit-id', id);
          document.getElementById('repertoireForm').scrollIntoView();
        });
      });
    }).catch(function () {
      listEl.innerHTML = '<p class="err">載入失敗或逾時，請稍後再試。</p>';
    });
  }

  document.getElementById('repertoireForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var editId = form.getAttribute('data-edit-id');
    var title = document.getElementById('repTitle').value.trim();
    var meta = document.getElementById('repMeta').value.trim();
    var programText = document.getElementById('repProgram').value.trim();
    var program = programText ? programText.split('\n').map(function (line) {
      var parts = line.split('|').map(function (s) { return s.trim(); });
      return { zh: parts[0] || '', en: parts[1] || '', note: parts[2] || '' };
    }).filter(function (p) { return p.zh || p.en; }) : [];
    var org = document.getElementById('repOrg').value.trim();
    var sort_order = parseInt(document.getElementById('repSortOrder').value, 10) || 0;
    var posterUrlInput = document.getElementById('repPosterUrl');
    var posterFileInput = document.getElementById('repPosterFile');

    function saveRepertoire(poster_url) {
      var payload = { title: title, meta: meta, program: program, org: org, sort_order: sort_order, poster_url: poster_url || '', updated_at: new Date().toISOString() };
      var promise = editId
        ? supabase.from('repertoire').update(payload).eq('id', editId)
        : supabase.from('repertoire').insert(payload);
      promise.then(function (r) {
        if (r.error) throw r.error;
        showMsg('repertoire', editId ? '已更新' : '已新增');
        form.removeAttribute('data-edit-id');
        form.reset();
        document.getElementById('repSortOrder').value = 0;
        posterFileInput.value = '';
        loadRepertoire();
      }).catch(function (err) {
        showMsg('repertoire', err.message || '操作失敗', true);
      });
    }

    if (posterFileInput.files && posterFileInput.files.length > 0) {
      var file = posterFileInput.files[0];
      var path = Date.now() + '-' + (file.name || 'poster').replace(/[^a-zA-Z0-9._-]/g, '_');
      supabase.storage.from('repertoire-posters').upload(path, file, { upsert: true }).then(function (r) {
        if (r.error) throw r.error;
        var publicUrl = supabase.storage.from('repertoire-posters').getPublicUrl(r.data.path).data.publicUrl;
        saveRepertoire(publicUrl);
      }).catch(function (err) {
        showMsg('repertoire', err.message || '海報上傳失敗', true);
      });
    } else {
      saveRepertoire(posterUrlInput.value.trim());
    }
  });

  // ---------- 影音 ----------
  function loadMedia() {
    var listEl = document.getElementById('mediaList');
    listEl.innerHTML = '<span class="loading">載入中…</span>';
    var req = supabase.from('media').select('*').order('sort_order', { ascending: true });
    withTimeout(req, 15000).then(function (r) {
      if (r.error) {
        listEl.innerHTML = '<span class="error">' + escapeHtml(r.error.message) + '</span>';
        return;
      }
      var rows = r.data || [];
      if (rows.length === 0) {
        listEl.innerHTML = '<p class="text-muted">尚無影音，請由上表新增。</p>';
        return;
      }
      listEl.innerHTML = rows.map(function (m) {
        return '<div class="item-card" data-id="' + escapeHtml(m.id) + '">' +
          '<div class="body"><h4>' + escapeHtml(m.title) + '</h4><p>' + escapeHtml(m.description || '') + '</p></div>' +
          '<div class="actions">' +
          '<button type="button" class="btn btn-secondary btn-sm btn-edit-media">編輯</button>' +
          '<button type="button" class="btn btn-danger btn-sm btn-delete-media">刪除</button>' +
          '</div></div>';
      }).join('');
      listEl.querySelectorAll('.btn-delete-media').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.item-card');
          var id = card.getAttribute('data-id');
          if (!confirm('確定刪除此筆影音？')) return;
          supabase.from('media').delete().eq('id', id).then(function (rr) {
            if (rr.error) return showMsg('media', rr.error.message, true);
            card.remove();
            showMsg('media', '已刪除');
          });
        });
      });
      listEl.querySelectorAll('.btn-edit-media').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.item-card');
          var id = card.getAttribute('data-id');
          var item = rows.find(function (x) { return x.id === id; });
          if (!item) return;
          document.getElementById('mediaTitle').value = item.title || '';
          document.getElementById('mediaDescription').value = item.description || '';
          document.getElementById('mediaVideoUrl').value = item.video_url || '';
          document.getElementById('mediaThumbnailUrl').value = item.thumbnail_url || '';
          document.getElementById('mediaSortOrder').value = item.sort_order || 0;
          document.getElementById('mediaForm').setAttribute('data-edit-id', id);
          document.getElementById('mediaForm').scrollIntoView();
        });
      });
    }).catch(function () {
      listEl.innerHTML = '<p class="err">載入失敗或逾時，請稍後再試。</p>';
    });
  }

  document.getElementById('mediaForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var editId = form.getAttribute('data-edit-id');
    var videoUrl = document.getElementById('mediaVideoUrl').value.trim();
    var thumbnailUrl = document.getElementById('mediaThumbnailUrl').value.trim();
    if (!thumbnailUrl && videoUrl) thumbnailUrl = getVideoThumbnailUrl(videoUrl);
    var payload = {
      title: document.getElementById('mediaTitle').value.trim(),
      description: document.getElementById('mediaDescription').value.trim(),
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      sort_order: parseInt(document.getElementById('mediaSortOrder').value, 10) || 0,
      updated_at: new Date().toISOString()
    };
    var promise = editId
      ? supabase.from('media').update(payload).eq('id', editId)
      : supabase.from('media').insert(payload);
    promise.then(function (r) {
      if (r.error) throw r.error;
      showMsg('media', editId ? '已更新' : '已新增');
      form.removeAttribute('data-edit-id');
      form.reset();
      document.getElementById('mediaSortOrder').value = 0;
      loadMedia();
    }).catch(function (err) {
      showMsg('media', err.message || '操作失敗', true);
    });
  });

  // ---------- 聯絡 ----------
  function loadContact() {
    withTimeout(supabase.from('contact').select('*').limit(1).maybeSingle(), 15000).then(function (r) {
      if (r.data) {
        var row = r.data;
        document.getElementById('contactIntro').value = row.intro || '';
        document.getElementById('contactEmail').value = row.email || '';
        var social = row.social_links || {};
        document.getElementById('contactYoutube').value = social.youtube || '';
        document.getElementById('contactFacebook').value = social.facebook || '';
        document.getElementById('contactInstagram').value = social.instagram || '';
      }
    }).catch(function () {});
  }

  document.getElementById('contactForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var intro = document.getElementById('contactIntro').value.trim();
    var email = document.getElementById('contactEmail').value.trim();
    var social_links = {
      youtube: document.getElementById('contactYoutube').value.trim(),
      facebook: document.getElementById('contactFacebook').value.trim(),
      instagram: document.getElementById('contactInstagram').value.trim()
    };
    supabase.from('contact').select('id').limit(1).maybeSingle().then(function (res) {
      var payload = { intro: intro, email: email, social_links: social_links, updated_at: new Date().toISOString() };
      if (res.data) {
        return supabase.from('contact').update(payload).eq('id', res.data.id);
      } else {
        return supabase.from('contact').insert(payload);
      }
    }).then(function (r) {
      if (r.error) throw r.error;
      showMsg('contact', '已儲存');
    }).catch(function (err) {
      showMsg('contact', err.message || '儲存失敗', true);
    });
  });

  // 初始：若已有 session 會由 onAuthStateChange 處理
  supabase.auth.getSession().then(function (r) {
    if (r.data.session) {
      document.body.classList.add('logged-in');
      headerLoggedOut.style.display = 'none';
      headerLoggedIn.style.display = 'flex';
      loginWrap.style.display = 'none';
      adminNav.style.display = 'flex';
      adminMain.style.display = 'block';
      userEmail.textContent = r.data.session.user.email;
      var hash = (window.location.hash || '#about').slice(1);
      switchPanel(hash || 'about');
      withTimeout(supabase.from('about').select('*').limit(1).maybeSingle(), 15000).then(function (res) {
        if (res.data) {
          document.getElementById('aboutLead').value = res.data.lead || '';
          document.getElementById('aboutParagraphs').value = Array.isArray(res.data.paragraphs) ? res.data.paragraphs.join('\n') : '';
          document.getElementById('aboutImageUrl').value = res.data.image_url || '';
        }
      }).catch(function () {});
      withTimeout(supabase.from('contact').select('*').limit(1).maybeSingle(), 15000).then(function (res) {
        if (res.data) {
          var row = res.data;
          document.getElementById('contactIntro').value = row.intro || '';
          document.getElementById('contactEmail').value = row.email || '';
          var social = row.social_links || {};
          document.getElementById('contactYoutube').value = social.youtube || '';
          document.getElementById('contactFacebook').value = social.facebook || '';
          document.getElementById('contactInstagram').value = social.instagram || '';
        }
      }).catch(function () {});
    }
  });
})();
