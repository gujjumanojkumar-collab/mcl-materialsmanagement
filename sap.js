/* sap.js - "Import from SAP" for the MM spares monitor.
   Reads list reports exported from SAP ECC (or S/4HANA):
     ME2M / ME2N  purchase orders   -> Late supplies list
     MB52 / MMBE  stock             -> Spares list (stock and price)
     MB51         consumption (201/261 issues) -> Spares list (use per month, last issued)
   Accepts CSV (comma or semicolon), tab-separated text, and SAP "unconverted"
   text with | between columns. Nothing is sent anywhere by this file: rows go
   into the page, and from there to the shared database if it is set up. */
(function () {
'use strict';
var MM = window.MM;
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
if (!MM || !$('sap')) return;

/* ---------- What each report holds, and the column names SAP uses ---------- */
var TYPES = {
  po: { label: 'Purchase orders (ME2M / ME2N)', key: 'po', fields: [
    ['po', 'Purchase order number', ['purchasing document', 'purch.doc.', 'purch.doc', 'purch. doc.', 'po number', 'purchase order', 'ebeln', 'document number']],
    ['item', 'PO item', ['item', 'ebelp', 'po item']],
    ['material', 'Material', ['material', 'matnr', 'material number']],
    ['text', 'Short text', ['short text', 'txz01', 'material description', 'description', 'maktx']],
    ['supplier', 'Supplier', ['name of supplier', 'supplier name', 'vendor name', 'name of vendor', 'name', 'supplier', 'vendor', 'supplying vendor', 'lifnr']],
    ['plant', 'Plant / location', ['plant', 'werks', 'storage location', 'stor. loc.', 'sloc', 'lgort']],
    ['poDate', 'PO date', ['document date', 'doc. date', 'po date', 'purchase order date', 'bedat', 'created on']],
    ['promised', 'Delivery date (promised)', ['delivery date', 'deliv. date', 'delivery dt', 'stat.-rel. del. date', 'eindt']],
    ['indent', 'Indent / PR date', ['requisition date', 'req. date', 'pr date', 'requisition dt', 'badat']],
    ['actual', 'Goods receipt date', ['gr date', 'goods receipt date', 'actual delivery', 'last gr date', 'posting date', 'budat']],
    ['value', 'Net order value (Rs)', ['net order value', 'net value', 'order value', 'netwr', 'value']],
    ['qty', 'Order quantity', ['order quantity', 'po quantity', 'quantity', 'qty', 'menge']],
    ['price', 'Net price (Rs)', ['net price', 'netpr', 'price']],
    ['machine', 'Equipment / tracking no.', ['equipment', 'req. tracking number', 'requirement tracking number', 'tracking number', 'tracking no.', 'equnr', 'bednr']]
  ] },
  stock: { label: 'Stock (MB52 / MMBE)', key: 'material', fields: [
    ['material', 'Material', ['material', 'matnr', 'material number']],
    ['text', 'Material description', ['material description', 'description', 'maktx', 'short text']],
    ['store', 'Storage location / plant', ['storage location', 'stor. loc.', 'sloc', 'lgort', 'plant', 'werks']],
    ['qty', 'Unrestricted stock', ['unrestricted', 'unrestr.', 'unrestricted use', 'unrestricted stock', 'labst', 'stock']],
    ['value', 'Value of unrestricted stock (Rs)', ['value unrestricted', 'val. unrestricted', 'value unrestr.', 'stock value', 'value']],
    ['price', 'Price per unit (Rs)', ['moving price', 'moving average price', 'standard price', 'verpr', 'stprs', 'price']],
    ['unit', 'Base unit of measure', ['base unit of measure', 'base unit', 'bun', 'meins', 'unit of measure', 'uom', 'unit']],
    ['machine', 'Equipment', ['equipment', 'equnr']]
  ] },
  use: { label: 'Consumption (MB51, issues 201 / 261)', key: 'material', fields: [
    ['material', 'Material', ['material', 'matnr', 'material number']],
    ['text', 'Material description', ['material description', 'description', 'maktx', 'short text']],
    ['date', 'Posting date', ['posting date', 'pstng date', 'budat', 'entry date', 'document date']],
    ['qty', 'Quantity', ['quantity', 'qty in une', 'qty in unit of entry', 'quantity in une', 'menge']],
    ['mvt', 'Movement type', ['movement type', 'mvt', 'mvmt type', 'mvt type', 'bwart']]
  ] }
};

/* ---------- Reading the file ---------- */
function norm(h) { return String(h || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function parseLine(line, d) {
  if (d === '|') return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (x) { return x.trim(); });
  var out = [], cur = '', q = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === d) { out.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}
function junk(line) { return !line.trim() || /^[\s\-|=+_*]+$/.test(line); }
function readTable(text) {
  var lines = text.replace(/^﻿/, '').replace(/\r/g, '').split('\n').filter(function (l) { return !junk(l); });
  if (!lines.length) throw new Error('The file is empty.');
  var best = null;
  ['\t', '|', ';', ','].forEach(function (d) {
    var counts = lines.slice(0, 40).map(function (l) { return parseLine(l, d).length; });
    var freq = {}; counts.forEach(function (n) { if (n > 1) freq[n] = (freq[n] || 0) + 1; });
    Object.keys(freq).forEach(function (n) { var sc = freq[n] * 100 + (+n); if (!best || sc > best.sc) best = { d: d, n: +n, sc: sc }; });
  });
  if (!best) throw new Error('Could not find columns. Save the SAP list as CSV, or as "Text with tabs".');
  var rows = lines.map(function (l) { return parseLine(l, best.d); }).filter(function (r) { return r.length === best.n; });
  var hi = 0;
  for (var i = 0; i < Math.min(rows.length, 15); i++) {
    var textCells = rows[i].filter(function (c) { return c && isNaN(parseNum(c)) && !parseDate(c); }).length;
    if (textCells >= Math.ceil(best.n * 0.6)) { hi = i; break; }
  }
  var header = rows[hi];
  var hkey = header.map(norm).join('|');
  var data = rows.slice(hi + 1).filter(function (r) {
    if (r.map(norm).join('|') === hkey) return false;          // header repeated on each SAP page
    if (r.every(function (c) { return !c; })) return false;
    if (r.some(function (c) { return /^\*+$/.test(c); })) return false; // SAP total lines
    return true;
  });
  return { delim: best.d, header: header, rows: data };
}
function parseNum(s) {
  s = String(s == null ? '' : s).replace(/[₹\s]|Rs\.?|INR/gi, '');
  if (!s) return NaN;
  var neg = /-$/.test(s) || /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/^-|-$|[()]/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');   // 1.234,56
  else s = s.replace(/,/g, '');                                                          // 1,23,456.00
  if (!/^\d*\.?\d+$/.test(s)) return NaN;
  var n = parseFloat(s);
  return neg ? -n : n;
}
function parseDate(s) {
  s = String(s || '').trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|\d{4})$/);     // DD.MM.YYYY (SAP India)
  if (m) {
    var y = m[3].length === 2 ? '20' + m[3] : m[3], mo = +m[2], d = +m[1];
    if (mo > 12 && d <= 12) { var t = mo; mo = d; d = t; }          // MM/DD/YYYY files
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);                              // 20260327 (technical format)
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  return '';
}
function guessMap(type, header) {
  var hs = header.map(norm), used = {}, map = {};
  [true, false].forEach(function (exact) {
    TYPES[type].fields.forEach(function (f) {
      if (map[f[0]] != null) return;
      for (var a = 0; a < f[2].length; a++) {
        for (var i = 0; i < hs.length; i++) {
          if (used[i]) continue;
          var ok = exact ? hs[i] === f[2][a] : (hs[i].indexOf(f[2][a]) === 0 && f[2][a].length >= 4);
          if (ok) { map[f[0]] = i; used[i] = true; return; }
        }
      }
    });
  });
  return map;
}

/* ---------- Turning rows into records ---------- */
function cell(r, map, k) { return map[k] == null ? '' : (r[map[k]] || '').trim(); }
// SAP unit codes to the tool's units
function unitFrom(u) {
  u = String(u || '').trim().toUpperCase();
  if (!u) return '';
  if (['EA', 'ST', 'PC', 'PCS', 'NOS', 'NO', 'EACH'].indexOf(u) >= 0) return 'each';
  if (['L', 'LT', 'LTR', 'KL'].indexOf(u) >= 0) return 'litre';
  if (['KG', 'KGS'].indexOf(u) >= 0) return 'kg';
  if (['SET', 'SETS', 'KIT'].indexOf(u) >= 0) return 'set';
  if (['BRL', 'BBL', 'DR', 'DRUM', 'BARREL'].indexOf(u) >= 0) return 'barrel';
  if (['M', 'MTR', 'METRE', 'METER'].indexOf(u) >= 0) return 'metre';
  return u.toLowerCase();
}
function machineIds() { return MM.state().machines.map(function (m) { return m.id; }); }
function pickMachine(v, fallback) { var ids = machineIds(); v = String(v || '').trim(); return ids.indexOf(v) >= 0 ? v : fallback; }

function importPO(t, map, defMachine) {
  var S = MM.state(), add = 0, upd = 0, skip = [];
  t.rows.forEach(function (r, n) {
    var po = cell(r, map, 'po'); if (!po) { skip.push('row ' + (n + 1) + ': no PO number'); return; }
    var item = cell(r, map, 'item').replace(/^0+(?=\d)/, '');
    var id = 'SAP ' + po + (item ? '/' + item : '');
    var poDate = parseDate(cell(r, map, 'poDate')), promised = parseDate(cell(r, map, 'promised'));
    var indent = parseDate(cell(r, map, 'indent')) || poDate, actual = parseDate(cell(r, map, 'actual'));
    if (!indent) { skip.push(id + ': no PO or indent date'); return; }
    var value = parseNum(cell(r, map, 'value'));
    if (isNaN(value)) { var q = parseNum(cell(r, map, 'qty')), p = parseNum(cell(r, map, 'price')); value = (!isNaN(q) && !isNaN(p)) ? q * p : 0; }
    var fields = {
      item: cell(r, map, 'text') || cell(r, map, 'material') || id,
      supplier: cell(r, map, 'supplier'), location: cell(r, map, 'plant'),
      value: Math.abs(value), indent: indent, po: poDate, promised: promised, actual: actual
    };
    var o = S.orders.filter(function (x) { return x.id === id; })[0];
    if (o) {
      Object.keys(fields).forEach(function (k) { if (fields[k] !== '' && fields[k] != null) o[k] = fields[k]; });
      if (actual) o.status = 'Resolved';
      upd++;
    } else {
      S.orders.push(Object.assign({ id: id, machine: pickMachine(cell(r, map, 'machine'), defMachine), urgency: 'Medium',
        status: actual ? 'Resolved' : poDate ? 'In progress' : 'Open', required: promised, stopped: 0 }, fields));
      add++;
    }
  });
  return { add: add, upd: upd, skip: skip, note: 'New orders get "needed by" = the promised date and 0 machines stopped. Edit an order to set these.' };
}
function importStock(t, map, defMachine) {
  var spares = MM.spares(), by = {}, add = 0, upd = 0, skip = [];
  t.rows.forEach(function (r, n) {
    var mat = cell(r, map, 'material').replace(/^0+(?=\d)/, ''); if (!mat) { skip.push('row ' + (n + 1) + ': no material'); return; }
    var g = by[mat] || (by[mat] = { text: '', stores: [], qty: 0, value: 0, price: NaN, machine: '', unit: '' });
    g.text = g.text || cell(r, map, 'text');
    var st = cell(r, map, 'store'); if (st && g.stores.indexOf(st) < 0) g.stores.push(st);
    var q = parseNum(cell(r, map, 'qty')), v = parseNum(cell(r, map, 'value')), p = parseNum(cell(r, map, 'price'));
    if (!isNaN(q)) g.qty += q; if (!isNaN(v)) g.value += v; if (!isNaN(p)) g.price = p;
    g.machine = g.machine || cell(r, map, 'machine');
    g.unit = g.unit || unitFrom(cell(r, map, 'unit'));
  });
  Object.keys(by).forEach(function (mat) {
    var g = by[mat], price = !isNaN(g.price) ? g.price : (g.qty > 0 ? g.value / g.qty : 0);
    var sp = spares.filter(function (x) { return String(x.code) === mat; })[0];
    if (sp) { sp.stock = g.qty; if (g.unit) sp.unit = g.unit; if (price) sp.price = Math.round(price); if (g.stores.length) sp.store = g.stores.join(', '); if (!sp.item && g.text) sp.item = g.text; upd++; }
    else {
      spares.push({ code: mat, item: g.text || mat, type: 'Spare', unit: g.unit || 'each', route: '', machine: pickMachine(g.machine, defMachine), store: g.stores.join(', '), price: Math.round(price),
        stock: g.qty, onOrder: 0, use: 0, lead: 90, safety: 15, critical: 'Medium', lastIssued: '', life: 0 });
      add++;
    }
  });
  return { add: add, upd: upd, skip: skip, note: 'New spares start with use 0, lead time 90 days and "Medium" critical. Import consumption (MB51) next, or they show as dead stock.' };
}
function importUse(t, map) {
  var spares = MM.spares(), by = {}, lo = null, hi = null, skip = [], other = 0;
  t.rows.forEach(function (r, n) {
    var mat = cell(r, map, 'material').replace(/^0+(?=\d)/, ''), d = parseDate(cell(r, map, 'date')), q = parseNum(cell(r, map, 'qty'));
    if (!mat || !d || isNaN(q)) { skip.push('row ' + (n + 1) + ': material, date or quantity missing'); return; }
    var mvt = cell(r, map, 'mvt').slice(0, 3), sign = 1;
    if (mvt) {
      if (['201', '221', '241', '261', '281'].indexOf(mvt) >= 0) sign = 1;
      else if (['202', '222', '242', '262', '282'].indexOf(mvt) >= 0) sign = -1;
      else { other++; return; }                                  // receipts and transfers are not consumption
    }
    var g = by[mat] || (by[mat] = { qty: 0, last: '' });
    g.qty += sign * Math.abs(q);
    if (sign > 0 && d > g.last) g.last = d;
    if (!lo || d < lo) lo = d; if (!hi || d > hi) hi = d;
  });
  var months = lo ? Math.max(1, (Date.parse(hi) - Date.parse(lo)) / 864e5 / 30.44) : 1;
  var upd = 0, missing = 0;
  Object.keys(by).forEach(function (mat) {
    var sp = spares.filter(function (x) { return String(x.code) === mat; })[0];
    if (!sp) { missing++; return; }
    sp.use = Math.max(0, Math.round(by[mat].qty / months * 100) / 100);
    if (by[mat].last) sp.lastIssued = by[mat].last;
    upd++;
  });
  return { add: 0, upd: upd, skip: skip, note: 'Use per month is worked out over ' + months.toFixed(1) + ' months (' + (lo || '–') + ' to ' + (hi || '–') + ').' +
    (missing ? ' ' + missing + ' material(s) are not in the Spares list: import stock (MB52) first.' : '') + (other ? ' ' + other + ' row(s) with other movement types were left out.' : '') };
}

/* ---------- Sample files (made up) ---------- */
var SAMPLES = {
  po: 'Purchasing Document,Item,Material,Short Text,Name of Supplier,Plant,Document Date,Delivery Date,Requisition Date,GR Date,Net Order Value,Req. Tracking Number\n' +
      '4500012871,10,MM-0301,"TYRE 27.00 R49 BIAS, SET OF 6",Vendor D,East quarry,02.09.2026,10.11.2026,15.07.2026,,"16,20,000.00",DP-07\n' +
      '4500012902,10,MM-0401,DRILL BIT 250 MM TRICONE,Vendor C,East quarry,25.09.2026,25.10.2026,10.08.2026,,"3,80,000.00",DR-03\n' +
      '4500012955,10,MM-0102,DIPPER TOOTH 10 CUM SHOVEL,Vendor F,Area store East,22.07.2026,30.08.2026,10.06.2026,28.08.2026,"5,04,000.00",SH-01\n' +
      '4500013010,10,MM-0202,HYDRAULIC HOSE ASSY 1 INCH,Vendor B,Area store East,10.05.2026,15.06.2026,02.04.2026,12.06.2026,"1,44,000.00",HE-02\n',
  stock: 'Material,Material Description,Plant,Storage Location,Base Unit of Measure,Unrestricted,Value Unrestricted\n' +
      'MM-0101,TRACK SHOE ROPE SHOVEL,MCLX,Central store,EA,6,"5,10,000.00"\n' +
      'MM-0102,DIPPER TOOTH 10 CUM SHOVEL,MCLX,Area store East,EA,32,"13,44,000.00"\n' +
      'MM-0301,TYRE 27.00 R49 BIAS,MCLX,Central store,EA,4,"10,80,000.00"\n' +
      'MM-0601,HSD HIGH SPEED DIESEL,MCLX,HSD bunker,L,41500,"36,52,000.00"\n' +
      'MM-0606,FUEL FILTER ELEMENT 100T DUMPER,MCLX,Central store,EA,140,"2,52,000.00"\n',
  use: 'Material,Material Description,Movement Type,Posting Date,Quantity\n' +
      'MM-0102,DIPPER TOOTH 10 CUM SHOVEL,261,05.06.2026,-8\n' +
      'MM-0102,DIPPER TOOTH 10 CUM SHOVEL,261,07.08.2026,-9\n' +
      'MM-0102,DIPPER TOOTH 10 CUM SHOVEL,261,12.10.2026,-7\n' +
      'MM-0606,FUEL FILTER ELEMENT 100T DUMPER,201,20.06.2026,-30\n' +
      'MM-0606,FUEL FILTER ELEMENT 100T DUMPER,201,18.09.2026,-36\n' +
      'MM-0606,FUEL FILTER ELEMENT 100T DUMPER,202,19.09.2026,4\n' +
      'MM-0606,FUEL FILTER ELEMENT 100T DUMPER,101,01.10.2026,150\n'
};

/* ---------- The page ---------- */
var current = null;   // { type, table, map }
function fillMachines() {
  $('sapMachine').innerHTML = MM.state().machines.map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.id + ' · ' + m.name) + '</option>'; }).join('');
}
function showMap() {
  var c = current, f = TYPES[c.type].fields;
  var opts = function (sel) {
    return '<option value="">— not in file —</option>' + c.table.header.map(function (h, i) { return '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + esc(h || ('Column ' + (i + 1))) + '</option>'; }).join('');
  };
  var found = f.filter(function (x) { return c.map[x[0]] != null; }).length;
  var html = '<p class="say"><b>' + c.table.rows.length + ' rows</b> found, ' + found + ' of ' + f.length + ' columns matched. Check the matches; change any that are wrong.</p>' +
    '<div class="fields three" style="margin-top:8px">' + f.map(function (x) {
      return '<label class="f">' + esc(x[1]) + '<select data-sapf="' + x[0] + '">' + opts(c.map[x[0]]) + '</select></label>';
    }).join('') + '</div>';
  var cols = f.filter(function (x) { return c.map[x[0]] != null; });
  html += '<h3 style="margin-top:14px">First rows, as they will be read</h3><div class="scrollx"><table class="compare"><thead><tr>' +
    cols.map(function (x) { return '<th>' + esc(x[1]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    c.table.rows.slice(0, 5).map(function (r) { return '<tr>' + cols.map(function (x) { return '<td>' + esc(r[c.map[x[0]]]) + '</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div>';
  $('sapMap').innerHTML = html;
  $('sapGo').hidden = false;
  $('sapGo').textContent = 'Import ' + c.table.rows.length + ' rows';
}
function readFile(file) {
  $('sapResult').textContent = ''; $('sapMap').innerHTML = ''; $('sapGo').hidden = true;
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var t = readTable(String(rd.result));
      current = { type: $('sapType').value, table: t, map: guessMap($('sapType').value, t.header) };
      showMap();
    } catch (e) { MM.showError('Could not read this file. Please pass this message on:', e); }
  };
  rd.onerror = function () { MM.showError('Could not open the file. Please pass this message on:', rd.error); };
  rd.readAsText(file);
}
function runImport() {
  if (!current) return;
  try {
    var def = $('sapMachine').value, r;
    if (current.type === 'po') r = importPO(current.table, current.map, def);
    else if (current.type === 'stock') r = importStock(current.table, current.map, def);
    else r = importUse(current.table, current.map);
    MM.save(); MM.redraw(); fillMachines();
    $('sapResult').innerHTML = '<b>Done:</b> ' + r.add + ' added, ' + r.upd + ' updated' + (r.skip.length ? ', ' + r.skip.length + ' skipped (' + esc(r.skip.slice(0, 3).join('; ')) + (r.skip.length > 3 ? '…' : '') + ')' : '') + '. ' + esc(r.note) +
      (MM.sharedDb() ? ' Saved to the shared database.' : ' Saved in this browser.');
    $('sapGo').hidden = true; $('sapMap').innerHTML = ''; current = null; $('sapFile').value = '';
  } catch (e) { MM.showError('The import stopped. Nothing after the problem row was added. Please pass this message on:', e); }
}
function download(type) {
  var names = { po: 'sample-ME2N-purchase-orders.csv', stock: 'sample-MB52-stock.csv', use: 'sample-MB51-consumption.csv' };
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([SAMPLES[type]], { type: 'text/csv' }));
  a.download = names[type]; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

fillMachines();
$('sapType').addEventListener('change', function () { if (current) { current.type = this.value; current.map = guessMap(this.value, current.table.header); showMap(); } });
$('sapFile').addEventListener('change', function () { if (this.files[0]) readFile(this.files[0]); });
$('sapMap').addEventListener('change', function (e) {
  var k = e.target.dataset.sapf; if (!k || !current) return;
  if (e.target.value === '') delete current.map[k]; else current.map[k] = +e.target.value;
  showMap();
});
$('sapGo').addEventListener('click', runImport);
$('sapSample').addEventListener('click', function () { download($('sapType').value); });

// for testing
window.SAP = { readTable: readTable, parseNum: parseNum, parseDate: parseDate, guessMap: guessMap };
})();
