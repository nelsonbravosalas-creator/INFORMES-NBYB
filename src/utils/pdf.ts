import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { HVACReport, ServiceOrderReport } from "../types";
import { calculateSatTemp } from "./refrigerantPt";

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fileSafe(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
}

function formatDateCL(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(value);
  return parsed.toLocaleDateString("es-CL");
}

function nl2br(value?: string): string {
  return escapeHtml(value || "").replace(/\n/g, "<br>");
}

function statusLabel(status?: string): string {
  const labels: Record<string, string> = {
    excellent: "Excelente",
    normal: "Operativo",
    requires_action: "Requiere accion",
    critical: "Critico",
  };
  return labels[status || ""] ?? escapeHtml(status || "Sin estado");
}

function criticalityLabel(value?: string): string {
  const labels: Record<string, string> = {
    altamente_critico: "Altamente critico",
    critico: "Critico",
    no_critico: "No critico",
  };
  return labels[value || ""] ?? escapeHtml(value || "No definida");
}

function serviceTypeLabel(value?: string): string {
  const labels: Record<string, string> = {
    preventivo: "Mantenimiento preventivo",
    correctivo: "Mantenimiento correctivo",
    urgencia: "Atencion de urgencia",
    garantia: "Garantia de servicio",
    puesta_marcha: "Puesta en marcha",
  };
  return labels[value || ""] ?? escapeHtml(value || "Servicio tecnico");
}

