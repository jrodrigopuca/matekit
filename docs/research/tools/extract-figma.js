// Solo lectura. Antes de ejecutar, define PAGE_ID, IDS (array de ids de nodo) y MAX_DEPTH.
// Ejemplo: const PAGE_ID = "55141:14257"; const IDS = ["54446:25290"]; const MAX_DEPTH = 5;

const vcache = {};
async function vn(id) { if (!(id in vcache)) { const v = await figma.variables.getVariableByIdAsync(id); vcache[id] = v ? v.name.replace(/^Schemes\//,"").replace(/^State Layers\//,"SL/") : id; } return vcache[id]; }
const scache = {};
async function sn(id) { if (!id || typeof id !== "string") return null; if (!(id in scache)) { const s = await figma.getStyleByIdAsync(id); scache[id] = s ? s.name : id; } return scache[id]; }
const r1 = x => Math.round(x*10)/10;
async function paints(arr) {
  if (!Array.isArray(arr)) return [];
  const o = [];
  for (const p of arr) {
    if (p.visible === false) continue;
    let s = p.boundVariables && p.boundVariables.color ? await vn(p.boundVariables.color.id) : (p.type === "SOLID" ? "#" + [p.color.r,p.color.g,p.color.b].map(c => Math.round(c*255).toString(16).padStart(2,"0")).join("") : p.type);
    if (p.opacity !== undefined && p.opacity < 1) s += "@" + r1(p.opacity*100) + "%";
    o.push(s);
  }
  return o;
}
async function line(n, depth) {
  const parts = ["  ".repeat(depth) + n.name + " [" + n.type[0] + n.type.slice(1,4).toLowerCase() + "] " + r1(n.width) + "x" + r1(n.height)];
  const bv = n.boundVariables || {};
  const b = async k => bv[k] ? "{" + await vn(bv[k].id) + "}" : "";
  if (n.layoutMode && n.layoutMode !== "NONE") {
    parts.push("al=" + n.layoutMode[0] + " pad=" + [n.paddingTop,n.paddingRight,n.paddingBottom,n.paddingLeft].join(",") + " gap=" + n.itemSpacing + await b("itemSpacing") + " align=" + n.primaryAxisAlignItems + "/" + n.counterAxisAlignItems);
  }
  if ("layoutSizingHorizontal" in n && n.parent && n.parent.layoutMode && n.parent.layoutMode !== "NONE") parts.push("size=" + n.layoutSizingHorizontal[0] + n.layoutSizingVertical[0]);
  if ("cornerRadius" in n) {
    const cr = n.cornerRadius;
    if (cr === figma.mixed) parts.push("r=" + [n.topLeftRadius,n.topRightRadius,n.bottomRightRadius,n.bottomLeftRadius].join(",") + await b("topLeftRadius"));
    else if (cr) parts.push("r=" + cr + await b("topLeftRadius"));
  }
  const f = await paints(n.fills); if (f.length) parts.push("fill=" + f.join("+"));
  const s = await paints(n.strokes); if (s.length) parts.push("stroke=" + s.join("+") + " w=" + (n.strokeWeight === figma.mixed ? [n.strokeTopWeight,n.strokeRightWeight,n.strokeBottomWeight,n.strokeLeftWeight].join(",") : n.strokeWeight) + " " + n.strokeAlign);
  if (n.opacity !== undefined && n.opacity < 1) parts.push("op=" + r1(n.opacity*100) + "%");
  if ("effectStyleId" in n && n.effectStyleId) parts.push("fx=" + await sn(n.effectStyleId));
  else if (n.effects && n.effects.filter(e => e.visible !== false).length) parts.push("fx=" + n.effects.filter(e => e.visible !== false).map(e => e.type + (e.radius!==undefined?"/"+e.radius:"")).join(","));
  if (n.type === "TEXT") {
    const ts = await sn(n.textStyleId);
    parts.push("text=" + (ts || ((n.fontSize === figma.mixed ? "mixed" : n.fontSize) + "/" + (n.fontName === figma.mixed ? "mixed" : n.fontName.style))) + ' "' + n.characters.slice(0,30) + '"');
  }
  if (n.type === "INSTANCE") { try { const mc = await n.getMainComponentAsync(); if (mc) parts.push("is=" + (mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent.name + "/" : "") + mc.name); } catch (e) {} }
  return parts.join(" ");
}
async function walk(n, depth, maxDepth, out) {
  if (n.visible === false) return;
  out.push(await line(n, depth));
  if (depth >= maxDepth || !("children" in n)) return;
  if (n.type === "INSTANCE" && depth > 0 && /icon|Icon/.test(n.name) && n.width <= 32) return;
  for (const c of n.children) await walk(c, depth + 1, maxDepth, out);
}
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const res = {};
for (const id of IDS) {
  const n = await figma.getNodeByIdAsync(id);
  if (!n) { res[id] = "missing"; continue; }
  const out = [];
  await walk(n, 0, MAX_DEPTH, out);
  res[id] = out.join("\n");
}
const str = JSON.stringify(res);
return str.length < 60000 ? res : { tooBig: str.length, keys: Object.keys(res).map(k => k + ":" + res[k].length) };
