// ─── Data Layer ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'bcg-timetracker';
const TIPOS = ['Staffing', 'Engagement', 'Internal', 'Personal'];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function newId() {
  return Math.random().toString(36).substr(2, 8);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { all_codes: [], weeks: {}, week_offset: 0 };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getMonday(offset = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff + offset * 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDates(offset = 0) {
  const monday = getMonday(offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function weekKey(offset = 0) {
  const m = getMonday(offset);
  return m.toISOString().slice(0, 10);
}

function getCodeInfo(data, codeId) {
  return data.all_codes.find(c => c.id === codeId) || null;
}

function isToday(date) {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() &&
         date.getMonth() === t.getMonth() &&
         date.getDate() === t.getDate();
}

function formatDay(d) {
  return String(d.getDate()).padStart(2, '0');
}

// ─── App State ───────────────────────────────────────────────────────────────
let data = loadData();
let weekOffset = data.week_offset || 0;
let calendarVisible = false;
let calYear, calMonth;

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  render();

  // Auto-open Quick Add if #quickadd in URL (works on new tabs AND existing tabs)
  function checkQuickAdd() {
    if (window.location.hash === '#quickadd') {
      window.location.hash = '';
      // Only open if no modal is already open
      if (!document.querySelector('.modal-overlay')) {
        setTimeout(() => showAddDialog(), 150);
      }
    }
  }
  checkQuickAdd();
  window.addEventListener('hashchange', checkQuickAdd);

  // Close calendar on outside click
  document.addEventListener('click', (e) => {
    if (!calendarVisible) return;
    const cal = document.getElementById('calendar-popup');
    const btn = document.getElementById('cal-toggle');
    if (!cal.contains(e.target) && !btn.contains(e.target)) {
      calendarVisible = false;
      cal.classList.remove('visible');
    }
  });

  // Stop clicks inside calendar from bubbling
  document.getElementById('calendar-popup').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Global shortcut: Ctrl+Shift+Space → Quick Add
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'Space') {
      e.preventDefault();
      // Don't open if a modal is already open
      if (!document.querySelector('.modal-overlay')) {
        showAddDialog();
      }
    }
  });
});

// ─── Render ──────────────────────────────────────────────────────────────────
function render() {
  renderNav();
  renderTable();
  renderFooter();
  if (calendarVisible) renderCalendar();
}

function renderNav() {
  const dates = getWeekDates(weekOffset);
  const start = `${formatDay(dates[0])} ${MONTH_NAMES[dates[0].getMonth()].slice(0, 3)}`;
  const end = `${formatDay(dates[6])} ${MONTH_NAMES[dates[6].getMonth()].slice(0, 3)} ${dates[6].getFullYear()}`;
  document.getElementById('week-label').textContent = `Semana: ${start} - ${end}`;
}

