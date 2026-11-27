/* mm.js - all calculations and drawing for the MM machine and spares monitor.
   Everything is kept in this browser (localStorage). All sample figures are MADE UP. */
(function () {
'use strict';

var HOURS_MONTH = 720;          // 30 days x 24 hours
var INDENT_TO_PO_NORM = 60;     // days we expect from indent to purchase order (made up)
var KEY = 'mm-monitor-v1';

/* ---------------- Sample data (made up) ---------------- */
var SAMPLE = {
  machines: [
    { id: 'SH-01', name: 'Electric rope shovel 10 m³', work: 'Overburden loading', unit: 'BCM', count: 1, avail: 82, util: 70, output: 600, value: 120, running: 14000, fixed: 5500000 },
    { id: 'HE-02', name: 'Hydraulic excavator 5 m³', work: 'Coal loading', unit: 't', count: 1, avail: 75, util: 55, output: 450, value: 160, running: 9000, fixed: 3000000 },
    { id: 'DP-07', name: 'Rear dumper 100 t', work: 'Overburden hauling', unit: 'BCM', count: 6, avail: 70, util: 50, output: 180, value: 60, running: 6500, fixed: 1200000 },
    { id: 'DR-03', name: 'Blast-hole drill 250 mm', work: 'Drilling', unit: 'm', count: 1, avail: 78, util: 50, output: 28, value: 900, running: 5000, fixed: 900000 },
    { id: 'DP-11', name: 'Old rear dumper 85 t (14 years)', work: 'Coal hauling', unit: 'BCM', count: 1, avail: 45, util: 50, output: 140, value: 60, running: 9000, fixed: 800000 }
  ],
  links: [
    { from: 'DR-03', to: 'SH-01', buffer: 4, idled: 1, why: 'blasted rock in hand runs out' },
    { from: 'SH-01', to: 'DP-07', buffer: 0, idled: 4, why: 'the dumpers on that shovel have nothing to carry' }
  ],
  spare: {
    machine: 'SH-01', item: 'Undercarriage assembly',
    aName: 'Original make (OEM)', aPrice: 20000000, aLife: 15000, aFit: 72, aLead: 180,
    bName: 'Rebuilt / other make', bPrice: 13000000, bLife: 9000, bFit: 72, bLead: 90
  },
  ld: { rate: 0.5, cap: 10 },
  abc: { a: 70, b: 90 },        // ABC cut-offs, % of yearly spend
  spares: [   // individual spares in the stores (made up)
    { code: 'MM-0101', item: 'Track shoe', machine: 'SH-01', store: 'Central store', price: 85000, stock: 6, onOrder: 0, use: 2, lead: 120, safety: 15, critical: 'High', lastIssued: '2026-11-10', life: 12000 },
    { code: 'MM-0102', item: 'Dipper tooth', machine: 'SH-01', store: 'Area store East', price: 42000, stock: 40, onOrder: 0, use: 8, lead: 60, safety: 15, critical: 'Medium', lastIssued: '2026-11-20', life: 0 },
    { code: 'MM-0103', item: 'Hoist rope (set)', machine: 'SH-01', store: 'Central store', price: 1800000, stock: 0, onOrder: 0, use: 0.33, lead: 130, safety: 15, critical: 'High', lastIssued: '2026-09-28', life: 3000 },
    { code: 'MM-0104', item: 'Undercarriage idler', machine: 'SH-01', store: 'Central store', price: 650000, stock: 1, onOrder: 0, use: 0.1, lead: 150, safety: 30, critical: 'Medium', lastIssued: '2026-04-02', life: 15000 },
    { code: 'MM-0201', item: 'Bucket tooth', machine: 'HE-02', store: 'Area store East', price: 18000, stock: 60, onOrder: 0, use: 10, lead: 45, safety: 15, critical: 'Medium', lastIssued: '2026-11-18', life: 0 },
    { code: 'MM-0202', item: 'Hydraulic hose', machine: 'HE-02', store: 'Area store East', price: 12000, stock: 120, onOrder: 0, use: 6, lead: 30, safety: 15, critical: 'Low', lastIssued: '2026-11-05', life: 0 },
    { code: 'MM-0301', item: 'Tyre 27.00 R49', machine: 'DP-07', store: 'Central store', price: 1200000, stock: 2, onOrder: 6, use: 1, lead: 110, safety: 15, critical: 'High', lastIssued: '2026-10-30', life: 5000 },
    { code: 'MM-0302', item: 'Brake disc', machine: 'DP-07', store: 'Central store', price: 140000, stock: 12, onOrder: 0, use: 1, lead: 75, safety: 15, critical: 'Medium', lastIssued: '2026-10-12', life: 0 },
    { code: 'MM-0401', item: 'Drill bit 250 mm', machine: 'DR-03', store: 'Area store East', price: 95000, stock: 1, onOrder: 0, use: 4, lead: 60, safety: 15, critical: 'High', lastIssued: '2026-11-22', life: 400 },
    { code: 'MM-0402', item: 'Rotary head gearbox', machine: 'DR-03', store: 'Central store', price: 2400000, stock: 0, onOrder: 0, use: 0.05, lead: 120, safety: 15, critical: 'High', lastIssued: '2025-02-14', life: 6000 },
    { code: 'MM-0501', item: 'Engine assembly (old model)', machine: 'DP-11', store: 'Central store', price: 1500000, stock: 2, onOrder: 0, use: 0, lead: 100, safety: 15, critical: 'Low', lastIssued: '2024-08-15', life: 12000 },
    { code: 'MM-0502', item: 'Gear pump (model discontinued)', machine: 'DP-11', store: 'Central store', price: 220000, stock: 5, onOrder: 0, use: 0, lead: 90, safety: 15, critical: 'Low', lastIssued: '2023-12-01', life: 0 }
  ],
  fitted: [   // spares now fitted on machines, for the indent early warning (made up)
    { id: 'W1', item: 'Hoist rope set', machine: 'SH-01', life: 3000, run: 800, readOn: '2026-11-25', lead: 130, safety: 15, price: 1800000, raised: 'no' },
    { id: 'W2', item: 'Rotary head gearbox', machine: 'DR-03', life: 6000, run: 5300, readOn: '2026-11-25', lead: 120, safety: 15, price: 2400000, raised: 'no' },
    { id: 'W3', item: 'Tyres 27.00 R49 (set of 6)', machine: 'DP-07', life: 5000, run: 4400, readOn: '2026-11-25', lead: 110, safety: 15, price: 7200000, raised: 'yes' },
    { id: 'W4', item: 'Bucket lip and adapters', machine: 'HE-02', life: 8000, run: 6900, readOn: '2026-11-25', lead: 90, safety: 15, price: 1100000, raised: 'no' },
    { id: 'W5', item: 'Undercarriage assembly', machine: 'SH-01', life: 15000, run: 400, readOn: '2026-11-25', lead: 240, safety: 30, price: 20000000, raised: 'no' },
    { id: 'W6', item: 'Engine (overhaul)', machine: 'DP-11', life: 12000, run: 11800, readOn: '2026-11-25', lead: 100, safety: 15, price: 1500000, raised: 'no' }
  ],   // penalty for late supply: % of order value per week, and the cap (made up)
  orders: [
    { id: 'PO-26-014', item: 'Undercarriage assembly (track set)', machine: 'SH-01', location: 'East quarry', supplier: 'Vendor A', value: 20000000, urgency: 'High', status: 'Resolved', indent: '2026-03-02', po: '2026-06-20', promised: '2026-09-30', required: '2026-09-15', actual: '2026-10-28', stopped: 1 },
    { id: 'PO-26-009', item: 'Engine overhaul kit', machine: 'DP-11', location: 'Coal bench 2', supplier: 'Vendor E', value: 1500000, urgency: 'Medium', status: 'Resolved', indent: '2026-02-10', po: '2026-05-30', promised: '2026-07-15', required: '2026-07-01', actual: '2026-08-20', stopped: 1 },
    { id: 'PO-26-021', item: 'Hoist rope set', machine: 'SH-01', location: 'East quarry', supplier: 'Vendor B', value: 1800000, urgency: 'Low', status: 'Resolved', indent: '2026-07-01', po: '2026-08-05', promised: '2026-09-20', required: '2026-10-01', actual: '2026-09-28', stopped: 0 },
    { id: 'PO-26-027', item: 'Drill bit and rod set', machine: 'DR-03', location: 'East quarry', supplier: 'Vendor C', value: 950000, urgency: 'High', status: 'In progress', indent: '2026-08-10', po: '2026-09-25', promised: '2026-10-25', required: '2026-11-05', actual: '', stopped: 1 },
    { id: 'PO-26-031', item: 'Tyres 27.00 R49 (set of 6)', machine: 'DP-07', location: 'Haul road 3', supplier: 'Vendor D', value: 7200000, urgency: 'High', status: 'In progress', indent: '2026-07-15', po: '2026-09-01', promised: '2026-11-10', required: '2026-11-20', actual: '', stopped: 1 },
    { id: 'PO-26-035', item: 'Swing motor', machine: 'HE-02', location: 'Coal bench 1', supplier: 'Vendor B', value: 2600000, urgency: 'Medium', status: 'Open', indent: '2026-09-05', po: '2026-10-20', promised: '2026-12-15', required: '2026-12-20', actual: '', stopped: 1 },
    { id: 'PO-26-004', item: 'Bucket teeth set', machine: 'HE-02', location: 'Coal bench 1', supplier: 'Vendor B', value: 450000, urgency: 'Low', status: 'Resolved', indent: '2026-01-20', po: '2026-03-05', promised: '2026-04-10', required: '2026-04-30', actual: '2026-04-06', stopped: 0 },
    { id: 'PO-26-011', item: 'Hydraulic hose kit', machine: 'HE-02', location: 'Coal bench 1', supplier: 'Vendor B', value: 320000, urgency: 'Low', status: 'Resolved', indent: '2026-04-02', po: '2026-05-10', promised: '2026-06-15', required: '2026-07-01', actual: '2026-06-12', stopped: 0 },
    { id: 'PO-26-006', item: 'Brake discs', machine: 'DP-07', location: 'Haul road 3', supplier: 'Vendor F', value: 850000, urgency: 'Medium', status: 'Resolved', indent: '2026-02-01', po: '2026-03-20', promised: '2026-05-05', required: '2026-05-20', actual: '2026-05-02', stopped: 0 },
    { id: 'PO-26-018', item: 'Compressor filter set', machine: 'DR-03', location: 'East quarry', supplier: 'Vendor F', value: 260000, urgency: 'Low', status: 'Resolved', indent: '2026-05-12', po: '2026-06-15', promised: '2026-07-20', required: '2026-08-01', actual: '2026-07-18', stopped: 0 },
    { id: 'PO-26-024', item: 'Dipper teeth', machine: 'SH-01', location: 'East quarry', supplier: 'Vendor F', value: 600000, urgency: 'Medium', status: 'Resolved', indent: '2026-06-10', po: '2026-07-22', promised: '2026-08-30', required: '2026-09-10', actual: '2026-08-30', stopped: 0 },
    { id: 'PO-26-012', item: 'Track pads (spare set)', machine: 'SH-01', location: 'East quarry', supplier: 'Vendor A', value: 1800000, urgency: 'Medium', status: 'Resolved', indent: '2026-03-15', po: '2026-05-02', promised: '2026-07-01', required: '2026-07-20', actual: '2026-06-28', stopped: 0 },
    { id: 'PO-26-016', item: 'Suspension cylinder', machine: 'DP-07', location: 'Haul road 3', supplier: 'Vendor D', value: 1400000, urgency: 'Medium', status: 'Resolved', indent: '2026-04-10', po: '2026-05-25', promised: '2026-07-10', required: '2026-07-25', actual: '2026-07-08', stopped: 0 }
  ]
};

/* ---------------- Helpers ---------------- */
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
function rs(x) {
  var neg = x < 0, a = Math.abs(x), s;
  if (a >= 1e7) s = (a / 1e7).toFixed(a >= 1e8 ? 1 : 2) + ' Cr';
  else if (a >= 1e5) s = (a / 1e5).toFixed(1) + ' L';
  else s = Math.round(a).toLocaleString('en-IN');
  return (neg ? '− ' : '') + 'Rs ' + s;
}
function int(x) { return Math.round(x).toLocaleString('en-IN'); }
function qty(x) { return x >= 1e5 ? (x / 1e5).toFixed(1) + ' lakh' : int(x); }
function day(s) { if (!s) return null; var d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d; }
function diff(a, b) { return Math.round((b - a) / 864e5); }   // days from a to b
function fmtDate(s) { var d = day(s); return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'; }
function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

function showError(msg, e) {
  $('err').innerHTML = esc(msg) + (e ? '<code>' + esc(e && e.message ? e.message : e) + '</code>' : '');
}

/* ---------------- Saving ---------------- */
var S;
function load() {
  try { var t = localStorage.getItem(KEY); if (t) { var o = JSON.parse(t); if (o && o.machines && o.orders) return o; } } catch (e) {}
  return clone(SAMPLE);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); $('saved').textContent = 'Saved in this browser.'; }
  catch (e) { $('saved').textContent = 'Could not save in this browser: ' + e.message; }
}
function machine(id) { for (var i = 0; i < S.machines.length; i++) if (S.machines[i].id === id) return S.machines[i]; return null; }

/* ---------------- Calculations ---------------- */
// One machine (figures per single machine, plus fleet profit for the whole count)
function calcMachine(m) {
  var fitHrs = HOURS_MONTH * num(m.avail) / 100;
  var hrsMonth = fitHrs * num(m.util) / 100;
  var earnHr = num(m.output) * num(m.value);
  var marginHr = earnHr - num(m.running);
  var profit = hrsMonth * marginHr - num(m.fixed);
  var breakEven = marginHr > 0 && fitHrs > 0 ? num(m.fixed) / (fitHrs * marginHr) * 100 : Infinity;
  var level = marginHr <= 0 ? 'bad' : profit < 0 ? 'warn' : 'ok';
  return { hrsMonth: hrsMonth, hrsDay: hrsMonth / 30, earnHr: earnHr, marginHr: marginHr, profit: profit,
           fleetProfit: profit * Math.max(1, num(m.count)), breakEven: breakEven, level: level,
           outputMonth: hrsMonth * num(m.output) };
}

// Domino: machine `id` stopped `days` days, `n` machines. Follow the links.
function domino(id, days, n, depth, seen) {
  var m = machine(id), out = [];
  if (!m || days <= 0 || n <= 0 || depth > 6 || seen[id]) return out;
  seen[id] = true;
  var c = calcMachine(m);
  out.push({ id: id, name: m.name, days: days, n: n, lost: days * n * c.hrsDay * Math.max(0, c.marginHr),
             lostQty: days * n * c.hrsDay * num(m.output), unit: m.unit, marginHr: c.marginHr, depth: depth });
  S.links.forEach(function (l) {
    if (l.from === id) out = out.concat(domino(l.to, days - num(l.buffer), num(l.idled), depth + 1, seen));
  });
  seen[id] = false;
  return out;
}

function calcOrder(o) {
  var now = today(), indent = day(o.indent), po = day(o.po), promised = day(o.promised),
      required = day(o.required), actual = day(o.actual);
  var end = actual || now;
  var r = {};
  r.received = !!actual;
  r.indentToPO = indent ? diff(indent, po || now) : 0;
  r.poPlaced = !!po;
  r.poToDelivery = po ? Math.max(0, diff(po, end)) : 0;
  r.late = promised ? Math.max(0, diff(promised, end)) : 0;
  r.idle = (num(o.stopped) > 0 && required) ? Math.max(0, diff(required, end)) : 0;
  r.chain = r.idle > 0 ? domino(o.machine, r.idle, num(o.stopped), 0, {}) : [];
  r.lost = r.chain.reduce(function (s, x) { return s + x.lost; }, 0);
  r.level = r.lost > 0 ? 'bad' : (r.idle > 0 || r.late > 0) ? 'warn' : 'ok';
  return r;
}

function calcSpare() {
  var sp = S.spare, m = machine(sp.machine) || S.machines[0];
  var c = calcMachine(m);
  function opt(p) {
    var price = num(sp[p + 'Price']), life = Math.max(1, num(sp[p + 'Life'])), fit = num(sp[p + 'Fit']);
    var fitLoss = fit * Math.max(0, c.marginHr);
    return { name: sp[p + 'Name'] || (p === 'a' ? 'Option A' : 'Option B'), price: price, life: life, lead: num(sp[p + 'Lead']),
             perHr: (price + fitLoss) / life, years: c.hrsMonth > 0 ? life / (c.hrsMonth * 12) : Infinity };
  }
  var A = opt('a'), B = opt('b');
  var r = { m: m, c: c, A: A, B: B };
  r.lifeOutput = A.life * num(m.output);
  r.lifeValue = r.lifeOutput * num(m.value);
  r.lifeMargin = A.life * c.marginHr;
  r.share = r.lifeValue > 0 ? A.price / r.lifeValue * 100 : Infinity;
  r.paybackHrs = c.marginHr > 0 ? A.price / c.marginHr : Infinity;
  r.paybackDays = c.hrsDay > 0 ? r.paybackHrs / c.hrsDay : Infinity;
  r.dayWithout = c.hrsDay * Math.max(0, c.marginHr);
  return r;
}

/* ---------------- Drawing: hero and summary ---------------- */
var charts = {};
function chartColors() {
  return { c1: cssVar('--c1'), c2: cssVar('--c2'), neg: cssVar('--neg'), grid: cssVar('--grid'), ink: cssVar('--muted') };
}
function baseOpts(col) {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: col.grid }, ticks: { color: col.ink } },
      y: { grid: { color: col.grid }, ticks: { color: col.ink } }
    }
  };
}
function drawChart(id, cfg) {
  if (!window.Chart) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($(id), cfg);
}

