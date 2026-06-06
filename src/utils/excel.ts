import * as XLSX from "xlsx";
import { HVACReport, AdminSettings } from "../types";

/**
 * Exports current reports array to an Excel sheet
 */
export function exportReportsToExcel(reports: HVACReport[]) {
  if (reports.length === 0) return;

  const data = reports.map(r => ({
    Folio: r.folio,
    Fecha: r.date,
    Técnico: r.technicianName,
    Cliente: r.clientName,
    "Email Cliente": r.clientEmail,
    Sucursal: r.branchLocation,
    "Tipo Equipo": r.equipmentType,
    Marca: r.brand,
    Modelo: r.model,
    "Número de Serie": r.serialNumber,
    "Tipo Refrigerante": r.refrigerantType,
    Voltaje: r.voltage,
    "Amperaje Nominal": r.amperage,
    "Temperatura Ambiente": r.ambientTemp,
    "Temperatura Retorno": r.returnTemp,
    "Temperatura Inyección": r.supplyTemp,
    "Amperaje Turbina": r.fanAmperage,
    "Circuitos Registrados": (r.circuits || []).length,
    "Estado General": r.overallStatus.toUpperCase(),
    Comentarios: r.generalComments
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Informes HVAC Pro");

  // Columns width helper
  const maxProps = Object.keys(data[0] || {});
  worksheet["!cols"] = maxProps.map(() => ({ wch: 18 }));

  XLSX.writeFile(workbook, `Reportes_HVAC_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
}

/**
 * Handles Excel Import for Admin Settings (Batch client/branch import)
 */
export function importExcelToAdminData(file: File): Promise<{ clients: string[]; branches: { [clientName: string]: string[] } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Expecting: Column A = Cliente, Column B = Sucursal
        const rows = XLSX.utils.sheet_to_json<{ Cliente?: string; Sucursal?: string }>(worksheet);
        
        const clientsSet = new Set<string>();
        const branchesMap: { [clientName: string]: string[] } = {};

        rows.forEach(row => {
          const client = row.Cliente?.trim();
          const branch = row.Sucursal?.trim();

          if (client) {
            clientsSet.add(client);
            if (!branchesMap[client]) {
              branchesMap[client] = [];
            }
            if (branch && !branchesMap[client].includes(branch)) {
              branchesMap[client].push(branch);
            }
          }
        });

        resolve({
          clients: Array.from(clientsSet),
          branches: branchesMap
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
