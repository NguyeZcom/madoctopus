// ==UserScript==
// @name         MadOctopus -> Google Sheet
// @namespace    nguyez-madoctopus
// @version      1.3
// @description  Cào Game catalog MadOctopus (17 cột) - loc theo gia / % review / so review + lam anh lich to nhat (460px) rồi gửi thẳng vào tab MadOctopus qua Apps Script Web App.
// @match        https://madoctopus.fun/creators/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
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

  GM_registerMenuCommand('Đặt Apps Script Web App URL', () => {
    const u = prompt('Dán Apps Script Web App URL (/exec):', WEBAPP_URL);
    if (u) { WEBAPP_URL = u.trim(); GM_setValue('mo_webapp_url', WEBAPP_URL); alert('Đã lưu Web App URL.'); }
  });

  // Bo loc: gia duoi muc nay thi bo, game chua co gia van lay. % review / so review tuong tu: co review ma duoi muc thi bo, chua co review van lay. 0 = khong loc muc do.
  let FILTERS = {
    minPrice: parseFloat(GM_getValue('mo_min_price', '0')) || 0,
    minReviewPct: parseFloat(GM_getValue('mo_min_review_pct', '50')) || 0,
    minReviewCount: parseFloat(GM_getValue('mo_min_review_count', '0')) || 0,
  };
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;background:#111;color:#fff;padding:12px;border-radius:10px;font:13px/1.5 Arial,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.4);max-width:360px';
  panel.innerHTML = '<b>MadOctopus → Sheet</b><div id="mo-status" style="margin:6px 0">Sẵn sàng. Mở Game catalog rồi bấm Cào.</div>' +
    '<div style="margin:6px 0;font-size:12px">Lọc (0 = không lọc):<br>' +
    'Giá tối thiểu $ <input id="mo-f-price" type="number" min="0" step="1" value="' + FILTERS.minPrice + '" style="width:60px"> &nbsp; ' +
    '% review tối thiểu <input id="mo-f-pct" type="number" min="0" max="100" step="1" value="' + FILTERS.minReviewPct + '" style="width:60px"><br>' +
    'Số review tối thiểu <input id="mo-f-count" type="number" min="0" step="1" value="' + FILTERS.minReviewCount + '" style="width:60px"> &nbsp; <span style="color:#aaa">chưa có giá/review vẫn lấy</span></div>' +
    '<button id="mo-run" style="background:#ff6b35;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:bold">Cào hết &amp; gửi vào Sheet</button> ' +
    '<button id="mo-seturl" style="background:#444;color:#fff;border:0;padding:8px 10px;border-radius:6px;cursor:pointer">Đặt URL</button>';
  document.body.appendChild(panel);
  panel.querySelector('#mo-seturl').onclick = () => {
    const u = prompt('Dán Apps Script Web App URL (/exec):', WEBAPP_URL);
    if (u) { WEBAPP_URL = u.trim(); GM_setValue('mo_webapp_url', WEBAPP_URL); setStatus('Đã lưu Web App URL.'); }
  };
  function setStatus(s) { const el = document.getElementById('mo-status'); if (el) el.textContent = s; console.log('[MadOctopus]', s); }
  panel.querySelector('#mo-run').onclick = () => run().catch(e => setStatus('Lỗi: ' + e.message));

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
    FILTERS.minPrice = parseFloat(document.getElementById('mo-f-price').value) || 0;
    FILTERS.minReviewPct = parseFloat(document.getElementById('mo-f-pct').value) || 0;
    FILTERS.minReviewCount = parseFloat(document.getElementById('mo-f-count').value) || 0;
    GM_setValue('mo_min_price', String(FILTERS.minPrice)); GM_setValue('mo_min_review_pct', String(FILTERS.minReviewPct)); GM_setValue('mo_min_review_count', String(FILTERS.minReviewCount));
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
