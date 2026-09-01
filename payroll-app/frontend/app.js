// =============================================================================
// MSE Tech Payroll — Frontend
// =============================================================================
// 1. Deploy backend/Code.gs as a Google Apps Script Web App (see its header
//    comment for steps).
// 2. Paste the Web App URL below.
const API_URL = 'https://script.google.com/macros/s/AKfycbx-vL5E9e6Au080UII13SyZAbWYcMd1QiseWuw5cNwI28FDiiT6H001m56dNvSO8T884w/exec';

// -----------------------------------------------------------------------------
// STATE
// -----------------------------------------------------------------------------
let state = {
  token: localStorage.getItem('payroll_token') || null,
  role: localStorage.getItem('payroll_role') || null,
  displayName: localStorage.getItem('payroll_name') || null,
  currentView: null,
  employees: [],
};

// -----------------------------------------------------------------------------
// API HELPER
// Uses text/plain content-type to avoid a CORS preflight (Apps Script cannot
// answer OPTIONS requests), then parses JSON manually on the server side.
// -----------------------------------------------------------------------------
async function api(action, payload) {
  if (API_URL.indexOf('PASTE_YOUR') === 0) {
    throw new Error('Set API_URL at the top of app.js to your deployed Apps Script Web App URL.');
  }
  const body = Object.assign({ action: action, token: state.token }, payload || {});
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Unknown error');
  return json.data;
}

// -----------------------------------------------------------------------------
// AUTH
// -----------------------------------------------------------------------------
function showLogin() {
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('app-view').style.display = 'none';
}

function showApp() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'flex';
  document.getElementById('user-badge').innerHTML =
    escapeHtml(state.displayName) + ' <span class="tag tag-' + state.role.toLowerCase() + '">' + state.role + '</span>';
  document.body.classList.toggle('role-superadmin', state.role === 'SuperAdmin');
  document.body.classList.toggle('role-accountant', state.role === 'Accountant');
  renderNav();
  navigateTo(defaultViewForRole(state.role));
  if (state.role === 'SuperAdmin') {
    refreshPendingApprovalsCount().then(function () {
      if (state.pendingApprovalsCount > 0) {
        showBanner(state.pendingApprovalsCount + ' change' + (state.pendingApprovalsCount === 1 ? '' : 's') +
          ' awaiting your approval — see "Pending Approvals" in the sidebar.', 'success');
      }
    });
  }
}

document.getElementById('login-btn').addEventListener('click', doLogin);
document.getElementById('login-password').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const btn = document.getElementById('login-btn');
  if (btn.disabled) return; // already signing in — ignore a repeat click/Enter
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errBox = document.getElementById('login-error');
  errBox.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', username: username, password: password }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    state.token = json.data.token;
    state.role = json.data.role;
    state.displayName = json.data.displayName;
    state.employees = json.data.employees || []; // bundled with login — saves a separate round-trip
    localStorage.setItem('payroll_token', state.token);
    localStorage.setItem('payroll_role', state.role);
    localStorage.setItem('payroll_name', state.displayName);
    showApp();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

document.getElementById('logout-btn').addEventListener('click', function () {
  state.token = null; state.role = null; state.displayName = null;
  localStorage.removeItem('payroll_token');
  localStorage.removeItem('payroll_role');
  localStorage.removeItem('payroll_name');
  showLogin();
});

async function preloadEmployees() {
  try { state.employees = await api('getEmployees'); } catch (e) { state.employees = []; }
}

function empName(empId) {
  const e = state.employees.find(function (x) { return x.EmpID === empId; });
  return e ? e.Name : empId;
}

// -----------------------------------------------------------------------------
// NAV / ROUTING
// -----------------------------------------------------------------------------
const NAV_ITEMS = [
  { id: 'payroll', label: 'Payroll Entry', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'overview', label: 'Monthly Overview & Spikes', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'ottracker', label: 'OT & Basic Tracker', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'deptsummary', label: 'Department Summary', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'downloads', label: 'Download Salary Files', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'exitlog', label: 'Exit / Final Settlement', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'balances', label: 'Advance Balances', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'ledger', label: 'Advance Ledger', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'importadvance', label: 'Import Advance Ledger', roles: ['SuperAdmin'] },
  { id: 'employees', label: 'Employee Master', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'ppe', label: 'Safety Shoes & PPE', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'approvals', label: 'Pending Approvals', roles: ['SuperAdmin'], badge: true },
  { id: 'admin', label: 'Admin / Recalculate', roles: ['SuperAdmin'] },
  { id: 'account', label: 'Change Password', roles: ['SuperAdmin', 'Accountant'] },
];

function defaultViewForRole(role) {
  return 'payroll';
}

function renderNav() {
  const nav = document.getElementById('nav-links');
  nav.innerHTML = '';
  NAV_ITEMS.filter(function (item) { return item.roles.indexOf(state.role) !== -1; }).forEach(function (item) {
    const a = document.createElement('a');
    a.className = 'nav-item' + (item.id === state.currentView ? ' active' : '');
    a.href = '#';
    a.onclick = function (e) { e.preventDefault(); navigateTo(item.id); };
    if (item.badge && state.pendingApprovalsCount) {
      a.innerHTML = escapeHtml(item.label) + ' <span class="nav-badge">' + state.pendingApprovalsCount + '</span>';
    } else {
      a.textContent = item.label;
    }
    nav.appendChild(a);
  });
}

async function refreshPendingApprovalsCount() {
  if (state.role !== 'SuperAdmin') return;
  try {
    state.pendingApprovalsCount = await api('getPendingApprovalsCount');
    renderNav();
  } catch (e) { /* ignore */ }
}

const VIEW_RENDERERS = {
  payroll: renderPayrollView,
  overview: renderOverviewView,
  ottracker: renderOTTrackerView,
  deptsummary: renderDeptSummaryView,
  downloads: renderDownloadsView,
  exitlog: renderExitLogView,
  balances: renderBalancesView,
  ledger: renderLedgerView,
  importadvance: renderImportAdvanceView,
  employees: renderEmployeesView,
  ppe: renderPPEView,
  approvals: renderApprovalsView,
  admin: renderAdminView,
  account: renderAccountView,
};

let navGeneration = 0; // bumped on every navigation; a slow-to-resolve view checks this before touching the DOM

async function navigateTo(viewId) {
  const myGeneration = ++navGeneration;
  state.currentView = viewId;
  renderNav();
  const root = document.getElementById('view-root');
  root.innerHTML = '<p class="muted">Loading…</p>';
  // Force the "Loading…" state to actually paint before the network call
  // starts — without this micro-yield, a fast browser can sometimes batch
  // the DOM update together with the upcoming await and the click can look
  // like it did nothing for a moment.
  await new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); });
  if (myGeneration !== navGeneration) return; // superseded by a newer click before we even started

  try {
    await VIEW_RENDERERS[viewId]();
    if (myGeneration !== navGeneration) return; // a newer nav click already moved on — don't let a slow response overwrite it
  } catch (err) {
    if (myGeneration !== navGeneration) return;
    console.error('Error rendering view "' + viewId + '":', err);
    root.innerHTML = '<div class="error-box">' + escapeHtml(err.message) +
      '<br/><span class="small">(Open the browser console — F12 — for full details.)</span></div>';
  }
}

function showBanner(msg, type) {
  const b = document.getElementById('banner');
  b.textContent = msg;
  b.className = 'banner ' + (type || 'success');
  b.style.display = 'block';
  setTimeout(function () { b.style.display = 'none'; }, 4000);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return '';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function fmtPct(n) {
  if (n === null || n === undefined) return '';
  return (n * 100).toFixed(1) + '%';
}

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------
(async function init() {
  if (state.token && state.role) {
    try {
      await preloadEmployees();
      showApp();
      return;
    } catch (e) { /* fall through to login */ }
  }
  showLogin();
})();

// =============================================================================
// VIEW: PAYROLL ENTRY (accountant's main daily-use screen)
// =============================================================================
let payrollMonthCache = {};
let currentAllowanceRows = []; // [{label, amount}] for the entry form currently open
let entryFormLoadToken = 0; // incremented on every employee selection; guards against a stale async response overwriting newer form state

function currentMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = -2; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    opts.push(val);
  }
  return opts;
}

// Payroll Entry needs the current month's rows in at least two places (the
// single-entry form's "existing entry" lookup, and the table below it), and
// both fire off their fetch nearly simultaneously rather than one after the
// other — so caching only the resolved result isn't quite enough, since both
// could start before either finishes. Caching the in-flight PROMISE itself
// means a second concurrent caller for the same month reuses the same
// network call instead of starting its own. Only re-fetches when the month
// changes or after something writes new data.
let sharedMonthRowsCache = { month: null, promise: null };
function getPayrollRowsForMonth(month, forceRefresh) {
  if (!forceRefresh && sharedMonthRowsCache.month === month && sharedMonthRowsCache.promise) {
    return sharedMonthRowsCache.promise;
  }
  const promise = api('getPayrollData', { month: month });
  sharedMonthRowsCache = { month: month, promise: promise };
  return promise;
}
function invalidatePayrollRowsCache() { sharedMonthRowsCache = { month: null, promise: null }; }

