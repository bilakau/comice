// ====== API ENDPOINTS UPDATED ======
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

// Pembersih judul berantakan (seperti "Komik\n   Naruto") dari api
function cleanTitle(text) {
  if (!text) return 'Tanpa Judul';
  return text.replace(/(\n|\r)/gm, '').replace(/\s+/g, ' ').replace(/^Komik\s*/i, '').trim();
}

async function getUuidFromSlug(slug, type) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, type })
    });
    const data = await res.json();
    return data.uuid;
  } catch (e) {
    return slug;
  }
}

async function getSlugFromUuid(uuid) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-slug/${uuid}`);
    if (!res.ok) return null;
    return await res.json();
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
  contentArea.innerHTML = `<div class="text-center py-40 text-red-500 font-bold">Error 404: Konten Tidak Ditemukan.</div>`;
}

// === Modifikasi pemanggil JSON menyesuaikan Cors dan Response API baru
async function fetchAPI(url) {
  try {
    const response = await fetch(API_PROXY + encodeURIComponent(url));
    const data = await response.json();
    
    // Sesuaikan respon dengan JSON Wrapper proxy Vercel yg terbaru (data.result.content)
    if (data.success && data.result?.content) {
      return data.result.content;
    } 
    return null;
  } catch (e) {
    console.error("Fetch API error:", e);
    return null;
  }
}

function toggleFilter() {
  filterPanel.classList.toggle('hidden');
  const genreSelect = document.getElementById('filter-genre');
  // Kalau mau fitur dynamic genre API
  // if (genreSelect && genreSelect.options.length <= 1) loadGenres();
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
    <div class="flex justify-center items-center py-40">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500"></div>
    </div>`;
}

function lockNav() {
  isNavigating = true;
  setProgress(0);
}

function unlockNav() {
  isNavigating = false;
}

function setProgress(percent) {
  if (!progressBar) return;
  const p = Math.max(0, Math.min(100, percent));
  progressBar.style.width = `${p}%`;
}