function renderSummary() {
  var mc = S.machines.map(function (m) { return { m: m, c: calcMachine(m) }; });
  var oc = S.orders.map(function (o) { return { o: o, r: calcOrder(o) }; });
  var fleet = mc.reduce(function (s, x) { return s + x.c.fleetProfit; }, 0);
  var losing = mc.filter(function (x) { return x.c.level !== 'ok'; });
  var lost = oc.reduce(function (s, x) { return s + x.r.lost; }, 0);
  var lateNow = oc.filter(function (x) { return !x.r.received && x.r.late > 0; });

  $('asOf').textContent = today().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  $('kProfit').textContent = rs(fleet);
  $('kProfit').className = 'v ' + (fleet >= 0 ? 'ok' : 'bad');
  $('kLosing').textContent = losing.length + ' of ' + mc.length;
  $('kLosing').className = 'v ' + (losing.length ? 'warn' : 'ok');
  $('kLost').textContent = rs(lost);
  $('kLate').textContent = String(lateNow.length);

  var worst = oc.slice().sort(function (a, b) { return b.r.lost - a.r.lost; })[0];
  if (lost > 0) {
    $('headline').innerHTML = 'Late spares cost <span class="hl">' + esc(rs(lost)) + '</span> in lost production';
    $('lede').innerHTML = 'The worst was <b>' + esc(worst.o.item) + '</b> for ' + esc(worst.o.machine) + ': it came ' + worst.r.idle +
      ' days after it was needed and, with the machines that stopped after it, cost <b>' + esc(rs(worst.r.lost)) + '</b>' +
      (num(worst.o.value) > 0 ? ' — ' + (worst.r.lost / num(worst.o.value)).toFixed(1) + ' times the price of the spare itself.' : '.');
  } else {
    $('headline').textContent = 'No machine is standing idle for a late spare';
    $('lede').textContent = 'Keep the purchase orders below up to date to see any delays early.';
  }

  // Actions
  var acts = [];
  mc.forEach(function (x) {
    if (x.c.level === 'bad') acts.push(['bad', 'Stop', '<b>' + esc(x.m.id) + ' ' + esc(x.m.name) + '</b> loses ' + esc(rs(-x.c.marginHr)) + ' every hour it runs. Do not buy big spares for it. Review it for disposal or a different job.']);
    else if (x.c.level === 'warn') acts.push(['warn', 'Watch', '<b>' + esc(x.m.id) + ' ' + esc(x.m.name) + '</b> covers its running cost but not its fixed cost. Raise utilisation from ' + num(x.m.util) + '% to ' +
      (isFinite(x.c.breakEven) && x.c.breakEven <= 100 ? Math.ceil(x.c.breakEven) + '%' : 'over 100% (not possible — cut cost instead)') + ' to break even.']);
  });
  oc.filter(function (x) { return x.r.lost > 0; }).sort(function (a, b) { return b.r.lost - a.r.lost; }).forEach(function (x) {
    acts.push(['bad', 'Delay', '<b>' + esc(x.o.item) + '</b> (' + esc(x.o.machine) + ', ' + esc(x.o.supplier) + '): ' + x.r.idle + ' idle days, ' + esc(rs(x.r.lost)) + ' lost' +
      (x.r.chain.length > 1 ? ' including ' + (x.r.chain.length - 1) + ' machine type(s) stopped by the domino' : '') + '.' + (x.r.received ? '' : ' <b>Still not received — chase the supplier.</b>')]);
  });
  oc.filter(function (x) { return !x.r.received && x.r.late > 0 && x.r.lost === 0; }).forEach(function (x) {
    acts.push(['warn', 'Chase', '<b>' + esc(x.o.item) + '</b> from ' + esc(x.o.supplier) + ' is ' + x.r.late + ' days past the promised date. The machine has not stopped yet.']);
  });
  oc.filter(function (x) { return x.r.idle > 0 && x.r.lost === 0; }).forEach(function (x) {
    acts.push(['plain', 'Note', '<b>' + esc(x.o.machine) + '</b> stood ' + x.r.idle + ' days for <b>' + esc(x.o.item) + '</b>, but this machine loses money when it runs, so the delay cost nothing in profit.']);
  });
  var slow = oc.filter(function (x) { return x.r.poPlaced; });
  if (slow.length) {
    var avg = slow.reduce(function (s, x) { return s + x.r.indentToPO; }, 0) / slow.length;
    if (avg > INDENT_TO_PO_NORM) acts.push(['warn', 'Process', 'Indent to purchase order takes <b>' + Math.round(avg) + ' days</b> on average against a norm of ' + INDENT_TO_PO_NORM + '. Start indents for long-lead spares earlier, or use rate contracts.']);
  }
  var stk = sparesList().map(function (sp) { return { sp: sp, r: calcStock(sp) }; });
  var crit = stk.filter(function (x) { return x.r.reorder && x.sp.critical === 'High'; });
  if (crit.length) acts.push(['bad', 'Stock', 'Reorder now — critical spares at or below reorder level: <b>' + crit.map(function (x) { return esc(x.sp.item) + ' (' + esc(x.sp.machine) + ')'; }).join(', ') + '</b>.']);
  var lk = stk.reduce(function (t, x) { return t + x.r.locked; }, 0);
  if (lk > 0) acts.push(['warn', 'Stock', '<b>' + esc(rs(lk)) + '</b> is locked in dead stock or extra stock. Offer it to other areas or dispose of it, and stop ordering overstocked items.']);
  fittedList().forEach(function (w) {
    var r = calcWear(w);
    if (r.level === 'bad') acts.push(['bad', 'Indent', 'Raise the indent now for <b>' + esc(w.item) + '</b> (' + esc(w.machine) + ').' + (r.gap > 0 ? ' Even today it would arrive ' + r.gap + ' days after the old part wears out — about ' + esc(rs(r.lost)) + ' at risk.' : '')]);
    else if (r.level === 'warn' && w.raised !== 'yes' && r.c && r.c.marginHr > 0) acts.push(['warn', 'Indent', 'Raise the indent for <b>' + esc(w.item) + '</b> (' + esc(w.machine) + ') by ' + dstr(r.raiseBy) + '.']);
  });
  calcSuppliers().filter(function (x) { return x.level === 'bad'; }).forEach(function (x) {
    acts.push(['bad', 'Supplier', '<b>' + esc(x.name) + '</b> delivered ' + Math.round(x.onTimePct) + '% on time and cost ' + esc(rs(x.lost)) + ' in lost production. Keep a second supplier for critical spares and recover the penalty of ' + esc(rs(x.ld)) + '.']);
  });
  if (!acts.length) acts.push(['ok', 'Good', 'All machines are profitable and no supplies are late.']);
  $('actions').innerHTML = acts.map(function (a) { return '<li><span class="pill ' + a[0] + '">' + a[1] + '</span><span>' + a[2] + '</span></li>'; }).join('');

  // Profit chart
  var col = chartColors();
  var o = baseOpts(col);
  o.indexAxis = 'y';
  o.scales.x.ticks.callback = function (v) { return rs(v); };
  o.scales.y.grid.display = false;
  o.plugins.tooltip = { callbacks: { label: function (ctx) { return 'Profit per month: ' + rs(ctx.raw); } } };
  drawChart('profitChart', {
    type: 'bar',
    data: { labels: mc.map(function (x) { return x.m.id + (num(x.m.count) > 1 ? ' (×' + x.m.count + ')' : ''); }),
            datasets: [{ data: mc.map(function (x) { return Math.round(x.c.fleetProfit); }),
                         backgroundColor: mc.map(function (x) { return x.c.fleetProfit < 0 ? col.neg : col.c1; }),
                         borderRadius: 4, borderSkipped: false, maxBarThickness: 28 }] },
    options: o
  });
}

