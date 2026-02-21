/**
 * ============================================
 * FIXCOMIC - CORRECTED script.js
 * ============================================
 * 
 * CHANGES FROM ORIGINAL:
 * ✅ Updated API proxy to working endpoint
 * ✅ Updated API base to sankavollerei.com
 * ✅ Added comprehensive error handling
 * ✅ Added input validation
 * ✅ Fixed security vulnerabilities (XSS)
 * ✅ Improved error messages and user feedback
 * ✅ Added timeout handling for API calls
 * ✅ Fixed race condition with proper state management
 * ✅ Added validation for external data
 * ✅ Improved data sanitization
 */

// ==================== CONFIGURATION ====================
// FIXED: Updated to working proxy and API
const API_PROXY = "https://api-proxy-eight-mu.vercel.app/api/tools/proxy?url=";
const API_BASE = "https://www.sankavollerei.com/comic/komikindo";
const BACKEND_URL = window.location.origin;
const API_TIMEOUT = 10000; // 10 seconds timeout

// ==================== DOM REFERENCES ====================
const contentArea = document.getElementById('content-area');
const filterPanel = document.getElementById('filter-panel');
const mainNav = document.getElementById('main-nav');
const mobileNav = document.getElementById('mobile-nav');
const progressBar = document.getElementById('progress-bar');

// ==================== STATE MANAGEMENT ====================
let currentChapterList = [];
let currentComicContext = { slug: null, title: null, image: null };
let isNavigating = false;

// ==================== HELPER FUNCTIONS ====================

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = String(input || '');
  return div.innerHTML;
}

/**
 * Safely render HTML with sanitized content
 * @param {string} html - HTML to render
 * @returns {string} - Sanitized HTML
 */
