// =============================================================================
// MSE Tech Payroll — Frontend
// =============================================================================
// 1. Deploy backend/Code.gs as a Google Apps Script Web App (see its header
//    comment for steps).
// 2. Paste the Web App URL below.
const API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

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
  renderNav();
  navigateTo(defaultViewForRole(state.role));
}

document.getElementById('login-btn').addEventListener('click', doLogin);
document.getElementById('login-password').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errBox = document.getElementById('login-error');
  errBox.style.display = 'none';
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
    localStorage.setItem('payroll_token', state.token);
    localStorage.setItem('payroll_role', state.role);
    localStorage.setItem('payroll_name', state.displayName);
    await preloadEmployees();
    showApp();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.style.display = 'block';
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
  { id: 'exitlog', label: 'Exit / Final Settlement', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'balances', label: 'Advance Balances', roles: ['SuperAdmin', 'Accountant'] },
  { id: 'ledger', label: 'Advance Ledger (Super Admin Only)', roles: ['SuperAdmin'] },
  { id: 'employees', label: 'Employee Master (Super Admin Only)', roles: ['SuperAdmin'] },
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
    a.textContent = item.label;
    a.href = '#';
    a.onclick = function (e) { e.preventDefault(); navigateTo(item.id); };
    nav.appendChild(a);
  });
}

const VIEW_RENDERERS = {
  payroll: renderPayrollView,
  overview: renderOverviewView,
  ottracker: renderOTTrackerView,
  deptsummary: renderDeptSummaryView,
  exitlog: renderExitLogView,
  balances: renderBalancesView,
  ledger: renderLedgerView,
  employees: renderEmployeesView,
  admin: renderAdminView,
  account: renderAccountView,
};

async function navigateTo(viewId) {
  state.currentView = viewId;
  renderNav();
  const root = document.getElementById('view-root');
  root.innerHTML = '<p class="muted">Loading…</p>';
  try {
    await VIEW_RENDERERS[viewId]();
  } catch (err) {
    root.innerHTML = '<div class="error-box">' + escapeHtml(err.message) + '</div>';
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

async function renderPayrollView() {
  const root = document.getElementById('view-root');
  const months = currentMonthOptions();
  const selectedMonth = payrollMonthCache.selected || months[2];

  root.innerHTML =
    '<h2 class="page-title">Payroll Entry</h2>' +
    '<p class="muted">Worked days, OT hours, and allowances are entered here. Basic pay, OT pay, and Gross/Net ' +
    'are always calculated automatically. The Advance Deducted amount is pre-filled with a suggestion but you can ' +
    'edit it — whatever you save is exactly what reduces that employee\'s balance on the Advance Ledger (enter 0 to skip a month).</p>' +
    '<div class="toolbar"><label>Month: <select id="payroll-month"></select></label></div>' +
    '<div class="card" id="entry-form-card"></div>' +
    '<div class="card" id="bulk-upload-card"></div>' +
    '<div class="table-wrap"><table id="payroll-table"><thead></thead><tbody></tbody></table></div>';

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

  renderPayrollEntryForm(selectedMonth);
  renderBulkUploadCard(selectedMonth);
  await renderPayrollTable(selectedMonth);
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
    el.oninput = function () { currentAllowanceRows[Number(el.getAttribute('data-i'))].label = el.value; };
  });
  wrap.querySelectorAll('.allow-amount').forEach(function (el) {
    el.oninput = function () { currentAllowanceRows[Number(el.getAttribute('data-i'))].amount = Number(el.value || 0); };
  });
  wrap.querySelectorAll('.remove-allow-btn').forEach(function (btn) {
    btn.onclick = function () {
      currentAllowanceRows.splice(Number(btn.getAttribute('data-i')), 1);
      renderAllowanceRows();
    };
  });
}