/* progress reader: berdasarkan scroll */
function bindReaderProgress() {
  const onScroll = () => {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    if (scrollHeight <= 0) return setProgress(0);
    const percent = (scrollTop / scrollHeight) * 100;
    setProgress(percent);
  };
  window.removeEventListener('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------------- Data Functions ---------------- */

async function showHome(push = true) {
  if (push) updateURL('/');
  resetNavs();
  setLoading();

  const res = await fetchAPI(`${API_BASE}/latest/1`);
  if (!res) { redirectTo404(); return; }

  const popular = res.komikPopuler || [];
  const latest = res.komikList || [];

  contentArea.innerHTML = `
    <!-- Top Populer Slider -->
    <section class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <i class="fa fa-fire text-amber-500"></i> Populer
        </h2>
      </div>
      <div class="flex overflow-x-auto gap-4 hide-scroll pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        ${popular.map(item => `
          <div class="min-w-[150px] md:min-w-[200px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group border border-white/5"
              onclick="showDetail('${item.slug}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10"></div>
            <span class="type-badge ${getTypeClass(item.type)} !bg-amber-500/80 !text-black">${item.rank ? `#${item.rank}` : 'Hot'}</span>
            <img src="${item.image}" class="h-64 md:h-80 w-full object-cover transform group-hover:scale-110 transition duration-500">
            <div class="absolute bottom-0 left-0 p-3 z-20 w-full">
              <h3 class="text-sm font-bold truncate text-white drop-shadow-md">${cleanTitle(item.title)}</h3>
              <p class="text-amber-400 text-[10px] font-semibold mt-1">
                 <i class="fa fa-star text-[10px]"></i> ${item.rating || '?'}
              </p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Latest Update -->
    <div class="grid grid-cols-1 lg:grid-cols-1 gap-10">
      <div class="lg:col-span-1">
        <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Update Terbaru</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          ${latest.map(item => `
            <div class="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition group flex flex-col h-full"
                onclick="showDetail('${item.slug}')">
              <div class="relative h-56 overflow-hidden">
                <span class="type-badge ${getTypeClass(item.type)} bottom-2 left-2 top-auto">${item.type || 'Manga'}</span>
                <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
              </div>
              <div class="p-3 flex flex-col flex-1 justify-between">
                <h3 class="text-xs font-bold line-clamp-2 leading-relaxed mb-2">${cleanTitle(item.title)}</h3>
                <div class="flex justify-between items-center w-full">
                  <span class="text-[10px] font-medium bg-amber-500/20 text-amber-500 px-2 py-1 rounded truncate">
                    ${item.chapters?.[0]?.title || 'Chapter ?'}
                  </span>
                  <span class="text-[9px] text-gray-500 whitespace-nowrap pl-1">
                     ${item.chapters?.[0]?.date || ''}
                  </span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  window.scrollTo(0, 0);
}

// Untuk Endpoint yang berhubugan dengan daftar & array komik list 
async function showOngoing(page = 1) {
  updateURL('/ongoing'); resetNavs(); setLoading();
  const data = await fetchAPI(`${API_BASE}/library?page=${page}&status=Ongoing`);
  renderGrid(data, "Daftar Ongoing Terbaru", "showOngoing");
}

async function showCompleted(page = 1) {
  updateURL('/completed'); resetNavs(); setLoading();
  const data = await fetchAPI(`${API_BASE}/library?page=${page}&status=Completed`);
  renderGrid(data, "Komik Tamat", "showCompleted");
}

async function showGenre(slug, page = 1) {
  resetNavs(); setLoading();
  const data = await fetchAPI(`${API_BASE}/library?genre=${slug}&page=${page}`);
  renderGrid(data, `Menelusuri : ${slug}`, "showGenre", slug);
}

// Fungsi fitur Search ! (Memasangkan Endpoint /search) 
async function applyAdvancedFilter() {
  const query = document.getElementById('search-input').value;
  const genre = document.getElementById('filter-genre').value;
  const type = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;

  filterPanel.classList.add('hidden');
  setLoading();

  // Mode Prioritas Pencarian Keyword!
  if (query) {
    const data = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(query)}/1`);
    renderGrid(data, `Hasil Pencarian: "${query}"`, null);
    return;
  }
  
  if (genre) { showGenre(genre, 1); return; }

  // Fitur Filter default jika yang dipilih drop-down filter 
  let url = `${API_BASE}/library?page=1`;
  if (type) url += `&type=${type}`;
  if (status) url += `&status=${status}`;
  const data = await fetchAPI(url);
  renderGrid(data, "Daftar Filter Ditemukan", null);
}


function renderGrid(data, title, funcName, extraArg = null) {
  const list = data?.komikList || data?.data || [];
  
  if (!list || list.length === 0) {
    contentArea.innerHTML = `
      <div class="text-center py-40 text-gray-500 flex flex-col items-center gap-4">
        <i class="fa fa-folder-open text-4xl opacity-50"></i>
        <p>Aduh, Konten belum ada atau pencarianmu ga ketemu...</p>
      </div>`;
    return;
  }

  let paginationHTML = '';
  if (data.pagination && funcName) {
    const current = parseInt(data.pagination.currentPage || 1);
    const argStr = extraArg ? `'${extraArg}', ` : '';
    paginationHTML = `
      <div class="mt-14 flex justify-center items-center gap-4">
        ${current > 1 ? `<button onclick="${funcName}(${argStr}${current - 1})" class="glass px-5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition"><i class="fa fa-chevron-left"></i> Sebelumnya</button>` : ''}
        <span class="bg-amber-500 text-black px-4 py-2 rounded-lg text-xs font-extrabold shadow-lg shadow-amber-500/20">${current}</span>
        ${data.pagination.hasNextPage ? `<button onclick="${funcName}(${argStr}${current + 1})" class="glass px-5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition">Berikutnya <i class="fa fa-chevron-right"></i></button>` : ''}
      </div>
    `;
  }

  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">${title}</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      ${list.map(item => `
        <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group flex flex-col"
            onclick="showDetail('${item.slug}')">
          <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Buku'}</span>
          <div class="relative overflow-hidden h-60">
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
          </div>
          <div class="p-3 text-center flex-1">
            <h3 class="text-xs font-bold line-clamp-2 leading-relaxed mb-2">${cleanTitle(item.title)}</h3>
            <p class="text-[10px] bg-amber-500/10 text-amber-500 rounded py-1 w-full text-center mt-auto font-medium shadow-md transition">
               ${item.rating ? 'Rating: '+item.rating : (item.latestChapter?.title || 'Klik utk Info Detail')}
            </p>
          </div>
        </div>
      `).join('')}
    </div>
    ${paginationHTML}
  `;
  window.scrollTo(0, 0);
}

/* ---------------- Detail Page Logic ---------------- */

async function showDetail(idOrSlug, push = true) {
  let slug = idOrSlug;
  setLoading();

  if (idOrSlug.length === 36) {
    const mapping = await getSlugFromUuid(idOrSlug);
    if (mapping) slug = mapping.slug;
  }

  if (push) {
    const uuid = await getUuidFromSlug(slug, 'series');
    updateURL(`/series/${uuid}`);
  }

  resetNavs();
  
  // Endpoint Detail Format Web Baru
  const dataRaw = await fetchAPI(`${API_BASE}/detail/${slug}`);
  const res = dataRaw?.data;

  if (!res) { redirectTo404(); return; }

  currentChapterList = res.chapters || [];
  
  // Membersihkan spasi pada Title dari Response Array Object Json
  const cleanJudul = cleanTitle(res.title);

  currentComicContext = { slug, title: cleanJudul, image: res.image };

  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const savedItem = history.find(h => h.slug === slug);
  const lastCh = savedItem ? savedItem.lastChapterSlug : null;
  const firstCh = currentChapterList.length > 0 ? currentChapterList[currentChapterList.length - 1].slug : null;

  const startBtnText = lastCh ? "Lanjut Baca Chapter Sebelumnya" : "Baca Dari Awal";
  const startBtnAction = lastCh
    ? `readChapter('${lastCh}', '${slug}')`
    : (firstCh ? `readChapter('${firstCh}', '${slug}')` : "alert('Mohon maaf, Bab komik blm tersedia disini')");

  const backdropHTML = `
    <div class="fixed top-0 left-0 w-full h-[60vh] -z-10 pointer-events-none overflow-hidden">
      <img src="${res.image}" class="w-full h-full object-cover blur-2xl opacity-20 backdrop-banner animate-pulse-slow">
      <div class="absolute inset-0 bg-gradient-to-b from-[#0b0b0f]/40 via-[#0b0b0f]/80 to-[#0b0b0f]"></div>
    </div>
  `;

  // Fix response mapping text sinopsis (Komikindo memakai .description bukanya .synopsis)
  const synopsisText = res.description || "Sinopsis Belum diterbitkan sama Author :v";
  const isLongSynopsis = synopsisText.length > 250;
  
  const detailProp = res.detail || {};

  contentArea.innerHTML = `
    ${backdropHTML}

    <div class="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-12 mt-4 animate-fade-in">

      <div class="md:w-[280px] flex-shrink-0 mx-auto md:mx-0 w-full max-w-[280px]">
        <div class="relative group">
          <span class="type-badge ${getTypeClass(detailProp.type || res.type)} scale-110 top-4 left-4 shadow-lg">${detailProp.type || res.type || 'Manga'}</span>
          <img src="${res.image}" class="w-full rounded-2xl shadow-2xl border border-white/10 group-hover:border-amber-500/30 transition duration-500">
        </div>

        <div class="flex flex-col gap-3 mt-6">
          <button onclick="${startBtnAction}" class="amber-gradient w-full py-3.5 rounded-xl font-bold text-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition shadow-lg shadow-amber-500/20">
            <i class="fa fa-book-open"></i> <span class="text-xs text-center">${startBtnText}</span>
          </button>
          <button onclick="toggleBookmark('${slug}', '${String(cleanJudul).replace(/'/g, "")}', '${res.image}')" id="btn-bookmark"
            class="w-full py-3.5 rounded-xl glass font-semibold border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2">
            <i class="fa fa-bookmark"></i> Simpan Buku
          </button>
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <h1 class="text-3xl md:text-5xl font-extrabold mb-4 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">${cleanJudul}</h1>

        <div class="flex flex-wrap gap-3 mb-6">
          <div class="glass px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-amber-400 border border-amber-500/20 shadow-md">
            <i class="fa fa-star"></i> ${res.rating || 'N/A'}
          </div>
          <div class="glass px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-green-400 border border-green-500/20 shadow-md">
            <i class="fa fa-circle text-[6px] ${detailProp.status?.toLowerCase() === 'tamat' ? 'text-red-500' : 'text-green-500'}"></i> 
            ${detailProp.status || 'Berjalan'}
          </div>
          <div class="glass px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-blue-400 border border-blue-500/20 shadow-md">
             Author: ${detailProp.author || 'Tidak Diketahui'}
          </div>
        </div>

        <!-- Mapped properties res.genres object to g.name  -->
        <div class="flex flex-wrap gap-2 mb-6">
          ${(res.genres || []).map(g => `
            <span class="text-gray-400 cursor-default text-[10px] px-3 py-1 rounded-full border border-white/10 bg-white/5 font-bold shadow-md">
              ${g.name || g.title}
            </span>`).join('')}
        </div>

        <div class="bg-black/30 rounded-2xl p-5 md:p-6 mb-8 border border-white/10 backdrop-blur-md shadow-2xl">
          <h3 class="font-bold text-sm mb-3 text-amber-500 uppercase tracking-wide">Ringkasan Sinopsis</h3>
          <p id="synopsis-text" class="text-gray-300 text-xs leading-loose text-justify ${isLongSynopsis ? 'line-clamp-4' : ''} transition-all duration-300">
            ${synopsisText}
          </p>
          ${isLongSynopsis ? `
            <button onclick="toggleSynopsis()" id="synopsis-btn" class="text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded shadow-lg text-xs font-bold mt-4 hover:bg-amber-500/20 transition flex items-center justify-center mx-auto gap-2">
              Baca Sepenuhnya <i class="fa fa-chevron-down"></i>
            </button>` : ''}
        </div>

        <!-- Listing Detail UI Layout !-->
        <div class="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black">
          <div class="p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900/40">
            <h3 class="font-bold text-base flex items-center gap-2">
              <i class="fa fa-list-ul text-amber-500"></i> Pilihan Bab Chapter
              <span class="bg-amber-500 shadow-md text-black text-[10px] font-bold px-2.5 py-1 rounded-full ml-1">Total : ${currentChapterList.length || 0}</span>
            </h3>
            <div class="relative w-full sm:w-auto group">
              <i class="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs group-focus-within:text-amber-500 transition"></i>
              <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="Mencari Nomor Bab (Cth: 200)"
                class="w-full sm:w-64 bg-black border border-white/10 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold tracking-widest focus:outline-none focus:border-amber-500 transition text-amber-200">
            </div>
          </div>

          <div id="chapter-list-container" class="max-h-[600px] overflow-y-auto chapter-list-scroll p-3 bg-black/40"></div>
        </div>
      </div>
    </div>
  `;

  renderChapterList(currentChapterList, slug);
  checkBookmarkStatus(slug);
  saveHistory(slug, cleanJudul, res.image);
  window.scrollTo(0, 0);
}

function toggleSynopsis() {
  const txt = document.getElementById('synopsis-text');
  const btn = document.getElementById('synopsis-btn');
  if (!txt || !btn) return;

  if (txt.classList.contains('line-clamp-4')) {
    txt.classList.remove('line-clamp-4');
    btn.innerHTML = `Sembunyikan Singkat <i class="fa fa-chevron-up"></i>`;
  } else {
    txt.classList.add('line-clamp-4');
    btn.innerHTML = `Baca Sepenuhnya <i class="fa fa-chevron-down"></i>`;
  }
}

function renderChapterList(chapters, comicSlug) {
  const container = document.getElementById('chapter-list-container');
  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const comicHistory = history.find(h => h.slug === comicSlug);
  const lastReadSlug = comicHistory ? comicHistory.lastChapterSlug : '';

  if (!chapters || chapters.length === 0) {
    container.innerHTML = '<div class="p-8 text-center text-red-400 font-bold text-xs"><i class="fa fa-warning"></i> Tidak Ditemukan Daftar / Data Bab Rusak...</div>';
    return;
  }

  container.innerHTML = chapters.map(ch => {
    const isLastRead = ch.slug === lastReadSlug;
    return `
      <div onclick="safeReadChapter('${ch.slug}', '${comicSlug}')"
        class="chapter-item group flex flex-col md:flex-row md:items-center justify-between p-3 mb-2 rounded-xl cursor-pointer border border-white/5 transition-all duration-200 shadow-md 
        ${isLastRead ? 'bg-amber-500/20 border-amber-500' : 'bg-[#181820]/90 hover:bg-amber-500/10 hover:border-amber-500/40'}">

        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow bg-black/60 text-gray-400 group-hover:text-amber-400 group-hover:scale-105 transition shrink-0 border border-white/5">
            <i class="fa ${isLastRead ? 'fa-history text-amber-500' : 'fa-play'} text-[10px]"></i>
          </div>
          <div class="flex flex-col ml-1 w-full max-w-[200px]">
             <span class="text-xs font-bold truncate transition leading-snug tracking-wider ${isLastRead ? 'text-amber-500' : 'text-gray-200'} group-hover:text-amber-400">
               ${cleanTitle(ch.title)}
             </span>
             <span class="text-[9px] font-bold tracking-widest uppercase mt-0.5 opacity-60 flex gap-2 w-full truncate">
                 <span><i class="fa fa-clock"></i> ${ch.releaseTime || ch.date || 'Update Terbaru'}</span>
             </span>
          </div>
        </div>

        <div class="mt-2 md:mt-0 text-[10px] md:self-auto text-white shadow-lg shadow-black/30 text-center font-bold px-4 py-1.5 rounded border border-white/10 group-hover:bg-amber-500 group-hover:text-black group-hover:border-amber-500 transition tracking-wide ${isLastRead ? 'bg-amber-500 !text-black' : 'bg-black'} shrink-0">
          ${isLastRead ? 'Sedang dibaca...' : 'Ayo Mulai Baca!'}
        </div>
      </div>
    `;
  }).join('');
}

function safeReadChapter(chSlug, comicSlug) {
  if (isNavigating) return;
  readChapter(chSlug, comicSlug, true);
}

function filterChapters() {
  const input = document.getElementById('chapter-search');
  const filter = (input?.value || '').toLowerCase();
  const container = document.getElementById('chapter-list-container');
  const items = container.getElementsByClassName('chapter-item');

  for (let i = 0; i < items.length; i++) {
    // Array cari tulisan
    const txtValue = items[i].innerText;
    items[i].style.display = txtValue.toLowerCase().indexOf(filter) > -1 ? "" : "none";
  }
}

/* ---------------- Reader Logic Image Processing !  ---------------- */

function normalizeChapterLabel(text) {
  if (!text) return "Chap / ?";
  const t = cleanTitle(String(text));

  const m = t.match(/(\d+(\.\d+)?)/);
  if (m) return `BAB. Ke - ${m[1]}`;

  return t;
}

async function readChapter(chIdOrSlug, comicSlug = null, push = true) {
  if (isNavigating) return;
  lockNav();
  setLoading();

  try {
    let chSlug = chIdOrSlug;

    if (chIdOrSlug.length === 36) {
      const mapping = await getSlugFromUuid(chIdOrSlug);
      if (mapping) chSlug = mapping.slug;
    }

    if (push) {
      const uuid = await getUuidFromSlug(chSlug, 'chapter');
      updateURL(`/chapter/${uuid}`);
    }

    mainNav.classList.add('-translate-y-full');
    mobileNav.classList.add('translate-y-full');

    const dataRaw = await fetchAPI(`${API_BASE}/chapter/${chSlug}`);
    const res = dataRaw?.data;

    if (!res) { redirectTo404(); return; }

    // Memastikan logic komik parent URL benar pada saat nav
    let finalComicSlug = comicSlug;
    if (!finalComicSlug) {
      if (res.allChapterSlug) finalComicSlug = res.allChapterSlug; 
      else if (res.comic_slug) finalComicSlug = res.comic_slug;
    }

    const comicTitle =
      cleanTitle(currentComicContext?.title || res.komikInfo?.title || "Seseorang Sedang Membaca");

    const chapterLabel = normalizeChapterLabel(res.title || chSlug);
    const headerTitle = `${comicTitle} - ${chapterLabel}`;

    const backAction = finalComicSlug ? `showDetail('${finalComicSlug}')` : `showHome()`;

    let dropdownHTML = '';
    if (currentChapterList && currentChapterList.length > 0) {
      dropdownHTML = generateDropdownHTML(currentChapterList, chSlug, finalComicSlug);
    } else {
      dropdownHTML = `<div id="dropdown-placeholder" class="w-32"><small><i>Load Options..</i></small></div>`;
    }

    contentArea.innerHTML = `
      <div class="relative min-h-screen bg-[#070709] -mx-4 -mt-24 pb-safe border border-amber-500/20 shadow-lg">

        <div id="reader-top" class="reader-ui fixed top-0 w-full bg-gradient-to-b from-black via-black/90 to-transparent z-[60] p-4 flex justify-between items-center transition-all duration-300 backdrop-blur shadow-2xl">
          <div class="flex items-center gap-3">
            <button onclick="${backAction}" class="w-10 h-10 flex items-center justify-center bg-black backdrop-blur border border-white/20 rounded-full hover:bg-amber-500 hover:text-black shadow transition text-amber-500 shadow-lg">
              <i class="fa fa-times text-lg"></i>
            </button>

            <div class="flex flex-col drop-shadow min-w-0 pr-4">
              <span class="text-[9px] text-green-400 font-extrabold uppercase tracking-widest"><i class="fa fa-play text-[8px] mr-1"></i> Sedang Mode Membaca :</span>
              <h2 class="text-xs font-bold text-white max-w-[250px] md:max-w-md lg:max-w-full truncate pt-1 shadow-black shadow">${headerTitle}</h2>
            </div>
          </div>

          <button onclick="toggleFullScreen()" class="w-10 h-10 hidden sm:flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/20 rounded-full hover:bg-amber-500 hover:text-black transition text-white hover:border-amber-500 shadow-md">
            <i class="fa fa-expand"></i>
          </button>
        </div>

        <!-- Render Box Chapter --->
        <div id="reader-images" class="flex flex-col items-center pt-2 min-h-screen w-full lg:max-w-3xl lg:border-x border-white/5 mx-auto bg-black shadow-2xl" onclick="toggleReaderUI()">
        </div>

        <div id="reader-bottom" class="reader-ui fixed bottom-4 md:bottom-8 left-0 w-full z-[60] px-4 flex justify-center transition-all duration-300 pointer-events-none">
          <div class="glass py-2 px-3 rounded-2xl flex gap-1.5 items-center shadow-2xl shadow-black border-2 border-white/10 bg-black/90 backdrop-blur-2xl pointer-events-auto hover:border-amber-500/50 transition">
            <button id="btn-prev"
              onclick="${res.navigation?.prev ? `readChapter('${res.navigation.prev}', '${finalComicSlug || ''}')` : ''}"
              class="w-12 h-10 text-xs flex items-center justify-center font-extrabold rounded-lg ${!res.navigation?.prev ? 'opacity-30 cursor-not-allowed text-gray-500 bg-white/5 border border-white/10' : 'amber-gradient hover:scale-105 transition shadow shadow-black text-black'}">
               <i class="fa fa-caret-left mr-2"></i> Prev
            </button>

            <div id="chapter-dropdown-container" class="shrink flex">
              ${dropdownHTML}
            </div>

            <button id="btn-next"
              onclick="${res.navigation?.next ? `readChapter('${res.navigation.next}', '${finalComicSlug || ''}')` : ''}"
              class="w-12 h-10 text-xs font-extrabold flex items-center justify-center rounded-lg ${!res.navigation?.next ? 'opacity-30 cursor-not-allowed text-gray-500 bg-white/5 border border-white/10' : 'bg-green-500 shadow text-black hover:scale-105 border border-white/10 hover:border-amber-500 transition'}">
               Next <i class="fa fa-caret-right ml-2"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    const imageContainer = document.getElementById('reader-images');
    
    // Perbaikan membaca map "Images URL dari Web JSON Baru / API Endpoint Komikindo" Array of Object!
    const imgsList = res.images || [];
    
    setProgress(10);
    let loadedCount = 0;
    const total = Math.max(1, imgsList.length);

    imgsList.forEach((imgItem) => {
      const imgUrlString = typeof imgItem === 'object' ? imgItem.url : imgItem;

      if(!imgUrlString) return; // Keamanan array 

      const wrapper = document.createElement('div');
      wrapper.className = "w-full relative min-h-[40vh] md:min-h-[500px] bg-transparent flex justify-center mx-auto object-center p-[0px_!important]"; // Mematikan garis spasi padding border
      
      const skeleton = document.createElement('div');
      skeleton.className = "skeleton absolute inset-0 w-full h-full z-10 opacity-40 bg-gray-900";
      
      // Load spinner Icon tengah di panel images sebelum rendered loaded full
      skeleton.innerHTML = `
        <div class="h-full flex items-center justify-center flex-col shadow">
             <i class="fa fa-sync fa-spin text-amber-500 opacity-60 text-xl font-bold"></i>
        </div>`;

      const img = new Image();
      // Bypass Referrer Network CORS Imgs dengan Prefix Proxy tambahan klo perlu, ini pakai proxy yg udh kamu tentukan aja lsg string native url gambarnya.
      img.src = imgUrlString; 
      img.className = "comic-page opacity-0 shadow-lg object-contain w-full transition-opacity duration-1000 ease-out z-20 m-0 border-none block leading-[0]"; // Style Reader Image Max width responsive Layout Image Tanpa Patah Potongan.
      img.loading = "lazy";

      img.onload = () => {
        loadedCount++;
        if(wrapper.contains(skeleton)) skeleton.remove();
        img.classList.remove('opacity-0');
        wrapper.style.minHeight = "auto";
        wrapper.style.backgroundColor = "transparent";
        setProgress(10 + (loadedCount / total) * 70);
      };

      img.onerror = () => {
        loadedCount++;
        if(wrapper.contains(skeleton)) skeleton.remove();
        wrapper.style.minHeight = "180px";
        wrapper.innerHTML = `
          <div class="w-full h-full border-t border-red-500/20 shadow p-6 bg-red-900/10 text-center flex flex-col items-center justify-center mx-auto my-4 text-xs font-mono font-bold">
            <i class="fa fa-warning text-red-400 mb-2 shadow p-3 rounded-full border border-red-400 bg-red-900/40"></i> Gambar Ini Gagal / Corrupted Di Hosting Origin
             <button onclick="window.location.reload();" class="mt-4 px-3 py-1 glass rounded-md hover:bg-white/10 transition border border-white/20">↻ Klik Buat Reload/Refresh Halman Website Browsernya.!</button>
          </div>`;
        setProgress(10 + (loadedCount / total) * 70);
      };

      wrapper.appendChild(skeleton);
      wrapper.appendChild(img);
      imageContainer.appendChild(wrapper);
    });

    if (finalComicSlug) {
      saveHistory(finalComicSlug, currentComicContext?.title, res.thumbnail?.url || currentComicContext?.image, chSlug, chapterLabel);
    }

    if ((!currentChapterList || currentChapterList.length === 0) && finalComicSlug) {
      fetchAndPopulateDropdown(finalComicSlug, chSlug);
    }

    setProgress(100);
    window.scrollTo(0, 0);
    bindReaderProgress();
  } finally {
    unlockNav();
  }
}

function generateDropdownHTML(list, currentSlug, comicSlug) {
  return `
    <div class="relative group h-full">
      <select onchange="safeReadChapter(this.value, '${comicSlug || ''}')"
        class="appearance-none border font-bold uppercase tracking-wider h-10 text-[10px] w-[140px] md:w-[180px] sm:w-[220px] focus:border-amber-500 focus:text-white px-2 py-1 shadow bg-white/10 hover:bg-white/5 border border-white/5 outline-none truncate transition rounded-md appearance-none overflow-hidden hover:text-amber-500 custom-scrollbar-option pr-8 text-gray-200">
        ${list.map(ch => `<option value="${ch.slug}" ${ch.slug === currentSlug ? 'selected' : ''} class="bg-[#121215] text-amber-500 !p-5 leading-loose !rounded-2xl h-[40px] font-bold mx-2 cursor-pointer shadow outline-none border-b shadow shadow-black  active:scale-95 focus:scale-105 shadow-xl ">📑 ${cleanTitle(ch.title)}</option>`).join('')}
      </select>
      <i class="fa fa-search shadow-xl rounded pointer-events-none p-1.5 flex items-center justify-center font-extrabold top-[6px] opacity-70 border bg-amber-500 absolute border-black right-2 !text-black shadow-[rgba(0,0,0,0.6)] group-focus-within:bg-green-500 transition scale-75 border-black/80 rounded" ></i>
    </div>
  `;
}


async function fetchAndPopulateDropdown(comicSlug, currentChapterSlug) {
  const data = await fetchAPI(`${API_BASE}/detail/${comicSlug}`);
  const dataInfoDetailRes = data?.data;

  if (dataInfoDetailRes) {
    currentChapterList = dataInfoDetailRes.chapters || [];
    currentComicContext = { slug: comicSlug, title: cleanTitle(dataInfoDetailRes.title), image: dataInfoDetailRes.image };

    const container = document.getElementById('chapter-dropdown-container');
    if (container) {
      container.innerHTML = generateDropdownHTML(currentChapterList, currentChapterSlug, comicSlug);
    }
    saveHistory(comicSlug, cleanTitle(dataInfoDetailRes.title), dataInfoDetailRes.image, currentChapterSlug);
  }
}

function toggleReaderUI() {
  const top = document.getElementById('reader-top');
  const bottom = document.getElementById('reader-bottom');
  if (!top || !bottom) return;
  top.classList.toggle('ui-hidden-top');
  bottom.classList.toggle('ui-hidden-bottom');
}

/* ---------------- History & Bookmarks ---------------- */

function handleSearch(e) { if (e.key === 'Enter') applyAdvancedFilter(); }

function saveHistory(slug, title, image, chSlug, chTitle) {
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  let existing = history.find(h => h.slug === slug);

  const data = {
    slug,
    title: title || existing?.title || 'Buku Tidak DiKetahui.?',
    image: image || existing?.image || 'assets/icon.png',
    lastChapterSlug: chSlug || existing?.lastChapterSlug,
    lastChapterTitle: chTitle || existing?.lastChapterTitle || 'Informasi Chapter .?',
    timestamp: new Date().getTime()
  };

  history = history.filter(h => h.slug !== slug);
  history.unshift(data);
  if (history.length > 50) history.pop();
  localStorage.setItem('fmc_history', JSON.stringify(history));
}

function showHistory() {
  updateURL('/history'); resetNavs();
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  // Sesuaikan grid response function buatan agar tetap render object Array Manual yg ada dari cache Lokal : Array(localStorage): array diubah jadi JSON object array mapping!
  renderGrid({ data: history }, "Terakhir di BACA Oleh Saya.", null);
}

function toggleBookmark(slug, title, image) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const idx = bookmarks.findIndex(b => b.slug === slug);
  if (idx > -1) bookmarks.splice(idx, 1);
  else bookmarks.push({ slug, title: cleanTitle(title), image });
  localStorage.setItem('fmc_bookmarks', JSON.stringify(bookmarks));
  checkBookmarkStatus(slug);
}

function checkBookmarkStatus(slug) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const btn = document.getElementById('btn-bookmark');
  if (!btn) return;

  if (bookmarks.some(b => b.slug === slug)) {
    btn.innerHTML = `<i class="fa fa-check text-green-600 bg-white/20 p-0.5 rounded mr-0.5 w-6 h-6 object-center text-center py-1 scale-105 border"></i> <span class='font-black bg-clip-text text-amber-200 mt-[1px] shadow'>TERSIPAN & DITAMBAHKAN KEFavorit !!</span>`;
    btn.classList.add('border-green-600', 'bg-gradient-to-l', 'from-amber-600/30' , 'to-black');
    btn.classList.remove('glass');
  } else {
    btn.innerHTML = `<i class="fa fa-bookmark"></i> Simpan / Favorit-Kan Ini . . ?`;
    btn.classList.remove('border-green-600', 'bg-gradient-to-l', 'from-amber-600/30' , 'to-black');
    btn.classList.add('glass');
  }
}

function showBookmarks() {
  updateURL('/bookmarks'); resetNavs();
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  renderGrid({ data: bookmarks }, "Semua Lemari TERSIMPAN Saya <3!", null);
}

/* ---------------- Init Default Starter Loaded  ---------------- */

async function handleInitialLoad() {
  const path = window.location.pathname;
  resetNavs();

  if (path === '/404.html') return;

  if (path.startsWith('/series/')) {
    const uuid = path.split('/')[2];
    if (uuid) showDetail(uuid, false);
    else showHome(false);
  }
  else if (path.startsWith('/chapter/')) {
    const uuid = path.split('/')[2];
    if (uuid) readChapter(uuid, null, false);
    else showHome(false);
  }
  else if (path === '/ongoing') showOngoing(1);
  else if (path === '/completed') showCompleted(1);
  else if (path === '/history') showHistory();
  else if (path === '/bookmarks') showBookmarks();
  else showHome(false);
}

window.addEventListener('popstate', () => handleInitialLoad());

document.addEventListener('DOMContentLoaded', () => {
  // Option Menu Call
  // loadGenres(); => Pilihan filter ditambahkan otomatis manual array jika proxy cors menghalagi API Load array list category : Tapi biarkan begini udh cukup bagus untuk interface! 
  
  handleInitialLoad();
});