/* ---------------- Drawing: machine cards ---------------- */
var FIELDS = [
  ['count', 'How many'], ['avail', 'Availability %'], ['util', 'Utilisation %'], ['output', 'Output per working hour'],
  ['value', 'Value of 1 unit of work (Rs)'], ['running', 'Running cost per hour (Rs)'], ['fixed', 'Fixed cost per month, each (Rs)']
];
function buildMachineCards() {
  $('machineCards').innerHTML = S.machines.map(function (m, i) {
    return '<div class="panel mcard"><div class="head"><div><h3>' + esc(m.id) + ' · ' + esc(m.name) + '</h3><div class="sub">' + esc(m.work) + ' · output in ' + esc(m.unit) + '</div></div><span id="mPill' + i + '"></span></div>' +
      '<div class="fields three">' + FIELDS.map(function (f) {
        return '<label class="f">' + f[1] + '<input type="number" min="0" inputmode="decimal" data-m="' + i + '" data-k="' + f[0] + '" value="' + esc(m[f[0]]) + '"></label>';
      }).join('') + '</div><div class="results" id="mRes' + i + '"></div><p class="say" id="mSay' + i + '"></p></div>';
  }).join('');
}
function renderMachines() {
  S.machines.forEach(function (m, i) {
    var c = calcMachine(m);
    var label = { ok: 'Profitable', warn: 'Not covering fixed cost', bad: 'Loses money every hour' }[c.level];
    $('mPill' + i).className = 'pill ' + c.level; $('mPill' + i).textContent = label;
    $('mRes' + i).innerHTML =
      res('Working hours a month', int(c.hrsMonth) + ' h') +
      res('Output a month', qty(c.outputMonth) + ' ' + esc(m.unit)) +
      res('Earning per working hour', rs(c.marginHr), c.marginHr > 0 ? 'ok' : 'bad') +
      res('Profit per month' + (num(m.count) > 1 ? ' (all ' + m.count + ')' : ''), rs(c.fleetProfit), c.level);
    var say;
    if (c.level === 'bad') say = 'Each hour of work earns ' + rs(c.earnHr) + ' but costs ' + rs(num(m.running)) + ' to run. Running it more makes the loss bigger.';
    else if (c.level === 'warn') say = 'Needs ' + (c.breakEven <= 100 ? Math.ceil(c.breakEven) + '% utilisation' : 'more than 100% utilisation (not possible)') + ' to cover its fixed cost of ' + rs(num(m.fixed)) + ' a month.';
    else say = 'Breaks even at ' + Math.ceil(c.breakEven) + '% utilisation. Every extra working hour adds ' + rs(c.marginHr) + '.';
    $('mSay' + i).textContent = say;
  });
}
function res(l, v, cls) { return '<div class="res"><div class="l">' + l + '</div><div class="v ' + (cls || '') + '">' + v + '</div></div>'; }

