import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const LOGIN_ALIAS = import.meta.env.VITE_LOGIN_ALIAS || "";
const LOGIN_EMAIL = import.meta.env.VITE_LOGIN_EMAIL || "";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);

const LOGO_SRC = "logo-def.png";
const EMDABER_LOGO_SRC = "logo-emdaber.png";
const BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "pedido-archivos";

const money = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (date) => {
  if (!date) return "";
  const [y, m, d] = String(date).slice(0, 10).split("-");
  return y && m && d ? `${d}-${m}-${y}` : String(date);
};
const cleanText = (value = "") => {
  let text = String(value);
  if (/[ÃÂâ]/.test(text)) {
    try {
      text = decodeURIComponent(escape(text));
    } catch {
      // Keep the original text and apply the targeted replacements below.
    }
  }
  return text
    .replaceAll("Ã¡", "á")
    .replaceAll("Ã©", "é")
    .replaceAll("Ã­", "í")
    .replaceAll("Ã³", "ó")
    .replaceAll("Ãº", "ú")
    .replaceAll("Ã±", "ñ")
    .replaceAll("Ã‘", "Ñ")
    .replaceAll("Â°", "°")
    .replaceAll("Âº", "º")
    .replaceAll("Â·", "·")
    .replaceAll("â€“", "-");
};
const escapeHtml = (value = "") => cleanText(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");
const assetUrl = (path) => new URL(path, window.location.href).href;

function Button({ children, className = "", ...props }) {
  return <button {...props} className={`rounded-xl px-4 py-2 font-medium bg-[#4b1f0e] text-[#ffe45c] hover:bg-[#6a2b12] disabled:opacity-50 shadow-sm ${className}`}>{children}</button>;
}
function Input(props) {
  return <input {...props} className="w-full rounded-xl border border-[#e6c65a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#f7d44a] focus:border-[#4b1f0e]" />;
}
function Select(props) {
  return <select {...props} className="w-full rounded-xl border border-[#e6c65a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#f7d44a] focus:border-[#4b1f0e] bg-white" />;
}
function TextArea(props) {
  return <textarea {...props} className="w-full rounded-xl border border-[#e6c65a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#f7d44a] focus:border-[#4b1f0e]" />;
}
function Section({ title, children }) {
  return <div className="rounded-2xl bg-white/95 p-5 shadow-sm border border-[#f2c94c]"><h2 className="text-xl font-semibold mb-4 text-[#4b1f0e]">{title}</h2>{children}</div>;
}

function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      setError("Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.");
      setLoading(false);
      return;
    }
    const cleanUsername = username.trim();
    const email = LOGIN_ALIAS && LOGIN_EMAIL && cleanUsername.toLowerCase() === LOGIN_ALIAS.toLowerCase()
      ? LOGIN_EMAIL
      : cleanUsername;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return <main className="min-h-screen bg-[#fff4b8] text-[#2a1208] p-6 flex items-center justify-center">
    <form onSubmit={login} className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-sm border border-[#f2c94c] space-y-4">
      <div className="flex items-center gap-4">
        <img src={LOGO_SRC} className="w-16 h-16 object-contain" />
        <div>
          <h1 className="text-3xl font-bold text-[#4b1f0e]">DEFApp</h1>
          <p className="text-[#6a2b12]">Acceso a la base de datos</p>
        </div>
      </div>
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3">{error}</div>}
      <Input required placeholder="Usuario" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} />
      <Input type="password" required placeholder="Contrasena" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
      <Button className="w-full" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</Button>
    </form>
  </main>;
}

