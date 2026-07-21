import React, { useState, useEffect } from "react";
import { HVACReport, AdminSettings, ServiceOrderReport, AuthSession } from "./types";
import {
  getReports, saveReport, deleteReport, getAdminSettings, saveAdminSettings,
  getServiceOrders, saveServiceOrder, deleteServiceOrder,
  getSession, logout,
} from "./utils/storage";
import { initAutoSync, syncAll } from "./utils/sync";
import { exportReportsToExcel } from "./utils/excel";
import {
  generatePDFReport, exportReportAsJSON, exportReportAsHTML,
  exportServiceOrderAsJSON, exportServiceOrderAsHTML, generateServiceOrderPDF,
} from "./utils/pdf";
import ReportForm from "./components/ReportForm";
import ServiceOrderForm from "./components/ServiceOrderForm";
import ServiceOrderViewerModal from "./components/ServiceOrderViewerModal";
import AdminSettingsModal from "./components/AdminSettingsModal";
import ReportViewerModal from "./components/ReportViewerModal";
import PWAInstallButton, { OnlineIndicator, PWAHeaderInstallButton } from "./components/PWAInstallButton";
import LoginComponent from "./components/LoginComponent";
import UsersModal from "./components/UsersModal";
import {
  Plus, Settings, FileSpreadsheet, Upload, Search, ClipboardList,
  Trash2, Edit3, Eye, FileText, Moon, Sun, ShieldAlert,
  CheckCircle, AlertTriangle, AlertOctagon, RefreshCw, BookOpen, LogOut,
  Users
} from "lucide-react";

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthSession | null>(null);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const isAdmin = currentUser?.perfil === 'administrador' || currentUser?.perfil === 'supervisor';

  const [reports, setReports] = useState<HVACReport[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);

  // Navigation states
  const [activeReport, setActiveReport] = useState<HVACReport | null>(null);
  const [viewingReport, setViewingReport] = useState<HVACReport | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // Service Orders state
  const [serviceOrders, setServiceOrders] = useState<ServiceOrderReport[]>([]);
  const [isServiceOrderFormOpen, setIsServiceOrderFormOpen] = useState(false);
  const [activeServiceOrder, setActiveServiceOrder] = useState<ServiceOrderReport | null>(null);
  const [viewingServiceOrder, setViewingServiceOrder] = useState<ServiceOrderReport | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  // Visual Theme
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Force dark mode on DOM elements reactively
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await getSession();
        if (session) {
          setCurrentUser(session);
          setIsAuthenticated(true);
          console.log('[App] Session restored:', session.email, '|', session.perfil);
        }
      } catch (err) {
        console.error('[App] Auth check error:', err);
      }
    }
    checkAuth();
  }, []);

  // Load initial databases and drafts (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadInitialData() {
      const reportsList = await getReports();
      setReports(reportsList);

      const settings = await getAdminSettings();
      setAdminSettings(settings);

      const orders = await getServiceOrders();
      setServiceOrders(orders);
    }
    loadInitialData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const stopSync = initAutoSync(async () => {
      setReports(await getReports());
      setServiceOrders(await getServiceOrders());
    });

    return stopSync;
  }, [isAuthenticated]);

  // Theme support
  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  // Handle login success
  const handleLoginSuccess = (session: AuthSession) => {
    setCurrentUser(session);
    setIsAuthenticated(true);
  };

  // Handle logout
  const handleLogout = async () => {
    if (window.confirm('¿Cerrar sesión?')) {
      await logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
      console.log('[App] User logged out');
    }
  };

  // If not authenticated, show login
  if (!isAuthenticated) {
    return <LoginComponent onLoginSuccess={handleLoginSuccess} />;
  }

  // Create new report initializer
  const handleCreateNew = () => {
    setActiveReport(null);
    setIsFormOpen(true);
  };

  // Service Order handlers
  const handleCreateServiceOrder = () => {
    setActiveServiceOrder(null);
    setIsServiceOrderFormOpen(true);
  };

  const handleSaveServiceOrder = async (order: ServiceOrderReport) => {
    const updated = await saveServiceOrder(order);
    setServiceOrders(updated);
    setIsServiceOrderFormOpen(false);
    setActiveServiceOrder(null);
    await syncAll();
    setServiceOrders(await getServiceOrders());
  };

  const handleDeleteServiceOrder = async (id: string) => {
    if (window.confirm("¿Eliminar esta orden de servicio permanentemente? Esta acción no se puede deshacer.")) {
      const updated = await deleteServiceOrder(id);
      setServiceOrders(updated);
    }
  };

  // Save report submission handler
  const handleSaveReport = async (newReport: HVACReport) => {
    const updated = await saveReport(newReport);
    setReports(updated);
    setIsFormOpen(false);
    setActiveReport(null);
    await syncAll();
    setReports(await getReports());
  };

  // Delete report handler
  const handleDeleteReport = async (id: string) => {
    if (window.confirm("¿Está seguro de que desea eliminar permanentemente este informe de servicio? Esta acción no se puede deshacer.")) {
      const updated = await deleteReport(id);
      setReports(updated);
    }
  };

  // Import JSON report backup
  const handleJSONBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsedReport = JSON.parse(event.target?.result as string);
        if (!parsedReport.folio || !parsedReport.clientName) {
          throw new Error("El archivo no tiene el formato de un informe técnico válido.");
        }
        
        // Give import unique id if matching existing to avoid collisions
        const list = await getReports();
        const hasMatch = list.some(r => r.id === parsedReport.id);
        if (hasMatch) {
          parsedReport.id = `rep_imp_${Date.now()}`;
          parsedReport.folio = `${parsedReport.folio}-Copia`;
        }

        const updated = await saveReport(parsedReport);
        setReports(updated);
        alert(`¡Informe Folio ${parsedReport.folio} importado correctamente en la base de datos local!`);
      } catch (err: any) {
        alert("Error al importar el archivo: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Export reports data lists helper
  const handleExportDataList = () => {
    exportReportsToExcel(reports);
  };

  // Render Filtered reports list
  const filteredReports = reports.filter(r => {
    const term = searchQuery.toLowerCase();
    const searchMatch = 
      r.folio.toLowerCase().includes(term) ||
      r.clientName.toLowerCase().includes(term) ||
      r.branchLocation.toLowerCase().includes(term) ||
      r.brand.toLowerCase().includes(term) ||
      r.model.toLowerCase().includes(term) ||
      r.technicianName.toLowerCase().includes(term);

    const statusMatch = statusFilter === "all" || r.overallStatus === statusFilter;
    const clientMatch = clientFilter === "all" || r.clientName === clientFilter;

    return searchMatch && statusMatch && clientMatch;
  });

  // Calculate stats
  const totalReports = reports.length;
  const criticalReports = reports.filter(r => r.overallStatus === "critical").length;
  const alertReports = reports.filter(r => r.overallStatus === "requires_action").length;
  const activePercent = totalReports > 0 
    ? Math.round(((totalReports - (criticalReports + alertReports)) / totalReports) * 100) 
    : 100;

  if (!adminSettings) {
    return (
      <div id="fallback-loading-scr" className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm font-semibold text-zinc-400">Iniciando base de datos HVAC Pro...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] font-sans antialiased text-zinc-300">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-zinc-850 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-blue-500/20">
              <span className="text-base font-mono">H</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[15px] tracking-wide text-zinc-100 uppercase">Gestión HVAC Pro</span>
                <span className="text-[9px] font-mono tracking-wider font-extrabold uppercase bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">v1.6 iOS Offline</span>
              </div>
              <p className="text-[10px] text-zinc-500 -mt-0.5">Elaboración de Informes y Diagnóstico HVAC</p>
            </div>
          </div>

          {/* Quick Menu Controls */}
          <div className="flex items-center gap-2">
            {/* Botón instalar PWA (sólo aparece cuando el navegador lo permite) */}
            <PWAHeaderInstallButton />

            <OnlineIndicator />

            {/* Avatar + nombre del usuario */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-800/60 border border-slate-700/60 rounded-lg">
              <div className="w-6 h-6 rounded-lg bg-violet-600/30 flex items-center justify-center text-[10px] font-black text-violet-300">
                {currentUser?.nombre?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??'}
              </div>
              <div className="leading-none">
                <p className="text-[11px] font-bold text-zinc-200 truncate max-w-[100px]">
                  {currentUser?.nombre?.split(' ')[0] || currentUser?.email}
                </p>
                <p className="text-[9px] text-zinc-500 capitalize">{currentUser?.perfil}</p>
              </div>
            </div>

            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
              title={theme === "light" ? "Activar Modo Oscuro" : "Activar Modo Claro"}
            >
              {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            </button>

            <button
              id="open-manual-btn"
              onClick={() => setIsManualOpen(true)}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
              title="Manual de Diagnóstico Técnico"
            >
              <BookOpen className="w-4.5 h-4.5" />
            </button>

            {/* Gestión de usuarios (solo admin/supervisor) */}
            {isAdmin && (
              <button
                onClick={() => setIsUsersOpen(true)}
                className="p-2 text-zinc-400 hover:text-violet-400 hover:bg-violet-950/20 rounded-lg transition"
                title="Gestión de usuarios"
              >
                <Users className="w-4.5 h-4.5" />
              </button>
            )}

            <button
              id="open-admin-button"
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
              title="Configuración global del sistema"
            >
              <Settings className="w-4.5 h-4.5 text-zinc-400" />
              <span className="hidden sm:inline">Administrar</span>
            </button>

            <button
              id="logout-btn"
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>

            {!isFormOpen && !isServiceOrderFormOpen && (
              <>
                <button
                  id="header-create-new-btn"
                  onClick={handleCreateNew}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold active:scale-95 transition shadow-sm shadow-blue-500/20 uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" /> Nuevo Informe
                </button>
                <button
                  id="header-create-ot-btn"
                  onClick={handleCreateServiceOrder}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold active:scale-95 transition shadow-sm shadow-violet-500/20 uppercase tracking-wider"
                >
                  <ClipboardList className="w-4 h-4" /> Nueva OT
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Primary body container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {isFormOpen ? (
          /* Report Creator / Editor View */
          <ReportForm
            report={activeReport}
            adminSettings={adminSettings}
            onSave={handleSaveReport}
            onUpdateAdminSettings={async (updatedSettings) => {
              await saveAdminSettings(updatedSettings);
              setAdminSettings(updatedSettings);
            }}
            onClose={() => {
              setIsFormOpen(false);
              setActiveReport(null);
            }}
          />
        ) : isServiceOrderFormOpen ? (
          /* Service Order Creator / Editor View */
          <ServiceOrderForm
            order={activeServiceOrder}
            adminSettings={adminSettings}
            onSave={handleSaveServiceOrder}
            onClose={() => {
              setIsServiceOrderFormOpen(false);
              setActiveServiceOrder(null);
            }}
          />
        ) : (
          /* Master Dashboard View */
          <div className="space-y-6">
            
            {/* Quick Metrics display board */}
            <div id="stats-dashboard-panel" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Total Informes Digitales</span>
                  <p className="text-2xl font-black text-blue-505 text-blue-400 mt-1">{totalReports}</p>
                  <span className="text-[9px] text-zinc-550 block">Guardados localmente</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-950/40 text-blue-400 border border-blue-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Tasa de Operación</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{activePercent}%</p>
                  <span className="text-[9px] text-zinc-550 block">Dispositivos sin fallas</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Alertas Activas</span>
                  <p className="text-2xl font-black text-rose-400 mt-1">{criticalReports}</p>
                  <span className="text-[9px] text-zinc-550 block">Fallas críticas registradas</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-950/40 text-rose-450 border border-rose-900/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Service Orders panel */}
            <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-violet-400" />
                  Órdenes de Servicio
                  <span className="text-[10px] font-bold bg-violet-900/30 text-violet-400 border border-violet-800/40 px-2 py-0.5 rounded-full">{serviceOrders.length}</span>
                </h3>
                <button
                  onClick={handleCreateServiceOrder}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva OT
                </button>
              </div>
              <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#121212] border-b border-zinc-800 text-zinc-500 font-extrabold uppercase tracking-wide">
                      <th className="px-4 py-3">Folio / Fecha</th>
                      <th className="px-4 py-3">Cliente / Sucursal</th>
                      <th className="px-4 py-3">Tipo Servicio</th>
                      <th className="px-4 py-3">Técnico</th>
                      <th className="px-4 py-3 text-center">Calificación</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 italic">
                          No hay órdenes de servicio registradas. Crea una con "+ Nueva OT".
                        </td>
                      </tr>
                    ) : (
                      serviceOrders.map(ot => {
                        const ratingColors: Record<string, string> = {
                          excellent:       "bg-emerald-950/40 text-emerald-400 border-emerald-900/50",
                          normal:          "bg-blue-950/40 text-blue-400 border-blue-900/40",
                          requires_action: "bg-amber-950/40 text-amber-400 border-amber-900/40",
                          critical:        "bg-rose-950/40 text-rose-400 border-rose-900/45",
                        };
                        const ratingLabels: Record<string, string> = {
                          excellent: "Excelente", normal: "Operativo",
                          requires_action: "Alerta", critical: "Crítico",
                        };
                        const serviceLabels: Record<string, string> = {
                          preventivo: "Preventivo", correctivo: "Correctivo",
                          urgencia: "Urgencia", garantia: "Garantía",
                          puesta_marcha: "Puesta en Marcha",
                        };
                        return (
                          <tr key={ot.id} className="border-b border-zinc-850 hover:bg-zinc-800/20 transition-colors">
                            <td className="px-4 py-4">
                              <span className="text-violet-400 font-bold block">{ot.folio}</span>
                              <span className="text-[10px] text-zinc-500">{ot.date}</span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="font-semibold text-zinc-200 block">{ot.clientName}</span>
                              <span className="text-[11px] text-zinc-500">{ot.branchLocation}</span>
                            </td>
                            <td className="px-4 py-4 text-zinc-300">{serviceLabels[ot.serviceType] ?? ot.serviceType}</td>
                            <td className="px-4 py-4 text-zinc-300 font-medium">{ot.technicianName}</td>
                            <td className="px-4 py-4 text-center">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${ratingColors[ot.diagnosticRating]}`}>
                                {ratingLabels[ot.diagnosticRating]}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Ver */}
                                <button
                                  onClick={() => setViewingServiceOrder(ot)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded border border-violet-500/20 font-bold text-[10px] cursor-pointer transition hover:scale-105 active:scale-95"
                                  title="Ver orden de servicio"
                                >
                                  <Eye className="w-3 h-3" /> Ver
                                </button>
                                {/* PDF */}
                                <button
                                  onClick={() => generateServiceOrderPDF(ot, adminSettings.companyName)}
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-bold text-[10px] cursor-pointer"
                                  title="Generar PDF A4"
                                >
                                  PDF
                                </button>
                                {/* HTML */}
                                <button
                                  onClick={() => exportServiceOrderAsHTML(ot, adminSettings.companyName)}
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-bold text-[10px] cursor-pointer"
                                  title="Exportar HTML offline"
                                >
                                  HTML
                                </button>
                                {/* JSON */}
                                <button
                                  onClick={() => exportServiceOrderAsJSON(ot)}
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-bold text-[10px] cursor-pointer"
                                  title="Exportar JSON backup"
                                >
                                  JSON
                                </button>
                                {/* Editar */}
                                <button
                                  onClick={() => { setActiveServiceOrder(ot); setIsServiceOrderFormOpen(true); }}
                                  className="p-1 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded cursor-pointer"
                                  title="Editar orden de servicio"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {/* Eliminar */}
                                <button
                                  onClick={() => handleDeleteServiceOrder(ot.id)}
                                  className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded cursor-pointer"
                                  title="Eliminar orden de servicio"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* List and search panels */}
            <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1 w-full relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-input-field"
                    type="text"
                    placeholder="Buscar por folio, cliente, técnico, marca o modelo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 bg-[#0f0f0f] text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Filter segments */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  <select
                    id="status-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs bg-[#0f0f0f] border border-zinc-850 focus:border-blue-500 rounded-xl px-3 py-2 text-zinc-300"
                  >
                    <option value="all">Filtro Estado: Todos</option>
                    <option value="excellent">Excelente</option>
                    <option value="normal">Operativo</option>
                    <option value="requires_action">Alerta</option>
                    <option value="critical">Crítico (Falla)</option>
                  </select>

                  <select
                    id="client-filter-select"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="text-xs bg-[#0f0f0f] border border-zinc-850 focus:border-blue-500 rounded-xl px-3 py-2 text-zinc-300"
                  >
                    <option value="all">Filtro Cliente: Todos</option>
                    {adminSettings.clients.map(cli => (
                      <option key={cli} value={cli}>{cli}</option>
                    ))}
                  </select>

                  <button
                    id="export-excel-btn"
                    onClick={handleExportDataList}
                    disabled={totalReports === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-md uppercase tracking-wider cursor-pointer"
                    title="Exportar informes registrados a Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
                  </button>

                  {/* JSON Backup import */}
                  <label className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold cursor-pointer transition shadow-md uppercase tracking-wider">
                    <Upload className="w-4 h-4 text-blue-400" /> Importar (.json)
                    <input
                      id="json-backup-importer"
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleJSONBackupImport}
                    />
                  </label>
                </div>
              </div>

              {/* Data list grid table */}
              <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                <table id="reports-master-table" className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#121212] border-b border-zinc-800 text-zinc-500 font-extrabold uppercase tracking-wide">
                      <th className="px-4 py-3">Folio / Fecha</th>
                      <th className="px-4 py-3">Cliente / Sucursal</th>
                      <th className="px-4 py-3">Ficha de Equipo</th>
                      <th className="px-4 py-3">Técnico</th>
                      <th className="px-4 py-3 text-center">Calificación</th>
                      <th className="px-4 py-3 text-right">Acciones Expor. / Gestión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-16 text-center text-zinc-500 italic">
                          No se encontraron informes coincidentes con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((item) => (
                        <tr
                          id={`list-row-${item.id}`}
                          key={item.id}
                          className="border-b border-zinc-850 hover:bg-zinc-800/20 first:pt-2 transition-colors"
                        >
                          <td className="px-4 py-4.5 font-bold">
                            <span className="text-blue-400 block">{item.folio}</span>
                            <span className="text-[10px] text-zinc-500 font-medium">{item.date}</span>
                          </td>
                          <td className="px-4 py-4.5">
                            <span className="font-semibold block text-zinc-200">{item.clientName}</span>
                            <span className="text-[11px] text-zinc-500 block">{item.branchLocation}</span>
                          </td>
                          <td className="px-4 py-4.5">
                            <span className="font-semibold block text-zinc-200">{item.brand} - {item.model}</span>
                            <span className="text-[11px] text-zinc-500 block">{item.equipmentType} | {item.refrigerantType}</span>
                            <span className="text-[10px] text-zinc-600 block font-mono">
                              Corr: {item.correlativeLabel || (typeof item.correlative === "number" ? item.correlative.toString().padStart(4, "0") : "pendiente")}
                              {item.equipmentId ? ` | Equipo: ${item.equipmentId.slice(0, 8)}` : ""}
                            </span>
                          </td>
                          <td className="px-4 py-4.5 text-zinc-300 font-medium">
                            {item.technicianName}
                          </td>
                          <td className="px-4 py-4.5 text-center">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                              item.overallStatus === "excellent" ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50" :
                              item.overallStatus === "normal" ? "bg-blue-950/40 text-blue-400 border-blue-900/40" :
                              item.overallStatus === "requires_action" ? "bg-amber-950/40 text-amber-400 border-amber-900/40" :
                              "bg-rose-950/40 text-rose-400 border-rose-900/45"
                            }`}>
                              {item.overallStatus === "excellent" ? "Excelente" : item.overallStatus === "normal" ? "Operativo" : item.overallStatus === "requires_action" ? "Alerta" : "Crítico"}
                            </span>
                          </td>
                          <td className="px-4 py-4.5">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Preview/Visualizar button */}
                              <button
                                id={`row-view-btn-${item.id}`}
                                onClick={() => setViewingReport(item)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded border border-blue-500/20 font-bold text-[10px] cursor-pointer transition hover:scale-105 active:scale-95"
                                title="Visualizar informe completo interactivo"
                              >
                                <Eye className="w-3 h-3" /> Ver
                              </button>

                              {/* PDF exporter button */}
                              <button
                                id={`exp-pdf-${item.id}`}
                                onClick={async () => {
                                  await generatePDFReport(item, adminSettings.companyName, adminSettings.logo);
                                }}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-bold text-[10px] cursor-pointer"
                                title="Generar Informe PDF de Alta Definición A4"
                              >
                                PDF
                              </button>

                              {/* HTML exporter button */}
                              <button
                                id={`exp-html-${item.id}`}
                                onClick={() => exportReportAsHTML(item, adminSettings.companyName)}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-bold text-[10px] cursor-pointer"
                                title="Exportar Copia en Formato HTML Autocontenido"
                              >
                                HTML
                              </button>

                              {/* JSON backup button */}
                              <button
                                id={`exp-json-${item.id}`}
                                onClick={() => exportReportAsJSON(item)}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-bold text-[10px] cursor-pointer"
                                title="Exportar Respaldos JSON de Datos"
                              >
                                JSON
                              </button>

                              {/* Edit row */}
                              <button
                                id={`row-edit-view-${item.id}`}
                                onClick={() => {
                                  setActiveReport(item);
                                  setIsFormOpen(true);
                                }}
                                className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded cursor-pointer"
                                title="Editar informe"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete row */}
                              <button
                                id={`row-delete-btn-${item.id}`}
                                onClick={() => handleDeleteReport(item.id)}
                                className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded cursor-pointer"
                                title="Eliminar informe de base de datos local"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Admin databases configuration modal */}
      {isAdminOpen && (
        <AdminSettingsModal
          settings={adminSettings}
          onSave={async (updatedSettings) => {
            await saveAdminSettings(updatedSettings);
            setAdminSettings(updatedSettings);
          }}
          onClose={() => setIsAdminOpen(false)}
        />
      )}

      {/* Interactive Report View modal */}
      {viewingReport && (
        <ReportViewerModal
          report={viewingReport}
          adminSettings={adminSettings}
          onClose={() => setViewingReport(null)}
          onEdit={(rep) => {
            setActiveReport(rep);
            setIsFormOpen(true);
          }}
        />
      )}

      {/* Service Order Viewer modal */}
      {viewingServiceOrder && (
        <ServiceOrderViewerModal
          order={viewingServiceOrder}
          adminSettings={adminSettings}
          onClose={() => setViewingServiceOrder(null)}
          onEdit={(ot) => {
            setViewingServiceOrder(null);
            setActiveServiceOrder(ot);
            setIsServiceOrderFormOpen(true);
          }}
        />
      )}

      {/* Manual / Diagnostics Guide overlay modal */}
      {isManualOpen && (
        <div id="diagnostics-manual-backdrop" className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div id="diagnostics-manual" className="bg-[#18181b] w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-800">
            <div className="bg-[#121212] px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="font-extrabold text-sm text-zinc-100 block">Manual de Diagnóstico & Presiones HVAC</span>
              <button
                id="close-manual-btn"
                onClick={() => setIsManualOpen(false)}
                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-zinc-300 leading-relaxed scrollbar-thin">
              <h4 className="text-sm font-bold text-blue-400">Guía de Presiones de Trabajo de Refrigerantes HVAC</h4>
              <p className="text-zinc-400">Valores referenciales aproximados para temperatura ambiente promedio (25°C - 30°C):</p>
              
              <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#0f0f0f] font-bold border-b border-zinc-800 text-zinc-400">
                      <th className="p-2.5">Gas Refrigerante</th>
                      <th className="p-2.5">Presión Baja (Succión)</th>
                      <th className="p-2.5">Presión Alta (Descarga)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-850">
                      <td className="p-2.5 font-semibold text-zinc-200">R-410A (Ecológico)</td>
                      <td className="p-2.5 text-blue-400">110 - 130 PSI</td>
                      <td className="p-2.5 text-rose-455 text-rose-400">320 - 380 PSI</td>
                    </tr>
                    <tr className="border-b border-zinc-850">
                      <td className="p-2.5 font-semibold text-zinc-200">R-22 (Antiguo)</td>
                      <td className="p-2.5 text-blue-400">60 - 70 PSI</td>
                      <td className="p-2.5 text-rose-455 text-rose-400">220 - 260 PSI</td>
                    </tr>
                    <tr className="border-b border-zinc-850">
                      <td className="p-2.5 font-semibold text-zinc-200">R-134a (Chillers)</td>
                      <td className="p-2.5 text-blue-400">30 - 40 PSI</td>
                      <td className="p-2.5 text-rose-455 text-rose-400">140 - 185 PSI</td>
                    </tr>
                    <tr className="border-b border-zinc-850">
                      <td className="p-2.5 font-semibold text-zinc-200">R-407C / R-404A</td>
                      <td className="p-2.5 text-blue-400">70 - 85 PSI</td>
                      <td className="p-2.5 text-rose-455 text-rose-400">240 - 290 PSI</td>
                    </tr>
                  </tbody>
                </table>
              </div>
 
              <h4 className="text-sm font-bold text-blue-400 pt-2">Cálculos Avanzados de Termodinámica</h4>
              <div className="bg-[#0f0f0f] border border-zinc-800 p-4 rounded-xl space-y-2">
                <p><strong>Sobrecalentamiento (Superheat - SH):</strong> Es la diferencia entre la temperatura medida en la tubería de succión y la temperatura de saturación del refrigerante (LP en manómetro convertida a °C). SH Óptimo: <strong>5 K a 8 K</strong>.</p>
                <div className="pl-4 border-l-2 border-blue-500">
                  <span className="font-mono bg-zinc-950 text-blue-400 p-1 px-2 rounded">SH = Temp. Línea Succión - Temp. Saturación</span>
                </div>
                <p className="pt-2"><strong>Subenfriamiento (Subcooling - SC):</strong> Es la diferencia entre la temperatura de condensación saturada (HP convertida a temperatura) y la temperatura medida en la tubería líquida de salida del condensador. SC Óptimo: <strong>4 K a 7 K</strong>.</p>
                <div className="pl-4 border-l-2 border-emerald-500">
                  <span className="font-mono bg-zinc-950 text-emerald-400 p-1 px-2 rounded">SC = Temp. Saturación Alta - Temp. Línea Líquida</span>
                </div>
              </div>
            </div>
 
            <div className="bg-[#121212] border-t border-zinc-800 p-4 flex justify-end">
              <button
                id="close-manual-btn-bottom"
                onClick={() => setIsManualOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Button (floating fallback) */}
      <PWAInstallButton />

      {/* Modal Gestión de Usuarios (solo administrador/supervisor) */}
      {isUsersOpen && isAdmin && currentUser && (
        <UsersModal
          currentUserId={currentUser.userId}
          onClose={() => setIsUsersOpen(false)}
        />
      )}
    </div>
  );
}

// Minimal X component placeholder
function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