/* ---------------- Drawing: spare calculator ---------------- */
function buildSpare() {
  var opts = S.machines.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.id + ' · ' + m.name) + '</option>'; }).join('');
  $('spareMachine').innerHTML = opts;
  $('poMachine').innerHTML = opts;
  $('wMachine').innerHTML = opts;
  $('spMachine').innerHTML = opts;
  document.querySelectorAll('[data-s]').forEach(function (el) { el.value = S.spare[el.dataset.s]; });
}
function renderSpare() {
  var r = calcSpare(), c = r.c, sp = S.spare, A = r.A, B = r.B;
  var box = $('spareVerdictBox'), lvl, head, why;
  if (c.marginHr <= 0) {
    lvl = 'bad'; head = 'No — ' + r.m.id + ' loses money every hour it runs';
    why = 'Fitting a new ' + sp.item.toLowerCase() + ' only lets it keep losing money. Look at disposal or a cheaper repair first.';
  } else if (r.paybackHrs > A.life) {
    lvl = 'bad'; head = 'No — it does not pay back within its life';
    why = 'It needs ' + int(r.paybackHrs) + ' working hours to pay back, but lasts only ' + int(A.life) + '.';
  } else {
    lvl = c.level === 'ok' ? 'ok' : 'warn';
    var pd = Math.max(1, Math.ceil(r.paybackDays));
    head = 'Yes — it pays for itself in about ' + pd + (pd === 1 ? ' day' : ' days') + ' of work';
    why = 'Over its life of about ' + A.years.toFixed(1) + ' years it lets ' + r.m.id + ' move ' + qty(r.lifeOutput) + ' ' + r.m.unit +
      ', worth ' + rs(r.lifeValue) + '. The spare is ' + r.share.toFixed(1) + '% of that.' +
      (c.level === 'warn' ? ' But the machine itself does not cover its fixed cost — raise its utilisation.' : '');
  }
  box.className = 'big-verdict ' + lvl; $('spareVerdict').textContent = head; $('spareWhy').textContent = why;
  $('spareResults').innerHTML =
    res('Cost per working hour (A)', rs(A.perHr)) +
    res('Machine earns per working hour', rs(c.marginHr), c.marginHr > 0 ? 'ok' : 'bad') +
    res('Pays back after', isFinite(r.paybackHrs) ? int(r.paybackHrs) + ' h' : 'never', isFinite(r.paybackHrs) ? '' : 'bad') +
    res('Each day the machine waits for it', rs(r.dayWithout), 'bad');

  // Compare A and B
  var aWins = A.perHr <= B.perHr;
  var row = function (l, a, b) { return '<tr><th scope="row">' + l + '</th><td class="n">' + a + '</td><td class="n">' + b + '</td></tr>'; };
  $('compare').innerHTML = '<thead><tr><th></th><th class="n">' + esc(A.name) + '</th><th class="n">' + esc(B.name) + '</th></tr></thead><tbody>' +
    row('Price', rs(A.price), rs(B.price)) +
    row('Life', int(A.life) + ' h (' + A.years.toFixed(1) + ' yr)', int(B.life) + ' h (' + B.years.toFixed(1) + ' yr)') +
    row('Lead time', A.lead + ' days', B.lead + ' days') +
    '<tr class="win"><th scope="row">Cost per working hour</th><td class="n">' + rs(A.perHr) + (aWins ? ' ✓' : '') + '</td><td class="n">' + rs(B.perHr) + (aWins ? '' : ' ✓') + '</td></tr></tbody>';
  var cheap = aWins ? A : B, other = aWins ? B : A;
  var say = cheap.name + ' is cheaper per working hour by ' + rs(other.perHr - cheap.perHr) + ' — about ' + rs((other.perHr - cheap.perHr) * Math.min(A.life, B.life)) + ' over ' + int(Math.min(A.life, B.life)) + ' hours.';
  if (cheap.lead > other.lead) say += ' It takes ' + (cheap.lead - other.lead) + ' days longer to arrive, so raise the indent at least ' + cheap.lead + ' days before the old one wears out. Each day late costs ' + rs(r.dayWithout) + '.';
  $('compareSay').textContent = say;

  // Payback line
  var col = chartColors(), pts = [], steps = 40;
  for (var i = 0; i <= steps; i++) { var h = A.life * i / steps; pts.push({ x: Math.round(h), y: Math.round(h * c.marginHr - A.price) }); }
  var o = baseOpts(col);
  o.scales.x = { type: 'linear', min: 0, max: A.life, grid: { color: col.grid }, ticks: { color: col.ink, callback: function (v) { return int(v) + ' h'; } }, title: { display: true, text: 'Working hours on the spare', color: col.ink } };
  o.scales.y.ticks.callback = function (v) { return rs(v); };
  o.scales.y.grid.color = function (ctx) { return ctx.tick && ctx.tick.value === 0 ? col.ink : col.grid; };
  o.interaction = { mode: 'index', intersect: false };
  o.plugins.tooltip = { callbacks: { title: function (it) { return int(it[0].raw.x) + ' working hours'; }, label: function (ctx) { return 'Net after spare price: ' + rs(ctx.raw.y); } } };
  drawChart('spareChart', {
    type: 'line',
    data: { datasets: [{ data: pts, borderColor: col.c1, backgroundColor: col.c1, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5 }] },
    options: o
  });
}

