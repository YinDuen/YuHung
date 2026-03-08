(function () {
  'use strict';

  // 使用依官方文件初始化的單一 client（見 supabase-client.js）
  var supabase = window.supabaseClient;
  if (!supabase) {
    return; // 未設定 Supabase 時保留靜態內容
  }

  function renderAbout(data) {
    if (!data || data.length === 0) return;
    var row = data[0];
    var leadEl = document.querySelector('#about .about-text .lead');
    var textBlock = document.querySelector('#about .about-text');
    if (!textBlock) return;
    if (leadEl) leadEl.textContent = row.lead || '';
    var paragraphs = Array.isArray(row.paragraphs) ? row.paragraphs : [];
    var existingParas = textBlock.querySelectorAll('.about-text p:not(.lead)');
    existingParas.forEach(function (p) { p.remove(); });
    paragraphs.forEach(function (para) {
      var p = document.createElement('p');
      p.textContent = para;
      leadEl ? leadEl.after(p) : textBlock.appendChild(p);
    });
    var img = document.querySelector('#about .about-image-placeholder img');
    if (img && row.image_url) img.src = row.image_url;
  }

  function renderRepertoire(data) {
    var container = document.querySelector('#repertoire .concert-list');
    if (!container || !data || data.length === 0) return;
    data.sort(function (a, b) { return (b.sort_order || 0) - (a.sort_order || 0); });
    container.innerHTML = data.map(function (c) {
      var program = Array.isArray(c.program) ? c.program : [];
      var programHtml = program.map(function (item) {
        var zh = item.zh || '';
        var en = item.en || '';
        var note = item.note ? ' <em>' + escapeHtml(item.note) + '</em>' : '';
        return '<li>' + escapeHtml(zh) + ' <span>' + escapeHtml(en) + '</span>' + note + '</li>';
      }).join('');
      return '<article class="concert-card">' +
        '<h3 class="concert-title">' + escapeHtml(c.title) + '</h3>' +
        '<p class="concert-meta">' + escapeHtml(c.meta || '') + '</p>' +
        '<ul class="concert-program">' + programHtml + '</ul>' +
        (c.org ? '<p class="concert-org">' + escapeHtml(c.org) + '</p>' : '') +
        '</article>';
    }).join('');
  }

  function renderMedia(data) {
    var container = document.querySelector('#media .media-grid');
    if (!container || !data || data.length === 0) return;
    data.sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    container.innerHTML = data.map(function (m) {
      var thumb = m.thumbnail_url
        ? '<img src="' + escapeHtml(m.thumbnail_url) + '" alt="">'
        : '<span aria-hidden="true">▶</span>';
      var link = m.video_url ? ('<a href="' + escapeHtml(m.video_url) + '" target="_blank" rel="noopener">') : '';
      var linkEnd = m.video_url ? '</a>' : '';
      return '<article class="media-card">' +
        '<div class="media-thumb">' + link + thumb + linkEnd + '</div>' +
        '<h3>' + escapeHtml(m.title) + '</h3>' +
        '<p>' + escapeHtml(m.description || '') + '</p>' +
        '</article>';
    }).join('');
  }

  function renderContact(data) {
    if (!data || data.length === 0) return;
    var row = data[0];
    var container = document.querySelector('#contact .contact-content');
    if (!container) return;
    var intro = container.querySelector('p');
    if (intro) intro.textContent = row.intro || '';
    var emailLink = container.querySelector('.contact-email');
    if (emailLink) {
      emailLink.textContent = row.email || '';
      emailLink.href = 'mailto:' + (row.email || '').trim();
    }
    var social = row.social_links || {};
    var yt = container.querySelector('a[aria-label="YouTube"]');
    if (yt && social.youtube) yt.href = social.youtube;
    var fb = container.querySelector('a[aria-label="Facebook"]');
    if (fb && social.facebook) fb.href = social.facebook;
    var ig = container.querySelector('a[aria-label="Instagram"]');
    if (ig && social.instagram) ig.href = social.instagram;
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  Promise.all([
    supabase.from('about').select('*'),
    supabase.from('repertoire').select('*'),
    supabase.from('media').select('*'),
    supabase.from('contact').select('*')
  ]).then(function (results) {
    if (results[0].data) renderAbout(results[0].data);
    if (results[1].data) renderRepertoire(results[1].data);
    if (results[2].data) renderMedia(results[2].data);
    if (results[3].data) renderContact(results[3].data);
  }).catch(function (err) {
    console.warn('Supabase 載入失敗，使用靜態內容', err);
  });
})();
