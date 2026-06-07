export interface Compressor {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'fault';
  amperage: string;
  voltage: string;
  phaseType?: 'monofasico' | 'trifasico';
  amperageR?: string;
  amperageS?: string;
  amperageT?: string;
}

export interface Circuit {
  id: string;
  name: string;
  refrigerantChargeInput: string; // e.g. R410A / 4.5kg
  status: 'active' | 'warning' | 'error' | 'inactive';
  compressors: Compressor[];
  suctionPressure: string; // PSI
  dischargePressure: string; // PSI
  superheat: string; // °C or °F
  subcooling: string; // °C or °F
}

export interface InspectionChecklistItem {
  id: string;
  category: string;
  label: string;
  status: 'cumple' | 'no_cumple' | 'na';
  images: string[]; // array of base64 strings
  notes?: string;
}

export interface Signatures {
  technicianName: string;
  technicianSignature: string; // base64 URL or empty
  clientName: string;
  clientSignature: string; // base64 URL or empty
  signDate: string;
}

export interface HVACReport {
  id: string;
  folio: string;
  timestamp: string;
  date: string;
  technicianName: string;
  
  // Client & Location Specs
  clientName: string;
  clientEmail: string;
  branchLocation: string;
  clientContactName?: string;
  clientContactRole?: string;
  clientLocationAddress?: string;
  clientRegion?: string;

  // Equipment Specs
  brand: string;
  model: string;
  serialNumber: string;
  refrigerantType: string;
  capacity: string;
  voltage: string;
  amperage: string;
  equipmentType: string; // e.g., Chiller, VRF, Split, Paquete
  criticality?: 'altamente_critico' | 'critico' | 'no_critico';
  
  // Measurements
  ambientTemp: string; // °C or °F
  returnTemp: string;
  supplyTemp: string;
  fanAmperage: string;
  setPoint?: string;

  // Circuits (Dynamic Circuit Architecture)
  circuits: Circuit[];

  // Checklist Evidence
  checklist: InspectionChecklistItem[];

  // Dynamic Scheme drawing content
  electricSchemeNote?: string;
  customDrawingSvg?: string; // Stored schematic config or SVG

  // Signatures
  signatures: Signatures;

  // Overall General Comments
  generalComments: string;
  overallStatus: 'excellent' | 'normal' | 'requires_action' | 'critical';
}

export type SubType =
  | 'TIENDA' | 'BODEGA' | 'OFICINA' | 'PLANTA' | 'SUCURSAL'
  | 'LABORATORIO' | 'DATA CENTER' | 'HOSPITAL' | 'HOTEL' | 'MALL' | 'OTRO';

export interface SubBranch {
  id: string;
  type: SubType;
  code: string;       // max 8 chars codificador
  name: string;       // nombre identificador
  address: string;
  region: string;     // or 'HEREDAR' to inherit from client
  sameContact: boolean;
  contactPerson?: string;
  contactRole?: string;
  contactEmail?: string;
}

export interface ClientRecord {
  id: string;
  name: string;         // razón social
  address: string;      // dirección matriz
  region: string;
  contactPerson: string;
  contactRole: string;
  contactEmail: string;
  noSubs: boolean;      // dirección actúa como única sucursal
  subs: SubBranch[];
}

export interface AdminSettings {
  clients: string[];
  branches: { [clientName: string]: string[] };
  clientRecords: ClientRecord[];
  equipmentTypes: string[];
  brands: string[];
  refrigerants: string[];
  logo: string;
  companyName: string;
  companyAddress: string;
  techs: string[];
}

export type ServiceType = 'preventivo' | 'correctivo' | 'urgencia' | 'garantia' | 'puesta_marcha';
export type DiagnosticRating = 'excellent' | 'normal' | 'requires_action' | 'critical';

export interface EvidencePhoto {
  id: string;
  imageBase64: string; // data URL
  description: string;
}

// ============================================================
// USUARIOS Y AUTENTICACIÓN
// ============================================================
export type UserProfile = 'administrador' | 'tecnico' | 'supervisor' | 'contratista';

export interface AppUser {
  id: string;
  email: string;
  nombre: string;
  perfil: UserProfile;
  pinHash: string;          // SHA-256 del PIN + salt
  activo: boolean;
  clienteId?: string;       // cliente asignado
  sucursalIds?: string[];   // sucursales asignadas
  avatarInitials?: string;  // 2 letras para el avatar
  createdAt: string;
  lastLogin?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  nombre: string;
  perfil: UserProfile;
  clienteId: string;
  token: string;
  expiresAt: string;
}

// ============================================================
// ESTRUCTURA DE BASE DE DATOS LOCAL (LocalForage)
// ============================================================
export interface LocalDB {
  // Colecciones principales
  'hvac_reports': HVACReport[];
  'hvac_service_orders': ServiceOrderReport[];
  'hvac_admin_settings': AdminSettings;
  // Autenticación
  'app_users': AppUser[];
  'auth_session': AuthSession | null;
  // Metadatos
  'db_version': number;
  'last_sync': string;
}

export interface ServiceOrderReport {
  id: string;
  folio: string;
  timestamp: string;
  date: string;

  // 1. Información General
  technicianName: string;
  serviceType: ServiceType;
  orderNumber: string;

  // 2. Cliente & Localización
  clientName: string;
  branchLocation: string;
  clientContactName: string;
  clientContactRole: string;
  clientLocationAddress: string;

  // 3. Calificación
  diagnosticRating: DiagnosticRating;

  // 4. Registro Fotográfico
  evidence: EvidencePhoto[];

  // 5. Hallazgos y Diagnóstico
  findings: string;

  // 6. Conclusiones
  conclusions: string;

  // 7. Firmas
  signatures: Signatures;
}
