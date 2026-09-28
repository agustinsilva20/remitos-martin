/* Remitos - app estática para GitHub Pages.
   Cabecera fija: fields.json. Contador e historial: localStorage. */

const KEYS = { proximo: 'remitos.proximo', historial: 'remitos.historial', sesion: 'remitos.sesion' };
const UNIDAD_DEFAULT = 'UN';

let config = {};

// ---------- Utilidades ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function hoy() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatearCuit(v) {
  const n = String(v || '').replace(/\D/g, '');
  if (n.length !== 11) return String(v || '');
  return `${n.slice(0, 2)}-${n.slice(2, 10)}-${n.slice(10)}`;
}

function formatearNumero(n) {
  return `${config.puntoVenta}-${String(n).padStart(8, '0')}`;
}

function aviso(msg, tipo = '') {
  const el = $('#aviso');
  el.textContent = msg;
  el.className = `aviso ${tipo}`;
  el.classList.remove('oculto');
  clearTimeout(aviso._t);
  aviso._t = setTimeout(() => el.classList.add('oculto'), 5000);
}

// ---------- Persistencia ----------
function leerHistorial() {
  try { return JSON.parse(localStorage.getItem(KEYS.historial)) || []; }
  catch { return []; }
}
function guardarHistorial(lista) {
  localStorage.setItem(KEYS.historial, JSON.stringify(lista));
}
function leerProximo() {
  const v = parseInt(localStorage.getItem(KEYS.proximo), 10);
  return Number.isFinite(v) && v > 0 ? v : (config.numeroInicial || 1);
}
function guardarProximo(n) {
  localStorage.setItem(KEYS.proximo, String(n));
  actualizarBadge();
}

function actualizarBadge() {
  const n = leerProximo();
  $('#proximo-badge').textContent = `N° ${formatearNumero(n)}`;
  $('#ajuste-proximo').value = n;
  $('#numero-prefijo').textContent = `${config.puntoVenta}-`;
  $('[name=numero]').value = n;
}

