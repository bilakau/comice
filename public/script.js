const API_PROXY = "https://api-proxy-eight-mu.vercel.app/api/tools/proxy?url=";
const API_BASE = "https://www.sankavollerei.com/comic/komikindo";
const BACKEND_URL = window.location.origin;

const contentArea = document.getElementById('content-area');
const filterPanel = document.getElementById('filter-panel');
const mainNav = document.getElementById('main-nav');
const mobileNav = document.getElementById('mobile-nav');
const progressBar = document.getElementById('progress-bar');

let currentChapterList = [];
let currentComicContext = { slug: null, title: null, image: null };
let isNavigating = false;

/* ---------------- Helpers ---------------- */

async function fetchAPI(url) {
  try {
    const response = await fetch(API_PROXY + encodeURIComponent(url));
    const data = await response.json();
    // Menyesuaikan dengan response proxy baru: data.result.content
    if (data.success && data.result && data.result.content) {
      return data.result.content;
    }
    return null;
  } catch (e) {
    console.error("Fetch Error:", e);
    return null;
  }
}

async function getUuidFromSlug(slug, type) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, type })
    });
    const data = await res.json();
    return data.uuid || slug;
  } catch (e) {
    return slug;
  }
}

async function getSlugFromUuid(uuid) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-slug/${uuid}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    return null;
  }
}

function updateURL(path) {
  if (window.location.pathname !== path) history.pushState(null, null, path);
}

function getTypeClass(type) {
  if (!type) return 'type-default';
  const t = String(type).toLowerCase();
  if (t.includes('manga')) return 'type-manga';
  if (t.includes('manhwa')) return 'type-manhwa';
  if (t.includes('manhua')) return 'type-manhua';
  return 'type-default';
}

function redirectTo404() {
  contentArea.innerHTML = `<div class="text-center py-40 text-red-500">Error: Konten tidak ditemukan atau API bermasalah.</div>`;
}

function toggleFilter() {
  filterPanel.classList.toggle('hidden');
}

