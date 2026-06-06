import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { HVACReport, ServiceOrderReport } from "../types";
import { calculateSatTemp } from "./refrigerantPt";

/**
 * Downloads a raw JSON file of the HVAC report for backup or local import
 */
export function exportReportAsJSON(report: HVACReport) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `HVAC_Report_${report.folio}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Downloads report as formatted raw HTML offline file
 */
export function exportReportAsHTML(report: HVACReport, companyName: string) {
  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe de Servicio HVAC - Folio ${report.folio}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #f8fafc; padding: 24px; line-height: 1.5; }
    .report-card { max-width: 850px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .header { display: flex; justify-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: bold; color: #4338ca; margin: 0; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; background: #f1f5f9; padding: 16px; border-radius: 8px; }
    .meta-item { font-size: 13px; }
    .meta-label { font-weight: bold; color: #475569; }
    .section-title { font-size: 16px; font-weight: bold; color: #1e1b4b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 28px 0 12px 0; }
    .spec-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .spec-card { background: #fafafa; border: 1px solid #f1f5f9; padding: 10px; border-radius: 6px; font-size: 12px; }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .status-excellent { background: #d1fae5; color: #065f46; }
    .status-normal { background: #e0f2fe; color: #0369a1; }
    .status-requires_action { background: #fef3c7; color: #92400e; }
    .status-critical { background: #fee2e2; color: #991b1b; }
    .checklist-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    .checklist-table th, .checklist-table td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    .checklist-table th { background: #f8fafc; font-weight: bold; }
    .pics-container { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .evidence-img { width: 240px; height: 240px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; }
    .circuit-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 12px; }
    .sig-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 40px; }
    .sig-box { border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-size: 13px; font-weight: bold; color: #475569; }
    .sig-img { max-height: 80px; max-width: 180px; display: block; margin: 0 auto; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="header">
      <div>
        <div class="title">${companyName}</div>
        <div style="font-size: 12px; color: #64748b;">Informe de Servicio Técnico HVAC Automatizado</div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: bold; color: #6366f1;">FOLIO: ${report.folio}</div>
        <div style="font-size: 12px; color: #64748b;">Fecha: ${report.date}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Cliente:</span> ${report.clientName}</div>
      <div class="meta-item"><span class="meta-label">Sucursal:</span> ${report.branchLocation}</div>
      <div class="meta-item"><span class="meta-label">Correo Electrónico:</span> ${report.clientEmail}</div>
      <div class="meta-item"><span class="meta-label">Técnico Asignado:</span> ${report.technicianName}</div>
    </div>

    <div class="section-title">Especificaciones del Equipo</div>
    <div class="spec-grid">
      <div class="spec-card"><strong>Marca:</strong> ${report.brand}</div>
      <div class="spec-card"><strong>Modelo:</strong> ${report.model}</div>
      <div class="spec-card"><strong>Nº de Serie:</strong> ${report.serialNumber}</div>
      <div class="spec-card"><strong>Refrigerante:</strong> ${report.refrigerantType}</div>
      <div class="spec-card"><strong>Capacidad:</strong> ${report.capacity}</div>
      <div class="spec-card"><strong>Alimentación Eléctrica:</strong> ${report.voltage}</div>
      <div class="spec-card"><strong>Amperaje Nominal:</strong> ${report.amperage}</div>
      <div class="spec-card"><strong>Tipo de Unidad:</strong> ${report.equipmentType}</div>
      <div class="spec-card">
        <strong>Criticidad:</strong>
        <span style="font-weight: bold; color: ${
          report.criticality === "altamente_critico" 
            ? "#dc2626" 
            : report.criticality === "critico" 
              ? "#d97706" 
              : "#059669"
        };">${
          report.criticality === "altamente_critico" 
            ? "🔴 Altamente Crítico" 
            : report.criticality === "critico" 
              ? "🟡 Crítico" 
              : "🟢 No Crítico"
        }</span>
      </div>
      <div class="spec-card">
        <strong>Estado de Operación:</strong> 
        <span class="status-badge status-${report.overallStatus}">${report.overallStatus}</span>
      </div>
    </div>

    <div class="section-title">Mediciones Mecánicas y Eléctricas</div>
    <div class="spec-grid">
      <div class="spec-card"><strong>Temp. Ambiente:</strong> ${report.ambientTemp}</div>
      <div class="spec-card"><strong>Temp. Retorno:</strong> ${report.returnTemp}</div>
      <div class="spec-card"><strong>Temp. Inyección:</strong> ${report.supplyTemp}</div>
      <div class="spec-card"><strong>Set Point:</strong> ${report.setPoint || "N/D"}</div>
      <div class="spec-card"><strong>Amperaje Turbina (Fan):</strong> ${report.fanAmperage} A</div>
    </div>

    <div class="section-title">Circuitos Refrigerantes y Compresores</div>
    ${(report.circuits || []).map(crt => {
      const gasType = report.refrigerantType || "R410A";
      const LP_Raw = crt.suctionPressure.replace(/[^\d.-]/g, "");
      const LP_Val = parseFloat(LP_Raw) || 0;
      const LP_IsBar = crt.suctionPressure.toLowerCase().includes("bar") || LP_Val < 35;
      const LP_Unit = LP_IsBar ? "bar" : "psi";
      const evapTemp = calculateSatTemp(gasType, LP_Val, LP_Unit);

      const HP_Raw = crt.dischargePressure.replace(/[^\d.-]/g, "");
      const HP_Val = parseFloat(HP_Raw) || 0;
      const HP_IsBar = crt.dischargePressure.toLowerCase().includes("bar") || HP_Val < 70;
      const HP_Unit = HP_IsBar ? "bar" : "psi";
      const condTemp = calculateSatTemp(gasType, HP_Val, HP_Unit);

      return `
        <div class="circuit-card">
          <div style="font-weight: bold; display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 8px;">
            <span>${crt.name} (Gas: ${crt.refrigerantChargeInput})</span>
            <span style="color: #4338ca;">LP: ${LP_Val} ${LP_Unit} (${evapTemp.toFixed(1).replace(".", ",")} °C) / HP: ${HP_Val} ${HP_Unit} (${condTemp.toFixed(1).replace(".", ",")} °C)</span>
          </div>
          <div style="display: flex; gap: 20px; color: #64748b; margin-bottom: 8px;">
            <span>Sobrecalentamiento: ${crt.superheat} °K</span>
            <span>Subenfriamiento: ${crt.subcooling} °K</span>
          </div>
          <strong>Compresores:</strong>
          <ul style="margin: 4px 0 0 0; padding-left: 20px;">
            ${crt.compressors.map(co => {
              const isTrifasico = co.phaseType === "trifasico";
              const ampStr = isTrifasico 
                ? `R: ${co.amperageR || co.amperage}A, S: ${co.amperageS || co.amperage}A, T: ${co.amperageT || co.amperage}A (Trifásico)`
                : `${co.amperage}A (Monofásico)`;
              return `
                <li>${co.name} - Amperaje: ${ampStr}, Voltaje: ${co.voltage}V [Estado: <strong>${co.status}</strong>]</li>
              `;
            }).join("")}
          </ul>
        </div>
      `;
    }).join("")}

    <div class="section-title" style="page-break-before: always;">Gráficos de Manómetro Digital (testo Smart Probes)</div>
    <div style="display: flex; flex-direction: column; gap: 20px; margin-bottom: 24px;">
      ${(report.circuits || []).map(crt => {
        const gasType = report.refrigerantType || "R410A";
        const LP_Raw = crt.suctionPressure.replace(/[^\d.-]/g, "");
        const LP_Val = parseFloat(LP_Raw) || 0;
        const LP_IsBar = crt.suctionPressure.toLowerCase().includes("bar") || LP_Val < 35;
        const LP_Unit = LP_IsBar ? "bar" : "psi";
        const evapTemp = calculateSatTemp(gasType, LP_Val, LP_IsBar ? "bar" : "psi");

        const HP_Raw = crt.dischargePressure.replace(/[^\d.-]/g, "");
        const HP_Val = parseFloat(HP_Raw) || 0;
        const HP_IsBar = crt.dischargePressure.toLowerCase().includes("bar") || HP_Val < 70;
        const HP_Unit = HP_IsBar ? "bar" : "psi";
        const condTemp = calculateSatTemp(gasType, HP_Val, HP_IsBar ? "bar" : "psi");

        // LP gauge math
        const LP_Min = LP_IsBar ? -1 : -10;
        const LP_Max = LP_IsBar ? 25 : 120;
        const LP_Percent = Math.min(100, Math.max(0, ((LP_Val - LP_Min) / (LP_Max - LP_Min)) * 100));
        const LP_Offset = 160 - (160 * (LP_Percent / 100));

        // HP gauge math
        const HP_Min = HP_IsBar ? -1 : -10;
        const HP_Max = HP_IsBar ? 60 : 400;
        const HP_Percent = Math.min(100, Math.max(0, ((HP_Val - HP_Min) / (HP_Max - HP_Min)) * 100));
        const HP_Offset = 160 - (160 * (HP_Percent / 100));

        const fmtDec = (v: number, d = 1) => v.toFixed(d).replace(".", ",");

        return `
          <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; background: #ffffff; page-break-inside: avoid; box-sizing: border-box;">
            <div style="font-weight: bold; font-size: 13px; color: #1e1b4b; border-bottom: 2px solid #5356f1; padding-bottom: 6px; margin-bottom: 16px; display: flex; justify-content: space-between;">
              <span>Circuito: ${crt.name}</span>
              <span style="color: #64748b; font-size: 11px;">Refrigerante: ${crt.refrigerantChargeInput || report.refrigerantType}</span>
            </div>
            <div style="display: flex; gap: 24px; justify-content: center; align-items: center; flex-wrap: wrap;">
              <!-- Low Pressure -->
              <div style="flex: 1; min-width: 250px; max-width: 320px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02); box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 8px; font-weight: bold; font-size: 10px; color: #5e7185;">
                  <span>testo 549i (Baja Presión)</span>
                  <span>• 070</span>
                </div>
                <div style="position: relative; width: 140px; height: 120px; margin: 0 auto;">
                  <svg width="140" height="120" viewBox="0 0 100 100" style="display: block; margin: 0 auto;">
                    <path d="M 25 78 A 30 30 0 1 1 75 78" stroke="rgba(194, 215, 229, 0.4)" stroke-width="5" fill="none" stroke-linecap="round" />
                    <path d="M 25 78 A 30 30 0 1 1 75 78" stroke="#0c6496" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="160" stroke-dashoffset="${LP_Offset}" />
                    <text x="25" y="88" font-size="7.5" fill="#516478" text-anchor="middle" font-family="sans-serif">${LP_Min}</text>
                    <text x="75" y="88" font-size="7.5" fill="#516478" text-anchor="middle" font-family="sans-serif">${LP_Max}</text>
                  </svg>
                  <div style="position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: -5px;">
                    <span style="font-size: 18px; font-weight: bold; color: #102435; font-family: sans-serif;">${fmtDec(LP_Val, LP_IsBar ? 2 : 1)}</span>
                    <span style="font-size: 9px; color: #5e7185; font-weight: bold; font-family: sans-serif; margin-top: 2px;">${LP_Unit}</span>
                  </div>
                </div>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 0px;">
                  <div style="font-size: 10px; color: #5e7185; font-family: sans-serif;">Temp. Evaporación</div>
                  <div style="font-size: 18px; font-weight: bold; color: #0c6496; font-family: sans-serif; margin-top: 2px;">${fmtDec(evapTemp, 1)} <span style="font-size: 12px;">°C</span></div>
                </div>
              </div>

              <!-- High Pressure -->
              <div style="flex: 1; min-width: 250px; max-width: 320px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02); box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 8px; font-weight: bold; font-size: 10px; color: #5e7185;">
                  <span>testo 549i (Alta Presión)</span>
                  <span>• 008</span>
                </div>
                <div style="position: relative; width: 140px; height: 120px; margin: 0 auto;">
                  <svg width="140" height="120" viewBox="0 0 100 100" style="display: block; margin: 0 auto;">
                    <path d="M 25 78 A 30 30 0 1 1 75 78" stroke="rgba(251, 226, 228, 0.45)" stroke-width="5" fill="none" stroke-linecap="round" />
                    <path d="M 25 78 A 30 30 0 1 1 75 78" stroke="#e3373b" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="160" stroke-dashoffset="${HP_Offset}" />
                    <text x="25" y="88" font-size="7.5" fill="#516478" text-anchor="middle" font-family="sans-serif">${HP_Min}</text>
                    <text x="75" y="88" font-size="7.5" fill="#516478" text-anchor="middle" font-family="sans-serif">${HP_Max}</text>
                  </svg>
                  <div style="position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: -5px;">
                    <span style="font-size: 18px; font-weight: bold; color: #102435; font-family: sans-serif;">${fmtDec(HP_Val, HP_IsBar ? 2 : 1)}</span>
                    <span style="font-size: 9px; color: #5e7185; font-weight: bold; font-family: sans-serif; margin-top: 2px;">${HP_Unit}</span>
                  </div>
                </div>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 0px;">
                  <div style="font-size: 10px; color: #5e7185; font-family: sans-serif;">Temp. Condensación</div>
                  <div style="font-size: 18px; font-weight: bold; color: #102435; font-family: sans-serif; margin-top: 2px;">${fmtDec(condTemp, 1)} <span style="font-size: 12px;">°C</span></div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <div class="section-title">Chequeo Técnico de Mantenimiento</div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th>Punto de Control</th>
          <th>Estado</th>
          <th>Observaciones</th>
        </tr>
      </thead>
      <tbody>
        ${(report.checklist || []).filter(chk => chk.status !== "na").map(chk => `
          <tr>
            <td><strong>${chk.label}</strong><br><span style="color:#64748b; font-size:10px;">${chk.category}</span></td>
            <td><strong style="color: ${chk.status === "cumple" ? "#10b981" : chk.status === "no_cumple" ? "#f43f5e" : "#64748b"}">${chk.status.toUpperCase()}</strong></td>
            <td>
              ${chk.notes || "Sin observaciones"}
              ${chk.images && chk.images.length > 0 ? `
                <div class="pics-container">
                  ${chk.images.map(img => `<img class="evidence-img" src="${img}" />`).join("")}
                </div>
              ` : ""}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="section-title">Comentarios Generales y Diagnóstico</div>
    <div style="font-size: 13px; background: #fafafa; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; white-space: pre-wrap;">${report.generalComments || "Sin comentarios adicionales registrados."}</div>

    <div class="sig-grid">
      <div class="sig-box">
        ${report.signatures?.technicianSignature ? `<img class="sig-img" src="${report.signatures.technicianSignature}" />` : `<div style="height: 80px; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 11px;">Firma no registrada</div>`}
        Técnico de Servicio<br>
        <span style="font-size: 11px; font-weight: normal; color: #94a3b8;">${report.signatures?.technicianName || report.technicianName}</span>
      </div>
      <div class="sig-box">
        ${report.signatures?.clientSignature ? `<img class="sig-img" src="${report.signatures.clientSignature}" />` : `<div style="height: 80px; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 11px;">Firma no registrada</div>`}
        Representante del Cliente<br>
        <span style="font-size: 11px; font-weight: normal; color: #94a3b8;">${report.signatures?.clientName || report.clientName}</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", URL.createObjectURL(blob));
  downloadAnchor.setAttribute("download", `HVAC_Report_${report.folio}.html`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Creates high-fidelity beautiful PDF file from a compiled DOM tree
 * using custom scaling algorithm for high-DPI retina display
 */
export async function generatePDFReport(report: HVACReport, companyName: string, companyLogo: string): Promise<boolean> {
  // Let's create an offscreen modal structure with gorgeous layout so html2canvas renders it absolutely perfectly in 1:1 format
  const pdfContainer = document.createElement("div");
  pdfContainer.id = `temp-pdf-render-root`;
  pdfContainer.style.position = "absolute";
  pdfContainer.style.left = "-9999px";
  pdfContainer.style.top = "0";
  pdfContainer.style.width = "820px";
  pdfContainer.style.minHeight = "1120px";
  pdfContainer.style.background = "#ffffff";
  pdfContainer.style.color = "#121824";
  pdfContainer.style.padding = "0px";
  pdfContainer.style.fontFamily = "Helvetica, Arial, sans-serif";

  // Formatted HTML template to render inside off-screen container
  pdfContainer.innerHTML = `
    <!-- PAGE 1 WRAPPER -->
    <div style="box-sizing: border-box; width: 820px; min-height: 1160px; padding: 40px; background: #ffffff; display: flex; flex-direction: column; justify-content: flex-start;">
      <!-- HEADER -->
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        ${companyLogo ? `<img src="${companyLogo}" style="height: 48px; max-width: 140px; object-fit: contain;" />` : `<div style="background: #4f46e5; color: white; border-radius: 8px; width: 44px; height: 44px; font-weight: bold; font-size: 20px; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">H</div>`}
        <div>
          <h1 style="font-size: 18px; margin: 0; font-weight: bold; color: #1e1b4b;">${companyName}</h1>
          <p style="font-size: 10px; margin: 2px 0 0 0; color: #64748b;">REPORTE TÉCNICO PROFESIONAL HVAC</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 15px; font-weight: bold; color: #4f46e5; display: block;">FOLIO: ${report.folio}</span>
        <span style="font-size: 11px; color: #475569; font-weight: bold;">FECHA: ${report.date}</span>
      </div>
    </div>

    <!-- CLIENT AND LOCATION Spec -->
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 11.5px;">
      <div><span style="color: #64748b; font-weight: bold;">Cliente:</span> <span style="font-weight: 500;">${report.clientName}</span></div>
      <div><span style="color: #64748b; font-weight: bold;">Sucursal / Área:</span> <span style="font-weight: 500;">${report.branchLocation}</span></div>
      <div><span style="color: #64748b; font-weight: bold;">Correo de Envío:</span> <span style="font-weight: 500;">${report.clientEmail}</span></div>
      <div><span style="color: #64748b; font-weight: bold;">Técnico Operador:</span> <span style="font-weight: 500;">${report.technicianName}</span></div>
    </div>

    <!-- TECHNICAL DATASHEETS -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 12px; font-weight: bold; color: #3730a3; margin: 0 0 10px 0; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">1. Ficha Técnica de la Unidad</h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 10.5px;">
        <div style="background: #fafafa; border: 1px solid #f1f5f9; padding: 8px; border-radius: 6px;">
          <span style="display: block; color: #64748b; font-size: 9px; font-weight: bold;">TIPO EQUIPO</span>
          <strong>${report.equipmentType}</strong>
        </div>
        <div style="background: #fafafa; border: 1px solid #f1f5f9; padding: 8px; border-radius: 6px;">
          <span style="display: block; color: #64748b; font-size: 9px; font-weight: bold;">MARCA EQUIPO</span>
          <strong>${report.brand}</strong>
        </div>
        <div style="background: #fafafa; border: 1px solid #f1f5f9; padding: 8px; border-radius: 6px;">
          <span style="display: block; color: #64748b; font-size: 9px; font-weight: bold;">MODELO</span>
          <strong>${report.model}</strong>
        </div>
        <div style="background: #fafafa; border: 1px solid #f1f5f9; padding: 8px; border-radius: 6px;">
          <span style="display: block; color: #64748b; font-size: 9px; font-weight: bold;">Nº SERIE</span>
          <strong style="word-break: break-all;">${report.serialNumber}</strong>
        </div>
        <div style="background: #fafafa; border: 1px solid #f1f5f9; padding: 8px; border-radius: 6px;">
          <span style="display: block; color: #64748b; font-size: 9px; font-weight: bold;">REFRIGERANTE</span>
          <strong>${report.refrigerantType}</strong>
        </div>
        <div style="background: #fafafa; border: 1px solid #f1f5f9; padding: 8px; border-radius: 6px;">
          <span style="display: block; color: #64748b; font-size: 9px; font-weight: bold;">CAPACIDAD</span>
          <strong>${report.capacity}</strong>
        </div>
        <div style="background: #fafafa; border: 1px solid #f1f5f9; padding: 8px; border-radius: 6px;">
          <span style="display: block; color: #64748b; font-size: 9px; font-weight: bold;">VOLTAJE PLANTA</span>
          <strong>${report.voltage}</strong>
        </div>
        <div style="background: #fafafa; border: 1px solid #f1f5f9; padding: 8px; border-radius: 6px;">
          <span style="display: block; color: #64748b; font-size: 9px; font-weight: bold;">AMPERAJE NOM.</span>
          <strong>${report.amperage} A</strong>
        </div>
        <div style="background: #fafafa; border: 1px solid #f1f5f9; padding: 8px; border-radius: 6px; ${
          report.criticality === "altamente_critico" 
            ? "background: #fef2f2; border-color: #fca5a5;" 
            : report.criticality === "critico" 
              ? "background: #fffbeb; border-color: #fde68a;" 
              : ""
        }">
          <span style="display: block; color: #64748b; font-size: 9px; font-weight: bold;">CRITICIDAD</span>
          <strong style="color: ${
            report.criticality === "altamente_critico" 
              ? "#dc2626" 
              : report.criticality === "critico" 
                ? "#d97706" 
                : "#059669"
          };">${
            report.criticality === "altamente_critico" 
              ? "🔴 Altamente Crítico" 
              : report.criticality === "critico" 
                ? "🟡 Crítico" 
                : "🟢 No Crítico"
          }</strong>
        </div>
      </div>
    </div>

    <!-- MEASUREMENTS AND OPERATION STATUS -->
    <div style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
      <div>
        <h3 style="font-size: 11px; font-weight: bold; color: #3730a3; margin: 0 0 8px 0; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase;">2. Mediciones Operacionales</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 10.5px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px;">Temp. Ambiente: <strong>${report.ambientTemp}</strong></div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px;">Temp. Retorno: <strong>${report.returnTemp}</strong></div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px;">Temp. Inyección: <strong>${report.supplyTemp}</strong></div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px;">Set Point: <strong>${report.setPoint || "N/D"}</strong></div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px;">Amp Fan Turbina: <strong>${report.fanAmperage} A</strong></div>
        </div>
      </div>
      <div>
        <h3 style="font-size: 11px; font-weight: bold; color: #3730a3; margin: 0 0 8px 0; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase;">3. Diagnóstico del Sistema</h3>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; height: 50px;">
          <span style="font-size: 11px; font-weight: bold; color: #475569;">Calidad de Operación General:</span>
          <span style="font-size: 11px; font-weight: bold; background: ${report.overallStatus === "excellent" ? "#d1fae5" : report.overallStatus === "normal" ? "#e0f2fe" : report.overallStatus === "requires_action" ? "#fef3c7" : "#fee2e2"}; color: ${report.overallStatus === "excellent" ? "#065f46" : report.overallStatus === "normal" ? "#0369a1" : report.overallStatus === "requires_action" ? "#92400e" : "#991b1b"}; padding: 4px 10px; border-radius: 12px; text-transform: uppercase;">
            ${report.overallStatus === "excellent" ? "Excelente" : report.overallStatus === "normal" ? "Operativo" : report.overallStatus === "requires_action" ? "Alerta" : "Falla Crítica"}
          </span>
        </div>
      </div>
    </div>

    <!-- CIRCUITS BLOCK -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 12px; font-weight: bold; color: #3730a3; margin: 0 0 10px 0; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">4. Registro e Inspección de Circuitos</h3>
      ${(report.circuits || []).length === 0 ? `<p style="font-size: 10px; color:#94a3b8; font-style:italic;">No se registraron circuitos mecánicos en este informe.</p>` : `
        <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
          ${report.circuits.map(crt => {
            const gasType = report.refrigerantType || "R410A";
            const LP_Raw = crt.suctionPressure.replace(/[^\d.-]/g, "");
            const LP_Val = parseFloat(LP_Raw) || 0;
            const LP_IsBar = crt.suctionPressure.toLowerCase().includes("bar") || LP_Val < 35;
            const LP_Unit = LP_IsBar ? "bar" : "psi";
            const evapTemp = calculateSatTemp(gasType, LP_Val, LP_Unit);

            const HP_Raw = crt.dischargePressure.replace(/[^\d.-]/g, "");
            const HP_Val = parseFloat(HP_Raw) || 0;
            const HP_IsBar = crt.dischargePressure.toLowerCase().includes("bar") || HP_Val < 70;
            const HP_Unit = HP_IsBar ? "bar" : "psi";
            const condTemp = calculateSatTemp(gasType, HP_Val, HP_Unit);

            return `
              <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; font-size: 10px; background: #ffffff;">
                <div style="font-weight: bold; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; color: #1e1b4b;">
                  <span>${crt.name} [Gas: ${crt.refrigerantChargeInput}]</span>
                  <span style="text-transform: uppercase; font-size: 8px; color: ${crt.status === "active" ? "#10b981" : "#f59e0b"};">${crt.status}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-bottom: 6px;">
                  <div>Presión Baja: <strong>${LP_Val} ${LP_Unit}</strong></div>
                  <div>Presión Alta: <strong>${HP_Val} ${HP_Unit}</strong></div>
                  <div>T. Evaporación: <strong>${evapTemp.toFixed(1).replace(".", ",")} °C</strong></div>
                  <div>T. Condensación: <strong>${condTemp.toFixed(1).replace(".", ",")} °C</strong></div>
                  <div>Sobrecalentar (SH): <strong>${crt.superheat} °K</strong></div>
                  <div>Subenfriar (SC): <strong>${crt.subcooling} °K</strong></div>
                </div>
                <strong style="color: #475569; display: block; font-size: 8.5px; border-bottom: 1px dashed #f1f5f9; padding-bottom: 2px; margin-bottom: 4px;">Medición de Compresores:</strong>
                ${crt.compressors.map(co => {
                  const isTrifasico = co.phaseType === "trifasico";
                  const ampStr = isTrifasico 
                    ? `R:${co.amperageR || co.amperage} S:${co.amperageS || co.amperage} T:${co.amperageT || co.amperage}`
                    : `${co.amperage}A`;
                  return `
                    <div style="display: flex; justify-content: space-between; font-size: 8.2px; color: #475569; margin-bottom: 2px;">
                      <span>• ${co.name} (${co.status === "active" ? "Marcha" : "Parada"})</span>
                      <span>Amp: <strong>${ampStr}</strong> / Vol: <strong>${co.voltage}V</strong></span>
                    </div>
                  `;
                }).join("")}
              </div>
            `;
          }).join("")}
        </div>
      `}
    </div>
    </div> <!-- END PAGE 1 WRAPPER -->

    <!-- PAGE 2 WRAPPER -->
    <div style="box-sizing: border-box; width: 820px; min-height: 1160px; padding: 40px; background: #ffffff; display: flex; flex-direction: column; justify-content: flex-start; page-break-before: always;">
      <!-- GAUGE CHARTS (PAGE 2) -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 12px; font-weight: bold; color: #3730a3; margin: 0 0 10px 0; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">5. Gráficos de Manómetro Digital (testo Smart Probes)</h3>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${(report.circuits || []).map(crt => {
          const gasType = report.refrigerantType || "R410A";
          const LP_Raw = crt.suctionPressure.replace(/[^\d.-]/g, "");
          const LP_Val = parseFloat(LP_Raw) || 0;
          const LP_IsBar = crt.suctionPressure.toLowerCase().includes("bar") || LP_Val < 35;
          const LP_Unit = LP_IsBar ? "bar" : "psi";
          const evapTemp = calculateSatTemp(gasType, LP_Val, LP_IsBar ? "bar" : "psi");

          const HP_Raw = crt.dischargePressure.replace(/[^\d.-]/g, "");
          const HP_Val = parseFloat(HP_Raw) || 0;
          const HP_IsBar = crt.dischargePressure.toLowerCase().includes("bar") || HP_Val < 70;
          const HP_Unit = HP_IsBar ? "bar" : "psi";
          const condTemp = calculateSatTemp(gasType, HP_Val, HP_IsBar ? "bar" : "psi");

          // LP gauge math
          const LP_Min = LP_IsBar ? -1 : -10;
          const LP_Max = LP_IsBar ? 25 : 120;
          const LP_Percent = Math.min(100, Math.max(0, ((LP_Val - LP_Min) / (LP_Max - LP_Min)) * 100));
          const LP_Offset = 160 - (160 * (LP_Percent / 100));

          // HP gauge math
          const HP_Min = HP_IsBar ? -1 : -10;
          const HP_Max = HP_IsBar ? 60 : 400;
          const HP_Percent = Math.min(100, Math.max(0, ((HP_Val - HP_Min) / (HP_Max - HP_Min)) * 100));
          const HP_Offset = 160 - (160 * (HP_Percent / 100));

          const fmtDec = (v: number, d = 1) => v.toFixed(d).replace(".", ",");

          return `
            <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; background: #ffffff; page-break-inside: avoid; box-sizing: border-box;">
              <div style="font-weight: bold; font-size: 11px; color: #1e1b4b; border-bottom: 2.5px solid #4f46e5; padding-bottom: 4px; margin-bottom: 12px; display: flex; justify-content: space-between;">
                <span>Circuito: ${crt.name}</span>
                <span style="color: #64748b; font-size: 9.5px;">Refrigerante: ${crt.refrigerantChargeInput || report.refrigerantType}</span>
              </div>
              <div style="display: flex; gap: 20px; justify-content: center; align-items: center;">
                <!-- Low Pressure -->
                <div style="flex: 1; min-width: 320px; max-width: 350px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02); box-sizing: border-box;">
                  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 8px; font-weight: bold; font-size: 9.5px; color: #5e7185;">
                    <span>testo 549i (Baja Presión)</span>
                    <span>• 070</span>
                  </div>
                  <div style="position: relative; width: 140px; height: 120px; margin: 0 auto;">
                    <svg width="140" height="120" viewBox="0 0 100 100" style="display: block; margin: 0 auto; margin-top: -5px;">
                      <path d="M 25 78 A 30 30 0 1 1 75 78" stroke="rgba(194, 215, 229, 0.4)" stroke-width="5" fill="none" stroke-linecap="round" />
                      <path d="M 25 78 A 30 30 0 1 1 75 78" stroke="#0c6496" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="160" stroke-dashoffset="${LP_Offset}" />
                      <text x="25" y="88" font-size="7.5" fill="#516478" text-anchor="middle" font-family="sans-serif">${LP_Min}</text>
                      <text x="75" y="88" font-size="7.5" fill="#516478" text-anchor="middle" font-family="sans-serif">${LP_Max}</text>
                    </svg>
                    <div style="position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: -5px;">
                      <span style="font-size: 16px; font-weight: bold; color: #102435; font-family: sans-serif;">${fmtDec(LP_Val, LP_IsBar ? 2 : 1)}</span>
                      <span style="font-size: 8.5px; color: #5e7185; font-weight: bold; font-family: sans-serif; margin-top: 1px;">${LP_Unit}</span>
                    </div>
                  </div>
                  <div style="border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 0px;">
                    <div style="font-size: 9px; color: #5e7185; font-family: sans-serif;">Temp. Evaporación</div>
                    <div style="font-size: 16px; font-weight: bold; color: #0c6496; font-family: sans-serif; margin-top: 2px;">${fmtDec(evapTemp, 1)} <span style="font-size: 11px;">°C</span></div>
                  </div>
                </div>

                <!-- High Pressure -->
                <div style="flex: 1; min-width: 320px; max-width: 350px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02); box-sizing: border-box;">
                  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 8px; font-weight: bold; font-size: 9.5px; color: #5e7185;">
                    <span>testo 549i (Alta Presión)</span>
                    <span>• 008</span>
                  </div>
                  <div style="position: relative; width: 140px; height: 120px; margin: 0 auto;">
                    <svg width="140" height="120" viewBox="0 0 100 100" style="display: block; margin: 0 auto; margin-top: -5px;">
                      <path d="M 25 78 A 30 30 0 1 1 75 78" stroke="rgba(251, 226, 228, 0.45)" stroke-width="5" fill="none" stroke-linecap="round" />
                      <path d="M 25 78 A 30 30 0 1 1 75 78" stroke="#e3373b" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="160" stroke-dashoffset="${HP_Offset}" />
                      <text x="25" y="88" font-size="7.5" fill="#516478" text-anchor="middle" font-family="sans-serif">${HP_Min}</text>
                      <text x="75" y="88" font-size="7.5" fill="#516478" text-anchor="middle" font-family="sans-serif">${HP_Max}</text>
                    </svg>
                    <div style="position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: -5px;">
                      <span style="font-size: 16px; font-weight: bold; color: #102435; font-family: sans-serif;">${fmtDec(HP_Val, HP_IsBar ? 2 : 1)}</span>
                      <span style="font-size: 8.5px; color: #5e7185; font-weight: bold; font-family: sans-serif; margin-top: 1px;">${HP_Unit}</span>
                    </div>
                  </div>
                  <div style="border-top: 1px solid #f1f5f9; padding-top: 6px; margin-top: 0px;">
                    <div style="font-size: 9px; color: #5e7185; font-family: sans-serif;">Temp. Condensación</div>
                    <div style="font-size: 16px; font-weight: bold; color: #102435; font-family: sans-serif; margin-top: 2px;">${fmtDec(condTemp, 1)} <span style="font-size: 11px;">°C</span></div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <!-- PREVENTATIVE CHECKLIST -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 12px; font-weight: bold; color: #3730a3; margin: 0 0 10px 0; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">6. Lista de Verificación y Evidencias</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; text-align: left; background: white; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1;">
            <th style="padding: 6px 10px; font-weight: bold; color: #1e1b4b; width: 35%;">Punto de Inspección</th>
            <th style="padding: 6px 10px; font-weight: bold; color: #1e1b4b; width: 15%; text-align: center;">Estado</th>
            <th style="padding: 6px 10px; font-weight: bold; color: #1e1b4b; width: 50%;">Observaciones y Evidencia</th>
          </tr>
        </thead>
        <tbody>
          ${(report.checklist || []).filter(chk => chk.status !== "na").map(chk => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 10px; font-weight: bold;">
                ${chk.label}
                <div style="font-size: 8px; color: #94a3b8; font-weight: normal; margin-top: 2px;">${chk.category}</div>
              </td>
              <td style="padding: 8px 10px; text-align: center;">
                <span style="font-size: 8.5px; font-weight: bold; color: ${chk.status === "cumple" ? "#065f46" : chk.status === "no_cumple" ? "#991b1b" : "#475569"}; background: ${chk.status === "cumple" ? "#d1fae5" : chk.status === "no_cumple" ? "#fee2e2" : "#f1f5f9"}; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                  ${chk.status === "cumple" ? "Cumple" : chk.status === "no_cumple" ? "Falla" : "N/A"}
                </span>
              </td>
              <td style="padding: 8px 10px; color: #334155;">
                <div style="font-style: ${chk.notes ? "normal" : "italic"}; color: ${chk.notes ? "#1e293b" : "#94a3b8"}; margin-bottom: ${chk.images?.length ? "6px" : "0"};">
                  ${chk.notes || "Sin observaciones específicas."}
                </div>
                ${chk.images && chk.images.length > 0 ? `
                  <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${chk.images.map(img => `<img src="${img}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;" />`).join("")}
                  </div>
                ` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- COMMENTS -->
    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 11px; font-weight: bold; color: #3730a3; margin: 0 0 6px 0; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase;">7. Comentarios y Recomendaciones del Diagnóstico</h3>
      <div style="font-size: 10px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #fafafa; white-space: pre-wrap; line-height: 1.4; color: #334155;">${report.generalComments || "No se detallaron comentarios adicionales sobre este mantenimiento estructural."}</div>
      ${report.electricSchemeNote ? `
        <div style="font-size: 10px; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px; background: #fdfdfd; margin-top: 8px; line-height: 1.4; color: #334155;">
          <strong style="color: #4f46e5; display: block; margin-bottom: 3px; font-size: 9.5px;">Nota Técnico-Unifilar:</strong>
          ${report.electricSchemeNote}
        </div>
      ` : ""}
    </div>

    <!-- SIGNATURES -->
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-top: 40px; page-break-inside: avoid;">
      <div style="text-align: center; font-size: 11px;">
        ${report.signatures?.technicianSignature ? `<img src="${report.signatures.technicianSignature}" style="max-height: 56px; max-width: 160px; display: block; margin: 0 auto 6px auto; object-fit: contain;" />` : `<div style="height: 56px; display: flex; align-items: center; justify-content: center; border-bottom: 1px dashed #cbd5e1; margin-bottom: 6px; color: #cbccd3;">Firma no capturada</div>`}
        <div style="border-top: 1px solid #1e293b; padding-top: 4px; font-weight: bold; color: #334155;">Técnico HVAC Operador</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${report.signatures?.technicianName || report.technicianName}</div>
      </div>
      <div style="text-align: center; font-size: 11px;">
        ${report.signatures?.clientSignature ? `<img src="${report.signatures.clientSignature}" style="max-height: 56px; max-width: 160px; display: block; margin: 0 auto 6px auto; object-fit: contain;" />` : `<div style="height: 56px; display: flex; align-items: center; justify-content: center; border-bottom: 1px dashed #cbd5e1; margin-bottom: 6px; color: #cbccd3;">Firma no capturada</div>`}
        <div style="border-top: 1px solid #1e293b; padding-top: 4px; font-weight: bold; color: #334155;">Representante Técnico del Cliente</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${report.signatures?.clientName || report.clientName}</div>
      </div>
    </div>
    </div> <!-- END PAGE 2 WRAPPER -->
  `;

  document.body.appendChild(pdfContainer);

  try {
    // Generate page image via html2canvas with scale options
    // Scale: 2 handles high-DPI displays safely (prevents blurry layouts)
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    
    // Calculate aspect ratio / pages
    const imgWidth = 210; // A4 size width in mm
    const pageHeight = 297; // A4 size height in mm
    const canvasHeightInMm = (canvas.height * imgWidth) / canvas.width;
    
    const doc = new jsPDF("p", "mm", "a4");

    // Add first page
    doc.addImage(imgData, "JPEG", 0, 0, imgWidth, canvasHeightInMm);
    
    let heightLeft = canvasHeightInMm - pageHeight;
    let position = -pageHeight;

    // Handle multi-page split
    while (heightLeft > 0) {
      doc.addPage();
      doc.addImage(imgData, "JPEG", 0, position, imgWidth, canvasHeightInMm);
      heightLeft -= pageHeight;
      position -= pageHeight;
    }

    doc.save(`Ficha_HVAC_Folio_${report.folio}.pdf`);
    return true;
  } catch (err) {
    console.error("PDF generation failed:", err);
    return false;
  } finally {
    // Cleanup temporary off-screen div
    pdfContainer.remove();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE ORDER EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/** JSON backup for a service order */
export function exportServiceOrderAsJSON(order: ServiceOrderReport) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(order, null, 2));
  const a = document.createElement("a");
  a.setAttribute("href", dataStr);
  a.setAttribute("download", `OT_${order.folio}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Standalone HTML export for a service order */
export function exportServiceOrderAsHTML(order: ServiceOrderReport, companyName: string) {
  const RATING_LABEL: Record<string, string> = {
    excellent: "Excelente", normal: "Operativo",
    requires_action: "Requiere Acción", critical: "Crítico",
  };
  const RATING_BG: Record<string, string> = {
    excellent: "#d1fae5", normal: "#e0f2fe",
    requires_action: "#fef3c7", critical: "#fee2e2",
  };
  const RATING_TEXT: Record<string, string> = {
    excellent: "#065f46", normal: "#0369a1",
    requires_action: "#92400e", critical: "#991b1b",
  };
  const SERVICE_LABEL: Record<string, string> = {
    preventivo: "Mantenimiento Preventivo", correctivo: "Mantenimiento Correctivo",
    urgencia: "Atención de Urgencia", garantia: "Garantía de Servicio",
    puesta_marcha: "Puesta en Marcha",
  };

  const evidenceHTML = (order.evidence ?? []).length > 0
    ? `<div class="section-title">Registro Fotográfico / Evidencias</div>
       <div class="photo-grid">
         ${(order.evidence ?? []).map((p, i) => `
           <div class="photo-card">
             <img src="${p.imageBase64}" alt="Evidencia ${i + 1}">
             <div class="photo-caption"><strong>Foto ${i + 1}:</strong> ${p.description || "Sin descripción"}</div>
           </div>`).join("")}
       </div>`
    : "";

  const techSigHTML = order.signatures.technicianSignature
    ? `<img src="${order.signatures.technicianSignature}" class="sig-img" alt="Firma técnico">`
    : `<div style="height:60px;"></div>`;
  const clientSigHTML = order.signatures.clientSignature
    ? `<img src="${order.signatures.clientSignature}" class="sig-img" alt="Firma cliente">`
    : `<div style="height:60px;"></div>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orden de Servicio – ${order.folio}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; background: #f8fafc; padding: 24px; line-height: 1.5; }
    .report-card { max-width: 860px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,.08); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
    .header-left .company { font-size: 22px; font-weight: 800; color: #7c3aed; }
    .header-left .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
    .header-right { text-align: right; }
    .header-right .folio { font-size: 18px; font-weight: 800; color: #7c3aed; }
    .header-right .date { font-size: 11px; color: #64748b; }
    .rating-badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; background: ${RATING_BG[order.diagnosticRating] ?? "#f1f5f9"}; color: ${RATING_TEXT[order.diagnosticRating] ?? "#334155"}; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .meta-item { font-size: 12px; }
    .meta-label { font-weight: 700; color: #475569; }
    .section-title { font-size: 13px; font-weight: 800; color: #3730a3; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 24px 0 12px; text-transform: uppercase; letter-spacing: .04em; }
    .text-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px; color: #334155; white-space: pre-wrap; line-height: 1.7; min-height: 60px; }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
    .photo-card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .photo-card img { width: 100%; height: 180px; object-fit: cover; display: block; }
    .photo-caption { padding: 8px 10px; font-size: 11px; color: #475569; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
    .sig-box { text-align: center; }
    .sig-img { max-height: 80px; max-width: 200px; display: block; margin: 0 auto 8px; }
    .sig-line { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; font-weight: 700; color: #475569; }
    .sig-name { font-size: 11px; color: #64748b; margin-top: 2px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
<div class="report-card">

  <div class="header">
    <div class="header-left">
      <div class="company">${companyName}</div>
      <div class="subtitle">Orden de Servicio Técnico HVAC</div>
      <div style="margin-top:10px;">${SERVICE_LABEL[order.serviceType] ?? order.serviceType} &nbsp;|&nbsp; <span class="rating-badge">${RATING_LABEL[order.diagnosticRating] ?? order.diagnosticRating}</span></div>
    </div>
    <div class="header-right">
      <div class="folio">OT ${order.folio}</div>
      <div class="date">${order.date}</div>
      ${order.orderNumber ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">Ref. Cliente: ${order.orderNumber}</div>` : ""}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><span class="meta-label">Cliente:</span> ${order.clientName}</div>
    <div class="meta-item"><span class="meta-label">Sucursal:</span> ${order.branchLocation || "—"}</div>
    <div class="meta-item"><span class="meta-label">Técnico:</span> ${order.technicianName}</div>
    <div class="meta-item"><span class="meta-label">Contacto:</span> ${order.clientContactName || "—"}${order.clientContactRole ? ` (${order.clientContactRole})` : ""}</div>
    ${order.clientLocationAddress ? `<div class="meta-item" style="grid-column: span 2;"><span class="meta-label">Dirección:</span> ${order.clientLocationAddress}</div>` : ""}
  </div>

  ${evidenceHTML}

  <div class="section-title">Hallazgos y Diagnóstico</div>
  <div class="text-block">${order.findings || "Sin hallazgos registrados."}</div>

  <div class="section-title">Conclusiones</div>
  <div class="text-block">${order.conclusions || "Sin conclusiones registradas."}</div>

  <div class="sig-grid">
    <div class="sig-box">
      ${techSigHTML}
      <div class="sig-line">Firma Técnico Responsable</div>
      <div class="sig-name">${order.signatures.technicianName || order.technicianName}</div>
    </div>
    <div class="sig-box">
      ${clientSigHTML}
      <div class="sig-line">Firma Cliente / Recepción Conforme</div>
      <div class="sig-name">${order.signatures.clientName || order.clientName}</div>
    </div>
  </div>

  <div class="footer">Generado por Gestión HVAC Pro &mdash; ${new Date().toLocaleDateString("es-CL")} &mdash; Documento autónomo offline</div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `OT_${order.folio}_${order.clientName.replace(/[^a-zA-Z0-9]/g, "_")}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** PDF generation for a service order (text-based A4) */
export async function generateServiceOrderPDF(order: ServiceOrderReport, companyName: string): Promise<boolean> {
  const RATING_LABEL: Record<string, string> = {
    excellent: "Excelente", normal: "Operativo",
    requires_action: "Requiere Acción", critical: "Crítico",
  };
  const SERVICE_LABEL: Record<string, string> = {
    preventivo: "Mantenimiento Preventivo", correctivo: "Mantenimiento Correctivo",
    urgencia: "Atención de Urgencia", garantia: "Garantía de Servicio",
    puesta_marcha: "Puesta en Marcha",
  };

  // Build a temp off-screen HTML container identical to the HTML export
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:850px;background:#fff;";
  container.innerHTML = `
    <div style="font-family:Arial,sans-serif;color:#1e293b;padding:36px;max-width:850px;background:#fff;">
      <div style="display:flex;justify-content:space-between;border-bottom:3px solid #7c3aed;padding-bottom:14px;margin-bottom:20px;">
        <div>
          <div style="font-size:20px;font-weight:800;color:#7c3aed;">${companyName}</div>
          <div style="font-size:11px;color:#64748b;">Orden de Servicio Técnico HVAC</div>
          <div style="margin-top:8px;font-size:12px;">${SERVICE_LABEL[order.serviceType] ?? order.serviceType} &nbsp;|&nbsp; <strong>${RATING_LABEL[order.diagnosticRating] ?? order.diagnosticRating}</strong></div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:18px;font-weight:800;color:#7c3aed;">OT ${order.folio}</div>
          <div style="font-size:11px;color:#64748b;">${order.date}</div>
          ${order.orderNumber ? `<div style="font-size:11px;color:#64748b;">Ref: ${order.orderNumber}</div>` : ""}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:20px;font-size:12px;">
        <div><strong>Cliente:</strong> ${order.clientName}</div>
        <div><strong>Sucursal:</strong> ${order.branchLocation || "—"}</div>
        <div><strong>Técnico:</strong> ${order.technicianName}</div>
        <div><strong>Contacto:</strong> ${order.clientContactName || "—"}${order.clientContactRole ? ` (${order.clientContactRole})` : ""}</div>
        ${order.clientLocationAddress ? `<div style="grid-column:span 2;"><strong>Dirección:</strong> ${order.clientLocationAddress}</div>` : ""}
      </div>

      ${(order.evidence ?? []).length > 0 ? `
        <div style="font-size:13px;font-weight:800;color:#3730a3;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:12px;text-transform:uppercase;">Registro Fotográfico</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
          ${(order.evidence ?? []).map((p, i) => `
            <div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;width:200px;">
              <img src="${p.imageBase64}" style="width:200px;height:150px;object-fit:cover;display:block;" alt="Foto ${i+1}">
              <div style="padding:6px 8px;font-size:10px;color:#475569;">${p.description || "Sin descripción"}</div>
            </div>`).join("")}
        </div>` : ""}

      <div style="font-size:13px;font-weight:800;color:#3730a3;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">Hallazgos y Diagnóstico</div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:12px;color:#334155;white-space:pre-wrap;margin-bottom:20px;min-height:60px;">${order.findings || "Sin hallazgos registrados."}</div>

      <div style="font-size:13px;font-weight:800;color:#3730a3;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;">Conclusiones</div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:12px;color:#334155;white-space:pre-wrap;margin-bottom:30px;min-height:60px;">${order.conclusions || "Sin conclusiones registradas."}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px;">
        <div style="text-align:center;">
          ${order.signatures.technicianSignature ? `<img src="${order.signatures.technicianSignature}" style="max-height:70px;max-width:190px;display:block;margin:0 auto 8px;" alt="Firma técnico">` : `<div style="height:70px;"></div>`}
          <div style="border-top:1px solid #94a3b8;padding-top:6px;font-size:11px;font-weight:700;color:#475569;">Firma Técnico Responsable</div>
          <div style="font-size:10px;color:#64748b;">${order.signatures.technicianName || order.technicianName}</div>
        </div>
        <div style="text-align:center;">
          ${order.signatures.clientSignature ? `<img src="${order.signatures.clientSignature}" style="max-height:70px;max-width:190px;display:block;margin:0 auto 8px;" alt="Firma cliente">` : `<div style="height:70px;"></div>`}
          <div style="border-top:1px solid #94a3b8;padding-top:6px;font-size:11px;font-weight:700;color:#475569;">Firma Cliente / Recepción Conforme</div>
          <div style="font-size:10px;color:#64748b;">${order.signatures.clientName || order.clientName}</div>
        </div>
      </div>

      <div style="margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center;">Generado por Gestión HVAC Pro · ${new Date().toLocaleDateString("es-CL")}</div>
    </div>`;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let pos = 0;
    let remaining = imgH;
    doc.addImage(imgData, "JPEG", 0, pos, imgW, imgH);
    remaining -= pageH;
    while (remaining > 0) {
      pos -= pageH;
      doc.addPage();
      doc.addImage(imgData, "JPEG", 0, pos, imgW, imgH);
      remaining -= pageH;
    }
    doc.save(`OT_${order.folio}_${order.clientName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
    return true;
  } catch (err) {
    console.error("Service order PDF generation failed:", err);
    return false;
  } finally {
    container.remove();
  }
}
