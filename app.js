'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KEY = 'gnbp-records-v2', SKEY = 'gnbp-settings-v2';
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const ymd = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
const todayStr = () => ymd(new Date());
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let records = load(KEY, {}), settings = load(SKEY, {});
let cur = blank(), dirty = false;
let calMonth = new Date(); calMonth.setDate(1);
function blank() {
  return { bedtime: '', waketime: '', sleepQuality: 0, sleepIssues: [], meals: [], mealNote: '', foods: [], water: 0,
    exercise: '', exTimes: [], exCount: 1, exNote: '', vas: 0, symptoms: [], note: '' };
}

/* VAS 색: 파랑(약) → 초록 → 주황 → 빨강(심함) */
const vasColor = v => ['', '#1d9a5b', '#3aa856', '#6aae45', '#9bb23a', '#c8ab2e', '#e0952a', '#e57a27', '#e05a2a', '#d63f2c', '#b3261e'][v] || '#999';
const vasEl = $('#vas');
for (let i = 1; i <= 10; i++) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = i; b.dataset.v = i;
  b.setAttribute('role', 'radio');
  b.onclick = () => { cur.vas = cur.vas === i ? 0 : i; touch(); };
  vasEl.appendChild(b);
}

/* 칩 / 세그먼트 / 예·아니오 */
$$('.chips').forEach(el => el.dataset.options.split(',').forEach(o => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = o; b.dataset.v = o;
  b.onclick = () => {
    const k = el.dataset.key; let a = cur[k] || [];
    if (o === '증상 없음') a = a.includes(o) ? [] : [o];
    else { a = a.filter(x => x !== '증상 없음'); a = a.includes(o) ? a.filter(x => x !== o) : [...a, o]; }
    cur[k] = a; touch();
  };
  el.appendChild(b);
}));
$$('.seg').forEach(el => el.dataset.options.split(',').forEach(p => {
  const [v, t] = p.split(':'); const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.dataset.v = v;
  b.onclick = () => { const k = el.dataset.key; cur[k] = cur[k] == v ? 0 : +v; touch(); };
  el.appendChild(b);
}));
$$('.yn').forEach(el => [...el.children].forEach(b => b.onclick = () => {
  const k = el.dataset.key; cur[k] = cur[k] === b.dataset.v ? '' : b.dataset.v; touch();
}));

/* 텍스트·시간 입력 */
['bedtime', 'waketime', 'mealNote', 'exNote', 'note'].forEach(id =>
  $('#' + id).addEventListener('input', e => { cur[id] = e.target.value; dirty = true; sleepCalc(); stateLine(); }));
$$('[data-step]').forEach(b => b.onclick = () => {
  const k = b.dataset.step, [lo, hi] = k === 'water' ? [0, 30] : [1, 20];
  cur[k] = Math.max(lo, Math.min(hi, cur[k] + +b.dataset.d)); touch();
});
const touch = () => { dirty = true; render(); };

function sleepHours(r) {
  if (!r.bedtime || !r.waketime) return null;
  const [bh, bm] = r.bedtime.split(':').map(Number), [wh, wm] = r.waketime.split(':').map(Number);
  let m = (wh * 60 + wm) - (bh * 60 + bm); if (m <= 0) m += 1440;
  return Math.round(m / 6) / 10;
}
function sleepCalc() { const h = sleepHours(cur); $('#sleepTotal').textContent = h == null ? '' : `총 수면시간 약 ${h}시간`; }
function stateLine() {
  const el = $('#state'), d = $('#date').value;
  el.className = 'state';
  if (dirty) el.textContent = '✎ 아직 저장 전입니다';
  else if (records[d]) { el.textContent = '✔ 이 날짜는 기록이 저장되어 있어요'; el.className = 'state saved'; }
  else el.textContent = d === todayStr() ? '오늘 기록을 작성해 주세요' : '아직 기록이 없는 날입니다';
}

function render() {
  $('#bedtime').value = cur.bedtime; $('#waketime').value = cur.waketime;
  ['mealNote', 'exNote', 'note'].forEach(k => $('#' + k).value = cur[k]);
  $('#waterVal').textContent = cur.water; $('#waterBig').textContent = cur.water;
  $('#exCountVal').textContent = cur.exCount; $('#exCountBig').textContent = cur.exCount;
  $('#exMore').hidden = cur.exercise !== 'yes';
  $$('.chips').forEach(el => [...el.children].forEach(b => b.classList.toggle('on', (cur[el.dataset.key] || []).includes(b.dataset.v))));
  $$('.seg').forEach(el => [...el.children].forEach(b => b.classList.toggle('on', cur[el.dataset.key] == b.dataset.v)));
  $$('.yn').forEach(el => [...el.children].forEach(b => b.classList.toggle('on', cur[el.dataset.key] === b.dataset.v)));
  [...vasEl.children].forEach(b => {
    const on = cur.vas === +b.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
    b.style.background = on ? vasColor(+b.dataset.v) : ''; });
  $('#vasBig').textContent = cur.vas ? cur.vas + ' / 10' : '–';
  $('#vasBig').style.color = cur.vas ? vasColor(cur.vas) : '';
  sleepCalc(); stateLine();
}

