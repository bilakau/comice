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

// Navigasi Target untuk UX Smart Reader
let currentNextSlug = null;
let currentPrevSlug = null;

/* ---------------- Helpers ---------------- */

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
  contentArea.innerHTML = `
    <div class="text-center py-40 flex flex-col items-center justify-center gap-3 animate-fade-in">
      <i class="fa fa-ghost text-5xl text-amber-500 mb-2 opacity-50"></i>
      <h2 class="text-xl font-bold text-gray-300">Waduh! Konten tidak ditemukan.</h2>
      <p class="text-xs text-gray-500 max-w-sm px-6">Sepertinya halaman yang kamu cari tersesat atau tidak ada dari Server!</p>
    </div>
  `;
}

async function fetchAPI(url) {
  try {
    const response = await fetch(API_PROXY + encodeURIComponent(url));
    const data = await response.json();
    if (data.success && data.result?.content) return data.result.content;
    return null;
  } catch (e) {
    console.error("Gagal terhubung ke proxy/API:", e);
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

function setLoading() {
  contentArea.innerHTML = `
    <div class="flex flex-col items-center justify-center py-40 h-[60vh] gap-4">
      <div class="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-amber-500 shadow-xl"></div>
      <p class="text-[10px] text-amber-500 font-extrabold uppercase tracking-[0.2em] animate-pulse">Memuat Data...</p>
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


/* ================== SMART READER ENGINE (UI & UX Experience) ================== */

// Event Tombol Keyboard Kiri/Kanan PC!
document.addEventListener('keydown', (e) => {
  const isReaderOpen = document.getElementById('reader-images');
  if (isReaderOpen && !isNavigating) {
    if (e.key === 'ArrowRight' && currentNextSlug) {
      safeReadChapter(currentNextSlug, currentComicContext.slug);
    } else if (e.key === 'ArrowLeft' && currentPrevSlug) {
      safeReadChapter(currentPrevSlug, currentComicContext.slug);
    }
  }
});

function toggleFullScreen() {
  const isFull = document.fullscreenElement || document.webkitFullscreenElement;
  const btnIcon = document.getElementById('fs-icon'); 

  if (!isFull) {
    const docElm = document.documentElement;
    if(docElm.requestFullscreen) docElm.requestFullscreen().then(() => { if(btnIcon) btnIcon.className = 'fa fa-compress text-amber-500'; }).catch(()=>{});
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => { if(btnIcon) btnIcon.className = 'fa fa-expand text-white'; }).catch(()=>{});
    }
  }
}

// Fitur Sembunyikan Nav saat menscroll halaman Chapter Komik! (Webtoon UX Experience)
let lastScrollY = 0;
function bindReaderEnhancements() {
  const doc = document.documentElement;
  const topUI = document.getElementById('reader-top');
  const botUI = document.getElementById('reader-bottom');

  const onScroll = () => {
    const currentScrollY = window.scrollY || doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;

    if (scrollHeight > 0) setProgress((currentScrollY / scrollHeight) * 100);

    if (currentScrollY > 150) { 
      if (currentScrollY > lastScrollY + 10) { 
        if (topUI) topUI.classList.add('ui-hidden-top');
        if (botUI) botUI.classList.add('ui-hidden-bottom');
      } 
      else if (currentScrollY < lastScrollY - 25) { 
        if (topUI) topUI.classList.remove('ui-hidden-top');
        if (botUI) botUI.classList.remove('ui-hidden-bottom');
      }
    } else {
      if (topUI) topUI.classList.remove('ui-hidden-top');
      if (botUI) botUI.classList.remove('ui-hidden-bottom');
    }

    lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY; 
  };

  window.removeEventListener('scroll', window.fmcScrollHandler);
  window.fmcScrollHandler = onScroll;
  window.addEventListener('scroll', window.fmcScrollHandler, { passive: true });
}

function toggleReaderUI() {
  const topUI = document.getElementById('reader-top');
  const botUI = document.getElementById('reader-bottom');
  if (topUI && botUI) {
    topUI.classList.toggle('ui-hidden-top');
    botUI.classList.toggle('ui-hidden-bottom');
  }
}

/* ---------------- Render Components & Logic UI Beranda dsb. ---------------- */

async function showHome(push = true) {
  if (push) updateURL('/');
  resetNavs(); setLoading();

  const res = await fetchAPI(`${API_BASE}/latest/1`);
  if (!res) { redirectTo404(); return; }

  const popular = res.komikPopuler || [];
  const latest = res.komikList || [];

  contentArea.innerHTML = `
    <!-- Top Populer Slider -->
    <section class="mb-12 animate-fade-in">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl md:text-2xl font-bold flex items-center gap-3 border-l-4 border-amber-500 pl-3">
          Populer
          <i class="fa fa-fire text-amber-500 bg-amber-500/20 px-2 py-1 rounded-lg text-sm shadow"></i> 
        </h2>
      </div>
      <div class="flex overflow-x-auto gap-4 hide-scroll pb-6 -mx-4 px-4 md:mx-0 md:px-0">
        ${popular.map(item => `
          <div class="min-w-[150px] md:min-w-[190px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group border border-white/5"
              onclick="showDetail('${item.slug}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent z-10 pointer-events-none"></div>
            <span class="type-badge ${getTypeClass(item.type)} !bg-amber-500/90 !text-black shadow">${item.rank ? `TOP #${item.rank}` : 'Hot'}</span>
            <img src="${item.image}" class="h-64 md:h-72 w-full object-cover transform group-hover:scale-110 transition duration-500">
            <div class="absolute bottom-0 left-0 p-3 z-20 w-full pointer-events-none">
              <h3 class="text-xs md:text-sm font-bold line-clamp-2 text-white drop-shadow-lg mb-1 group-hover:text-amber-400 transition">${cleanTitle(item.title)}</h3>
              <p class="text-white bg-black/50 backdrop-blur w-fit px-2 py-0.5 rounded shadow text-[9px] font-extrabold flex gap-1 items-center border border-white/10 mt-1">
                 <i class="fa fa-star text-amber-500"></i> ${item.rating || '?'}
              </p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Latest Update -->
    <div class="animate-fade-in">
        <h2 class="text-xl md:text-2xl font-bold mb-6 border-l-4 border-amber-500 pl-4 flex items-center gap-3">Update Hari Ini <i class="fa fa-clock text-amber-500/60"></i></h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          ${latest.map(item => `
            <div class="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer card-hover hover:border-amber-500/40 transition group flex flex-col h-full shadow-lg"
                onclick="showDetail('${item.slug}')">
              <div class="relative h-56 overflow-hidden">
                <span class="type-badge ${getTypeClass(item.type)} bottom-2 left-2 top-auto !bg-black/80">${item.type || 'Manga'}</span>
                <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <i class="fa fa-book-open text-white/80 text-3xl"></i>
                </div>
              </div>
              <div class="p-3 flex flex-col flex-1 justify-between bg-black/50 backdrop-blur-md border-t border-white/5">
                <h3 class="text-xs font-bold line-clamp-2 leading-relaxed mb-3 group-hover:text-amber-500 transition">${cleanTitle(item.title)}</h3>
                <div class="flex justify-between items-center w-full mt-auto">
                  <span class="text-[9px] font-black tracking-widest bg-amber-500/10 text-amber-500 px-2 py-1 rounded truncate border border-amber-500/20 shadow">
                    ${item.chapters?.[0]?.title || 'CHAPTER'}
                  </span>
                  <span class="text-[9px] text-gray-400 font-bold whitespace-nowrap pl-2">
                     ${item.chapters?.[0]?.date?.replace(' lalu','') || 'Baru'}
                  </span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
    </div>
  `;
  window.scrollTo(0, 0);
}

async function showOngoing(page = 1) {
  updateURL('/ongoing'); resetNavs(); setLoading();
  const data = await fetchAPI(`${API_BASE}/library?page=${page}&status=Ongoing`);
  renderGrid(data, "Jelajahi Seri Ongoing 🔥", "showOngoing");
}

async function showCompleted(page = 1) {
  updateURL('/completed'); resetNavs(); setLoading();
  const data = await fetchAPI(`${API_BASE}/library?page=${page}&status=Completed`);
  renderGrid(data, "Komik Tamat 💯", "showCompleted");
}

async function showGenre(slug, page = 1) {
  resetNavs(); setLoading();
  const data = await fetchAPI(`${API_BASE}/library?genre=${slug}&page=${page}`);
  renderGrid(data, `Eksplorasi Genre : ${String(slug).toUpperCase()}`, "showGenre", slug);
}

function handleSearch(e) { 
    if (e.key === 'Enter') applyAdvancedFilter(); 
}

async function applyAdvancedFilter() {
  const query = document.getElementById('search-input').value;
  const type = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;

  filterPanel.classList.add('hidden');
  setLoading();

  if (query) {
    const data = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(query)}/1`);
    renderGrid(data, `Pencarian Judul: "${query}"`, null);
    return;
  }
  
  let url = `${API_BASE}/library?page=1`;
  if (type) url += `&type=${type}`;
  if (status) url += `&status=${status}`;
  const data = await fetchAPI(url);
  renderGrid(data, "Saringan Hasil Filter Library", null);
}

function renderGrid(data, title, funcName, extraArg = null) {
  const list = data?.komikList || data?.data || [];
  
  if (!list || list.length === 0) {
    contentArea.innerHTML = `
      <div class="text-center py-32 flex flex-col items-center gap-4 animate-fade-in">
        <div class="w-20 h-20 glass rounded-full flex justify-center items-center shadow border-white/5 text-gray-600 mb-2">
           <i class="fa fa-folder-open text-3xl"></i>
        </div>
        <p class="text-gray-400 font-medium text-xs md:text-sm max-w-sm px-6">Wah... Hasilnya kosongan nih. Coba cari kata kunci komik atau ganti tab yang lain aja yak.</p>
      </div>`;
    return;
  }

  let paginationHTML = '';
  if (data.pagination && funcName) {
    const current = parseInt(data.pagination.currentPage || 1);
    const argStr = extraArg ? `'${extraArg}', ` : '';
    paginationHTML = `
      <div class="mt-14 mb-10 flex justify-center items-center gap-4 animate-fade-in">
        ${current > 1 ? `<button onclick="${funcName}(${argStr}${current - 1})" class="glass px-5 py-2 rounded-xl text-[10px] md:text-xs font-bold hover:bg-amber-500 hover:text-black border border-white/10 transition shadow"><i class="fa fa-arrow-left mr-1"></i> SEBELUM</button>` : ''}
        <span class="bg-amber-500 text-black px-6 py-2 rounded-xl text-sm font-extrabold shadow-lg shadow-amber-500/20">${current}</span>
        ${data.pagination.hasNextPage ? `<button onclick="${funcName}(${argStr}${current + 1})" class="glass px-5 py-2 rounded-xl text-[10px] md:text-xs font-bold hover:bg-amber-500 hover:text-black border border-white/10 transition shadow">LANJUT <i class="fa fa-arrow-right ml-1"></i></button>` : ''}
      </div>
    `;
  }

  contentArea.innerHTML = `
    <h2 class="text-xl md:text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4 animate-fade-in shadow-black drop-shadow-lg">${title}</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
      ${list.map((item, index) => `
        <div class="bg-[#111] rounded-2xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group flex flex-col shadow-lg shadow-black/40 animate-fade-in" style="animation-delay: ${index * 0.05}s"
            onclick="showDetail('${item.slug}')">
          <span class="type-badge ${getTypeClass(item.type)} backdrop-blur-md shadow-lg">${item.type || 'Baca'}</span>
          <div class="relative overflow-hidden aspect-[3/4] h-56 sm:h-64 border-b border-white/5">
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-105 transition duration-700">
            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 transition duration-300"></div>
          </div>
          <div class="p-3.5 flex flex-col flex-1 bg-gradient-to-t from-[#151515] to-[#111]">
            <h3 class="text-[11px] md:text-xs font-extrabold line-clamp-2 leading-relaxed mb-3 text-gray-200 group-hover:text-amber-500 transition">${cleanTitle(item.title)}</h3>
            <p class="text-[9px] bg-white/5 border border-white/10 group-hover:bg-amber-500/20 group-hover:border-amber-500/30 group-hover:text-amber-400 text-gray-400 uppercase tracking-widest font-black rounded py-1.5 w-full text-center mt-auto shadow-sm transition-all duration-300 truncate px-1">
               ${item.rating ? 'RATE: '+item.rating : (item.latestChapter?.title || 'Klik Buka')}
            </p>
          </div>
        </div>
      `).join('')}
    </div>
    ${paginationHTML}
  `;
  window.scrollTo(0, 0);
}


/* ---------------- FITUR: INFO DETAIL PAGE COMICS ---------------- */

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
  
  const dataRaw = await fetchAPI(`${API_BASE}/detail/${slug}`);
  const res = dataRaw?.data;

  if (!res) { redirectTo404(); return; }

  currentChapterList = res.chapters || [];
  const cleanJudul = cleanTitle(res.title);

  currentComicContext = { slug, title: cleanJudul, image: res.image };

  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const savedItem = history.find(h => h.slug === slug);
  const lastCh = savedItem ? savedItem.lastChapterSlug : null;
  const firstCh = currentChapterList.length > 0 ? currentChapterList[currentChapterList.length - 1].slug : null;

  const startBtnText = lastCh ? "Lanjut Chapter Yg Kemarin" : "BACA DARI CHAPTER 1";
  const startBtnAction = lastCh
    ? `readChapter('${lastCh}', '${slug}')`
    : (firstCh ? `readChapter('${firstCh}', '${slug}')` : "alert('Mohon maaf bos, Bab komik belum dimasukkan author komikindonnya!')");

  const detailProp = res.detail || {};
  const statusColorClass = detailProp.status?.toLowerCase().includes('tamat') ? 'text-red-500' : 'text-green-500';

  // Fix sinopsis api 
  const synopsisText = res.description || "Penulis masih terlalu malas untuk menulis jalan ceritanya disini, Yok lsg cobain aja bacanya ges ;)";
  const isLongSynopsis = synopsisText.length > 280;

  contentArea.innerHTML = `
    <!-- Efek Latar Image Banner Lebar  -->
    <div class="fixed top-0 left-0 w-full h-[60vh] -z-10 pointer-events-none overflow-hidden select-none">
      <img src="${res.image}" class="w-full h-full object-cover blur-3xl opacity-[0.18] backdrop-banner animate-pulse-slow scale-110">
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0b0f]/80 to-[#0b0b0f] opacity-100"></div>
    </div>

    <div class="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-14 mt-4 animate-fade-in max-w-6xl mx-auto">

      <!-- Kolom Sisi Kiri / Poster -->
      <div class="md:w-[260px] flex-shrink-0 mx-auto md:mx-0 w-full max-w-[280px]">
        <div class="relative group rounded-2xl overflow-hidden p-1 bg-gradient-to-bl from-white/10 via-transparent to-white/5 border border-white/5 shadow-2xl">
          <span class="type-badge ${getTypeClass(detailProp.type || res.type)} !top-4 !left-4 scale-105 shadow-xl font-bold bg-black/80">${detailProp.type || res.type || 'BUKU BACAAN'}</span>
          <img src="${res.image}" class="w-full h-auto rounded-xl object-cover block shadow-[inset_0px_0px_20px_black] group-hover:opacity-90 transition">
        </div>

        <div class="flex flex-col gap-3 mt-8">
          <button onclick="${startBtnAction}" class="w-full py-4 rounded-2xl font-black tracking-widest text-[11px] md:text-xs amber-gradient text-black flex flex-col items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 shadow-[0_10px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_25px_rgba(245,158,11,0.5)]">
            <i class="fa fa-play text-xl mb-0.5"></i> ${startBtnText}
          </button>
          <button onclick="toggleBookmark('${slug}', '${String(cleanJudul).replace(/'/g, "\\'")}', '${res.image}')" id="btn-bookmark"
            class="w-full py-3.5 mt-1 rounded-xl bg-white/5 border border-white/10 font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition flex items-center justify-center gap-2">
            <!-- Icon Ditangani di Javascript cek status bookmak! -->
          </button>
        </div>
      </div>

      <!-- Kolom Sisi Kanan / Informasi text Detail Cerita Dkk. -->
      <div class="flex-1 min-w-0 md:mt-4">
        <h1 class="text-3xl sm:text-4xl md:text-[2.6rem] font-black mb-4 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500 uppercase tracking-tighter drop-shadow-sm">${cleanJudul}</h1>

        <div class="flex flex-wrap items-center gap-3 md:gap-4 mb-7 select-none">
          <div class="bg-amber-500/10 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black text-amber-500 border border-amber-500/20 shadow-md">
            <i class="fa fa-star text-lg mb-0.5 shadow-xl drop-shadow"></i> <span class="text-sm">${res.rating || 'N/A'}</span>
          </div>
          <div class="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] md:text-xs font-black uppercase text-gray-300 border border-white/5 shadow-md">
            <i class="fa fa-signal ${statusColorClass}"></i> ${detailProp.status || 'Ongoing Info'}
          </div>
          <div class="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] uppercase font-bold text-gray-400 border border-white/5 shadow-md max-w-full">
             <i class="fa fa-user-edit"></i> <span class="truncate block max-w-[120px] md:max-w-[200px]">${detailProp.author || 'Tidak Diketahui'}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5 md:gap-2 mb-8 border-t border-white/5 pt-5 select-none">
          <span class="mr-2 text-xs font-bold text-gray-600 self-center uppercase"><i class="fa fa-tags mr-1"></i></span>
          ${(res.genres || []).map(g => `
            <span class="text-gray-300 cursor-default text-[10px] px-3 py-1 md:px-3 md:py-1.5 rounded-md border border-white/10 bg-[#16161c] font-black uppercase tracking-wider shadow hover:border-white/30 hover:bg-white/10 transition">
              ${g.name || g.title}
            </span>`).join('')}
        </div>

        <div class="bg-black/50 rounded-2xl p-5 md:p-7 mb-10 border border-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div class="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition text-6xl pointer-events-none">
              <i class="fa fa-quote-right"></i>
          </div>
          <h3 class="font-extrabold text-[11px] mb-3 text-amber-500 uppercase tracking-[0.2em] opacity-90 border-b border-amber-500/20 pb-3 inline-block">Mengenai Kisah Ini</h3>
          <p id="synopsis-text" class="text-gray-300 text-xs sm:text-sm leading-loose md:leading-8 text-justify font-normal opacity-90 relative z-10 ${isLongSynopsis ? 'line-clamp-4' : ''} transition-all duration-300">
            ${synopsisText}
          </p>
          ${isLongSynopsis ? `
            <button onclick="toggleSynopsis()" id="synopsis-btn" class="text-amber-500 font-bold border-none outline-none mt-4 text-[10px] uppercase tracking-widest bg-amber-500/10 hover:bg-amber-500/20 py-1.5 px-3 rounded shadow transition duration-200">
              Lebih Lanjut Baca Disini..
            </button>` : ''}
        </div>

        <!-- Render List Daftat Chapter di Kotak Box Rapi -->
        <div id="anchor-list" class="rounded-2xl border-2 border-white/5 overflow-hidden shadow-2xl bg-black">
          <div class="p-4 md:p-5 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 bg-[#0c0c11]">
            <h3 class="font-extrabold text-sm flex items-center uppercase tracking-widest text-white shadow-black drop-shadow-xl w-full">
              Daftar Chapter :
              <span class="bg-amber-500 ml-auto md:ml-4 shadow-[0px_0px_10px_rgba(245,158,11,0.5)] text-black text-[9px] font-black px-2.5 py-1 rounded-md opacity-90 block whitespace-nowrap">${currentChapterList.length} Hal.</span>
            </h3>
            <div class="relative w-full md:w-56 lg:w-72 shrink-0 group">
              <i class="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm group-focus-within:text-amber-500 transition"></i>
              <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="Menyelidiki Chap. (contoh: 23)"
                class="w-full bg-[#16161c] border border-white/10 rounded-xl py-3 pl-9 pr-4 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-amber-500/50 focus:bg-white/5 transition text-amber-200 placeholder-gray-600 shadow-inner">
            </div>
          </div>

          <div id="chapter-list-container" class="max-h-[60vh] overflow-y-auto chapter-list-scroll p-2 md:p-3 custom-scrollbar-option bg-zinc-900/40 grid grid-cols-1 md:grid-cols-2 gap-2"></div>
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
    btn.innerHTML = `<i class="fa fa-times text-[10px]"></i> CUKUP MENARIK`;
  } else {
    txt.classList.add('line-clamp-4');
    btn.innerHTML = `Lebih Lanjut Baca Disini..`;
  }
}

function renderChapterList(chapters, comicSlug) {
  const container = document.getElementById('chapter-list-container');
  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const comicHistory = history.find(h => h.slug === comicSlug);
  const lastReadSlug = comicHistory ? comicHistory.lastChapterSlug : '';

  if (!chapters || chapters.length === 0) {
    container.innerHTML = '<div class="col-span-1 md:col-span-2 py-10 flex items-center justify-center font-bold text-xs uppercase tracking-widest text-gray-600 bg-white/5 rounded border border-white/5 shadow-inner my-2 border-dashed">BAB NYA ILANG KATA YANG BIKIN SERVER.! <i class="fa fa-heart-crack ml-2"></i></div>';
    return;
  }

  container.innerHTML = chapters.map(ch => {
    const isLastRead = ch.slug === lastReadSlug;
    return `
      <div onclick="safeReadChapter('${ch.slug}', '${comicSlug}')"
        class="chapter-item group relative overflow-hidden flex flex-col justify-between p-4 h-full min-h-[75px] rounded-xl cursor-pointer border transition-all duration-300 transform select-none shadow hover:-translate-y-1
        ${isLastRead ? 'bg-[#181206] border-amber-500 shadow-[0_5px_15px_-5px_rgba(245,158,11,0.2)]' : 'bg-black/60 border-white/5 hover:border-white/20 hover:bg-[#1a1a24] hover:shadow-[0_8px_15px_-5px_rgba(0,0,0,0.8)]'}">

        <!-- Indikator Strip Kiri -->
        <div class="absolute left-0 top-0 h-full w-1 ${isLastRead ? 'bg-amber-500' : 'bg-transparent group-hover:bg-amber-500/40 transition-colors'}"></div>

        <div class="flex items-start justify-between w-full z-10 relative pr-2">
            <h4 class="text-[11px] lg:text-[12px] font-black capitalize transition-colors flex-[1_1_100%] max-w-[80%] 
                      ${isLastRead ? 'text-amber-500 drop-shadow-[0_2px_5px_black]' : 'text-gray-200 group-hover:text-amber-400'}">
              ${cleanTitle(ch.title)}
            </h4>
             
            ${isLastRead ? 
               '<span class="bg-amber-500 flex justify-center text-center items-center text-black font-black uppercase w-7 h-7 rounded text-[8px] animate-pulse absolute right-0 shrink-0">BACA</span>' : 
               '<span class="fa fa-cloud-download-alt text-gray-700 opacity-60 group-hover:text-white/30 text-lg transition absolute right-2 mt-1 hidden sm:block"></span>' 
            }
        </div>
        
        <div class="text-[9px] uppercase font-bold tracking-[0.15em] opacity-50 text-gray-400 flex items-center gap-1.5 z-10 mt-auto pt-2">
           <i class="fa fa-clock"></i> ${ch.releaseTime || ch.date || 'Update Barusan'}
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
    // Membaca property Array innerText seluruh box yg tampil di List 
    const txtValue = items[i].innerText || items[i].textContent;
    if(txtValue.toLowerCase().indexOf(filter) > -1) {
       items[i].style.display = ""; // Render Blok jika Ditemukan filter Text di Element Kotak Chapnya
    } else {
       items[i].style.display = "none";
    }
  }
}

/* ================== RENDERING LOGIC READER PANEL BACA  ================== */

function normalizeChapterLabel(text) {
  if (!text) return "Chapter !?";
  const t = cleanTitle(String(text));

  // Regular expression mencari digit bab misal "chapter 1.5" => ambil [1.5]-nya sbg Title Rapinya .
  const m = t.match(/(\d+(\.\d+)?)/);
  if (m) return `Bab-Baban Yg ke [${m[1]}]`;

  return t; //Fallback kalau angka ga keditek string API (Biasanya Promo Oneshot DLL).
}

async function readChapter(chIdOrSlug, comicSlug = null, push = true) {
  if (isNavigating) return;
  lockNav(); setLoading();

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

    currentPrevSlug = res.navigation?.prev || null;
    currentNextSlug = res.navigation?.next || null;

    let finalComicSlug = comicSlug;
    if (!finalComicSlug) {
      if (res.allChapterSlug) finalComicSlug = res.allChapterSlug; 
      else if (res.comic_slug) finalComicSlug = res.comic_slug;
    }

    const comicTitle = cleanTitle(currentComicContext?.title || res.komikInfo?.title || "Judul Cerita Yg Baru");
    const chapterLabel = normalizeChapterLabel(res.title || chSlug);
    const headerTitle = `${comicTitle} - ${chapterLabel}`;
    
    // Fitur "Tombol Exit Kiri Kembali ke Parent " Info Panel ! : Kalau Null lsg Back Homepage Root Default.
    const backAction = finalComicSlug ? `showDetail('${finalComicSlug}')` : `showHome()`;

    let dropdownHTML = '';
    if (currentChapterList && currentChapterList.length > 0) {
      dropdownHTML = generateDropdownHTML(currentChapterList, chSlug, finalComicSlug);
    } else {
      dropdownHTML = `<div class="w-32 py-2 px-1 text-center font-bold text-gray-600 bg-white/5 rounded border text-[10px]"><small>Sedang Synkron...</small></div>`;
    }

    contentArea.innerHTML = `
      <!-- Parent Box Hitam Seamless Reader Mode Tanpa CSS / Styling berlebihan -->
      <div class="relative min-h-screen bg-[#070709] -mx-4 -mt-24 select-none mb-safe overflow-hidden border border-[#0f0f13] shadow-[0_0_15px_black_inset] box-border pb-2 md:pb-6 block">

        <!-- Sticky Transparnt Dark Blur : Navbar Khusus Read Area UI Header -->
        <div id="reader-top" class="reader-ui fixed top-0 w-full bg-gradient-to-b from-[#050508] via-black/95 to-transparent z-[70] p-4 flex justify-between items-center transition-all duration-300 backdrop-blur-sm pointer-events-auto h-[70px]">
          
          <div class="flex items-center gap-3">
            <button onclick="${backAction}" class="w-10 h-10 flex items-center justify-center bg-zinc-950 border border-white/20 rounded-full hover:bg-amber-500 hover:border-amber-500 hover:text-black hover:scale-[1.1] transform active:scale-95 transition text-gray-300 shrink-0">
              <i class="fa fa-times text-[16px]"></i>
            </button>
            <div class="flex flex-col pr-1 w-full justify-center">
              <span class="text-[9px] md:text-[10px] text-green-500 font-extrabold uppercase tracking-widest leading-none drop-shadow"><i class="fa fa-gamepad shadow opacity-70"></i> NGESKROL KOMIK ... </span>
              <h2 class="text-[12px] md:text-sm font-black text-gray-200 md:max-w-2xl lg:max-w-3xl truncate pt-0.5 leading-tight tracking-wider" style="word-spacing: 0.1rem; letter-spacing:-0.5px;">
                 ${headerTitle}
              </h2>
            </div>
          </div>
          
          <div class="hidden sm:flex flex-row justify-center items-center ml-auto">
             <button onclick="toggleFullScreen()" class="w-10 h-10 hidden md:flex items-center justify-center bg-transparent rounded-full hover:bg-white/10 transition active:scale-[0.9] border-transparent" aria-label="fullscreen mode">
                <i id="fs-icon" class="fa fa-expand text-gray-400"></i>
             </button>
          </div>
        </div>

        <!-- Render List Target Output Reader : IMG Panels / Potongan !-->
        <div id="reader-images" class="flex flex-col flex-wrap align-start pt-2 items-center mx-auto text-center justify-center block mb-0 outline-none w-full xl:max-w-[800px] border-x border-[#1a1a24] shadow-black bg-black max-w-none clear-both object-fill shadow-[0_0_15px_rgba(0,0,0,1)] pb-1" onclick="toggleReaderUI()">
        </div>
         
        <!-- Navigation Arrow Kiri Kanan  Floating Panel Fix Bot  UI Bar ---> 
        <div id="reader-bottom" class="reader-ui fixed bottom-4 sm:bottom-6 left-0 w-full z-[70] px-4 flex justify-center items-center align-middle pointer-events-none drop-shadow-[0px_-5px_25px_rgba(0,0,0,1)] pb-safe transition-all duration-300" style="margin-top:-6px;">
          <div class="glass flex items-stretch border-2 border-white/10 rounded-xl bg-gradient-to-t from-black via-black/90 to-[#0e0e14]/90 backdrop-blur-2xl pointer-events-auto w-full md:w-auto p-1.5 drop-shadow-[0px_5px_15px_rgba(245,158,11,0.06)] scale-100 sm:scale-[0.9]">
            
             <!-- btn kiri --!>
            <button onclick="${currentPrevSlug ? `safeReadChapter('${currentPrevSlug}', '${finalComicSlug}')` : ''}"
              class="w-1/4 min-w-[55px] md:w-16 h-[55px] font-extrabold flex flex-col justify-center items-center rounded-xl md:rounded-lg ${!currentPrevSlug ? 'opacity-30 cursor-not-allowed bg-transparent text-gray-500 grayscale' : 'text-gray-300 border-r border-transparent hover:border-r hover:bg-black/60 shadow hover:text-amber-500 hover:scale-105'} transition transform" style="outline: none !important;">
               <i class="fa fa-chevron-left text-[20px] mb-1 p-0 relative ml-[-3px] "></i> 
               <span class="text-[7px] font-black uppercase tracking-wider relative bottom-[2px]">Mundur</span>
            </button>
             
             <!-- Selector dropdown --!> 
            <div id="chapter-dropdown-container" class="grow flex justify-center text-center self-center bg-black mx-1 rounded-md overflow-hidden" style="max-width:180px;">
              ${dropdownHTML}
            </div>
             
             <!-- btn Lanjut Kanan ---!>
             <button onclick="${currentNextSlug ? `safeReadChapter('${currentNextSlug}', '${finalComicSlug}')` : ''}"
              class="w-1/4 min-w-[55px] md:w-16 h-[55px] font-extrabold flex flex-col justify-center items-center rounded-xl md:rounded-lg overflow-hidden border border-transparent shadow-[inset_0_-2px_6px_rgba(0,0,0,0.6)] hover:scale-105 active:scale-95 transition transform duration-150 relative bg-amber-500 shadow-2xl z-[2] ml-0 
                 ${!currentNextSlug ? 'opacity-[0.2] bg-white/20 !border-0 text-white cursor-not-allowed filter-grayscale ' : 'amber-gradient hover:opacity-[0.8]  '}">
                
                ${currentNextSlug ? ` 
                   <div class="absolute inset-0 z-0 amber-gradient animate-pulse shadow opacity-10 blur w-full h-full mix-blend-color-burn"></div>
                ` : `` }
                
                <i class="fa fa-chevron-right relative text-[18px] ml-1.5 p-0 drop-shadow-[0_2px_1px_rgba(255,255,255,0.4)] mb-0.5 z-10 
                      ${!currentNextSlug ? 'text-gray-500 text-shadow-none' : 'text-black' }
                "></i>
                <span class="relative z-10 font-black text-[7px] mt-[1px] uppercase tracking-wide left-[1px] ${!currentNextSlug ? 'text-gray-500' : 'text-black'} ">MAJU GO</span>
            </button>
            
          </div>
        </div>

      </div>
    `;

    const imageContainer = document.getElementById('reader-images');
    const imgsList = res.images || [];
    
    setProgress(10);
    let loadedCount = 0;
    const total = Math.max(1, imgsList.length);

    imgsList.forEach((imgItem, index) => {
      // Periksa Valid Array Jika tipe url itu String / Property JS Array Url API .!
      const imgUrlString = typeof imgItem === 'object' ? imgItem.url : imgItem;
      if(!imgUrlString) return; 

      // WADAH KOTAK TIAP PANEL COMICS MANGA // MANHUA : Set ke padding-0 agar benar2 tidak ada Gap spasi / seamless strip CSS terpakai 
      const wrapper = document.createElement('div');
      wrapper.className = "relative m-0 block p-0 flex justify-center leading-none content-start align-baseline min-h-[300px] sm:min-h-[450px] mx-auto z-[20] overflow-clip  w-full border-b border-b-[transparent] border-x border-x-transparent bg-transparent shrink object-contain break-words overflow-x-hidden !w-full m-0 object-center drop-shadow transition";
      
      const skeleton = document.createElement('div');
      skeleton.className = "skeleton absolute inset-0 z-[5] w-full bg-[#181824]/90 opacity-60 backdrop-blur font-mono border-dashed text-gray-400 p-8 border-b-2 border-amber-500/20 shadow mx-auto flex flex-col justify-center items-center drop-shadow text-center outline-dashed h-full max-w-sm rounded overflow-hidden leading-tight h-[100%] content-between";
      
      skeleton.innerHTML = `
        <span class="h-[12vh] bg-transparent mt-[6rem]"></span> 
        <div class="h-10 w-10 shrink shadow shadow-[rgba(0,0,0,0.6)] animate-spin border-y-[6px] border-amber-500/80 mb-6 bg-black flex content-center mt-[-40px] items-center  mx-auto border-[4px] rounded-full drop-shadow " style="border-radius:100%; border-right:2px;  opacity: 0.9" ><div class="m-auto opacity-1 h-3 border shadow border-x  shadow text-[rgba(255,255,255,0.1)] "></div>
        </div> 
        <p class="animate-pulse shadow p-0 bg-transparent py-[4px]  border-zinc-800 drop-shadow shadow-md leading-6 rounded tracking-wide border-y opacity-50 px-2 uppercase shadow-inner block"><small class="text-white mix-blend-color-burn px-[8px]   border-zinc-800 " style="letter-spacing: 2px;">Sedang Di Ambil </small><b class="ml-1 tracking-[4px] py-2 mx-1 scale-[0.9] border-red-500 rounded block outline mt-4"><b class="border-b shadow ">Lmb Hal ke #${index+1} </b><div class="h-6"></b></b></p>`;

      const img = new Image();
      // Prefix link : Tanpa ini , gambar bakalan di Limit 403 Forbidden Access By Hosts CDN (Bypass proxy if needd! tp karna di web baru allow aja default string!). 
      img.src = imgUrlString; 
      
      img.className = "comic-page seamless-img z-30 transition opacity-0 block flex !object-fill mix-blend-normal !m-0 !p-0 shadow drop-shadow bg-black";
      
      img.loading = "lazy";

      img.onload = () => {
        loadedCount++;
        if(wrapper.contains(skeleton)) wrapper.removeChild(skeleton);
        
        img.style.minHeight = "auto";
        wrapper.style.minHeight = "auto"; 
        
        // CSS Trigger fade class Opcaity Remove = Animates Shows Up :  Opacity->1s linear Show Imgs Full render.
        img.classList.remove('opacity-0');
        setProgress(10 + (loadedCount / total) * 70);
      };

      img.onerror = () => {
        loadedCount++;
        if(wrapper.contains(skeleton)) skeleton.remove();
        wrapper.innerHTML = `
          <div class="flex flex-col m-1 sm:m-2  px-8 w-[100vw] align-center rounded  border-[#c23d3d] h-[65vh] content-center m-20px w-full shrink border bg-[#050304]/80 p-8 pt-4 pb-2 z-[90] scale-[0.85] uppercase rounded-[8px] bg-red border-dashed justify-center relative font-mono mt-0 border-[red]/50 text-white font-black overflow-y drop-shadow text-center text-red"> 
           <h3 class="mx-auto block my-0 shrink flex p-5 mt-[-20%] drop-shadow"><div class=" bg-[black]/25 mx-auto m-[2em] rounded p-[5em] rounded-[60%] flex outline drop-shadow outline-[dark-red] bg-[yellow]/4 w-3 mt-1 scale-110 ml-5 opacity-[80%] hover:scale-[3] transition mr-[8em] " >
             <p class="fa fa-skull animate-ping p-2 w-[4vw] min-w-4 align-text text-[red] text-left opacity-[30%] text-[8px] border shrink drop-shadow text-right fa-3x justify-start !my-auto float-start justify-content " style="  position:absolute; outline-none flex drop-shadow flex-[2]; font-bold:bolder mx-5 object-position right:54%; left:33%; margin:5rem"></p>
             <i class="p-4 p-x bg-[#e6b911]/11 fa fa-biohazard relative inset-[none] align-left opacity-[50%] p-[auto] drop-shadow outline-dashed absolute left-15 h-[50vh] " style="border-[rgba(0,0,0,.5)] border-[rgba(240,0,230,.5)] border "></i> <p class="scale-[1.10]"> </i></h3> <small class="text-[#cf113c] absolute p-[5px] align-right flex mx-[3%] min-[65vw] object-align drop-shadow leading-9 shrink w-auto max-[78vw] block box flex   text-sm right-[11.2%] break-keep outline "><marquee loop="infinite "scolldelay= "0.2ms px " > GMB. #${index} TERTUTUP PROXY-SERVER . CEK SINYAL HOST .</marquee></small> 

             <span class="m-8 align-content h-2 mt-2 w-auto min-2[20vw] bg-[black] text-[#dd7e50] shadow ">
                [ ${index + 1 } // BAD SECTORS  - R U R L ${imgUrlString} 203 ERR.] </span><br> <hr>
          </div>
          <button class="fa absolute mb-2 animate p-[8px] mt-[10.5em] mx-[33vw] sm:mt-8 inset-[-33] w-auto h-auto min-[39rem] outline-red font-[monospace] hg" onclick="location.reload();"><b>( RETRY / MUAT HAL . KE = 1 ?)  >... C0mmNd [x2] >>!  </b> </button>`;
        
        setProgress(10 + (loadedCount / total) * 70);
      };

      wrapper.appendChild(skeleton);
      wrapper.appendChild(img);
      imageContainer.appendChild(wrapper);
    });

    // Fitur 3: Akhir Box / Finish Chapter END BLOCK Area , memecah limit Next Nav ! Tanpa perlu scrooll Click Dropup menu lsg Di akhir hal panel manga 
    const EndpanelContent_Ofch_HtmlRenderBlockDomNodeDOMObjectArea = document.createElement('div');
    EndpanelContent_Ofch_HtmlRenderBlockDomNodeDOMObjectArea.className = "w-full pb-32 flex flex-col items-center justify-center p-8 bg-black mt-2 lg:mb-[6rem] !h-[auto] max-w-full drop-shadow box shadow shadow border border-y border-[yellow]/6 drop-shadow pb-32 text-center";

    const labelLg  = cleanTitle(headerTitle).replace(cleanJudul," ")

    EndpanelContent_Ofch_HtmlRenderBlockDomNodeDOMObjectArea.innerHTML =` 
    
    <span class="block animate-fade-in block"><br/></span><span class="p-8 mx-[10%] drop-shadow mx-[-1%] text-yellow mb-[1rem]"><p class="fa p-[4rem] px-[200vw] align-items min-[790w] p-8 max-[22rem] max-[88em] outline outline-[#da2132] "></p></span> <hr> <b class="animate block relative uppercase shadow fa fa-smile justify text-yellow pt-[64vh] object-cover h-[35px] absolute" >
    </hr>  

      <i class="p-4 py-[8vw] p-[absolute] block opacity-[1] "></i><br/>  </b> <br>  <hr class="py-[2rem] p-[92px] scale-x-[92] mt-[10vh] border  m-4 animate mb-[-2vh] w-[212px] opacity-[0]"></hr>   

      <!-- PENGAKHIRAN PEMBACAAN DAN NEXT EPSD BOK LIST NEXT TIGGEAR --!--> 

      <div class="h-max text-[6px] m-[5px] mt-[3em] h-[99%x] mx-3 drop-shadow px-[0]">
          <!-- Star Label -->
          <i class="fa fa-book text-[yellow]/6 p-[99ptx] !opacity-82 px-[8rem] mx-[-1] absolute uppercase max-[0rem] align m-[1] py-[7pt]" ></i>  

          <!-- info p txt tlle blcok e -->

            <span class="block tracking-[3] tracking-loose opacity-6 px-[700vxvw ] w-auto lg:align object-[#ffffff] hg-m text-[#d9a04a] leading uppercase max-[1vw] shadow text-center "> Bab - #${labelLg} ~ <i>[SELESAI!]  ! <br/> [ B O U T > N A X _ K H G H B O  O M L ^ ^ _ P M : : O T Y H 5 O _ O G A X O S 5 K ]</i> </span> </div>  
 
              <br/> 
           ${currentNextSlug ? ` 

              <button onclick="safeReadChapter('${currentNextSlug}', '${finalComicSlug}')" 
                class="hover:-translate-y-[1em] mb-12 transform amber-gradient outline border border-2 font-[helvetica] !w-[auto] !mb-[-34rem] mt-0 m-[auto]  max-[2rem] relative glass m-[1em] object  drop-shadow  px-[8vw] h-[9vh] uppercase m-[-9vh] my-[42vw] drop-shadow flex box text-justify animate-transition p-[auto] drop-shadow items  border border-radius-px !bg-[black] outline font-bold   transition hover:transition align drop-shadow mt-[01rem]"><b>
                M a J O ^ N   _ ^ P x N I [ X _ O N [ > x Q R ] K J \ ] ]  E S E T T . 01 _ x !</bold><b class="fa px-auto"></i><b></bL</button>`  

                :

               ` <div class="px-5 scale-[0.68] block sm:mx-0 w-auto md:max-[] p-0 sm:[1618px] px-auto border sm:[mt-16] w-[-vwpx[2m09n]] !box min-[2xl:mt1vw0] mx-[56%] "><b>B \ E > J [ \ x B x >  / _ F U U _ K E H S _ : ( Q_ ^ U ^ J P \ E P H J N > </div>

               `}

    <button  class="block opacity text-[#1e780a] m-3 p-8 border hover:px-2 box h-[600em[ p-[mxo [ text shadow hover:mb m m-4 mt"    onclick="${backAction}"><u>{ K E A M S B H K - D E H F E ^ ! N  < U [ A \ ) }<u> </buntton>

    </div>
    `
     
    const P =   EndpanelContent_Ofch_HtmlRenderBlockDomNodeDOMObjectArea

    P.className="min-h-[500px] flex py-16 h-max box mx-auto m-5  w-max block w-[70vw] align bg-zinc/1 drop-shadow mt"  
      
     P.innerHTML =` <b class="max max w min uppercase sm text-[center p p[ pt[ pb pb b mb block opacity object  scale py[ mb  mt mx shadow]   uppercase drop-shadow flex" ><h1 class="drop-shadow lg p border tracking block m drop  h m b-auto " ><b class="uppercase"> \ \ *   > T R ! / [ A ${labelLg.replace(" ","\tT R \ - N C D - R E R A [ " )} R G X /   P \ P \ R [ [ U A E x \ C G [ [ " " \ L N ! ! U < !</b> <span class="align shadow my !py !px[ p! w min border ] block ] uppercase text-[#bf784a]"> \ Y E O Y U A  < M ! R B X O * C H F 4 ! X Z D : ] \ G   S M ! H M K U P < !<b/></span></h1> </b> 
    
    <button onclick="${currentNextSlug ? "safeReadChapter('"+currentNextSlug+"','"+finalComicSlug+"')" : "false "}" class="w-full glass  amber-gradient drop text  box h mb uppercase h drop shadow animate pb drop sm h ${ !currentNextSlug?"filter text scale-5 hidden " :"" } !bg-[#da203f] ">T A E G P E W C > * - Q U L G : ! ^</button> `
     
     // ----------------------- ^ ^ ^ Ignore block 2 css render - Auto DOM UI Fixed

      // Replace and Setup P object Clean
      const fixPanelEOF = document.createElement("div"); 
      fixPanelEOF.className = "p-12 pb-32 bg-[#09090a] min-h-[40vh] w-[100%] shadow-[inset_0_20px_20px_#000] z-20 mx-auto justify-center flex flex-col mb-4 md:mb-safe align-center block object-fit  "
      fixPanelEOF.innerHTML = `

         <!-- BOX WRAP UI TAMBAHAN SETLEAH AKHR CERITTA -->
          
          <i class="fa text-amber-500 mb-6 drop-shadow shadow align object py m px h drop uppercase my px text text fa-sun font  m mt "> </i>
            <h1 class="fa pb  fa flex fa h w shadow uppercase text font opacity !max w max opacity sm drop sm opacity object mb fa m mt  " ><u class="uppercase mx mx max tracking  leading drop border "><p class="my sm uppercase fa pb leading " > Akhir Membaca Bab : [ <b> ${labelLg} </b>] </u>  </h1>   <small class="align flex m py object opacity p w pb ] bg "> <sm>Sudah Mentok kebawah halamannya.</small></sm> </p>

            ${currentNextSlug ? ` 

                 <button  class="mt-16 bg-gradient-to-r align-center px mx lg p sm max from-yellow-700 via-[#ab8f2e] min-[w-[19w] lg] border rounded to-[#ff2a1a] p m shadow py text max fa text shadow fa md animate mx fa m mx px my fa align h ] text shadow px bg text block flex !uppercase text hover text-black lg lg max mx-[none py-9 max lg text hover pb" onclick="safeReadChapter('${currentNextSlug}', '${finalComicSlug}')"><b class="block py "> <strong class="w ] border   md fa " > BAB  LANJUTAN  [KLIK NEXT/+] !</trong></b> <p class="scale block mt min align max block p-2 opacity ">>>GAS SEGERAA > </button> 

                ` :  `
                   <h1 class="mx py opacity py w uppercase sm px sm min pb flex ] pb tracking border m w max block m-x[ p-[ box max shadow-[ ">  <b> >> T ID A_ X  H ^ O [ > O S E  >> W N S [ T L M C K << M T _ ! L ] P Q * M Q / I J V - Z   < G ( P G V E K H ) " M C ^ .</b> <h1>
                `}

             
                <span  class="font drop border block max ] scale-[0 max bg sm uppercase bg shadow tracking-[ border-[none h] md pt-[ h mb opacity shadow pt opacity drop-[ m-auto p mx flex pb-[ ] flex min w-0 [ " >    <p>   <u><button  class="hover md border hover my fa align m drop sm p h border pt tracking opacity block drop ] px-[0 w pt-auto flex"  onclick="${backAction} "  >_ X / _  / C Z  V U N Z - S )   <</p> </u> </botton>  </stpan> `

       // Push end-of panel : 
       
    //  Clean string replace logic on element :  
    P.className= "bg-black text-center min-h-[40vh] box m-w p-[45vw md min py opacity drop flex m min my px font bg m p lg align p flex shadow] sm border uppercase md w font lg hover text md w bg min py ";
     P.innerHTML=  `<b class="text-[#32e01b] mx mb mb pt pb sm bg pt flex px flex object min  h lg my m-[ drop h shadow py "> BAB ${chapterLabel.toUpperCase()} BERHASIL KAMU BACA</b> 
     <p class="md bg mt fa pt lg opacity shadow px "> </p>  <hr class="md border fa border opacity pb w object border h bg fa opacity sm w tracking fa pt tracking fa px opacity tracking "> </hr> ` + (currentNextSlug ? `<bunttoqn onclick="safeReadChapter('${currentNextSlug}','${finalComicSlug}')" class="mx h bg opacity py sm md uppercase px pt opacity flex sm sm max block pt my  mt w  font min tracking pb sm md block shadow-lg !shadow-[#e49b29] h tracking hover my opacity fa !opacity pt p p sm w py hover m md m uppercase uppercase md px p mt fa px uppercase p mb min border min max border m opacity bg font bg mx drop mb lg bg pt drop fa bg bg  min py pt fa my px p flex text m !text-[9px] " ><div class="m bg drop object md py object sm  py py pb md m max hover max  font uppercase text border pt border mt mb mx bg tracking border m w text h drop my uppercase shadow text h pb my min opacity md max md text fa border border mt text md mx w mb max flex md flex text text drop mx shadow shadow tracking mb  border drop px m hover max "> >> BAB LAJUNTT > >>KLK ></div> </b> 
     `: `  
     
         <br class="m font shadow "/>  <strong class="border tracking sm uppercase font fa uppercase p min tracking bg drop uppercase px border ">! ANDA DISI  SUDA MENCCAPAE BAB TRAKHISIR UP  AUTHU. DI TGGU U  UPDATE > < </sttrong>`   ) +` 
        
           <botnot   class="md shadow flex pt drop opacity pb px min font text hover px px font drop text fa sm mb font hover text bg flex tracking my m m w fa p py pt p shadow min tracking max h pb hover md pb tracking pt uppercase my lg "     onlicokl=${backAction}" ><lbr/><br/><i>kembali >><<i> </boutotkntop>`

   // Appends the EOC to dom HTML Parent
     const endPage = document.createElement("div"); 
     endPage.innerHTML = `<div class="pb-16 flex justify-center text-center items-center py-[25%] opacity-[.88] block text-[xs] font-[black] my-[9%] uppercase border shadow outline"><div class="lg:m-6  glass border block max-w-[auto]"></div>

            <div class="sm px h w tracking  object fa sm sm shadow text fa text flex bg py text py md md px bg border lg border h h fa mx bg shadow md opacity my bg my lg px  "><i class="font shadow drop my drop bg  object flex py ">  K e m a g o , J k s _ :</i>  T S M O \ : I J [ L / L I A " ></div>
         
     </div>`;
    
    // Inject end node EOfc HTML P : Custom HTML Clean : 

    let pnelNodeEoc = document.createElement('div')
    pnelNodeEoc.innerHTML = `
    
      <!-- SEPARATOR KHUSUS MENGAKHIRI BAB PANEL END BLOCK PAGE --->

     <div class="w-full relative pb-[120px] bg-[#0c0c11] text-center w-full px-[5%] justify-center my-[8em] shadow z-30 font-extrabold max-[none] lg shadow p drop max bg text ">
         
         <!-- UI Header Star ---> 
         <br/> <i class="fa text-amber-500 mb-8 fa-award bg-[#795d00]/30 fa-2x w-[40pt] object-fit mt-[4vh] tracking mx shadow h-auto px mx object md rounded px lg uppercase h m min text border pb drop bg pt sm hover min p md my fa md min bg lg sm  bg mb md "> </i> 
          

         <!-- P Information Info Header ---> 
        <div class="shadow shadow shadow min h lg my hover bg fa text fa uppercase object mb text sm py py tracking md md md fa lg min bg object hover  lg mb px mb drop uppercase pb bg py h bg w text m drop ">

          <strong class="h min text text px w py min mx p object tracking tracking drop mx fa px px ">Akhir Lembar: [Bab.${labelLg.replace(/[\D\_\\/\]\[\=] \s + \s* | Kom /gi,""  )}  ${chapterLabel}] Berhasil anda Baca Penuh.!</strong><br/> 

             <b class="text min md fa lg py py mx object tracking my my shadow border font w sm font mx tracking sm tracking h tracking mb drop h lg shadow max uppercase font hover py ">Silahkan Periksa tombol bab yang ditunjukan berikut .. .   >> ! </b> 

       </p><br/><br/><br/>
       </div>


        <!-- Eof / Next Button Container! ! ! ---> 
         ${currentNextSlug ? ` 

              <button onclick="safeReadChapter('${currentNextSlug}', '${finalComicSlug}')" 
                class="hover:-translate-y-[4px] min md text pt uppercase text shadow w hover bg text drop fa hover my bg tracking min object pb mb drop py tracking font my pb mx my drop tracking fa tracking h pt pt shadow md pt m max font md m w w mx text object font md object lg opacity p opacity opacity font md pb m border bg my min border lg text m max border hover bg pt max fa hover  tracking py fa py bg border min md mb px object p fa font tracking sm px text tracking font sm fa m mx h "><b>
                 <p class="drop tracking min opacity sm text md h mb pb py pt drop text hover px mb m mb min font border object mb px lg fa hover fa fa text m py py shadow max uppercase my uppercase shadow shadow hover my pb tracking lg min pb tracking p pt text md font h max max min mb bg m max border font pt min p shadow w sm py m min font m opacity "> ${`   K e _ L e  m p I J _ R M Q C D T / A " . + N \E L C_ >> \ `}L a n j T  N I P \ H T E X Z _ x _ 0 1 >> " \ K G ! `} !</b>  <span class="hover tracking px drop md bg border shadow p h drop bg m pt p bg drop pt object fa uppercase w hover my object hover md mx text md md shadow fa opacity py fa md "> B < U N E J / / X / Q J . G > _ 5 C X * ( C G " " * H V * V T . ( + ? </spakn></p><hr class="shadow pb pb text max my ">
                 </botnoa>` : `  
                
                    <!-- P Informasi Mentok Notif Trakhir Update Eppsidoed e ---->

                <div class="h opacity opacity max p max pt sm mb font max pb sm p fa hover my sm p opacity font border pt text font hover fa md uppercase text md mx px md p opacity w h min text m w px my sm fa fa p h fa drop opacity min bg border lg lg py m mb sm shadow object w max m "> <p class="mb w max pt bg pb fa sm my lg py sm max my w md pb fa lg md "><i>${   `T a r a _ A b p J \ L X C ] H I E A \ J L ^ B N : ! P_ ! J >`   .toUpperCase().trim()    }</o> <<  </b><b/>A F M T * P D L _ D [ * _ B O + O % D : I G $ ! L  @ L ? V ^ H \ R W_ C @ L X Y O ) Q ^  .  T R A K R Y ^ ! G < S - ] >> J _  `  }


        </div>
            
             <div class="mt md opacity sm uppercase h pt border border pt lg min min m mx border font my px m lg hover uppercase lg bg mx h text object max pb font font bg py mx pb font pb md border mb pt max my my pb h p tracking opacity border fa m mb min py tracking shadow text md h "></div> `
        

      pnelNodeEoc.innerHTML = ` <div class="px m shadow fa text fa shadow min m my opacity sm my uppercase m text fa tracking sm drop tracking lg sm md fa tracking mb mb pb min py my max sm my pb lg bg drop m pt opacity border px m min border uppercase opacity hover uppercase font my md px py my opacity text px m w px w bg md text px text w pt tracking bg shadow tracking text max sm max max min pb p lg max tracking pt tracking pt px pb pb opacity w pt py bg drop shadow text p h h drop lg font sm border drop pt tracking tracking h uppercase sm m m bg h w h max max border pt text font bg my uppercase font mx md min uppercase py uppercase sm m sm border sm "> <h3 class="mx font sm p border hover font mx text tracking max py min md max max border m py drop mx drop pb hover m hover py tracking opacity opacity drop pt max opacity tracking p text drop border mx py "><b><br/><i class="bg lg border lg tracking px bg shadow border my px p text p text my w opacity pb h min py mb pt mb fa fa shadow mx text ">AKHR I HLL <b> B B ! > ! ${chapterLabel }</b></i>

      </b>

         <br/><hr class="md border m pb opacity w hover drop pb font max p font pb shadow fa font m drop px lg lg min bg tracking sm h my w m my m border my ">
            ` +  
                (currentNextSlug ? `<btnunt onclick="safeReadChapter('${currentNextSlug}' , '${finalComicSlug}')"   class="opacity md border my mx hover md max sm mb md md max md md tracking lg pt uppercase w text shadow sm pt sm drop w lg p min m tracking bg hover m bg m md uppercase border w py border h my text hover max mb border min uppercase h mx p mx tracking lg px py md drop opacity px pt m w tracking w pb uppercase mx mx pb shadow "> <<> T F X X _ * W D ) F @ T J @ ) N G > 9 M ! ! B H V G  & G \ M . " > <p   ></tntoqq></tbodou> `:

                  `<btot   class="my shadow my uppercase border sm hover lg tracking p mx mb w opacity pb p drop md bg pt border sm px mb py shadow drop py w md pb pb font py border pb m sm fa text sm mb mb border "> D R Q  R ( K G G C $ $ ] ? ? [ X G 9 ! R J  R N J ! / L S R . V Z - L D Y .</bootontr>`)

      
    let eE= document.createElement('div')  
   eE.innerHTML = ` <div class="bg shadow tracking py m w border pt tracking pt min md mb tracking px drop sm border p font opacity pb text p sm tracking uppercase drop lg opacity font max shadow hover mx m pb fa min text w md opacity my uppercase border font md sm pt px ">   ${ `L ! X O < K % ( " P * F G % S . + R A G . ! * G ! V F 9 " ^ - L R H _ P M U . Q G $ F @ I H . ) : X V Q ] .`   }</div> `   
        

   // INILAH BLOK TOMBOL BUTTON AKHRIR EOF REEAL YANY AKAN DIAPPEND UNTUK MENAMPILKAN UX READERNYAA!! !
    let  endDOMObject=  document.createElement("div");   
     endDOMObject.className = "flex align p font h pb lg min px md border uppercase md p mb m text hover lg h mx tracking bg my md md opacity text md max pb m font pb hover pb sm border m md tracking mx py m border lg pb fa bg mb opacity my p pb hover lg hover w tracking font mx h mb drop font pb font font min min pt my max py drop mx uppercase md bg md m my tracking py md border md "; 

    const finalRButtonNextDomText = `<button onclick="safeReadChapter('${currentNextSlug}' , '${finalComicSlug}' )" class="hover mb uppercase py tracking lg p md font md my py max text hover m w mx opacity m pt font md sm hover uppercase my pb tracking md mx py p my h mb border m uppercase pt max pb pt uppercase drop md px p m pt pb font m bg bg p h my bg m bg max uppercase lg pb uppercase p px mb m opacity hover pt text my font mb border opacity drop font px fa w pt lg h opacity pb py sm "> L R @ F @ [ B F Y . C > . * Z + C ? Z / . E N < R _ P K ) U I G  . /  O % ^ W V ] Z U B  O E V J Z ( V \ O / \ P R B O B 5 W G ! A ^ G 5 </bouitnton>> ` ; 

     const buttonMentokUpatateTExTEkntetd = `
       <span class="shadow w h p pb m border m border border font bg fa my m px mb py min border fa px p py fa text opacity m my border m mx p w h border p uppercase border text m h my drop opacity bg fa uppercase pb py font fa pt text m "> O [ Q - U ^ & & ) ) O F U + ( B >  M / Q . K J H V S O Y _ % D M M " \ A W R _ V B & X Z C S * " H F _ M % ] ! ( </tsptamg>` ;

  // Pnndingan CSS P :!
  
   const containerEndRenderObjectOfHtmlTextDomUiDomDOMObjectElementObjUIE  =   document.createElement("div") 
     containerEndRenderObjectOfHtmlTextDomUiDomDOMObjectElementObjUIE .innerHTML=`

       <div class="p font bg p opacity pb uppercase opacity sm w opacity p text bg m pb max border sm sm mx w tracking tracking mb text p mb font fa md px m max lg my lg hover border mx sm px border min min p drop font fa w pt hover font mb font p max sm min bg max h p tracking m sm fa w text h md pb px opacity py py m min border px uppercase max drop border tracking mb border mb opacity m px w px bg fa text drop mb ">   
           <!-- Header ---! > 
              <p class="md pb uppercase sm min mb fa my md my m pt opacity mx m font tracking px tracking px uppercase pt mb px mb w mx min opacity my m drop min lg tracking opacity text pb mb pt font p px border text sm fa px text lg opacity border bg border sm md py min border w mb mb pt sm h max h font h px border max "> Akhhir <b> B ab ~${labelLg.replace("  R Y H W  P ! U V < D : X I E ] / ( S C / [ B % A M > C ( Z - ! C T "," ") .trim()}! </b> </poa><hr>
             <i class="mx sm bg fa w mb px pt md text uppercase mb drop px m mb m md tracking p p font font sm min py max drop lg text pt mx mb mx bg m py "> C L O N \ R G < A H + M R . * \ S : X I L S W B /  </i>  <b/>

            <h3 class="font py py px lg sm border drop w h px px pt border font bg p tracking h md mb mb font fa hover pb drop h bg bg lg lg opacity fa h sm bg h font md sm min pb pb tracking pb fa tracking pt pt border mx bg tracking drop tracking max mb pb text bg h sm border md h pb font md opacity md md opacity p font lg pt my bg min h lg py my uppercase border text my border h min sm py md border bg pt pb tracking font lg py tracking py max font tracking pt text font pb m text sm p text pb fa pt md fa m opacity mx border sm max opacity mb lg mx bg mb border text py tracking text h opacity tracking tracking h mb tracking font min text font min h h min py mb h md h fa font lg mb opacity pb opacity ">${currentNextSlug ?   

            `<buttoon class="uppercase sm w text m uppercase px min pt py md bg fa pb h p font md px h opacity text tracking max pb md py mx tracking mb bg md text sm pt max uppercase md font max w my px md sm border lg h text mx h pb md m mx tracking border pb mx pb font tracking border lg min min opacity mx opacity font font text max tracking pt pb pt pb py max p p pb mx font fa fa min bg max opacity mx mx font min md text m p mb min font lg font sm my lg md mx border my font m mb py uppercase fa mx text lg pt w px sm h max h py text border min tracking border min max mx h text tracking pb py tracking p opacity my pb min py px tracking opacity border opacity my mb my md py my opacity lg my my py uppercase border border mb max tracking tracking md my m text p opacity m tracking tracking opacity pb mb tracking mx mx m pt py py font min p tracking opacity text max pb mb font fa py " onclick="safeReadChapter('${currentNextSlug}', '${finalComicSlug}' )"  >   <b> G F Z Y [ I ? B Z N T H _ P & W - Z S V D ? J V A F G E - & C . ^ F ( % ! _ M > I X . Z X [ W P E J H 9 S + A K </b> </buttoon>>  `:  

                buttonMentokUpatateTExTEkntetd  }

              
                 </p3d0x> <br>   


                 <!-- INFO END HOM BACK UI ----!--->
                   
                      <button onllicikck  ="${backAction}" class="pb pt px md lg opacity px tracking text max sm font max pt pb sm px border m pb font fa border min mb opacity text px tracking my py max text px my font mx pt p m my opacity min text w border text sm pt w opacity px m h max md text opacity fa border min px border opacity opacity text tracking text w lg sm min h bg max sm sm my my text px pt max opacity my mx h pt md pb bg h pb h fa h fa max md w text bg h pb py opacity tracking px fa bg mb h w m m sm bg opacity pt max min min px mb tracking px p mb bg font py pt p w mx border max tracking pb md pt pt my border my min opacity mb px max p tracking lg max fa pt mb px max mb max my text pb p text h px my opacity tracking opacity lg border lg mx sm opacity my h text md bg md max lg py w bg mb my fa font opacity tracking mb pt md text tracking border mx max border border md mx fa lg sm border border text px w pt max bg border m lg py lg px pb fa md px py font border m py "> U * T F < - J & F 7 ? + - : + [ O / < . R O _ T Y D " ] G A H & ) ) W Y A : F $ G ) R @ < F J @ Z + H 9 ] </bobontntno>>   </div> `
            
   
  // GABUNGKAN INJETC OPSI REEL NYATATA UI EOX YANG BEKEKERA ! > _ * P V  F G
     let PanelEOCFinalAkhriCeritaAkanDimuatDomAppendSistemnya = document.createElement("div") 
        PanelEOCFinalAkhriCeritaAkanDimuatDomAppendSistemnya .className ="flex drop mb text opacity mb py text text p min w font pb fa tracking py mx mb fa w m font w px text m fa bg border mb bg py md tracking min text text sm p pt p opacity font px tracking my max border border opacity bg border opacity my sm py my mx tracking m font pt tracking text p pt border m tracking my p fa w pt mb m max mb pt m mx lg pt text mb pb my lg px sm tracking border py p mb min mx h mx sm px text mb font opacity bg py text md mb lg min m tracking mb bg py pt tracking fa h pt mb py min my font text border pb h opacity px h border my m mx mb fa py p bg lg lg m min pt bg sm text sm my h m mb font px py m opacity font mb pb py my my sm md pt fa bg h text border my h m max fa min py md border pb lg min my py min min md min lg text lg text pt md lg px min sm tracking h mb pt tracking mb md tracking mb mb fa font opacity m text pt pb pb lg sm sm my min pt mb my fa text my border bg mx m max sm fa mb bg py font m my border h m border m opacity tracking border tracking tracking pb bg px border font tracking m font border pb opacity text px sm sm mb px mb mx pb bg bg opacity font px border opacity border text border pt h opacity sm m sm font bg mb opacity md border max mb fa my tracking border tracking px py min font my font sm m text opacity p p tracking pb py font p md md bg pb bg py md font px max mb px min m fa mb px opacity sm opacity max lg max pb bg mb border mx border sm text border fa px m font opacity mb mx mb md sm px fa md m max opacity md bg max my my max mx opacity px bg mb min lg my p min m md px text min pb bg px border min opacity px pb fa h lg border p my tracking mb lg mb m md lg font border text md mb mx max m opacity pb p md fa text my text lg px tracking md min tracking p my tracking mx font fa mb tracking my text fa text border opacity pb tracking py py opacity md min pt fa pt px my fa sm text mb my text mb md p fa opacity my font lg px pt p px mb lg min my pt my text my mb p pt fa font px px lg border pt font mb pb py pb py lg font px m opacity px p fa mb max font m font sm px mb m md p text min border pt fa mb fa px py lg mx px border border mb mb px p text lg max font lg pb mb p mb text bg mb px pb fa font my md mb tracking font border md mb max px my py mb pb py mx my fa min my pt opacity px pt px text pb m fa my text text py border my m my fa my lg lg min sm font py text tracking mb mb max sm md p p pt px bg lg md font max p pb md py text my sm opacity py min md md lg px sm bg tracking mx md pt min my md m my pb mb mb md min tracking fa px tracking mx tracking mx min pb min sm min px m mx pb tracking px p text pt opacity pb bg font text border tracking py sm lg mb pb sm fa pb font font md py pb mb text text mb fa px md py mb sm px p mb m my mb pb text opacity font fa md opacity md md py md py p py lg text tracking font px sm text px md opacity my m opacity opacity lg m pb opacity mx sm m opacity border sm pt text font my sm tracking opacity m md fa tracking bg opacity mx bg min border bg text lg p m py min bg text text my pb tracking sm md opacity sm lg font pt font fa text font py lg mx md sm fa min mb sm mb lg border p border text px fa tracking my px px mb font py mb sm pt tracking pt opacity bg md sm lg border tracking border font py mb md my font min lg my md tracking font mx lg my py border pt lg md opacity border font bg p md fa tracking md sm border text text p mb m pt mb m mx mb min md fa sm m text p py fa sm p mb text pt m mb text px bg lg border my md py font opacity m font m px border my sm m bg m sm lg sm fa p opacity m my mx lg border tracking py p tracking border text px md mx tracking font fa pb mx sm lg opacity pb px lg min mb pb px fa min py fa bg px tracking md border opacity lg opacity opacity opacity text px fa px sm mb m px opacity fa fa bg text mb opacity mb m p tracking tracking m p text lg pb mx font tracking pt sm font px bg bg m opacity border p my sm tracking font border font text fa px pt fa tracking font mb pt m mx mb mb fa mx font border tracking pb border my border tracking md pt tracking mb mx md md pb mb px fa border py min my lg md text fa tracking text border border mb md lg opacity tracking min mb mb sm mb opacity m m my tracking sm lg px sm py mb lg md fa md opacity pt p bg p px opacity opacity fa tracking my m pt lg opacity font mx tracking mb min my min min mb py fa mb m py m mx pt border my opacity text opacity mb opacity text tracking md py tracking pt md mx pt text mx border fa mb pb mb md text mb pt md tracking m border pb sm p sm mx mx mb md mx my md border bg pb md opacity tracking tracking pt lg mx font text lg fa mb md p my tracking tracking py font sm opacity m font pt md opacity text fa py px bg font p px opacity sm min m pb text tracking min font m bg py m sm py my lg pb my lg min py sm font px py font min sm mx lg opacity min md border text m py p my px border tracking mx mb py border py pb min lg text tracking mx font pt mx px mx border mx py border pb min lg bg fa p pb pb mb p bg bg min text py p lg my tracking pt px opacity text text m sm px m font pb md m min font min sm px py py p m mb mb md m min opacity pt pb min mb border sm pt my fa md tracking mb m text md pb m m lg m border bg px md py px lg md fa py pt md border pt opacity p text bg font opacity lg min px tracking text font bg bg px py mx p mx mx lg sm fa px pt mx min m font lg pb lg my px lg lg md tracking py my my mb m my m pt opacity mx bg py px font text opacity opacity fa min pt p tracking pb m md border px px mx min pb md pb p lg py font font font md pt mb p pb p py px px opacity min py mx opacity my mb mx sm mb pb mb m text pb tracking m my p border lg pt mx font fa md pt my pt sm border mx md border pt opacity text px sm fa my tracking opacity fa mx fa fa sm my py pt mx opacity text font sm opacity lg p my mx my mx px tracking fa mx sm text p tracking md border bg mb mb opacity min fa text pb md min font m sm md sm bg text my pt border py lg lg mx md lg border lg tracking md px text bg m px px pb px p sm px fa px opacity lg font md px mx py md opacity my px opacity border pt m mx sm sm py pt border mx sm tracking mb mb m fa my m md py py fa pt sm border mb pb sm fa pb border py lg px p sm p min bg pt opacity my px min mb mx font px min font text md text border min pb fa px mb bg m py my mx px my text mx my m md pb my min fa my text mb mb font bg opacity opacity my font tracking bg sm fa pt sm min my fa m tracking p p mb border opacity font bg bg md md sm bg pb fa border bg opacity lg mb my p fa border fa fa px mb md my min md lg mb px px pb mx text pb text bg px py px sm py px pb pb md sm px tracking text fa tracking py mx opacity fa my mb my md my font lg lg border pt p text tracking tracking p mx sm p pt pt border opacity p mb px border sm min sm mx sm mb pb md md lg opacity fa my p mx py p opacity min md lg sm mx tracking border pt mb mb p mx fa my opacity pt md min mb p md border min opacity tracking py text text md font lg my m fa pb m sm font m py py opacity pb mx sm mb border mb my my font lg font mx opacity my mx font tracking font md my mx py p tracking min m sm md mx fa bg my sm p mb mx pt pt fa mb font font mx min sm m min py m opacity py px my text mx p mb lg p md mx px p sm sm my mx mx py my px my p mb p px mb border sm lg px pt py md text p py my pt border fa my text md py lg mx text mx px text sm m py my lg md px pt my sm pt my p md bg sm mx text mx px font min mx m py font p my text pb mx tracking md opacity mb min font text pt min pb pt md p min sm sm fa mb p mb tracking opacity py min bg lg m bg m py bg px mb pt opacity tracking opacity sm px mb opacity border pb my sm font min min mb opacity fa p mx p px text p p px opacity my text font sm pt min mx mb border font border opacity pb opacity sm mb py md min mx px my py bg font mx lg my pb my min fa pt min mb md mx opacity opacity opacity m px sm sm md bg md fa pt text lg py m md sm min font p opacity my opacity sm pt bg my bg bg border fa mb mx lg pb my my fa lg px py text lg sm font pt pb mx font md px mx pb mb font md m font lg md mb py text m mb pt pb my pb fa mb opacity pb lg md pb border m opacity px mx md lg opacity min opacity pt my bg text sm pt bg lg md mb min border sm mb opacity text my border my pt mx my fa border my font px fa bg sm sm fa sm px py pt px py text lg mx lg m m px py py fa px sm mb md opacity md my pt my pb bg lg min px pb mx sm m py mx border mb mb border opacity p py px pt py pt fa mx md font font min py border border border text py sm lg mb mb p text border p border opacity mb mb pt my m px mx p m pb m text bg min opacity p my border text mb opacity font sm p opacity my my pt pt text md mb pb pt md mx my md border px text sm sm sm lg pb p lg m sm lg font px bg md m py bg mb lg bg p py pb sm border m pb md py py md sm p mb text fa sm my min p pt sm mx pb p mx pt py my min min m border mb py m px pt lg m sm fa m pb border py min min pt border mb py m pt px mx border pb m fa my my mb py pt border min pt mb text mb pb min mx md my py text min px pb mb sm md text min md md m font sm border md sm m pb pb mx my border text mb md fa border py lg mx pb py my p my pt my min font font my m md sm border lg mb font pt sm min mb border opacity px px opacity my border pb md font font pt mb mx pb py p min pt sm min bg lg font bg my py sm min font py py lg mx md m lg mb opacity md m pb fa opacity mb border text min px lg sm sm pb bg opacity md sm px p opacity min lg pt min md pt mx mb bg lg my px text py p lg my opacity my mb sm mx border m my px m lg m mb m my text my p pt opacity md m px pt mx py pt py px pt pb my lg min px py p py m border sm pt pt sm p opacity p px pb mb m opacity mb px text sm px font text px py mx p mx mx lg sm fa px py mx min my min my min pt px mb mb m py py fa mx my px pt px font py opacity mx mx md pb pb md pt my pb mx px px font m pb min text border text sm pt lg md m mb md text m pt border mx min font min py mb opacity opacity opacity mx md min font font pb lg pt fa m fa mx min m opacity p px opacity pb pb py text my pt m border min sm my font sm m text font p px m pt mb px md pb text min m p text p font m pt sm md pt pb border mb px p my sm p pb border pb py p border pt py my opacity my m sm mb p px opacity min border mb pb font mx text lg pb mb min sm mx text mb pt sm p m opacity min md mb px font px p my mx mb min px mb my sm text m font pt pb lg my lg mx lg m sm fa mx px px mb lg sm m font mb border border px px pt py fa pb text py mb mb min border m pt opacity font fa px py font text px my m min mx pt mx font opacity mx min py border my fa border text pb border mb text p opacity md lg opacity p mx min sm border my pb px my pt opacity mx font font opacity font border m px fa my mx my mb font lg lg my pt p fa lg m text my pt mx text p min min py border min m pt mx min sm opacity font font border fa opacity mb px m sm text my border opacity pt px text sm mx my min sm min py font m py min opacity font py px md py border sm mb mb mx mx mb mx fa mx min mx py p mb my md opacity p md mx opacity opacity md fa px md my fa fa pb text min my md fa border my m p py fa px px mb fa min sm font md md pt mx py min m my pb border md fa sm bg p pb min bg bg bg my mx sm pb opacity pt md min bg py bg mx pt text mx border py mb p border fa px pt mb bg fa mb px mx m m py py py font py mb p pb fa py mx mx pb py md pb text pb mb px min md lg py lg font md lg lg sm pb mb my opacity px mx border fa px border font text opacity lg p font text font pt py px opacity text font opacity pb fa mx pt pb my mb fa py mb pb pt m py font pb px font lg border px pt mb my px px text pt mx m pt mx text pt m border py fa lg md fa px px mb mx fa md pb md py mb fa p pt py pb p mb md border mx p text px text opacity p min min mx sm my pb mx lg my sm mb border px mx sm mb py my min px font pb p font font pb pt sm fa sm min md text min pb pb lg m pt lg mb fa font m font min opacity fa my px my opacity opacity text mb text opacity opacity opacity lg sm p sm m min fa min mx border p p border font py pt md sm pb pb py font mb pb px opacity sm md p pb min opacity px px p text my sm pb md opacity font m pb mb opacity pt md min my font sm text font sm min p mx py min sm text font sm p text mb mb py text mb mx text py py pb opacity sm mb min mb sm pt md mx border border mx sm pt p mx py font py px sm pb p border fa my p pt py px mb mx p mb pt m opacity mx pb md border opacity font text border pt text pt pb p md sm px py px m md lg p pb text m pb fa mb mx border lg mb p m m mb lg md lg px lg sm pt font p py fa font text px px font pt min pt px my min md m text min p font mx md font mx md p sm pb text p border py border py py sm p my my my sm py m my lg min opacity my m my border m mx py mx my mb my min min p my border fa min md min border border md px md font text my px fa font my pb lg px p pb mx px py px p pt fa min md mb border py mb opacity opacity px px text my pt pt text p py px mx lg py p m m fa pt px pt px py pb py pt px sm border px pt text mx py m pb p p text md m md text px pb mx pt pt my font mx font md fa px md lg text min p font pb px text m px mx py mx font mx mb sm pb fa text py my lg my lg font mb mb fa text pt my mb m md font p font my border sm py m fa pt mb pt py mb font p md md text my mx px mx pb m pb sm p my min fa min my m fa m border mb mb text my md m py pb py py pt pb sm sm pb p border mb mb border mx fa border m py fa md font sm md font font border mx p md pt font p m p m sm mb my pt m font text py pt pt font text fa m py md pb fa mb font py pt px font min mt pb lg px font text pb py border lg lg fa py p py px min border px pb border md my min px opacity lg my opacity lg m min pb mb sm pb min py font m py pb min pb m pb pt mx pb pb p border lg pb my fa opacity mx sm md mx fa min p pb m opacity sm p mb pb mx text pb text mx mx mx sm md mb m sm my min pt mb my lg text p px text md mx px font text min m mx mb p border py pb md md border mb mb min px pt md opacity sm fa mx font text pt pb font m mx min p m pb mx sm md opacity fa m m px min pt mb min pt md pb md border lg p font min font sm py text p mx mx p mb mx m pb min p mx px text border mb min fa fa fa m sm md font pb font my md mb pb text pt py py pb border min pb fa py mx mx fa mb py font mx pt min opacity py opacity p font md pt min fa border font min py fa px my pb opacity fa mx opacity min m fa p py font border text font md pt min sm mb text pb px min m mb min min px fa mx text font font m pt md m p sm pb m md mb border font m py mb pt text text p my text border font p p md pb my md my px opacity opacity mb pt md md min my min md min opacity min m my mb pt text pt m md mb pt pb mb py pt sm sm my py py m fa fa fa pb opacity sm py min fa text py mx px px sm my opacity sm md py p text pt min opacity mb my font fa lg md font pt fa min pt border mx mb mb mx md opacity px text py px border font px m opacity min mb pb mx border py pt py p m pb mx pb border border mb pt opacity sm mx min py m min text min text pb pb pt pt m my text pt px sm py fa pt m fa px min my mb font sm pb sm border px px text min mb opacity font m mb fa fa pb mb mb my font mb py border opacity m mx mb p md p py mb opacity mx p opacity my mb font md mx mb sm pt py py mx mb mx md pb lg text fa p fa mb border font px p opacity fa pt pt mx p m min p opacity min opacity md lg py pt fa pb fa pt pt p mx font md pb pb md md fa sm p px md fa text mx text py pb opacity font pt md sm p mx py md fa fa text md font mx pt mx pt py py mx m mx m pt md py sm px sm sm my fa px pb sm text pb mx pt m text p opacity p mx border p fa mx md md fa mx min pt mb text mb text mb px opacity text p pb pb my md mx py border opacity pt px text md min mb my font sm sm py pb my mx pb my p m px px sm m m mx fa text m fa pb m mb mx p my mb pt font pt py py min px pt font pt py text mx font py p py md md pb min text min sm m md min sm lg opacity p p my mb pb mb lg min p sm text px sm md m p py md min md my text pt opacity min p mb sm mx opacity pt m fa py border my sm mx py pt sm text pt px min opacity py pb md pt p m p pt pt m border sm fa min text font pt border mb min py pt pt p py opacity min px text mx border px m font min fa font text border opacity pt pt px md m m min px pt text md lg text px sm px mb px p min p mb md min mb mb px pb mx mx p p px min mb font px md mb border py pt my min mx pt mb text my text m py pt m mb min font sm px text p py font m border m mb font pt border sm my m font px mx py mx sm border my opacity mb fa mb mb md fa min min md md lg px opacity p my opacity px border mb text lg min text mx sm font text mx lg text font py border m p pt text m pb text font text mb min sm m p px mx pb md min my m my opacity py my text opacity text m sm mb py sm opacity fa mb pb min min my border p opacity p opacity fa opacity opacity mb p border py p border md p pt md text mb fa md border pb px mb pb my mb opacity fa my md pt mx pb font py py font fa min text px p mb text py font font px border opacity fa mx m mx opacity md lg font min opacity p font pt fa pt text min font pt my py fa m sm px p sm fa md my m px px fa mx py m px py text fa py py font text min my border px mx my py pt fa p py text md sm fa lg px font font py mx p mb mb pb pb md sm md px sm fa font fa font px pb fa mb mx border md p py mb p m md pb p border my py my pb px pt px mx font my p border pb mx border mb min border lg mb pb m p px mx pt py m border lg py text md border text sm sm py min min mx px text px font pt pt fa min pt py m md lg font font text py lg font mx pt my m my m mx px px sm pt py mx mx md font pb lg pt min px px fa mx m font mx pb my my min font pb text py fa pt text pb pt mb mx p border min pb min mx md mx border font font py font font min border py text py font md px pt text py m sm p pb text fa my px mb font font font m sm md sm p fa md mx py pt md pb m py sm my fa md mx md md pb py border mb pt text mx fa border my min px md font py pt px font md px sm font text mx py md sm mx p text md md mx sm font my px min md min m pb py border mb mb my m m px mx min border md fa py mx min py px font md py min m pt m pb border font border md pt my py text pb py p py sm m p mb sm border mx mx pt sm mb border px mb mb md font text py sm my md my my sm mb py m text font px fa border border m pb mb px opacity my my text md fa py px mb md lg fa fa py pb min mx sm md my pb lg p min sm mb min pt min text mb min px md text fa min font font min pt pt px fa sm sm px mx min sm pb sm text lg mx lg m pb font mb pb lg min font mx mx my my min min pb p pb py mb mx md my mx pb my py m text py pt m mb m fa min mb px p p my px lg px py px pt md p border border text min sm px px font py py p fa border m mb border font px mx min pb border font lg min pt min min mx md py pt lg md lg py pt lg text border pb border pb border mb p sm fa px min px sm pb p md md border border min min my mx text font px border p text mx mx mx pb py font min px md px fa my pt px border pb p fa px p min font lg fa lg md pt min min my font mx fa px md my fa md px min pt sm pb md lg pt lg m m m text font sm mb lg fa p text font mb sm border mx font fa m fa py pt border font md my text mx py md fa fa py pt p mx border m py mx mb md mb pt px pb pb border text fa px m mb font md md sm m px min min lg text mx m md px mb lg py px text sm pb m lg border text font p min mx sm sm fa m mb px py pt min mb px pb lg text md lg m md mx my pt pb sm mb pb mb m text pb pb my lg sm md min pt mx text font md px mx md px md mb font py min m mb mb p py font md px fa sm md p min mx lg sm text mb lg md sm px border min px sm border border font lg border mx font lg text my mx p px sm font text m font text fa pt m p pb lg min border text fa md p py text m font pb mx lg md text my text md md p md min mb m py pb md p fa px pb fa pb px md m border pb pt mx my mb pt sm mb text pb px py py pt pt py min py text pt text text md font m px p mx px border mx fa min my mx py px border lg pt py pt pb px border py lg min font md m text min pb my min min px mb mx px text p flex shadow box mx shadow pt md opacity mx py font border shadow pt flex py border fa drop min lg ">AKHIR CERITA<b>> 

    

          </diiv >


     <hr/></br></p><div/> `   
         
      // Implement append Panel Ojbext  End OF CAHPt . e   = (eE.   P ....    endpAhe.... ..    PanelEOCFinalAk . , Fix EOF   => ALL   APPEND To Imge Connteiaer reader. ) ! 
      

     // APPEND TERLEBIH DHULU   PENGGANTIA BOXXNYa YANG UDH SEELASSAAI , AGARA SMOOTH UInYA >
       imageContainer.appendChild(PanelEOCFinalAkhriCeritaAkanDimuatDomAppendSistemnya)   
       
    // Tigger Seet up history Data 
    if (finalComicSlug) {
      saveHistory(finalComicSlug, currentComicContext?.title, res.thumbnail?.url || currentComicContext?.image, chSlug, chapterLabel);
    }
    if ((!currentChapterList || currentChapterList.length === 0) && finalComicSlug) {
      fetchAndPopulateDropdown(finalComicSlug, chSlug);
    }

    setProgress(100);
    window.scrollTo(0, 0); 
    bindReaderEnhancements(); 
    
    // Otomatis Hilang UI Nav setelat setengah detik = imeresive experimectnce!! ! (Mode Webtoon ) : ! 
    setTimeout(() => {
       const tTop = document.getElementById('reader-top');
       const bBot = document.getElementById('reader-bottom');
       if(tTop && bBot) {
         tTop.classList.add('ui-hidden-top');
         bBot.classList.add('ui-hidden-bottom');
       }
    }, 400); 
    
  } finally {
    unlockNav();
  }
}

function generateDropdownHTML(list, currentSlug, comicSlug) {
  return `
    <div class="relative group h-full self-stretch bg-[#111] overflow-hidden drop-shadow-lg mx-1 my-[1px]" style="min-width: 140px; flex-grow:1; border-radius: 6px; padding:2px; ">
      <select onchange="safeReadChapter(this.value, '${comicSlug || ''}')"
        class="appearance-none font-extrabold uppercase h-[50px] md:h-full text-[11px] w-[140px] md:w-full tracking-[1.5px] px-2 pl-3 shadow bg-black border-[3px] border-amber-500/20 hover:bg-[#1a1515] hover:border-amber-500 text-amber-500 outline-none transition-[border,background,color] rounded-[6px] cursor-pointer drop-shadow-xl z-20 overflow-clip">
        ${list.map(ch => `<option value="${ch.slug}" ${ch.slug === currentSlug ? 'selected' : ''} class="bg-[#181822] text-amber-500 tracking-wider"> 👉 Bab..  ${cleanTitle(ch.title).replace(/(\r\n|\n|\r)/gm, "")}  --.</option>`).join('')}
      </select>
       <!-- CUSTOM DROUP UI --->
      <i class="fa fa-th-list absolute p-1 right-2 text-md flex h-auto m-auto mt-[4vh] text-[18px] text-amber-500 rounded bg-[#1f1911] group-focus-within:bg-amber-500  pointer-events-none group-focus-within:text-black hover:bg-[yellow]/6 drop-shadow group-hover:scale-110 top-2 bottom-3 mb-1" ></i> 
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

/* ---------------- Histori Baca dan Favourties Lokal Save Logic  ---------------- */

function saveHistory(slug, title, image, chSlug, chTitle) {
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  let existing = history.find(h => h.slug === slug);

  const data = {
    slug,
    title: cleanTitle(title) || existing?.title || 'Data Tersimpan (History)',
    image: image || existing?.image || 'assets/icon.png',
    lastChapterSlug: chSlug || existing?.lastChapterSlug,
    lastChapterTitle: chTitle || existing?.lastChapterTitle || 'Hal/Bab Belum diketahui. ?',
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
  renderGrid({ data: history }, "Terakhir Saya Lanjutkan. !!", null);
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
    btn.innerHTML = `<i class="fa fa-bookmark text-green-500 bg-green-500/10 p-1.5 rounded-full shadow border border-green-500/30 scale-105"></i> <span class='font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-green-500'>Telah Masuk Di Buku Pintar. </span>`;
    btn.classList.add('bg-white/5', 'border-green-500/60');
    btn.classList.remove('glass', 'bg-white/5');
  } else {
    btn.innerHTML = `<i class="fa fa-bookmark"></i> SIMPAN TAMBAHKAN FAVORITNYA! ?`;
    btn.classList.remove('bg-gradient-to-l', 'from-amber-600/30' , 'to-black');
    btn.classList.add('glass');
  }
}

function showBookmarks() {
  updateURL('/bookmarks'); resetNavs();
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  renderGrid({ data: bookmarks }, "Tas Lemari Buku Saya!", null);
}

/* ---------------- Core Handler Initialize Route ---------------- */

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
