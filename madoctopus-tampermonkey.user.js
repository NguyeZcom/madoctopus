// ==UserScript==
// @name         MadOctopus -> Google Sheet
// @namespace    nguyez-madoctopus
// @version      1.6
// @description  Cào Game catalog MadOctopus (17 cột) - lọc theo giá / % review / số review + làm ảnh lịch to nhất (460px). Chỉ có 2 mục trong menu Tampermonkey: CÀO và Cài đặt. Bấm Cài đặt mới hiện bảng chọn, bình thường không hiện gì trên trang.
// @match        https://madoctopus.fun/creators/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @updateURL    https://raw.githubusercontent.com/NguyeZcom/madoctopus/main/madoctopus-tampermonkey.user.js
// @downloadURL  https://raw.githubusercontent.com/NguyeZcom/madoctopus/main/madoctopus-tampermonkey.user.js
// @run-at       document-idle
// ==/UserScript==
// GHI CHU VE TU DONG CAP NHAT (GitHub):
// - Sau khi tao repo GitHub va dua file nay len, doi USER/REPO o 2 dong @updateURL / @downloadURL
//   thanh ten tai khoan / ten repo that: raw.githubusercontent.com/NguyeZcom/madoctopus/main/madoctopus-tampermonkey.user.js
// - Moi lan sua script, chi can tang @version (1.1 -> 1.2 -> ...) va day len GitHub.
//   Tampermonkey se tu kiem tra va bao cap nhat, khong can copy paste lai file.
// - Trong Tampermonkey > Settings > Externals, de che do kiem tra cap nhat la moi ngay (mặc định).
(function () {
  'use strict';
  let WEBAPP_URL = GM_getValue('mo_webapp_url', 'https://script.google.com/macros/s/AKfycbwvtJi1nNN2gvJZ3Gav_nQGMzBxnaSrGFq5NZgmYfYq3QMwcDZ03pRskPDhaQ6ujUbwqA/exec');

  const GENRES = ["Action","Adventure","Casual","Early Access","Free To Play","Indie","Massively Multiplayer","Racing","RPG","Simulation","Sports","Strategy","Horror","Zombie","Survival","Cozy","Roguelike","Puzzle","Platformer","Co-op","Shooter","Stealth","Tycoon","Sandbox","Metroidvania","Souls-like","Tower defense","Farming","Turn-based","Visual novel","Pixel art","Sci-fi","Fantasy","Open world","Cyberpunk","Post-apocalyptic","Detective","Card game","FMV"];
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : '');

  // Cat chuoi tai cho xuat hien som nhat cua 1 trong cac moc, de khong lay ca doan text sau do.
  function cutAt(s, markers) {
    let end = s.length;
    for (const m of markers) { const i = s.indexOf(m); if (i >= 0 && i < end) end = i; }
    return s.slice(0, end).trim();
  }

  // ---- Lich phat hanh (?view=calendar): anh to nhat co the ----
  // Trang lich that ra la danh sach doc 821 game, moi dong cao 70px, anh chi 109x44px.
  // Anh goc la Steam header 460x215, nen to nhat ma van net la 460x215. Muon to hon nua
  // thi phai phong to anh 460px, se hoi mo. O day dung 460x215, dong cao ~235px.
  function applyCalendarBigImages() {
    if (!location.search.includes('view=calendar')) return;
    if (document.getElementById('mo-calendar-css')) { tagCalendarRows(); return; }
    const style = document.createElement('style');
    style.id = 'mo-calendar-css';
    style.textContent = `
      /* An sidebar ben trai tren trang lich de lay them cho ngang, chi khi co nut bat/tat */
      body.mo-cal-big main { max-width: none !important; width: 100% !important; }
      body.mo-cal-big main > * { max-width: none !important; }
      /* Dong lich: cao len, xuong dong, anh o tren trai, chu o ben phai */
      body.mo-cal-big .mo-cal-row { min-height: 235px !important; height: auto !important; padding: 12px 16px !important; gap: 16px !important; flex-wrap: wrap !important; align-items: flex-start !important; align-content: flex-start !important; }
      body.mo-cal-big .mo-cal-row > a:first-child { flex: 0 0 460px !important; width: 460px !important; max-width: 460px !important; height: 215px !important; display: block !important; }
      body.mo-cal-big .mo-cal-row > a:first-child img.mo-cal-img,
      body.mo-cal-big .mo-cal-row img.mo-cal-img { width: 460px !important; height: 215px !important; max-width: 460px !important; max-height: 215px !important; min-width: 460px !important; min-height: 215px !important; object-fit: cover !important; border-radius: 8px !important; display: block !important; }
      /* Chu tieu de / the loai to hon mot chut cho can voi anh to */
      body.mo-cal-big .mo-cal-row a[href*="store.steampowered.com/app/"] { font-size: 17px !important; line-height: 1.35 !important; }
      /* Du phong: neu JS chua gan class kip, van bat anh trong main tren trang lich */
      body.mo-cal-big main a[href*="store.steampowered.com/app/"] > img { width: 460px !important; height: 215px !important; max-width: 460px !important; max-height: 215px !important; object-fit: cover !important; }
    `;
    document.head.appendChild(style);
    document.body.classList.add('mo-cal-big');
    tagCalendarRows();
    // Danh sach lich tai bang JS, theo doi thay doi DOM de gan class cho dong moi xuat hien
    const obs = new MutationObserver(() => tagCalendarRows());
    obs.observe(document.body, { childList: true, subtree: true });
  }
  function tagCalendarRows() {
    if (!location.search.includes('view=calendar')) return;
    document.querySelectorAll('img[src*="steamstatic.com/store_item_assets/steam/apps/"]').forEach(img => {
      img.classList.add('mo-cal-img');
      // Tim dong chua anh: di len toi phan tu chua nut "Message the studio" hoac chua tieu de + the
      let el = img.parentElement;
      for (let i = 0; i < 6 && el && el !== document.body; i++) {
        const t = el.innerText || '';
        if (/Message the studio/i.test(t) && el.querySelector('a[href*="store.steampowered.com/app/"]')) { el.classList.add('mo-cal-row'); break; }
        el = el.parentElement;
      }
    });
  }
  applyCalendarBigImages();

  // ---- Danh sach game chinh (/creators/): anh to full, de luot ----
  // Trang catalog hien tai: 5 cot, the rong 286px, anh chi 286x126px (26% the),
  // the cao ~488px, phan lon la chu + khoang trong. Anh goc Steam header 460x215.
  // Giai phap: xuong con 3 cot -> the rong ~485px, anh hien 460x215 net nhat,
  // the tu cao theo noi dung (khong keo dai theo the cao nhat trong hang),
  // thu gon thanh loc dinh tren va phan tren trang de de luot hon.
  function applyCatalogBigImages() {
    if (location.search.includes('view=calendar')) return;
    if (!location.pathname.includes('/creators')) return;
    if (document.getElementById('mo-catalog-css')) { tagCatalogCards(); return; }
    const style = document.createElement('style');
    style.id = 'mo-catalog-css';
    style.textContent = `
      /* Luoi 5 cot -> 3 cot, anh rong gan bang anh goc */
      body.mo-cat-big .mo-cat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 16px !important; }
      body.mo-cat-big .mo-cat-card { height: auto !important; min-height: 0 !important; align-self: start !important; }
      body.mo-cat-big .mo-cat-card > a:first-child { display: block !important; width: 100% !important; }
      body.mo-cat-big .mo-cat-card img.mo-cat-img { width: 100% !important; height: 215px !important; max-height: 215px !important; object-fit: cover !important; display: block !important; border-radius: 8px 8px 0 0 !important; }
      /* The khong bi keo dai theo the cao nhat, bot khoang trong chet giua the */
      body.mo-cat-big .mo-cat-card { display: flex !important; flex-direction: column !important; }
      /* Ghi chu studio dai thi chi hien 2 dong, bam mo ra van xem duoc trong Media & description */
      body.mo-cat-big .mo-cat-card .mo-cat-note { display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; overflow: hidden !important; }
      /* Thanh loc dinh tren gon lai de de luot */
      body.mo-cat-big main { max-width: none !important; }
    `;
    document.head.appendChild(style);
    document.body.classList.add('mo-cat-big');
    tagCatalogCards();
    const obs = new MutationObserver(() => tagCatalogCards());
    obs.observe(document.body, { childList: true, subtree: true });
  }
  function tagCatalogCards() {
    if (location.search.includes('view=calendar')) return;
    if (!location.pathname.includes('/creators')) return;
    // Luoi: phan tu cha cua cac <article> the game
    document.querySelectorAll('article').forEach(a => {
      const img = a.querySelector('a:first-child > img[src*="steamstatic.com/store_item_assets/steam/apps/"], img[src*="steamstatic.com/store_item_assets/steam/apps/"]');
      if (!img) return;
      img.classList.add('mo-cat-img');
      a.classList.add('mo-cat-card');
      if (a.parentElement) a.parentElement.classList.add('mo-cat-grid');
      // Danh dau ghi chu studio de cat gon 2 dong
      a.querySelectorAll('*').forEach(el => {
        if (/^From the studio:/i.test((el.innerText || '').trim())) el.classList.add('mo-cat-note');
      });
    });
  }
  applyCatalogBigImages();

  // ---- Tuy chon: CHI CO 2 MUC trong menu Tampermonkey, KHONG hien gi tren trang ----
  // Bấm vào biểu tượng Tampermonkey > tên script này > chỉ thấy 2 mục:
  //   1. CÀO - chạy cào hết và gửi vào Sheet ngay
  //   2. Cài đặt - bấm vào mới hiện ra 1 bảng chọn (popup), chọn xong bấm Lưu là đóng, bình thường không hiện gì.
  let FILTERS = {
    minPrice: parseFloat(GM_getValue('mo_min_price', '0')) || 0,
    minReviewPct: parseFloat(GM_getValue('mo_min_review_pct', '50')) || 0,
    minReviewCount: parseFloat(GM_getValue('mo_min_review_count', '0')) || 0,
  };
  function setStatus(msg) {
    console.log('[MadOctopus]', msg);
    if (/^XONG|^Lỗi|^Dừng/.test(msg)) {
      try { GM_notification({ title: 'MadOctopus', text: msg, timeout: 8000 }); } catch (e) {}
    }
  }
  function openSettings() {
    if (document.getElementById('mo-settings')) { document.getElementById('mo-settings').remove(); }
    const ov = document.createElement('div');
    ov.id = 'mo-settings';
    ov.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font:14px/1.6 Arial,sans-serif';
    ov.innerHTML = '<div style="background:#1a1a2e;color:#fff;padding:20px;border-radius:12px;width:420px;max-width:92vw;box-shadow:0 8px 30px rgba(0,0,0,.5)">' +
      '<h3 style="margin:0 0 12px">MadOctopus — Cài đặt</h3>' +
      '<label style="display:block;margin:8px 0">Apps Script Web App URL (/exec)<br><input id="mo-s-url" type="text" value="' + WEBAPP_URL.replace(/"/g, '&quot;') + '" style="width:100%;padding:6px;border-radius:6px;border:1px solid #555;background:#111;color:#fff"></label>' +
      '<label style="display:block;margin:8px 0">Giá tối thiểu $ <span style="color:#aaa">(0 = không lọc, chưa có giá vẫn lấy)</span><br><input id="mo-s-price" type="number" min="0" step="1" value="' + FILTERS.minPrice + '" style="width:100px;padding:6px;border-radius:6px;border:1px solid #555;background:#111;color:#fff"></label>' +
      '<label style="display:block;margin:8px 0">% review tối thiểu <span style="color:#aaa">(chưa có review vẫn lấy)</span><br><input id="mo-s-pct" type="number" min="0" max="100" step="1" value="' + FILTERS.minReviewPct + '" style="width:100px;padding:6px;border-radius:6px;border:1px solid #555;background:#111;color:#fff"></label>' +
      '<label style="display:block;margin:8px 0">Số review tối thiểu <span style="color:#aaa">(0 = không lọc, chưa có review vẫn lấy)</span><br><input id="mo-s-count" type="number" min="0" step="1" value="' + FILTERS.minReviewCount + '" style="width:100px;padding:6px;border-radius:6px;border:1px solid #555;background:#111;color:#fff"></label>' +
      '<div style="margin-top:16px;display:flex;gap:8px">' +
      '<button id="mo-s-save" style="background:#ff6b35;color:#fff;border:0;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold">Lưu</button>' +
      '<button id="mo-s-clear" style="background:#444;color:#fff;border:0;padding:8px 12px;border-radius:6px;cursor:pointer">Tắt hết lọc</button>' +
      '<button id="mo-s-close" style="background:#222;color:#fff;border:0;padding:8px 12px;border-radius:6px;cursor:pointer">Đóng</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.querySelector('#mo-s-close').onclick = () => ov.remove();
    ov.querySelector('#mo-s-clear').onclick = () => {
      ov.querySelector('#mo-s-price').value = '0'; ov.querySelector('#mo-s-pct').value = '0'; ov.querySelector('#mo-s-count').value = '0';
    };
    ov.querySelector('#mo-s-save').onclick = () => {
      const u = ov.querySelector('#mo-s-url').value.trim();
      if (u) { WEBAPP_URL = u; GM_setValue('mo_webapp_url', u); }
      FILTERS.minPrice = parseFloat(ov.querySelector('#mo-s-price').value) || 0;
      FILTERS.minReviewPct = parseFloat(ov.querySelector('#mo-s-pct').value) || 0;
      FILTERS.minReviewCount = parseFloat(ov.querySelector('#mo-s-count').value) || 0;
      GM_setValue('mo_min_price', String(FILTERS.minPrice));
      GM_setValue('mo_min_review_pct', String(FILTERS.minReviewPct));
      GM_setValue('mo_min_review_count', String(FILTERS.minReviewCount));
      ov.remove();
      alert('Đã lưu cài đặt.\nGiá tối thiểu: $' + FILTERS.minPrice + '\n% review tối thiểu: ' + FILTERS.minReviewPct + '%\nSố review tối thiểu: ' + FILTERS.minReviewCount);
    };
  }
  GM_registerMenuCommand('CÀO', () => run().catch(e => setStatus('Lỗi: ' + e.message)));
  GM_registerMenuCommand('Cài đặt', () => openSettings());

  function findCards() {
    const btns = [...document.querySelectorAll('button, a')].filter(el =>
      /Get a (Steam|demo) key|Request a key|You have your key/i.test(el.innerText || ''));
    const cards = []; const seen = new Set();
    for (const b of btns) {
      let el = b;
      for (let i = 0; i < 8 && el && el !== document.body; i++) {
        el = el.parentElement; if (!el) break;
        const t = el.innerText || '';
        if (/Steam page|Message the dev|creators got a key/i.test(t) && el.querySelector('a[href*="store.steampowered.com/app/"]')) {
          if (!seen.has(el)) { seen.add(el); cards.push(el); } break;
        }
      }
    }
    return cards;
  }

  function parseCard(card) {
    const t = txt(card);
    const steamA = card.querySelector('a[href*="store.steampowered.com/app/"]');
    const steamUrl = steamA ? steamA.href : '';
    const appMatch = steamUrl.match(/\/app\/(\d+)/);
    let appId = appMatch ? appMatch[1] : '';
    const img = card.querySelector('img[src*="steamstatic.com/store_item_assets/steam/apps/"]');
    if (!appId && img) { const m = img.src.match(/\/apps\/(\d+)\//); if (m) appId = m[1]; }
    const title = steamA ? txt(steamA) : '';
    const keysMatch = t.match(/(\d+)\s*left/i);
    const keyBtn = /You have your key/i.test(t) ? 'Đã nhận'
      : /Get a demo key/i.test(t) ? 'Demo'
      : /Request a key/i.test(t) ? 'Request'
      : /Get a Steam key/i.test(t) ? '' : '';
    const priceMatch = t.match(/(\$[\d.,]+|Free)/);
    const revMatch = t.match(/([\d,]+)\s*reviews?\s*\((\d+)%\)/i);
    const gotMatch = t.match(/(\d+)\s*creators got a key/i);
    const crewMatch = t.match(/Crew keys[^0-9]*up to\s*(\d+)/i);
    // Badge: chi lay thoi gian, vd "New keys · 4d ago" -> "4d", "yesterday" -> "1d", "today" -> "0d", "2h ago" -> "2h".
    const freshM = t.match(/New keys\s*·\s*(today|yesterday|(\d+)d ago|(\d+)h ago)/i);
    let freshBadge = '';
    if (freshM) { const w = freshM[1].toLowerCase(); freshBadge = w === 'today' ? '0d' : w === 'yesterday' ? '1d' : freshM[2] ? freshM[2] + 'd' : freshM[3] ? freshM[3] + 'h' : ''; }
    const comingMatch = t.match(/Coming soon[^·\n]*·?\s*([A-Za-z]{3,9}\s*\d{1,2},?\s*\d{4}|\d{4})?/i);
    const fullMatch = t.match(/Full release\s*([A-Za-z]{3,9}\s*\d{1,2},?\s*\d{4}|\d{4})/i);
    // Nha phat trien: cat dung truoc "N creators got a key" hoac "Steam page", khong lay toi cuoi the.
    let dev = '';
    const devM = t.match(/by\s+(.+?)\s+\d+\s+creators got a key/i) || t.match(/by\s+(.+?)\s+Steam page/i);
    if (devM) dev = devM[1].trim();
    const genres = GENRES.filter(g => new RegExp('\\b' + g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(t));
    // Phat hanh: Released thi de trong. Chua phat hanh thi chi ghi ngay ngan gon: "2027" hoac "Nov 10, 2026".
    let releaseStatus = '';
    if (!/Released/i.test(t) && t.includes('Coming soon')) {
      const dateM = t.match(/Coming soon[^·]*·?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4}|\d{4})/i);
      releaseStatus = dateM ? dateM[1] : 'Coming soon';
    }
    // Ghi chu studio: cat dung truoc cac moc sau, khong lay ca doan the.
    // Ghi chu: ghi DU cua NPH, chi cat o cho tom tat lap lai o cuoi the (" · by " / "Add to wishlist" / "Media & description").
    let note = '';
    const noteM = t.match(/From the studio:\s*(.+)/i);
    if (noteM) note = cutAt(noteM[1], [' · by ', ' Add to wishlist', ' Media & description']);
    // 17 cot, dung thu tu sheet MadOctopus hien tai (da xoa cot Link anh header). Cot D la "Loai Key" ngan gon.
    // Cot Link Steam gui dang URL tho, Apps Script se doi thanh nut bam HYPERLINK "STEAM" (dau ; vi sheet tieng Viet).
    return [title, appId, steamUrl, keyBtn, keysMatch ? keysMatch[1] : '',
      priceMatch ? priceMatch[1] : '',
      revMatch ? revMatch[1].replace(/,/g, '') : '', revMatch ? revMatch[2] : '',
      dev, gotMatch ? gotMatch[1] : '',
      genres.join(', '), releaseStatus,
      freshBadge, crewMatch ? crewMatch[1] : '',
      /Play Demo/i.test(t) ? 'Yes' : '', note,
      new Date().toISOString().slice(0, 10)];
  }

  function findNextButton() {
    const els = [...document.querySelectorAll('a, button')];
    return els.find(el => {
      const s = (el.innerText || '').trim();
      return s === '→' || s === '>' || s === 'Next' || /^\s*→\s*$/.test(s);
    }) || null;
  }
  async function waitForNewCards(prevFirstTitle) {
    for (let i = 0; i < 16; i++) {
      await sleep(500);
      const cards = findCards();
      if (cards.length) {
        const first = cards[0] ? txt(cards[0].querySelector('a[href*="store.steampowered.com/app/"]')) : '';
        if (first && first !== prevFirstTitle) return cards;
      }
    }
    return findCards();
  }

  function postToSheet(rows, mode) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST', url: WEBAPP_URL,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        data: JSON.stringify({ rows, mode, filters: FILTERS }),
        onload: (r) => { try { resolve(JSON.parse(r.responseText)); } catch (e) { reject(new Error('Apps Script trả về không phải JSON: ' + r.responseText.slice(0, 200))); } },
        onerror: (e) => reject(new Error('Không gọi được Apps Script. Kiểm tra URL và quyền Anyone.'))
      });
    });
  }

  async function run() {
    // Loc lay tu bo nho Tampermonkey (da dat qua menu), khong doc tu bang noi nua
    FILTERS.minPrice = parseFloat(GM_getValue('mo_min_price', '0')) || 0;
    FILTERS.minReviewPct = parseFloat(GM_getValue('mo_min_review_pct', '50')) || 0;
    FILTERS.minReviewCount = parseFloat(GM_getValue('mo_min_review_count', '0')) || 0;
    if (!WEBAPP_URL || WEBAPP_URL.indexOf('script.google.com/macros/s/') === -1) {
      setStatus('Chưa có Web App URL. Bấm "Đặt URL" và dán URL /exec của Apps Script trước.');
      const u = prompt('Dán Apps Script Web App URL (/exec):', '');
      if (!u) return;
      WEBAPP_URL = u.trim(); GM_setValue('mo_webapp_url', WEBAPP_URL);
    }
    setStatus('Đang cào catalog, 53 trang, khoảng 3-5 phút. Đừng tắt tab.');
    const all = new Map();
    for (let page = 1; page <= 53; page++) {
      if (page > 1) {
        const prevCards = findCards();
        const prevFirst = prevCards[0] ? txt(prevCards[0].querySelector('a[href*="store.steampowered.com/app/"]')) : '';
        const nextBtn = findNextButton();
        if (!nextBtn) { setStatus(`Hết nút trang sau ở trang ${page - 1}, dừng ở ${all.size} game. Nút phân trang không còn.`); break; }
        nextBtn.click();
        let cards = await waitForNewCards(prevFirst);
        if (!cards.length) {
          setStatus(`Trang ${page} không tải được game, thử lại 1 lần...`);
          const next2 = findNextButton(); if (next2) { next2.click(); cards = await waitForNewCards(prevFirst); }
          if (!cards.length) { setStatus(`Dừng ở trang ${page - 1}, đã có ${all.size} game. Trang ${page} tải 0 game sau 2 lần thử.`); break; }
        }
      } else await sleep(800);
      const cards = findCards();
      for (const c of cards) {
        const row = parseCard(c);
        // Loc: gia / % review / so review. Chua co gia/review thi van lay.
        const priceNum = row[5] === 'Free' ? 0 : parseFloat(String(row[5]).replace(/[^0-9.]/g, ''));
        if (FILTERS.minPrice > 0 && !isNaN(priceNum) && row[5] !== '' && priceNum < FILTERS.minPrice) continue;
        const pctNum = row[7] === '' ? NaN : parseFloat(row[7]);
        if (FILTERS.minReviewPct > 0 && !isNaN(pctNum) && pctNum < FILTERS.minReviewPct) continue;
        const cntNum = row[6] === '' ? NaN : parseFloat(row[6]);
        if (FILTERS.minReviewCount > 0 && !isNaN(cntNum) && cntNum < FILTERS.minReviewCount) continue;
        const key = row[1] || row[0];
        if (key && !all.has(key)) all.set(key, row);
      }
      setStatus(`Đã cào trang ${page}/53, tổng ${all.size} game...`);
      if (!cards.length) break;
      await sleep(400);
    }
    const rows = [...all.values()];
    setStatus(`Cào xong ${rows.length} game. Đang gửi vào Sheet theo từng đợt 200 game...`);
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const res = await postToSheet(batch, i === 0 ? 'replace' : 'append');
      if (!res.ok) throw new Error(res.error || 'Apps Script báo lỗi');
      setStatus(`Đã gửi ${Math.min(i + 200, rows.length)}/${rows.length} game vào Sheet...`);
    }
    setStatus(`XONG: ${rows.length} game đã vào tab MadOctopus. Mở Sheet kiểm tra giúp.`);
  }
})();
