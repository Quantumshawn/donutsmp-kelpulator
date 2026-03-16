// ─── Helpers ───
function parseMoney(str) {
  if (!str) return NaN;
  str = str.trim().replace(/,/g, '').toLowerCase();
  const multipliers = { k: 1e3, m: 1e6, b: 1e9 };
  const match = str.match(/^([\d.]+)\s*([kmb])?$/);
  if (!match) return NaN;
  const num = parseFloat(match[1]);
  const mult = match[2] ? multipliers[match[2]] : 1;
  return num * mult;
}

function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}

function fmtPrice(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCompact(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
  return sign + '$' + fmt(abs);
}

// ─── API ───
let _prices = null;
let _cacheTime = 0;
let _isFetching = false;
let _fetchError = null;
let _fetchPromise = null;
const CACHE_TTL = 30 * 60 * 1000;
const PRICE_STORE = 'kelpulator_prices';

const liveDot = document.getElementById('liveDot');
const liveAge = document.getElementById('liveAge');
const fetchProgress = document.getElementById('fetchProgress');
const fetchProgressBar = document.getElementById('fetchProgressBar');

let _progressTimer = null;

function startProgress() {
  fetchProgress.classList.add('visible');
  fetchProgressBar.style.width = '0%';
  let pct = 0;
  _progressTimer = setInterval(() => {
    pct += (88 - pct) * 0.04;
    fetchProgressBar.style.width = pct + '%';
  }, 200);
}

function finishProgress() {
  clearInterval(_progressTimer);
  fetchProgressBar.style.width = '100%';
  setTimeout(() => {
    fetchProgress.classList.remove('visible');
    fetchProgressBar.style.width = '0%';
  }, 400);
}

// Restore cached prices
try {
  const saved = localStorage.getItem(PRICE_STORE);
  if (saved) {
    const { prices, time } = JSON.parse(saved);
    if (Date.now() - time < CACHE_TTL) {
      _prices = prices;
      _cacheTime = time;
      updateLivePrices(prices);
      liveDot.className = 'live-dot active';
      updateAge();
    }
  }
} catch (e) { /* ignore */ }

async function fetchOrderPrice(itemId) {
  let cursor = '';
  let highest = 0;
  const now = Date.now();
  while (true) {
    const resp = await fetch(`https://api.donut.auction/orders?cursor=${cursor}`);
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
    const data = await resp.json();
    for (const o of data.orders) {
      if (o.item.itemId !== itemId) continue;
      if (o.expirationDate && new Date(o.expirationDate).getTime() < now) continue;
      const remaining = o.amountOrdered - o.amountDelivered;
      if (remaining < 1000) continue;
      if (o.itemPrice > highest) highest = o.itemPrice;
    }
    if (!data.nextCursor) break;
    cursor = data.nextCursor;
  }
  return highest;
}

async function refreshPrices() {
  if (_isFetching) return _fetchPromise;
  _isFetching = true;
  _fetchError = null;
  liveDot.className = 'live-dot fetching';
  liveAge.textContent = 'Fetching…';
  startProgress();

  const refreshBtn = document.getElementById('refreshBtn');
  const refreshIcon = document.getElementById('refreshIcon');
  if (refreshBtn) { refreshBtn.disabled = true; refreshIcon.classList.add('spinning'); }

  _fetchPromise = (async () => {
    try {
      const [bone, kelp] = await Promise.all([
        fetchOrderPrice('bone_block'),
        fetchOrderPrice('dried_kelp_block'),
      ]);

      _prices = { bone, kelp };
      _cacheTime = Date.now();

      try {
        localStorage.setItem(PRICE_STORE, JSON.stringify({ prices: _prices, time: _cacheTime }));
      } catch (e) { /* storage full */ }

      updateLivePrices(_prices);

      const noOrders = bone === 0 && kelp === 0;
      if (noOrders) {
        liveDot.className = 'live-dot error';
        liveAge.textContent = 'No orders found — enter prices manually';
        // Auto-open the override panel so users can still calculate
        setOverride(true);
      } else {
        liveDot.className = 'live-dot active';
        updateAge();
      }
    } catch (err) {
      liveDot.className = 'live-dot error';
      liveAge.textContent = 'Fetch failed — enter prices manually';
      setOverride(true);
      _fetchError = err.message;
      console.error(err);
    } finally {
      _isFetching = false;
      finishProgress();
      if (refreshBtn) { refreshBtn.disabled = false; refreshIcon.classList.remove('spinning'); }
    }
  })();

  return _fetchPromise;
}

function updateLivePrices(prices) {
  document.getElementById('liveBone').textContent = prices.bone > 0 ? fmtPrice(prices.bone) : 'No orders';
  document.getElementById('liveKelp').textContent = prices.kelp > 0 ? fmtPrice(prices.kelp) : 'No orders';
}

function updateAge() {
  if (!_cacheTime) return;
  const ago = Math.floor((Date.now() - _cacheTime) / 1000);
  if (ago < 60) liveAge.textContent = `Updated ${ago}s ago`;
  else liveAge.textContent = `Updated ${Math.floor(ago / 60)}m ago`;
}

// Auto-refresh on load + every 30 min
refreshPrices();
setInterval(refreshPrices, CACHE_TTL);
setInterval(updateAge, 10000);

// Manual refresh button
document.getElementById('refreshBtn').addEventListener('click', () => {
  _prices = null;
  refreshPrices();
});

// ─── Calculation ───
// Optimal ratio: 9B = 12R → B = budget / (bonePrice + 0.75 * blazePrice), R = floor(3B/4)
function calculate(budget, bonePrice, blazePrice, kelpPrice) {
  const B = Math.floor(budget / (bonePrice + 0.75 * blazePrice));
  const R = Math.floor((3 * B) / 4);

  const totalCost = B * bonePrice + R * blazePrice;
  const kelpProduced = Math.min(9 * B, 12 * R);
  const driedKelpBlocks = Math.floor(kelpProduced / 9);
  const revenue = driedKelpBlocks * kelpPrice;
  const profit = revenue - totalCost;

  return { B, R, totalCost, kelpProduced, driedKelpBlocks, revenue, profit };
}

// ─── UI ───
const budgetInput = document.getElementById('budget');
const calcBtn = document.getElementById('calcBtn');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

const toggleSwitch = document.getElementById('toggleSwitch');
const overrideFields = document.getElementById('overrideFields');
const overrideToggle = document.getElementById('overrideToggle');
let overrideOn = false;

function setOverride(on) {
  overrideOn = on;
  toggleSwitch.classList.toggle('on', on);
  toggleSwitch.setAttribute('aria-checked', String(on));
  overrideFields.classList.toggle('visible', on);
}

overrideToggle.addEventListener('click', () => setOverride(!overrideOn));
toggleSwitch.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setOverride(!overrideOn); }
});
budgetInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
calcBtn.addEventListener('click', run);