function openDate(d) {
  if (dirty && !confirm('저장하지 않은 내용이 있어요. 이동하면 사라집니다. 이동할까요?')) { $('#date').value = openDate.cur; return false; }
  openDate.cur = d; $('#date').value = d; dirty = false;
  cur = Object.assign(blank(), JSON.parse(JSON.stringify(records[d] || {})));
  calMonth = new Date(d + 'T00:00:00'); calMonth.setDate(1);
  render(); return true;
}
$('#date').addEventListener('change', e => e.target.value ? openDate(e.target.value) : (e.target.value = openDate.cur));
const shift = n => { const d = new Date($('#date').value + 'T00:00:00'); d.setDate(d.getDate() + n); openDate(ymd(d)); };
$('#prev').onclick = () => shift(-1);
$('#next').onclick = () => shift(1);
$('#todayBtn').onclick = () => openDate(todayStr());

$('#save').onclick = () => {
  const d = $('#date').value;
  records[d] = { ...cur, savedAt: Date.now() };
  const t = $('#toast');
  if (store(KEY, records)) { dirty = false; t.textContent = `${d} 기록이 저장되었습니다 ✔`; t.style.color = ''; }
  else { t.textContent = '저장에 실패했습니다. 브라우저 저장공간을 확인해 주세요.'; t.style.color = 'var(--warn)'; }
  t.hidden = false; setTimeout(() => t.hidden = true, 2500); stateLine();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* 탭 */
function showTab(name) {
  $$('.bottom button').forEach(x => x.classList.toggle('on', x.dataset.tab === name));
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  if (name === 'history') renderHistory();
  window.scrollTo(0, 0);
}
$$('.bottom button').forEach(b => b.onclick = () => showTab(b.dataset.tab));

/* 달력 + 추이 */
const dates = () => Object.keys(records).sort();
$('#mPrev').onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); renderHistory(); };
$('#mNext').onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); renderHistory(); };
function renderHistory() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth(), sel = $('#date').value, td = todayStr();
  $('#mTitle').textContent = `${y}년 ${m + 1}월`;
  let h = ['일', '월', '화', '수', '목', '금', '토'].map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < new Date(y, m, 1).getDay(); i++) h += '<button class="blank" tabindex="-1" aria-hidden="true"></button>';
  for (let day = 1; day <= new Date(y, m + 1, 0).getDate(); day++) {
    const d = ymd(new Date(y, m, day)), r = records[d];
    h += `<button data-d="${d}" class="${r ? 'rec ' : ''}${d === sel ? 'sel ' : ''}${d === td ? 'today' : ''}" aria-label="${d}${r ? ' 기록 있음' : ''}">${day}${r && r.vas ? `<i style="background:${vasColor(r.vas)}">${r.vas}</i>` : r ? '<i style="background:#7aa6d1">✔</i>' : ''}</button>`;
  }
  $('#cal').innerHTML = h;
  $$('#cal button[data-d]').forEach(b => b.onclick = () => { if (openDate(b.dataset.d)) showTab('today'); });

  const days = []; const t = new Date();
  for (let i = 13; i >= 0; i--) { const d = new Date(t); d.setDate(t.getDate() - i); days.push(ymd(d)); }
  const W = 320, H = 170, L = 24, R = 8, T = 10, B = 24, pw = W - L - R, ph = H - T - B;
  const x = i => L + pw * i / 13, yy = v => T + ph * (1 - v / 10);
  let s = '';
  [0, 5, 10].forEach(v => s += `<line x1="${L}" x2="${W - R}" y1="${yy(v)}" y2="${yy(v)}" stroke="#dbe5ee"/><text x="2" y="${yy(v) + 4}" font-size="10" fill="#566470">${v}</text>`);
  days.forEach((d, i) => { if (i % 3 === 0) s += `<text x="${x(i)}" y="${H - 6}" font-size="9" fill="#566470" text-anchor="middle">${d.slice(5)}</text>`; });
  const line = (fn, col) => {
    let p = '', dots = '';
    days.forEach((d, i) => { const r = records[d], v = r ? fn(r) : null; if (!v) return;
      const c = `${x(i)},${yy(Math.min(v, 10))}`; p += (p ? 'L' : 'M') + c; dots += `<circle cx="${x(i)}" cy="${yy(Math.min(v, 10))}" r="3.5" fill="${col}"/>`; });
    return `<path d="${p}" fill="none" stroke="${col}" stroke-width="2"/>` + dots;
  };
  $('#chart').innerHTML = s + line(sleepHours, '#0f58a0') + line(r => r.vas, '#b3261e');
  const rs = days.map(d => records[d]).filter(Boolean);
  const avg = a => a.length ? (a.reduce((p, q) => p + q, 0) / a.length).toFixed(1) : '-';
  const ex = rs.filter(r => r.exercise === 'yes').length;
  $('#avgText').textContent = rs.length ? `최근 14일(기록 ${rs.length}일) 평균 — 증상 VAS ${avg(rs.map(r => r.vas).filter(Boolean))}, 수면 ${avg(rs.map(sleepHours).filter(v => v != null))}시간, 신경회복운동 ${ex}일` : '아직 기록이 없습니다.';
}