// ---------- Configuración ----------
async function cargarConfig() {
  try {
    const r = await fetch('fields.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.statusText);
    config = await r.json();
  } catch (e) {
    aviso('No se pudo leer fields.json. Si abriste el archivo directo, serví la carpeta con un servidor local.', 'error');
    config = {};
  }
  config.puntoVenta = config.puntoVenta || '00001';
  config.numeroInicial = config.numeroInicial || 1;
  config.marca = config.marca || 'Remitos';

  $('#marca').textContent = config.marca;
  $('#login-marca').textContent = config.marca;
  $('#ajuste-pv').value = config.puntoVenta;
  $('#config-preview').textContent = JSON.stringify(config, null, 2);
  actualizarBadge();
}

// ---------- Ítems del formulario ----------
function agregarItem(datos = {}) {
  const tpl = $('#tpl-item').content.cloneNode(true);
  const item = tpl.querySelector('.item');
  for (const [k, v] of Object.entries(datos)) {
    const inp = item.querySelector(`[name="${k}"]`);
    if (inp) inp.value = v;
  }
  item.querySelector('.btn-quitar').addEventListener('click', () => {
    item.remove();
    if (!$$('#items .item').length) agregarItem();
  });
  $('#items').appendChild(item);
  return item;
}

function leerItems() {
  return $$('#items .item').map(el => ({
    codigo: $('[name=codigo]', el).value.trim(),
    cantidad: $('[name=cantidad]', el).value.trim(),
    um: ($('[name=um]', el).value.trim() || UNIDAD_DEFAULT).toUpperCase(),
    descripcion: $('[name=descripcion]', el).value.trim(),
  })).filter(i => i.descripcion || i.codigo);
}

function limpiarFormulario() {
  $('#form-remito').reset();
  $('#items').innerHTML = '';
  agregarItem();
  actualizarBadge();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- PDF ----------
function generarPDF(remito) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, m = 14;
  const derecha = W - m;

  // Marca y datos del emisor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(config.marca, m, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const emisor = [
    config.direccion,
    config.tel ? `Tel: ${config.tel}` : null,
    config.mail,
    config.condicion,
    config.cuit ? `CUIT: ${formatearCuit(config.cuit)}` : null,
  ].filter(Boolean);
  doc.text(emisor, m, 29);

  // Recuadro "R"
  doc.setLineWidth(0.5);
  doc.rect(W / 2 - 7, 12, 14, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('R', W / 2, 22.5, { align: 'center' });

  // Bloque REMITO / número / fecha
  doc.setFontSize(16);
  doc.text('REMITO', derecha, 20, { align: 'right' });
  doc.setFontSize(12);
  doc.text(`N° ${remito.numero}`, derecha, 27, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Fecha: ${remito.fecha}`, derecha, 33, { align: 'right' });
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text('Documento no válido como factura', derecha, 38, { align: 'right' });
  doc.setTextColor(0);

  doc.setLineWidth(0.3);
  doc.line(m, 52, derecha, 52);

  // Cliente
  let y = 60;
  doc.setFontSize(10);
  const campo = (etiqueta, valor) => {
    if (!valor) return;
    doc.setFont('helvetica', 'bold');
    doc.text(`${etiqueta}:`, m, y);
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(valor, derecha - m - 28);
    doc.text(lineas, m + 26, y);
    y += 6 * lineas.length;
  };
  campo('Cliente', remito.cliente);
  campo('CUIT', formatearCuit(remito.cuit));
  campo('Domicilio', remito.domicilio);

  // Tabla de ítems
  doc.autoTable({
    startY: y + 4,
    margin: { left: m, right: m },
    head: [['Código', 'Cantidad', 'UM', 'Descripción']],
    body: remito.items.map(i => [i.codigo, i.cantidad, i.um, i.descripcion]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, lineColor: [120, 120, 120], lineWidth: 0.2 },
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 22, halign: 'right' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 'auto' },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Observaciones
  if (remito.observaciones) {
    if (y > H - 60) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Observaciones:', m, y);
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(remito.observaciones, derecha - m);
    doc.text(lineas, m, y + 5);
    y += 5 + 5 * lineas.length;
  }

  // Firmas
  if (y > H - 40) { doc.addPage(); }
  const yFirma = H - 28;
  doc.setLineWidth(0.3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const colFirma = (x1, x2, texto) => {
    doc.line(x1, yFirma, x2, yFirma);
    doc.text(texto, (x1 + x2) / 2, yFirma + 4.5, { align: 'center' });
  };
  colFirma(m, m + 55, 'Recibí conforme');
  colFirma(W / 2 - 27, W / 2 + 27, 'Aclaración');
  colFirma(derecha - 55, derecha, 'DNI');

  doc.save(`Remito_${remito.numero}.pdf`);
}

// ---------- Historial ----------
function renderHistorial() {
  const lista = leerHistorial();
  const cont = $('#lista-historial');
  cont.innerHTML = '';
  if (!lista.length) {
    cont.innerHTML = '<p class="vacio">Todavía no emitiste remitos.</p>';
    return;
  }
  for (const r of [...lista].reverse()) {
    const card = document.createElement('div');
    card.className = 'remito-card';
    card.innerHTML = `
      <div class="info">
        <div class="numero">N° ${r.numero}</div>
        <div class="cliente">${escapar(r.cliente)}</div>
        <div class="fecha">${r.fecha} · ${r.items.length} ítem${r.items.length === 1 ? '' : 's'}</div>
      </div>
      <button type="button" class="btn secundario">PDF</button>`;
    card.querySelector('button').addEventListener('click', () => generarPDF(r));
    cont.appendChild(card);
  }
}

function escapar(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---------- Respaldo ----------
function exportarRespaldo() {
  const datos = { proximo: leerProximo(), historial: leerHistorial(), exportado: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `respaldo-remitos-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importarRespaldo(archivo) {
  try {
    const datos = JSON.parse(await archivo.text());
    if (!Array.isArray(datos.historial)) throw new Error('formato');
    if (!confirm(`Se van a importar ${datos.historial.length} remitos y el contador quedará en ${datos.proximo}. ¿Continuar?`)) return;
    guardarHistorial(datos.historial);
    guardarProximo(parseInt(datos.proximo, 10) || 1);
    renderHistorial();
    aviso('Respaldo importado.', 'ok');
  } catch {
    aviso('El archivo no es un respaldo válido.', 'error');
  }
}

// ---------- Eventos ----------
function mostrarVista(nombre) {
  $$('.view').forEach(v => v.classList.toggle('oculto', v.id !== `view-${nombre}`));
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === nombre));
  if (nombre === 'historial') renderHistorial();
  if (nombre === 'ajustes') actualizarBadge();
}

function init() {
  $$('.tab').forEach(t => t.addEventListener('click', () => mostrarVista(t.dataset.view)));
  $('#btn-agregar').addEventListener('click', () => {
    const item = agregarItem();
    $('[name=codigo]', item).focus();
  });

  $('#form-remito').addEventListener('submit', ev => {
    ev.preventDefault();
    const f = ev.target;
    const items = leerItems();
    if (!items.length || items.some(i => !i.descripcion)) {
      aviso('Agregá al menos un ítem con descripción.', 'error');
      return;
    }
    const numero = parseInt(f.numero.value, 10);
    if (!Number.isFinite(numero) || numero < 1) {
      aviso('Ingresá un número de remito válido.', 'error');
      return;
    }
    if (leerHistorial().some(r => r.numero === formatearNumero(numero)) &&
        !confirm(`El remito N° ${formatearNumero(numero)} ya existe en el historial. ¿Generar igual?`)) {
      return;
    }
    const remito = {
      numero: formatearNumero(numero),
      fecha: hoy(),
      cliente: f.cliente.value.trim(),
      cuit: f.cuit.value.trim(),
      domicilio: f.domicilio.value.trim(),
      items,
      observaciones: f.observaciones.value.trim(),
      emitido: new Date().toISOString(),
    };
    generarPDF(remito);
    guardarHistorial([...leerHistorial(), remito]);
    guardarProximo(numero + 1);
    limpiarFormulario();
    aviso(`Remito N° ${remito.numero} generado.`, 'ok');
  });

  $('#btn-guardar-numero').addEventListener('click', () => {
    const n = parseInt($('#ajuste-proximo').value, 10);
    if (!Number.isFinite(n) || n < 1) { aviso('Ingresá un número válido.', 'error'); return; }
    guardarProximo(n);
    aviso(`El próximo remito será el N° ${formatearNumero(n)}.`, 'ok');
  });

  $('#btn-exportar').addEventListener('click', exportarRespaldo);
  $('#input-importar').addEventListener('change', ev => {
    if (ev.target.files[0]) importarRespaldo(ev.target.files[0]);
    ev.target.value = '';
  });

  $('#form-login').addEventListener('submit', ev => {
    ev.preventDefault();
    const ingresada = $('#login-pass').value.trim().toLowerCase();
    const esperada = String(config.password || '').trim().toLowerCase();
    if (ingresada && ingresada === esperada) {
      sessionStorage.setItem(KEYS.sesion, '1');
      $('#login').classList.add('oculto');
    } else {
      $('#login-error').classList.remove('oculto');
      $('#login-pass').value = '';
      $('#login-pass').focus();
    }
  });
  if (sessionStorage.getItem(KEYS.sesion) === '1') $('#login').classList.add('oculto');

  agregarItem();
  cargarConfig();
}

document.addEventListener('DOMContentLoaded', init);