function resetNavs() {
  mainNav.classList.remove('-translate-y-full');
  mobileNav.classList.remove('translate-y-full');
  filterPanel.classList.add('hidden');
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

function setLoading() {
  contentArea.innerHTML = `
    <div class="flex justify-center py-40">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500"></div>
    </div>`;
}

function lockNav() { isNavigating = true; setProgress(0); }
function unlockNav() { isNavigating = false; }
function setProgress(percent) {
  if (!progressBar) return;
  progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function bindReaderProgress() {
  const onScroll = () => {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    if (scrollHeight <= 0) return setProgress(0);
    setProgress((scrollTop / scrollHeight) * 100);
  };
  window.removeEventListener('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------------- UI / Data Functions ---------------- */

async function showHome(push = true) {
  if (push) updateURL('/');
  resetNavs();
  setLoading();

  const data = await fetchAPI(`${API_BASE}/latest/1`);
  if (!data || !data.komikList) { redirectTo404(); return; }

  // Hot/Popular Updates dari komikPopuler
  const popularHtml = data.komikPopuler ? `
    <section class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <i class="fa fa-fire text-amber-500"></i> Populer
        </h2>
      </div>
      <div class="flex overflow-x-auto gap-4 hide-scroll pb-4 -mx-4 px-4">
        ${data.komikPopuler.map(item => `
          <div class="min-w-[140px] md:min-w-[180px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group"
              onclick="showDetail('${item.slug}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10"></div>
            <img src="${item.image}" class="h-56 md:h-72 w-full object-cover transform group-hover:scale-110 transition duration-500">
            <div class="absolute bottom-0 left-0 p-3 z-20 w-full">
              <h3 class="text-xs font-bold truncate text-white">${item.title}</h3>
              <p class="text-amber-400 text-[10px] mt-1">Rank #${item.rank}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>` : '';

  contentArea.innerHTML = `
    ${popularHtml}
    <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Rilis Terbaru</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      ${data.komikList.map(item => `
        <div class="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition group"
            onclick="showDetail('${item.slug}')">
          <div class="relative h-48 md:h-64 overflow-hidden">
            <span class="type-badge ${getTypeClass(item.type)}">${item.type}</span>
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
          </div>
          <div class="p-3">
            <h3 class="text-xs font-bold line-clamp-2 h-8 leading-relaxed">${item.title}</h3>
            <div class="flex justify-between items-center mt-3">
              <span class="text-[10px] bg-white/5 px-2 py-1 rounded text-amber-500">${item.chapters?.[0]?.title || 'NEW'}</span>
              <span class="text-[10px] text-gray-500">${item.chapters?.[0]?.date || ''}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  window.scrollTo(0, 0);
}

async function showOngoing(page = 1) {
  updateURL('/ongoing'); resetNavs(); setLoading();
  const data = await fetchAPI(`${API_BASE}/library?page=${page}`);
  renderGrid(data, "Semua Koleksi", "showOngoing");
}

async function showCompleted(page = 1) {
  // Karena API library menyampur, kita pakai library juga namun UI diinfokan ini list umum
  updateURL('/completed'); resetNavs(); setLoading();
  const data = await fetchAPI(`${API_BASE}/library?page=${page}`);
  renderGrid(data, "Daftar Komik Tamat & Baru", "showCompleted");
}

async function handleSearch(event) {
  if (event.key === 'Enter' || event.type === 'click') {
    const query = document.getElementById('search-input').value;
    if (!query) return;
    filterPanel.classList.add('hidden');
    setLoading();
    const data = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(query)}/1`);
    renderGrid(data, `Hasil Pencarian: "${query}"`, null);
  }
}

function renderGrid(data, title, funcName) {
  const list = data?.komikList || [];
  if (list.length === 0) {
    contentArea.innerHTML = `<div class="text-center py-40 text-gray-500">Tidak ada komik.</div>`;
    return;
  }

  let paginationHTML = '';
  if (data.pagination && funcName) {
    const current = data.pagination.currentPage;
    paginationHTML = `
      <div class="mt-14 flex justify-center items-center gap-4">
        ${current > 1 ? `<button onclick="${funcName}(${current - 1})" class="glass px-5 py-2 rounded-lg text-xs font-bold">Prev</button>` : ''}
        <span class="bg-amber-500 text-black px-4 py-2 rounded-lg text-xs font-extrabold">${current}</span>
        ${data.pagination.hasNextPage ? `<button onclick="${funcName}(${current + 1})" class="glass px-5 py-2 rounded-lg text-xs font-bold">Next</button>` : ''}
      </div>
    `;
  }

  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">${title}</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      ${list.map(item => `
        <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group"
            onclick="showDetail('${item.slug}')">
          <span class="type-badge ${getTypeClass(item.type)}">${item.type}</span>
          <div class="aspect-[3/4] overflow-hidden">
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
          </div>
          <div class="p-3 text-center">
            <h3 class="text-xs font-bold truncate">${item.title}</h3>
            <p class="text-[10px] text-amber-500 mt-1">${item.rating ? '★ ' + item.rating : 'Baca Sekarang'}</p>
          </div>
        </div>
      `).join('')}
    </div>
    ${paginationHTML}
  `;
  window.scrollTo(0, 0);
}

/* ---------------- Detail & Chapter ---------------- */

async function showDetail(idOrSlug, push = true) {
  let slug = idOrSlug;
  setLoading();

  if (idOrSlug.length === 36) { // Jika UUID
    const mapping = await getSlugFromUuid(idOrSlug);
    if (mapping) slug = mapping.slug;
  }

  if (push) {
    const uuid = await getUuidFromSlug(slug, 'series');
    updateURL(`/series/${uuid}`);
  }

  resetNavs();
  const data = await fetchAPI(`${API_BASE}/detail/${slug}`);
  if (!data || !data.data) { redirectTo404(); return; }

  const res = data.data;
  currentChapterList = res.chapters || [];
  currentComicContext = { slug, title: res.title, image: res.image };

  const firstCh = res.chapters?.length > 0 ? res.chapters[res.chapters.length - 1].slug : null;

  contentArea.innerHTML = `
    <div class="fixed top-0 left-0 w-full h-[60vh] -z-10 pointer-events-none overflow-hidden">
      <img src="${res.image}" class="w-full h-full object-cover blur-2xl opacity-20 animate-pulse-slow">
      <div class="absolute inset-0 bg-gradient-to-b from-[#0b0b0f]/40 to-[#0b0b0f]"></div>
    </div>

    <div class="flex flex-col md:flex-row gap-8 lg:gap-12 mt-4 animate-fade-in">
      <div class="md:w-[280px] shrink-0 mx-auto md:mx-0">
        <img src="${res.image}" class="w-64 rounded-2xl shadow-2xl border border-white/10 mx-auto">
        <div class="flex flex-col gap-3 mt-6">
          <button onclick="readChapter('${res.chapters?.[0]?.slug}', '${slug}')" class="amber-gradient py-3.5 rounded-xl font-bold text-black shadow-lg">
            Baca Chapter Terbaru
          </button>
          <button onclick="toggleBookmark('${slug}', '${res.title.replace(/'/g,"")}', '${res.image}')" id="btn-bookmark" class="py-3.5 rounded-xl glass border-white/10 font-semibold">
            Simpan Favorit
          </button>
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <h1 class="text-3xl font-extrabold mb-4">${res.title}</h1>
        <div class="flex flex-wrap gap-2 mb-6">
          ${res.genres ? res.genres.map(g => `<span class="text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5">${g.name}</span>`).join('') : ''}
        </div>
        <div class="bg-white/5 rounded-2xl p-5 border border-white/5 mb-8">
          <h3 class="font-bold text-sm mb-2 text-amber-500 uppercase">Sinopsis</h3>
          <p class="text-gray-300 text-sm leading-relaxed">${res.description || 'Tidak ada deskripsi.'}</p>
        </div>

        <div class="glass rounded-2xl border border-white/10 overflow-hidden">
          <div class="p-4 bg-white/5 flex justify-between items-center">
            <h3 class="font-bold">Daftar Chapter (${res.chapters?.length || 0})</h3>
          </div>
          <div id="chapter-list-container" class="max-h-[500px] overflow-y-auto p-2">
            ${res.chapters?.map(ch => `
              <div onclick="readChapter('${ch.slug}', '${slug}')" class="flex justify-between p-3 mb-1 rounded-lg bg-white/5 hover:bg-amber-500/10 cursor-pointer transition border border-transparent hover:border-amber-500/30">
                <span class="text-sm font-medium truncate">${ch.title}</span>
                <span class="text-[10px] text-gray-500">${ch.releaseTime || ''}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  checkBookmarkStatus(slug);
  saveHistory(slug, res.title, res.image);
}

async function readChapter(chSlug, comicSlug = null, push = true) {
  if (isNavigating || !chSlug) return;
  lockNav(); setLoading();

  if (push) {
    const uuid = await getUuidFromSlug(chSlug, 'chapter');
    updateURL(`/chapter/${uuid}`);
  }

  mainNav.classList.add('-translate-y-full');
  mobileNav.classList.add('translate-y-full');

  const data = await fetchAPI(`${API_BASE}/chapter/${chSlug}`);
  if (!data || !data.data) { redirectTo404(); unlockNav(); return; }

  const res = data.data;
  const currentSlug = chSlug;
  const parentSlug = comicSlug || res.allChapterSlug;

  contentArea.innerHTML = `
    <div class="relative min-h-screen bg-[#0b0b0f] -mx-4 -mt-24">
      <div id="reader-top" class="fixed top-0 w-full bg-black/80 backdrop-blur-lg z-[60] p-4 flex justify-between items-center transition-transform">
        <button onclick="showDetail('${parentSlug}')" class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-amber-500 hover:text-black">
          <i class="fa fa-arrow-left"></i>
        </button>
        <h2 class="text-xs font-bold text-white truncate px-4">${res.title}</h2>
        <button onclick="toggleFullScreen()" class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10"><i class="fa fa-expand text-xs"></i></button>
      </div>

      <div id="reader-images" class="flex flex-col items-center bg-[#111] min-h-screen max-w-3xl mx-auto pt-20" onclick="toggleReaderUI()">
        ${res.images.map(img => `
          <div class="w-full relative bg-zinc-800">
             <img src="${img.url}" class="comic-page" loading="lazy" onerror="this.src='https://via.placeholder.com/500x800?text=Gagal+Memuat+Gambar'">
          </div>
        `).join('')}
      </div>

      <div id="reader-bottom" class="fixed bottom-6 left-0 w-full z-[60] px-4 flex justify-center transition-transform">
        <div class="glass p-2 rounded-2xl flex gap-1 bg-black/80 backdrop-blur-xl border border-white/10">
          <button onclick="${res.navigation?.prev ? `readChapter('${res.navigation.prev}', '${parentSlug}')` : ''}" 
            class="w-10 h-10 rounded-xl flex items-center justify-center ${!res.navigation?.prev ? 'opacity-20' : 'hover:bg-amber-500 hover:text-black'}">
            <i class="fa fa-chevron-left"></i>
          </button>
          <div class="px-4 flex items-center">
             <span class="text-[10px] font-bold">MODE MEMBACA</span>
          </div>
          <button onclick="${res.navigation?.next ? `readChapter('${res.navigation.next}', '${parentSlug}')` : ''}" 
            class="w-10 h-10 rounded-xl flex items-center justify-center amber-gradient text-black ${!res.navigation?.next ? 'opacity-20' : ''}">
            <i class="fa fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  if (parentSlug && currentChapterList.length === 0) {
     const pData = await fetchAPI(`${API_BASE}/detail/${parentSlug}`);
     if (pData) currentChapterList = pData.data?.chapters || [];
  }

  saveHistory(parentSlug, res.thumbnail?.title, res.thumbnail?.url, chSlug, res.title);
  setProgress(100);
  window.scrollTo(0, 0);
  bindReaderProgress();
  unlockNav();
}

function toggleReaderUI() {
  const t = document.getElementById('reader-top');
  const b = document.getElementById('reader-bottom');
  t.classList.toggle('-translate-y-full');
  b.classList.toggle('translate-y-20');
}

/* ---------------- History / Bookmarks / Init ---------------- */

function saveHistory(slug, title, image, chSlug, chTitle) {
  if (!slug) return;
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  history = history.filter(h => h.slug !== slug);
  history.unshift({ slug, title, image, lastChapterSlug: chSlug, lastChapterTitle: chTitle, timestamp: Date.now() });
  localStorage.setItem('fmc_history', JSON.stringify(history.slice(0, 50)));
}

function showHistory() {
  updateURL('/history'); resetNavs();
  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  renderGrid({ komikList: history }, "Riwayat Terakhir");
}

function toggleBookmark(slug, title, image) {
  let b = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const idx = b.findIndex(x => x.slug === slug);
  if (idx > -1) b.splice(idx, 1);
  else b.push({ slug, title, image });
  localStorage.setItem('fmc_bookmarks', JSON.stringify(b));
  checkBookmarkStatus(slug);
}

function checkBookmarkStatus(slug) {
  const btn = document.getElementById('btn-bookmark');
  if (!btn) return;
  const b = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  if (b.some(x => x.slug === slug)) {
    btn.innerHTML = `<i class="fa fa-check text-amber-500"></i> Tersimpan`;
    btn.className = "py-3.5 rounded-xl border border-amber-500/50 bg-amber-500/10 font-bold";
  } else {
    btn.innerHTML = `Simpan Favorit`;
    btn.className = "py-3.5 rounded-xl glass border-white/10 font-semibold";
  }
}

function showBookmarks() {
  updateURL('/bookmarks'); resetNavs();
  const b = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  renderGrid({ komikList: b }, "Koleksi Favorit");
}

async function handleInitialLoad() {
  const path = window.location.pathname;
  if (path.startsWith('/series/')) showDetail(path.split('/')[2], false);
  else if (path.startsWith('/chapter/')) readChapter(path.split('/')[2], null, false);
  else if (path === '/ongoing') showOngoing();
  else if (path === '/completed') showCompleted();
  else if (path === '/history') showHistory();
  else if (path === '/bookmarks') showBookmarks();
  else showHome(false);
}

window.onpopstate = handleInitialLoad;
document.addEventListener('DOMContentLoaded', handleInitialLoad);