async function run() {
  const budget = parseMoney(budgetInput.value);
  if (isNaN(budget) || budget <= 0) {
    statusEl.textContent = 'Please enter a valid budget.';
    statusEl.className = 'status error';
    return;
  }

  const ovBone  = overrideOn ? parseMoney(document.getElementById('overrideBone').value)  : NaN;
  const ovBlaze = overrideOn ? parseMoney(document.getElementById('overrideBlaze').value) : NaN;
  const ovKelp  = overrideOn ? parseMoney(document.getElementById('overrideKelp').value)  : NaN;

  const needLive = !overrideOn || isNaN(ovBone) || isNaN(ovKelp);

  calcBtn.disabled = true;
  resultsEl.classList.remove('visible');
  statusEl.className = 'status';

  try {
    if (needLive) {
      if (_isFetching) {
        statusEl.innerHTML = `<span class="spinner"></span> Fetching market data…`;
        await _fetchPromise;
      } else if (!_prices) {
        statusEl.innerHTML = `<span class="spinner"></span> Fetching market data…`;
        await refreshPrices();
      }
      if (!_prices) throw new Error(_fetchError ? `API error: ${_fetchError}` : 'Could not fetch market data. Try again.');
    }

    statusEl.innerHTML = `<span class="spinner"></span> Crunching numbers…`;

    const liveBone = _prices?.bone ?? 0;
    const liveKelp = _prices?.kelp ?? 0;

    const boneMarket = (overrideOn && !isNaN(ovBone)) ? ovBone  : liveBone;
    const kelpPrice  = (overrideOn && !isNaN(ovKelp)) ? ovKelp  : liveKelp;
    const blazePrice = (overrideOn && !isNaN(ovBlaze)) ? ovBlaze : 156.66;

    if (boneMarket === 0) throw new Error('No bone block price available. Enter one manually or wait for live prices.');
    if (kelpPrice  === 0) throw new Error('No dried kelp block price available. Enter one manually or wait for live prices.');

    const bonePrice = boneMarket + ((overrideOn && !isNaN(ovBone)) ? 0 : 6.66);

    const result = calculate(budget, bonePrice, blazePrice, kelpPrice);
    if (result.B <= 0) throw new Error('Budget too low to purchase any materials.');

    const SHULKER = 1728;

    document.getElementById('boneRows').innerHTML = buildRows([
      { label: 'Price',  dot: '#60a5fa', value: fmtPrice(bonePrice),              copy: bonePrice.toFixed(2) },
      { label: 'Amount', dot: '#60a5fa', value: fmt(result.B),                    copy: String(result.B) },
      { label: 'Cost',   dot: '#60a5fa', value: fmtCompact(result.B * bonePrice) },
    ]);

    document.getElementById('blazeRows').innerHTML = buildRows([
      { label: 'Price',  dot: '#fb923c', value: fmtPrice(blazePrice),             copy: blazePrice.toFixed(2) },
      { label: 'Amount', dot: '#fb923c', value: fmt(result.R),                    copy: String(result.R) },
      { label: 'Cost',   dot: '#fb923c', value: fmtCompact(result.R * blazePrice) },
    ]);

    const kelpShulkers = (result.driedKelpBlocks / SHULKER).toFixed(1);
    document.getElementById('kelpRows').innerHTML = buildRows([
      { label: 'Sell Price',      dot: '#4ade80', value: fmtPrice(kelpPrice) },
      { label: 'Amount Produced', dot: '#4ade80', value: fmt(result.driedKelpBlocks) },
      { label: 'Shulkers',        dot: '#4ade80', value: kelpShulkers },
    ]);

    const revenueAmtEl = document.getElementById('revenueAmount');
    revenueAmtEl.textContent = fmtCompact(result.revenue);
    revenueAmtEl.className = 'profit-amount positive';
    document.getElementById('revenueSub').innerHTML =
      `${fmt(result.driedKelpBlocks)} dried kelp blocks @ ${fmtPrice(kelpPrice)}`;

    const profitAmtEl = document.getElementById('profitAmount');
    profitAmtEl.textContent = fmtCompact(result.profit);
    profitAmtEl.className = 'profit-amount ' + (result.profit >= 0 ? 'positive' : 'negative');

    const pctReturn = ((result.profit / result.totalCost) * 100).toFixed(1);
    document.getElementById('profitSub').innerHTML =
      `<span class="${result.profit >= 0 ? 'positive' : 'negative'}">${result.profit >= 0 ? '+' : ''}${pctReturn}% return</span> on ${fmtPrice(result.totalCost)} invested`;

    resultsEl.classList.add('visible');
    statusEl.textContent = '';

  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = 'status error';
  } finally {
    calcBtn.disabled = false;
  }
}

function buildRows(items) {
  return items.map(({ label, dot, value, copy }) => `
    <div class="summary-row">
      <span class="summary-label">
        <span class="dot" style="background:${dot}"></span>
        ${label}
      </span>
      <span class="summary-value-wrap">
        <span class="summary-value">${value}</span>
        ${copy != null ? `<button class="copy-btn" onclick="copyVal(this, '${copy}')" title="Copy"><img src="copy-link.png" alt="copy"></button>` : ''}
      </span>
    </div>
  `).join('');
}

function copyVal(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const img = btn.querySelector('img');
    img.style.display = 'none';
    btn.classList.add('copied');
    const check = document.createElement('span');
    check.textContent = '✓';
    check.className = 'copy-check';
    btn.appendChild(check);
    setTimeout(() => {
      check.remove();
      img.style.display = '';
      btn.classList.remove('copied');
    }, 1500);
  });
}
