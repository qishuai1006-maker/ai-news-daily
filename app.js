/* ============================================
   AI News Daily · 交互逻辑
   X 推文专区 + 新闻专区（官方+Exa+媒体混排）
   ============================================ */

let searchKeyword = '';
let currentData = null;
let archiveIndex = new Map();

// ========== 初始化 ==========
function init() {
  loadToday();
  loadArchives();
  bindEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function bindEvents() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    searchKeyword = e.target.value.trim().toLowerCase();
    if (currentData) {
      renderXFeed(currentData);
      renderNews(currentData);
    }
  });
}

// ========== 加载今日数据 ==========
function loadToday() {
  if (typeof TODAY_DATA === 'undefined' || !TODAY_DATA) {
    document.getElementById('news-container').innerHTML = `
      <div class="empty-state">
        <h3>📭 今日数据未生成</h3>
        <p style="margin-top: 8px;">请等待每日 12:00 自动跑批</p>
      </div>`;
    document.getElementById('x-container').innerHTML = '';
    document.getElementById('update-time').textContent = '等待数据生成...';
    return;
  }
  currentData = TODAY_DATA;
  archiveIndex.set(TODAY_DATA.date, TODAY_DATA);
  renderHeader(TODAY_DATA);
  renderStats(TODAY_DATA);
  renderXFeed(TODAY_DATA);
  renderNews(TODAY_DATA);
}

// ========== 加载归档 ==========
function loadArchives() {
  if (typeof ARCHIVES === 'undefined') return;
  const sorted = [...ARCHIVES].sort((a, b) => b.date.localeCompare(a.date));
  sorted.forEach(arch => archiveIndex.set(arch.date, arch));
  renderArchiveList(sorted);
}

// ========== 渲染头部 ==========
function renderHeader(data) {
  document.getElementById('update-time').textContent =
    `数据更新于 ${data.date} · ${data.run_time || '12:00'} 自动采集`;
}

// ========== 渲染统计 ==========
function renderStats(data) {
  document.getElementById('stat-total').textContent = data.items.length;
  const xCount = data.items.filter(i => i.layer === 'T1.5').length;
  const newsCount = data.items.length - xCount;
  const mediaCount = new Set(
    data.items.filter(i => i.layer !== 'T1.5').map(i => i.source)
  ).size;
  document.getElementById('stat-x').textContent = xCount;
  document.getElementById('stat-news').textContent = newsCount;
  document.getElementById('stat-media').textContent = mediaCount;
}

// ========== 渲染 X 推文专区 ==========
function renderXFeed(data) {
  const container = document.getElementById('x-container');

  let xItems = data.items.filter(i => i.layer === 'T1.5');
  if (searchKeyword) {
    xItems = xItems.filter(i =>
      i.title.toLowerCase().includes(searchKeyword) ||
      (i.source && i.source.toLowerCase().includes(searchKeyword))
    );
  }

  if (xItems.length === 0) {
    document.getElementById('x-section').style.display = 'none';
    return;
  }
  document.getElementById('x-section').style.display = '';

  container.innerHTML = xItems.map((item, idx) => {
    const author = (item.source || '').replace(/^@/, '');
    const text = item.title.replace(/^\[推\]\s*/, '').replace(/^\[推\]/, '').trim();
    return `
      <a href="${item.url}" target="_blank" rel="noopener" class="x-card">
        <div class="x-header">
          <div class="x-avatar">${author.charAt(0).toUpperCase()}</div>
          <div class="x-meta">
            <div class="x-author">@${escapeHtml(author)}</div>
            <div class="x-handle">核心人物</div>
          </div>
          <span class="x-badge">推文</span>
        </div>
        <div class="x-text">${escapeHtml(text)}</div>
        <div class="x-footer">
          <span class="x-link">查看原文 ↗</span>
        </div>
      </a>`;
  }).join('');
}

// ========== 渲染新闻区（T1 + T1.6 + T2 混排）==========
function renderNews(data) {
  const container = document.getElementById('news-container');

  // X 推文不进新闻区
  let items = data.items.filter(i => i.layer !== 'T1.5');

  if (searchKeyword) {
    items = items.filter(i =>
      i.title.toLowerCase().includes(searchKeyword) ||
      (i.source && i.source.toLowerCase().includes(searchKeyword))
    );
  }

  if (items.length === 0) {
    document.getElementById('news-section').style.display = 'none';
    return;
  }
  document.getElementById('news-section').style.display = '';

  // 来源标签
  const sourceMap = {
    'T1': { icon: '📣', label: '官方' },
    'T1.6': { icon: '🔍', label: '全网' },
    'T2': { icon: '📰', label: '媒体' },
  };

  container.innerHTML = items.map((item, idx) => {
    const tag = sourceMap[item.layer] || sourceMap['T1'];
    return `
      <a href="${item.url}" target="_blank" rel="noopener" class="news-card">
        <div class="card-tag">${tag.icon} ${tag.label}</div>
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-source">
          <span>${escapeHtml(item.source || '')}</span>
          <span class="card-link-icon">↗</span>
        </div>
      </a>`;
  }).join('');
}

// ========== 渲染归档 ==========
function renderArchiveList(list) {
  const container = document.getElementById('archive-list');
  if (list.length === 0) {
    container.innerHTML = '<p class="archive-empty">暂无历史数据</p>';
    return;
  }

  container.innerHTML = list.map(arch => {
    const xCount = arch.items.filter(i => i.layer === 'T1.5').length;
    const newsCount = arch.items.length - xCount;
    return `
    <button class="archive-item ${arch.items.length === 0 ? 'archive-empty-item' : ''}"
            data-date="${arch.date}"
            ${arch.items.length === 0 ? 'disabled' : ''}>
      <div class="archive-date">${arch.date}</div>
      <div class="archive-count">${arch.items.length === 0 ? '暂无数据' : `🐦${xCount}  📰${newsCount}`}</div>
    </button>`;
  }).join('');

  container.querySelectorAll('.archive-item:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      const data = archiveIndex.get(date);
      if (!data) return;
      currentData = data;
      renderHeader(data);
      renderStats(data);
      renderXFeed(data);
      renderNews(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ========== 工具 ==========
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}