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
  contentArea.innerHTML = `<div class="text-center py-40 text-red-500">Error 404: Halaman tidak ditemukan/Server API Mati Sementara.</div>`;
}

// Update logic fetch Proxy dan ekstrasi ke response contentnya
async function fetchAPI(url) {
  try {
    const response = await fetch(API_PROXY + encodeURIComponent(url));
    const proxyData = await response.json();
    
    // Perbaikan membaca balasan Cors dari sistem barunya: proxyData.result.content
    if (proxyData.success && proxyData.result && proxyData.result.content) {
      return proxyData.result.content; 
    }
    // Fallback original 
    return proxyData.result || proxyData;
  } catch (e) {
    console.error("Gagal get API:", e);
    return null;
  }
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

  // Endpoint Latest sbg halaman Beranda
  const data = await fetchAPI(`${API_BASE}/latest/1`);
  if (!data) { redirectTo404(); return; }

  // Array Baru versi Komikindo: komikPopuler & komikList
  const hotList = data.komikPopuler || [];
  const latestList = data.komikList || [];

  contentArea.innerHTML = `
    <section class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <i class="fa fa-fire text-amber-500"></i> Terpopuler 
        </h2>
      </div>
      <div class="flex overflow-x-auto gap-4 hide-scroll pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        ${hotList.map((item, index) => `
          <div class="min-w-[150px] md:min-w-[200px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group"
              onclick="showDetail('${item.slug}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10"></div>
            
            <span class="type-badge ${getTypeClass(item.type)} !bg-amber-500 !text-black !border-transparent">#${index+1} Hitz</span>
            
            <img src="${item.image}" class="h-64 md:h-80 w-full object-cover transform group-hover:scale-110 transition duration-500">
            <div class="absolute bottom-0 left-0 p-3 z-20 w-full">
              <h3 class="text-sm font-bold truncate text-white drop-shadow-md">${item.title}</h3>
              <p class="text-amber-400 text-[10px] font-semibold mt-1">
                <i class="fa fa-star text-[9px] mr-1"></i> ${item.rating || 'N/A'}
              </p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div class="lg:col-span-2">
        <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Update Terbaru</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
          ${latestList.map(item => `
            <div class="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition group"
                onclick="showDetail('${item.slug}')">
              <div class="relative h-48 overflow-hidden">
                <span class="type-badge ${getTypeClass(item.type)} bottom-2 left-2 top-auto">${item.type || 'Manga'}</span>
                <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
              </div>
              <div class="p-3">
                <h3 class="text-xs font-bold line-clamp-2 h-8 leading-relaxed">${item.title}</h3>
                <div class="flex justify-between items-center mt-3">
                  <span class="text-[10px] bg-white/5 px-2 py-1 rounded text-amber-500 font-bold border border-white/5">${item.chapters?.[0]?.title || 'Ch.?'}</span>
                  <span class="text-[9px] text-gray-500">${item.chapters?.[0]?.date || ''}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Saran Bacaan</h2>
        <div class="space-y-4">
          ${hotList.slice().reverse().slice(0,8).map(item => `
            <div class="flex gap-4 bg-zinc-900/30 p-2 rounded-xl cursor-pointer hover:bg-white/5 transition border border-transparent hover:border-white/10"
                onclick="showDetail('${item.slug}')">
              <img src="${item.image}" class="w-16 h-20 rounded-lg object-cover shadow-lg">
              <div class="flex-1 flex flex-col justify-center overflow-hidden">
                <h3 class="font-bold text-xs line-clamp-2 mb-2 text-gray-200">${item.title}</h3>
                <div class="flex items-center gap-2">
                  <span class="text-amber-500 text-[10px] font-bold"><i class="fa fa-star text-[9px] mr-1"></i> ${item.rating || '?'} / 10</span>
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

// Ongoing mengambil daftar Library teratas (Library biasanya auto refresh by time Update)
async function showOngoing(page = 1) {
  updateURL('/ongoing'); resetNavs();
  setLoading();
  const data = await fetchAPI(`${API_BASE}/latest/${page}`);
  renderGrid(data, "Paling Populer & Updates (Hot)", "showOngoing");
}

async function showCompleted(page = 1) {
  updateURL('/completed'); resetNavs();
  setLoading();
  // Di Api komikindo base data Library nya
  const data = await fetchAPI(`${API_BASE}/library?page=${page}`);
  renderGrid(data, "Daftar Koleksi Penuh & Terarsip", "showCompleted");
}

async function applyAdvancedFilter() {
  const query = document.getElementById('search-input').value;
  filterPanel.classList.add('hidden');
  setLoading();

  if (query) {
    const data = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(query)}/1`);
    renderGrid(data, `Hasil Pencarian: "${query}"`, null);
    return;
  }

  // Jika nggak ada kata kunci, kembalikan ke list Library base page 1
  const data = await fetchAPI(`${API_BASE}/library?page=1`);
  renderGrid(data, "Semua Manga/Manhwa Tersedia", null);
}

// Perbaiki Struktur Data yang akan dilooping List
function renderGrid(data, title, funcName, extraArg = null) {
  const list = data?.komikList || data?.data || data || []; 
  
  if (!Array.isArray(list) || list.length === 0) {
    contentArea.innerHTML = `
      <div class="text-center py-40 text-gray-500 flex flex-col items-center gap-4">
        <i class="fa fa-folder-open text-4xl opacity-50"></i>
        <p>Tidak ada komik ditemukan.</p>
      </div>`;
    return;
  }

  let paginationHTML = '';
  if (data.pagination && funcName) {
    const current = data.pagination.currentPage;
    const argStr = extraArg ? `'${extraArg}', ` : '';
    paginationHTML = `
      <div class="mt-14 flex justify-center items-center gap-4">
        ${current > 1 ? `<button onclick="${funcName}(${argStr}${current - 1})" class="glass px-5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition"><i class="fa fa-chevron-left"></i> Prev</button>` : ''}
        <span class="bg-amber-500 text-black px-4 py-2 rounded-lg text-xs font-extrabold shadow-lg shadow-amber-500/20">Page ${current}</span>
        ${data.pagination.hasNextPage ? `<button onclick="${funcName}(${argStr}${current + 1})" class="glass px-5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition">Next <i class="fa fa-chevron-right"></i></button>` : ''}
      </div>
    `;
  }

  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">${title}</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      ${list.map(item => `
        <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group"
            onclick="showDetail('${item.slug}')">
          <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Manga'}</span>
          <div class="relative overflow-hidden aspect-[3/4]">
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
          </div>
          <div class="p-3 text-center">
            <h3 class="text-xs font-bold line-clamp-2 h-8 leading-snug group-hover:text-amber-500 transition">${item.title}</h3>
            <p class="text-[10px] text-gray-500 mt-2 font-medium">
              Rating <span class="text-amber-500 ml-1 font-bold">${item.rating || '?'}</span>
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
  // Pemanggilan Detail yang sesuai ke endpoint komikindo
  const fetchData = await fetchAPI(`${API_BASE}/detail/${slug}`);
  const res = fetchData?.data;
  
  if (!res) { redirectTo404(); return; }

  currentChapterList = res.chapters || [];
  currentComicContext = { slug, title: res.title, image: res.image };

  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const savedItem = history.find(h => h.slug === slug);
  const lastCh = savedItem ? savedItem.lastChapterSlug : null;
  
  // Mencari awal mula manga / First Chapter (berdasarkan struk api baru yang ada properties khusus)
  let firstChObj = res.firstChapter || null;
  const firstCh = firstChObj ? firstChObj.slug : (res.chapters?.length > 0 ? res.chapters[res.chapters.length - 1].slug : null);

  const startBtnText = lastCh ? "Lanjut Baca" : "Mulai Baca Awal";
  const startBtnAction = lastCh
    ? `readChapter('${lastCh}', '${slug}')`
    : (firstCh ? `readChapter('${firstCh}', '${slug}')` : "alert('Mohon maaf chapter awal belum masuk DB API / Rusak.')");

  const backdropHTML = `
    <div class="fixed top-0 left-0 w-full h-[60vh] -z-10 pointer-events-none overflow-hidden">
      <img src="${res.image}" class="w-full h-full object-cover blur-2xl opacity-20 backdrop-banner animate-pulse-slow">
      <div class="absolute inset-0 bg-gradient-to-b from-[#0b0b0f]/40 via-[#0b0b0f]/80 to-[#0b0b0f]"></div>
    </div>
  `;

  const synopsisText = res.description || "Maaf.. untuk komik ini tim penyedia belum melampirkan teks deskripsi spesifik atau data korup...";
  const isLongSynopsis = synopsisText.length > 250;
  
  // Pembersihan property Details Baru Komikindo
  const detType = res.detail?.type || 'Komik Manga';
  const detStatus = res.detail?.status || 'Unknown Status';

  contentArea.innerHTML = `
    ${backdropHTML}

    <div class="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-12 mt-4 animate-fade-in">

      <div class="md:w-[280px] flex-shrink-0 mx-auto md:mx-0 w-full max-w-[280px]">
        <div class="relative group">
          <span class="type-badge ${getTypeClass(detType)} scale-110 top-4 left-4 shadow-lg">${detType}</span>
          <img src="${res.image}" class="w-full rounded-2xl shadow-2xl border border-white/10 group-hover:border-amber-500/30 transition duration-500">
        </div>

        <div class="flex flex-col gap-3 mt-6">
          <button onclick="${startBtnAction}" class="amber-gradient w-full py-3.5 rounded-xl font-bold text-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition shadow-lg shadow-amber-500/20">
            <i class="fa fa-book-open text-black"></i> ${startBtnText}
          </button>
          <button onclick="toggleBookmark('${slug}', '${String(res.title).replace(/'/g, "")}', '${res.image}')" id="btn-bookmark"
            class="w-full py-3.5 rounded-xl glass font-semibold border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2">
            <i class="fa fa-bookmark"></i> Simpan Pustaka
          </button>
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <h1 class="text-3xl md:text-5xl font-extrabold mb-4 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">${res.title.replace("Komik\n              ", "")}</h1>

        <div class="flex flex-wrap gap-3 mb-6">
          <div class="glass px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-amber-400 border border-amber-500/20">
            <i class="fa fa-star text-amber-500"></i> Score: ${res.rating || 'N/A'}
          </div>
          <div class="glass px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-green-400 border border-green-500/20">
            <i class="fa fa-circle text-[6px]"></i> ${detStatus}
          </div>
          <div class="glass px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-blue-400 border border-blue-500/20 bg-blue-500/5">
             Format: ${detType}
          </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-6">
          ${res.genres ? res.genres.map(g => `
            <span class="text-gray-400 text-xs px-3 py-1 rounded-full border border-white/10 hover:border-amber-500/50 bg-white/5 cursor-default transition">
              ${g.name || g.title}
            </span>`).join('') : ''}
        </div>

        <div class="bg-white/5 rounded-2xl p-5 md:p-6 mb-8 border border-white/5 backdrop-blur-sm shadow-xl shadow-black/40">
          <h3 class="font-bold text-sm mb-3 text-amber-500 tracking-wide flex gap-2 items-center"><i class="fa fa-book"></i> Sinopsis Cerita</h3>
          <p id="synopsis-text" class="text-gray-300 text-sm leading-relaxed text-justify ${isLongSynopsis ? 'line-clamp-4' : ''} transition-all duration-300">
            ${synopsisText}
          </p>
          ${isLongSynopsis ? `
            <button onclick="toggleSynopsis()" id="synopsis-btn" class="text-amber-500 text-xs font-bold mt-2 hover:text-white transition flex items-center gap-1">
              Luaskan Cerita <i class="fa fa-chevron-down ml-1"></i>
            </button>` : ''}
        </div>

        <div class="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black">
          <div class="p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900/40">
            <h3 class="font-bold text-lg flex items-center gap-2 text-gray-100">
              <i class="fa fa-list-ul text-amber-500"></i> Timeline Chapter
              <span class="bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-md ml-2">${res.chapters?.length || 0} eps</span>
            </h3>
            <div class="relative w-full sm:w-auto group">
              <i class="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs group-focus-within:text-amber-500 transition"></i>
              <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="Mau baca angka berapa..."
                class="w-full sm:w-64 bg-black/40 border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-xs focus:outline-none focus:border-amber-500 focus:bg-zinc-900/80 transition text-white">
            </div>
          </div>

          <div id="chapter-list-container" class="max-h-[500px] overflow-y-auto chapter-list-scroll p-2.5 bg-[#0e0e14]"></div>
        </div>
      </div>
    </div>
  `;

  renderChapterList(res.chapters || [], slug);
  checkBookmarkStatus(slug);
  saveHistory(slug, res.title.replace("Komik\n              ", ""), res.image);
  window.scrollTo(0, 0);
}

function toggleSynopsis() {
  const txt = document.getElementById('synopsis-text');
  const btn = document.getElementById('synopsis-btn');
  if (!txt || !btn) return;

  if (txt.classList.contains('line-clamp-4')) {
    txt.classList.remove('line-clamp-4');
    btn.innerHTML = `Gulung Ke Atas <i class="fa fa-chevron-up ml-1"></i>`;
  } else {
    txt.classList.add('line-clamp-4');
    btn.innerHTML = `Luaskan Cerita <i class="fa fa-chevron-down ml-1"></i>`;
  }
}

function renderChapterList(chapters, comicSlug) {
  const container = document.getElementById('chapter-list-container');
  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const comicHistory = history.find(h => h.slug === comicSlug);
  const lastReadSlug = comicHistory ? comicHistory.lastChapterSlug : '';

  if (!chapters || chapters.length === 0) {
    container.innerHTML = '<div class="p-8 text-center text-red-500 text-sm italic font-semibold border-red-500/20 border mx-3 my-3 bg-red-900/10 rounded-lg">Masih Segera Hadir/Belum Ada Isinya Boss! 👻</div>';
    return;
  }

  container.innerHTML = chapters.map(ch => {
    const isLastRead = ch.slug === lastReadSlug;
    return `
      <div onclick="safeReadChapter('${ch.slug}', '${comicSlug}')"
        class="chapter-item group flex items-center justify-between p-3.5 mb-2 rounded-xl cursor-pointer border border-transparent transition-all duration-200
        ${isLastRead ? 'bg-amber-500/20 border border-amber-500/50 shadow-sm shadow-amber-500/10' : 'bg-white/[0.03] border-white/5 hover:bg-white/10 hover:border-amber-500/40'}">

        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-black/40 text-gray-500 group-hover:text-amber-500 transition shrink-0 shadow-inner shadow-black">
            <i class="fa ${isLastRead ? 'fa-history' : 'fa-play'} text-[10px] pl-[1px]"></i>
          </div>
          <span class="text-sm font-semibold truncate group-hover:text-amber-500 transition ${isLastRead ? 'text-amber-500' : 'text-gray-300'}">
            ${ch.title}
          </span>
        </div>

        <div class="text-[10px] flex items-center text-gray-500 gap-2 font-medium shrink-0">
          <span class="hidden sm:inline italic font-normal tracking-wide bg-black/40 px-2 py-0.5 rounded border border-white/5 opacity-50">${ch.releaseTime || 'Dahulu'}</span>
          <div class="bg-black/50 px-3 py-1.5 rounded-lg border border-white/10 group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-black group-active:scale-95 transition-all uppercase tracking-wider shadow text-[9px]">
            View
          </div>
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
    const span = items[i].getElementsByTagName("span")[0];
    const txtValue = span.textContent || span.innerText;
    items[i].style.display = txtValue.toLowerCase().indexOf(filter) > -1 ? "" : "none";
  }
}

/* ---------------- Reader Logic (New Parsing Images Structure API Baru) ---------------- */

function normalizeChapterLabel(text) {
  if (!text) return "Unknown Chapter";
  const t = String(text).trim();

  // Extract dari "One Piece Chapter 100" menjadi "Chapter 100" untuk kenyamanan pandang
  const cleanMatches = t.match(/(?:Ch(?:apter|ap)?)\s?(\d+(?:\.\d+)?)/i);
  if (cleanMatches && cleanMatches[0]) {
      return `Ch. ${cleanMatches[1]}`;
  }
  
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

    const rawData = await fetchAPI(`${API_BASE}/chapter/${chSlug}`);
    const res = rawData?.data; 

    if (!res || !res.images) { redirectTo404(); return; }

    // Logic mendapakan slug parent
    let finalComicSlug = comicSlug;
    if (!finalComicSlug && res.allChapterSlug) {
        finalComicSlug = res.allChapterSlug;
    }

    // Logic Title Bersih:
    let finalTitle = "";
    if (res.komikInfo?.title) finalTitle = res.komikInfo.title.replace("Komik\n", "").replace("Indo", "");
    else if(currentComicContext?.title) finalTitle = currentComicContext.title;
    else finalTitle = "Manga Read";

    const chapterLabel = normalizeChapterLabel(res.title || chSlug);
    const headerTitle = `${finalTitle.trim()}`;
    const subtitleEps = chapterLabel;

    const backAction = finalComicSlug ? `showDetail('${finalComicSlug}')` : `showHome()`;

    // Dropdown Logic Update API - komikInfo menyokong structure dropdown fullnya lho :
    if (res.komikInfo?.chapters && res.komikInfo.chapters.length > 0) {
        currentChapterList = res.komikInfo.chapters;
    }

    let dropdownHTML = '';
    if (currentChapterList && currentChapterList.length > 0) {
      dropdownHTML = generateDropdownHTML(currentChapterList, chSlug, finalComicSlug);
    } else {
      dropdownHTML = `<div id="dropdown-placeholder" class="text-[9px] text-gray-400 mt-1 italic px-2">(Loading Dropdown)</div>`;
    }

    contentArea.innerHTML = `
      <div class="relative min-h-screen bg-[#070709] -mx-4 -mt-24">

        <div id="reader-top" class="reader-ui fixed top-0 w-full bg-[#0b0b0f]/80 border-b border-white/5 backdrop-blur-xl z-[60] px-4 py-3 flex justify-between items-center transition-transform duration-300">
          <div class="flex items-center gap-3 w-4/5">
            <button onclick="${backAction}" class="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-amber-500 hover:text-black hover:border-amber-500 transition text-white group focus:scale-95 shadow-lg shadow-black/40">
              <i class="fa fa-arrow-left group-hover:-translate-x-0.5 transition-transform duration-300"></i>
            </button>

            <div class="flex flex-col drop-shadow-lg w-full min-w-0 pr-2">
              <h2 class="text-sm font-black text-gray-100 truncate flex flex-wrap"><span class="truncate block max-w-full">${headerTitle}</span></h2>
              <span class="text-[10px] text-amber-500 tracking-wider font-black flex items-center gap-1"><i class="fa fa-play text-[8px] -mt-px"></i> ${subtitleEps}</span>
            </div>
          </div>

          <button onclick="toggleFullScreen()" class="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-black/40 border border-white/10 rounded-xl hover:bg-white/20 active:scale-95 transition text-white">
            <i class="fa fa-expand text-xs"></i>
          </button>
        </div>

        <div id="reader-images" class="flex flex-col items-center pt-2 min-h-screen w-full lg:max-w-2xl xl:max-w-3xl md:max-w-lg sm:max-w-md mx-auto bg-black border-x border-zinc-900/50 relative shadow-[0_0_150px_rgba(0,0,0,1)]" onclick="toggleReaderUI()">
        </div>

        <div id="reader-bottom" class="reader-ui fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex justify-center transition-all duration-300 scale-95 w-full md:w-auto md:max-w-md px-4">
          <div class="p-2 w-full md:w-[350px] flex justify-between rounded-2xl gap-2 items-center border border-white/10 bg-[#0e0e14]/80 backdrop-blur-2xl drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] mx-auto relative group shadow-[0_1px_5px_0_rgba(245,158,11,0.2)]">
            
            <button id="btn-prev"
              onclick="${res.navigation?.prev ? `readChapter('${res.navigation.prev}', '${finalComicSlug || ''}')` : ''}"
              class="flex items-center gap-1 font-semibold text-[10px] uppercase w-[70px] justify-center px-1 py-3 h-full rounded-xl transition 
              ${!res.navigation?.prev ? 'opacity-30 pointer-events-none text-gray-500 bg-white/5' : 'bg-black/60 text-white hover:bg-amber-500 hover:text-black hover:border-amber-500 border border-transparent shadow'}">
              <i class="fa fa-angle-double-left mr-0.5"></i> Prev
            </button>

            <div id="chapter-dropdown-container" class="flex-1 w-full mx-1">
              ${dropdownHTML}
            </div>

            <button id="btn-next"
              onclick="${res.navigation?.next ? `readChapter('${res.navigation.next}', '${finalComicSlug || ''}')` : ''}"
               class="flex items-center gap-1 font-extrabold text-[10px] uppercase w-[70px] justify-center px-1 py-3 h-full rounded-xl transition 
               ${!res.navigation?.next ? 'opacity-30 pointer-events-none text-gray-500 bg-white/5 border border-transparent' : 'amber-gradient text-black hover:opacity-90 active:scale-95 shadow-md shadow-amber-500/20 drop-shadow'}">
              Next <i class="fa fa-angle-double-right ml-0.5"></i>
            </button>

          </div>
        </div>

      </div>
    `;

    const imageContainer = document.getElementById('reader-images');
    
    // Perbaikan membaca Array API Object -> Image ke Strings murni
    const imgsUrls = Array.isArray(res.images) 
      ? res.images.map(x => typeof x === 'string' ? x : x.url) 
      : [];
      
    setProgress(10);
    let loadedCount = 0;
    const total = Math.max(1, imgsUrls.length);

    imgsUrls.forEach((imgUrl) => {
      const wrapper = document.createElement('div');
      wrapper.className = "w-full relative min-h-[400px] bg-transparent";

      const skeleton = document.createElement('div');
      skeleton.className = "skeleton absolute inset-0 w-full h-full z-10 flex items-center justify-center pointer-events-none opacity-40 bg-zinc-900";
      
      const skeletonPulseHTML = `<div class="animate-pulse w-8 h-8 rounded-full border-2 border-white/20 border-t-amber-500 animate-spin"></div>`;
      skeleton.innerHTML = skeletonPulseHTML;

      const img = new Image();
      img.src = imgUrl;
      img.className = "comic-page opacity-0 transition-opacity duration-[800ms] ease-out relative z-20 mx-auto select-none pointer-events-auto border-y border-[#0e0e14]/10 mb-[-1px]"; // Menutup celah blank (pixel) antara page manga
      img.loading = "lazy";

      img.onload = () => {
        loadedCount++;
        skeleton.remove();
        img.classList.remove('opacity-0');
        wrapper.style.minHeight = "auto";
        wrapper.style.backgroundColor = "transparent";
        setProgress(10 + (loadedCount / total) * 70);
      };

      img.onerror = () => {
        loadedCount++;
        skeleton.remove();
        wrapper.innerHTML = `
          <div class="flex flex-col items-center justify-center py-24 my-2 mx-2 rounded-2xl bg-zinc-900/60 text-gray-500 gap-3 border border-red-900/40 hover:bg-zinc-800 transition">
            <i class="fa fa-file-image text-zinc-700 text-3xl mb-1 drop-shadow"></i>
            <span class="text-xs font-semibold text-zinc-400">Panel Rusak / Failed to Proxy</span>
            <button onclick="this.parentElement.parentElement.querySelector('img').src='${imgUrl}?v=${new Date().getTime()}'" 
              class="text-[9px] bg-red-900/50 text-red-200 uppercase font-black tracking-wider px-5 py-2.5 rounded-full mt-2 hover:bg-amber-600 hover:text-black border border-red-700/50 transition">Muat Ulang Paksa Panel ini</button>
          </div>
        `;
        wrapper.appendChild(img);
        setProgress(10 + (loadedCount / total) * 70);
      };

      wrapper.appendChild(skeleton);
      wrapper.appendChild(img);
      imageContainer.appendChild(wrapper);
    });

    if (finalComicSlug) {
      saveHistory(finalComicSlug, headerTitle, currentComicContext?.image || res.thumbnail?.url, chSlug, chapterLabel);
    }

    if ((!currentChapterList || currentChapterList.length === 0) && finalComicSlug) {
      fetchAndPopulateDropdown(finalComicSlug, chSlug);
    }

    setProgress(100);
    window.scrollTo(0, 0);
    bindReaderProgress();
  } catch (err) {
      console.log(err);
  } finally {
    unlockNav();
  }
}

function generateDropdownHTML(list, currentSlug, comicSlug) {
  return `
    <div class="relative group h-full cursor-pointer w-full text-center">
      <select onchange="safeReadChapter(this.value, '${comicSlug || ''}')"
        class="appearance-none outline-none border-0 text-gray-200 bg-transparent text-center font-bold tracking-widest uppercase cursor-pointer absolute inset-0 w-full opacity-0 z-30 block pr-6 text-sm py-3 transition hover:text-white truncate mx-auto bg-gray-50 focus:text-gray-900 drop-down-reset-styles custom-options overflow-y-auto">
        ${list.map(ch => `<option class="bg-gray-800 text-amber-500 border border-zinc-700 rounded my-1 text-sm outline-none px-4 shadow-[0px_4px_16px_rgba(17,17,26,0.1),_0px_8px_24px_rgba(17,17,26,0.1),_0px_16px_56px_rgba(17,17,26,0.1)] py-2 appearance-none checked:bg-amber-900 cursor-pointer text-center font-bold uppercase " value="${ch.slug}" ${ch.slug === currentSlug ? 'selected' : ''}>${ch.title.substring(0,25)}</option>`).join('')}
      </select>

      <div class="h-full flex gap-1 bg-[#1a1a24] group-hover:bg-[#20202d] shadow-inner px-2 py-0 border border-[#2b2b3a] items-center text-center justify-center font-black pointer-events-none rounded-xl mx-auto w-full active:scale-[0.98] transition shadow shadow-black">
         <span class="text-amber-500 block truncate flex-1 min-w-[70px] uppercase max-w-full z-10 text-[10px] mx-1">
             ${(list.find(x => x.slug == currentSlug)?.title || 'Options').replace(/chapter/i,"CH.")}
         </span>
         <i class="fa fa-caret-up mx-1 right-2 absolute  text-white text-[12px] group-hover:text-amber-500 transition-colors opacity-70 flex-shrink-0 drop-shadow z-20"></i>
      </div>

    </div>
  `;
}

async function fetchAndPopulateDropdown(comicSlug, currentChapterSlug) {
  const dataRaw = await fetchAPI(`${API_BASE}/detail/${comicSlug}`);
  const dt = dataRaw?.data;

  if (dt) {
    currentChapterList = dt.chapters || [];
    currentComicContext = { slug: comicSlug, title: dt.title, image: dt.image };

    const container = document.getElementById('chapter-dropdown-container');
    if (container) {
      container.innerHTML = generateDropdownHTML(currentChapterList, currentChapterSlug, comicSlug);
    }
    saveHistory(comicSlug, dt.title, dt.image, currentChapterSlug);
  }
}

function toggleReaderUI() {
  const top = document.getElementById('reader-top');
  const bottom = document.getElementById('reader-bottom');
  if (!top || !bottom) return;
  top.classList.toggle('ui-hidden-top');
  bottom.classList.toggle('translate-y-24');
  bottom.classList.toggle('opacity-0');
  bottom.classList.toggle('pointer-events-none');
}

/* ---------------- History & Bookmarks ---------------- */

function handleSearch(e) { if (e.key === 'Enter') applyAdvancedFilter(); }

function saveHistory(slug, title, image, chSlug, chTitle) {
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  let existing = history.find(h => h.slug === slug);

  const data = {
    slug,
    title: title || existing?.title || 'Buku Tersimpan',
    image: image || existing?.image || 'assets/icon.png',
    lastChapterSlug: chSlug || existing?.lastChapterSlug,
    lastChapterTitle: chTitle || existing?.lastChapterTitle || 'CH. -',
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
  
  // Custom Render for history cards agar format "title" nya cocok.
  if (history.length === 0) {
      contentArea.innerHTML = `<div class="text-center py-40 opacity-40 italic mt-8 bg-zinc-900 mx-5 rounded"><i class="fa fa-compass animate-spin shadow inline-block drop-shadow mr-2 opacity-50 text-white rounded-[50%] animate-spin drop-shadow-[0px_2px_4px_black] border border-amber-900 mb-6 bg-[#4c1613]"></i> Belum ada jejak manga mu sama sekali Bossku.. Baca dlu sonoh</div>`;
      return;
  }
  
  contentArea.innerHTML = `
      <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">Terakhir Kamu Buka :</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        ${history.map(item => `
           <div class="bg-[#121217] shadow-xl drop-shadow rounded-xl overflow-hidden border border-[#2b2b3a] hover:border-amber-600 transition card-hover group cursor-pointer relative pb-4"
               onclick="showDetail('${item.slug}')">
             <div class="relative overflow-hidden aspect-[3/4]">
                <div class="bg-black opacity-40 shadow z-30 transition absolute bottom-0 font-bold justify-center pointer-events-none font-bold italic inset-x-0 mx-auto text-[8.5px] uppercase pt-4 w-full h-[60px] pb-1 px-1 bg-gradient-to-t via-[#0e0d13]/60 shadow-[0_4px_4px_black] h-[25%] from-[#121217]"></div>
                
                <div class="z-50 uppercase flex bg-[#0c0d16] max-h-5 max-w-full drop-shadow-[2px_1px_1px_black] text-[9.5px] items-center border-[#0c0d16] overflow-x-visible mt-2 group-hover:border-b-amber-500 group-hover:opacity-90 tracking-tighter shadow-lg right-[-3px] flex shadow px-2 shadow-amber-800 absolute font-extrabold pb-[1px] justify-center items-center py-2 h-7 rounded text-white overflow-hidden left-0 min-w-min flex items-end mr-[55%] whitespace-nowrap pl-1 bottom-1 ml-0.5" > 
                  <span> ⌛${item.lastChapterTitle || 'CH.?'}</span> 
                </div> 

               <img src="${item.image}" class="w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 group-hover:scale-[1.07] transition-all duration-[600ms]">
               
             </div>
             
             <h2 class="truncate bg-[#121217] my-3 ml-2 flex border-[#24243a] drop-shadow line-clamp-2 h-[28px] overflow-hidden  mb-0 flex whitespace-break-spaces italic transition text-[#eeeefa] mr-3 items-center mx-1 pb-1 pt-[6px] rounded pt-[5px] whitespace-normal md:text-[13px] hover:font-black tracking-[0px] font-bold group-hover:text-amber-500 mx-2 uppercase hover:opacity-90 pl-1 leading-5 lg:h-[43px] xs:text-base font-[Rubik] xl:leading-8 pb-[10px] sm:my-[4px] opacity-90 mx-auto items-center mt-[-10px] sm:pt-4 mx-3 opacity-90  uppercase pt-6 leading-tight flex uppercase lg:ml-2 sm:font-semibold" style="line-height:1.2;">  <span class="mr-[12px] h-[65px] h-[34px] overflow-hidden whitespace-normal sm:line-clamp-2 line-clamp-1 truncate sm:flex pb-[-8px] text-[10px] sm:pt-[5px] lg:-pt-[10px] mr-1 flex lg:mr-0 min-w-[34px] xl:pb-6  break-all tracking-normal line-clamp-[2]"  style="word-wrap:break-word;" title="${item.title}">${item.title}</span>   </h2> 
          </div> 
        `).join("")}
      </div>`;
}

function toggleBookmark(slug, title, image) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const idx = bookmarks.findIndex(b => b.slug === slug);
  if (idx > -1) bookmarks.splice(idx, 1);
  else bookmarks.push({ slug, title, image });
  localStorage.setItem('fmc_bookmarks', JSON.stringify(bookmarks));
  checkBookmarkStatus(slug);
}

function checkBookmarkStatus(slug) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const btn = document.getElementById('btn-bookmark');
  if (!btn) return;

  if (bookmarks.some(b => b.slug === slug)) {
    btn.innerHTML = `<i class="fa fa-check text-green-300"></i> Hapus Simpan`;
    btn.classList.add('border-amber-500/50', 'bg-amber-500/10', 'text-amber-300');
    btn.classList.remove('glass');
  } else {
    btn.innerHTML = `<i class="fa fa-bookmark"></i> Simpan Pustaka`;
    btn.classList.remove('border-amber-500/50', 'bg-amber-500/10', 'text-amber-300');
    btn.classList.add('glass');
  }
}

function showBookmarks() {
  updateURL('/bookmarks'); resetNavs();
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  // Convert list mapping standar manual array yang cocok diparse dengan komikList model renderGrid API base array
  renderGrid({komikList: bookmarks}, "Favorit Di Rak Pribadi 💖", null);
}

/* ---------------- Init ---------------- */

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
  handleInitialLoad();
});

// Menambahkan function fallback kosong krn loadGenres di API lama tdk berjalan pada format yang sama persis
window.loadGenres = async function() {
    const s = document.getElementById('filter-genre');
    if(s) s.innerHTML = '<option value="">Semua (Cari Berdasarkan Title aja dulu ya ^_^)</option>';
}