function renderTable() {
  const container = document.getElementById('table-body');
  const wk = weekKey(weekOffset);
  const entries = data.weeks[wk] || [];
  const dates = getWeekDates(weekOffset);

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No hay Case Codes en esta semana</h3>
        <p>Pulsa "Añadir Case Code" o "Historial" para empezar</p>
      </div>`;
    // Clear header
    document.getElementById('table-header').innerHTML = '';
    return;
  }

  // Header
  let headerHTML = '<div class="col project">Proyecto</div>';
  dates.forEach((d, i) => {
    const todayClass = isToday(d) ? ' today' : '';
    const marker = isToday(d) ? '📍 ' : '';
    headerHTML += `<div class="col${todayClass}">${marker}${DIAS_SHORT[i]} ${formatDay(d)}</div>`;
  });
  headerHTML += '<div class="col total-col">Total</div>';
  headerHTML += '<div class="col"></div>';
  document.getElementById('table-header').innerHTML = headerHTML;

  // Rows
  let rowsHTML = '';
  entries.forEach((entry, entryIdx) => {
    const info = getCodeInfo(data, entry.code_id);
    if (!info) return;
    const hours = entry.hours || [0, 0, 0, 0, 0, 0, 0];
    const rowTotal = hours.reduce((a, b) => a + b, 0);
    const typeColor = `var(--${info.type.toLowerCase()})`;

    rowsHTML += `<div class="table-row">`;
    rowsHTML += `<div class="project-info">
      <span class="type-badge" style="background:${typeColor}">${info.type.slice(0, 3)}</span>
      <div class="project-text">
        <div class="code">${esc(info.code)}</div>
        <div class="subtitle">${esc(info.name)} · ${esc(info.who)}</div>
      </div>
    </div>`;

    for (let di = 0; di < 7; di++) {
      const todayClass = isToday(dates[di]) ? ' today-input' : '';
      const val = hours[di] || '';
      rowsHTML += `<div style="text-align:center">
        <input class="hour-input${todayClass}" type="text" value="${val || ''}"
               data-entry="${entryIdx}" data-day="${di}"
               oninput="onHourChange(this)">
      </div>`;
    }

    rowsHTML += `<div class="row-total" id="row-total-${entryIdx}">${rowTotal}h</div>`;
    rowsHTML += `<div class="row-actions">
      <button class="btn btn-surface btn-icon" title="Editar" onclick="editCode('${entry.code_id}')">✏️</button>
      <button class="btn btn-surface btn-icon" title="Copiar a semana siguiente" onclick="copyToNextWeek('${entry.code_id}')">➡️</button>
      <button class="btn btn-surface btn-icon" title="Quitar de esta semana" onclick="deleteFromWeek(${entryIdx})">🗑️</button>
    </div>`;
    rowsHTML += `</div>`;
  });

  container.innerHTML = rowsHTML;
}

function renderFooter() {
  const wk = weekKey(weekOffset);
  const entries = data.weeks[wk] || [];
  let total = 0;
  const daily = [0, 0, 0, 0, 0, 0, 0];

  entries.forEach(e => {
    const h = e.hours || [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 7; i++) {
      daily[i] += h[i];
      total += h[i];
    }
  });

  document.getElementById('footer-total').textContent = `Total semana: ${total}h`;
  document.getElementById('footer-daily').textContent =
    DIAS_SHORT.map((d, i) => `${d}: ${daily[i]}h`).join('  |  ');
}

// ─── Hour Input ──────────────────────────────────────────────────────────────
function onHourChange(input) {
  const entryIdx = parseInt(input.dataset.entry);
  const dayIdx = parseInt(input.dataset.day);
  const val = parseFloat(input.value) || 0;
  const wk = weekKey(weekOffset);
  const entries = data.weeks[wk] || [];

  if (entryIdx >= entries.length) return;
  if (!entries[entryIdx].hours) entries[entryIdx].hours = [0, 0, 0, 0, 0, 0, 0];
  entries[entryIdx].hours[dayIdx] = val;
  saveData(data);

  // Update row total
  const rowTotal = entries[entryIdx].hours.reduce((a, b) => a + b, 0);
  const el = document.getElementById(`row-total-${entryIdx}`);
  if (el) el.textContent = `${rowTotal}h`;

  renderFooter();
}

// ─── Navigation ──────────────────────────────────────────────────────────────
function prevWeek() {
  weekOffset--;
  data.week_offset = weekOffset;
  saveData(data);
  render();
}
function nextWeek() {
  weekOffset++;
  data.week_offset = weekOffset;
  saveData(data);
  render();
}
function goToday() {
  weekOffset = 0;
  data.week_offset = 0;
  saveData(data);
  render();
}

// ─── CRUD ────────────────────────────────────────────────────────────────────
function showAddDialog() {
  showCodeDialog(null, (result) => {
    const cid = newId();
    data.all_codes.push({ id: cid, ...result });
    const wk = weekKey(weekOffset);
    if (!data.weeks[wk]) data.weeks[wk] = [];
    data.weeks[wk].push({ code_id: cid, hours: [0, 0, 0, 0, 0, 0, 0] });
    saveData(data);
    render();
  });
}

function editCode(codeId) {
  const info = getCodeInfo(data, codeId);
  if (!info) return;
  showCodeDialog(info, (result) => {
    Object.assign(info, result);
    saveData(data);
    render();
  });
}

function deleteFromWeek(entryIdx) {
  const wk = weekKey(weekOffset);
  const entries = data.weeks[wk] || [];
  if (entryIdx >= entries.length) return;
  const info = getCodeInfo(data, entries[entryIdx].code_id);
  const name = info ? info.code : '?';
  if (confirm(`¿Quitar "${name}" de esta semana?`)) {
    entries.splice(entryIdx, 1);
    saveData(data);
    render();
  }
}

function copyToNextWeek(codeId) {
  const nextWk = weekKey(weekOffset + 1);
  if (!data.weeks[nextWk]) data.weeks[nextWk] = [];

  if (data.weeks[nextWk].some(e => e.code_id === codeId)) {
    toast('Ya existe en la semana siguiente');
    return;
  }

  data.weeks[nextWk].push({ code_id: codeId, hours: [0, 0, 0, 0, 0, 0, 0] });
  saveData(data);
  const info = getCodeInfo(data, codeId);
  toast(`"${info ? info.code : '?'}" copiado a la semana siguiente`);
}

// ─── Code Dialog ─────────────────────────────────────────────────────────────
function showCodeDialog(editData, onSave) {
  const isEdit = !!editData;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const tipoOptions = TIPOS.map(t =>
    `<option value="${t}" ${editData && editData.type === t ? 'selected' : ''}>${t}</option>`
  ).join('');

  overlay.innerHTML = `
    <div class="modal">
      <h2>${isEdit ? '✏️ Editar Case Code' : '➕ Nuevo Case Code'}</h2>
      <label>Case Code</label>
      <input id="dlg-code" placeholder="Ej: 10029619.1.1" value="${isEdit ? esc(editData.code) : ''}">
      <label>Nombre del proyecto</label>
      <input id="dlg-name" placeholder="Ej: Due Diligence Pharma" value="${isEdit ? esc(editData.name) : ''}">
      <label>¿Quién te lo ha pedido?</label>
      <input id="dlg-who" placeholder="Ej: María López" value="${isEdit ? esc(editData.who) : ''}">
      <label>Tipo de código</label>
      <select id="dlg-type">${tipoOptions}</select>
      <div class="modal-buttons">
        <button class="btn btn-surface" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        <button class="btn btn-green" id="dlg-save">✅ Guardar</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const codeInput = document.getElementById('dlg-code');
  codeInput.focus();

  const save = () => {
    const code = document.getElementById('dlg-code').value.trim();
    if (!code) { alert('El Case Code es obligatorio.'); return; }
    onSave({
      code,
      name: document.getElementById('dlg-name').value.trim() || '(sin nombre)',
      who: document.getElementById('dlg-who').value.trim() || '(no especificado)',
      type: document.getElementById('dlg-type').value,
    });
    overlay.remove();
  };

  document.getElementById('dlg-save').onclick = save;
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}