/* 내보내기 */
const exLabel = r => r.exercise === 'yes' ? `했음(${r.exTimes.join('·') || '-'} ${r.exCount}회)` : r.exercise === 'no' ? '못 함' : '-';
function summary() {
  const ds = dates().slice(-7);
  return `[강남뇌편한의원 생활관리] ${settings.name || '환자'} 최근 ${ds.length}일 기록\n` + ds.map(d => {
    const r = records[d];
    return `${d} | 증상 VAS ${r.vas || '-'}/10 (${r.symptoms.join('·') || '-'}) | 수면 ${sleepHours(r) ?? '-'}h 질${r.sleepQuality || '-'}/5 ${r.sleepIssues.join('·')} | 식사 ${r.meals.join('·') || '-'} ${r.mealNote} ${r.foods.join('·')} | 물 ${r.water}잔 | 신경회복운동 ${exLabel(r)}${r.exNote ? ' ' + r.exNote : ''} | 특이사항: ${r.note || '-'}`;
  }).join('\n');
}
$('#copyBtn').onclick = async () => {
  if (!dates().length) return alert('저장된 기록이 없습니다.');
  try { await navigator.clipboard.writeText(summary()); alert('요약이 복사되었습니다.'); } catch { prompt('아래 내용을 복사하세요', summary()); }
};
$('#csvBtn').onclick = () => {
  if (!dates().length) return alert('저장된 기록이 없습니다.');
  const cols = [['date', '날짜'], ['vas', '증상VAS(1-10)'], ['symptoms', '증상'], ['note', '증상 특이사항'], ['bedtime', '잠든 시각'], ['waketime', '일어난 시각'], ['sleepHours', '수면시간'], ['sleepQuality', '수면의 질(1-5)'], ['sleepIssues', '수면 불편'], ['meals', '끼니'], ['mealNote', '식사 내용'], ['foods', '식습관'], ['water', '물(잔)'], ['exercise', '신경회복운동'], ['exTimes', '운동 시간대'], ['exCount', '운동 횟수'], ['exNote', '운동 메모']];
  const q = v => '"' + String(Array.isArray(v) ? v.join('/') : v ?? '').replace(/"/g, '""') + '"';
  const rows = dates().map(d => cols.map(([c]) => q(c === 'date' ? d : c === 'sleepHours' ? sleepHours(records[d]) : c === 'exercise' ? ({ yes: '함', no: '안 함' }[records[d].exercise] || '') : records[d][c])).join(','));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + cols.map(c => c[1]).join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = `생활관리기록_${todayStr()}.csv`; a.click();
};

/* 설정 */
$('#pname').value = settings.name || ''; $('#remind').value = settings.remind || '21:00';
$('#saveSettings').onclick = async () => {
  settings = { name: $('#pname').value.trim(), remind: $('#remind').value }; store(SKEY, settings);
  if ('Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch {} }
  alert('저장되었습니다.');
};
setInterval(() => {
  const n = new Date();
  if (settings.remind === n.toTimeString().slice(0, 5) && !records[todayStr()] && 'Notification' in window && Notification.permission === 'granted' && sessionStorage.getItem('rem') !== todayStr()) {
    sessionStorage.setItem('rem', todayStr()); new Notification('강남뇌편한의원 생활관리', { body: '오늘 기록을 남겨주세요 🌿', icon: 'icons/icon-192.png' });
  }
}, 30000);
$('#wipe').onclick = () => { if (confirm('모든 기록을 삭제할까요? 되돌릴 수 없습니다.')) { records = {}; store(KEY, records); dirty = false; openDate(todayStr()); alert('삭제되었습니다.'); } };
let dip; window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; $('#installBtn').hidden = false; });
$('#installBtn').onclick = async () => { if (dip) { dip.prompt(); dip = null; $('#installBtn').hidden = true; } };

openDate(todayStr());
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
