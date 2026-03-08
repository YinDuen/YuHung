(function () {
  'use strict';

  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || window.SUPABASE_URL.indexOf('YOUR_') === 0) {
    document.getElementById('loginWrap').innerHTML = '<p class="error">請先在 config.js 設定 SUPABASE_URL 與 SUPABASE_ANON_KEY。</p>';
    return;
  }

  var supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

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

  supabase.auth.onAuthStateChange(function (event, session) {
    if (session) {
      headerLoggedOut.style.display = 'none';
      headerLoggedIn.style.display = 'flex';
      loginWrap.style.display = 'none';
      adminNav.style.display = 'flex';
      adminMain.style.display = 'block';
      userEmail.textContent = session.user.email;
      loadAbout();
      loadContact();
      var hash = (window.location.hash || '#about').slice(1);
      switchPanel(hash || 'about');
    } else {
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
    supabase.from('about').select('*').limit(1).maybeSingle().then(function (r) {
      if (r.data) {
        document.getElementById('aboutLead').value = r.data.lead || '';
        document.getElementById('aboutParagraphs').value = Array.isArray(r.data.paragraphs) ? r.data.paragraphs.join('\n') : '';
        document.getElementById('aboutImageUrl').value = r.data.image_url || '';
      }
    });
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
    supabase.from('repertoire').select('*').order('sort_order', { ascending: false }).then(function (r) {
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
          document.getElementById('repSortOrder').value = item.sort_order || 0;
          document.getElementById('repertoireForm').setAttribute('data-edit-id', id);
          document.getElementById('repertoireForm').scrollIntoView();
        });
      });
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
    var payload = { title: title, meta: meta, program: program, org: org, sort_order: sort_order, updated_at: new Date().toISOString() };
    var promise = editId
      ? supabase.from('repertoire').update(payload).eq('id', editId)
      : supabase.from('repertoire').insert(payload);
    promise.then(function (r) {
      if (r.error) throw r.error;
      showMsg('repertoire', editId ? '已更新' : '已新增');
      form.removeAttribute('data-edit-id');
      form.reset();
      document.getElementById('repSortOrder').value = 0;
      loadRepertoire();
    }).catch(function (err) {
      showMsg('repertoire', err.message || '操作失敗', true);
    });
  });

  // ---------- 影音 ----------
  function loadMedia() {
    var listEl = document.getElementById('mediaList');
    listEl.innerHTML = '<span class="loading">載入中…</span>';
    supabase.from('media').select('*').order('sort_order', { ascending: true }).then(function (r) {
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
    });
  }

  document.getElementById('mediaForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var editId = form.getAttribute('data-edit-id');
    var payload = {
      title: document.getElementById('mediaTitle').value.trim(),
      description: document.getElementById('mediaDescription').value.trim(),
      video_url: document.getElementById('mediaVideoUrl').value.trim(),
      thumbnail_url: document.getElementById('mediaThumbnailUrl').value.trim(),
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
    supabase.from('contact').select('*').limit(1).maybeSingle().then(function (r) {
      if (r.data) {
        var row = r.data;
        document.getElementById('contactIntro').value = row.intro || '';
        document.getElementById('contactEmail').value = row.email || '';
        var social = row.social_links || {};
        document.getElementById('contactYoutube').value = social.youtube || '';
        document.getElementById('contactFacebook').value = social.facebook || '';
        document.getElementById('contactInstagram').value = social.instagram || '';
      }
    });
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
      headerLoggedOut.style.display = 'none';
      headerLoggedIn.style.display = 'flex';
      loginWrap.style.display = 'none';
      adminNav.style.display = 'flex';
      adminMain.style.display = 'block';
      userEmail.textContent = r.data.session.user.email;
      loadAbout();
      loadContact();
      var hash = (window.location.hash || '#about').slice(1);
      switchPanel(hash || 'about');
    }
  });
})();