function exportStyles(): string {
  return `
    :root {
      --ink: #0b0b0d;
      --muted: #5f6368;
      --line: #dedede;
      --soft: #f5f5f5;
      --orange: #f97316;
      --orange-dark: #c2410c;
      --white: #ffffff;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f1f1f1; color: var(--ink); }
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      line-height: 1.45;
      padding: 24px;
    }
    .export-document {
      width: ${A4_WIDTH_PX}px;
      margin: 0 auto;
      background: var(--white);
      color: var(--ink);
      padding: 30px;
    }
    .pdf-page {
      width: ${A4_WIDTH_PX}px;
      min-height: ${A4_HEIGHT_PX}px;
      margin: 0;
      box-shadow: none;
      overflow: hidden;
    }
    .export-block, .photo-card, .signature-grid, .kv-grid, .section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .hero {
      background: linear-gradient(135deg, #050505 0%, #171717 68%, #2a1204 100%);
      color: var(--white);
      border-radius: 18px;
      padding: 24px;
      border: 1px solid #2d2d2d;
      position: relative;
      overflow: hidden;
    }
    .hero:after {
      content: "";
      position: absolute;
      right: -80px;
      top: -90px;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      background: rgba(249, 115, 22, .22);
    }
    .hero-top { display: flex; justify-content: space-between; gap: 24px; position: relative; z-index: 1; }
    .brand { display: flex; gap: 14px; align-items: center; min-width: 0; }
    .logo-box {
      width: 58px;
      height: 58px;
      border-radius: 14px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      color: var(--orange);
      font-weight: 900;
      font-size: 22px;
      flex: 0 0 auto;
    }
    .logo-box img { width: 100%; height: 100%; object-fit: contain; display: block; padding: 5px; }
    .company { font-size: 24px; line-height: 1.05; font-weight: 900; letter-spacing: .01em; }
    .subtitle { color: #d7d7d7; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 4px; letter-spacing: .08em; }
    .folio-box { text-align: right; min-width: 170px; position: relative; z-index: 1; }
    .folio-label { font-size: 10px; color: #d7d7d7; text-transform: uppercase; letter-spacing: .12em; font-weight: 800; }
    .folio { color: var(--orange); font-size: 24px; line-height: 1.1; font-weight: 950; margin-top: 3px; }
    .date { color: #f5f5f5; font-size: 12px; margin-top: 6px; font-weight: 700; }
    .status-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; position: relative; z-index: 1; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .08em;
      border: 1px solid rgba(255,255,255,.22);
      background: rgba(255,255,255,.08);
      color: #fff;
    }
    .pill.orange { color: #fff; background: var(--orange); border-color: var(--orange); }
    .section { margin-top: 18px; }
    .section-title {
      display: flex;
      align-items: center;
      gap: 9px;
      margin: 0 0 10px 0;
      font-size: 12px;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: .10em;
      color: #111;
    }
    .section-title:before {
      content: "";
      width: 8px;
      height: 18px;
      border-radius: 99px;
      background: var(--orange);
      display: inline-block;
    }
    .kv-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .kv-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .kv {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px 11px;
      min-height: 54px;
      background: #fff;
    }
    .kv-label {
      color: var(--muted);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-weight: 900;
      margin-bottom: 4px;
    }
    .kv-value {
      color: #111;
      font-size: 12px;
      font-weight: 800;
      word-break: break-word;
    }
    .text-box {
      border: 1px solid var(--line);
      border-left: 5px solid var(--orange);
      border-radius: 12px;
      padding: 13px 14px;
      background: #fff;
      color: #202124;
      font-size: 12px;
      min-height: 64px;
      white-space: normal;
    }
    .table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      font-size: 10.5px;
      background: #fff;
    }
    .table th {
      background: #101010;
      color: #fff;
      text-align: left;
      padding: 8px;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .table td { padding: 8px; border-top: 1px solid var(--line); vertical-align: top; }
    .circuit-card, .check-card, .photo-row, .signature-grid {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 13px;
      background: #fff;
      margin-top: 8px;
    }
    .circuit-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 7px;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 900;
    }
    .muted { color: var(--muted); font-weight: 700; }
    .compressor-list { margin: 8px 0 0 18px; padding: 0; font-size: 10.5px; color: #202124; }
    .compressor-list li { margin: 3px 0; }
    .check-head { display: flex; justify-content: space-between; gap: 12px; font-size: 11px; font-weight: 900; }
    .photo-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 0;
      border: 0;
      background: transparent;
    }
    .photo-card {
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
    }
    .photo-card img {
      width: 100%;
      max-height: 255px;
      object-fit: contain;
      display: block;
      background: #080808;
    }
    .photo-caption {
      padding: 8px 10px;
      font-size: 10.5px;
      color: #333;
      border-top: 1px solid var(--line);
      font-weight: 700;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 30px;
      margin-top: 22px;
    }
    .sig-box { text-align: center; min-height: 120px; display: flex; flex-direction: column; justify-content: flex-end; }
    .sig-img { max-height: 72px; max-width: 210px; object-fit: contain; margin: 0 auto 8px; display: block; }
    .sig-placeholder { height: 72px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 10px; }
    .sig-line { border-top: 1px solid #111; padding-top: 7px; font-size: 11px; font-weight: 900; color: #111; }
    .sig-name { font-size: 10px; color: var(--muted); margin-top: 2px; font-weight: 700; }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      color: #777;
      text-align: center;
      font-size: 9px;
      font-weight: 700;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .export-document { width: auto; padding: 12mm; }
      .export-block, .photo-card, .photo-row, .signature-grid { break-inside: avoid; page-break-inside: avoid; }
    }
  `;
}

function htmlShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${exportStyles()}</style>
</head>
<body>${body}</body>
</html>`;
}

function kv(label: string, value: unknown): string {
  return `<div class="kv"><div class="kv-label">${escapeHtml(label)}</div><div class="kv-value">${escapeHtml(value || "N/D")}</div></div>`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function imageRows(images: string[], captionFactory: (index: number) => string): string {
  if (!images.length) return "";
  return chunk(images, 2).map(row => `
    <div class="photo-row export-block">
      ${row.map((src, index) => `
        <div class="photo-card">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(captionFactory(index))}">
          <div class="photo-caption">${escapeHtml(captionFactory(index))}</div>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function buildHero(options: {
  title: string;
  subtitle: string;
  folio: string;
  date: string;
  companyName: string;
  companyLogo?: string;
  pills: string[];
}): string {
  const logo = options.companyLogo
    ? `<img src="${escapeHtml(options.companyLogo)}" alt="Logo">`
    : escapeHtml(options.companyName.slice(0, 2).toUpperCase());

  return `
    <section class="hero export-block">
      <div class="hero-top">
        <div class="brand">
          <div class="logo-box">${logo}</div>
          <div>
            <div class="company">${escapeHtml(options.companyName)}</div>
            <div class="subtitle">${escapeHtml(options.subtitle)}</div>
          </div>
        </div>
        <div class="folio-box">
          <div class="folio-label">${escapeHtml(options.title)}</div>
          <div class="folio">${escapeHtml(options.folio)}</div>
          <div class="date">${escapeHtml(options.date)}</div>
        </div>
      </div>
      <div class="status-row">
        ${options.pills.map((pill, index) => `<span class="pill ${index === 0 ? "orange" : ""}">${escapeHtml(pill)}</span>`).join("")}
      </div>
    </section>
  `;
}

function buildReportHtml(report: HVACReport, companyName: string, companyLogo = ""): string {
  const circuits = report.circuits || [];
  const checklist = report.checklist || [];
  const title = `Informe HVAC ${report.folio}`;

  const circuitHtml = circuits.length ? circuits.map(circuit => {
    const gasType = report.refrigerantType || "R410A";
    const suctionValue = parseFloat(circuit.suctionPressure.replace(/[^\d.-]/g, "")) || 0;
    const dischargeValue = parseFloat(circuit.dischargePressure.replace(/[^\d.-]/g, "")) || 0;
    const suctionUnit = circuit.suctionPressure.toLowerCase().includes("bar") || suctionValue < 35 ? "bar" : "psi";
    const dischargeUnit = circuit.dischargePressure.toLowerCase().includes("bar") || dischargeValue < 70 ? "bar" : "psi";
    const evapTemp = calculateSatTemp(gasType, suctionValue, suctionUnit);
    const condTemp = calculateSatTemp(gasType, dischargeValue, dischargeUnit);

    return `
      <section class="circuit-card export-block">
        <div class="circuit-head">
          <span>${escapeHtml(circuit.name)}</span>
          <span class="muted">${escapeHtml(circuit.refrigerantChargeInput || report.refrigerantType)}</span>
        </div>
        <div class="kv-grid cols-3">
          ${kv("Baja presion", `${suctionValue} ${suctionUnit} / ${evapTemp.toFixed(1)} C`)}
          ${kv("Alta presion", `${dischargeValue} ${dischargeUnit} / ${condTemp.toFixed(1)} C`)}
          ${kv("Estado circuito", circuit.status)}
          ${kv("Sobrecalentamiento", `${circuit.superheat} K`)}
          ${kv("Subenfriamiento", `${circuit.subcooling} K`)}
          ${kv("Compresores", circuit.compressors?.length || 0)}
        </div>
        ${(circuit.compressors || []).length ? `
          <ul class="compressor-list">
            ${circuit.compressors.map(comp => {
              const amperage = comp.phaseType === "trifasico"
                ? `R ${comp.amperageR || comp.amperage}A / S ${comp.amperageS || comp.amperage}A / T ${comp.amperageT || comp.amperage}A`
                : `${comp.amperage}A`;
              return `<li><strong>${escapeHtml(comp.name)}</strong> - ${escapeHtml(amperage)} - ${escapeHtml(comp.voltage)}V - ${escapeHtml(comp.status)}</li>`;
            }).join("")}
          </ul>
        ` : ""}
      </section>
    `;
  }).join("") : `<section class="text-box export-block">No se registraron circuitos refrigerantes.</section>`;

  const checklistHtml = checklist.length ? checklist.map(item => `
    <section class="check-card export-block">
      <div class="check-head">
        <span>${escapeHtml(item.category)} - ${escapeHtml(item.label)}</span>
        <span class="pill orange">${escapeHtml(item.status)}</span>
      </div>
      ${item.notes ? `<div class="text-box" style="margin-top:8px;">${nl2br(item.notes)}</div>` : ""}
    </section>
    ${imageRows(item.images || [], index => `${item.label} - foto ${index + 1}`)}
  `).join("") : `<section class="text-box export-block">No se registraron items de checklist.</section>`;

  const body = `
    <main class="export-document">
      ${buildHero({
        title: "Informe tecnico HVAC",
        subtitle: "Documento estandarizado de inspeccion y mantenimiento",
        folio: report.folio,
        date: formatDateCL(report.date),
        companyName,
        companyLogo,
        pills: [statusLabel(report.overallStatus), criticalityLabel(report.criticality), report.equipmentType || "Equipo HVAC"],
      })}

      <section class="section export-block">
        <h2 class="section-title">1. Identificacion del servicio</h2>
        <div class="kv-grid">
          ${kv("Cliente", report.clientName)}
          ${kv("Sucursal / ubicacion", report.branchLocation)}
          ${kv("Contacto cliente", report.clientContactName || report.clientEmail)}
          ${kv("Tecnico responsable", report.technicianName)}
          ${kv("Direccion", report.clientLocationAddress || "N/D")}
          ${kv("Folio", report.folio)}
        </div>
      </section>

      <section class="section export-block">
        <h2 class="section-title">2. Equipo inspeccionado</h2>
        <div class="kv-grid cols-3">
          ${kv("Marca", report.brand)}
          ${kv("Modelo", report.model)}
          ${kv("Serie", report.serialNumber)}
          ${kv("Tipo", report.equipmentType)}
          ${kv("Refrigerante", report.refrigerantType)}
          ${kv("Capacidad", report.capacity)}
          ${kv("Voltaje", report.voltage)}
          ${kv("Amperaje nominal", report.amperage)}
          ${kv("Criticidad", criticalityLabel(report.criticality))}
        </div>
      </section>

      <section class="section export-block">
        <h2 class="section-title">3. Mediciones operacionales</h2>
        <div class="kv-grid cols-3">
          ${kv("Temperatura ambiente", report.ambientTemp)}
          ${kv("Temperatura retorno", report.returnTemp)}
          ${kv("Temperatura inyeccion", report.supplyTemp)}
          ${kv("Set point", report.setPoint)}
          ${kv("Amperaje turbina", report.fanAmperage ? `${report.fanAmperage} A` : "N/D")}
          ${kv("Estado general", statusLabel(report.overallStatus))}
        </div>
      </section>

      <section class="section">
        <h2 class="section-title export-block">4. Circuitos y compresores</h2>
        ${circuitHtml}
      </section>

      <section class="section">
        <h2 class="section-title export-block">5. Checklist y evidencia fotografica</h2>
        ${checklistHtml}
      </section>

      <section class="section export-block">
        <h2 class="section-title">6. Comentarios y acciones recomendadas</h2>
        <div class="text-box">${nl2br(report.generalComments || "Sin comentarios adicionales.")}</div>
        ${report.electricSchemeNote ? `<div class="text-box" style="margin-top:10px;"><strong>Nota tecnico-unifilar:</strong><br>${nl2br(report.electricSchemeNote)}</div>` : ""}
      </section>

      <section class="signature-grid export-block">
        <div class="sig-box">
          ${report.signatures?.technicianSignature ? `<img src="${escapeHtml(report.signatures.technicianSignature)}" class="sig-img" alt="Firma tecnico">` : `<div class="sig-placeholder">Firma no capturada</div>`}
          <div class="sig-line">Tecnico responsable</div>
          <div class="sig-name">${escapeHtml(report.signatures?.technicianName || report.technicianName)}</div>
        </div>
        <div class="sig-box">
          ${report.signatures?.clientSignature ? `<img src="${escapeHtml(report.signatures.clientSignature)}" class="sig-img" alt="Firma cliente">` : `<div class="sig-placeholder">Firma no capturada</div>`}
          <div class="sig-line">Recepcion cliente</div>
          <div class="sig-name">${escapeHtml(report.signatures?.clientName || report.clientName)}</div>
        </div>
      </section>

      <footer class="footer export-block">Generado por Gestion HVAC Pro - Documento autonomo estandarizado - ${new Date().toLocaleDateString("es-CL")}</footer>
    </main>
  `;

  return htmlShell(title, body);
}

function buildServiceOrderHtml(order: ServiceOrderReport, companyName: string, companyLogo = ""): string {
  const evidence = order.evidence || [];
  const evidenceHtml = evidence.length
    ? chunk(evidence, 2).map(row => `
        <div class="photo-row export-block">
          ${row.map((photo, index) => `
            <div class="photo-card">
              <img src="${escapeHtml(photo.imageBase64)}" alt="Evidencia ${index + 1}">
              <div class="photo-caption">${escapeHtml(photo.description || "Sin descripcion")}</div>
            </div>
          `).join("")}
        </div>
      `).join("")
    : `<section class="text-box export-block">No se adjuntaron fotografias.</section>`;

  const body = `
    <main class="export-document">
      ${buildHero({
        title: "Orden de servicio",
        subtitle: "Documento estandarizado de ejecucion y recepcion",
        folio: order.folio,
        date: formatDateCL(order.date),
        companyName,
        companyLogo,
        pills: [statusLabel(order.diagnosticRating), serviceTypeLabel(order.serviceType), order.orderNumber ? `Ref. ${order.orderNumber}` : "Sin referencia"],
      })}

      <section class="section export-block">
        <h2 class="section-title">1. Identificacion del servicio</h2>
        <div class="kv-grid">
          ${kv("Cliente", order.clientName)}
          ${kv("Sucursal / ubicacion", order.branchLocation)}
          ${kv("Tecnico responsable", order.technicianName)}
          ${kv("Tipo de servicio", serviceTypeLabel(order.serviceType))}
          ${kv("Contacto cliente", `${order.clientContactName || "N/D"}${order.clientContactRole ? ` - ${order.clientContactRole}` : ""}`)}
          ${kv("Direccion", order.clientLocationAddress || "N/D")}
        </div>
      </section>

      <section class="section">
        <h2 class="section-title export-block">2. Registro fotografico / evidencias</h2>
        ${evidenceHtml}
      </section>

      <section class="section export-block">
        <h2 class="section-title">3. Hallazgos y diagnostico</h2>
        <div class="text-box">${nl2br(order.findings || "Sin hallazgos registrados.")}</div>
      </section>

      <section class="section export-block">
        <h2 class="section-title">4. Conclusiones y acciones</h2>
        <div class="text-box">${nl2br(order.conclusions || "Sin conclusiones registradas.")}</div>
      </section>

      <section class="signature-grid export-block">
        <div class="sig-box">
          ${order.signatures?.technicianSignature ? `<img src="${escapeHtml(order.signatures.technicianSignature)}" class="sig-img" alt="Firma tecnico">` : `<div class="sig-placeholder">Firma no capturada</div>`}
          <div class="sig-line">Tecnico responsable</div>
          <div class="sig-name">${escapeHtml(order.signatures?.technicianName || order.technicianName)}</div>
        </div>
        <div class="sig-box">
          ${order.signatures?.clientSignature ? `<img src="${escapeHtml(order.signatures.clientSignature)}" class="sig-img" alt="Firma cliente">` : `<div class="sig-placeholder">Firma no capturada</div>`}
          <div class="sig-line">Recepcion cliente</div>
          <div class="sig-name">${escapeHtml(order.signatures?.clientName || order.clientName)}</div>
        </div>
      </section>

      <footer class="footer export-block">Generado por Gestion HVAC Pro - Documento autonomo estandarizado - ${new Date().toLocaleDateString("es-CL")}</footer>
    </main>
  `;

  return htmlShell(`Orden de Servicio ${order.folio}`, body);
}

function downloadTextFile(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>(resolve => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  }));
  if (document.fonts?.ready) await document.fonts.ready;
}

function createPdfPage(host: HTMLElement): HTMLElement {
  const page = document.createElement("main");
  page.className = "export-document pdf-page";
  host.appendChild(page);
  return page;
}

async function renderHtmlToPdf(html: string, filename: string): Promise<boolean> {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const source = parsed.body.querySelector(".export-document") as HTMLElement | null;
  if (!source) return false;

  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_WIDTH_PX}px;background:#fff;z-index:-1;`;

  const style = document.createElement("style");
  style.textContent = exportStyles();
  host.appendChild(style);
  document.body.appendChild(host);

  try {
    const sourceClone = source.cloneNode(true) as HTMLElement;
    sourceClone.style.position = "absolute";
    sourceClone.style.visibility = "hidden";
    host.appendChild(sourceClone);
    await waitForImages(sourceClone);

    const blocks = Array.from(sourceClone.children) as HTMLElement[];
    sourceClone.remove();

    let page = createPdfPage(host);
    for (const block of blocks) {
      const clone = block.cloneNode(true) as HTMLElement;
      page.appendChild(clone);

      if (page.scrollHeight > A4_HEIGHT_PX && page.children.length > 1) {
        page.removeChild(clone);
        page = createPdfPage(host);
        page.appendChild(clone);
      }
    }

    const pages = Array.from(host.querySelectorAll(".pdf-page")) as HTMLElement[];
    await waitForImages(host);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      if (i > 0) doc.addPage();
      doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
    }

    doc.save(filename);
    return true;
  } catch (err) {
    console.error("PDF generation failed:", err);
    return false;
  } finally {
    host.remove();
  }
}