async function uploadPedidoArchivo(file) {
  if (!file) return {};
  if (!["application/pdf", "image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
    throw new Error("Solo se permiten PDF, JPG, JPEG o PNG.");
  }
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (up.error) throw up.error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { archivo_url: data.publicUrl, archivo_nombre: file.name };
}

function imprimirPedido({ pedidoId, cliente, fecha, items, nota }) {
  const fechaImpresa = formatDate(fecha);
  const filas = items.map(i => `<tr><td>${i.cantidad}</td><td>${escapeHtml(i.abertura?.medida || "")}</td><td>${escapeHtml(i.abertura?.modelo || "")} - ${escapeHtml(i.abertura?.mano || "")} - ${escapeHtml(i.abertura?.madera || "")}</td></tr>`).join("");
  const notaHtml = nota ? `<div class="nota">${escapeHtml(nota).replaceAll("\n", "<br/>")}</div>` : "";
  const encabezadoOficina = `<div class="office-client">Fecha: ${fechaImpresa}<br/>Cliente: ${escapeHtml(cliente?.razon_social || "")}</div>`;
  const pedidoTitulo = pedidoId ? `Nro: ${escapeHtml(pedidoId)}` : "Nro:";
  const copia = (titulo) => `<section class="page">${titulo === "OFICINA" ? encabezadoOficina : `<div class="fecha-general">Fecha: ${fechaImpresa}</div>`}<div class="print-title"><div>${pedidoTitulo}</div><div class="copy-title">${titulo}</div></div><table><thead><tr><th>Cantidad</th><th>Medida</th><th>Descripcion</th></tr></thead><tbody>${filas}</tbody></table>${notaHtml}</section>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Pedido ${pedidoId || ""}</title><style>@page{size:A4 portrait;margin:12mm}body{font-family:Arial,sans-serif;color:#111}.page{page-break-after:always;min-height:260mm}.page:last-child{page-break-after:auto}.fecha-general{font-size:19px;font-weight:bold;margin-bottom:8px}.office-client{font-size:20px;font-weight:bold;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:10px}.print-title{text-align:center;font-size:22px;font-weight:bold;margin:8px 0 14px;line-height:1.25}.copy-title{margin-top:2px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #222;padding:8px;text-align:center;vertical-align:middle}th{text-align:center;font-weight:bold}.nota{margin-top:18px;font-size:13px;font-weight:bold;border:1px solid #222;padding:10px}.firma{text-align:right;font-size:12px;margin-top:28px}</style></head><body>${copia("OFICINA")}${copia("HOJAS")}${copia("MARCOS")}<script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`;
  const w = window.open("", "_blank", "width=900,height=1000");
  w.document.write(html); w.document.close();
}

async function obtenerOCrearRemito(pedidoId) {
  const existente = await supabase.from("remitos").select("*").eq("pedido_id", pedidoId).maybeSingle();
  if (existente.error) throw existente.error;
  if (existente.data) return existente.data;
  const creado = await supabase.from("remitos").insert({ pedido_id: pedidoId }).select("*").single();
  if (creado.error) throw creado.error;
  return creado.data;
}

async function imprimirRemitoTransito(pedido) {
  try {
    const remito = await obtenerOCrearRemito(pedido.id);
    const cliente = pedido.clientes || {};
    const items = pedido.pedido_items || [];
    const filas = items.map(i => `<tr><td>${i.cantidad}</td><td>${escapeHtml(i.stock_aberturas?.medida || "")}</td><td>${escapeHtml(i.stock_aberturas?.modelo || "")} - ${escapeHtml(i.stock_aberturas?.mano || "")} - ${escapeHtml(i.stock_aberturas?.madera || "")}</td></tr>`).join("");
    const nota = pedido.nota ? `<div class="marca"><b>DESCRIPCION:</b> ${escapeHtml(pedido.nota).replaceAll("\n", "<br/>")}</div>` : "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Remito en Transito</title><style>@page{size:A4 portrait;margin:10mm}body{font-family:Arial,sans-serif;color:#111;font-size:11px}.remito{width:190mm;min-height:270mm;margin:0 auto;border:1px solid #222;padding:7mm;position:relative}.top{display:grid;grid-template-columns:32mm 1fr 58mm;gap:6mm;align-items:start}.logo{width:30mm;object-fit:contain}.empresa{font-size:11px;line-height:1.25}.numero{border:1px solid #222;padding:4mm;text-align:center;font-weight:bold;font-size:14px}.legal{text-align:center;font-weight:bold;margin:4mm 0;border-top:1px solid #222;border-bottom:1px solid #222;padding:2mm 0}.cliente{display:grid;grid-template-columns:1fr 1fr;gap:2mm 10mm;border:1px solid #222;padding:3mm;margin-top:3mm}.cliente div{min-height:5mm}.venta{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;border:1px solid #222;border-top:none}.venta div{padding:2mm;border-right:1px solid #222}.venta div:last-child{border-right:none}table{width:100%;border-collapse:collapse;margin-top:4mm;font-size:11px}th,td{border:1px solid #222;padding:2mm;text-align:center;vertical-align:middle}th{font-weight:bold}.firmas{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:3mm;position:absolute;left:7mm;right:7mm;bottom:14mm}.firmas div{border-top:1px solid #222;text-align:center;padding-top:2mm;font-size:10px}.marca{font-weight:bold;margin-top:4mm}.no-factura{text-align:center;font-size:16px;font-weight:bold;margin-top:5mm}.transito{font-size:18px;font-weight:bold;text-align:center;margin-top:2mm}.x{font-size:22px;font-weight:bold;margin-right:5mm}</style></head><body><section class="remito"><div class="top"><img class="logo" src="${assetUrl(EMDABER_LOGO_SRC)}"/><div class="empresa"><b>Emilio Castro 2543</b><br/>(B1824MOG) - Lanus Oeste<br/>Pcia. De Bs. As. - Argentina<br/>Wsp: 11 2484-7882<br/>Email: aberturas@emdaber.com</div><div class="numero">Nro 0001 - ${String(remito.nro_remito).padStart(8,"0")}</div></div><div class="legal">C.U.I.T.: 30-69417030-3 - ING. BRUTOS: Exento<br/>IMP. INTERNOS: No Responsable - INICIO ACT: 12/03/1998</div><div class="cliente"><div><b>FECHA:</b> ${formatDate(remito.fecha)}</div><div><b>Nro CLIENTE:</b> ${escapeHtml(cliente.nro_cliente || "")}</div><div><b>SENOR (ES):</b> ${escapeHtml(cliente.razon_social || "")}</div><div><b>C.U.I.T.:</b> ${escapeHtml(cliente.cuit_cuil || "")}</div><div><b>DOMICILIO:</b> ${escapeHtml(cliente.direccion || "")}</div><div><b>TELEFONO:</b> ${escapeHtml(cliente.telefono || "")}</div><div><b>LOCALIDAD:</b> ${escapeHtml(cliente.localidad || "")}</div><div><b>I.V.A.:</b></div><div><b>PROVINCIA:</b></div></div><div class="venta"><div><b>ORDEN Nro</b><br/>${pedido.id}</div><div><b>PEDIDO</b><br/>${pedido.id}</div><div><b>VTO. FACTURA</b></div><div><b>CONDICIONES DE VENTA</b></div></div><table><thead><tr><th style="width:20mm">CANTIDAD</th><th style="width:38mm">MEDIDA</th><th>ARTICULO</th></tr></thead><tbody>${filas}</tbody></table>${nota}<div class="transito"><span class="x">X</span>MERCADERIA EN TRANSITO</div><div class="no-factura">DOCUMENTO NO VALIDO COMO FACTURA</div><div class="firmas"><div>CONFECCIONO</div><div>REVISO</div><div>RECIBI CONFORME<br/>ACLARACION DE FIRMA</div><div>Nro DE DOCUMENTO<br/>CARGO QUE DESEMPENA</div></div></section><script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`;
    const htmlFinal = html
      .replace(".marca{font-weight:bold;margin-top:4mm}", ".marca{font-weight:bold;margin-top:4mm}.header-aviso{grid-column:1 / -1;text-align:center;font-weight:bold;margin-top:1mm}")
      .replace(/<div class="marca">[\s\S]*?<\/div>/, "")
      .replace(/<div class="transito">[\s\S]*?<div class="firmas">/, "<div class=\"firmas\">")
      .replace("</div></div><div class=\"legal\">", "</div><div class=\"header-aviso\"><div class=\"transito\"><span class=\"x\">X</span>MERCADERIA EN TRANSITO</div><div class=\"no-factura\">DOCUMENTO NO VALIDO COMO FACTURA</div></div></div><div class=\"legal\">");
    const w = window.open("", "_blank", "width=900,height=1000");
    w.document.write(htmlFinal); w.document.close();
  } catch (e) {
    alert(e.message);
  }
}

function getAdjuntoStoragePath(value) {
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const parsed = new URL(value);
    const publicMarker = `/object/public/${BUCKET}/`;
    const signedMarker = `/object/sign/${BUCKET}/`;
    const marker = parsed.pathname.includes(publicMarker) ? publicMarker : signedMarker;
    const idx = parsed.pathname.indexOf(marker);
    return idx >= 0 ? decodeURIComponent(parsed.pathname.slice(idx + marker.length)) : "";
  } catch {
    return "";
  }
}

