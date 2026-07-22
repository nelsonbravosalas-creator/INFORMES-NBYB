import { sql } from "./db.js";

let reportPayloadColumnReady: Promise<void> | null = null;

export function ensureHvacReportPayloadColumn(): Promise<void> {
  if (!reportPayloadColumnReady) {
    reportPayloadColumnReady = sql`
      ALTER TABLE hvac_reports
      ADD COLUMN IF NOT EXISTS report_payload JSONB NOT NULL DEFAULT '{}'::jsonb
    `.then(() => undefined);
  }

  return reportPayloadColumnReady;
}

const valueFrom = (...values: any[]) =>
  values.find(value => value !== undefined && value !== null) ?? "";

const dateOnly = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value.includes("T") ? value.slice(0, 10) : value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
};

export function toHvacReport(row: any) {
  const payload = row.reportPayload ?? row.report_payload ?? {};
  const measurements = row.measurements ?? payload.measurements ?? {};

  return {
    ...payload,
    id: row.id ?? payload.id,
    legacyId: row.legacyId ?? row.legacy_id ?? payload.legacyId,
    timestamp: row.timestamp ?? row.updated_at ?? payload.timestamp,
    folio: valueFrom(row.folio, payload.folio),
    date: dateOnly(valueFrom(row.date, row.report_date, payload.date)),
    technicianName: valueFrom(row.technicianName, row.technician_name, payload.technicianName),
    clientName: valueFrom(row.clientName, row.client_name, payload.clientName),
    clientId: valueFrom(row.clientId, row.client_id, payload.clientId),
    clientEmail: valueFrom(row.clientEmail, row.client_email, payload.clientEmail),
    branchLocation: valueFrom(row.branchLocation, row.branch_name, payload.branchLocation),
    branchId: valueFrom(row.branchId, row.branch_id, payload.branchId),
    siteId: valueFrom(row.siteId, row.branch_id, payload.siteId),
    clientContactName: valueFrom(row.clientContactName, row.client_contact_name, payload.clientContactName),
    clientContactRole: valueFrom(row.clientContactRole, row.client_contact_role, payload.clientContactRole),
    clientLocationAddress: valueFrom(row.clientLocationAddress, row.client_location_address, payload.clientLocationAddress),
    clientRegion: valueFrom(row.clientRegion, row.client_region, payload.clientRegion),
    equipmentId: valueFrom(row.equipmentId, row.equipment_id, payload.equipmentId),
    correlative: row.correlative ?? payload.correlative,
    correlativeLabel: valueFrom(row.correlativeLabel, row.correlative_label, payload.correlativeLabel),
    brand: valueFrom(row.brand, payload.brand),
    model: valueFrom(row.model, payload.model),
    serialNumber: valueFrom(row.serialNumber, row.serial_number, payload.serialNumber),
    refrigerantType: valueFrom(row.refrigerantType, row.refrigerant_type, payload.refrigerantType),
    capacity: valueFrom(row.capacity, payload.capacity),
    voltage: valueFrom(row.voltage, payload.voltage),
    amperage: valueFrom(row.amperage, payload.amperage),
    equipmentType: valueFrom(row.equipmentType, row.equipment_type, payload.equipmentType),
    criticality: valueFrom(row.criticality, payload.criticality),
    overallStatus: valueFrom(row.overallStatus, row.overall_status, payload.overallStatus, "normal"),
    ambientTemp: valueFrom(payload.ambientTemp, measurements.ambientTemp),
    returnTemp: valueFrom(payload.returnTemp, measurements.returnTemp),
    supplyTemp: valueFrom(payload.supplyTemp, measurements.supplyTemp),
    fanAmperage: valueFrom(payload.fanAmperage, measurements.fanAmperage),
    setPoint: valueFrom(payload.setPoint, measurements.setPoint),
    circuits: row.circuits ?? payload.circuits ?? [],
    checklist: row.checklist ?? payload.checklist ?? [],
    signatures: row.signatures ?? payload.signatures ?? {},
    electricSchemeNote: valueFrom(row.electricSchemeNote, row.electric_scheme_note, payload.electricSchemeNote),
    customDrawingSvg: valueFrom(row.customDrawingSvg, row.custom_drawing_svg, payload.customDrawingSvg),
    generalComments: valueFrom(row.generalComments, row.general_comments, payload.generalComments),
  };
}