export function exportReportAsJSON(report: HVACReport) {
  downloadTextFile(JSON.stringify(report, null, 2), "application/json;charset=utf-8", `HVAC_Report_${fileSafe(report.folio)}.json`);
}

export function exportServiceOrderAsJSON(order: ServiceOrderReport) {
  downloadTextFile(JSON.stringify(order, null, 2), "application/json;charset=utf-8", `OT_${fileSafe(order.folio)}.json`);
}

export function exportReportAsHTML(report: HVACReport, companyName: string) {
  const html = buildReportHtml(report, companyName);
  downloadTextFile(html, "text/html;charset=utf-8", `Informe_HVAC_${fileSafe(report.folio)}.html`);
}

export function exportServiceOrderAsHTML(order: ServiceOrderReport, companyName: string) {
  const html = buildServiceOrderHtml(order, companyName);
  downloadTextFile(html, "text/html;charset=utf-8", `OT_${fileSafe(order.folio)}.html`);
}

export function exportReportAsWord(report: HVACReport, companyName: string, companyLogo = "") {
  const html = buildReportHtml(report, companyName, companyLogo);
  downloadTextFile(`\ufeff${html}`, "application/msword;charset=utf-8", `Informe_HVAC_${fileSafe(report.folio)}.doc`);
}

export function exportServiceOrderAsWord(order: ServiceOrderReport, companyName: string, companyLogo = "") {
  const html = buildServiceOrderHtml(order, companyName, companyLogo);
  downloadTextFile(`\ufeff${html}`, "application/msword;charset=utf-8", `OT_${fileSafe(order.folio)}.doc`);
}

export async function generatePDFReport(report: HVACReport, companyName: string, companyLogo: string): Promise<boolean> {
  return renderHtmlToPdf(
    buildReportHtml(report, companyName, companyLogo),
    `Informe_HVAC_${fileSafe(report.folio)}.pdf`
  );
}

export async function generateServiceOrderPDF(order: ServiceOrderReport, companyName: string, companyLogo = ""): Promise<boolean> {
  return renderHtmlToPdf(
    buildServiceOrderHtml(order, companyName, companyLogo),
    `OT_${fileSafe(order.folio)}.pdf`
  );
}