async function resolveAdjuntoUrl(value) {
  const path = getAdjuntoStoragePath(value);
  if (!path) return value;
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

async function verAdjunto(url, nombre) {
  if (!url) return;
  try {
    const resolvedUrl = await resolveAdjuntoUrl(url);
    const res = await fetch(resolvedUrl);
    if (!res.ok) {
      let detail = "";
      try {
        const data = await res.json();
        detail = data.message || data.error || "";
      } catch {
        detail = await res.text();
      }
      throw new Error(detail || `Error ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const isImage = blob.type.startsWith("image/") || /\.(jpg|jpeg|png)(\?|$)/i.test(url) || /\.(jpg|jpeg|png)$/i.test(nombre || "");
    const body = isImage ? `<img src="${blobUrl}" style="max-width:100%;height:auto"/>` : `<iframe src="${blobUrl}" style="width:100%;height:96vh;border:0"></iframe>`;
    const w = window.open("", "_blank", "width=1000,height=900");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(nombre || "Adjunto")}</title></head><body style="margin:0;font-family:Arial">${body}<script>window.onbeforeunload=()=>URL.revokeObjectURL("${blobUrl}")</script></body></html>`);
    w.document.close();
  } catch (e) {
    alert(`No se pudo abrir el adjunto: ${e.message}. Si el mensaje dice "Bucket not found", falta crear en Supabase el bucket "${BUCKET}".`);
  }
}

export default function DEFApp() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("clientes");
  const [clientes, setClientes] = useState([]);
  const [stock, setStock] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    if (!session) return;
    setLoading(true);
    setMsg("");
    const res = await Promise.all([
      supabase.from("clientes").select("*").order("nro_cliente"),
      supabase.from("stock_aberturas").select("*").order("nro_abertura"),
      supabase.from("pedidos").select("*, clientes(*), pedido_items(*, stock_aberturas(*))").order("id", { ascending: false }),
      supabase.from("movimientos").select("*").order("fecha", { ascending: false }),
      supabase.from("pagos").select("*, pedidos(*, clientes(*))").order("fecha", { ascending: false }),
      supabase.from("saldos_pedidos").select("*").order("fecha", { ascending: false }),
      supabase.from("proveedores_facturas").select("*").order("razon_social")
    ]);
    res.forEach(r => { if (r.error) setMsg(r.error.message); });
    setClientes(res[0].data || []);
    setStock(res[1].data || []);
    setPedidos(res[2].data || []);
    setMovimientos(res[3].data || []);
    setPagos(res[4].data || []);
    setSaldos(res[5].data || []);
    setProveedores(res[6].data || []);
    setLoading(false);
  }
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setClientes([]);
        setStock([]);
        setPedidos([]);
        setMovimientos([]);
        setPagos([]);
        setSaldos([]);
        setProveedores([]);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (session) loadAll(); }, [session]);

  async function logout() {
    await supabase.auth.signOut();
  }

  async function checkAppUpdates() {
    if (!window.defapp?.checkForUpdates) {
      alert("La actualizacion de la app solo funciona desde la version instalable.");
      return;
    }
    const result = await window.defapp.checkForUpdates();
    if (result?.error) alert(result.error);
  }

  if (authLoading) {
    return <main className="min-h-screen bg-[#fff4b8] text-[#2a1208] p-6 flex items-center justify-center">Cargando sesion...</main>;
  }

  if (!session) return <LoginScreen />;

  return <main className="min-h-screen bg-[#fff4b8] text-[#2a1208] p-6">
    <div className="max-w-7xl mx-auto space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-3xl border border-[#f2c94c] bg-gradient-to-r from-[#ffe45c] to-[#f6c842] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <img src={LOGO_SRC} className="w-20 h-20 object-contain" />
          <div><h1 className="text-4xl font-bold text-[#4b1f0e]">DEFApp</h1><p className="text-[#6a2b12]">Gestion integral de aberturas de madera</p></div>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <span className="text-sm text-[#6a2b12]">{session.user.email}</span>
          <div className="flex gap-2">
            <Button type="button" className="bg-[#8a5a00] hover:bg-[#a66a00]" onClick={checkAppUpdates}>Actualizar App</Button>
            <Button onClick={loadAll} disabled={loading}>{loading ? "Actualizando..." : "Actualizar"}</Button>
            <Button type="button" className="bg-slate-600 hover:bg-slate-700" onClick={logout}>Salir</Button>
          </div>
        </div>
      </header>
      {msg && <div className="rounded-xl bg-amber-100 border border-amber-300 p-3">{msg}</div>}
      <nav className="flex flex-wrap gap-2">{["clientes", "stock", "pedidos", "movimientos", "pagos", "saldos"].map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 capitalize ${tab === t ? "bg-yellow-700 text-white" : "bg-white border"}`}>{t}</button>)}</nav>
      {tab === "clientes" && <Clientes clientes={clientes} reload={loadAll} />}
      {tab === "stock" && <Stock stock={stock} reload={loadAll} />}
      {tab === "pedidos" && <Pedidos clientes={clientes} stock={stock} pedidos={pedidos} reload={loadAll} />}
      {tab === "movimientos" && <Movimientos movimientos={movimientos} proveedores={proveedores} reload={loadAll} />}
      {tab === "pagos" && <Pagos pagos={pagos} saldos={saldos} reload={loadAll} />}
      {tab === "saldos" && <Saldos saldos={saldos} pagos={pagos} />}
    </div>
  </main>;
}

function Clientes({ clientes, reload }) {
  const empty = { razon_social: "", direccion: "", localidad: "", telefono: "", cuit_cuil: "" };
  const [form, setForm] = useState(empty);
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState("");
  const rows = clientes.filter(c => cleanText(`${c.nro_cliente} ${cleanText(c.razon_social)}`).toLowerCase().includes(q.toLowerCase()));
  async function save(e) { e.preventDefault(); const r = edit ? await supabase.from("clientes").update(form).eq("id", edit) : await supabase.from("clientes").insert(form); if (r.error) alert(r.error.message); setForm(empty); setEdit(null); reload(); }
  async function del(id) { if (confirm("Eliminar cliente?")) { const r = await supabase.from("clientes").delete().eq("id", id); if (r.error) alert(r.error.message); reload(); } }
  return <Section title="Clientes"><form onSubmit={save} className="grid md:grid-cols-3 gap-3 mb-5"><Input required placeholder="Razon Social" value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} /><Input required placeholder="Direccion" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /><Input required placeholder="Localidad" value={form.localidad} onChange={e => setForm({ ...form, localidad: e.target.value })} /><Input required placeholder="Telefono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /><Input placeholder="CUIT/CUIL opcional" value={form.cuit_cuil || ""} onChange={e => setForm({ ...form, cuit_cuil: e.target.value })} /><Button>{edit ? "Guardar cambios" : "Crear cliente"}</Button></form><Input placeholder="Filtrar por nombre o Nro cliente" value={q} onChange={e => setQ(e.target.value)} /><Table rows={rows} cols={["nro_cliente", "razon_social", "direccion", "localidad", "telefono", "cuit_cuil"]} onEdit={r => { setEdit(r.id); setForm({ razon_social: r.razon_social, direccion: r.direccion, localidad: r.localidad, telefono: r.telefono, cuit_cuil: r.cuit_cuil || "" }); }} onDelete={del} /></Section>;
}

function Stock({ stock, reload }) {
  const empty = { modelo: "", medida: "", madera: "", mano: "" };
  const [form, setForm] = useState(empty);
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState("");
  const rows = stock.filter(a => cleanText(`${a.nro_abertura} ${a.modelo} ${a.medida} ${a.madera} ${a.mano}`).toLowerCase().includes(q.toLowerCase()));

  async function save(e) {
    e.preventDefault();
    const r = edit
      ? await supabase.from("stock_aberturas").update(form).eq("id", edit)
      : await supabase.from("stock_aberturas").insert(form);
    if (r.error) alert(r.error.message);
    setForm(empty);
    setEdit(null);
    reload();
  }

  async function del(id) {
    if (confirm("Eliminar abertura?")) {
      const r = await supabase.from("stock_aberturas").delete().eq("id", id);
      if (r.error) alert(r.error.message);
      reload();
    }
  }

  function editStock(r) {
    setEdit(r.id);
    setForm({
      modelo: cleanText(r.modelo || ""),
      medida: cleanText(r.medida || ""),
      madera: cleanText(r.madera || ""),
      mano: cleanText(r.mano || "")
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setForm(empty);
    setEdit(null);
  }

  return <Section title="Stock de Aberturas">
    <form onSubmit={save} className="grid md:grid-cols-5 gap-3 mb-3">
      <Input required placeholder="Modelo" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} />
      <Input required placeholder="Medida" value={form.medida} onChange={e => setForm({ ...form, medida: e.target.value })} />
      <Input required placeholder="Madera" value={form.madera} onChange={e => setForm({ ...form, madera: e.target.value })} />
      <Input required placeholder="Mano" value={form.mano} onChange={e => setForm({ ...form, mano: e.target.value })} />
      <Button>{edit ? "Guardar cambios" : "Crear abertura"}</Button>
    </form>
    {edit && <div className="mb-5 flex justify-end"><Button type="button" className="bg-slate-600 hover:bg-slate-700" onClick={cancelEdit}>Cancelar edicion</Button></div>}
    <Input placeholder="Filtrar stock" value={q} onChange={e => setQ(e.target.value)} />
    <Table rows={rows} cols={["nro_abertura", "modelo", "medida", "madera", "mano"]} onEdit={editStock} onDelete={del} />
  </Section>;
}
function Pedidos({ clientes, stock, pedidos, reload }) {
  const [clienteId, setClienteId] = useState("");
  const [fecha, setFecha] = useState(today());
  const [items, setItems] = useState([]);
  const [editId, setEditId] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [nota, setNota] = useState("");
  const [aberturaId, setAberturaId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(0);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("nro_cliente");
  const clientesFiltrados = useMemo(() => [...clientes].filter(c => cleanText(`${c.nro_cliente} ${cleanText(c.razon_social)}`).toLowerCase().includes(q.toLowerCase())).sort((a, b) => String(a[sort]).localeCompare(String(b[sort]), "es", { numeric: true })), [clientes, q, sort]);
  const total = items.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0);
  function reset() { setClienteId(""); setFecha(today()); setItems([]); setEditId(null); setArchivo(null); setNota(""); }
  function addItem() { const a = stock.find(x => String(x.id) === String(aberturaId)); if (!a) return; setItems([...items, { abertura_id: a.id, abertura: a, cantidad: Number(cantidad), precio_unitario: Number(precio) }]); setAberturaId(""); setCantidad(1); setPrecio(0); }
  function editPedido(p) { setEditId(p.id); setClienteId(String(p.cliente_id)); setFecha(p.fecha); setNota(p.nota || ""); setItems((p.pedido_items || []).map(i => ({ abertura_id: i.abertura_id, abertura: i.stock_aberturas, cantidad: i.cantidad, precio_unitario: Number(i.precio_unitario) }))); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function save() {
    try {
      if (!clienteId || items.length === 0) return alert("Elegi cliente y agrega al menos una abertura.");
      const up = await uploadPedidoArchivo(archivo);
      const base = { cliente_id: clienteId, fecha, total, nota };
      if (up.archivo_url) Object.assign(base, up);
      let pedidoId = editId;
      if (editId) {
        const r = await supabase.from("pedidos").update(base).eq("id", editId).select().single();
        if (r.error) throw r.error;
        await supabase.from("pedido_items").delete().eq("pedido_id", editId);
      } else {
        const r = await supabase.from("pedidos").insert(base).select().single();
        if (r.error) throw r.error;
        pedidoId = r.data.id;
      }
      const ins = items.map(i => ({ pedido_id: pedidoId, abertura_id: i.abertura_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario }));
      const it = await supabase.from("pedido_items").insert(ins);
      if (it.error) throw it.error;
      const cliente = clientes.find(c => String(c.id) === String(clienteId));
      imprimirPedido({ pedidoId, cliente, fecha, items, total, nota });
      reset(); reload();
    } catch (e) { alert(e.message); }
  }
  async function del(id) { if (confirm("Eliminar pedido? Tambien se eliminan sus items y pagos asociados.")) { const r = await supabase.from("pedidos").delete().eq("id", id); if (r.error) alert(r.error.message); reload(); } }
  const rows = pedidos.map(p => ({ ...p, cliente: cleanText(p.clientes?.razon_social || ""), archivo: p.archivo_url ? cleanText(p.archivo_nombre || "Ver archivo") : "" }));
  return <Section title="Pedidos"><div className="grid md:grid-cols-4 gap-3 mb-4"><Input placeholder="Filtrar cliente por nombre o Nro" value={q} onChange={e => setQ(e.target.value)} /><Select value={sort} onChange={e => setSort(e.target.value)}><option value="nro_cliente">Ordenar por Nro</option><option value="razon_social">Ordenar por Razon Social</option></Select><Select value={clienteId} onChange={e => setClienteId(e.target.value)}><option value="">Seleccionar cliente</option>{clientesFiltrados.map(c => <option key={c.id} value={c.id}>#{c.nro_cliente} - {cleanText(c.razon_social)}</option>)}</Select><Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div><div className="grid md:grid-cols-5 gap-3 mb-4"><Select value={aberturaId} onChange={e => setAberturaId(e.target.value)}><option value="">Seleccionar abertura</option>{stock.map(a => <option key={a.id} value={a.id}>#{a.nro_abertura} - {cleanText(a.modelo)} - {cleanText(a.medida)} - {cleanText(a.madera)} - {cleanText(a.mano)}</option>)}</Select><Input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} /><Input type="number" min="0" step="0.01" placeholder="Precio unitario" value={precio} onChange={e => setPrecio(e.target.value)} /><Button type="button" onClick={addItem}>Agregar modelo</Button><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setArchivo(e.target.files?.[0] || null)} /></div><div className="mb-4"><TextArea rows="3" placeholder="Texto adicional del pedido. Ej: Tiene barral de 60cms" value={nota} onChange={e => setNota(e.target.value)} /></div><div className="rounded-xl bg-[#fff9d6] border border-[#f2c94c] p-4 mb-5"><h3 className="font-semibold mb-2">Pre-finalizacion {editId ? `(editando pedido #${editId})` : ""}</h3>{items.length === 0 ? <p className="text-slate-500">Todavia no agregaste aberturas.</p> : items.map((i, idx) => <div key={idx} className="flex justify-between border-b py-2"><span>{i.cantidad} x #{i.abertura?.nro_abertura} {cleanText(i.abertura?.modelo || "")} - {cleanText(i.abertura?.mano || "")} - {cleanText(i.abertura?.madera || "")} - {cleanText(i.abertura?.medida || "")}</span><span>{money(i.cantidad * i.precio_unitario)} <button className="ml-2 text-red-600" onClick={() => setItems(items.filter((_, j) => j !== idx))}>Quitar</button></span></div>)}<div className="text-right text-2xl font-bold mt-3">Total: {money(total)}</div><div className="flex justify-end gap-2 mt-3"><Button type="button" onClick={save} disabled={!clienteId || items.length === 0}>{editId ? "Guardar e imprimir" : "Finalizar e imprimir"}</Button>{editId && <Button type="button" className="bg-slate-500" onClick={reset}>Cancelar edicion</Button>}</div></div><Table rows={rows} cols={["id", "fecha", "cliente", "total", "archivo"]} onEdit={editPedido} onDelete={del} extra={(r) => <>{r.archivo_url && <button className="text-emerald-700" onClick={() => verAdjunto(r.archivo_url, r.archivo_nombre)}>Ver adjunto</button>}<button className="text-[#4b1f0e]" onClick={() => imprimirPedido({ pedidoId: r.id, cliente: r.clientes, fecha: r.fecha, items: (r.pedido_items || []).map(i => ({ abertura: i.stock_aberturas, cantidad: i.cantidad, precio_unitario: Number(i.precio_unitario) })), total: r.total, nota: r.nota })}>Imprimir pedido</button><button className="text-[#8a5a00]" onClick={() => imprimirRemitoTransito(r)}>Imprimir remito</button></>} /></Section>;
}

function Movimientos({ movimientos, proveedores, reload }) {
  const empty = { razon_social: "", cuit_cuil: "", rubro: "", fecha: today(), nro_factura: "", importe: "" };
  const [form, setForm] = useState(empty);
  function proveedorChange(v) { const p = proveedores.find(x => x.razon_social === v); setForm({ ...form, razon_social: v, cuit_cuil: p?.cuit_cuil || "", rubro: p?.rubro || "" }); }
  async function save(e) { e.preventDefault(); await supabase.from("proveedores_facturas").upsert({ razon_social: form.razon_social, cuit_cuil: form.cuit_cuil, rubro: form.rubro }, { onConflict: "razon_social" }); const r = await supabase.from("movimientos").insert({ ...form, importe: Number(form.importe) }); if (r.error) alert(r.error.message); setForm(empty); reload(); }
  async function del(id) { if (confirm("Eliminar movimiento?")) { await supabase.from("movimientos").delete().eq("id", id); reload(); } }
  return <Section title="Movimientos / Facturas"><form onSubmit={save} className="grid md:grid-cols-4 gap-3 mb-5"><input list="proveedores" required placeholder="Razon Social" value={form.razon_social} onChange={e => proveedorChange(e.target.value)} className="w-full rounded-xl border border-[#e6c65a] px-3 py-2" /><datalist id="proveedores">{proveedores.map(p => <option key={p.id} value={cleanText(p.razon_social)} />)}</datalist><Input placeholder="CUIT/CUIL" value={form.cuit_cuil || ""} onChange={e => setForm({ ...form, cuit_cuil: e.target.value })} /><Input placeholder="Rubro" value={form.rubro || ""} onChange={e => setForm({ ...form, rubro: e.target.value })} /><Input type="date" required value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /><Input required placeholder="Nro Factura" value={form.nro_factura} onChange={e => setForm({ ...form, nro_factura: e.target.value })} /><Input type="number" step="0.01" min="0" required placeholder="Importe" value={form.importe} onChange={e => setForm({ ...form, importe: e.target.value })} /><Button>Cargar factura</Button></form><Table rows={movimientos} cols={["fecha", "razon_social", "cuit_cuil", "rubro", "nro_factura", "importe"]} onDelete={del} /></Section>;
}

function Pagos({ pagos, saldos, reload }) {
  const [pedidoId, setPedidoId] = useState("");
  const [fecha, setFecha] = useState(today());
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("Efectivo");
  const saldoPedido = saldos.find(s => String(s.pedido_id) === String(pedidoId));
  const saldosOrdenados = [...saldos].sort((a, b) => Number(b.pedido_id || 0) - Number(a.pedido_id || 0));

  async function save(e) {
    e.preventDefault();
    const valor = Number(monto);
    if (saldoPedido && valor > Number(saldoPedido.saldo)) return alert("El pago no puede superar el saldo pendiente.");
    const r = await supabase.from("pagos").insert({ pedido_id: pedidoId, fecha, monto: valor, metodo });
    if (r.error) alert(r.error.message);
    setMonto("");
    reload();
  }

  async function del(id) {
    if (confirm("Eliminar pago? El saldo del pedido se recalculara automaticamente.")) {
      const r = await supabase.from("pagos").delete().eq("id", id);
      if (r.error) alert(r.error.message);
      reload();
    }
  }

  const rows = pagos.map(p => ({
    ...p,
    cliente: cleanText(p.pedidos?.clientes?.razon_social || ""),
    pedido: p.pedido_id,
    monto: money(p.monto)
  }));

  return <Section title="Pagos">
    <form onSubmit={save} className="grid md:grid-cols-5 gap-3 mb-5">
      <Select required value={pedidoId} onChange={e => setPedidoId(e.target.value)}>
        <option value="">Seleccionar pedido</option>
        {saldosOrdenados.map(s => <option key={s.pedido_id} value={s.pedido_id}>Pedido #{s.pedido_id} - {cleanText(s.razon_social)} - Saldo {money(s.saldo)}</option>)}
      </Select>
      <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
      <Input type="number" step="0.01" min="0" placeholder="Monto" value={monto} onChange={e => setMonto(e.target.value)} />
      <Select value={metodo} onChange={e => setMetodo(e.target.value)}><option>Efectivo</option><option>Transferencia</option></Select>
      <Button>Cargar pago</Button>
    </form>
    {saldoPedido && <div className="rounded-xl bg-[#fff9d6] border border-[#f2c94c] p-3 mb-4">Saldo actual del pedido: <b>{money(saldoPedido.saldo)}</b></div>}
    <Table rows={rows} cols={["fecha", "pedido", "cliente", "monto", "metodo"]} onDelete={del} />
  </Section>;
}

function Saldos({ saldos, pagos }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "cliente", dir: "asc" });
  const filtered = saldos.filter(s => cleanText(`${s.nro_cliente} ${s.razon_social}`).toLowerCase().includes(q.toLowerCase()));
  const saldoTotal = filtered.reduce((acc, s) => acc + Number(s.saldo || 0), 0);

  function setSortColumn(key) {
    setSort(current => current.key === key
      ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
      : { key, dir: "asc" }
    );
  }

  function sortValue(row, key) {
    if (key === "cliente") return cleanText(row.razon_social || "");
    if (key === "pedido") return Number(row.pedido_id || 0);
    if (["total", "pagado", "saldo"].includes(key)) return Number(row[key] || 0);
    if (key === "pagos") return pagos.filter(p => p.pedido_id === row.pedido_id).map(p => `${p.fecha} ${p.monto} ${p.metodo}`).join(" ");
    return row[key] || "";
  }

  const list = [...filtered].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    const result = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : cleanText(av).localeCompare(cleanText(bv), "es", { numeric: true });
    return sort.dir === "asc" ? result : -result;
  });

  const sortMark = (key) => sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "";
  const headerClass = "py-1 pr-3 cursor-pointer select-none hover:text-[#8a5a00]";

  return <Section title="Consulta de saldos">
    <Input placeholder="Filtrar cliente" value={q} onChange={e => setQ(e.target.value)} />
    <div className="overflow-auto mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b-2 border-[#c7a43a]">
            <th className={headerClass} onClick={() => setSortColumn("cliente")}>Cliente{sortMark("cliente")}</th>
            <th className={headerClass} onClick={() => setSortColumn("pedido")}>Pedido{sortMark("pedido")}</th>
            <th className={headerClass} onClick={() => setSortColumn("fecha")}>Fecha{sortMark("fecha")}</th>
            <th className={headerClass} onClick={() => setSortColumn("total")}>Total{sortMark("total")}</th>
            <th className={headerClass} onClick={() => setSortColumn("pagado")}>Pagado{sortMark("pagado")}</th>
            <th className={headerClass} onClick={() => setSortColumn("saldo")}>Saldo{sortMark("saldo")}</th>
            <th className={headerClass} onClick={() => setSortColumn("pagos")}>Pagos{sortMark("pagos")}</th>
          </tr>
        </thead>
        <tbody>
          {list.map(s => <tr key={s.pedido_id} className="border-b-2 border-[#e1d4a6] align-top">
            <td>{cleanText(s.razon_social)} - #{s.nro_cliente}</td>
            <td>#{s.pedido_id}</td>
            <td>{formatDate(s.fecha)}</td>
            <td>{money(s.total)}</td>
            <td>{money(s.pagado)}</td>
            <td className="font-bold">{money(s.saldo)}</td>
            <td>{pagos.filter(p => p.pedido_id === s.pedido_id).map(p => <div key={p.id}>{formatDate(p.fecha)} - {money(p.monto)} - {p.metodo}</div>)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="mt-5 flex justify-end border-t-2 border-[#c7a43a] pt-4 text-xl font-bold text-[#4b1f0e]">
      Saldo total: {money(saldoTotal)}
    </div>
  </Section>;
}
function Table({ rows, cols, onEdit, onDelete, extra }) {
  return <div className="overflow-auto mt-4"><table className="w-full text-sm"><thead><tr className="text-left border-b">{cols.map(c => <th key={c} className="py-2 pr-3 capitalize">{cleanText(c.replaceAll("_", " "))}</th>)}{(onEdit || onDelete || extra) && <th>Acciones</th>}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b hover:bg-[#fff4b8]">{cols.map(c => <td key={c} className="py-2 pr-3">{c.includes("importe") || c === "total" ? money(r[c]) : c === "fecha" ? formatDate(r[c]) : cleanText(r[c] ?? "")}</td>)}{(onEdit || onDelete || extra) && <td className="space-x-3 whitespace-nowrap">{onEdit && <button className="text-blue-700" onClick={() => onEdit(r)}>Editar</button>}{onDelete && <button className="text-red-700" onClick={() => onDelete(r.id)}>Eliminar</button>}{extra && extra(r)}</td>}</tr>)}</tbody></table></div>;
}