/* ---------------- Drawing: procurement ---------------- */
var poFilter = 'all', editing = -1;
function renderLinks() {
  $('links').innerHTML = S.links.map(function (l, i) {
    return '<div><p style="margin-bottom:6px">If <b>' + esc(l.from) + '</b> stops, <b>' + esc(l.to) + '</b> stops too, because ' + esc(l.why) + '.</p>' +
      '<div class="fields"><label class="f">Days of work in hand (buffer)<input type="number" min="0" data-l="' + i + '" data-k="buffer" value="' + esc(l.buffer) + '"></label>' +
      '<label class="f">How many ' + esc(l.to) + ' stop<input type="number" min="0" data-l="' + i + '" data-k="idled" value="' + esc(l.idled) + '"></label></div></div>';
  }).join('');
}
function renderOrders() {
  var oc = S.orders.map(function (o, i) { return { o: o, r: calcOrder(o), i: i }; });
  // chart: days per stage
  var col = chartColors();
  var o = baseOpts(col);
  o.indexAxis = 'y';
  o.scales.x.stacked = true; o.scales.y.stacked = true; o.scales.y.grid.display = false;
  o.scales.x.title = { display: true, text: 'Days', color: col.ink };
  o.interaction = { mode: 'index', intersect: false };
  o.plugins.tooltip = { callbacks: { label: function (ctx) { return ctx.dataset.label + ': ' + ctx.raw + ' days'; } } };
  drawChart('cycleChart', {
    type: 'bar',
    data: { labels: oc.map(function (x) { return x.o.item.length > 22 ? x.o.item.slice(0, 21) + '…' : x.o.item; }),
            datasets: [
              { label: 'Indent to purchase order', data: oc.map(function (x) { return x.r.indentToPO; }), backgroundColor: col.c1, borderColor: cssVar('--panel'), borderWidth: { right: 2 }, borderSkipped: false, maxBarThickness: 26 },
              { label: 'Purchase order to delivery', data: oc.map(function (x) { return x.r.poToDelivery; }), backgroundColor: col.c2, borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: false, maxBarThickness: 26 }
            ] },
    options: o
  });
  var placed = oc.filter(function (x) { return x.r.poPlaced; });
  var a1 = placed.length ? placed.reduce(function (s, x) { return s + x.r.indentToPO; }, 0) / placed.length : 0;
  $('cycleSay').textContent = 'Average indent to purchase order: ' + Math.round(a1) + ' days (norm ' + INDENT_TO_PO_NORM + '). Orders not yet delivered are counted up to today.';

  var list = oc.filter(function (x) {
    if (poFilter === 'late') return x.r.idle > 0;
    if (poFilter === 'open') return !x.r.received;
    return true;
  }).sort(function (a, b) { return b.r.lost - a.r.lost || b.r.late - a.r.late; });

  $('poList').innerHTML = list.length ? list.map(function (x) {
    var o = x.o, r = x.r;
    var chain = r.chain.length ? '<div class="domino">' + r.chain.map(function (c, k) {
      return (k ? '<span class="arrow" aria-hidden="true">→</span>' : '') + '<div class="box' + (c.lost > 0 ? '' : ' zero') + '"><b>' + esc(c.id) + (c.n > 1 ? ' ×' + c.n : '') + '</b>' +
        '<small>idle ' + c.days + ' days · ' + qty(c.lostQty) + ' ' + esc(c.unit) + ' not done</small><b>' + (c.lost > 0 ? rs(c.lost) + ' lost' : 'no profit lost') + '</b></div>';
    }).join('') + '</div>' : '';
    var outcome = r.idle > 0 ? '<b>' + r.idle + ' days idle</b>, ' + rs(r.lost) + ' lost' : r.late > 0 ? '<b>' + r.late + ' days past promised date</b>, no machine stopped yet' : r.received ? 'Arrived in time' : 'Not due yet';
    return '<div class="panel po ' + r.level + '"><div class="head"><div><h3>' + esc(o.item) + '</h3><div class="meta">' + esc(o.id) + ' · for ' + esc(o.machine) + ' · ' + esc(o.supplier) + ' · ' + rs(num(o.value)) + '</div></div>' +
      '<span class="pill ' + r.level + '">' + (r.lost > 0 ? 'Cost production' : r.level === 'warn' ? 'Late' : 'On time') + '</span></div>' +
      '<div class="tags"><span class="pill plain">' + esc(o.location) + '</span><span class="pill ' + ({ High: 'bad', Medium: 'warn', Low: 'plain' }[o.urgency] || 'plain') + '">Urgency: ' + esc(o.urgency) + '</span><span class="pill plain">' + esc(o.status) + '</span></div>' +
      '<div class="steps"><div class="step"><div class="l">Indent → purchase order</div><div class="v' + (r.indentToPO > INDENT_TO_PO_NORM ? ' bad' : '') + '">' + r.indentToPO + ' days' + (r.poPlaced ? '' : ' (not placed)') + '</div></div>' +
      '<div class="step"><div class="l">Purchase order → delivery</div><div class="v">' + (r.poPlaced ? r.poToDelivery + ' days' + (r.received ? '' : ' so far') : '–') + '</div></div>' +
      '<div class="step"><div class="l">Needed by ' + fmtDate(o.required) + ' · ' + (r.received ? 'came ' + fmtDate(o.actual) : 'not yet received') + '</div><div class="v' + (r.idle > 0 ? ' bad' : '') + '">' + (r.late > 0 ? r.late + ' days late' : 'on time') + '</div></div></div>' +
      '<p style="margin:0">' + outcome + (r.chain.length > 1 ? ' — the domino:' : '') + '</p>' + chain +
      '<div class="btns"><button class="btn small" type="button" data-edit="' + x.i + '">Edit</button><button class="btn small danger" type="button" data-del="' + x.i + '">Remove</button></div></div>';
  }).join('') : '<p class="muted">No purchase orders match.</p>';
}

/* ---------------- Purchase order form ---------------- */
var FORM_KEYS = ['item', 'machine', 'location', 'supplier', 'value', 'urgency', 'status', 'indent', 'po', 'promised', 'required', 'actual', 'stopped'];
function openForm(i) {
  editing = i;
  var f = $('poForm'), o = i >= 0 ? S.orders[i] : { machine: S.machines[0].id, urgency: 'Medium', status: 'Open', stopped: 1, indent: new Date().toISOString().slice(0, 10) };
  FORM_KEYS.forEach(function (k) { f.elements[k].value = o[k] == null ? '' : o[k]; });
  $('poFormTitle').textContent = i >= 0 ? 'Edit ' + S.orders[i].id : 'Add a purchase order';
  f.hidden = false; f.elements.item.focus();
}
function saveForm(ev) {
  ev.preventDefault();
  var f = $('poForm'), o = editing >= 0 ? S.orders[editing] : {};
  FORM_KEYS.forEach(function (k) { o[k] = f.elements[k].value.trim(); });
  o.value = num(o.value); o.stopped = num(o.stopped);
  if (editing < 0) { o.id = 'PO-' + Date.now().toString().slice(-6); S.orders.push(o); }
  f.hidden = true; editing = -1;
  save(); renderAll();
}