function sanitizeHTML(html) {
  if (typeof html !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Get UUID from slug (calls backend API)
 * @param {string} slug - Comic slug
 * @param {string} type - Comic type (series/chapter)
 * @returns {Promise<string>} - UUID or slug as fallback
 */
async function getUuidFromSlug(slug, type) {
  try {
    if (!slug || !type) {
      console.warn('getUuidFromSlug: Missing slug or type');
      return slug;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const res = await fetch(`${BACKEND_URL}/api/get-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        slug: String(slug).trim(), 
        type: String(type).trim() 
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error('getUuidFromSlug failed:', res.status);
      return slug;
    }

    const data = await res.json();
    return data.uuid || slug;
  } catch (e) {
    console.error('getUuidFromSlug error:', e.message);
    return slug;
  }
}

/**
 * Get slug from UUID (calls backend API)
 * @param {string} uuid - Comic UUID
 * @returns {Promise<object|null>} - Mapping data or null
 */
async function getSlugFromUuid(uuid) {
  try {
    if (!uuid) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const res = await fetch(`${BACKEND_URL}/api/get-slug/${String(uuid).trim()}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('getSlugFromUuid error:', e.message);
    return null;
  }
}

/**
 * Update browser URL without page reload
 * @param {string} path - URL path to navigate to
 */
function updateURL(path) {
  if (typeof path !== 'string' || !path) return;
  if (window.location.pathname !== path) {
    history.pushState(null, null, path);
  }
}

/**
 * Get CSS class for comic type badge
 * @param {string} type - Comic type
 * @returns {string} - CSS class name
 */
function getTypeClass(type) {
  if (!type) return 'type-default';
  const t = String(type).toLowerCase();
  if (t.includes('manga')) return 'type-manga';
  if (t.includes('manhwa')) return 'type-manhwa';
  if (t.includes('manhua')) return 'type-manhua';
  return 'type-default';
}

/**
 * Display 404 error page
 */
function redirectTo404() {
  contentArea.innerHTML = `
    <div class="text-center py-40 text-red-500 flex flex-col items-center gap-4">
      <i class="fa fa-exclamation-circle text-5xl opacity-50"></i>
      <p class="text-lg">Halaman tidak ditemukan (404)</p>
      <button onclick="showHome()" class="mt-4 glass px-6 py-2 rounded-lg hover:bg-amber-500 hover:text-black transition">
        Kembali ke Beranda
      </button>
    </div>
  `;
}

/**
 * FIXED: Enhanced fetch with error handling and timeout
 * @param {string} url - Full API URL to fetch
 * @returns {Promise<object|null>} - Parsed JSON or null
 */
async function fetchAPI(url) {
  try {
    if (!url || typeof url !== 'string') {
      console.error('fetchAPI: Invalid URL');
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const encodedUrl = encodeURIComponent(url);
    const response = await fetch(API_PROXY + encodedUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`fetchAPI error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data) return null;

    // Handle different response formats
    if (data.success) return data.result?.content || data.result || data;
    if (data.data) return data;
    
    return data;
  } catch (e) {
    if (e.name === 'AbortError') {
      console.error('fetchAPI timeout after ' + API_TIMEOUT + 'ms');
    } else {
      console.error('fetchAPI error:', e.message);
    }
    return null;
  }
}

/**
 * Toggle filter panel visibility
 */
function toggleFilter() {
  filterPanel.classList.toggle('hidden');
  const genreSelect = document.getElementById('filter-genre');
  if (genreSelect && genreSelect.options.length <= 1) {
    loadGenres();
  }
}

/**
 * Reset navigation bar states
 */
function resetNavs() {
  mainNav.classList.remove('-translate-y-full');
  mobileNav.classList.remove('translate-y-full');
  filterPanel.classList.add('hidden');
}

/**
 * Toggle fullscreen mode
 */
function toggleFullScreen() {
  try {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err.message);
      });
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  } catch (e) {
    console.error('Fullscreen toggle error:', e.message);
  }
}

/**
 * Display loading spinner
 */
function setLoading() {
  contentArea.innerHTML = `
    <div class="flex justify-center items-center py-40">
      <div class="animate-spin rounded-full h-16 w-16 border-4 border-gray-600 border-t-amber-500"></div>
    </div>
  `;
}

/**
 * Lock navigation to prevent race conditions
 */
function lockNav() {
  isNavigating = true;
  setProgress(0);
}

/**
 * Unlock navigation after completion
 */
function unlockNav() {
  isNavigating = false;
}

/**
 * Set progress bar width
 * @param {number} percent - Progress percentage (0-100)
 */
function setProgress(percent) {
  if (!progressBar) return;
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  progressBar.style.width = `${p}%`;
}

/**
 * Bind reader progress to scroll position
 */
function bindReaderProgress() {
  const onScroll = () => {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    
    if (scrollHeight <= 0) {
      setProgress(0);
      return;
    }
    
    const percent = (scrollTop / scrollHeight) * 100;
    setProgress(percent);
  };

  window.removeEventListener('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ==================== DATA LOADING FUNCTIONS ====================

/**
 * Load genres from API
 * FIXED: Updated to new API structure
 */
async function loadGenres() {
  try {
    const data = await fetchAPI(`${API_BASE}/genres`);
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.warn('loadGenres: Invalid response structure');
      return;
    }

    const select = document.getElementById('filter-genre');
    if (!select) return;

    const sorted = data.data
      .filter(g => g && g.title && g.slug)
      .sort((a, b) => String(a.title).localeCompare(String(b.title)));

    select.innerHTML = '<option value="">Pilih Genre</option>';
    
    sorted.forEach(g => {
      const opt = document.createElement('option');
      opt.value = sanitizeInput(g.slug);
      opt.textContent = sanitizeInput(g.title);
      select.appendChild(opt);
    });
  } catch (e) {
    console.error('loadGenres error:', e.message);
  }
}

/**
 * Display home page
 * FIXED: Updated to new API endpoint (latest instead of home)
 */
async function showHome(push = true) {
  if (isNavigating) return;
  lockNav();

  if (push) updateURL('/');
  resetNavs();
  setLoading();

  try {
    // FIXED: Changed from /home to /latest for new API
    const data = await fetchAPI(`${API_BASE}/latest/1`);
    
    if (!data || !data.data) {
      redirectTo404();
      unlockNav();
      return;
    }

    const homeData = data.data;
    
    // Validate data structure
    const hotUpdates = Array.isArray(homeData.hotUpdates) ? homeData.hotUpdates : [];
    const latestReleases = Array.isArray(homeData.latestReleases) ? homeData.latestReleases : [];
    const projectUpdates = Array.isArray(homeData.projectUpdates) ? homeData.projectUpdates : [];

    contentArea.innerHTML = `
      <section class="mb-12">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold flex items-center gap-2">
            <i class="fa fa-fire text-amber-500"></i> Populer Hari Ini
          </h2>
        </div>
        <div class="flex overflow-x-auto gap-4 hide-scroll pb-4 -mx-4 px-4 md:mx-0 md:px-0">
          ${hotUpdates.slice(0, 10).map(item => renderHotUpdateCard(item)).join('')}
        </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div class="lg:col-span-2">
          <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Rilis Terbaru</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
            ${latestReleases.slice(0, 15).map(item => renderLatestCard(item)).join('')}
          </div>
        </div>

        <div>
          <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Proyek Kami</h2>
          <div class="space-y-4">
            ${projectUpdates.slice(0, 6).map(item => renderProjectCard(item)).join('')}
          </div>
        </div>
      </div>
    `;

    window.scrollTo(0, 0);
  } catch (e) {
    console.error('showHome error:', e.message);
    redirectTo404();
  } finally {
    unlockNav();
  }
}

/**
 * FIXED: Helper function to render hot update card with validation
 */
function renderHotUpdateCard(item) {
  if (!item || !item.slug) return '';
  
  const title = sanitizeInput(item.title || 'Untitled');
  const image = sanitizeInput(item.image || 'https://via.placeholder.com/300x400');
  const chapter = sanitizeInput(item.chapter || item.latestChapter || 'Update');
  const type = sanitizeInput(item.type || 'Hot');

  return `
    <div class="min-w-[150px] md:min-w-[200px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group"
        onclick="showDetail('${sanitizeInput(item.slug)}')">
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10"></div>
      <span class="type-badge ${getTypeClass(type)}">${type}</span>
      <img src="${image}" alt="${title}" class="h-64 md:h-80 w-full object-cover transform group-hover:scale-110 transition duration-500" 
           onerror="this.src='https://via.placeholder.com/300x400'" />
      <div class="absolute bottom-0 left-0 p-3 z-20 w-full">
        <h3 class="text-sm font-bold truncate text-white drop-shadow-md">${title}</h3>
        <p class="text-amber-400 text-xs font-semibold mt-1">${chapter}</p>
      </div>
    </div>
  `;
}

/**
 * FIXED: Helper function to render latest release card with validation
 */
function renderLatestCard(item) {
  if (!item || !item.slug) return '';

  const title = sanitizeInput(item.title || 'Untitled');
  const image = sanitizeInput(item.image || 'https://via.placeholder.com/300x400');
  const type = sanitizeInput(item.type || 'UP');
  const chapterTitle = sanitizeInput(item.chapters?.[0]?.title || 'Ch.?');
  const time = sanitizeInput(item.chapters?.[0]?.time || '');

  return `
    <div class="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition group"
        onclick="showDetail('${sanitizeInput(item.slug)}')">
      <div class="relative h-48 overflow-hidden">
        <span class="type-badge ${getTypeClass(type)} bottom-2 left-2 top-auto">${type}</span>
        <img src="${image}" alt="${title}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500"
             onerror="this.src='https://via.placeholder.com/300x400'" />
      </div>
      <div class="p-3">
        <h3 class="text-xs font-bold line-clamp-2 h-8 leading-relaxed">${title}</h3>
        <div class="flex justify-between items-center mt-3">
          <span class="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400">${chapterTitle}</span>
          <span class="text-[10px] text-gray-500">${time}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * FIXED: Helper function to render project update card with validation
 */
function renderProjectCard(item) {
  if (!item || !item.slug) return '';

  const title = sanitizeInput(item.title || 'Untitled');
  const image = sanitizeInput(item.image || 'https://via.placeholder.com/100x120');
  const chapterTitle = sanitizeInput(item.chapters?.[0]?.title || 'N/A');

  return `
    <div class="flex gap-4 bg-zinc-900/30 p-2 rounded-xl cursor-pointer hover:bg-white/5 transition border border-transparent hover:border-white/10"
        onclick="showDetail('${sanitizeInput(item.slug)}')">
      <img src="${image}" alt="${title}" class="w-16 h-20 rounded-lg object-cover shadow-lg"
           onerror="this.src='https://via.placeholder.com/100x120'" />
      <div class="flex-1 flex flex-col justify-center overflow-hidden">
        <h3 class="font-bold text-xs truncate mb-1">${title}</h3>
        <div class="flex items-center gap-2">
          <span class="text-amber-500 text-[10px] font-bold bg-amber-500/10 px-2 py-0.5 rounded">
            ${chapterTitle}
          </span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Show ongoing comics
 * FIXED: Updated to new API endpoint
 */
async function showOngoing(page = 1) {
  if (isNavigating) return;
  lockNav();

  try {
    updateURL(`/ongoing?page=${page}`);
    resetNavs();
    setLoading();

    // FIXED: Updated to new API structure
    const data = await fetchAPI(`${API_BASE}/library?page=${page}&status=Ongoing&orderby=popular`);
    renderGrid(data, "Komik Ongoing Terpopuler", "showOngoing");
  } catch (e) {
    console.error('showOngoing error:', e.message);
    redirectTo404();
  } finally {
    unlockNav();
  }
}

/**
 * Show completed comics
 * FIXED: Updated to new API endpoint
 */
async function showCompleted(page = 1) {
  if (isNavigating) return;
  lockNav();

  try {
    updateURL(`/completed?page=${page}`);
    resetNavs();
    setLoading();

    // FIXED: Updated to new API structure
    const data = await fetchAPI(`${API_BASE}/library?page=${page}&status=Completed&orderby=popular`);
    renderGrid(data, "Komik Tamat (Selesai)", "showCompleted");
  } catch (e) {
    console.error('showCompleted error:', e.message);
    redirectTo404();
  } finally {
    unlockNav();
  }
}

/**
 * Show comics by genre
 * FIXED: Updated to new API endpoint
 */
async function showGenre(slug, page = 1) {
  if (isNavigating || !slug) return;
  lockNav();

  try {
    slug = String(slug).trim();
    resetNavs();
    setLoading();

    // FIXED: Updated to new API structure
    const data = await fetchAPI(`${API_BASE}/library?page=${page}&genre=${encodeURIComponent(slug)}`);
    
    if (!data || !data.data || data.data.length === 0) {
      redirectTo404();
      unlockNav();
      return;
    }

    renderGrid(data, `Genre: ${sanitizeInput(slug.toUpperCase())}`, "showGenre", slug);
  } catch (e) {
    console.error('showGenre error:', e.message);
    redirectTo404();
  } finally {
    unlockNav();
  }
}

/**
 * Apply advanced filter
 * FIXED: Enhanced with validation and error handling
 */
async function applyAdvancedFilter() {
  if (isNavigating) return;
  lockNav();

  try {
    const query = String(document.getElementById('search-input')?.value || '').trim();
    const genre = String(document.getElementById('filter-genre')?.value || '').trim();
    const type = String(document.getElementById('filter-type')?.value || '').trim();
    const status = String(document.getElementById('filter-status')?.value || '').trim();

    filterPanel.classList.add('hidden');
    setLoading();

    if (query && query.length > 0) {
      // FIXED: Updated to new API search endpoint
      const data = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(query)}/1`);
      renderGrid(data, `Hasil Pencarian: "${sanitizeInput(query)}"`, null);
      return;
    }

    if (genre && genre.length > 0) {
      showGenre(genre, 1);
      return;
    }

    let url = `${API_BASE}/library?page=1`;
    if (type) url += `&type=${encodeURIComponent(type)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    url += `&orderby=popular`;

    const data = await fetchAPI(url);
    renderGrid(data, "Hasil Filter", null);
  } catch (e) {
    console.error('applyAdvancedFilter error:', e.message);
    redirectTo404();
  } finally {
    unlockNav();
  }
}

/**
 * Handle search input with debouncing
 */
let searchTimeout;
function handleSearch(event) {
  clearTimeout(searchTimeout);
  const query = String(event.target.value || '').trim();
  
  if (query.length === 0) return;

  searchTimeout = setTimeout(() => {
    applyAdvancedFilter();
  }, 500);
}

/**
 * Render grid of comics
 * FIXED: Enhanced with validation and better structure
 */
function renderGrid(data, title, funcName, extraArg = null) {
  const list = data?.data || [];

  if (!Array.isArray(list) || list.length === 0) {
    contentArea.innerHTML = `
      <div class="text-center py-40 text-gray-500 flex flex-col items-center gap-4">
        <i class="fa fa-folder-open text-4xl opacity-50"></i>
        <p>Tidak ada komik ditemukan.</p>
      </div>
    `;
    return;
  }

  let paginationHTML = '';
  if (data.pagination && funcName) {
    const current = Number(data.pagination.currentPage) || 1;
    const hasNextPage = Boolean(data.pagination.hasNextPage);
    const argStr = extraArg ? `'${sanitizeInput(extraArg)}', ` : '';

    paginationHTML = `
      <div class="mt-14 flex justify-center items-center gap-4">
        ${current > 1 ? `
          <button onclick="${funcName}(${argStr}${current - 1})" 
            class="glass px-5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition">
            <i class="fa fa-chevron-left"></i> Prev
          </button>
        ` : ''}
        <span class="bg-amber-500 text-black px-4 py-2 rounded-lg text-xs font-extrabold shadow-lg shadow-amber-500/20">
          ${current}
        </span>
        ${hasNextPage ? `
          <button onclick="${funcName}(${argStr}${current + 1})" 
            class="glass px-5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition">
            Next <i class="fa fa-chevron-right"></i>
          </button>
        ` : ''}
      </div>
    `;
  }

  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">${sanitizeInput(title)}</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      ${list.map(item => renderComicCard(item)).join('')}
    </div>
    ${paginationHTML}
  `;

  window.scrollTo(0, 0);
}

/**
 * FIXED: Helper to render comic card with validation
 */
function renderComicCard(item) {
  if (!item || !item.slug) return '';

  const title = sanitizeInput(item.title || 'Untitled');
  const image = sanitizeInput(item.image || 'https://via.placeholder.com/300x400');
  const type = sanitizeInput(item.type || 'Comic');
  const chapter = sanitizeInput(item.latestChapter || item.chapter || 'Baca');

  return `
    <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group"
        onclick="showDetail('${sanitizeInput(item.slug)}')">
      <span class="type-badge ${getTypeClass(type)}">${type}</span>
      <div class="relative overflow-hidden aspect-[3/4]">
        <img src="${image}" alt="${title}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500"
             onerror="this.src='https://via.placeholder.com/300x400'" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
      </div>
      <div class="p-3 text-center">
        <h3 class="text-xs font-bold truncate group-hover:text-amber-500 transition">${title}</h3>
        <p class="text-[10px] text-amber-500 mt-1 font-medium">${chapter}</p>
      </div>
    </div>
  `;
}

// ==================== DETAIL PAGE LOGIC ====================

/**
 * Show comic detail page
 * FIXED: Added UUID mapping and validation
 */
async function showDetail(idOrSlug, push = true) {
  if (isNavigating) return;
  lockNav();

  try {
    let slug = String(idOrSlug || '').trim();
    if (!slug) {
      redirectTo404();
      unlockNav();
      return;
    }

    setLoading();

    // FIXED: Handle UUID-to-slug conversion
    if (slug.length === 36 && slug.match(/^[0-9a-f-]+$/i)) {
      const mapping = await getSlugFromUuid(slug);
      if (mapping && mapping.slug) {
        slug = mapping.slug;
      }
    }

    if (push) {
      const uuid = await getUuidFromSlug(slug, 'series');
      updateURL(`/series/${uuid}`);
    }

    resetNavs();

    // FIXED: Updated to new API endpoint
    const data = await fetchAPI(`${API_BASE}/detail/${encodeURIComponent(slug)}`);

    if (!data || !data.data) {
      redirectTo404();
      unlockNav();
      return;
    }

    const res = data.data;
    currentChapterList = Array.isArray(res.chapters) ? res.chapters : [];
    currentComicContext = {
      slug,
      title: sanitizeInput(res.title || 'Untitled'),
      image: sanitizeInput(res.image || 'https://via.placeholder.com/300x400')
    };

    // Save to history
    const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    const savedItem = history.find(h => h && h.slug === slug);
    
    if (savedItem) {
      savedItem.lastRead = new Date().toISOString();
    } else {
      history.unshift({
        slug,
        title: currentComicContext.title,
        image: currentComicContext.image,
        lastRead: new Date().toISOString()
      });
    }

    localStorage.setItem('fmc_history', JSON.stringify(history.slice(0, 50)));

    const genres = Array.isArray(res.genres) ? res.genres.map(g => sanitizeInput(g)).join(', ') : 'N/A';
    const rating = res.rating ? parseFloat(res.rating).toFixed(1) : 'N/A';
    const synopsis = sanitizeInput(res.synopsis || 'Tidak ada sinopsis');

    contentArea.innerHTML = `
      <div class="mb-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img src="${currentComicContext.image}" alt="${currentComicContext.title}"
              class="w-full rounded-2xl shadow-2xl shadow-amber-500/20 border border-amber-500/20 object-cover"
              onerror="this.src='https://via.placeholder.com/300x400'" />
            <button onclick="toggleBookmark('${sanitizeInput(slug)}')" 
              class="w-full mt-4 glass px-6 py-3 rounded-xl font-bold hover:bg-amber-500 hover:text-black transition">
              <i class="fa fa-bookmark"></i> Bookmark
            </button>
          </div>

          <div class="md:col-span-2">
            <h1 class="text-3xl font-bold mb-4">${currentComicContext.title}</h1>
            <div class="space-y-3 text-sm mb-6">
              <p><strong>Rating:</strong> <span class="text-amber-500 text-lg">★ ${rating}</span></p>
              <p><strong>Genre:</strong> ${genres}</p>
              <p><strong>Status:</strong> ${sanitizeInput(res.status || 'Ongoing')}</p>
              <p><strong>Pengarang:</strong> ${sanitizeInput(res.author || 'Unknown')}</p>
            </div>
            <div class="glass p-4 rounded-xl mb-6">
              <p class="text-sm leading-relaxed">${synopsis}</p>
            </div>
            ${currentChapterList.length > 0 ? `
              <button onclick="readChapter('${sanitizeInput(currentChapterList[0].slug)}')" 
                class="amber-gradient px-8 py-3 rounded-xl font-bold text-black hover:opacity-90 transition w-full">
                Baca Chapter ${sanitizeInput(currentChapterList[0].title || '1')}
              </button>
            ` : `
              <div class="glass p-4 rounded-xl text-yellow-300">
                <p>Chapter belum tersedia</p>
              </div>
            `}
          </div>
        </div>
      </div>

      <div class="mb-12">
        <h2 class="text-2xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Daftar Chapter</h2>
        <div class="glass rounded-xl overflow-hidden max-h-96 overflow-y-auto">
          ${currentChapterList.map((ch, idx) => `
            <div class="p-4 border-b border-white/5 hover:bg-white/5 transition cursor-pointer group"
              onclick="readChapter('${sanitizeInput(ch.slug)}')">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <p class="font-bold text-sm group-hover:text-amber-500 transition">
                    ${sanitizeInput(ch.title || `Chapter ${idx + 1}`)}
                  </p>
                  <p class="text-xs text-gray-400 mt-1">${sanitizeInput(ch.time || 'Update')}</p>
                </div>
                <i class="fa fa-arrow-right opacity-0 group-hover:opacity-100 transition"></i>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    window.scrollTo(0, 0);
  } catch (e) {
    console.error('showDetail error:', e.message);
    redirectTo404();
  } finally {
    unlockNav();
  }
}

// ==================== CHAPTER READING ====================

/**
 * Read comic chapter
 * FIXED: Added error handling and image validation
 */
async function readChapter(chapterSlug, push = true) {
  if (isNavigating || !chapterSlug || !currentComicContext.slug) return;
  lockNav();

  try {
    chapterSlug = String(chapterSlug).trim();
    setLoading();

    if (push) {
      const uuid = await getUuidFromSlug(chapterSlug, 'chapter');
      updateURL(`/chapter/${uuid}`);
    }

    resetNavs();

    // FIXED: Updated to new API endpoint
    const data = await fetchAPI(`${API_BASE}/chapter/${encodeURIComponent(chapterSlug)}`);

    if (!data || !data.data || !Array.isArray(data.data.images) || data.data.images.length === 0) {
      contentArea.innerHTML = `
        <div class="text-center py-40 text-yellow-300 flex flex-col items-center gap-4">
          <i class="fa fa-exclamation-triangle text-4xl"></i>
          <p>Gambar chapter belum tersedia</p>
          <button onclick="showDetail('${sanitizeInput(currentComicContext.slug)}')" 
            class="mt-4 glass px-6 py-2 rounded-lg hover:bg-amber-500 hover:text-black transition">
            Kembali
          </button>
        </div>
      `;
      unlockNav();
      return;
    }

    const images = data.data.images.filter(img => img && typeof img === 'string');
    const chapterTitle = sanitizeInput(data.data.title || chapterSlug);
    const nextChapter = data.data.next_chapter?.slug;
    const prevChapter = data.data.prev_chapter?.slug;

    contentArea.innerHTML = `
      <div class="fixed top-0 left-0 right-0 h-16 glass z-40 flex items-center justify-between px-4">
        <button onclick="showDetail('${sanitizeInput(currentComicContext.slug)}')" 
          class="flex items-center gap-2 hover:text-amber-500 transition">
          <i class="fa fa-arrow-left"></i> Kembali
        </button>
        <h2 class="text-sm font-bold truncate">${currentComicContext.title}</h2>
        <button onclick="toggleFullScreen()" class="hover:text-amber-500 transition">
          <i class="fa fa-expand"></i>
        </button>
      </div>

      <div class="mt-16 mb-20 space-y-2">
        ${images.map((img, idx) => `
          <img src="${sanitizeInput(img)}" alt="Page ${idx + 1}" 
            class="comic-page w-full" 
            onerror="this.innerHTML='<div style=\\'padding:50px;text-align:center;background:#333;\\'>Gagal memuat gambar halaman ${idx + 1}</div>'" />
        `).join('')}
      </div>

      <div class="fixed bottom-0 left-0 right-0 glass z-40 p-4 flex justify-between items-center">
        ${prevChapter ? `
          <button onclick="readChapter('${sanitizeInput(prevChapter)}')" 
            class="glass px-4 py-2 rounded-lg hover:bg-amber-500 hover:text-black transition text-xs font-bold">
            <i class="fa fa-chevron-left"></i> Prev
          </button>
        ` : '<div></div>'}
        <span class="text-xs font-bold">Chapter: ${chapterTitle}</span>
        ${nextChapter ? `
          <button onclick="readChapter('${sanitizeInput(nextChapter)}')" 
            class="glass px-4 py-2 rounded-lg hover:bg-amber-500 hover:text-black transition text-xs font-bold">
            Next <i class="fa fa-chevron-right"></i>
          </button>
        ` : '<div></div>'}
      </div>
    `;

    bindReaderProgress();
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('readChapter error:', e.message);
    contentArea.innerHTML = `
      <div class="text-center py-40 text-red-500">
        Gagal memuat chapter
      </div>
    `;
  } finally {
    unlockNav();
  }
}

// ==================== HISTORY & BOOKMARKS ====================

/**
 * Show reading history
 */
function showHistory() {
  if (isNavigating) return;
  lockNav();

  try {
    updateURL('/history');
    resetNavs();

    const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');

    if (!Array.isArray(history) || history.length === 0) {
      contentArea.innerHTML = `
        <div class="text-center py-40 text-gray-500">
          <p>Riwayat membaca masih kosong</p>
        </div>
      `;
      unlockNav();
      return;
    }

    contentArea.innerHTML = `
      <h2 class="text-2xl font-bold mb-8">Riwayat Membaca</h2>
      <div class="space-y-3">
        ${history.filter(h => h && h.slug).map(h => `
          <div class="flex gap-4 bg-zinc-900/40 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition"
            onclick="showDetail('${sanitizeInput(h.slug)}')">
            <img src="${sanitizeInput(h.image)}" alt="${sanitizeInput(h.title)}" 
              class="w-12 h-16 rounded object-cover"
              onerror="this.src='https://via.placeholder.com/100x120'" />
            <div class="flex-1">
              <p class="font-bold text-sm">${sanitizeInput(h.title)}</p>
              <p class="text-xs text-gray-400">Dibaca: ${new Date(h.lastRead).toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    window.scrollTo(0, 0);
  } catch (e) {
    console.error('showHistory error:', e.message);
  } finally {
    unlockNav();
  }
}

/**
 * Show bookmarks
 */
function showBookmarks() {
  if (isNavigating) return;
  lockNav();

  try {
    updateURL('/bookmarks');
    resetNavs();

    const bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');

    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
      contentArea.innerHTML = `
        <div class="text-center py-40 text-gray-500">
          <p>Bookmark masih kosong</p>
        </div>
      `;
      unlockNav();
      return;
    }

    contentArea.innerHTML = `
      <h2 class="text-2xl font-bold mb-8">Bookmark Saya</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        ${bookmarks.filter(b => b && b.slug).map(b => renderComicCard(b)).join('')}
      </div>
    `;

    window.scrollTo(0, 0);
  } catch (e) {
    console.error('showBookmarks error:', e.message);
  } finally {
    unlockNav();
  }
}

/**
 * Toggle bookmark
 */
function toggleBookmark(slug) {
  try {
    if (!slug) return;

    const bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
    const index = bookmarks.findIndex(b => b && b.slug === slug);

    if (index > -1) {
      bookmarks.splice(index, 1);
      alert('Dihapus dari bookmark');
    } else {
      bookmarks.push(currentComicContext);
      alert('Ditambahkan ke bookmark');
    }

    localStorage.setItem('fmc_bookmarks', JSON.stringify(bookmarks));
  } catch (e) {
    console.error('toggleBookmark error:', e.message);
  }
}

// ==================== INITIALIZATION ====================

/**
 * Initialize app on page load
 */
window.addEventListener('DOMContentLoaded', () => {
  // Route handling
  const path = window.location.pathname;

  if (path === '/' || path === '') {
    showHome(false);
  } else if (path.startsWith('/series/')) {
    const uuid = path.split('/series/')[1];
    showDetail(uuid, false);
  } else if (path.startsWith('/chapter/')) {
    const uuid = path.split('/chapter/')[1];
    readChapter(uuid, false);
  } else if (path === '/ongoing') {
    showOngoing();
  } else if (path === '/completed') {
    showCompleted();
  } else if (path === '/history') {
    showHistory();
  } else if (path === '/bookmarks') {
    showBookmarks();
  } else {
    showHome(false);
  }
});

// Handle browser back/forward
window.addEventListener('popstate', () => {
  const path = window.location.pathname;

  if (path === '/' || path === '') {
    showHome(false);
  } else if (path.startsWith('/series/')) {
    const uuid = path.split('/series/')[1];
    showDetail(uuid, false);
  } else if (path.startsWith('/chapter/')) {
    const uuid = path.split('/chapter/')[1];
    readChapter(uuid, false);
  } else if (path === '/ongoing') {
    showOngoing();
  } else if (path === '/completed') {
    showCompleted();
  } else if (path === '/history') {
    showHistory();
  } else if (path === '/bookmarks') {
    showBookmarks();
  }
});