function renderPayrollEntryForm(month) {
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
    '<button class="btn-sm" id="save-entry-btn" style="margin-top:16px;">Save Entry for ' + month + '</button>' +
    '<span id="save-preview" class="muted small" style="margin-left:14px;"></span>';

  document.getElementById('add-allow-btn').onclick = function () {
    currentAllowanceRows.push({ label: '', amount: 0 });
    renderAllowanceRows();
  };
  document.getElementById('f-empid').onchange = function () { loadExistingEntry(month); };
  loadExistingEntry(month);

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
      await renderPayrollTable(month);
      await loadExistingEntry(month);
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };
}

async function loadExistingEntry(month) {
  const empId = document.getElementById('f-empid').value;
  const preview = document.getElementById('save-preview');
  const hint = document.getElementById('advance-hint');
  try {
    const [rows, suggestion] = await Promise.all([
      api('getPayrollData', { month: month }),
      api('getSuggestedAdvance', { empId: empId, month: month }),
    ]);
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
    preview.textContent = '';
    hint.textContent = '';
  }
}

async function renderPayrollTable(month) {
  const rows = await api('getPayrollData', { month: month });
  const table = document.getElementById('payroll-table');
  table.querySelector('thead').innerHTML =
    '<tr><th>EmpID</th><th>Name</th><th>Worked Days</th><th>OT Hrs (Prev)</th><th>Exit?</th>' +
    '<th>Basic Pay</th><th>Fixed Allow</th><th>OT Pay</th><th>Allowances</th><th>Advance Deducted</th><th>Other Ded</th>' +
    '<th>Gross</th><th>Net Pay</th><th>Notes</th></tr>';
  table.querySelector('tbody').innerHTML = rows.map(function (r) {
    let allowSum = 0, allowList = [];
    try { allowList = JSON.parse(r.AllowancesJSON || '[]'); allowSum = allowList.reduce(function (s, a) { return s + (Number(a.amount) || 0); }, 0); } catch (e) {}
    const allowTitle = allowList.map(function (a) { return a.label + ': ' + fmtMoney(a.amount); }).join(', ');
    return '<tr>' +
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
      '</tr>';
  }).join('');
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
  const data = await api('getMonthlyOverview');
  const root = document.getElementById('view-root');
  if (!data.length) { root.innerHTML = '<h2 class="page-title">Monthly Overview & Spikes</h2><p>No payroll data yet.</p>'; return; }

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
    '<p class="muted">Green = pay jumped sharply without matching attendance change. Red = pay dropped sharply without matching attendance change. Yellow = explained by leave/attendance.</p>' +
    '<div class="table-wrap"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
}