/* ---------------- Spares list (stock) ---------------- */
function sparesList() { if (!S.spares) S.spares = clone(SAMPLE.spares); return S.spares; }
function calcStock(sp) {
  var r = {}, daily = num(sp.use) / 30, have = num(sp.stock) + num(sp.onOrder);
  r.rol = Math.ceil(daily * (num(sp.lead) + num(sp.safety)) - 1e-9);
  r.cover = num(sp.use) > 0 ? num(sp.stock) / num(sp.use) : Infinity;        // months
  r.value = num(sp.stock) * num(sp.price);
  var last = day(sp.lastIssued);
  r.idleDays = last ? diff(last, today()) : Infinity;
  r.maxNeed = r.rol + 12 * num(sp.use);
  r.dead = num(sp.stock) > 0 && (num(sp.use) === 0 || r.idleDays > 365);
  r.excess = !r.dead && num(sp.stock) > r.maxNeed ? (num(sp.stock) - r.maxNeed) : 0;
  r.locked = r.dead ? r.value : r.excess * num(sp.price);
  r.orderQty = Math.max(0, Math.ceil(r.rol + 3 * num(sp.use) - have));
  var crit = sp.critical === 'High';
  if (r.dead) { r.level = 'warn'; r.label = 'Dead stock'; }
  else if (num(sp.stock) <= 0 && num(sp.onOrder) <= 0 && num(sp.use) > 0) { r.level = 'bad'; r.label = 'Out of stock'; }
  else if (num(sp.use) > 0 && have <= r.rol) { r.level = crit ? 'bad' : 'warn'; r.label = 'Reorder now'; }
  else if (r.excess > 0) { r.level = 'warn'; r.label = 'Overstock'; }
  else if (num(sp.onOrder) > 0 && num(sp.stock) <= r.rol) { r.level = 'plain'; r.label = 'On order'; }
  else { r.level = 'ok'; r.label = 'OK'; }
  r.reorder = r.label === 'Out of stock' || r.label === 'Reorder now';
  return r;
}
var spFilter = 'all', spSearch = '', spEditing = -1;
function renderStock() {
  var abc = calcAbc().byIndex;
  var all = sparesList().map(function (sp, i) { return { sp: sp, r: calcStock(sp), i: i }; });
  var value = all.reduce(function (t, x) { return t + x.r.value; }, 0);
  var locked = all.reduce(function (t, x) { return t + x.r.locked; }, 0);
  var re = all.filter(function (x) { return x.r.reorder; });
  var reCrit = re.filter(function (x) { return x.sp.critical === 'High'; });
  $('stockKpis').innerHTML =
    '<div class="kpi"><div class="l">Spares in the list</div><div class="v">' + all.length + '</div></div>' +
    '<div class="kpi"><div class="l">Stock value</div><div class="v">' + rs(value) + '</div></div>' +
    '<div class="kpi"><div class="l">To reorder now (critical)</div><div class="v ' + (re.length ? 'bad' : 'ok') + '">' + re.length + ' (' + reCrit.length + ')</div></div>' +
    '<div class="kpi"><div class="l">Money locked in dead or extra stock</div><div class="v ' + (locked > 0 ? 'warn' : 'ok') + '">' + rs(locked) + '</div></div>';
  var order = { bad: 0, warn: 1, plain: 2, ok: 3 }, q = spSearch.toLowerCase();
  var list = all.filter(function (x) {
    if (spFilter === 'reorder' && !x.r.reorder) return false;
    if (spFilter === 'locked' && !(x.r.locked > 0)) return false;
    return !q || (x.sp.item + ' ' + x.sp.code + ' ' + x.sp.machine + ' ' + x.sp.store).toLowerCase().indexOf(q) >= 0;
  }).sort(function (a, b) { return order[a.r.level] - order[b.r.level] || b.r.value - a.r.value; });
  $('spList').innerHTML = list.map(function (x) {
    var sp = x.sp, r = x.r, say;
    if (r.label === 'Dead stock') say = 'Not issued for ' + (isFinite(r.idleDays) ? Math.round(r.idleDays / 30) + ' months' : 'a long time') + '. ' + rs(r.value) + ' locked. Offer to other areas, return to supplier, or dispose of it.';
    else if (r.reorder) say = 'Raise the indent now for about <b>' + r.orderQty + '</b> (' + rs(r.orderQty * num(sp.price)) + ').' + (sp.critical === 'High' ? ' Critical: ' + esc(sp.machine) + ' stops without it.' : '');
    else if (r.label === 'Overstock') say = int(r.excess) + ' more than needed: ' + rs(r.locked) + ' locked. Stop ordering until it is used down.';
    else if (r.label === 'On order') say = num(sp.onOrder) + ' on order. Watch the delivery date under Late supplies.';
    else say = 'Enough for about ' + (isFinite(r.cover) ? r.cover.toFixed(1) + ' months' : 'a long time') + '.';
    return '<div class="panel"><div class="mcard"><div class="head"><div><h3>' + esc(sp.item) + '</h3><div class="sub">' + esc(sp.code) + ' · ' + esc(sp.machine) + ' · ' + esc(sp.store) + '</div></div><span class="pill ' + r.level + '">' + r.label + '</span></div></div>' +
      '<div class="tags" style="margin-top:0"><span class="cls ' + abc[x.i] + '" title="ABC class">' + abc[x.i] + '</span><span class="pill ' + ({ High: 'bad', Medium: 'warn', Low: 'plain' }[sp.critical] || 'plain') + '">Critical: ' + esc(sp.critical) + '</span><span class="pill plain">' + rs(num(sp.price)) + ' each</span></div>' +
      '<div class="results" style="margin-top:4px">' +
      res('In stock' + (num(sp.onOrder) ? ' (+ ' + num(sp.onOrder) + ' on order)' : ''), String(num(sp.stock)), r.reorder ? 'bad' : '') +
      res('Reorder level', String(r.rol)) +
      res('Used per month', String(num(sp.use))) +
      res('Stock value', rs(r.value)) +
      '</div><p class="say">' + say + '</p>' +
      '<div class="btns no-print" style="margin-top:10px"><button class="btn small" type="button" data-spworth="' + x.i + '">Worth it?</button><button class="btn small" type="button" data-spedit="' + x.i + '">Edit</button><button class="btn small danger" type="button" data-spdel="' + x.i + '">Remove</button></div></div>';
  }).join('') || '<p class="muted">No spares match.</p>';
  return all;
}
var SP_KEYS = ['item', 'code', 'machine', 'store', 'price', 'stock', 'onOrder', 'use', 'lead', 'safety', 'critical', 'lastIssued', 'life'];
function openSpForm(i) {
  spEditing = i;
  var f = $('spForm'), sp = i >= 0 ? sparesList()[i] : { machine: S.machines[0].id, onOrder: 0, safety: 15, critical: 'Medium' };
  SP_KEYS.forEach(function (k) { f.elements[k].value = sp[k] == null ? '' : sp[k]; });
  $('spFormTitle').textContent = i >= 0 ? 'Edit ' + sp.item : 'Add a spare';
  f.hidden = false; f.elements.item.focus();
}
function saveSpForm(ev) {
  ev.preventDefault();
  var f = $('spForm'), sp = spEditing >= 0 ? sparesList()[spEditing] : {};
  SP_KEYS.forEach(function (k) { sp[k] = f.elements[k].value.trim(); });
  ['price', 'stock', 'onOrder', 'use', 'lead', 'safety', 'life'].forEach(function (k) { sp[k] = num(sp[k]); });
  if (spEditing < 0) sparesList().push(sp);
  f.hidden = true; spEditing = -1;
  save(); renderAll();
}
function sendToWorth(i) {
  var sp = sparesList()[i];
  S.spare.machine = sp.machine; S.spare.item = sp.item; S.spare.aPrice = num(sp.price);
  if (num(sp.life) > 0) S.spare.aLife = num(sp.life);
  save(); buildSpare(); renderSpare();
  $('spare').scrollIntoView({ block: 'start' });
}

/* ---------------- ABC analysis ---------------- */
function abcCuts() { if (!S.abc) S.abc = clone(SAMPLE.abc); return S.abc; }
function calcAbc() {
  var cut = abcCuts(), a = num(cut.a), b = Math.max(a, num(cut.b));
  var rows = sparesList().map(function (sp, i) { return { sp: sp, i: i, yearly: num(sp.price) * num(sp.use) * 12 }; })
    .sort(function (x, y) { return y.yearly - x.yearly; });
  var total = rows.reduce(function (t, x) { return t + x.yearly; }, 0), run = 0, byIndex = {};
  rows.forEach(function (x) {
    var before = total > 0 ? run / total * 100 : 100;
    run += x.yearly;
    x.share = total > 0 ? x.yearly / total * 100 : 0;
    x.cum = total > 0 ? run / total * 100 : 0;
    x.cls = x.yearly <= 0 ? 'C' : before < a ? 'A' : before < b ? 'B' : 'C';
    byIndex[x.i] = x.cls;
  });
  return { rows: rows, total: total, byIndex: byIndex };
}
var POLICY = {
  A: { High: 'Vital and costly. Review every month. Rate contract with a reliable supplier, exact forecast, small safety stock, chase every order.',
       Medium: 'Costly. Review every month. Buy close to need; avoid overstock.',
       Low: 'Costly but not vital. Buy only against a firm need; question every indent.' },
  B: { High: 'Keep a safety stock. Review every quarter.',
       Medium: 'Normal reorder level. Review every quarter.',
       Low: 'Normal reorder level; keep stock lean.' },
  C: { High: 'Little yearly spend but vital: keep stock so it never runs out. If one piece is costly, treat it as an insurance spare.',
       Medium: 'Buy in bulk once or twice a year.',
       Low: 'Buy in bulk once a year; minimum paperwork.' }
};
function renderAbc() {
  var cut = abcCuts(), r = calcAbc(), col = chartColors();
  $('abcA').value = cut.a; $('abcB').value = cut.b;
  var n = r.rows.length;
  $('abcKpis').innerHTML = ['A', 'B', 'C'].map(function (c) {
    var g = r.rows.filter(function (x) { return x.cls === c; });
    var v = g.reduce(function (t, x) { return t + x.yearly; }, 0);
    return '<div class="kpi"><div class="l"><span class="cls ' + c + '" style="width:22px;height:22px;font-size:12px">' + c + '</span> ' + g.length + ' spare' + (g.length === 1 ? '' : 's') + ' (' + (n ? Math.round(g.length / n * 100) : 0) + '% of items)</div><div class="v">' + rs(v) + '</div><div class="l">' + (r.total ? Math.round(v / r.total * 100) : 0) + '% of yearly spend</div></div>';
  }).join('') + '<div class="kpi"><div class="l">Total yearly spend on these spares</div><div class="v">' + rs(r.total) + '</div></div>';

  $('abcTable').innerHTML = '<thead><tr><th>Spare</th><th class="n">Yearly spend</th><th class="n">Running total</th><th class="n">Class</th></tr></thead><tbody>' +
    r.rows.map(function (x) {
      return '<tr><td>' + esc(x.sp.item) + '<br><small class="muted">' + esc(x.sp.code) + ' · ' + esc(x.sp.machine) + '</small></td><td class="n">' + rs(x.yearly) + '<br><small class="muted">' + x.share.toFixed(1) + '%</small></td><td class="n">' + x.cum.toFixed(0) + '%</td><td class="n"><span class="cls ' + x.cls + '">' + x.cls + '</span></td></tr>';
    }).join('') + '</tbody>';

  var cols = ['High', 'Medium', 'Low'];
  $('abcGrid').innerHTML = '<div class="abc-grid"><div></div>' + cols.map(function (c) { return '<div class="h">Critical: ' + c + '</div>'; }).join('') +
    ['A', 'B', 'C'].map(function (k) {
      return '<div class="rh"><span class="cls ' + k + '">' + k + '</span></div>' + cols.map(function (c) {
        var g = r.rows.filter(function (x) { return x.cls === k && (x.sp.critical || 'Low') === c; });
        return '<div class="cell' + (k === 'A' && c === 'High' && g.length ? ' hot' : '') + '" data-col="' + k + ' · Critical: ' + c + '"><b>' + g.length + '</b> spare' + (g.length === 1 ? '' : 's') + ' — ' + POLICY[k][c] +
          (g.length ? '<span class="names">' + g.map(function (x) { return esc(x.sp.item); }).join(', ') + '</span>' : '') + '</div>';
      }).join('');
    }).join('') + '</div>';

  var colour = { A: col.c1, B: col.c2, C: cssVar('--c3') };
  var o = baseOpts(col);
  o.indexAxis = 'y';
  o.scales.x.ticks.callback = function (v) { return rs(v); };
  o.scales.y.grid.display = false;
  o.scales.y.ticks.autoSkip = false;
  o.plugins.tooltip = { callbacks: { label: function (ctx) { var x = r.rows[ctx.dataIndex]; return 'Class ' + x.cls + ': ' + rs(x.yearly) + ' a year (' + x.share.toFixed(1) + '%, running total ' + x.cum.toFixed(0) + '%)'; } } };
  drawChart('abcChart', {
    type: 'bar',
    data: { labels: r.rows.map(function (x) { return x.sp.item.length > 20 ? x.sp.item.slice(0, 19) + '…' : x.sp.item; }),
            datasets: [{ data: r.rows.map(function (x) { return Math.round(x.yearly); }), backgroundColor: r.rows.map(function (x) { return colour[x.cls]; }), borderRadius: 4, borderSkipped: false, maxBarThickness: 22 }] },
    options: o
  });
}

