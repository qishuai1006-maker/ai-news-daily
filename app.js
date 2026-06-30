/* ============================================
   AI News Daily · 交互逻辑
   ============================================ */

let currentFilter = 'all';
let searchKeyword = '';
let currentData = null;
let allArchives = [];   // [{date, data}, ...]
let archiveIndex = new Map();   // date -> data

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  loadToday();
  loadArchives();
  bindEvents();
});

function bindEvents() {
  // 筛选按钮
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      if (currentData) renderNews(currentData);
    });
  });

  // 搜索框
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    searchKeyword = e.target.value.trim().toLowerCase();
    if (currentData) renderNews(currentData);
  });
}

// ========== 加载今日数据 ==========
function loadToday() {
  if (typeof TODAY_DATA === 'undefined' || !TODAY_DATA) {
    document.getElementById('news-container').innerHTML = `
      <div class="empty-state">
        <h3>📭 今日数据未生成</h3>
        <p style="margin-top: 8px;">请等待每日 12:00 自动跑批，或手动执行 build_news.py</p>
      </div>`;
    document.getElementById('update-time').textContent = '等待数据生成...';
    return;
  }
  currentData = TODAY_DATA;
  archiveIndex.set(TODAY_DATA.date, TODAY_DATA);
  renderHeader(TODAY_DATA);
  renderStats(TODAY_DATA);
  renderNews(TODAY_DATA);
}

// ========== 加载归档数据 ==========
function loadArchives() {
  if (typeof ARCHIVES === 'undefined') return;
  // 按日期倒序
  const sorted = [...ARCHIVES].sort((a, b) => b.date.localeCompare(a.date));
  allArchives = sorted;
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
  document.getElementById('stat-t1').textContent =
    data.items.filter(i => i.layer === 'T1').length;
  document.getElementById('stat-t15').textContent =
    data.items.filter(i => i.layer === 'T1.5').length;
  document.getElementById('stat-t2').textContent =
    data.items.filter(i => i.layer === 'T2').length;
}

// ========== 渲染新闻卡片 ==========
function renderNews(data) {
  const container = document.getElementById('news-container');
  let items = [...data.items];

  // 筛选
  if (currentFilter !== 'all') {
    items = items.filter(item => item.layer === currentFilter);
  }

  // 搜索
  if (searchKeyword) {
    items = items.filter(item =>
      item.title.toLowerCase().includes(searchKeyword) ||
      (item.source && item.source.toLowerCase().includes(searchKeyword))
    );
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>🔍 没找到匹配的新闻</h3>
        <p style="margin-top: 8px;">试试切换筛选标签，或换个关键词</p>
      </div>`;
    return;
  }

  const tagMap = {
    'T1': { icon: '📣', label: '官方发布', cls: 't1' },
    'T1.5': { icon: '🐦', label: '核心人物', cls: 't15' },
    'T2': { icon: '📰', label: '媒体报道', cls: 't2' },
  };

  container.innerHTML = items.map((item, idx) => {
    const tag = tagMap[item.layer] || tagMap.T1;
    return `
      <a href="${item.url}" target="_blank" rel="noopener" class="news-card ${tag.cls}">
        <div class="card-tag">${tag.icon} ${tag.label}</div>
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-source">
          <span>${escapeHtml(item.source || '')}</span>
          <span class="card-link-icon">↗</span>
        </div>
      </a>`;
  }).join('');
}

// ========== 渲染归档列表 ==========
function renderArchiveList(list) {
  const container = document.getElementById('archive-list');
  if (list.length === 0) {
    container.innerHTML = '<p class="archive-empty">暂无历史数据</p>';
    return;
  }

  container.innerHTML = list.map(arch => `
    <button class="archive-item ${arch.items.length === 0 ? 'archive-empty-item' : ''}"
            data-date="${arch.date}"
            ${arch.items.length === 0 ? 'disabled' : ''}>
      <div class="archive-date">${arch.date}</div>
      <div class="archive-count">${arch.items.length === 0 ? '暂无数据' : arch.items.length + ' 条新闻'}</div>
    </button>
  `).join('');

  container.querySelectorAll('.archive-item:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      const data = archiveIndex.get(date);
      if (!data) return;
      currentData = data;
      renderHeader(data);
      renderStats(data);
      renderNews(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ========== 工具函数 ==========
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}