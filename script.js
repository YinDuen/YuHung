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
    var prevDots = document.querySelector('#repertoire .concert-dots');
    if (prevDots) prevDots.parentNode.removeChild(prevDots);

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
    viewport.parentNode.insertBefore(dots, viewport.nextSibling);

    // 狀態存在 list 上，讓單一組拖曳事件永遠讀到最新頁面
    var state = list._carouselState || (list._carouselState = {});
    state.cards = cards.length;
    state.current = 0;

    function goTo(i) {
      state.current = (i + cards.length) % cards.length;
      list.style.transform = 'translateX(' + (-state.current * 100) + '%)';
      var dotEls = dots.querySelectorAll('.concert-dot');
      for (var d = 0; d < dotEls.length; d++) {
        dotEls[d].classList.toggle('active', d === state.current);
      }
    }

    function resetTimer() {
      if (list._carouselTimer) clearInterval(list._carouselTimer);
      list._carouselTimer = setInterval(function () {
        goTo(state.current + 1);
      }, autoIntervalMs);
    }

    state.goTo = goTo;
    state.resetTimer = resetTimer;

    bindDrag(list);

    goTo(0);
    resetTimer();
  }

  // 手動左右滑動：iOS Safari 對 Pointer Events 支援不穩（會提前觸發 pointercancel），
  // 因此觸控走原生 touch 事件、桌機走 mouse 事件。事件只綁定一次，狀態存在 list._carouselState。
  function bindDrag(list) {
    if (list._dragBound) return;
    list._dragBound = true;

    var dragging = false;   // 已進入拖曳流程（含尚未判定方向）
    var horizontal = false; // 已判定為水平手勢
    var decided = false;    // 是否已判定手勢方向
    var startX = 0;
    var startY = 0;
    var moved = 0;
    var pageW = 1;

    function start(x, y) {
      var st = list._carouselState;
      if (!st || st.cards <= 1) return false;
      dragging = true;
      decided = false;
      horizontal = false;
      startX = x;
      startY = y;
      moved = 0;
      pageW = list.clientWidth || 1;
      // 拖曳期間暫停自動換頁
      if (list._carouselTimer) {
        clearInterval(list._carouselTimer);
        list._carouselTimer = null;
      }
      return true;
    }

    // 回傳 true 表示為水平拖曳（呼叫端需 preventDefault 以阻止頁面捲動）
    function move(x, y) {
      if (!dragging) return false;
      var dx = x - startX;
      var dy = y - startY;
      if (!decided) {
        // 位移太小先不判定，避免誤判
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return false;
        decided = true;
        horizontal = Math.abs(dx) > Math.abs(dy);
        if (horizontal) {
          list.style.transition = 'none';
          list.classList.add('is-dragging');
        } else {
          // 垂直手勢：放棄拖曳，讓頁面正常上下捲動
          dragging = false;
          return false;
        }
      }
      if (!horizontal) return false;
      moved = dx;
      var st = list._carouselState;
      list.style.transform = 'translateX(' + (-st.current * pageW + moved) + 'px)';
      return true;
    }

    function end() {
      if (!dragging) return;
      dragging = false;
      list.classList.remove('is-dragging');
      list.style.transition = '';
      var st = list._carouselState;
      if (horizontal && Math.abs(moved) > pageW * 0.15) {
        st.goTo(st.current + (moved < 0 ? 1 : -1));
      } else {
        st.goTo(st.current);
      }
      st.resetTimer();
      moved = 0;
    }

    // --- 觸控（手機、平板，含 iOS）---
    list.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      start(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    list.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      var t = e.touches[0];
      var isHorizontal = move(t.clientX, t.clientY);
      // 水平拖曳時阻止頁面橫向捲動（需 passive:false）
      if (isHorizontal && e.cancelable) e.preventDefault();
    }, { passive: false });

    list.addEventListener('touchend', end);
    list.addEventListener('touchcancel', end);

    // --- 滑鼠（桌機）---
    var mouseDown = false;
    list.addEventListener('mousedown', function (e) {
      mouseDown = start(e.clientX, e.clientY);
      if (mouseDown) e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (mouseDown) move(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', function () {
      if (!mouseDown) return;
      mouseDown = false;
      end();
    });
  }

  // 供 data-loader 在動態渲染後重新初始化
  window.initRepertoireCarousel = initRepertoireCarousel;

  // 靜態內容（未設定 Supabase 時）也能啟用輪播
  initRepertoireCarousel();
})();
