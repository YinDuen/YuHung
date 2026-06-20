(function () {
  'use strict';

  var header = document.querySelector('.header');
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelectorAll('.nav-links a');

  // 捲動時為 header 加上背景
  function onScroll() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 手機選單開關
  if (toggle) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
      toggle.setAttribute('aria-label', nav.classList.contains('open') ? '關閉選單' : '開啟選單');
    });
  }

  // 點選導覽連結後關閉手機選單
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
    });
  });

  // 頁腳年份
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 曲目與演出：左右自動換頁輪播，下方圓點指示目前頁面
  // 換頁秒數可由後台設定（settings.repertoire_interval），預設 10 秒
  var autoIntervalMs = 10000;

  function initRepertoireCarousel(intervalSeconds) {
    // 後台傳入秒數時更新，未傳入則沿用目前值
    var sec = parseFloat(intervalSeconds);
    if (!isNaN(sec) && sec > 0) {
      autoIntervalMs = sec * 1000;
    }
    var list = document.querySelector('#repertoire .concert-list');
    if (!list) return;
    var cards = Array.prototype.slice.call(list.querySelectorAll('.concert-card'));

    // 清除前一次初始化（資料載入後會重新渲染）
    if (list._carouselTimer) {
      clearInterval(list._carouselTimer);
      list._carouselTimer = null;
    }
    var oldControls = document.querySelectorAll('#repertoire .concert-controls, #repertoire .concert-dots, #repertoire .concert-arrow');
    for (var a = 0; a < oldControls.length; a++) {
      oldControls[a].parentNode.removeChild(oldControls[a]);
    }

    // 只有一張卡片時不需要輪播
    if (cards.length <= 1) {
      list.classList.remove('is-carousel');
      list.style.transform = '';
      return;
    }

    list.classList.add('is-carousel');

    // 建立可滑動的外框（重複初始化時沿用既有的）
    var viewport = list.parentNode;
    if (!viewport.classList || !viewport.classList.contains('concert-carousel')) {
      viewport = document.createElement('div');
      viewport.className = 'concert-carousel';
      list.parentNode.insertBefore(viewport, list);
      viewport.appendChild(list);
    }

    // 建立左右箭頭（任何裝置都能點選換頁）
    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'concert-arrow concert-arrow-prev';
    prevBtn.setAttribute('aria-label', '上一場');
    prevBtn.innerHTML = '&#8249;';
    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'concert-arrow concert-arrow-next';
    nextBtn.setAttribute('aria-label', '下一場');
    nextBtn.innerHTML = '&#8250;';
    prevBtn.addEventListener('click', function () { goTo(state.current - 1); resetTimer(); });
    nextBtn.addEventListener('click', function () { goTo(state.current + 1); resetTimer(); });

    // 建立圓點指示
    var dots = document.createElement('div');
    dots.className = 'concert-dots';
    cards.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'concert-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', '第 ' + (i + 1) + ' 場');
      dot.addEventListener('click', function () {
        goTo(i);
        resetTimer();
      });
      dots.appendChild(dot);
    });

    // 箭頭與圓點放在輪播下方同一列，避免蓋住卡片文字
    var controls = document.createElement('div');
    controls.className = 'concert-controls';
    controls.appendChild(prevBtn);
    controls.appendChild(dots);
    controls.appendChild(nextBtn);
    viewport.parentNode.insertBefore(controls, viewport.nextSibling);

    // 狀態存在 list 上，讓單一組捲動事件永遠讀到最新狀態
    var state = list._carouselState || (list._carouselState = {});
    state.cards = cards.length;
    state.current = 0;

    function syncDots(idx) {
      var dotEls = dots.querySelectorAll('.concert-dot');
      for (var d = 0; d < dotEls.length; d++) {
        dotEls[d].classList.toggle('active', d === idx);
      }
    }

    // 以原生捲動換頁（iOS/iPadOS 對原生滑動支援最佳）
    function goTo(i, instant) {
      var idx = (i + cards.length) % cards.length;
      state.current = idx;
      viewport.scrollTo({
        left: idx * viewport.clientWidth,
        behavior: instant ? 'auto' : 'smooth'
      });
      syncDots(idx);
    }

    function resetTimer() {
      if (list._carouselTimer) clearInterval(list._carouselTimer);
      list._carouselTimer = setInterval(function () {
        goTo(state.current + 1);
      }, autoIntervalMs);
    }

    state.goTo = goTo;
    state.resetTimer = resetTimer;
    state.syncDots = syncDots;

    bindScroll(viewport, list);

    goTo(0, true);
    resetTimer();
  }

  // 手動滑動：直接使用瀏覽器原生捲動（觸控滑動由系統處理，iOS/iPadOS 最穩）。
  // 監聽 scroll 同步圓點；桌機額外提供滑鼠拖曳捲動。事件只綁一次，狀態存在 list._carouselState。
  function bindScroll(viewport, list) {
    if (viewport._scrollBound) return;
    viewport._scrollBound = true;

    // 使用者滑動後同步目前頁面與圓點
    var scrollTimer = null;
    viewport.addEventListener('scroll', function () {
      var st = list._carouselState;
      if (!st || !st.cards) return;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var w = viewport.clientWidth || 1;
        var idx = Math.round(viewport.scrollLeft / w);
        if (idx < 0) idx = 0;
        if (idx > st.cards - 1) idx = st.cards - 1;
        if (idx !== st.current) {
          st.current = idx;
          if (st.syncDots) st.syncDots(idx);
        }
      }, 90);
    }, { passive: true });

    // 桌機：滑鼠按住拖曳捲動（觸控裝置走原生，不需此段）
    var down = false, startX = 0, startLeft = 0, dragged = false;
    viewport.addEventListener('mousedown', function (e) {
      var st = list._carouselState;
      if (!st || st.cards <= 1) return;
      down = true;
      dragged = false;
      startX = e.clientX;
      startLeft = viewport.scrollLeft;
      viewport.classList.add('is-grabbing');
      e.preventDefault();
      if (list._carouselTimer) { clearInterval(list._carouselTimer); list._carouselTimer = null; }
    });
    window.addEventListener('mousemove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 3) dragged = true;
      viewport.scrollLeft = startLeft - dx;
    });
    window.addEventListener('mouseup', function () {
      if (!down) return;
      down = false;
      viewport.classList.remove('is-grabbing');
      var st = list._carouselState;
      if (st && st.goTo) {
        var w = viewport.clientWidth || 1;
        st.goTo(Math.round(viewport.scrollLeft / w));
        st.resetTimer();
      }
    });
  }

  // 供 data-loader 在動態渲染後重新初始化
  window.initRepertoireCarousel = initRepertoireCarousel;

  // 靜態內容（未設定 Supabase 時）也能啟用輪播
  initRepertoireCarousel();
})();