/* ---------------- Indent early warning ---------------- */
function fittedList() { if (!S.fitted) S.fitted = clone(SAMPLE.fitted); return S.fitted; }
function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + Math.round(n)); return x; }
function dstr(d) { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function calcWear(w) {
  var m = machine(w.machine), now = today(), r = { m: m };
  if (!m) { r.level = 'plain'; r.label = 'Machine not found'; return r; }
  var c = calcMachine(m); r.c = c;
  var read = day(w.readOn) || now;
  r.runNow = num(w.run) + Math.max(0, diff(read, now)) * c.hrsDay;
  r.used = Math.min(100, r.runNow / Math.max(1, num(w.life)) * 100);
  r.remHrs = Math.max(0, num(w.life) - r.runNow);
  r.daysLeft = c.hrsDay > 0 ? r.remHrs / c.hrsDay : Infinity;
  r.wearOut = isFinite(r.daysLeft) ? addDays(now, r.daysLeft) : null;
  r.raiseBy = r.wearOut ? addDays(r.wearOut, -(num(w.lead) + num(w.safety))) : null;
  r.toRaise = r.raiseBy ? diff(now, r.raiseBy) : Infinity;
  r.arriveIfToday = addDays(now, num(w.lead));
  r.gap = r.wearOut ? diff(r.wearOut, r.arriveIfToday) : -Infinity;      // >0: arrives after wear-out
  r.chain = r.gap > 0 ? domino(w.machine, r.gap, 1, 0, {}) : [];
  r.lost = r.chain.reduce(function (t, x) { return t + x.lost; }, 0);
  if (w.raised === 'yes') { r.level = 'plain'; r.label = 'Indent raised'; }
  else if (c.marginHr <= 0) { r.level = 'warn'; r.label = 'Decide first'; }
  else if (r.toRaise <= 0) { r.level = 'bad'; r.label = 'Raise indent now'; }
  else if (r.toRaise <= 30) { r.level = 'warn'; r.label = 'Raise within ' + r.toRaise + ' days'; }
  else { r.level = 'ok'; r.label = 'On track'; }
  return r;
}
function renderIndent() {
  var rec = S.orders.map(calcOrder).filter(function (r, i) { return r.received && day(S.orders[i].indent); });
  var avg = rec.length ? S.orders.filter(function (o) { return o.actual && o.indent; }).reduce(function (t, o) { return t + diff(day(o.indent), day(o.actual)); }, 0) / rec.length : 0;
  $('leadHint').textContent = rec.length ? 'Your purchase orders so far took ' + Math.round(avg) + ' days on average from indent to delivery — use real figures like this for the lead time.' : '';
  var order = { bad: 0, warn: 1, ok: 2, plain: 3 };
  var list = fittedList().map(function (w, i) { return { w: w, r: calcWear(w), i: i }; })
    .sort(function (a, b) { return order[a.r.level] - order[b.r.level] || a.r.toRaise - b.r.toRaise; });
  $('wList').innerHTML = list.map(function (x) {
    var w = x.w, r = x.r, say;
    if (!r.c) say = 'Pick a machine that is in the Machines list.';
    else if (w.raised === 'yes') say = 'Indent already raised. Track it under Late supplies. The old part wears out ' + (r.wearOut ? 'around ' + dstr(r.wearOut) : 'later') + '.';
    else if (r.c.marginHr <= 0) say = esc(w.machine) + ' loses money every hour it runs. Decide whether to keep the machine before buying this spare for ' + rs(num(w.price)) + '.';
    else if (r.gap > 0) say = 'Even if you raise the indent today, it should arrive around <b>' + dstr(r.arriveIfToday) + '</b>, <b>' + r.gap + ' days after</b> the old part wears out. Expected loss: <b>' + rs(r.lost) + '</b>' + (r.chain.length > 1 ? ' including machines stopped by the domino' : '') + '. Ask for urgent supply or a rate-contract item.';
    else if (r.toRaise <= 0) say = 'Raise the indent today. It should arrive around ' + dstr(r.arriveIfToday) + ', only ' + (-r.gap) + ' days before the old part wears out.';
    else say = 'Raise the indent by <b>' + dstr(r.raiseBy) + '</b>. Every day after that eats into the safety margin; once it is used up, each day late stops ' + esc(w.machine) + ' and costs about ' + rs(r.c.hrsDay * r.c.marginHr) + ' a day, before the domino.';
    return '<div class="panel"><div class="mcard"><div class="head"><div><h3>' + esc(w.item) + '</h3><div class="sub">' + esc(w.machine) + (r.m ? ' · ' + esc(r.m.name) : '') + ' · ' + rs(num(w.price)) + '</div></div><span class="pill ' + r.level + '">' + esc(r.label) + '</span></div></div>' +
      (r.c ? '<div class="muted" style="font-size:14px">Life used: ' + Math.round(r.used) + '% (' + int(r.runNow) + ' of ' + int(num(w.life)) + ' h)</div><div class="lifebar ' + r.level + '"><i style="width:' + r.used.toFixed(1) + '%"></i></div>' +
      '<div class="steps"><div class="step"><div class="l">Wears out around</div><div class="v">' + (r.wearOut ? dstr(r.wearOut) : '–') + '</div><div class="l">' + (isFinite(r.daysLeft) ? 'in ' + Math.round(r.daysLeft) + ' days' : 'machine not working') + '</div></div>' +
      '<div class="step"><div class="l">Raise indent by</div><div class="v' + (r.level === 'bad' ? ' bad' : '') + '">' + (r.raiseBy ? dstr(r.raiseBy) : '–') + '</div><div class="l">' + (isFinite(r.toRaise) ? (r.toRaise < 0 ? (-r.toRaise) + ' days ago' : r.toRaise === 0 ? 'today' : 'in ' + r.toRaise + ' days') : '') + '</div></div>' +
      '<div class="step"><div class="l">Lead time + safety</div><div class="v">' + (num(w.lead) + num(w.safety)) + ' days</div><div class="l">' + num(w.lead) + ' + ' + num(w.safety) + '</div></div></div>' : '') +
      '<p class="say" style="margin-top:0">' + say + '</p>' +
      '<div class="btns no-print" style="margin-top:10px"><button class="btn small" type="button" data-wedit="' + x.i + '">Edit</button><button class="btn small danger" type="button" data-wdel="' + x.i + '">Remove</button></div></div>';
  }).join('') || '<p class="muted">No fitted spares yet. Add one above.</p>';
  return list;
}
var W_KEYS = ['item', 'machine', 'life', 'run', 'readOn', 'lead', 'safety', 'price', 'raised'], wEditing = -1;
function openWForm(i) {
  wEditing = i;
  var f = $('wForm'), w = i >= 0 ? fittedList()[i] : { machine: S.machines[0].id, safety: 15, raised: 'no', readOn: new Date().toISOString().slice(0, 10) };
  W_KEYS.forEach(function (k) { f.elements[k].value = w[k] == null ? '' : w[k]; });
  $('wFormTitle').textContent = i >= 0 ? 'Edit ' + w.item : 'Add a fitted spare';
  f.hidden = false; f.elements.item.focus();
}
function saveWForm(ev) {
  ev.preventDefault();
  var f = $('wForm'), w = wEditing >= 0 ? fittedList()[wEditing] : {};
  W_KEYS.forEach(function (k) { w[k] = f.elements[k].value.trim(); });
  ['life', 'run', 'lead', 'safety', 'price'].forEach(function (k) { w[k] = num(w[k]); });
  if (wEditing < 0) { w.id = 'W' + Date.now().toString().slice(-6); fittedList().push(w); }
  f.hidden = true; wEditing = -1;
  save(); renderAll();
}

/* ---------------- Supplier scorecard ---------------- */
function ldTerms() { if (!S.ld) S.ld = clone(SAMPLE.ld); return S.ld; }
function calcSuppliers() {
  var ld = ldTerms(), by = {};
  S.orders.forEach(function (o) {
    var name = (o.supplier || '').trim() || 'Supplier not entered';
    var r = calcOrder(o), s = by[name] || (by[name] = { name: name, orders: 0, value: 0, scored: 0, onTime: 0, lateDays: 0,
      idle: 0, lost: 0, ld: 0, openLate: 0, worst: null });
    s.orders++; s.value += num(o.value);
    var scored = r.received || r.late > 0;           // arrived, or already past the promised date
    if (scored) {
      s.scored++; s.lateDays += r.late;
      if (r.late === 0) s.onTime++;
      s.ld += num(o.value) * Math.min(num(ld.cap), num(ld.rate) * Math.ceil(r.late / 7)) / 100;
    }
    if (!r.received && r.late > 0) s.openLate++;
    s.idle += r.idle; s.lost += r.lost;
    if (r.lost > 0 && (!s.worst || r.lost > s.worst.lost)) s.worst = { item: o.item, lost: r.lost };
  });
  return Object.keys(by).map(function (k) {
    var s = by[k];
    s.onTimePct = s.scored ? s.onTime / s.scored * 100 : null;
    s.avgLate = s.scored ? s.lateDays / s.scored : 0;
    if (!s.scored) s.level = 'plain';
    else if (s.onTimePct < 50 || s.lost > s.value) s.level = 'bad';
    else if (s.onTimePct < 80 || s.lost > 0) s.level = 'warn';
    else s.level = 'ok';
    return s;
  }).sort(function (a, b) { return b.lost - a.lost || (a.onTimePct == null ? 101 : a.onTimePct) - (b.onTimePct == null ? 101 : b.onTimePct); });
}
var GRADE = { ok: 'Good', warn: 'Watch', bad: 'Poor', plain: 'No record yet' };
function renderSuppliers() {
  var list = calcSuppliers(), ld = ldTerms();
  $('ldRate').value = ld.rate; $('ldCap').value = ld.cap;
  var totLost = list.reduce(function (t, s) { return t + s.lost; }, 0), totLd = list.reduce(function (t, s) { return t + s.ld; }, 0);
  $('ldSay').textContent = totLost > 0
    ? 'Penalties due on all late orders: ' + rs(totLd) + '. Production lost: ' + rs(totLost) + '. The penalty covers only ' + (totLd / totLost * 100).toFixed(1) + '% of the loss, so on-time supply matters far more than the penalty.'
    : 'Penalties due on all late orders: ' + rs(totLd) + '.';

  $('supplierCards').innerHTML = list.map(function (s) {
    var advice;
    if (s.level === 'bad') advice = 'Do not give long-lead or critical spares to this supplier alone. Keep a second approved supplier, recover the penalty, and place their orders earlier.';
    else if (s.level === 'warn') advice = 'Follow up two weeks before each promised date. Ask for a supply plan for open orders.';
    else if (s.level === 'ok') advice = 'Reliable so far. A good choice for critical spares and rate contracts.';
    else advice = 'No order has arrived or fallen due yet.';
    return '<div class="panel"><div class="mcard"><div class="head"><div><h3>' + esc(s.name) + '</h3><div class="sub">' + s.orders + ' order' + (s.orders > 1 ? 's' : '') + ' · ' + rs(s.value) + '</div></div>' +
      '<span class="pill ' + s.level + '">' + GRADE[s.level] + '</span></div></div>' +
      '<div class="results" style="margin-top:0">' +
      res('On time', s.onTimePct == null ? '–' : Math.round(s.onTimePct) + '% <small class="muted">(' + s.onTime + ' of ' + s.scored + ')</small>', s.onTimePct == null ? '' : s.onTimePct >= 80 ? 'ok' : s.onTimePct >= 50 ? 'warn' : 'bad') +
      res('Average days late', s.scored ? s.avgLate.toFixed(0) + ' days' : '–', s.avgLate > 0 ? 'warn' : '') +
      res('Machine idle days caused', String(s.idle), s.idle > 0 ? 'bad' : '') +
      res('Production lost (with domino)', rs(s.lost), s.lost > 0 ? 'bad' : '') +
      res('Penalty (LD) due', rs(s.ld)) +
      res('Late and still not received', String(s.openLate), s.openLate ? 'warn' : '') +
      '</div>' + (s.worst ? '<p class="say">Worst: <b>' + esc(s.worst.item) + '</b>, ' + rs(s.worst.lost) + ' lost.</p>' : '') +
      '<p class="say muted">' + advice + '</p></div>';
  }).join('') || '<p class="muted">No purchase orders yet.</p>';

  var col = chartColors(), o = baseOpts(col);
  o.indexAxis = 'y';
  o.scales.x.ticks.callback = function (v) { return rs(v); };
  o.scales.y.grid.display = false;
  o.plugins.tooltip = { callbacks: { label: function (ctx) { return 'Production lost: ' + rs(ctx.raw); } } };
  drawChart('supplierChart', {
    type: 'bar',
    data: { labels: list.map(function (s) { return s.name; }),
            datasets: [{ data: list.map(function (s) { return Math.round(s.lost); }), backgroundColor: col.neg, borderRadius: 4, borderSkipped: false, maxBarThickness: 28 }] },
    options: o
  });
  return list;
}

/* ---------------- Wiring ---------------- */
function renderAll() {
  try { renderMachines(); renderStock(); renderAbc(); renderSpare(); renderLinks(); renderIndent(); renderOrders(); renderSuppliers(); renderSummary(); }
  catch (e) { showError('Something went wrong while working out the figures. Please pass this message on:', e); }
}

function start() {
  S = load();
  if (!window.Chart) showError('The charts could not load (no internet, or the chart library was blocked). The figures below still work.', 'Chart.js did not load from cdn.jsdelivr.net');
  buildMachineCards(); buildSpare(); renderAll();

  document.addEventListener('input', function (e) {
    var t = e.target, d = t.dataset;
    if (d.m != null) { S.machines[+d.m][d.k] = num(t.value); save(); renderMachines(); renderSpare(); renderIndent(); renderOrders(); renderSuppliers(); renderSummary(); }
    else if (d.s != null) { S.spare[d.s] = t.type === 'number' ? num(t.value) : t.value; save(); renderSpare(); }
    else if (d.l != null) { S.links[+d.l][d.k] = num(t.value); save(); renderIndent(); renderOrders(); renderSuppliers(); renderSummary(); }
    else if (t.id === 'ldRate' || t.id === 'ldCap') { ldTerms()[t.id === 'ldRate' ? 'rate' : 'cap'] = num(t.value); save(); renderSuppliers(); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'spareMachine') { S.spare.machine = e.target.value; save(); renderSpare(); }
    if (e.target.id === 'abcA' || e.target.id === 'abcB') { abcCuts()[e.target.id === 'abcA' ? 'a' : 'b'] = num(e.target.value); save(); renderAbc(); renderStock(); }
    if (e.target.id === 'spFilter') { spFilter = e.target.value; renderStock(); }
    if (e.target.id === 'poFilter') { poFilter = e.target.value; renderOrders(); }
  });
  $('poList').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit != null) { openForm(+b.dataset.edit); $('poForm').scrollIntoView({ block: 'start' }); }
    if (b.dataset.del != null && confirm('Remove "' + S.orders[+b.dataset.del].item + '"?')) { S.orders.splice(+b.dataset.del, 1); save(); renderAll(); }
  });
  $('addPO').addEventListener('click', function () { openForm(-1); });
  $('poCancel').addEventListener('click', function () { $('poForm').hidden = true; editing = -1; });
  $('poForm').addEventListener('submit', saveForm);
  $('addSp').addEventListener('click', function () { openSpForm(-1); });
  $('spCancel').addEventListener('click', function () { $('spForm').hidden = true; spEditing = -1; });
  $('spForm').addEventListener('submit', saveSpForm);
  $('spSearch').addEventListener('input', function (e) { spSearch = e.target.value; renderStock(); });
  $('spList').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.spworth != null) sendToWorth(+b.dataset.spworth);
    if (b.dataset.spedit != null) { openSpForm(+b.dataset.spedit); $('spForm').scrollIntoView({ block: 'start' }); }
    if (b.dataset.spdel != null && confirm('Remove "' + sparesList()[+b.dataset.spdel].item + '"?')) { sparesList().splice(+b.dataset.spdel, 1); save(); renderAll(); }
  });
  $('addW').addEventListener('click', function () { openWForm(-1); });
  $('wCancel').addEventListener('click', function () { $('wForm').hidden = true; wEditing = -1; });
  $('wForm').addEventListener('submit', saveWForm);
  $('wList').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.wedit != null) { openWForm(+b.dataset.wedit); $('wForm').scrollIntoView({ block: 'start' }); }
    if (b.dataset.wdel != null && confirm('Remove "' + fittedList()[+b.dataset.wdel].item + '"?')) { fittedList().splice(+b.dataset.wdel, 1); save(); renderAll(); }
  });
  $('reset').addEventListener('click', function () {
    if (!confirm('Put back the made-up sample figures? Your changes in this browser will be lost.')) return;
    S = clone(SAMPLE); save(); buildMachineCards(); buildSpare(); renderAll();
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', renderAll);
  }
}

try { start(); } catch (e) { showError('The page could not start. Please pass this message on:', e); }
})();