async function renderPayrollView() {
  const root = document.getElementById('view-root');
  root.innerHTML = '<h2 class="page-title">Payroll Entry</h2><p class="muted">Loading…</p>';

  // Figure out which month we're opening, using the rolling window as a
  // starting point (the combined call below will also tell us every month
  // that actually has data, which gets merged in once it comes back).
  const rollingWindow = currentMonthOptions();
  const now = new Date();
  const thisMonthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const selectedMonth = payrollMonthCache.selected ||
    (rollingWindow.indexOf(thisMonthStr) !== -1 ? thisMonthStr : rollingWindow[rollingWindow.length - 1]);
  payrollMonthCache.selected = selectedMonth;
  selectedEmpIdsForBankFile = new Set(); // reset selection when the month/view changes

  const defaultEmpId = state.employees.length ? state.employees[0].EmpID : null;

  // ONE call instead of three (getAvailableMonths + getPayrollData +
  // getSuggestedAdvance) — see getPayrollEntryInit_ in Code.gs.
  const init = await api('getPayrollEntryInit', { month: selectedMonth, empId: defaultEmpId });
  const months = Array.from(new Set(rollingWindow.concat(init.availableMonths))).sort();
  sharedMonthRowsCache = { month: selectedMonth, promise: Promise.resolve(init.payrollRows) };

  root.innerHTML =
    '<h2 class="page-title">Payroll Entry</h2>' +
    '<p class="muted">Worked days, OT hours, and allowances are entered here. Basic pay, OT pay, and Gross/Net ' +
    'are always calculated automatically. The Advance Deducted amount is pre-filled with a suggestion but you can ' +
    'edit it — whatever you save is exactly what reduces that employee\'s balance on the Advance Ledger (enter 0 to skip a month).</p>' +
    '<div class="toolbar"><label>Month: <select id="payroll-month"></select></label></div>' +
    '<div class="card" id="entry-form-card"></div>' +
    '<div class="card" id="bulk-upload-card"></div>' +
    '<div class="toolbar" style="justify-content: space-between;">' +
    '  <span></span>' +
    '  <button class="btn-sm secondary" id="download-month-btn">⬇ Download Excel (with formulas) for ' + selectedMonth + '</button>' +
    '</div>' +
    '<div class="table-wrap"><table id="payroll-table"><thead></thead><tbody></tbody><tfoot></tfoot></table></div>' +
    '<div class="card" id="bankfile-card" style="margin-top:20px;"></div>' +
    '<div class="card" id="payslips-card" style="margin-top:20px;"></div>';

  const monthSelect = document.getElementById('payroll-month');
  months.forEach(function (m) {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    if (m === selectedMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  });
  monthSelect.onchange = function () {
    payrollMonthCache.selected = monthSelect.value;
    renderPayrollView();
  };

  renderPayrollEntryForm(selectedMonth, defaultEmpId, init.suggestion);
  renderBulkUploadCard(selectedMonth);
  await renderPayrollTable(selectedMonth);
  document.getElementById('download-month-btn').onclick = function () { downloadMonthWorkbook(selectedMonth); };
  renderBankFileCard(selectedMonth);
  renderPayslipsCard(selectedMonth);
}

// ---------- Allowance line items (dynamic add/remove) ----------
function renderAllowanceRows() {
  const wrap = document.getElementById('allowance-rows');
  if (!wrap) return;
  wrap.innerHTML = currentAllowanceRows.map(function (a, i) {
    return '<div style="display:flex; gap:8px; margin-bottom:6px;">' +
      '<input class="allow-label" data-i="' + i + '" placeholder="e.g. Bus Fare, Transport, Film Allowance" value="' + escapeHtml(a.label) + '" style="flex:2; padding:6px 8px; border:1px solid #d1d5db; border-radius:6px;" />' +
      '<input class="allow-amount" data-i="' + i + '" type="number" step="0.01" placeholder="Amount" value="' + a.amount + '" style="flex:1; padding:6px 8px; border:1px solid #d1d5db; border-radius:6px;" />' +
      '<button type="button" class="btn-sm secondary remove-allow-btn" data-i="' + i + '" style="padding:4px 10px;">✕</button>' +
      '</div>';
  }).join('') || '<p class="muted small">No allowance lines yet — click "Add Allowance" below.</p>';

  wrap.querySelectorAll('.allow-label').forEach(function (el) {
    el.oninput = function () { currentAllowanceRows[Number(el.getAttribute('data-i'))].label = el.value; scheduleLivePreview(payrollMonthCache.selected); };
  });
  wrap.querySelectorAll('.allow-amount').forEach(function (el) {
    el.oninput = function () { currentAllowanceRows[Number(el.getAttribute('data-i'))].amount = Number(el.value || 0); scheduleLivePreview(payrollMonthCache.selected); };
  });
  wrap.querySelectorAll('.remove-allow-btn').forEach(function (btn) {
    btn.onclick = function () {
      currentAllowanceRows.splice(Number(btn.getAttribute('data-i')), 1);
      renderAllowanceRows();
      scheduleLivePreview(payrollMonthCache.selected);
    };
  });
}

function renderPayrollEntryForm(month, initialEmpId, initialSuggestion) {
  const card = document.getElementById('entry-form-card');
  const empOptions = state.employees
    .map(function (e) { return '<option value="' + e.EmpID + '">' + escapeHtml(e.EmpID + ' — ' + e.Name) + '</option>'; })
    .join('');

  card.innerHTML =
    '<h3 style="margin-top:0;">Single Employee Entry</h3>' +
    '<div class="form-grid">' +
    '  <div><label>Employee</label><select id="f-empid">' + empOptions + '</select></div>' +
    '  <div><label>Worked Days (this month)</label><input id="f-workeddays" type="number" step="0.5" /></div>' +
    '  <div><label>OT Hours (previous month)</label><input id="f-othours" type="number" step="0.5" /></div>' +
    '  <div><label>Exit this month?</label><select id="f-exitflag"><option value="N">No</option><option value="Y">Yes</option></select></div>' +
    '  <div><label>Also pay current-month OT?</label><select id="f-alsoot"><option value="N">No</option><option value="Y">Yes</option></select></div>' +
    '  <div><label>OT Hours (current month, exit only)</label><input id="f-otcurr" type="number" step="0.5" /></div>' +
    '  <div><label>Other One-off Deduction (manual)</label><input id="f-otherded" type="number" step="0.01" value="0" /></div>' +
    '  <div><label>Advance Deducted this month</label><input id="f-advance" type="number" step="0.01" />' +
    '    <div id="advance-hint" class="muted small" style="margin-top:3px;"></div></div>' +
    '  <div style="grid-column: 1 / -1;"><label>Notes</label><input id="f-notes" type="text" /></div>' +
    '</div>' +
    '<div style="margin-top:14px;">' +
    '  <label>Allowances (add as many as you need — bus fare, transport, film, project, festival, etc.)</label>' +
    '  <div id="allowance-rows"></div>' +
    '  <button type="button" class="btn-sm secondary" id="add-allow-btn" style="margin-top:6px;">+ Add Allowance</button>' +
    '</div>' +
    '<div id="live-preview-box" class="card" style="margin-top:16px; background:#f8fafc;"></div>' +
    '<button class="btn-sm" id="save-entry-btn" style="margin-top:16px;">Save Entry for ' + month + '</button>' +
    '<span id="save-preview" class="muted small" style="margin-left:14px;"></span>';

  document.getElementById('add-allow-btn').onclick = function () {
    currentAllowanceRows.push({ label: '', amount: 0 });
    renderAllowanceRows();
    updateLivePreview(month);
  };
  document.getElementById('f-empid').onchange = function () { loadExistingEntry(month); };
  if (initialEmpId) document.getElementById('f-empid').value = initialEmpId;
  // First load already has this employee's data from the combined init call —
  // no need to fetch it again separately.
  loadExistingEntry(month, initialSuggestion);

  // Any change to the form recalculates the live preview (debounced so a
  // fast typist doesn't fire a request per keystroke).
  ['f-workeddays', 'f-othours', 'f-exitflag', 'f-alsoot', 'f-otcurr', 'f-otherded', 'f-advance'].forEach(function (id) {
    const el = document.getElementById(id);
    el.addEventListener('input', function () { scheduleLivePreview(month); });
    el.addEventListener('change', function () { scheduleLivePreview(month); });
  });

  document.getElementById('save-entry-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    try {
      const advanceRaw = document.getElementById('f-advance').value;
      const input = {
        Month: month,
        EmpID: document.getElementById('f-empid').value,
        WorkedDays: Number(document.getElementById('f-workeddays').value || 0),
        OTHoursPrev: Number(document.getElementById('f-othours').value || 0),
        ExitFlag: document.getElementById('f-exitflag').value,
        AlsoPayCurrentOT: document.getElementById('f-alsoot').value,
        OTHoursCurrentExit: Number(document.getElementById('f-otcurr').value || 0),
        OtherDeductionManual: Number(document.getElementById('f-otherded').value || 0),
        AdvanceDeducted: advanceRaw === '' ? null : Number(advanceRaw),
        Allowances: currentAllowanceRows.filter(function (a) { return a.label || a.amount; }),
        Notes: document.getElementById('f-notes').value,
      };
      const computed = await api('savePayrollEntry', { entry: input });
      showBanner('Saved. Net Pay: ' + fmtMoney(computed.NetPay) + ' | Advance deducted: ' + fmtMoney(computed.AdvanceDeducted), 'success');
      invalidatePayrollRowsCache();
      await renderPayrollTable(month);
      await loadExistingEntry(month);
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };
}

let livePreviewTimer = null;
function scheduleLivePreview(month) {
  clearTimeout(livePreviewTimer);
  livePreviewTimer = setTimeout(function () { updateLivePreview(month); }, 350);
}

async function updateLivePreview(month) {
  const box = document.getElementById('live-preview-box');
  if (!box) return;
  const empIdEl = document.getElementById('f-empid');
  if (!empIdEl) return;
  const advanceRaw = document.getElementById('f-advance').value;
  const input = {
    Month: month,
    EmpID: empIdEl.value,
    WorkedDays: Number(document.getElementById('f-workeddays').value || 0),
    OTHoursPrev: Number(document.getElementById('f-othours').value || 0),
    ExitFlag: document.getElementById('f-exitflag').value,
    AlsoPayCurrentOT: document.getElementById('f-alsoot').value,
    OTHoursCurrentExit: Number(document.getElementById('f-otcurr').value || 0),
    OtherDeductionManual: Number(document.getElementById('f-otherded').value || 0),
    AdvanceDeducted: advanceRaw === '' ? null : Number(advanceRaw),
    Allowances: currentAllowanceRows.filter(function (a) { return a.label || a.amount; }),
    Notes: '',
  };
  box.innerHTML = '<p class="muted small">Calculating…</p>';
  try {
    const c = await api('previewPayrollEntry', { entry: input });
    box.innerHTML =
      '<h4 style="margin-top:0;">Live Preview (not yet saved)</h4>' +
      '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap:8px 16px; font-size:14px;">' +
      '<div><span class="muted small">Basic Pay</span><br/><b>' + fmtMoney(c.BasicPay) + '</b></div>' +
      '<div><span class="muted small">Fixed Allowance</span><br/><b>' + fmtMoney(c.FixedAllowPay) + '</b></div>' +
      '<div><span class="muted small">OT Pay</span><br/><b>' + fmtMoney(c.OTPay) + '</b></div>' +
      '<div><span class="muted small">Allowances Total</span><br/><b>' + fmtMoney(JSON.parse(c.AllowancesJSON || '[]').reduce(function(s,a){return s+(Number(a.amount)||0);},0)) + '</b></div>' +
      '<div><span class="muted small">Advance Deducted</span><br/><b>' + fmtMoney(c.AdvanceDeducted) + '</b></div>' +
      '<div><span class="muted small">Other Deduction</span><br/><b>' + fmtMoney(c.OtherDeductionManual) + '</b></div>' +
      '<div><span class="muted small">Gross</span><br/><b>' + fmtMoney(c.Gross) + '</b></div>' +
      '<div style="color:#1F4E78;"><span class="muted small">Net Pay</span><br/><b style="font-size:17px;">' + fmtMoney(c.NetPay) + '</b></div>' +
      '</div>';
  } catch (err) {
    box.innerHTML = '<h4 style="margin-top:0;">Live Preview</h4><div class="error-box">' + escapeHtml(err.message) + '</div>';
  }
}

async function loadExistingEntry(month, preFetchedSuggestion) {
  const empId = document.getElementById('f-empid').value;
  const preview = document.getElementById('save-preview');
  const hint = document.getElementById('advance-hint');

  // Guard against a race: if the employee is changed again (or Save is clicked)
  // before this lookup finishes, a late-arriving response must not overwrite
  // whatever's in the fields now. Lock the fields while loading, and only the
  // MOST RECENT call is allowed to populate them when it resolves.
  const myToken = ++entryFormLoadToken;
  const fieldsToLock = ['f-workeddays', 'f-othours', 'f-exitflag', 'f-alsoot', 'f-otcurr',
                         'f-otherded', 'f-advance', 'f-notes', 'save-entry-btn', 'add-allow-btn'];
  fieldsToLock.forEach(function (id) { const el = document.getElementById(id); if (el) el.disabled = true; });
  preview.textContent = 'Loading this employee\'s data…';
  hint.textContent = '';

  try {
    // The very first render of this form already has this employee's
    // suggestion from the combined getPayrollEntryInit call — skip fetching
    // it again. Any later call (employee dropdown changed) fetches fresh.
    const [rows, suggestion] = await Promise.all([
      getPayrollRowsForMonth(month),
      preFetchedSuggestion ? Promise.resolve(preFetchedSuggestion) : api('getSuggestedAdvance', { empId: empId, month: month }),
    ]);
    if (myToken !== entryFormLoadToken) return; // a newer selection has already superseded this one — discard

    const existing = rows.find(function (r) { return r.EmpID === empId; });
    document.getElementById('f-workeddays').value = existing ? existing.WorkedDays : '';
    document.getElementById('f-othours').value = existing ? existing.OTHoursPrev : '';
    document.getElementById('f-exitflag').value = existing ? existing.ExitFlag : 'N';
    document.getElementById('f-alsoot').value = existing ? existing.AlsoPayCurrentOT : 'N';
    document.getElementById('f-otcurr').value = existing ? existing.OTHoursCurrentExit : '';
    document.getElementById('f-otherded').value = existing ? existing.OtherDeductionManual : 0;
    document.getElementById('f-notes').value = existing ? existing.Notes : '';
    document.getElementById('f-advance').value = existing ? existing.AdvanceDeducted : suggestion.suggested;

    currentAllowanceRows = existing
      ? (function () { try { return JSON.parse(existing.AllowancesJSON || '[]'); } catch (e) { return []; } })()
      : [];
    renderAllowanceRows();

    hint.textContent = 'Outstanding advance balance: ' + fmtMoney(suggestion.outstanding) +
      ' | Suggested this month: ' + fmtMoney(suggestion.suggested) +
      ' — you can type over this. Cannot exceed the outstanding balance.';
    preview.textContent = existing ? ('Existing entry found — last saved Net Pay: ' + fmtMoney(existing.NetPay)) : 'No entry yet for this employee/month.';
  } catch (err) {
    if (myToken !== entryFormLoadToken) return;
    preview.textContent = '';
    hint.textContent = '';
  } finally {
    if (myToken === entryFormLoadToken) {
      fieldsToLock.forEach(function (id) { const el = document.getElementById(id); if (el) el.disabled = false; });
      updateLivePreview(month);
    }
  }
}

let lastPayrollRows = []; // cached rows for the currently-viewed month, used by the Excel download
let selectedEmpIdsForBankFile = new Set(); // which employees are ticked for the bank file, for the current month view

async function renderPayrollTable(month) {
  const rows = await getPayrollRowsForMonth(month);
  lastPayrollRows = rows;
  const table = document.getElementById('payroll-table');
  table.querySelector('thead').innerHTML =
    '<tr><th><input type="checkbox" id="payroll-select-all" title="Select all for bank file" /></th>' +
    '<th>EmpID</th><th>Name</th><th>Worked Days</th><th>OT Hrs (Prev)</th><th>Exit?</th>' +
    '<th>Basic Pay</th><th>Fixed Allow</th><th>OT Pay</th><th>Allowances</th><th>Advance Deducted</th><th>Other Ded</th>' +
    '<th>Gross</th><th>Net Pay</th><th>Notes</th><th></th></tr>';
  table.querySelector('tbody').innerHTML = rows.map(function (r) {
    let allowSum = 0, allowList = [];
    try { allowList = JSON.parse(r.AllowancesJSON || '[]'); allowSum = allowList.reduce(function (s, a) { return s + (Number(a.amount) || 0); }, 0); } catch (e) {}
    const allowTitle = allowList.map(function (a) { return a.label + ': ' + fmtMoney(a.amount); }).join(', ');
    const checked = selectedEmpIdsForBankFile.has(r.EmpID) ? 'checked' : '';
    return '<tr>' +
      '<td><input type="checkbox" class="payroll-row-select" data-empid="' + escapeHtml(r.EmpID) + '" ' + checked + ' /></td>' +
      '<td>' + escapeHtml(r.EmpID) + '</td>' +
      '<td>' + escapeHtml(empName(r.EmpID)) + '</td>' +
      '<td>' + escapeHtml(r.WorkedDays) + '</td>' +
      '<td>' + escapeHtml(r.OTHoursPrev) + '</td>' +
      '<td>' + escapeHtml(r.ExitFlag) + '</td>' +
      '<td>' + fmtMoney(r.BasicPay) + '</td>' +
      '<td>' + fmtMoney(r.FixedAllowPay) + '</td>' +
      '<td>' + fmtMoney(r.OTPay) + '</td>' +
      '<td title="' + escapeHtml(allowTitle) + '">' + fmtMoney(allowSum) + '</td>' +
      '<td>' + fmtMoney(r.AdvanceDeducted) + '</td>' +
      '<td>' + fmtMoney(r.OtherDeductionManual) + '</td>' +
      '<td>' + fmtMoney(r.Gross) + '</td>' +
      '<td><b>' + fmtMoney(r.NetPay) + '</b></td>' +
      '<td>' + escapeHtml(r.Notes) + '</td>' +
      '<td style="white-space:nowrap;">' +
      '<button class="btn-sm secondary payroll-edit-btn" data-empid="' + escapeHtml(r.EmpID) + '" style="padding:4px 9px; font-size:12px;">Edit</button> ' +
      '<button class="btn-sm secondary payroll-delete-btn" data-empid="' + escapeHtml(r.EmpID) + '" style="padding:4px 9px; font-size:12px; color:#991b1b; border-color:#991b1b;">Delete</button>' +
      '</td>' +
      '</tr>';
  }).join('');

  table.querySelectorAll('.payroll-edit-btn').forEach(function (btn) {
    btn.onclick = function () {
      const empId = btn.getAttribute('data-empid');
      const select = document.getElementById('f-empid');
      if (select) {
        select.value = empId;
        select.dispatchEvent(new Event('change'));
        select.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
  });
  table.querySelectorAll('.payroll-delete-btn').forEach(function (btn) {
    btn.onclick = async function () {
      const empId = btn.getAttribute('data-empid');
      if (!window.confirm('Delete ' + empName(empId) + '\'s entry for ' + month + '? This cannot be undone.')) return;
      btn.disabled = true;
      try {
        await api('deletePayrollEntry', { month: month, empId: empId });
        showBanner('Deleted ' + empName(empId) + '\'s entry for ' + month + '.', 'success');
        invalidatePayrollRowsCache();
        await renderPayrollTable(month);
      } catch (err) {
        showBanner(err.message, 'error');
        btn.disabled = false;
      }
    };
  });

  table.querySelectorAll('.payroll-row-select').forEach(function (cb) {
    cb.onchange = function () {
      if (cb.checked) selectedEmpIdsForBankFile.add(cb.getAttribute('data-empid'));
      else selectedEmpIdsForBankFile.delete(cb.getAttribute('data-empid'));
      updateBankFileSelectionSummary();
    };
  });
  const selectAllCb = document.getElementById('payroll-select-all');
  selectAllCb.checked = rows.length > 0 && rows.every(function (r) { return selectedEmpIdsForBankFile.has(r.EmpID); });
  selectAllCb.onchange = function () {
    table.querySelectorAll('.payroll-row-select').forEach(function (cb) {
      cb.checked = selectAllCb.checked;
      if (selectAllCb.checked) selectedEmpIdsForBankFile.add(cb.getAttribute('data-empid'));
      else selectedEmpIdsForBankFile.delete(cb.getAttribute('data-empid'));
    });
    updateBankFileSelectionSummary();
  };

  // Totals footer — sums every money column for however many employees have been entered so far.
  function sumField(field) { return rows.reduce(function (s, r) { return s + (Number(r[field]) || 0); }, 0); }
  function sumAllowances() {
    return rows.reduce(function (s, r) {
      try { return s + JSON.parse(r.AllowancesJSON || '[]').reduce(function (s2, a) { return s2 + (Number(a.amount) || 0); }, 0); }
      catch (e) { return s; }
    }, 0);
  }
  table.querySelector('tfoot').innerHTML = rows.length
    ? '<tr style="font-weight:bold; background:#eef2f7;">' +
      '<td colspan="6">TOTAL (' + rows.length + ' employee' + (rows.length === 1 ? '' : 's') + ' entered)</td>' +
      '<td>' + fmtMoney(sumField('BasicPay')) + '</td>' +
      '<td>' + fmtMoney(sumField('FixedAllowPay')) + '</td>' +
      '<td>' + fmtMoney(sumField('OTPay')) + '</td>' +
      '<td>' + fmtMoney(sumAllowances()) + '</td>' +
      '<td>' + fmtMoney(sumField('AdvanceDeducted')) + '</td>' +
      '<td>' + fmtMoney(sumField('OtherDeductionManual')) + '</td>' +
      '<td>' + fmtMoney(sumField('Gross')) + '</td>' +
      '<td>' + fmtMoney(sumField('NetPay')) + '</td>' +
      '<td></td>' +
      '<td></td>' +
      '</tr>'
    : '<tr><td colspan="16" class="muted">No entries yet for this month.</td></tr>';
}

// ---------- Generate Bank File (OCBC GIRO/FAST) ----------
// Bank account numbers are never stored permanently in the sheet — they're
// only ever uploaded transiently, right when a bank file is being generated,
// then used in-memory to build the download.
let uploadedBankDetails = null; // { EmpID: {BankBIC, BankAccountNumber} } for the current generation attempt

function updateBankFileSelectionSummary() {
  const summary = document.getElementById('bankfile-selection-summary');
  if (summary) {
    const selectedRows = lastPayrollRows.filter(function (r) { return selectedEmpIdsForBankFile.has(r.EmpID); });
    const total = selectedRows.reduce(function (s, r) { return s + (Number(r.NetPay) || 0); }, 0);
    summary.textContent = selectedRows.length + ' employee(s) selected — total Net Pay: ' + fmtMoney(total);
  }
  updatePayslipsSelectionSummary();
}

function renderBankFileCard(month) {
  const card = document.getElementById('bankfile-card');
  uploadedBankDetails = null;

  card.innerHTML =
    '<h3 style="margin-top:0;">Generate Bank File (OCBC GIRO/FAST)</h3>' +
    '<p class="muted">Tick employees in the table above (or use the header checkbox to select everyone), then click ' +
    '"Generate Bank File" — you\'ll be asked to upload each selected employee\'s Bank BIC and Account Number. ' +
    'Bank details aren\'t stored anywhere in this system; they\'re only used in-memory to build the file you download.</p>' +
    '<p id="bankfile-selection-summary" class="muted" style="font-weight:bold;">0 employee(s) selected — total Net Pay: 0.00</p>' +
    '<button class="btn-sm" id="start-bankfile-btn">Generate Bank File</button>' +
    '<div id="bankfile-flow" style="margin-top:16px;"></div>';

  updateBankFileSelectionSummary();

  document.getElementById('start-bankfile-btn').onclick = function () {
    if (!selectedEmpIdsForBankFile.size) { showBanner('Select at least one employee in the table above first.', 'error'); return; }
    renderBankFileUploadStep(month);
  };
}

function renderBankFileUploadStep(month) {
  const flow = document.getElementById('bankfile-flow');
  const selectedIds = Array.from(selectedEmpIdsForBankFile);

  flow.innerHTML =
    '<div class="card" style="background:#f8fafc;">' +
    '<h4 style="margin-top:0;">Step 1 — Upload Bank Account Details</h4>' +
    '<p class="muted">Download the template (pre-filled with your ' + selectedIds.length + ' selected employees), ' +
    'fill in Bank BIC and Account Number for each, then upload it back here.</p>' +
    '<button class="btn-sm secondary" id="download-bank-template-btn">Download Bank Details Template (.xlsx)</button> ' +
    '<input type="file" id="bank-details-upload" accept=".xlsx,.xls" style="margin-left:10px;" />' +
    '<div id="bank-upload-preview" style="margin-top:14px;"></div>' +
    '</div>';

  document.getElementById('download-bank-template-btn').onclick = function () { downloadBankDetailsTemplate(selectedIds); };
  document.getElementById('bank-details-upload').onchange = function (e) {
    if (e.target.files && e.target.files[0]) handleBankDetailsFile(e.target.files[0], month, selectedIds);
  };
}

function downloadBankDetailsTemplate(selectedIds) {
  const rows = selectedIds.map(function (id) {
    return { EmpID: id, Name: empName(id), 'Bank BIC': '', 'Bank Account Number': '' };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bank Details');
  XLSX.writeFile(wb, 'Bank_Details_Template.xlsx');
}

function handleBankDetailsFile(file, month, selectedIds) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const keyMap = {};
      const bankMap = {};
      json.forEach(function (row) {
        const norm = {};
        Object.keys(row).forEach(function (k) { norm[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k]; });
        const empId = String(norm['empid'] || '').trim();
        if (!empId) return;
        bankMap[empId] = {
          EmpID: empId,
          BankBIC: String(norm['bankbic'] || '').trim().toUpperCase(),
          BankAccountNumber: String(norm['bankaccountnumber'] || '').trim(),
        };
      });

      uploadedBankDetails = bankMap;
      renderBankUploadPreview(bankMap, month, selectedIds);
    } catch (err) {
      showBanner('Could not read that file: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderBankUploadPreview(bankMap, month, selectedIds) {
  const preview = document.getElementById('bank-upload-preview');
  const rows = selectedIds.map(function (id) {
    const b = bankMap[id];
    const ok = b && b.BankBIC && b.BankAccountNumber;
    return { id: id, name: empName(id), bic: b ? b.BankBIC : '', acct: b ? b.BankAccountNumber : '', ok: ok };
  });
  const missingCount = rows.filter(function (r) { return !r.ok; }).length;

  preview.innerHTML =
    '<p><b>' + (rows.length - missingCount) + ' of ' + rows.length + '</b> selected employees have bank details in this file.' +
    (missingCount ? ' <span style="color:#991b1b;">' + missingCount + ' are missing details and will be skipped.</span>' : '') + '</p>' +
    '<div class="table-wrap" style="max-height:260px;"><table><thead><tr><th>EmpID</th><th>Name</th><th>Bank BIC</th><th>Account Number</th><th>Status</th></tr></thead><tbody>' +
    rows.map(function (r) {
      return '<tr' + (r.ok ? '' : ' style="background:#fee2e2;"') + '>' +
        '<td>' + escapeHtml(r.id) + '</td><td>' + escapeHtml(r.name) + '</td>' +
        '<td>' + escapeHtml(r.bic) + '</td><td>' + escapeHtml(r.acct) + '</td>' +
        '<td>' + (r.ok ? 'OK' : 'Missing') + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' +
    '<div id="bankfile-step2"></div>';

  renderBankFileGenerateStep(month, selectedIds);
}

function renderBankFileGenerateStep(month, selectedIds) {
  const step2 = document.getElementById('bankfile-step2');
  const savedCompanyBIC = localStorage.getItem('bankfile_companyBIC') || 'OCBCSGSGXXX';
  const savedCompanyAcct = localStorage.getItem('bankfile_companyAccount') || '';
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthParts = month.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const defaultBatchRef = monthNames[Number(monthParts[1]) - 1] + '-' + monthParts[0];

  step2.innerHTML =
    '<div class="card" style="background:#f8fafc; margin-top:14px;">' +
    '<h4 style="margin-top:0;">Step 2 — Company & Batch Details</h4>' +
    '<div class="form-grid">' +
    '  <div><label>Company Bank BIC</label><input id="bf-company-bic" value="' + escapeHtml(savedCompanyBIC) + '" /></div>' +
    '  <div><label>Company Account Number</label><input id="bf-company-acct" value="' + escapeHtml(savedCompanyAcct) + '" placeholder="Your OCBC account number" /></div>' +
    '  <div><label>Batch Reference</label><input id="bf-batch-ref" value="' + escapeHtml(defaultBatchRef) + '" maxlength="8" /></div>' +
    '  <div><label>Value Date</label><input id="bf-value-date" type="date" value="' + todayStr + '" /></div>' +
    '</div>' +
    '<button class="btn-sm" id="generate-bankfile-btn" style="margin-top:16px;">⬇ Generate & Download Bank File</button>' +
    '<div id="bankfile-result" style="margin-top:12px;"></div>' +
    '</div>';

  document.getElementById('generate-bankfile-btn').onclick = async function () {
    const btn = this;
    const resultBox = document.getElementById('bankfile-result');
    const companyBIC = document.getElementById('bf-company-bic').value.trim().toUpperCase();
    const companyAccount = document.getElementById('bf-company-acct').value.trim();
    const batchRef = document.getElementById('bf-batch-ref').value.trim();
    const valueDateInput = document.getElementById('bf-value-date').value;

    if (!companyAccount) { resultBox.innerHTML = '<div class="error-box">Enter your Company Account Number.</div>'; return; }

    localStorage.setItem('bankfile_companyBIC', companyBIC);
    localStorage.setItem('bankfile_companyAccount', companyAccount);

    btn.disabled = true;
    resultBox.innerHTML = '<p class="muted">Generating…</p>';
    try {
      const params = {
        month: month,
        empIds: selectedIds,
        bankDetails: Object.values(uploadedBankDetails || {}),
        companyBIC: companyBIC,
        companyAccountNumber: companyAccount,
        batchRef: batchRef,
        valueDate: valueDateInput,
      };
      const res = await api('generateBankFileText', { params: params });
      if (!res.includedCount) {
        resultBox.innerHTML = '<div class="error-box">Nothing to generate — every selected employee was skipped. See reasons below.</div>' + renderSkippedList(res.skipped);
        return;
      }
      const blob = new Blob([res.fileText], { type: 'text/plain;charset=ascii' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'OCBC_GIRO_FAST_' + month + '_' + Date.now() + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      let html = '<div class="banner success" style="display:block; position:static;">Bank file downloaded — ' +
        res.includedCount + ' employee(s), total ' + fmtMoney(res.totalAmount) + '.</div>';
      if (res.skipped && res.skipped.length) {
        html += '<p style="margin-top:10px;"><b>' + res.skipped.length + ' selected employee(s) were skipped:</b></p>' + renderSkippedList(res.skipped);
      }
      resultBox.innerHTML = html;
    } catch (err) {
      resultBox.innerHTML = '<div class="error-box">' + escapeHtml(err.message) + '</div>';
    } finally {
      btn.disabled = false;
    }
  };
}

function renderSkippedList(skipped) {
  if (!skipped || !skipped.length) return '';
  return '<ul>' + skipped.map(function (s) {
    return '<li>' + escapeHtml(s.EmpID) + (s.Name ? ' — ' + escapeHtml(s.Name) : '') + ': ' + escapeHtml(s.reason) + '</li>';
  }).join('') + '</ul>';
}

// Mirrors payDivisorDays_ in Code.gs: most employees are paid based on actual
// calendar days in the month, but an employee with PermittedWorkingDays set
// (and under 30) is always divided by that fixed cycle instead.
function payDivisorDays(month, emp) {
  const permitted = Number(emp.PermittedWorkingDays) || 0;
  const calendarDays = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0).getDate();
  if (permitted > 0 && permitted < 30) return permitted;
  return calendarDays;
}

// ---------- Print Payslips (one sheet per selected employee, matching your existing template) ----------
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthNameYear(monthStr) {
  const parts = monthStr.split('-');
  return { name: MONTH_NAMES_FULL[Number(parts[1]) - 1], year: parts[0] };
}
function previousMonthStr(monthStr) {
  const parts = monthStr.split('-');
  let y = Number(parts[0]), m = Number(parts[1]) - 1;
  if (m < 1) { m = 12; y -= 1; }
  return y + '-' + String(m).padStart(2, '0');
}

function renderPayslipsCard(month) {
  const card = document.getElementById('payslips-card');
  card.innerHTML =
    '<h3 style="margin-top:0;">Print Payslips</h3>' +
    '<p class="muted">Tick employees in the table above, then generate a workbook with one payslip sheet per ' +
    'employee — same layout as your existing payslips, ready to open and print. ' +
    '<span class="small">(Note: this uses the same free spreadsheet library as other downloads in this app, which ' +
    'can write cell values, merged cells, and column widths faithfully, but not bold/heading styling — the numbers ' +
    'and layout will be correct, just plainer-looking than a hand-formatted payslip.)</span></p>' +
    '<p id="payslips-selection-summary" class="muted" style="font-weight:bold;"></p>' +
    '<button class="btn-sm" id="print-payslips-btn">⬇ Generate Payslips for Selected Employees</button>' +
    '<div id="payslips-result" style="margin-top:12px;"></div>';

  updatePayslipsSelectionSummary();

  document.getElementById('print-payslips-btn').onclick = function () {
    const resultBox = document.getElementById('payslips-result');
    const selectedIds = Array.from(selectedEmpIdsForBankFile);
    if (!selectedIds.length) { resultBox.innerHTML = '<div class="error-box">Select at least one employee in the table above first.</div>'; return; }
    try {
      generatePayslipsWorkbook(selectedIds, month);
      resultBox.innerHTML = '<div class="banner success" style="display:block; position:static;">Downloaded payslips for ' + selectedIds.length + ' employee(s).</div>';
    } catch (err) {
      resultBox.innerHTML = '<div class="error-box">' + escapeHtml(err.message) + '</div>';
    }
  };
}

function updatePayslipsSelectionSummary() {
  const el = document.getElementById('payslips-selection-summary');
  if (!el) return;
  el.textContent = selectedEmpIdsForBankFile.size + ' employee(s) selected.';
}

function sanitizeSheetName(name, usedNames) {
  let clean = String(name || 'Employee').replace(/[:\\/?*\[\]]/g, '').trim().substring(0, 31) || 'Employee';
  let final = clean;
  let n = 2;
  while (usedNames.has(final)) {
    const suffix = ' (' + n + ')';
    final = clean.substring(0, 31 - suffix.length) + suffix;
    n++;
  }
  usedNames.add(final);
  return final;
}

function generatePayslipsWorkbook(selectedIds, month) {
  const cur = monthNameYear(month);
  const prev = monthNameYear(previousMonthStr(month));
  const wb = XLSX.utils.book_new();
  const usedNames = new Set();
  let anyIncluded = false;

  selectedIds.forEach(function (empId) {
    const row = lastPayrollRows.find(function (r) { return r.EmpID === empId; });
    const emp = state.employees.find(function (e) { return e.EmpID === empId; });
    if (!row || !emp) return; // no payroll entry this month for this employee — skip silently, nothing to print
    anyIncluded = true;

    let allowances = [];
    try { allowances = JSON.parse(row.AllowancesJSON || '[]'); } catch (e) {}

    const aoa = [
      ['Payslip', ''],
      ['', ''],
      ['Employee Name', emp.Name],
      ['Pay Period', cur.name + ' ' + cur.year],
      [cur.name + ' ' + cur.year + ' Worked Days', Number(row.WorkedDays) || 0],
      ['', ''],
      ['Earnings', ''],
      [cur.name + ' ' + cur.year + ' Basic for no of days worked(Curr Mth)', Number(row.BasicPay) || 0],
      [cur.name + ' ' + cur.year + ' Fixed Allowance for no of days worked(Curr Month)', Number(row.FixedAllowPay) || 0],
      [prev.name + ' ' + prev.year + ' OT(Prev Mth)', Number(row.OTPay) || 0],
    ];
    allowances.forEach(function (a) {
      aoa.push([prev.name + ' ' + prev.year + ' ' + (a.label || 'Allowance') + '(Prev Mth)', Number(a.amount) || 0]);
    });
    aoa.push(['', '']);
    aoa.push(['Deductions', '']);
    aoa.push([cur.name + ' ' + cur.year + ' Other Deduction (Manual)', Number(row.OtherDeductionManual) || 0]);
    aoa.push([cur.name + ' ' + cur.year + ' Advance Deducted', Number(row.AdvanceDeducted) || 0]);
    aoa.push(['', '']);
    aoa.push(['Total Earnings', Number(row.Gross) || 0]);
    aoa.push(['Total Deductions', Number(row.TotalDeductions) || 0]);
    aoa.push(['Net Pay', Number(row.NetPay) || 0]);
    aoa.push(['', '']);
    aoa.push(['Note:', 'This is a system generated payslip.']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }];
    // Best-effort styling — not preserved by this library's XLSX writer, kept
    // in case a future library upgrade (or opening in another tool) honors it.
    if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } };
    for (let r = 0; r < aoa.length; r++) {
      const label = aoa[r][0];
      if (label === 'Earnings' || label === 'Deductions' || label === 'Total Earnings' || label === 'Total Deductions' || label === 'Net Pay' || label === 'Note:') {
        const ref = 'A' + (r + 1);
        if (ws[ref]) ws[ref].s = { font: { bold: true } };
      }
      const bRef = 'B' + (r + 1);
      if (ws[bRef] && typeof aoa[r][1] === 'number') ws[bRef].z = '0.00';
    }

    const sheetName = sanitizeSheetName(emp.Name, usedNames);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  if (!anyIncluded) throw new Error('None of the selected employees have a payroll entry for ' + month + ' yet.');
  XLSX.writeFile(wb, 'Payslips_' + month + '.xlsx');
}


// Used both by the Payroll Entry "Download Excel" button and the Download
// Salary Files screen (which additionally filters by department first).
function buildPayrollWorksheet(rows, month) {
  // Gather every distinct allowance label used this month, so each becomes its own column.
  const allowanceLabels = [];
  const rowAllowanceMaps = rows.map(function (r) {
    let list = [];
    try { list = JSON.parse(r.AllowancesJSON || '[]'); } catch (e) {}
    const map = {};
    list.forEach(function (a) {
      const label = a.label || 'Allowance';
      map[label] = (map[label] || 0) + (Number(a.amount) || 0);
      if (allowanceLabels.indexOf(label) === -1) allowanceLabels.push(label);
    });
    return map;
  });

  const fixedHeaders = [
    'Name', 'EmpID', 'Department', 'Worked Days', 'Pay Divisor Days', 'Fixed Basic (Rate)', 'Fixed Allowance (Rate)', 'OT Rate',
    'OT Hours (Prev Month)', 'Exit This Month?', 'Also Pay Current-Month OT?', 'OT Hours (Current, Exit Only)',
    'Basic Pay', 'Fixed Allowance Pay', 'OT Pay (Prev)', 'OT Pay (Current, Exit)', 'OT Pay (Total)'
  ];
  const headers = fixedHeaders.concat(allowanceLabels, ['Allowances Total', 'Advance Deducted', 'Other Deduction (Manual)', 'Gross', 'Total Deductions', 'Net Pay', 'Notes']);

  const FIXED_COUNT = fixedHeaders.length; // columns before the dynamic allowance columns
  const aoa = [headers];

  rows.forEach(function (r, idx) {
    const emp = state.employees.find(function (e) { return e.EmpID === r.EmpID; }) || {};
    const divisorDays = payDivisorDays(month, emp);
    const row = [
      empName(r.EmpID), r.EmpID, emp.Department || '', Number(r.WorkedDays) || 0, divisorDays,
      Number(emp.BasicRate) || 0, Number(emp.FixedAllowRate) || 0, Number(emp.OTRate) || 0,
      Number(r.OTHoursPrev) || 0, r.ExitFlag || 'N', r.AlsoPayCurrentOT || 'N', Number(r.OTHoursCurrentExit) || 0,
      0, 0, 0, 0, 0 // placeholders for the 5 formula columns — set below
    ];
    allowanceLabels.forEach(function (label) { row.push(rowAllowanceMaps[idx][label] || 0); });
    row.push(0, Number(r.AdvanceDeducted) || 0, Number(r.OtherDeductionManual) || 0, 0, 0, 0, r.Notes || '');
    aoa.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const col = function (i) { return XLSX.utils.encode_col(i); };
  const totalsAcc = {}; // colIndex -> running sum, for the TOTALS row below
  for (let i = 0; i < rows.length; i++) {
    const r = i + 2; // sheet row (1-based, +1 for header)
    const C = col(3), D = col(4), E = col(5), F = col(6), G = col(7), H = col(8), I = col(9), J = col(10), K = col(11);
    const basicPayCol = 12, fixedAllowPayCol = 13, otPrevCol = 14, otCurrCol = 15, otTotalCol = 16;
    const allowStart = FIXED_COUNT; // 0-based index of first allowance column
    const allowEnd = FIXED_COUNT + allowanceLabels.length - 1;
    const allowTotalCol = FIXED_COUNT + allowanceLabels.length;
    const advCol = allowTotalCol + 1, otherDedCol = allowTotalCol + 2, grossCol = allowTotalCol + 3, totalDedCol = allowTotalCol + 4, netCol = allowTotalCol + 5;

    // Compute the real numbers directly in JS (same math as the formulas below)
    // and use THAT as each cell's cached value — not a 0 placeholder. Some
    // spreadsheet apps/viewers don't force a recalculation on open, and a
    // cached 0 would show as "Gross/Net Pay is 0" even though the formula
    // itself is correct and would recalculate to the right number the moment
    // any input cell changes.
    const rawRow = rows[i];
    const emp = state.employees.find(function (e) { return e.EmpID === rawRow.EmpID; }) || {};
    const workedDays = Number(rawRow.WorkedDays) || 0;
    const divisorDays = payDivisorDays(month, emp);
    const basicRate = Number(emp.BasicRate) || 0;
    const allowRate = Number(emp.FixedAllowRate) || 0;
    const otRate = Number(emp.OTRate) || 0;
    const otHoursPrev = Number(rawRow.OTHoursPrev) || 0;
    const otHoursCurr = Number(rawRow.OTHoursCurrentExit) || 0;
    const isExitWithCurrOT = rawRow.ExitFlag === 'Y' && rawRow.AlsoPayCurrentOT === 'Y';

    const basicPayVal = round2(divisorDays ? (basicRate / divisorDays) * workedDays : 0);
    const fixedAllowPayVal = round2(divisorDays ? (allowRate / divisorDays) * workedDays : 0);
    const otPrevVal = round2(otHoursPrev * otRate);
    const otCurrVal = round2(isExitWithCurrOT ? otHoursCurr * otRate : 0);
    const otTotalVal = round2(otPrevVal + otCurrVal);
    const allowTotalVal = round2(allowanceLabels.reduce(function (s, label) { return s + (rowAllowanceMaps[i][label] || 0); }, 0));
    const advVal = round2(Number(rawRow.AdvanceDeducted) || 0);
    const otherDedVal = round2(Number(rawRow.OtherDeductionManual) || 0);
    const grossVal = round2(basicPayVal + fixedAllowPayVal + otTotalVal + allowTotalVal);
    const totalDedVal = round2(advVal + otherDedVal);
    const netVal = round2(grossVal - totalDedVal);

    ws[col(basicPayCol) + r] = { t: 'n', v: basicPayVal, f: `${E}${r}/${D}${r}*${C}${r}` };
    ws[col(fixedAllowPayCol) + r] = { t: 'n', v: fixedAllowPayVal, f: `${F}${r}/${D}${r}*${C}${r}` };
    ws[col(otPrevCol) + r] = { t: 'n', v: otPrevVal, f: `${H}${r}*${G}${r}` };
    ws[col(otCurrCol) + r] = { t: 'n', v: otCurrVal, f: `IF(AND(${I}${r}="Y",${J}${r}="Y"),${K}${r}*${G}${r},0)` };
    ws[col(otTotalCol) + r] = { t: 'n', v: otTotalVal, f: `${col(otPrevCol)}${r}+${col(otCurrCol)}${r}` };
    if (allowanceLabels.length) {
      ws[col(allowTotalCol) + r] = { t: 'n', v: allowTotalVal, f: `SUM(${col(allowStart)}${r}:${col(allowEnd)}${r})` };
    } else {
      ws[col(allowTotalCol) + r] = { t: 'n', v: 0 };
    }
    ws[col(grossCol) + r] = { t: 'n', v: grossVal, f: `${col(basicPayCol)}${r}+${col(fixedAllowPayCol)}${r}+${col(otTotalCol)}${r}+${col(allowTotalCol)}${r}` };
    ws[col(totalDedCol) + r] = { t: 'n', v: totalDedVal, f: `${col(advCol)}${r}+${col(otherDedCol)}${r}` };
    ws[col(netCol) + r] = { t: 'n', v: netVal, f: `${col(grossCol)}${r}-${col(totalDedCol)}${r}` };

    // Accumulate for the TOTALS row (real sums, same principle as above).
    [basicPayCol, fixedAllowPayCol, otPrevCol, otCurrCol, otTotalCol, allowTotalCol, advCol, otherDedCol, grossCol, totalDedCol, netCol]
      .forEach(function (c, idx) {
        const vals = [basicPayVal, fixedAllowPayVal, otPrevVal, otCurrVal, otTotalVal, allowTotalVal, advVal, otherDedVal, grossVal, totalDedVal, netVal];
        totalsAcc[c] = (totalsAcc[c] || 0) + vals[idx];
      });
    allowanceLabels.forEach(function (label, li) {
      const c = FIXED_COUNT + li;
      totalsAcc[c] = (totalsAcc[c] || 0) + (rowAllowanceMaps[i][label] || 0);
    });
  }

  // TOTALS row at the bottom, summing every money column with a formula —
  // and, same fix as above, the real summed value as the cached number.
  const totalsRow = rows.length + 2;
  const allowTotalColIdx = FIXED_COUNT + allowanceLabels.length;
  const moneyCols = [12, 13, 14, 15, 16].concat(
    allowanceLabels.map(function (_, i) { return FIXED_COUNT + i; }),
    [allowTotalColIdx, allowTotalColIdx + 1, allowTotalColIdx + 2, allowTotalColIdx + 3, allowTotalColIdx + 4, allowTotalColIdx + 5]
  );
  ws[col(0) + totalsRow] = { t: 's', v: 'TOTAL' };
  moneyCols.forEach(function (c) {
    ws[col(c) + totalsRow] = { t: 'n', v: round2(totalsAcc[c] || 0), f: `SUM(${col(c)}2:${col(c)}${totalsRow - 1})` };
  });
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalsRow, c: headers.length - 1 } });
  return ws;
}

// ---------- Download Excel (with live formulas) for a month's entries ----------
// Rebuilds a spreadsheet in the spirit of your original payslip files — Basic
// Pay, OT Pay, Gross, Total Deductions, and Net Pay are all real Excel formulas
// referencing the rate/input columns in the same row, not just static numbers,
// so you (or your accountant) can open it and see exactly how each figure was
// derived, same as before.
function downloadMonthWorkbook(month) {
  if (!lastPayrollRows.length) { showBanner('No entries yet for ' + month + ' — nothing to download.', 'error'); return; }
  const ws = buildPayrollWorksheet(lastPayrollRows, month);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, month);
  XLSX.writeFile(wb, 'Payroll_' + month + '_with_formulas.xlsx');
}

// ---------- Excel bulk upload ----------
// Known input columns (case-insensitive). Any OTHER column in the sheet is
// treated as an allowance line item, named after its header.
const KNOWN_UPLOAD_COLUMNS = [
  'empid', 'name', 'workeddays', 'othoursprev', 'exitflag', 'alsopaycurrentot',
  'othourscurrentexit', 'advancededucted', 'otherdeductionmanual', 'notes'
];

function renderBulkUploadCard(month) {
  const card = document.getElementById('bulk-upload-card');
  card.innerHTML =
    '<h3 style="margin-top:0;">Bulk Upload for ' + month + ' (Excel)</h3>' +
    '<p class="muted">Download the template, fill in Worked Days / OT Hours / any allowance columns you want ' +
    '(add as many extra columns as you like — each becomes its own allowance line), then upload it back here.</p>' +
    '<button class="btn-sm secondary" id="download-template-btn">Download Template (.xlsx)</button> ' +
    '<input type="file" id="upload-file-input" accept=".xlsx,.xls" style="margin-left:10px;" />' +
    '<div id="upload-preview-area" style="margin-top:14px;"></div>';

  document.getElementById('download-template-btn').onclick = function () { downloadPayrollTemplate(month); };
  document.getElementById('upload-file-input').onchange = function (e) {
    if (e.target.files && e.target.files[0]) handleUploadedFile(e.target.files[0], month);
  };
}

function downloadPayrollTemplate(month) {
  const rows = state.employees.map(function (e) {
    return {
      EmpID: e.EmpID, Name: e.Name, WorkedDays: '', OTHoursPrev: '',
      ExitFlag: 'N', AlsoPayCurrentOT: 'N', OTHoursCurrentExit: '',
      'Bus Fare': '', 'Transport': '', 'Film Allowance': '', 'Project Allowance': '',
      AdvanceDeducted: '', OtherDeductionManual: '', Notes: ''
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, month);
  XLSX.writeFile(wb, 'payroll_template_' + month + '.xlsx');
}

function handleUploadedFile(file, month) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const entries = json.map(function (row) { return rowToEntry(row, month); }).filter(Boolean);
      renderUploadPreview(entries, month);
    } catch (err) {
      showBanner('Could not read that file: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function rowToEntry(row, month) {
  // Build a case-insensitive lookup of the row's actual column names.
  const keyMap = {};
  Object.keys(row).forEach(function (k) { keyMap[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = k; });
  function val(name) { const k = keyMap[name]; return k !== undefined ? row[k] : ''; }

  const empId = String(val('empid') || '').trim();
  if (!empId) return null;

  const allowances = [];
  Object.keys(row).forEach(function (colName) {
    const norm = colName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (KNOWN_UPLOAD_COLUMNS.indexOf(norm) === -1 && row[colName] !== '' && !isNaN(Number(row[colName]))) {
      allowances.push({ label: colName, amount: Number(row[colName]) });
    }
  });

  const advRaw = val('advancededucted');
  return {
    Month: month,
    EmpID: empId,
    WorkedDays: Number(val('workeddays') || 0),
    OTHoursPrev: Number(val('othoursprev') || 0),
    ExitFlag: String(val('exitflag') || 'N').toUpperCase() === 'Y' ? 'Y' : 'N',
    AlsoPayCurrentOT: String(val('alsopaycurrentot') || 'N').toUpperCase() === 'Y' ? 'Y' : 'N',
    OTHoursCurrentExit: Number(val('othourscurrentexit') || 0),
    OtherDeductionManual: Number(val('otherdeductionmanual') || 0),
    AdvanceDeducted: advRaw === '' || advRaw === undefined ? null : Number(advRaw),
    Allowances: allowances,
    Notes: String(val('notes') || ''),
  };
}

function renderUploadPreview(entries, month) {
  const area = document.getElementById('upload-preview-area');
  if (!entries.length) { area.innerHTML = '<p class="muted">No valid rows found (need an EmpID column).</p>'; return; }
  area.innerHTML =
    '<p><b>' + entries.length + ' rows ready to upload for ' + month + '.</b></p>' +
    '<div class="table-wrap" style="max-height:300px;"><table><thead><tr><th>EmpID</th><th>Name</th><th>Worked Days</th>' +
    '<th>OT Hrs (Prev)</th><th>Allowances</th><th>Advance (blank=suggested)</th><th>Other Ded</th></tr></thead><tbody>' +
    entries.map(function (en) {
      return '<tr><td>' + escapeHtml(en.EmpID) + '</td><td>' + escapeHtml(empName(en.EmpID)) + '</td>' +
        '<td>' + en.WorkedDays + '</td><td>' + en.OTHoursPrev + '</td>' +
        '<td>' + en.Allowances.map(function (a) { return a.label + ':' + a.amount; }).join(', ') + '</td>' +
        '<td>' + (en.AdvanceDeducted === null ? '(auto)' : en.AdvanceDeducted) + '</td>' +
        '<td>' + en.OtherDeductionManual + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' +
    '<button class="btn-sm" id="confirm-upload-btn" style="margin-top:12px;">Confirm & Save All ' + entries.length + ' Rows</button>';

  document.getElementById('confirm-upload-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const result = await api('savePayrollBulk', { entries: entries });
      let msg = 'Saved ' + result.saved.length + ' rows.';
      if (result.errors.length) msg += ' ' + result.errors.length + ' failed — see below.';
      showBanner(msg, result.errors.length ? 'error' : 'success');
      if (result.errors.length) {
        area.innerHTML += '<div class="error-box" style="margin-top:10px;">' +
          result.errors.map(function (e) { return escapeHtml(e.EmpID) + ' (' + escapeHtml(e.Month) + '): ' + escapeHtml(e.error); }).join('<br/>') +
          '</div>';
      } else {
        area.innerHTML = '<p class="muted">Upload complete.</p>';
      }
      invalidatePayrollRowsCache();
      await renderPayrollTable(month);
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };
}

// =============================================================================
// VIEW: MONTHLY OVERVIEW & SPIKE DETECTION
// =============================================================================
async function renderOverviewView() {
  const root = document.getElementById('view-root');
  root.innerHTML = '<h2 class="page-title">Monthly Overview & Spike Detection</h2><p class="muted">Loading…</p>';
  const data = await api('getMonthlyOverview');
  if (!data.length) {
    root.innerHTML = '<h2 class="page-title">Monthly Overview & Spike Detection</h2>' +
      '<div class="toolbar"><button class="btn-sm secondary" id="refresh-overview-btn">↻ Refresh</button></div>' +
      '<p>No payroll data yet.</p>';
    document.getElementById('refresh-overview-btn').onclick = renderOverviewView;
    return;
  }

  const months = Object.keys(data[0].byMonth);
  let head = '<tr><th>EmpID</th><th>Name</th>';
  months.forEach(function (m) { head += '<th>Worked Days (' + m + ')</th><th>Net Pay (' + m + ')</th>'; });
  for (let i = 1; i < months.length; i++) head += '<th>% Chg (' + months[i - 1] + '→' + months[i] + ')</th><th>Flag</th>';
  head += '</tr>';

  const rows = data.map(function (emp) {
    let row = '<tr><td>' + escapeHtml(emp.EmpID) + '</td><td>' + escapeHtml(emp.Name) + '</td>';
    months.forEach(function (m) {
      const cell = emp.byMonth[m];
      row += '<td>' + (cell ? cell.WorkedDays : '') + '</td><td>' + (cell ? fmtMoney(cell.NetPay) : '') + '</td>';
    });
    emp.changes.forEach(function (c) {
      let cls = '';
      if (c.flag.indexOf('SPIKE UP') !== -1) cls = 'flag-spike-up';
      else if (c.flag.indexOf('SPIKE DOWN') !== -1) cls = 'flag-spike-down';
      else if (c.flag.indexOf('Leave') !== -1) cls = 'flag-leave';
      row += '<td>' + (c.pctChange !== null ? fmtPct(c.pctChange) : '') + '</td>' +
             '<td class="' + cls + '">' + escapeHtml(c.flag) + '</td>';
    });
    return row + '</tr>';
  }).join('');

  root.innerHTML =
    '<h2 class="page-title">Monthly Overview & Spike Detection</h2>' +
    '<p class="muted">Green = pay jumped sharply without matching attendance change. Red = pay dropped sharply without matching attendance change. Yellow = explained by leave/attendance. ' +
    'New months appear automatically once payroll entries exist for them — click Refresh after saving a new month\'s entries.</p>' +
    '<div class="toolbar"><button class="btn-sm secondary" id="refresh-overview-btn">↻ Refresh</button></div>' +
    '<div class="table-wrap"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
  document.getElementById('refresh-overview-btn').onclick = renderOverviewView;
}

// =============================================================================
// VIEW: OT & BASIC TRACKER
// =============================================================================
async function renderOTTrackerView() {
  const root = document.getElementById('view-root');
  root.innerHTML = '<h2 class="page-title">OT & Basic Paid Tracker</h2><p class="muted">Loading…</p>';
  const data = await api('getOTBasicTracker');
  if (!data.length) {
    root.innerHTML = '<h2 class="page-title">OT & Basic Paid Tracker</h2>' +
      '<div class="toolbar"><button class="btn-sm secondary" id="refresh-ot-btn">↻ Refresh</button></div>' +
      '<p>No payroll data yet.</p>';
    document.getElementById('refresh-ot-btn').onclick = renderOTTrackerView;
    return;
  }
  const months = Object.keys(data[0].byMonth);
  let head = '<tr><th>EmpID</th><th>Name</th>';
  months.forEach(function (m) { head += '<th>' + m + '</th>'; });
  head += '</tr>';
  const rows = data.map(function (emp) {
    let row = '<tr><td>' + escapeHtml(emp.EmpID) + '</td><td>' + escapeHtml(emp.Name) + '</td>';
    months.forEach(function (m) {
      const cell = emp.byMonth[m];
      row += '<td>' + (cell ? escapeHtml(cell.status) : '—') + '</td>';
    });
    return row + '</tr>';
  }).join('');
  root.innerHTML =
    '<h2 class="page-title">OT & Basic Paid Tracker</h2>' +
    '<p class="muted">New months appear automatically once payroll entries exist for them — click Refresh after saving a new month\'s entries.</p>' +
    '<div class="toolbar"><button class="btn-sm secondary" id="refresh-ot-btn">↻ Refresh</button></div>' +
    '<div class="table-wrap"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
  document.getElementById('refresh-ot-btn').onclick = renderOTTrackerView;
}

// =============================================================================
// VIEW: DEPARTMENT SUMMARY
// =============================================================================
let deptCharts = []; // track Chart.js instances so we can destroy them on re-render

async function renderDeptSummaryView() {
  const data = await api('getDeptSummary');
  const root = document.getElementById('view-root');
  if (!data.length) { root.innerHTML = '<h2 class="page-title">Department Summary</h2><p>No employees yet.</p>'; return; }
  const months = Object.keys(data[0].byMonth);

  let head = '<tr><th>Department</th><th>Active Headcount (current)</th>';
  months.forEach(function (m) { head += '<th>Payroll Entries (' + m + ')</th><th>Gross (' + m + ')</th><th>OT (' + m + ')</th><th>Net (' + m + ')</th><th>Advance Recovered (' + m + ')</th>'; });
  head += '</tr>';
  const rows = data.map(function (d) {
    let row = '<tr><td>' + escapeHtml(d.department) + '</td><td><b>' + (months.length ? d.byMonth[months[0]].headcount : '') + '</b></td>';
    months.forEach(function (m) {
      const c = d.byMonth[m];
      row += '<td>' + c.payrollEntriesThisMonth + '</td><td>' + fmtMoney(c.totalGross) + '</td><td>' + fmtMoney(c.totalOT) + '</td><td>' + fmtMoney(c.totalNet) + '</td><td>' + fmtMoney(c.totalAdvanceRecovered) + '</td>';
    });
    return row + '</tr>';
  }).join('');

  root.innerHTML =
    '<h2 class="page-title">Department Summary</h2>' +
    '<p class="muted">Set each employee\'s Department on the Employee Master tab to populate this. ' +
    '<b>Active Headcount</b> reflects who currently works in each department right now (Employee Master, excluding ' +
    'anyone marked Exited) — it does not depend on whether that month\'s payroll has been entered yet. ' +
    '<b>Payroll Entries</b> per month shows how many of them have actually been paid so far that month, which will ' +
    'naturally be lower than headcount until you finish entering everyone. Bar charts are rounded to the nearest ' +
    '₹1,000 for readability — see the table below for exact figures.</p>' +
    '<div class="card"><h3>Total Net Salary Paid by Department, by Month</h3><canvas id="dept-net-chart" height="110"></canvas></div>' +
    '<div class="card"><h3>Total OT Salary Paid by Department, by Month</h3><canvas id="dept-ot-chart" height="110"></canvas></div>' +
    '<div class="card"><h3>Active Headcount by Department (current roster)</h3><canvas id="dept-headcount-chart" height="180"></canvas></div>' +
    '<div class="card"><h3>Net Pay Trend by Department</h3><canvas id="dept-trend-chart" height="100"></canvas></div>' +
    '<div class="table-wrap"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';

  deptCharts.forEach(function (c) { c.destroy(); });
  deptCharts = [];

  const labels = data.map(function (d) { return d.department; });
  const palette = ['#1F4E78', '#c0392b', '#27ae60', '#e67e22', '#8e44ad', '#16a085', '#2980b9', '#d35400', '#7f8c8d', '#c2185b', '#00796b'];
  const round1000 = function (v) { return Math.round((v || 0) / 1000) * 1000; };

  function monthGroupedBarChart(canvasId, titlePrefix, field) {
    return new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: months.map(function (m, i) {
          return {
            label: m,
            data: data.map(function (d) { return round1000(d.byMonth[m][field]); }),
            backgroundColor: palette[i % palette.length],
          };
        })
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y.toLocaleString(); } } }
        },
        scales: { y: { ticks: { callback: function (v) { return Number(v).toLocaleString(); } } } }
      }
    });
  }

  // Bar: Total Net Salary by department, grouped by month, rounded to nearest 1000
  deptCharts.push(monthGroupedBarChart('dept-net-chart', 'Net Pay', 'totalNet'));

  // Bar: Total OT Salary by department, grouped by month, rounded to nearest 1000
  deptCharts.push(monthGroupedBarChart('dept-ot-chart', 'OT Pay', 'totalOT'));

  // Bar: Headcount by department, latest month (not a money figure, no rounding needed)
  deptCharts.push(new Chart(document.getElementById('dept-headcount-chart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Active Headcount',
        data: data.map(function (d) { return d.byMonth[months[0]] ? d.byMonth[months[0]].headcount : 0; }),
        backgroundColor: '#c0392b',
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  }));

  // Line: Net Pay trend per department across all months
  deptCharts.push(new Chart(document.getElementById('dept-trend-chart'), {
    type: 'line',
    data: {
      labels: months,
      datasets: data.map(function (d, i) {
        return {
          label: d.department,
          data: months.map(function (m) { return d.byMonth[m].totalNet; }),
          borderColor: palette[i % palette.length],
          backgroundColor: palette[i % palette.length],
          fill: false,
          tension: 0.2,
        };
      })
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  }));
}
// =============================================================================
// VIEW: EXIT / FINAL SETTLEMENT LOG
// =============================================================================
async function renderExitLogView() {
  const data = await api('getExitLog');
  const root = document.getElementById('view-root');
  root.innerHTML =
    '<h2 class="page-title">Exit / Final Settlement Log</h2>' +
    '<p class="muted">Automatically lists every payroll entry marked "Exit This Month = Y" in Payroll Entry.</p>' +
    '<div class="table-wrap"><table><thead><tr><th>Month</th><th>EmpID</th><th>Name</th><th>Current-Month OT Also Paid?</th>' +
    '<th>OT Hrs (Current, Exit)</th><th>Basic Pay</th><th>OT Pay (Total)</th><th>Net Pay</th><th>Notes</th></tr></thead><tbody>' +
    data.map(function (r) {
      return '<tr><td>' + escapeHtml(r.Month) + '</td><td>' + escapeHtml(r.EmpID) + '</td><td>' + escapeHtml(r.Name) + '</td>' +
        '<td>' + escapeHtml(r.AlsoPayCurrentOT) + '</td><td>' + escapeHtml(r.OTHoursCurrentExit) + '</td>' +
        '<td>' + fmtMoney(r.BasicPay) + '</td><td>' + fmtMoney(r.OTPay) + '</td><td>' + fmtMoney(r.NetPay) + '</td>' +
        '<td>' + escapeHtml(r.Notes) + '</td></tr>';
    }).join('') +
    '</tbody></table></div>';
}

// =============================================================================
// VIEW: ADVANCE BALANCES (read-only, both roles)
// =============================================================================
async function renderBalancesView() {
  const data = await api('getAdvanceBalances');
  const root = document.getElementById('view-root');
  root.innerHTML =
    '<h2 class="page-title">Advance Balances</h2>' +
    '<p class="muted">Computed automatically: Total Given (from the Advance Ledger — every advance an employee has ' +
    'been given, added up, even if a new one was given before the last one was fully repaid) minus Total Recovered ' +
    '(from Payroll Entry deductions). Click "View History" for a full chronological record of when each advance was ' +
    'given and when it was deducted, with a running balance after each event.</p>' +
    '<div class="table-wrap"><table><thead><tr><th>EmpID</th><th>Name</th><th># Advances Given</th><th>Total Given</th><th>Total Recovered</th><th>Outstanding</th><th>Deducted Months History</th><th></th></tr></thead><tbody>' +
    data.filter(function (r) { return r.TotalGiven > 0 || r.Outstanding !== 0; }).map(function (r) {
      return '<tr><td>' + escapeHtml(r.EmpID) + '</td><td>' + escapeHtml(r.Name) + '</td>' +
        '<td>' + r.GivenCount + '</td>' +
        '<td>' + fmtMoney(r.TotalGiven) + '</td><td>' + fmtMoney(r.TotalRecovered) + '</td>' +
        '<td><b>' + fmtMoney(r.Outstanding) + '</b></td>' +
        '<td>' + escapeHtml(r.DeductedMonthsHistory) + '</td>' +
        '<td><button class="btn-sm secondary view-history-btn" data-empid="' + escapeHtml(r.EmpID) + '" data-name="' + escapeHtml(r.Name) + '" style="padding:4px 10px; font-size:12px;">View History</button></td>' +
        '</tr>';
    }).join('') +
    '</tbody></table></div>' +
    '<div id="advance-history-panel" style="margin-top:20px;"></div>';

  document.querySelectorAll('.view-history-btn').forEach(function (btn) {
    btn.onclick = function () {
      loadAdvanceHistory(btn.getAttribute('data-empid'), btn.getAttribute('data-name'));
    };
  });
}

async function loadAdvanceHistory(empId, name) {
  const panel = document.getElementById('advance-history-panel');
  panel.innerHTML = '<div class="card"><p class="muted">Loading history for ' + escapeHtml(name) + '…</p></div>';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  try {
    const history = await api('getAdvanceHistory', { empId: empId });
    if (!history.length) {
      panel.innerHTML = '<div class="card"><h3 style="margin-top:0;">' + escapeHtml(name) + ' — Advance History</h3><p class="muted">No advance activity found.</p></div>';
      return;
    }
    panel.innerHTML =
      '<div class="card">' +
      '<h3 style="margin-top:0;">' + escapeHtml(name) + ' (' + escapeHtml(empId) + ') — Advance History</h3>' +
      '<p class="muted small">Every advance given and every payroll deduction, in date order, with the running ' +
      'balance after each one. (Within the same month, a "Deducted" entry is dated the 1st for sorting purposes — ' +
      'only the month itself is tracked for payroll deductions, so exact day-of-month ordering against a "Given" ' +
      'entry that same month is approximate; the running balance total is always exact.)</p>' +
      '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Notes</th><th>By</th><th>Running Balance</th></tr></thead><tbody>' +
      history.map(function (h) {
        const cls = h.type === 'Given' ? '' : 'flag-leave';
        return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' +
          '<td>' + escapeHtml(h.date) + '</td>' +
          '<td>' + (h.type === 'Given' ? '<b style="color:#065f46;">Given</b>' : '<b style="color:#7a5b00;">Deducted</b>') + '</td>' +
          '<td>' + fmtMoney(h.amount) + '</td>' +
          '<td>' + escapeHtml(h.notes) + '</td>' +
          '<td>' + escapeHtml(h.enteredBy) + '</td>' +
          '<td><b>' + fmtMoney(h.runningBalance) + '</b></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '</div>';
  } catch (err) {
    panel.innerHTML = '<div class="error-box">' + escapeHtml(err.message) + '</div>';
  }
}

// =============================================================================
// VIEW: ADVANCE LEDGER (Owner only — the "key it in yourself" tab)
// =============================================================================
async function renderLedgerView() {
  const isAdmin = state.role === 'SuperAdmin';
  const root = document.getElementById('view-root');
  root.innerHTML =
    '<h2 class="page-title">Advance Ledger</h2>' +
    '<p class="muted">Every time an employee is given an advance, record it here. It will start auto-deducting from ' +
    'their next payroll entry. ' +
    (isAdmin
      ? '<b>As Super Admin, entries you record apply immediately, and you can edit any existing row\'s Date, Amount, or Notes directly in the table below.</b>'
      : '<b>Entries you record are submitted for Super Admin approval</b> and won\'t affect anyone\'s balance until reviewed.') +
    '</p>' +
    '<div class="card">' +
    '  <div class="form-grid">' +
    '    <div><label>Employee</label><select id="l-empid">' +
           state.employees.map(function (e) { return '<option value="' + e.EmpID + '">' + escapeHtml(e.EmpID + ' — ' + e.Name) + '</option>'; }).join('') +
    '    </select></div>' +
    '    <div><label>Date Given</label><input id="l-date" type="date" /></div>' +
    '    <div><label>Amount</label><input id="l-amount" type="number" step="0.01" /></div>' +
    '    <div style="grid-column: 1/-1;"><label>Reason / Notes</label><input id="l-notes" type="text" /></div>' +
    '  </div>' +
    '  <button class="btn-sm" id="add-advance-btn" style="margin-top:14px;">' + (isAdmin ? 'Record Advance' : 'Submit for Approval') + '</button>' +
    '</div>' +
    (isAdmin ? '' : '<div class="card" id="my-adv-requests-card"><h3>My Recent Requests</h3><div id="my-adv-requests"></div></div>') +
    '<div class="table-wrap"><table id="ledger-table"><thead></thead><tbody></tbody></table></div>';

  document.getElementById('add-advance-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    try {
      const entry = {
        EmpID: document.getElementById('l-empid').value,
        Date: document.getElementById('l-date').value,
        Amount: Number(document.getElementById('l-amount').value || 0),
        Notes: document.getElementById('l-notes').value,
      };
      if (!entry.Date || !entry.Amount) throw new Error('Date and Amount are required.');
      const res = await api('addAdvanceEntry', { entry: entry });
      if (res.pending) {
        showBanner('Submitted — awaiting Super Admin approval.', 'success');
        await loadMyAdvanceRequests();
      } else {
        showBanner('Advance recorded.', 'success');
      }
      document.getElementById('l-amount').value = '';
      document.getElementById('l-notes').value = '';
      await loadLedgerTable();
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };

  if (!isAdmin) await loadMyAdvanceRequests();
  await loadLedgerTable();
}

async function loadMyAdvanceRequests() {
  const box = document.getElementById('my-adv-requests');
  if (!box) return;
  try {
    const all = await api('getMyRequests');
    const mine = all.filter(function (r) { return r.TargetSheet === 'AdvanceLedger'; });
    box.innerHTML = mine.length
      ? '<table><thead><tr><th>Submitted</th><th>EmpID</th><th>Status</th><th>Notes</th></tr></thead><tbody>' +
        mine.map(function (r) {
          return '<tr><td>' + escapeHtml(String(r.Timestamp).slice(0, 16).replace('T', ' ')) + '</td>' +
            '<td>' + escapeHtml(r.EmpID) + '</td><td>' + escapeHtml(r.Status) + '</td><td>' + escapeHtml(r.ReviewNotes || '') + '</td></tr>';
        }).join('') + '</tbody></table>'
      : '<p class="muted">No requests yet.</p>';
  } catch (e) { box.innerHTML = ''; }
}

async function loadLedgerTable() {
  const rows = await api('getAdvanceLedger');
  const isAdmin = state.role === 'SuperAdmin';
  const table = document.getElementById('ledger-table');
  table.querySelector('thead').innerHTML = '<tr><th>Date</th><th>EmpID</th><th>Name</th><th>Amount</th><th>Notes</th><th>Entered By</th>' +
    (isAdmin ? '<th></th>' : '') + '</tr>';
  table.querySelector('tbody').innerHTML = rows.slice().reverse().map(function (r) {
    if (isAdmin) {
      return '<tr data-row="' + r._row + '" data-empid="' + escapeHtml(r.EmpID) + '">' +
        '<td><input type="date" class="ledg-date" value="' + escapeHtml(String(r.Date).substring(0, 10)) + '" style="width:130px" /></td>' +
        '<td>' + escapeHtml(r.EmpID) + '</td>' +
        '<td>' + escapeHtml(r.Name) + '</td>' +
        '<td><input type="number" step="0.01" class="ledg-amount" value="' + r.Amount + '" style="width:90px" /></td>' +
        '<td><input type="text" class="ledg-notes" value="' + escapeHtml(r.Notes) + '" style="width:180px" /></td>' +
        '<td>' + escapeHtml(r.EnteredBy) + '</td>' +
        '<td><button class="btn-sm secondary ledg-save-btn">Save</button></td>' +
        '</tr>';
    }
    return '<tr><td>' + escapeHtml(String(r.Date).substring(0, 10)) + '</td><td>' + escapeHtml(r.EmpID) + '</td>' +
      '<td>' + escapeHtml(r.Name) + '</td><td>' + fmtMoney(r.Amount) + '</td><td>' + escapeHtml(r.Notes) + '</td>' +
      '<td>' + escapeHtml(r.EnteredBy) + '</td></tr>';
  }).join('');

  if (isAdmin) {
    table.querySelectorAll('.ledg-save-btn').forEach(function (btn) {
      btn.onclick = async function () {
        const tr = btn.closest('tr');
        const entry = {
          _row: tr.getAttribute('data-row'),
          EmpID: tr.getAttribute('data-empid'),
          Date: tr.querySelector('.ledg-date').value,
          Amount: Number(tr.querySelector('.ledg-amount').value || 0),
          Notes: tr.querySelector('.ledg-notes').value,
        };
        btn.disabled = true;
        try {
          await api('updateAdvanceEntry', { entry: entry });
          showBanner('Updated. If this affects an already-paid month, run Admin → Recalculate All Payroll.', 'success');
        } catch (err) {
          showBanner(err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      };
    });
  }
}

// =============================================================================
// VIEW: IMPORT ADVANCE LEDGER (Super Admin only — review & confirm name matches)
// =============================================================================
// Simple fuzzy matching, done entirely client-side: normalize each name,
// sort its words alphabetically (so word order / abbreviation differences
// like "K.CHANDRAN" vs "KARUPPIAH CHANDRAN" line up better), then score
// similarity with a Levenshtein-distance ratio. This is a STARTING SUGGESTION
// only — the Owner reviews and can override every single row before anything
// is written, since getting advance mapped to the wrong person is the one
// mistake that really matters here.
function normalizeNameForMatch(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokenSortName(s) {
  return normalizeNameForMatch(s).split(' ').filter(Boolean).sort().join(' ');
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[n];
}
function nameSimilarity(a, b) {
  const ta = tokenSortName(a), tb = tokenSortName(b);
  const maxLen = Math.max(ta.length, tb.length);
  if (maxLen === 0) return 0;
  return Math.round((1 - levenshtein(ta, tb) / maxLen) * 100);
}
function bestEmployeeMatch(name, employees) {
  let best = null, bestScore = -1;
  employees.forEach(function (e) {
    const score = nameSimilarity(name, e.Name);
    if (score > bestScore) { bestScore = score; best = e; }
  });
  return { empId: best ? best.EmpID : null, name: best ? best.Name : null, score: bestScore };
}

let importAdvanceRows = []; // working state for the review table

async function renderImportAdvanceView() {
  const root = document.getElementById('view-root');
  root.innerHTML = '<h2 class="page-title">Import Advance Ledger</h2><p class="muted">Loading…</p>';

  const candidates = await api('getAdvanceImportCandidates');
  const employees = state.employees.slice().sort(function (a, b) { return a.Name.localeCompare(b.Name); });

  importAdvanceRows = candidates.map(function (c, idx) {
    const match = bestEmployeeMatch(c.Name, employees);
    return {
      idx: idx,
      ledgerName: c.Name,
      advanceTaken: c.AdvanceTaken,
      paidMonthRaw: c.PaidMonthRaw,
      parsedDate: c.ParsedDate,
      balance: c.Balance,
      suggestedEmpId: match.empId,
      score: match.score,
      // working fields the Owner can edit:
      empId: match.score >= 95 ? match.empId : '', // pre-fill the SUGGESTION for near-exact matches, but never auto-tick it
      amount: c.AdvanceTaken,
      date: c.ParsedDate,
      notes: c.PaidMonthRaw ? ('Source "Paid Month": ' + c.PaidMonthRaw) : '',
      included: false, // every single row starts unticked — nothing is pre-approved, ever
    };
  });
  importAdvanceRows.sort(function (a, b) { return a.score - b.score; }); // worst matches first — most in need of review

  const employeeOptions = '<option value="">— not this employee / skip —</option>' +
    employees.map(function (e) { return '<option value="' + e.EmpID + '">' + escapeHtml(e.EmpID + ' — ' + e.Name) + '</option>'; }).join('');

  root.innerHTML =
    '<h2 class="page-title">Import Advance Ledger</h2>' +
    '<p class="muted">' + candidates.length + ' rows from your uploaded ledger, sorted worst-match-first. ' +
    '<b>Every row starts unticked — nothing is pre-approved.</b> Review each one: confirm or change the mapped ' +
    'employee, adjust the amount/date/notes if needed, then tick "Include" yourself. Rows left unmapped (blank ' +
    'employee) are skipped entirely — nothing gets written for them. When you apply, every confirmed employee\'s ' +
    'OLD ledger entries (including any estimated ones from before) are removed first, then replaced with exactly ' +
    'what you confirmed here.</p>' +
    '<div class="toolbar">' +
    '  <button class="btn-sm secondary" id="clear-ledger-btn">Clear Entire Advance Ledger First (optional)</button>' +
    '  <span id="clear-ledger-result" class="muted small"></span>' +
    '</div>' +
    '<div class="toolbar">' +
    '  <button class="btn-sm secondary" id="select-high-conf-btn">Tick all 95+ confidence matches (' +
         importAdvanceRows.filter(function (r) { return r.score >= 95; }).length + ')</button>' +
    '  <button class="btn-sm secondary" id="select-none-btn">Untick All</button>' +
    '  <span id="selection-count" class="muted" style="font-weight:bold; margin-left:12px;"></span>' +
    '</div>' +
    '<div class="table-wrap" style="max-height:65vh;"><table><thead><tr>' +
    '<th>Include</th><th>Ledger Name</th><th>Score</th><th>Map to Employee</th><th>Amount</th><th>Date Given</th>' +
    '<th>Notes</th><th>Source: Paid Month</th><th>Source: Balance</th></tr></thead><tbody id="import-adv-tbody"></tbody></table></div>' +
    '<button class="btn-sm" id="apply-imports-btn" style="margin-top:16px;">Apply All Included Rows</button>' +
    '<div id="apply-imports-result" style="margin-top:12px;"></div>';

  function updateSelectionCount() {
    const n = importAdvanceRows.filter(function (r) { return r.included; }).length;
    document.getElementById('selection-count').textContent = n + ' row' + (n === 1 ? '' : 's') + ' currently ticked for Include.';
  }

  const tbody = document.getElementById('import-adv-tbody');
  tbody.innerHTML = importAdvanceRows.map(function (r) {
    let scoreClass = 'flag-spike-down';
    if (r.score >= 90) scoreClass = 'flag-spike-up';
    else if (r.score >= 60) scoreClass = 'flag-leave';
    return '<tr data-idx="' + r.idx + '">' +
      '<td><input type="checkbox" class="ia-include" ' + (r.included ? 'checked' : '') + ' /></td>' +
      '<td>' + escapeHtml(r.ledgerName) + '</td>' +
      '<td class="' + scoreClass + '">' + r.score + '</td>' +
      '<td><select class="ia-empid" style="min-width:220px;">' + employeeOptions + '</select></td>' +
      '<td><input type="number" class="ia-amount" step="0.01" value="' + r.amount + '" style="width:90px" /></td>' +
      '<td><input type="date" class="ia-date" value="' + (r.date || '') + '" style="width:140px" /></td>' +
      '<td><input type="text" class="ia-notes" value="' + escapeHtml(r.notes) + '" style="width:200px" /></td>' +
      '<td class="muted small">' + escapeHtml(r.paidMonthRaw) + '</td>' +
      '<td class="muted small">' + fmtMoney(r.balance) + '</td>' +
      '</tr>';
  }).join('');
  updateSelectionCount();

  document.getElementById('select-high-conf-btn').onclick = function () {
    importAdvanceRows.forEach(function (r) {
      if (r.score >= 95) {
        r.included = true;
        const cb = tbody.querySelector('tr[data-idx="' + r.idx + '"] .ia-include');
        if (cb) cb.checked = true;
      }
    });
    updateSelectionCount();
  };
  document.getElementById('select-none-btn').onclick = function () {
    importAdvanceRows.forEach(function (r) { r.included = false; });
    tbody.querySelectorAll('.ia-include').forEach(function (cb) { cb.checked = false; });
    updateSelectionCount();
  };

  // Set each row's dropdown to its suggested/pre-filled EmpID (native <select> can't take a
  // pre-selected value via the options string above without walking the DOM once rendered).
  tbody.querySelectorAll('tr').forEach(function (tr) {
    const idx = Number(tr.getAttribute('data-idx'));
    const row = importAdvanceRows[idx];
    const sel = tr.querySelector('.ia-empid');
    sel.value = row.empId || '';
    sel.onchange = function () { row.empId = sel.value; };
    tr.querySelector('.ia-include').onchange = function (e) { row.included = e.target.checked; updateSelectionCount(); };
    tr.querySelector('.ia-amount').oninput = function (e) { row.amount = Number(e.target.value || 0); };
    tr.querySelector('.ia-date').oninput = function (e) { row.date = e.target.value; };
    tr.querySelector('.ia-notes').oninput = function (e) { row.notes = e.target.value; };
  });

  document.getElementById('clear-ledger-btn').onclick = async function () {
    if (!window.confirm('This deletes EVERY row currently in the Advance Ledger, including anything not covered by this import. Continue?')) return;
    const resultBox = document.getElementById('clear-ledger-result');
    resultBox.textContent = 'Clearing…';
    try {
      await api('clearAdvanceLedger');
      resultBox.textContent = 'Ledger cleared.';
    } catch (err) {
      resultBox.textContent = err.message;
    }
  };

  document.getElementById('apply-imports-btn').onclick = async function () {
    const btn = this;
    const resultBox = document.getElementById('apply-imports-result');
    const decisions = importAdvanceRows
      .filter(function (r) { return r.included && r.empId; })
      .map(function (r) { return { ledgerName: r.ledgerName, empId: r.empId, amount: r.amount, date: r.date, notes: r.notes }; });
    if (!decisions.length) { resultBox.innerHTML = '<div class="error-box">Nothing is both ticked "Include" and mapped to an employee.</div>'; return; }
    const names = decisions.map(function (d) { return empName(d.empId) + ' (' + fmtMoney(d.amount) + ')'; });
    const preview = names.length > 8 ? names.slice(0, 8).join(', ') + ', and ' + (names.length - 8) + ' more' : names.join(', ');
    if (!window.confirm('Apply ' + decisions.length + ' confirmed row(s)?\n\n' + preview + '\n\nFor each employee involved, ALL of their existing ledger entries will be replaced.')) return;
    btn.disabled = true;
    resultBox.innerHTML = '<p class="muted">Applying…</p>';
    try {
      const res = await api('applyAdvanceImports', { decisions: decisions });
      resultBox.innerHTML = '<div class="banner success" style="display:block; position:static;">Done — ' +
        res.employeesReplaced + ' employee(s)\' ledgers replaced, ' + res.entriesInserted + ' entr' + (res.entriesInserted === 1 ? 'y' : 'ies') + ' inserted.</div>';
    } catch (err) {
      resultBox.innerHTML = '<div class="error-box">' + escapeHtml(err.message) + '</div>';
    } finally {
      btn.disabled = false;
    }
  };
}

// =============================================================================
// VIEW: EMPLOYEE MASTER (both roles — Accountant changes need approval)
// =============================================================================
async function renderEmployeesView() {
  const employees = await api('getEmployees');
  state.employees = employees;
  const isAdmin = state.role === 'SuperAdmin';
  const root = document.getElementById('view-root');
  root.innerHTML =
    '<h2 class="page-title">Employee Master</h2>' +
    '<p class="muted">Add new joiners here first. Edit a row\'s fields then click Save on that row. ' +
    (isAdmin
      ? '<b>As Super Admin, your changes apply immediately</b> — including Basic Rate and Fixed Allowance (salary increments).'
      : '<b>Your changes are submitted for Super Admin approval</b> and won\'t take effect until reviewed — check "My Recent Requests" below to see the status.') +
    '</p>' +
    '<div class="table-wrap"><table><thead><tr><th>EmpID</th><th>Name</th><th>Department</th><th>Status</th>' +
    '<th>Basic Rate</th><th>Fixed Allow</th><th>Film Rate</th><th>OT Rate</th><th>Permitted Working Days</th><th>Std Instalment</th><th>Notes</th><th></th></tr></thead>' +
    '<tbody id="emp-tbody"></tbody></table></div>' +
    '<p class="muted small">Permitted Working Days: leave blank for the default (actual calendar days in the month —' +
    ' 28-31). Set a number under 30 (e.g. 26) for an employee whose Basic Pay and Fixed Allowance are always divided' +
    ' by that fixed cycle instead of the calendar. A value of 30 or more is ignored and falls back to the calendar default.</p>' +
    '<div class="card" style="margin-top:20px;"><h3>Add New Employee</h3><div class="form-grid">' +
    '<div><label>EmpID</label><input id="new-empid" /></div>' +
    '<div><label>Name</label><input id="new-name" /></div>' +
    '<div><label>Department</label><input id="new-dept" /></div>' +
    '<div><label>Basic Rate</label><input id="new-basic" type="number" /></div>' +
    '<div><label>Fixed Allow Rate</label><input id="new-allow" type="number" /></div>' +
    '<div><label>Film Rate</label><input id="new-film" type="number" /></div>' +
    '<div><label>OT Rate</label><input id="new-ot" type="number" /></div>' +
    '<div><label>Permitted Working Days</label><input id="new-permdays" type="number" placeholder="blank = calendar days" /></div>' +
    '</div><button class="btn-sm" id="add-emp-btn" style="margin-top:12px;">' + (isAdmin ? 'Add Employee' : 'Submit New Employee for Approval') + '</button></div>' +
    '<div class="card" style="margin-top:20px;">' +
    '<h3 style="margin-top:0;">Bulk Upload Employees (Excel)</h3>' +
    '<p class="muted">Download the template, fill in as many rows as you need (add new joiners, or edit existing ' +
    'employees — any row whose EmpID already exists will <b>update</b> that employee instead of adding a duplicate), ' +
    'then upload it back. ' +
    (isAdmin
      ? '<b>As Super Admin, uploaded rows apply immediately.</b>'
      : '<b>Uploaded rows are submitted for Super Admin approval</b>, same as a single edit — nothing changes until reviewed.') +
    '</p>' +
    '<button class="btn-sm secondary" id="download-emp-template-btn">Download Template (.xlsx)</button> ' +
    '<input type="file" id="emp-bulk-upload-input" accept=".xlsx,.xls" style="margin-left:10px;" />' +
    '<div id="emp-bulk-preview-area" style="margin-top:14px;"></div>' +
    '</div>' +
    (isAdmin ? '' : '<div class="card" style="margin-top:20px;" id="my-emp-requests-card"><h3>My Recent Requests</h3><div id="my-emp-requests"></div></div>');

  const tbody = document.getElementById('emp-tbody');
  tbody.innerHTML = employees.map(function (e, idx) {
    return '<tr data-idx="' + idx + '">' +
      '<td>' + escapeHtml(e.EmpID) + '</td>' +
      '<td>' + escapeHtml(e.Name) + '</td>' +
      '<td><input class="e-dept" value="' + escapeHtml(e.Department || '') + '" style="width:110px" /></td>' +
      '<td><select class="e-status"><option ' + (e.Status === 'Active' ? 'selected' : '') + '>Active</option>' +
        '<option ' + (e.Status === 'Exited' ? 'selected' : '') + '>Exited</option>' +
        '<option ' + (e.Status === 'On Leave' ? 'selected' : '') + '>On Leave</option>' +
        '<option ' + (e.Status === 'Overseas Deployed' ? 'selected' : '') + '>Overseas Deployed</option></select></td>' +
      '<td><input class="e-basic" type="number" value="' + (e.BasicRate || 0) + '" style="width:80px" /></td>' +
      '<td><input class="e-allow" type="number" value="' + (e.FixedAllowRate || 0) + '" style="width:80px" /></td>' +
      '<td><input class="e-film" type="number" value="' + (e.FilmRate || 0) + '" style="width:70px" /></td>' +
      '<td><input class="e-ot" type="number" value="' + (e.OTRate || 0) + '" style="width:60px" /></td>' +
      '<td><input class="e-permdays" type="number" value="' + (e.PermittedWorkingDays || '') + '" placeholder="calendar" style="width:80px" /></td>' +
      '<td><input class="e-inst" type="number" value="' + (e.StandardInstalment || '') + '" style="width:80px" /></td>' +
      '<td><input class="e-notes" value="' + escapeHtml(e.Notes || '') + '" style="width:120px" /></td>' +
      '<td><button class="btn-sm secondary save-row-btn">' + (isAdmin ? 'Save' : 'Submit for Approval') + '</button></td>' +
      '</tr>';
  }).join('');

  tbody.querySelectorAll('.save-row-btn').forEach(function (btn) {
    btn.onclick = async function () {
      const tr = btn.closest('tr');
      const idx = Number(tr.getAttribute('data-idx'));
      const e = employees[idx];
      const updated = {
        EmpID: e.EmpID, Name: e.Name,
        Department: tr.querySelector('.e-dept').value,
        Status: tr.querySelector('.e-status').value,
        DateJoined: e.DateJoined || '', DateExited: e.DateExited || '',
        BasicRate: Number(tr.querySelector('.e-basic').value || 0),
        FixedAllowRate: Number(tr.querySelector('.e-allow').value || 0),
        FilmRate: Number(tr.querySelector('.e-film').value || 0),
        OTRate: Number(tr.querySelector('.e-ot').value || 0),
        StandardInstalment: tr.querySelector('.e-inst').value,
        PermittedWorkingDays: tr.querySelector('.e-permdays').value,
        Notes: tr.querySelector('.e-notes').value,
      };
      btn.disabled = true;
      try {
        const res = await api('saveEmployee', { employee: updated });
        if (res.pending) {
          showBanner('Submitted — awaiting Super Admin approval for ' + e.Name + '.', 'success');
          await loadMyEmployeeRequests();
        } else {
          showBanner('Saved ' + e.Name, 'success');
        }
      } catch (err) {
        showBanner(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    };
  });

  document.getElementById('add-emp-btn').onclick = async function () {
    const btn = this;
    const newEmp = {
      EmpID: document.getElementById('new-empid').value.trim(),
      Name: document.getElementById('new-name').value.trim(),
      Department: document.getElementById('new-dept').value.trim(),
      Status: 'Active', DateJoined: '', DateExited: '',
      BasicRate: Number(document.getElementById('new-basic').value || 0),
      FixedAllowRate: Number(document.getElementById('new-allow').value || 0),
      FilmRate: Number(document.getElementById('new-film').value || 0),
      OTRate: Number(document.getElementById('new-ot').value || 0),
      StandardInstalment: '',
      PermittedWorkingDays: document.getElementById('new-permdays').value,
      Notes: '',
    };
    if (!newEmp.EmpID || !newEmp.Name) { showBanner('EmpID and Name are required.', 'error'); return; }
    btn.disabled = true;
    try {
      const res = await api('saveEmployee', { employee: newEmp });
      if (res.pending) {
        showBanner('Submitted — awaiting Super Admin approval for ' + newEmp.Name + '.', 'success');
        await loadMyEmployeeRequests();
      } else {
        showBanner('Added ' + newEmp.Name, 'success');
        await preloadEmployees();
        await renderEmployeesView();
      }
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('download-emp-template-btn').onclick = function () { downloadEmployeeTemplate(); };
  document.getElementById('emp-bulk-upload-input').onchange = function (e) {
    if (e.target.files && e.target.files[0]) handleEmployeeBulkFile(e.target.files[0], isAdmin);
  };

  if (!isAdmin) await loadMyEmployeeRequests();
}

function downloadEmployeeTemplate() {
  const rows = [
    { EmpID: 'E999', Name: 'EXAMPLE — delete this row', Department: 'OFFICE', Status: 'Active',
      BasicRate: 1000, FixedAllowRate: 0, FilmRate: 0, OTRate: 3, PermittedWorkingDays: '', StandardInstalment: '', Notes: '' },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.writeFile(wb, 'Employee_Master_Template.xlsx');
}

function handleEmployeeBulkFile(file, isAdmin) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const existingIds = new Set(state.employees.map(function (emp) { return emp.EmpID; }));

      const parsed = json.map(function (row) {
        const norm = {};
        Object.keys(row).forEach(function (k) { norm[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k]; });
        function val(name) { return norm[name] !== undefined ? norm[name] : ''; }
        const empId = String(val('empid') || '').trim();
        return {
          EmpID: empId,
          Name: String(val('name') || '').trim(),
          Department: String(val('department') || '').trim(),
          Status: String(val('status') || 'Active').trim() || 'Active',
          DateJoined: '', DateExited: '',
          BasicRate: Number(val('basicrate') || 0),
          FixedAllowRate: Number(val('fixedallowrate') || 0),
          FilmRate: Number(val('filmrate') || 0),
          OTRate: Number(val('otrate') || 0),
          PermittedWorkingDays: val('permittedworkingdays'),
          StandardInstalment: val('standardinstalment'),
          Notes: String(val('notes') || ''),
          _isNew: empId ? !existingIds.has(empId) : null,
        };
      }).filter(function (r) { return r.EmpID; }); // rows with no EmpID at all are silently ignored, not even shown

      renderEmployeeBulkPreview(parsed, isAdmin);
    } catch (err) {
      showBanner('Could not read that file: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderEmployeeBulkPreview(rows, isAdmin) {
  const area = document.getElementById('emp-bulk-preview-area');
  if (!rows.length) { area.innerHTML = '<p class="muted">No valid rows found (need at least an EmpID column).</p>'; return; }
  const newCount = rows.filter(function (r) { return r._isNew; }).length;
  const updateCount = rows.length - newCount;

  area.innerHTML =
    '<p><b>' + rows.length + ' row(s) ready</b> — ' + newCount + ' new employee(s), ' + updateCount + ' update(s) to existing employees.</p>' +
    '<div class="table-wrap" style="max-height:300px;"><table><thead><tr><th>EmpID</th><th>Name</th><th>Department</th>' +
    '<th>Status</th><th>Basic Rate</th><th>Fixed Allow</th><th>OT Rate</th><th></th></tr></thead><tbody>' +
    rows.map(function (r) {
      return '<tr><td>' + escapeHtml(r.EmpID) + '</td><td>' + escapeHtml(r.Name) + '</td><td>' + escapeHtml(r.Department) + '</td>' +
        '<td>' + escapeHtml(r.Status) + '</td><td>' + fmtMoney(r.BasicRate) + '</td><td>' + fmtMoney(r.FixedAllowRate) + '</td>' +
        '<td>' + fmtMoney(r.OTRate) + '</td>' +
        '<td>' + (r._isNew ? '<span style="color:#065f46;">New</span>' : '<span style="color:#7a5b00;">Update</span>') + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' +
    '<button class="btn-sm" id="confirm-emp-upload-btn" style="margin-top:12px;">' +
    (isAdmin ? 'Confirm & Save All ' + rows.length + ' Row(s)' : 'Submit All ' + rows.length + ' Row(s) for Approval') + '</button>';

  document.getElementById('confirm-emp-upload-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const employeesToSend = rows.map(function (r) {
        const copy = Object.assign({}, r);
        delete copy._isNew;
        return copy;
      });
      const result = await api('saveEmployeesBulk', { employees: employeesToSend });
      let msg = '';
      if (result.appliedCount) msg += result.appliedCount + ' applied immediately. ';
      if (result.pendingCount) msg += result.pendingCount + ' submitted for approval. ';
      if (result.errors.length) msg += result.errors.length + ' failed — see below.';
      showBanner(msg || 'Done.', result.errors.length ? 'error' : 'success');
      if (result.errors.length) {
        area.innerHTML += '<div class="error-box" style="margin-top:10px;">' +
          result.errors.map(function (e) { return escapeHtml(e.EmpID) + (e.Name ? ' — ' + escapeHtml(e.Name) : '') + ': ' + escapeHtml(e.error); }).join('<br/>') +
          '</div>';
      } else {
        area.innerHTML = '<p class="muted">Upload complete.</p>';
      }
      if (result.appliedCount) {
        await preloadEmployees();
        await renderEmployeesView();
      } else if (result.pendingCount) {
        await loadMyEmployeeRequests();
      }
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };
}

async function loadMyEmployeeRequests() {
  const box = document.getElementById('my-emp-requests');
  if (!box) return;
  try {
    const all = await api('getMyRequests');
    const mine = all.filter(function (r) { return r.TargetSheet === 'Employees'; });
    box.innerHTML = mine.length
      ? '<table><thead><tr><th>Submitted</th><th>EmpID</th><th>Action</th><th>Status</th><th>Notes</th></tr></thead><tbody>' +
        mine.map(function (r) {
          return '<tr><td>' + escapeHtml(String(r.Timestamp).slice(0, 16).replace('T', ' ')) + '</td>' +
            '<td>' + escapeHtml(r.EmpID) + '</td><td>' + escapeHtml(r.Action) + '</td>' +
            '<td>' + escapeHtml(r.Status) + '</td><td>' + escapeHtml(r.ReviewNotes || '') + '</td></tr>';
        }).join('') + '</tbody></table>'
      : '<p class="muted">No requests yet.</p>';
  } catch (e) { box.innerHTML = ''; }
}

// =============================================================================
// =============================================================================
// VIEW: PENDING APPROVALS (Super Admin only — the "notifications" screen)
// =============================================================================
async function renderApprovalsView() {
  const root = document.getElementById('view-root');
  root.innerHTML = '<h2 class="page-title">Pending Approvals</h2><p class="muted">Loading…</p>';
  const rows = await api('getPendingApprovals');
  state.pendingApprovalsCount = rows.length;
  renderNav();

  if (!rows.length) {
    root.innerHTML = '<h2 class="page-title">Pending Approvals</h2><p>Nothing waiting for review right now.</p>';
    return;
  }

  root.innerHTML =
    '<h2 class="page-title">Pending Approvals</h2>' +
    '<p class="muted">Changes submitted by an Accountant on Employee Master or the Advance Ledger sit here until ' +
    'you approve or reject them. Nothing is applied to the real data until you act.</p>' +
    '<div id="approvals-list"></div>';

  const list = document.getElementById('approvals-list');
  list.innerHTML = rows.map(function (r) {
    const empLabel = r.EmpID ? (r.EmpID + ' — ' + empName(r.EmpID)) : '';
    let detail;
    if (r.TargetSheet === 'Employees' && r.Action === 'add') {
      detail = '<b>New Employee:</b> ' + escapeHtml(r.Payload.EmpID) + ' — ' + escapeHtml(r.Payload.Name) +
        ' (Basic: ' + fmtMoney(r.Payload.BasicRate) + ', Fixed Allow: ' + fmtMoney(r.Payload.FixedAllowRate) + ')';
    } else if (r.TargetSheet === 'Employees' && r.Action === 'update') {
      detail = r.diff && r.diff.length
        ? '<b>Update for ' + escapeHtml(empLabel) + ':</b><ul>' +
          r.diff.map(function (d) { return '<li>' + escapeHtml(d.field) + ': "' + escapeHtml(d.from) + '" → "' + escapeHtml(d.to) + '"</li>'; }).join('') + '</ul>'
        : '<b>Update for ' + escapeHtml(empLabel) + '</b> (no changed fields detected)';
    } else if (r.TargetSheet === 'AdvanceLedger') {
      detail = '<b>New Advance for ' + escapeHtml(empLabel) + ':</b> ' + fmtMoney(r.Payload.Amount) +
        ' on ' + escapeHtml(r.Payload.Date) + (r.Payload.Notes ? ' — ' + escapeHtml(r.Payload.Notes) : '');
    } else {
      detail = escapeHtml(JSON.stringify(r.Payload));
    }
    return '<div class="card" data-request-id="' + escapeHtml(r.RequestID) + '">' +
      '<p class="muted small">Submitted by <b>' + escapeHtml(r.RequestedBy) + '</b> on ' + escapeHtml(String(r.Timestamp).slice(0, 16).replace('T', ' ')) + '</p>' +
      '<p>' + detail + '</p>' +
      '<button class="btn-sm approve-btn">Approve</button> ' +
      '<button class="btn-sm secondary reject-btn">Reject</button>' +
      '</div>';
  }).join('');

  list.querySelectorAll('.approve-btn').forEach(function (btn) {
    btn.onclick = async function () {
      const card = btn.closest('[data-request-id]');
      const requestId = card.getAttribute('data-request-id');
      btn.disabled = true;
      try {
        await api('approveRequest', { requestId: requestId });
        showBanner('Approved.', 'success');
        await preloadEmployees();
        await renderApprovalsView();
      } catch (err) {
        showBanner(err.message, 'error');
        btn.disabled = false;
      }
    };
  });
  list.querySelectorAll('.reject-btn').forEach(function (btn) {
    btn.onclick = async function () {
      const card = btn.closest('[data-request-id]');
      const requestId = card.getAttribute('data-request-id');
      const notes = window.prompt('Reason for rejecting (optional):', '') || '';
      btn.disabled = true;
      try {
        await api('rejectRequest', { requestId: requestId, notes: notes });
        showBanner('Rejected.', 'success');
        await renderApprovalsView();
      } catch (err) {
        showBanner(err.message, 'error');
        btn.disabled = false;
      }
    };
  });
}

// =============================================================================
// VIEW: SAFETY SHOES & PPE TRACKER (both roles, no approval needed)
// =============================================================================
async function renderPPEView() {
  const root = document.getElementById('view-root');
  const ITEM_TYPES = ['Safety Shoes', 'Helmet', 'Gloves', 'Safety Goggles', 'Ear Protection', 'Reflective Vest', 'Coverall', 'Other'];

  root.innerHTML =
    '<h2 class="page-title">Safety Shoes & PPE Tracker</h2>' +
    '<p class="muted">Log each PPE purchase/claim per employee. The summary below shows each employee\'s most recent ' +
    'purchase date and totals, so you can spot who\'s claiming often.</p>' +
    '<div class="card">' +
    '  <h3 style="margin-top:0;">Log a Purchase</h3>' +
    '  <div class="form-grid">' +
    '    <div><label>Employee</label><select id="ppe-empid">' +
           state.employees.map(function (e) { return '<option value="' + e.EmpID + '">' + escapeHtml(e.EmpID + ' — ' + e.Name) + '</option>'; }).join('') +
    '    </select></div>' +
    '    <div><label>Item Type</label><select id="ppe-item">' +
           ITEM_TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('') +
    '    </select></div>' +
    '    <div><label>Purchase Date</label><input id="ppe-date" type="date" /></div>' +
    '    <div><label>Amount (optional)</label><input id="ppe-amount" type="number" step="0.01" value="0" /></div>' +
    '    <div style="grid-column: 1/-1;"><label>Remarks</label><input id="ppe-remarks" type="text" placeholder="e.g. size, reason for reissue" /></div>' +
    '  </div>' +
    '  <button class="btn-sm" id="ppe-add-btn" style="margin-top:14px;">Log Purchase</button>' +
    '</div>' +
    '<h3>Summary by Employee</h3>' +
    '<div class="table-wrap" id="ppe-summary-wrap"><table><thead></thead><tbody></tbody></table></div>' +
    '<h3 style="margin-top:24px;">Full Purchase Log</h3>' +
    '<div class="table-wrap"><table id="ppe-log-table"><thead></thead><tbody></tbody></table></div>';

  document.getElementById('ppe-add-btn').onclick = async function () {
    const btn = this;
    const entry = {
      EmpID: document.getElementById('ppe-empid').value,
      ItemType: document.getElementById('ppe-item').value,
      Date: document.getElementById('ppe-date').value,
      Amount: Number(document.getElementById('ppe-amount').value || 0),
      Remarks: document.getElementById('ppe-remarks').value,
    };
    if (!entry.Date) { showBanner('Purchase date is required.', 'error'); return; }
    btn.disabled = true;
    try {
      await api('addPPEEntry', { entry: entry });
      showBanner('Logged ' + entry.ItemType + ' for ' + empName(entry.EmpID) + '.', 'success');
      document.getElementById('ppe-remarks').value = '';
      document.getElementById('ppe-amount').value = 0;
      await loadPPETables();
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };

  await loadPPETables();
}

async function loadPPETables() {
  const [summary, log] = await Promise.all([api('getPPESummary'), api('getPPELog')]);

  const summaryWrap = document.getElementById('ppe-summary-wrap');
  const sTable = summaryWrap.querySelector('table');
  sTable.querySelector('thead').innerHTML = '<tr><th>EmpID</th><th>Name</th><th>Last Purchase Date</th><th>Total Purchases</th><th>Total Amount</th><th>By Item Type</th></tr>';
  sTable.querySelector('tbody').innerHTML = summary.length
    ? summary.sort(function (a, b) { return String(b.lastPurchaseDate).localeCompare(String(a.lastPurchaseDate)); }).map(function (r) {
        const byType = Object.keys(r.byItemType).map(function (t) { return t + ' (' + r.byItemType[t].count + ')'; }).join(', ');
        return '<tr><td>' + escapeHtml(r.EmpID) + '</td><td>' + escapeHtml(r.Name) + '</td>' +
          '<td>' + escapeHtml(r.lastPurchaseDate) + '</td><td>' + r.totalPurchases + '</td>' +
          '<td>' + fmtMoney(r.totalAmount) + '</td><td>' + escapeHtml(byType) + '</td></tr>';
      }).join('')
    : '<tr><td colspan="6" class="muted">No purchases logged yet.</td></tr>';

  const logTable = document.getElementById('ppe-log-table');
  logTable.querySelector('thead').innerHTML = '<tr><th>Date</th><th>EmpID</th><th>Name</th><th>Item Type</th><th>Amount</th><th>Remarks</th><th>Entered By</th></tr>';
  logTable.querySelector('tbody').innerHTML = log.map(function (r) {
    return '<tr><td>' + escapeHtml(r.Date) + '</td><td>' + escapeHtml(r.EmpID) + '</td><td>' + escapeHtml(r.Name) + '</td>' +
      '<td>' + escapeHtml(r.ItemType) + '</td><td>' + fmtMoney(r.Amount) + '</td><td>' + escapeHtml(r.Remarks) + '</td>' +
      '<td>' + escapeHtml(r.EnteredBy) + '</td></tr>';
  }).join('');
}

// =============================================================================
// VIEW: ADMIN / RECALCULATE (Owner only)
// =============================================================================
async function renderAdminView() {
  const root = document.getElementById('view-root');
  root.innerHTML =
    '<h2 class="page-title">Admin</h2>' +
    '<div class="card" style="border: 2px solid #e74c3c;">' +
    '<h3 style="color:#991b1b;">Fix Payroll Month Formatting & Duplicate Rows</h3>' +
    '<p class="muted">Fixes a bug where Google Sheets could silently auto-convert the Payroll Data Month value ' +
    '(e.g. "2026-08") into a real date, which sometimes caused re-saving an entry to create a duplicate row instead ' +
    'of updating the existing one. Running this: (1) locks the Month column to plain text so it can\'t happen again, ' +
    '(2) removes any duplicate Month+Employee rows — keeping only the most recently-saved one, (3) recomputes every ' +
    'row fresh with current rates. Safe to run more than once. <b>Run this once after updating to this version.</b></p>' +
    '<button class="btn-sm" id="fix-month-btn">Fix Now</button>' +
    '<p id="fix-month-result" class="muted small" style="margin-top:10px;"></p>' +
    '</div>' +
    '<div class="card">' +
    '<h3>Recalculate All Payroll</h3>' +
    '<p class="muted">If you corrected an old Advance Ledger amount or an old Payroll Entry, run this to ' +
    're-cascade advance recovery correctly through every later month, in chronological order.</p>' +
    '<button class="btn-sm" id="recalc-btn">Recalculate Everything</button>' +
    '<p id="recalc-result" class="muted small" style="margin-top:10px;"></p>' +
    '</div>' +
    '<div class="card">' +
    '<h3>Sync Departments from Latest Data</h3>' +
    '<p class="muted">Fills in the Department column for any employee whose Department is currently blank, ' +
    'using the department list that was loaded into this system. It never overwrites a Department you\'ve ' +
    'already set by hand — if the loaded data disagrees with something you\'ve already entered, it\'s reported ' +
    'below instead of being changed automatically. Any names from the department list that don\'t match an ' +
    'existing employee are added as new rows (with ₹0 rates — fill those in on Employee Master afterwards). ' +
    'Safe to run more than once.</p>' +
    '<button class="btn-sm" id="sync-dept-btn">Sync Departments</button>' +
    '<div id="sync-dept-result" class="muted small" style="margin-top:10px;"></div>' +
    '</div>' +
    '<div class="card">' +
    '<h3>Migrate "Owner" Role to "Super Admin"</h3>' +
    '<p class="muted">Only needed once, if this Google Sheet was set up before the role was renamed from ' +
    '"Owner" to "Super Admin". Updates the Users sheet so the role reads "SuperAdmin" going forward — your ' +
    'username and password don\'t change. After running this, log out and log back in so your session picks up ' +
    'the new role name. Safe to run more than once — does nothing if there\'s nothing left to migrate.</p>' +
    '<button class="btn-sm secondary" id="migrate-role-btn">Run Migration</button>' +
    '<p id="migrate-role-result" class="muted small" style="margin-top:10px;"></p>' +
    '</div>' +
    '<div class="card">' +
    '<h3>Add Approvals & PPE Tracker Sheets</h3>' +
    '<p class="muted">Only needed once, if this Google Sheet was set up before the Pending Approvals workflow and ' +
    'the Safety Shoes & PPE tracker existed. Creates those two sheets if they\'re missing — does nothing if they\'re ' +
    'already there. Safe to run more than once.</p>' +
    '<button class="btn-sm secondary" id="ensure-approval-ppe-btn">Add Sheets</button>' +
    '<p id="ensure-approval-ppe-result" class="muted small" style="margin-top:10px;"></p>' +
    '</div>' +
    '<div class="card">' +
    '<h3>Add "Permitted Working Days" Column</h3>' +
    '<p class="muted">Only needed once, if this Google Sheet was set up before Permitted Working Days existed on ' +
    'Employee Master. Adds the column if it\'s missing — does nothing if it\'s already there. Safe to run more than once.</p>' +
    '<button class="btn-sm secondary" id="ensure-permdays-btn">Add Column</button>' +
    '<p id="ensure-permdays-result" class="muted small" style="margin-top:10px;"></p>' +
    '</div>';

  document.getElementById('recalc-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    try {
      const res = await api('recalculateAllPayroll');
      document.getElementById('recalc-result').textContent = 'Done — ' + res.rowsRecalculated + ' rows recalculated' +
        (res.duplicatesRemoved ? ', ' + res.duplicatesRemoved + ' duplicate row(s) removed.' : '.');
      showBanner('Recalculated ' + res.rowsRecalculated + ' payroll rows.', 'success');
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('fix-month-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    const resultBox = document.getElementById('fix-month-result');
    resultBox.textContent = 'Fixing…';
    try {
      const res = await api('fixPayrollMonthColumn');
      resultBox.textContent = 'Done — ' + res.rowsRecalculated + ' rows recalculated' +
        (res.duplicatesRemoved ? ', ' + res.duplicatesRemoved + ' duplicate row(s) removed.' : ', no duplicates found.');
      showBanner('Payroll Month formatting fixed.', 'success');
    } catch (err) {
      showBanner(err.message, 'error');
      resultBox.textContent = '';
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('sync-dept-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    const resultBox = document.getElementById('sync-dept-result');
    resultBox.textContent = 'Syncing…';
    try {
      const res = await api('syncDepartmentsFromSeed');
      let html = '<p><b>Filled ' + res.filledCount + '</b> blank Department cells, ' +
        '<b>added ' + res.addedCount + '</b> new employees found only in the department list.</p>';
      if (res.conflictCount) {
        html += '<p style="color:#991b1b;"><b>' + res.conflictCount + ' conflicts</b> — these already had a ' +
          'different Department set, so nothing was changed. Review and update manually on Employee Master if needed:</p>' +
          '<ul>' + res.conflicts.map(function (c) {
            return '<li>' + escapeHtml(c.EmpID) + ' — ' + escapeHtml(c.Name) + ': sheet has "' + escapeHtml(c.sheetHas) +
              '", loaded data suggests "' + escapeHtml(c.seedSuggests) + '"</li>';
          }).join('') + '</ul>';
      }
      if (res.addedCount) {
        html += '<p><b>Newly added employees</b> (set their rates on Employee Master):</p><ul>' +
          res.added.map(function (a) { return '<li>' + escapeHtml(a.EmpID) + ' — ' + escapeHtml(a.Name) + ' (' + escapeHtml(a.Department) + ')</li>'; }).join('') +
          '</ul>';
      }
      resultBox.innerHTML = html;
      showBanner('Department sync complete.', 'success');
      await preloadEmployees();
    } catch (err) {
      showBanner(err.message, 'error');
      resultBox.textContent = '';
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('migrate-role-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    const resultBox = document.getElementById('migrate-role-result');
    resultBox.textContent = 'Running…';
    try {
      const res = await api('migrateOwnerRoleToSuperAdmin');
      resultBox.textContent = res.rowsMigrated > 0
        ? 'Migrated ' + res.rowsMigrated + ' user row(s) to Super Admin. Please log out and log back in.'
        : 'Nothing to migrate — already up to date.';
      showBanner('Role migration complete.', 'success');
    } catch (err) {
      showBanner(err.message, 'error');
      resultBox.textContent = '';
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('ensure-approval-ppe-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    const resultBox = document.getElementById('ensure-approval-ppe-result');
    resultBox.textContent = 'Running…';
    try {
      const res = await api('ensureApprovalAndPPESheets');
      resultBox.textContent = res.sheetsCreated.length
        ? 'Created: ' + res.sheetsCreated.join(', ') + '.'
        : 'Nothing to add — already up to date.';
      showBanner('Done.', 'success');
    } catch (err) {
      showBanner(err.message, 'error');
      resultBox.textContent = '';
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('ensure-permdays-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    const resultBox = document.getElementById('ensure-permdays-result');
    resultBox.textContent = 'Running…';
    try {
      const res = await api('ensurePermittedWorkingDaysColumn');
      resultBox.textContent = res.columnsAdded.length
        ? 'Added: ' + res.columnsAdded.join(', ') + '.'
        : 'Nothing to add — already up to date.';
      showBanner('Done.', 'success');
    } catch (err) {
      showBanner(err.message, 'error');
      resultBox.textContent = '';
    } finally {
      btn.disabled = false;
    }
  };
}

// =============================================================================
// VIEW: DOWNLOAD SALARY FILES (by month, optionally filtered by department)
// =============================================================================
async function renderDownloadsView() {
  const root = document.getElementById('view-root');
  root.innerHTML = '<h2 class="page-title">Download Salary Files</h2><p class="muted">Loading…</p>';

  const months = await api('getAvailableMonths');
  if (!months.length) {
    root.innerHTML = '<h2 class="page-title">Download Salary Files</h2><p>No payroll data has been saved yet.</p>';
    return;
  }

  const depts = Array.from(new Set(state.employees.map(function (e) { return e.Department || '(Unassigned)'; }))).sort();

  root.innerHTML =
    '<h2 class="page-title">Download Salary Files</h2>' +
    '<p class="muted">Pick a month and, optionally, one or more departments, then download that month\'s salary ' +
    'file as an Excel workbook with live formulas (Basic Pay, OT Pay, Gross, and Net Pay all calculated in-sheet, ' +
    'same as a Payroll Entry export) — plus a totals row at the bottom.</p>' +
    '<div class="card">' +
    '  <div class="form-grid">' +
    '    <div><label>Month</label><select id="dl-month">' +
           months.slice().reverse().map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('') +
    '    </select></div>' +
    '  </div>' +
    '  <div style="margin-top:16px;">' +
    '    <label>Departments (leave all checked for everyone)</label>' +
    '    <div style="margin: 6px 0;">' +
    '      <button type="button" class="btn-sm secondary" id="dl-select-all" style="padding:4px 10px; font-size:12px;">Select All</button> ' +
    '      <button type="button" class="btn-sm secondary" id="dl-clear-all" style="padding:4px 10px; font-size:12px;">Clear All</button>' +
    '    </div>' +
    '    <div id="dl-dept-checks" style="display:flex; flex-wrap:wrap; gap:10px 20px; margin-top:8px;">' +
           depts.map(function (d) {
             return '<label style="font-weight:normal; display:flex; align-items:center; gap:5px;">' +
               '<input type="checkbox" class="dl-dept-cb" value="' + escapeHtml(d) + '" checked /> ' + escapeHtml(d) + '</label>';
           }).join('') +
    '    </div>' +
    '  </div>' +
    '  <button class="btn-sm" id="dl-download-btn" style="margin-top:18px;">⬇ Download Salary File</button>' +
    '  <p id="dl-result" class="muted small" style="margin-top:10px;"></p>' +
    '</div>';

  document.getElementById('dl-select-all').onclick = function () {
    document.querySelectorAll('.dl-dept-cb').forEach(function (cb) { cb.checked = true; });
  };
  document.getElementById('dl-clear-all').onclick = function () {
    document.querySelectorAll('.dl-dept-cb').forEach(function (cb) { cb.checked = false; });
  };

  document.getElementById('dl-download-btn').onclick = async function () {
    const btn = this;
    const month = document.getElementById('dl-month').value;
    const selectedDepts = Array.from(document.querySelectorAll('.dl-dept-cb:checked')).map(function (cb) { return cb.value; });
    const resultBox = document.getElementById('dl-result');
    if (!selectedDepts.length) { resultBox.textContent = 'Select at least one department.'; return; }
    btn.disabled = true;
    resultBox.textContent = 'Preparing file…';
    try {
      const allRows = await api('getPayrollData', { month: month });
      const filteredRows = allRows.filter(function (r) {
        const emp = state.employees.find(function (e) { return e.EmpID === r.EmpID; });
        const dept = (emp && emp.Department) || '(Unassigned)';
        return selectedDepts.indexOf(dept) !== -1;
      });
      if (!filteredRows.length) {
        resultBox.textContent = 'No employees found for that month + department combination.';
        return;
      }
      const ws = buildPayrollWorksheet(filteredRows, month);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, month);
      const deptSuffix = selectedDepts.length === depts.length ? 'AllDepts' : selectedDepts.join('-').replace(/[^a-zA-Z0-9-]/g, '');
      XLSX.writeFile(wb, 'Salary_' + month + '_' + deptSuffix + '.xlsx');
      resultBox.textContent = 'Downloaded ' + filteredRows.length + ' employee record(s) for ' + month + '.';
    } catch (err) {
      showBanner(err.message, 'error');
      resultBox.textContent = '';
    } finally {
      btn.disabled = false;
    }
  };
}

// =============================================================================
// VIEW: CHANGE PASSWORD
// =============================================================================
async function renderAccountView() {
  const root = document.getElementById('view-root');
  root.innerHTML =
    '<h2 class="page-title">Change Password</h2>' +
    '<div class="card" style="max-width:340px;">' +
    '<label>New Password</label><input id="new-pw" type="password" />' +
    '<button class="btn-sm" id="change-pw-btn" style="margin-top:14px;">Update Password</button>' +
    '</div>';
  document.getElementById('change-pw-btn').onclick = async function () {
    const pw = document.getElementById('new-pw').value;
    if (!pw || pw.length < 6) { showBanner('Use at least 6 characters.', 'error'); return; }
    try {
      await api('changePassword', { newPassword: pw });
      showBanner('Password updated.', 'success');
      document.getElementById('new-pw').value = '';
    } catch (err) {
      showBanner(err.message, 'error');
    }
  };
}