// ─── History Dialog ──────────────────────────────────────────────────────────
function showHistory() {
  const wk = weekKey(weekOffset);
  const currentIds = new Set((data.weeks[wk] || []).map(e => e.code_id));
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  let listHTML = '';
  if (data.all_codes.length === 0) {
    listHTML = '<div style="text-align:center;color:var(--text-dim);padding:30px">No hay códigos en el historial</div>';
  } else {
    data.all_codes.forEach(c => {
      const typeColor = `var(--${c.type.toLowerCase()})`;
      const already = currentIds.has(c.id);
      const addHTML = already
        ? '<span class="already">✓ Ya añadido</span>'
        : `<button class="btn btn-green btn-small" onclick="addFromHistory('${c.id}', this)">+ Añadir</button>`;
      listHTML += `
        <div class="history-item" id="hist-${c.id}">
          <span class="type-badge" style="background:${typeColor}">${c.type.slice(0, 3)}</span>
          <div class="project-text">
            <div class="code">${esc(c.code)}</div>
            <div class="subtitle">${esc(c.name)} · ${esc(c.who)}</div>
          </div>
          ${addHTML}
          <button class="btn btn-surface btn-icon" title="Eliminar del historial" onclick="deleteFromHistory('${c.id}')">🗑️</button>
        </div>`;
    });
  }

  overlay.innerHTML = `
    <div class="modal history">
      <h2>📋 Historial de Case Codes</h2>
      <p class="history-subtitle">Pulsa + para añadir a la semana actual</p>
      <div class="history-list">${listHTML}</div>
      <div class="modal-buttons">
        <button class="btn btn-surface" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
}

function deleteFromHistory(codeId) {
  const info = getCodeInfo(data, codeId);
  const name = info ? info.code : '?';
  if (!confirm(`¿Eliminar "${name}" del historial?\nSe quitará también de todas las semanas.`)) return;

  // Remove from all weeks
  for (const wk in data.weeks) {
    data.weeks[wk] = data.weeks[wk].filter(e => e.code_id !== codeId);
  }
  // Remove from catalog
  data.all_codes = data.all_codes.filter(c => c.id !== codeId);
  saveData(data);
  render();

  // Remove row from the dialog
  const row = document.getElementById(`hist-${codeId}`);
  if (row) row.remove();

  // If no codes left, close the modal
  if (data.all_codes.length === 0) {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
  }
}

function addFromHistory(codeId, btn) {
  const wk = weekKey(weekOffset);
  if (!data.weeks[wk]) data.weeks[wk] = [];
  if (data.weeks[wk].some(e => e.code_id === codeId)) return;
  data.weeks[wk].push({ code_id: codeId, hours: [0, 0, 0, 0, 0, 0, 0] });
  saveData(data);
  render();
  // Close the history modal
  const overlay = btn.closest('.modal-overlay');
  if (overlay) overlay.remove();
}

// ─── Calendar ────────────────────────────────────────────────────────────────
function toggleCalendar(e) {
  e.stopPropagation();
  calendarVisible = !calendarVisible;
  const popup = document.getElementById('calendar-popup');
  if (calendarVisible) {
    const now = new Date();
    const dates = getWeekDates(weekOffset);
    calYear = dates[0].getFullYear();
    calMonth = dates[0].getMonth();
    renderCalendar();
    popup.classList.add('visible');
  } else {
    popup.classList.remove('visible');
  }
}

function renderCalendar() {
  const popup = document.getElementById('calendar-popup');
  const selectedMonday = getMonday(weekOffset);

  // First day of month
  const firstDay = new Date(calYear, calMonth, 1);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startOffset);

  let html = `
    <div class="cal-header">
      <button class="btn btn-surface btn-small" onclick="calPrev()">◀</button>
      <span class="month-label">${MONTH_NAMES[calMonth]} ${calYear}</span>
      <button class="btn btn-surface btn-small" onclick="calNext()">▶</button>
    </div>
    <div class="cal-grid">`;

  ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].forEach(d => {
    html += `<div class="cal-day-header">${d}</div>`;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    d.setHours(0, 0, 0, 0);

    let cls = 'cal-day';
    if (d.getMonth() !== calMonth) cls += ' other-month';
    if (d.getTime() === today.getTime()) cls += ' today';

    // Check if in selected week
    const dayMonday = new Date(d);
    const dow = dayMonday.getDay();
    dayMonday.setDate(dayMonday.getDate() - (dow === 0 ? 6 : dow - 1));
    dayMonday.setHours(0, 0, 0, 0);
    selectedMonday.setHours(0, 0, 0, 0);
    if (dayMonday.getTime() === selectedMonday.getTime()) cls += ' selected-week';

    html += `<div class="${cls}" onclick="calSelectDay(${d.getFullYear()},${d.getMonth()},${d.getDate()})">${d.getDate()}</div>`;
  }

  html += `</div>
    <button class="btn btn-green btn-small cal-today-btn" onclick="calGoToday()">● Hoy</button>`;

  popup.innerHTML = html;
}

function calPrev() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}
function calNext() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
}

function calSelectDay(y, m, d) {
  const clicked = new Date(y, m, d);
  const dow = clicked.getDay();
  const clickedMonday = new Date(clicked);
  clickedMonday.setDate(clicked.getDate() - (dow === 0 ? 6 : dow - 1));

  const todayMonday = getMonday(0);
  todayMonday.setHours(0, 0, 0, 0);
  clickedMonday.setHours(0, 0, 0, 0);

  const diffDays = Math.round((clickedMonday - todayMonday) / (1000 * 60 * 60 * 24));
  weekOffset = Math.round(diffDays / 7);
  data.week_offset = weekOffset;
  saveData(data);

  calendarVisible = false;
  document.getElementById('calendar-popup').classList.remove('visible');
  render();
}

function calGoToday() {
  weekOffset = 0;
  data.week_offset = 0;
  saveData(data);
  calendarVisible = false;
  document.getElementById('calendar-popup').classList.remove('visible');
  render();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function esc(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