// =============================================================================
// VIEW: OT & BASIC TRACKER
// =============================================================================
async function renderOTTrackerView() {
  const data = await api('getOTBasicTracker');
  const root = document.getElementById('view-root');
  if (!data.length) { root.innerHTML = '<h2 class="page-title">OT & Basic Paid Tracker</h2><p>No payroll data yet.</p>'; return; }
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
    '<div class="table-wrap"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
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
  const latestMonth = months[months.length - 1];

  let head = '<tr><th>Department</th>';
  months.forEach(function (m) { head += '<th>Headcount (' + m + ')</th><th>Gross (' + m + ')</th><th>Net (' + m + ')</th><th>Advance Recovered (' + m + ')</th>'; });
  head += '</tr>';
  const rows = data.map(function (d) {
    let row = '<tr><td>' + escapeHtml(d.department) + '</td>';
    months.forEach(function (m) {
      const c = d.byMonth[m];
      row += '<td>' + c.headcount + '</td><td>' + fmtMoney(c.totalGross) + '</td><td>' + fmtMoney(c.totalNet) + '</td><td>' + fmtMoney(c.totalAdvanceRecovered) + '</td>';
    });
    return row + '</tr>';
  }).join('');

  root.innerHTML =
    '<h2 class="page-title">Department Summary</h2>' +
    '<p class="muted">Set each employee\'s Department on the Employee Master tab to populate this.</p>' +
    '<div class="card" style="display:flex; gap:24px; flex-wrap:wrap;">' +
    '  <div style="flex:1; min-width:320px;"><h3>Net Pay by Department — ' + latestMonth + '</h3><canvas id="dept-bar-chart" height="240"></canvas></div>' +
    '  <div style="flex:1; min-width:320px;"><h3>Headcount by Department — ' + latestMonth + '</h3><canvas id="dept-headcount-chart" height="240"></canvas></div>' +
    '</div>' +
    '<div class="card"><h3>Net Pay Trend by Department</h3><canvas id="dept-trend-chart" height="100"></canvas></div>' +
    '<div class="table-wrap"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';

  deptCharts.forEach(function (c) { c.destroy(); });
  deptCharts = [];

  const labels = data.map(function (d) { return d.department; });
  const palette = ['#1F4E78', '#c0392b', '#27ae60', '#e67e22', '#8e44ad', '#16a085', '#2980b9', '#d35400', '#7f8c8d', '#c2185b', '#00796b'];

  // Bar: Net Pay by department, latest month
  deptCharts.push(new Chart(document.getElementById('dept-bar-chart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Net Pay (' + latestMonth + ')',
        data: data.map(function (d) { return d.byMonth[latestMonth].totalNet; }),
        backgroundColor: '#1F4E78',
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  }));

  // Bar: Headcount by department, latest month
  deptCharts.push(new Chart(document.getElementById('dept-headcount-chart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Headcount (' + latestMonth + ')',
        data: data.map(function (d) { return d.byMonth[latestMonth].headcount; }),
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
    '<p class="muted">Computed automatically: Total Given (from the Advance Ledger) minus Total Recovered (from Payroll Entry deductions).</p>' +
    '<div class="table-wrap"><table><thead><tr><th>EmpID</th><th>Name</th><th>Total Given</th><th>Total Recovered</th><th>Outstanding</th><th>Deducted Months History</th></tr></thead><tbody>' +
    data.filter(function (r) { return r.TotalGiven > 0 || r.Outstanding !== 0; }).map(function (r) {
      return '<tr><td>' + escapeHtml(r.EmpID) + '</td><td>' + escapeHtml(r.Name) + '</td>' +
        '<td>' + fmtMoney(r.TotalGiven) + '</td><td>' + fmtMoney(r.TotalRecovered) + '</td>' +
        '<td><b>' + fmtMoney(r.Outstanding) + '</b></td>' +
        '<td>' + escapeHtml(r.DeductedMonthsHistory) + '</td></tr>';
    }).join('') +
    '</tbody></table></div>';
}

// =============================================================================
// VIEW: ADVANCE LEDGER (Owner only — the "key it in yourself" tab)
// =============================================================================
async function renderLedgerView() {
  const root = document.getElementById('view-root');
  root.innerHTML =
    '<h2 class="page-title">Advance Ledger — Super Admin Only</h2>' +
    '<p class="muted">Every time you give an employee an advance, record it here. It will start auto-deducting from their next payroll entry.</p>' +
    '<div class="card">' +
    '  <div class="form-grid">' +
    '    <div><label>Employee</label><select id="l-empid">' +
           state.employees.map(function (e) { return '<option value="' + e.EmpID + '">' + escapeHtml(e.EmpID + ' — ' + e.Name) + '</option>'; }).join('') +
    '    </select></div>' +
    '    <div><label>Date Given</label><input id="l-date" type="date" /></div>' +
    '    <div><label>Amount</label><input id="l-amount" type="number" step="0.01" /></div>' +
    '    <div style="grid-column: 1/-1;"><label>Reason / Notes</label><input id="l-notes" type="text" /></div>' +
    '  </div>' +
    '  <button class="btn-sm" id="add-advance-btn" style="margin-top:14px;">Record Advance</button>' +
    '</div>' +
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
      await api('addAdvanceEntry', { entry: entry });
      showBanner('Advance recorded.', 'success');
      document.getElementById('l-amount').value = '';
      document.getElementById('l-notes').value = '';
      await loadLedgerTable();
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };

  await loadLedgerTable();
}

async function loadLedgerTable() {
  const rows = await api('getAdvanceLedger');
  const table = document.getElementById('ledger-table');
  table.querySelector('thead').innerHTML = '<tr><th>Date</th><th>EmpID</th><th>Name</th><th>Amount</th><th>Notes</th><th>Entered By</th></tr>';
  table.querySelector('tbody').innerHTML = rows.slice().reverse().map(function (r) {
    return '<tr><td>' + escapeHtml(String(r.Date).substring(0, 10)) + '</td><td>' + escapeHtml(r.EmpID) + '</td>' +
      '<td>' + escapeHtml(r.Name) + '</td><td>' + fmtMoney(r.Amount) + '</td><td>' + escapeHtml(r.Notes) + '</td>' +
      '<td>' + escapeHtml(r.EnteredBy) + '</td></tr>';
  }).join('');
}

// =============================================================================
// VIEW: EMPLOYEE MASTER (Owner only)
// =============================================================================
async function renderEmployeesView() {
  const employees = await api('getEmployees');
  state.employees = employees;
  const root = document.getElementById('view-root');
  root.innerHTML =
    '<h2 class="page-title">Employee Master</h2>' +
    '<p class="muted">Add new joiners here first. Edit a row\'s fields then click Save on that row. ' +
    '<b>Only the Super Admin account can access this screen</b> — Basic Rate and Fixed Allowance are an ' +
    'employee\'s salary, so any increment can only ever be keyed in here, by Super Admin. The Accountant has ' +
    'no path to change these figures anywhere in the app.</p>' +
    '<div class="table-wrap"><table><thead><tr><th>EmpID</th><th>Name</th><th>Department</th><th>Status</th>' +
    '<th>Basic Rate</th><th>Fixed Allow</th><th>Film Rate</th><th>OT Rate</th><th>Std Instalment</th><th>Notes</th><th></th></tr></thead>' +
    '<tbody id="emp-tbody"></tbody></table></div>' +
    '<div class="card" style="margin-top:20px;"><h3>Add New Employee</h3><div class="form-grid">' +
    '<div><label>EmpID</label><input id="new-empid" /></div>' +
    '<div><label>Name</label><input id="new-name" /></div>' +
    '<div><label>Department</label><input id="new-dept" /></div>' +
    '<div><label>Basic Rate</label><input id="new-basic" type="number" /></div>' +
    '<div><label>Fixed Allow Rate</label><input id="new-allow" type="number" /></div>' +
    '<div><label>Film Rate</label><input id="new-film" type="number" /></div>' +
    '<div><label>OT Rate</label><input id="new-ot" type="number" /></div>' +
    '</div><button class="btn-sm" id="add-emp-btn" style="margin-top:12px;">Add Employee</button></div>';

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
      '<td><input class="e-inst" type="number" value="' + (e.StandardInstalment || '') + '" style="width:80px" /></td>' +
      '<td><input class="e-notes" value="' + escapeHtml(e.Notes || '') + '" style="width:120px" /></td>' +
      '<td><button class="btn-sm secondary save-row-btn">Save</button></td>' +
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
        Notes: tr.querySelector('.e-notes').value,
      };
      btn.disabled = true;
      try {
        await api('saveEmployee', { employee: updated });
        showBanner('Saved ' + e.Name, 'success');
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
      StandardInstalment: '', Notes: '',
    };
    if (!newEmp.EmpID || !newEmp.Name) { showBanner('EmpID and Name are required.', 'error'); return; }
    btn.disabled = true;
    try {
      await api('saveEmployee', { employee: newEmp });
      showBanner('Added ' + newEmp.Name, 'success');
      await preloadEmployees();
      await renderEmployeesView();
    } catch (err) {
      showBanner(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  };
}

// =============================================================================
// VIEW: ADMIN / RECALCULATE (Owner only)
// =============================================================================
async function renderAdminView() {
  const root = document.getElementById('view-root');
  root.innerHTML =
    '<h2 class="page-title">Admin</h2>' +
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
    '</div>';

  document.getElementById('recalc-btn').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    try {
      const res = await api('recalculateAllPayroll');
      document.getElementById('recalc-result').textContent = 'Done — ' + res.rowsRecalculated + ' rows recalculated.';
      showBanner('Recalculated ' + res.rowsRecalculated + ' payroll rows.', 'success');
    } catch (err) {
      showBanner(err.message, 'error');
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
