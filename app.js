'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KEY = 'hanbang-records-v1', SKEY = 'hanbang-settings-v1';
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const ymd = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };

let records = load(KEY, {});
let settings = load(SKEY, {});
let cur = blank();
function blank() {
  return { bedtime: '', waketime: '', sleepQuality: 0, sleepIssues: [], pain: 0, painAreas: [], painType: [],
    painNote: '', meals: [], mealNote: '', foods: [], water: 0, digestion: 0, exercise: 0, stress: 0, mood: 0,
    bowel: [], care: [], note: '' };
}

/* ---------- 선택 위젯 만들기 ---------- */
$$('.chips').forEach(el => {
  const single = el.classList.contains('single');
  el.dataset.options.split(',').forEach(o => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = o; b.dataset.v = o;
    b.onclick = () => {
      const k = el.dataset.key; let a = cur[k] || [];
      if (single) a = a.includes(o) ? [] : [o];
      else a = a.includes(o) ? a.filter(x => x !== o) : [...a, o];
      cur[k] = a; render();
    };
    el.appendChild(b);
  });
});
$$('.seg').forEach(el => {
  el.dataset.options.split(',').forEach(p => {
    const [v, t] = p.split(':'); const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.dataset.v = v;
    b.onclick = () => { const k = el.dataset.key; cur[k] = cur[k] == v ? 0 : +v; render(); };
    el.appendChild(b);
  });
});

/* ---------- 입력 바인딩 ---------- */
const binds = { bedtime: 'bedtime', waketime: 'waketime', painNote: 'painNote', mealNote: 'mealNote', note: 'note' };
Object.entries(binds).forEach(([id, k]) => $('#' + id).addEventListener('input', e => { cur[k] = e.target.value; sleepCalc(); }));
$('#pain').addEventListener('input', e => { cur.pain = +e.target.value; $('#painVal').textContent = cur.pain; });
$('#exercise').addEventListener('input', e => { cur.exercise = +e.target.value; $('#exVal').textContent = cur.exercise; });
$$('[data-step]').forEach(b => b.onclick = () => {
  cur.water = Math.max(0, Math.min(30, cur.water + +b.dataset.d)); render();
});

function sleepHours(r) {
  if (!r.bedtime || !r.waketime) return null;
  const [bh, bm] = r.bedtime.split(':').map(Number), [wh, wm] = r.waketime.split(':').map(Number);
  let m = (wh * 60 + wm) - (bh * 60 + bm); if (m <= 0) m += 1440;
  return Math.round(m / 6) / 10;
}
function sleepCalc() {
  const h = sleepHours(cur);
  $('#sleepTotal').textContent = h == null ? '' : `총 수면시간: 약 ${h}시간`;
}

function render() {
  $('#bedtime').value = cur.bedtime; $('#waketime').value = cur.waketime;
  $('#pain').value = cur.pain; $('#painVal').textContent = cur.pain;
  $('#exercise').value = cur.exercise; $('#exVal').textContent = cur.exercise;
  $('#painNote').value = cur.painNote; $('#mealNote').value = cur.mealNote; $('#note').value = cur.note;
  $('#waterVal').textContent = cur.water; $('#waterBig').textContent = cur.water;
  $$('.chips').forEach(el => [...el.children].forEach(b => b.classList.toggle('on', (cur[el.dataset.key] || []).includes(b.dataset.v))));
  $$('.seg').forEach(el => [...el.children].forEach(b => b.classList.toggle('on', cur[el.dataset.key] == b.dataset.v)));
  sleepCalc();
}

function openDate(d) {
  $('#date').value = d;
  cur = Object.assign(blank(), records[d] || {});
  render();
}
$('#date').addEventListener('change', e => e.target.value && openDate(e.target.value));
const shift = n => { const d = new Date($('#date').value + 'T00:00:00'); d.setDate(d.getDate() + n); openDate(ymd(d)); };
$('#prev').onclick = () => shift(-1);
$('#next').onclick = () => shift(1);

$('#save').onclick = () => {
  records[$('#date').value] = { ...cur, savedAt: Date.now() };
  store(KEY, records);
  const t = $('#toast'); t.hidden = false; setTimeout(() => t.hidden = true, 1800);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ---------- 탭 ---------- */
$$('.bottom button').forEach(b => b.onclick = () => {
  $$('.bottom button').forEach(x => x.classList.toggle('on', x === b));
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
  if (b.dataset.tab === 'history') renderHistory();
  window.scrollTo(0, 0);
});

/* ---------- 기록 보기 ---------- */
const dates = () => Object.keys(records).sort();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function renderHistory() {
  const ds = dates();
  $('#list').innerHTML = ds.length ? ds.slice().reverse().map(d => {
    const r = records[d], h = sleepHours(r);
    return `<li><b>${d}</b> 통증 ${r.pain}/10 · 수면 ${h ?? '-'}h(질 ${r.sleepQuality || '-'}/5) · 물 ${r.water}잔 · 운동 ${r.exercise}분
      <small>${esc([...r.painAreas, ...r.foods].join(', '))}${r.note ? ' — ' + esc(r.note) : ''}</small></li>`;
  }).join('') : '<li>아직 기록이 없습니다.</li>';

  const days = []; const t = new Date();
  for (let i = 13; i >= 0; i--) { const d = new Date(t); d.setDate(t.getDate() - i); days.push(ymd(d)); }
  const W = 320, H = 160, L = 24, R = 8, T = 10, B = 24, pw = W - L - R, ph = H - T - B;
  const x = i => L + pw * i / 13, y = (v, max) => T + ph * (1 - v / max);
  let s = '';
  [0, 5, 10].forEach(v => { s += `<line x1="${L}" x2="${W - R}" y1="${y(v, 10)}" y2="${y(v, 10)}" stroke="#ddd"/><text x="2" y="${y(v, 10) + 4}" font-size="10" fill="#888">${v}</text>`; });
  days.forEach((d, i) => { if (i % 3 === 0) s += `<text x="${x(i)}" y="${H - 6}" font-size="9" fill="#888" text-anchor="middle">${d.slice(5)}</text>`; });
  const line = (fn, max, col) => {
    let p = '', dots = '';
    days.forEach((d, i) => { const v = fn(records[d]); if (v == null) return; p += (p ? 'L' : 'M') + x(i) + ',' + y(Math.min(v, max), max); dots += `<circle cx="${x(i)}" cy="${y(Math.min(v, max), max)}" r="3" fill="${col}"/>`; });
    return `<path d="${p}" fill="none" stroke="${col}" stroke-width="2"/>` + dots;
  };
  s += line(r => r ? sleepHours(r) : null, 10, '#3c6fa8') + line(r => r ? r.pain : null, 10, '#c0483a');
  $('#chart').innerHTML = s;
  const rs = days.map(d => records[d]).filter(Boolean);
  const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-';
  $('#avgText').textContent = rs.length ? `14일 평균 — 통증 ${avg(rs.map(r => r.pain))}/10, 수면 ${avg(rs.map(sleepHours).filter(v => v != null))}시간, 운동 ${avg(rs.map(r => r.exercise))}분` : '';
}

function summary() {
  const ds = dates().slice(-7);
  const head = `[${settings.name || '환자'}] 최근 ${ds.length}일 건강 기록\n`;
  return head + ds.map(d => {
    const r = records[d];
    return `${d} | 통증 ${r.pain}/10 (${r.painAreas.join('·') || '-'}) | 수면 ${sleepHours(r) ?? '-'}h 질${r.sleepQuality || '-'}/5 ${r.sleepIssues.join('·')} | 식사 ${r.meals.join('·') || '-'} ${r.foods.join('·')} | 물 ${r.water}잔 | 소화 ${r.digestion || '-'}/4 | 운동 ${r.exercise}분 | 스트레스 ${r.stress || '-'}/5 | 대변 ${r.bowel.join('') || '-'} | ${r.care.join('·')}${r.note ? ' | ' + r.note : ''}`;
  }).join('\n');
}
$('#copyBtn').onclick = async () => {
  try { await navigator.clipboard.writeText(summary()); alert('요약이 복사되었습니다.'); }
  catch { prompt('아래 내용을 복사하세요', summary()); }
};
$('#csvBtn').onclick = () => {
  const cols = ['date', 'pain', 'painAreas', 'painType', 'painNote', 'bedtime', 'waketime', 'sleepHours', 'sleepQuality', 'sleepIssues', 'meals', 'mealNote', 'foods', 'water', 'digestion', 'exercise', 'stress', 'mood', 'bowel', 'care', 'note'];
  const q = v => '"' + String(Array.isArray(v) ? v.join('/') : v ?? '').replace(/"/g, '""') + '"';
  const rows = dates().map(d => cols.map(c => q(c === 'date' ? d : c === 'sleepHours' ? sleepHours(records[d]) : records[d][c])).join(','));
  const blob = new Blob(['﻿' + cols.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `건강기록_${ymd(new Date())}.csv`; a.click();
};

/* ---------- 설정 / 알림 / 설치 ---------- */
$('#pname').value = settings.name || ''; $('#remind').value = settings.remind || '21:00';
$('#saveSettings').onclick = async () => {
  settings = { name: $('#pname').value.trim(), remind: $('#remind').value }; store(SKEY, settings);
  if ('Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch {} }
  alert('저장되었습니다.');
};
setInterval(() => {
  const n = new Date(), hm = n.toTimeString().slice(0, 5);
  if (settings.remind === hm && !records[ymd(n)] && 'Notification' in window && Notification.permission === 'granted' && sessionStorage.getItem('rem') !== ymd(n)) {
    sessionStorage.setItem('rem', ymd(n)); new Notification('🌿 오늘 건강 기록을 남겨주세요');
  }
}, 30000);
$('#wipe').onclick = () => { if (confirm('모든 기록을 삭제할까요? 되돌릴 수 없습니다.')) { records = {}; store(KEY, records); openDate(ymd(new Date())); alert('삭제되었습니다.'); } };
let dip; window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; $('#installBtn').hidden = false; });
$('#installBtn').onclick = async () => { if (dip) { dip.prompt(); dip = null; $('#installBtn').hidden = true; } };

openDate(ymd(new Date()));
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
