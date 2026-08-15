import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Truck,
  Route,
  Clock,
  BarChart3,
  Fuel,
  Users,
  Compass,
  Bell,
  User,
  Calendar,
  Star,
  ArrowRight,
  TrendingUp,
  Settings,
  Gauge,
  HelpCircle,
  Play,
  Sun,
  Moon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  DollarSign,
  X,
  FileText,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import MapComponent from './components/MapComponent';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

const renderDot = (color) => (props) => {
  const { cx, cy, payload } = props;
  if (payload && (payload.isWeekly === undefined || payload.isWeekly === true)) {
    return (
      <circle cx={cx} cy={cy} r={2.5} stroke={color} strokeWidth={1.5} fill="#0f172a" />
    );
  }
  return null;
};

const MiniSparkline = ({ history, color }) => {
  const chartData = React.useMemo(() =>
    (history && history.length > 0 ? history : [0, 0, 0, 0, 0, 0, 0])
      .map((val, idx) => ({ idx, value: val })),
    [history]
  );

  return (
    <div className="w-full h-8 mt-2 opacity-70 hover:opacity-100 transition-opacity">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${color.replace('#', '')})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};


function LoginPage({ onLogin, darkMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      onLogin();
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
      {/* Background gradients for dark mode */}
      {darkMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse duration-[8s]" />
          <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-violet-500/10 blur-[120px] animate-pulse duration-[8s]" />
        </div>
      )}

      <div className={`w-full max-w-md p-8 rounded-2xl border backdrop-blur-md relative z-10 transition-all ${darkMode ? 'bg-slate-900/60 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'
        }`}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
            SILVIA
          </h1>
          <p className={`text-xs mt-2 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Sistema Inteligente de Liquidaciones, Viajes e Inteligencia Analítica
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              className={`w-full px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 border transition-all ${darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-650'
                : 'bg-slate-50 border-slate-250 text-slate-800 placeholder-slate-400'
                }`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 border transition-all ${darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-650'
                : 'bg-slate-50 border-slate-250 text-slate-800 placeholder-slate-400'
                }`}
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-semibold text-center animate-shake">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            Iniciar Sesión
          </button>
        </form>


      </div>
    </div>
  );
}

export default function App() {
  // Estados para datos de la API
  const [metrics, setMetrics] = useState({
    facturacion: { valor: 0, diff: '+0.0%' },
    utilidadNet: { valor: 0, diff: '+0.0%' },
    utilidadNetEstimada: { valor: 0, diff: '+0.0%' },
    viajes: { valor: 0, diff: '+0.0%' },
    toneladasSecas: { valor: 0, diff: '+0.0%' },
    combustible: { valor: 0, diff: '+0.0%' },
    consumoEspecif: { valor: 0, diff: '+0.0%' },
    viajesSinGuia: { valor: 0, diff: '+0.0%' }
  });

  const [vehicles, setVehicles] = useState([]);
  const [chartData, setChartData] = useState([
    { dia: '01/01', utilidad: 20000, combustible: 110, km: 500, viajes: 10 },
    { dia: '08/01', utilidad: 50000, combustible: 220, km: 1100, viajes: 25 },
    { dia: '15/01', utilidad: 32000, combustible: 150, km: 800, viajes: 18 },
    { dia: '22/01', utilidad: 45000, combustible: 190, km: 950, viajes: 22 },
    { dia: '29/01', utilidad: 28000, combustible: 130, km: 680, viajes: 15 }
  ]);

  const [topRoutes, setTopRoutes] = useState([
    { ruta: 'Cantera A -> Obra Los Portales', viajes: 68, utilidad_total: 45680, utilidad_promedio: 672 },
    { ruta: 'Cantera B -> Obra Alto Verde', viajes: 54, utilidad_total: 32140, utilidad_promedio: 595 },
    { ruta: 'Cantera A -> Obra San Juan', viajes: 45, utilidad_total: 24780, utilidad_promedio: 551 },
    { ruta: 'Cantera C -> Obra Santa Clara', viajes: 38, utilidad_total: 18920, utilidad_promedio: 498 },
    { ruta: 'Cantera B -> Obra El Sol', viajes: 32, utilidad_total: 15320, utilidad_promedio: 479 }
  ]);

  const [efficiency, setEfficiency] = useState({ mejores: [], peores: [] });

  // Estados del Formulario de Predicción
  const [origen, setOrigen] = useState('Cantera A - Lurín');
  const [destino, setDestino] = useState('Obra Los Portales - Ate');
  const [material, setMaterial] = useState('Arena Gruesa');
  const [toneladas, setToneladas] = useState('25');
  const [fechaHora, setFechaHora] = useState('2026-06-30T08:00');

  // Estado de los resultados de predicción
  const [predictionResult, setPredictionResult] = useState({
    eta: '42 min',
    combustible: '13.2 gal',
    utilidad: 'S/ 462',
    confianza: '87%',
    recomendacion: 'VQ-12 (BCI734)'
  });

  // Estado de conexión del backend
  const [backendActive, setBackendActive] = useState(false);

  // Filtros de UI
  const [filtroVehiculo, setFiltroVehiculo] = useState('Todos');
  const [groupMode, setGroupMode] = useState('Diario');
  const [selectedPeriod, setSelectedPeriod] = useState('2026-08');
  const [vehicleList, setVehicleList] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState([
    {
      id: 'welcome',
      title: 'Asistente Silvia',
      text: '¡Hola! Estoy muy feliz de ayudarte a gestionar y optimizar tu flota de vehículos hoy. 🚀',
      time: new Date().toLocaleTimeString(),
      type: 'info'
    }
  ]);
  const [activePreliqJobId, setActivePreliqJobId] = useState(null);
  const [preliqJobStatus, setPreliqJobStatus] = useState(null);

  // Polling para tareas de preliquidaciones en segundo plano
  useEffect(() => {
    if (!activePreliqJobId) return;
    if (preliqJobStatus && (preliqJobStatus.status === 'completed' || preliqJobStatus.status === 'failed' || preliqJobStatus.status === 'cancelled')) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/preliquidaciones/status/${activePreliqJobId}`);
        if (!response.ok) throw new Error('Error al consultar estado');
        const statusData = await response.json();

        setPreliqJobStatus(statusData);

        if (statusData.status === 'completed') {
          clearInterval(interval);
          const time = new Date().toLocaleTimeString();
          const completeNotif = {
            id: 'preliq_' + Date.now(),
            title: 'Análisis de Preliquidaciones',
            text: `El análisis ha finalizado con éxito. Se procesaron ${statusData.results.length} guías en ${statusData.elapsedTime}s.`,
            time,
            type: 'success',
            action: () => {
              setActiveTab('preliquidaciones');
            }
          };
          setNotifications(prev => [completeNotif, ...prev]);
          setUnreadNotifications(prev => prev + 1);
        } else if (statusData.status === 'failed') {
          clearInterval(interval);
          const time = new Date().toLocaleTimeString();
          const failNotif = {
            id: 'preliq_' + Date.now(),
            title: 'Fallo en Preliquidaciones',
            text: `Ocurrió un error al procesar el lote: ${statusData.error || 'Desconocido'}`,
            time,
            type: 'error',
            action: () => {
              setActiveTab('preliquidaciones');
            }
          };
          setNotifications(prev => [failNotif, ...prev]);
          setUnreadNotifications(prev => prev + 1);
        }
      } catch (err) {
        console.warn('Error polling preliq status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activePreliqJobId, preliqJobStatus]);

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('silvia_logged_in') === 'true';
  });

  const handleLogout = () => {
    const confirmLogout = window.confirm("¿Está seguro que desea cerrar sesión en la plataforma SILVIA?");
    if (confirmLogout) {
      localStorage.removeItem('silvia_logged_in');
      setIsLoggedIn(false);
    }
  };

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isOpenPeriod, setIsOpenPeriod] = useState(false);
  const [isOpenVehicle, setIsOpenVehicle] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Efecto para inicializar el chatbot de Gemini Agent Platform (Dialogflow CX)
  useEffect(() => {
    // Escuchar cargas útiles (payloads) de Dialogflow CX
    const handleCustomPayload = (event) => {
      console.log('[Gemini Agent] Payload recibido:', event.detail);
      const payload = event.detail?.payload;
      if (!payload) return;

      // Acción para centrar el mapa y seleccionar el vehículo
      if (payload.action === 'focus_vehicle') {
        console.log('[Gemini Agent] Solicitando enfocar vehículo:', payload.placa);
        setActiveTab('monitoreo');

        // Esperar a que se monte la vista de monitoreo e irradiar el evento
        setTimeout(() => {
          const focusEvent = new CustomEvent('focus-vehicle-on-map', {
            detail: {
              placa: payload.placa,
              lat: payload.lat,
              lng: payload.lng
            }
          });
          window.dispatchEvent(focusEvent);
        }, 500);
      }
    };

    window.addEventListener('df-custom-payload-received', handleCustomPayload);

    return () => {
      window.removeEventListener('df-custom-payload-received', handleCustomPayload);
    };
  }, []);

  // Efecto para obtener la lista de vehículos ordenada alfabéticamente
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch(`${API_BASE}/vehicles`);
        const json = await res.json();
        if (json.success) {
          setVehicleList(json.data);
        }
      } catch (err) {
        console.warn('Error al cargar placas de vehículos, usando fallback local.');
        setVehicleList([
          { id: 'VE-01', placa: 'VQ-08 (AFG456)' },
          { id: 'VE-02', placa: 'VQ-12 (BCI734)' },
          { id: 'VE-03', placa: 'VQ-19 (BEE245)' },
          { id: 'VE-04', placa: 'VQ-27 (BDP123)' },
          { id: 'VE-05', placa: 'VQ-31 (ABL875)' }
        ]);
      }
    };
    fetchVehicles();
  }, []);

  // Efecto para jalar datos desde el Backend de Node
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Test de conexión básica
        const resHealth = await fetch(`${API_BASE.replace('/api', '')}/health`);
        if (resHealth.ok) {
          setBackendActive(true);
        } else {
          setBackendActive(false);
        }

        // Obtener Métricas
        const resMetrics = await fetch(`${API_BASE}/metrics?periodo=${selectedPeriod}&vehiculo_id=${filtroVehiculo}`);
        const jsonMetrics = await resMetrics.json();
        if (jsonMetrics.success) setMetrics(jsonMetrics.data);

        // Obtener Gráficos
        const resCharts = await fetch(`${API_BASE}/charts/indicators?groupMode=${groupMode}`);
        const jsonCharts = await resCharts.json();
        if (jsonCharts.success) setChartData(jsonCharts.data);

        // Obtener Rutas Top
        const resRoutes = await fetch(`${API_BASE}/routes/top?periodo=${selectedPeriod}&vehiculo_id=${filtroVehiculo}`);
        const jsonRoutes = await resRoutes.json();
        if (jsonRoutes.success) setTopRoutes(jsonRoutes.data);

        // Obtener Eficiencias
        const resEff = await fetch(`${API_BASE}/vehicles/efficiency?periodo=${selectedPeriod}`);
        const jsonEff = await resEff.json();
        if (jsonEff.success) setEfficiency(jsonEff.data);
      } catch (err) {
        console.warn('Backend inactivo. Utilizando simulación del frontend.');
        setBackendActive(false);
      }
    };

    fetchData();
    // Refrescar métricas y tablas cada 30 segundos
    const metricsInterval = setInterval(fetchData, 30000);
    return () => clearInterval(metricsInterval);
  }, [groupMode, selectedPeriod, filtroVehiculo]);

  // Efecto para aplicar la clase dark-mode al elemento root del documento
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Efecto separado para el polleo de GPS en tiempo real
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const resPos = await fetch(`${API_BASE}/vehicles/positions`);
        const jsonPos = await resPos.json();
        if (jsonPos.success) {
          setVehicles(jsonPos.data);
        }
      } catch (err) {
        if (vehicles.length === 0) {
          setVehicles([
            { placa: 'VQ-12 (BCI734)', estado: 'En ruta', velocidad: 28, odometro: 46597.4, lat: -11.90469, lng: -77.05320 },
            { placa: 'VQ-31 (ABL875)', estado: 'En ruta', velocidad: 33, odometro: 48588.1, lat: -11.96924, lng: -77.08938 },
            { placa: 'VQ-08 (AFG456)', estado: 'Detenido', velocidad: 0, odometro: 55737.8, lat: -11.97852, lng: -77.10819 },
            { placa: 'VQ-27 (BDP123)', estado: 'carga/descarga', velocidad: 0, odometro: 49465.4, lat: -11.95346, lng: -77.09129 },
            { placa: 'VQ-19 (BEE245)', estado: 'garaje', velocidad: 0, odometro: 63967.6, lat: -11.98232, lng: -77.10820 }
          ]);
        } else {
          // Simular movimiento pseudoaleatorio localmente en el frontend si el backend no está
          setVehicles(prev => prev.map(v => {
            if (v.estado === 'En ruta') {
              const deltaLat = (Math.random() - 0.5) * 0.0005;
              const deltaLng = (Math.random() - 0.5) * 0.0005;
              return {
                ...v,
                lat: parseFloat((v.lat + deltaLat).toFixed(5)),
                lng: parseFloat((v.lng + deltaLng).toFixed(5)),
                velocidad: Math.floor(Math.random() * 40) + 15
              };
            }
            return v;
          }));
        }
      }
    };

    fetchPositions();
    const gpsInterval = setInterval(fetchPositions, 5000); // Polleo más rápido en front para suavidad (5s)
    return () => clearInterval(gpsInterval);
  }, [vehicles.length]);

  // Manejar el submit de la predicción
  const handlePredict = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origen, destino, material, toneladas })
      });
      const json = await res.json();
      if (json.success) {
        setPredictionResult(json.data);
      }
    } catch (err) {
      // Cálculo de predicción simulado localmente si falla el backend
      const tons = parseFloat(toneladas) || 20;
      const etaVal = Math.round(30 + (tons * 0.5));
      const fuelVal = (10 + (tons * 0.15)).toFixed(1);
      const utilVal = Math.round(500 - (tons * 2.5));

      setPredictionResult({
        eta: `${etaVal} min`,
        combustible: `${fuelVal} gal`,
        utilidad: `S/ ${utilVal}`,
        confianza: '87%',
        recomendacion: 'VQ-12 (BCI734)'
      });
    }
  };

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'Muy eficiente':
      case 'Eficiente':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Regular':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Bajo':
      case 'Crítico':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const pieData = React.useMemo(() => {
    const stateCounts = { ruta: 0, detenido: 0, carga: 0, descarga: 0, garaje: 0 };
    vehicles.forEach(v => {
      const status = (v.estado || '').toLowerCase().trim();
      if (status.includes('ruta') || status.includes('en ruta')) {
        stateCounts.ruta++;
      } else if (status.includes('detenido') || status.includes('stop')) {
        stateCounts.detenido++;
      } else if (status.includes('cantera') || status.includes('carga')) {
        if (status.includes('descarga')) {
          stateCounts.descarga++;
        } else {
          stateCounts.carga++;
        }
      } else if (status.includes('descarga') || status.includes('planta')) {
        stateCounts.descarga++;
      } else if (status.includes('garaje') || status.includes('inactivo')) {
        stateCounts.garaje++;
      } else {
        stateCounts.garaje++;
      }
    });

    const total = vehicles.length || 1;
    return [
      { name: 'En ruta', value: stateCounts.ruta, color: '#10b981', pct: ((stateCounts.ruta / total) * 100).toFixed(1) },
      { name: 'Detenidos', value: stateCounts.detenido, color: '#eab308', pct: ((stateCounts.detenido / total) * 100).toFixed(1) },
      { name: 'Carga', value: stateCounts.carga, color: '#0ea5e9', pct: ((stateCounts.carga / total) * 100).toFixed(1) },
      { name: 'Descarga', value: stateCounts.descarga, color: '#8b5cf6', pct: ((stateCounts.descarga / total) * 100).toFixed(1) },
      { name: 'Garaje', value: stateCounts.garaje, color: '#ef4444', pct: ((stateCounts.garaje / total) * 100).toFixed(1) }
    ];
  }, [vehicles]);

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={() => {
          localStorage.setItem('silvia_logged_in', 'true');
          setIsLoggedIn(true);
        }}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className={`flex flex-col lg:flex-row min-h-screen bg-bg-dark text-slate-300 transition-colors duration-300 ${darkMode ? 'dark-mode' : ''}`}>

      {/* Mobile Top Bar */}
      <div className={`lg:hidden flex items-center justify-between px-6 py-4 border-b sticky top-0 z-40 backdrop-blur-md transition-all duration-300 ${darkMode ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white/90 border-slate-200'
        }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`p-1.5 rounded-lg border text-slate-450 hover:text-slate-200 transition-colors duration-250 cursor-pointer ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            title="Abrir menú"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h1 className="text-base font-bold text-slate-100 tracking-tight leading-tight">SILVIA</h1>
              <span className="text-[9px] text-slate-500 font-semibold uppercase block">Analytics</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full ${backendActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
            }`}>
            <span className={`w-1 h-1 rounded-full ${backendActive ? 'bg-emerald-400' : 'bg-orange-400'}`}></span>
            {backendActive ? 'BQ' : 'Sim'}
          </span>
        </div>
      </div>

      {/* Mobile Sidebar Drawer Modal */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sidebar Drawer Container */}
          <div className={`relative w-64 max-w-xs flex flex-col justify-between p-5 h-full z-10 transition-transform duration-300 shadow-2xl ${darkMode ? 'bg-slate-950 border-r border-slate-905 text-slate-300' : 'bg-white border-r border-slate-200 text-slate-800'
            }`}>
            <div>
              {/* Logo & Close Button */}
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-2">
                  <Compass className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h1 className={`text-lg font-bold tracking-tight leading-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>SILVIA</h1>
                    <span className="text-[9px] text-slate-500 font-semibold uppercase">Analytics Portal</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-1.5 rounded-lg border cursor-pointer ${darkMode ? 'border-slate-800 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-505 hover:text-slate-800'
                    }`}
                  title="Cerrar menú"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Menu (Mobile) */}
              <nav className="space-y-4">
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 px-3 block">OPERACIÓN</span>
                <ul className="space-y-1.5">
                  <li>
                    <button
                      onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition cursor-pointer text-left ${activeTab === 'dashboard'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span>Resumen Ejecutivo</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => { setActiveTab('monitoreo'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition cursor-pointer text-left ${activeTab === 'monitoreo'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>Monitoreo</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => { setActiveTab('planning'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition cursor-pointer text-left ${activeTab === 'planning'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>Planificación de viajes</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => { setActiveTab('fuel-alerts'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition cursor-pointer text-left ${activeTab === 'fuel-alerts'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Alertas de combustible</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => { setActiveTab('preliquidaciones'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition cursor-pointer text-left ${activeTab === 'preliquidaciones'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>Carga de documentos</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => { setActiveTab('viajes'); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition cursor-pointer text-left ${activeTab === 'viajes'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                      <Route className="w-4 h-4 shrink-0" />
                      <span>Control de viajes</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Bottom Actions (Mobile) */}
            <div className="pt-4 border-t border-slate-800/80 space-y-1.5">

              {/* Notificaciones (Mobile) */}
              <button
                onClick={() => {
                  setShowNotification(!showNotification);
                  setShowUserMenu(false);
                  setUnreadNotifications(0);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition cursor-pointer text-left relative ${showNotification ? 'bg-slate-900/60 text-slate-200' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
              >
                <div className="relative">
                  <Bell className="w-4 h-4 shrink-0" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold">
                      {unreadNotifications}
                    </span>
                  )}
                </div>
                <span>Notificaciones</span>
              </button>

              {/* Contenido inline de notificaciones si está abierto (Mobile) */}
              {showNotification && (
                <div className="max-h-40 overflow-y-auto space-y-2 p-2 rounded bg-slate-900/40 border border-slate-800 text-left">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="text-[10px] space-y-0.5">
                      <span className="font-bold block">{notif.title}</span>
                      <p className="text-[9px] text-slate-400 leading-normal">{notif.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Configuración (Mobile) */}
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotification(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition cursor-pointer text-left ${showUserMenu ? 'bg-slate-900/60 text-slate-200' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Configuración</span>
              </button>

              {/* Selector de Tema inline si está abierto (Mobile) */}
              {showUserMenu && (
                <div className="p-2 rounded bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">Modo claro</span>
                  <div
                    onClick={() => setDarkMode(!darkMode)}
                    className="w-10 h-5 bg-slate-800 border border-slate-700 rounded-full relative cursor-pointer p-0.5 transition-all duration-300"
                  >
                    <div
                      style={{ left: darkMode ? '20px' : '2px' }}
                      className="w-3.5 h-3.5 bg-emerald-400 rounded-full absolute top-[2px] transition-all duration-300"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">Modo oscuro</span>
                </div>
              )}

              {/* Cerrar Sesión (Mobile) */}
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition cursor-pointer text-left text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. SIDEBAR (Panel izquierdo) */}
      <aside className={`border-r border-slate-800/80 bg-slate-950/40 backdrop-blur-md hidden lg:flex flex-col justify-between sticky top-0 h-screen shrink-0 transition-all duration-300 z-30 ${sidebarCollapsed ? 'w-20 p-4 items-center' : 'w-64 p-5'
        }`}>
        <div className="w-full">
          {/* Logo y Nombre */}
          <div className={`flex items-center gap-3 mb-8 px-2 justify-between ${sidebarCollapsed ? 'flex-col gap-4' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/15 p-2 rounded-lg text-emerald-400 border border-emerald-500/20 shrink-0">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-slate-100 tracking-tight leading-tight">SILVIA</h1>
                  <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Analytics Portal</span>
                </div>
              )}
            </div>

            {/* Collapse toggle button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
              title={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Menú de Navegación */}
          <nav className="space-y-6">
            <div>
              <span className={`text-[10px] uppercase font-bold tracking-widest text-slate-500 px-3 block mb-2 ${sidebarCollapsed ? 'text-center text-[8px]' : ''}`}>
                {sidebarCollapsed ? 'MENÚ' : 'OPERACIÓN'}
              </span>
              <ul className="space-y-1.5">
                <li>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition cursor-pointer text-left ${sidebarCollapsed ? 'justify-center p-2.5' : ''
                      } ${activeTab === 'dashboard'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    title={sidebarCollapsed ? "Resumen Ejecutivo" : ""}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Resumen Ejecutivo</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('monitoreo')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition cursor-pointer text-left ${sidebarCollapsed ? 'justify-center p-2.5' : ''
                      } ${activeTab === 'monitoreo'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    title={sidebarCollapsed ? "Monitoreo" : ""}
                  >
                    <MapPin className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Monitoreo</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('planning')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition cursor-pointer text-left ${sidebarCollapsed ? 'justify-center p-2.5' : ''
                      } ${activeTab === 'planning'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    title={sidebarCollapsed ? "Planificación de viajes" : ""}
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Planificación de viajes</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('fuel-alerts')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition cursor-pointer text-left ${sidebarCollapsed ? 'justify-center p-2.5' : ''
                      } ${activeTab === 'fuel-alerts'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    title={sidebarCollapsed ? "Alertas de combustible" : ""}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Alertas de combustible</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('preliquidaciones')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition cursor-pointer text-left ${sidebarCollapsed ? 'justify-center p-2.5' : ''
                      } ${activeTab === 'preliquidaciones'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    title={sidebarCollapsed ? "Carga de documentos" : ""}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Carga de documentos</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('viajes')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition cursor-pointer text-left ${sidebarCollapsed ? 'justify-center p-2.5' : ''
                      } ${activeTab === 'viajes'
                        ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    title={sidebarCollapsed ? "Control de viajes" : ""}
                  >
                    <Route className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span>Control de viajes</span>}
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Notificaciones, Configuración y Cerrar sesión */}
        <div className="pt-4 border-t border-slate-800/80 w-full space-y-1.5 relative">

          {/* Popover de Notificaciones */}
          {showNotification && (
            <div className={`absolute bottom-16 glass-panel p-4 rounded-xl border shadow-2xl z-55 animate-in fade-in slide-in-from-left-2 duration-200 ${sidebarCollapsed ? 'left-20 w-80' : 'left-64 w-80'
              } ${darkMode ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95 text-slate-800'}`}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-850">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-455 animate-pulse"></div>
                  <span className="text-xs font-bold">Notificaciones ({notifications.length})</span>
                </div>
                <button
                  onClick={() => {
                    setNotifications([{
                      id: 'welcome',
                      title: 'Asistente Silvia',
                      text: '¡Hola! Estoy muy feliz de ayudarte a gestionar y optimizar tu flota de vehículos hoy. 🚀',
                      time: new Date().toLocaleTimeString(),
                      type: 'info'
                    }]);
                    setUnreadNotifications(0);
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-350 cursor-pointer"
                >
                  Limpiar todo
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-3 pr-1 text-left">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`p-2.5 rounded-lg border space-y-1.5 ${darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold">{notif.title}</span>
                      <span className="text-[9px] text-slate-500">{notif.time}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{notif.text}</p>
                    {notif.action && (
                      <button
                        onClick={() => {
                          notif.action();
                          setShowNotification(false);
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-bold py-1 px-2 rounded transition cursor-pointer"
                      >
                        Revisar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popover de Configuración */}
          {showUserMenu && (
            <div className={`absolute bottom-12 glass-panel p-3.5 rounded-xl border shadow-2xl z-55 animate-in fade-in slide-in-from-left-2 duration-200 ${sidebarCollapsed ? 'left-20 w-64' : 'left-64 w-64'
              } ${darkMode ? 'border-slate-800 bg-slate-950/95 text-slate-300' : 'border-slate-200 bg-white/95 text-slate-800'}`}>
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Ajuste de Tema
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className={`text-[11px] transition-colors duration-200 ${!darkMode ? 'text-emerald-500 font-bold' : 'text-slate-500'}`}>
                    Modo claro
                  </span>

                  <div
                    onClick={() => setDarkMode(!darkMode)}
                    className="w-12 h-6 bg-slate-800 border border-slate-700 rounded-full relative cursor-pointer p-0.5 transition-all duration-300"
                  >
                    <div
                      style={{ left: darkMode ? '24px' : '3px' }}
                      className="w-4 h-4 bg-emerald-400 rounded-full shadow-md absolute top-[3px] transition-all duration-300 ease-out"
                    />
                  </div>

                  <span className={`text-[11px] transition-colors duration-200 ${darkMode ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                    Modo oscuro
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Botón Notificaciones */}
          <button
            onClick={() => {
              setShowNotification(!showNotification);
              setShowUserMenu(false);
              setUnreadNotifications(0);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition cursor-pointer text-left relative ${sidebarCollapsed ? 'justify-center p-2.5' : ''
              } ${showNotification ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}`}
            title={sidebarCollapsed ? "Notificaciones" : ""}
          >
            <div className="relative">
              <Bell className="w-4 h-4 shrink-0" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold">
                  {unreadNotifications}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 flex justify-between items-center">
                <span>Notificaciones</span>
                {unreadNotifications > 0 && (
                  <span className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold">
                    {unreadNotifications} nuevas
                  </span>
                )}
              </div>
            )}
          </button>

          {/* Botón Configuración */}
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotification(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition cursor-pointer text-left ${sidebarCollapsed ? 'justify-center p-2.5' : ''
              } ${showUserMenu ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}`}
            title={sidebarCollapsed ? "Configuración" : ""}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Configuración</span>}
          </button>

          {/* Botón Cerrar sesión */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition cursor-pointer text-left text-red-450 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 ${sidebarCollapsed ? 'justify-center p-2.5' : ''
              }`}
            title={sidebarCollapsed ? "Cerrar sesión" : ""}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Cerrar sesión</span>}
          </button>

        </div>
      </aside>

      {/* 2. MAIN CONTAINER (Contenido principal) */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8">
        {activeTab === 'dashboard' ? (
          <>
            {/* HEADER SUPERIOR */}
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/60 pb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">Dashboard Ejecutivo</h2>
                <p className="text-sm text-slate-500">Resumen general de la operación de Virgen de la Estrella SAC</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {/* Filtro de Periodo Mensual (Custom Dropdown) */}
                <div className="relative w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setIsOpenPeriod(!isOpenPeriod);
                      setIsOpenVehicle(false);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-slate-300 w-full sm:w-48 cursor-pointer hover:bg-slate-850 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {selectedPeriod === '2026-08' ? 'Agosto 2026 (Actual)' :
                          selectedPeriod === '2026-07' ? 'Julio 2026' :
                            selectedPeriod === '2026-06' ? 'Junio 2026' :
                              selectedPeriod === '2026-05' ? 'Mayo 2026' :
                                selectedPeriod === '2026-04' ? 'Abril 2026' :
                                  selectedPeriod === '2026-03' ? 'Marzo 2026' :
                                    selectedPeriod === '2026-02' ? 'Febrero 2026' : 'Enero 2026'}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[8px]">▼</span>
                  </button>

                  {isOpenPeriod && (
                    <div className="absolute left-0 mt-1 w-full sm:w-56 glass-panel py-1.5 rounded-xl border border-slate-800/80 shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                      {[
                        { val: '2026-08', label: 'Agosto 2026 (Actual)' },
                        { val: '2026-07', label: 'Julio 2026' },
                        { val: '2026-06', label: 'Junio 2026' },
                        { val: '2026-05', label: 'Mayo 2026' },
                        { val: '2026-04', label: 'Abril 2026' },
                        { val: '2026-03', label: 'Marzo 2026' },
                        { val: '2026-02', label: 'Febrero 2026' },
                        { val: '2026-01', label: 'Enero 2026' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          onClick={() => {
                            setSelectedPeriod(opt.val);
                            setIsOpenPeriod(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors ${selectedPeriod === opt.val
                            ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-500'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filtro de Vehículos (Custom Dropdown) */}
                <div className="relative w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setIsOpenVehicle(!isOpenVehicle);
                      setIsOpenPeriod(false);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-slate-300 w-full sm:w-56 cursor-pointer hover:bg-slate-850 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {filtroVehiculo === 'Todos' ? 'Todos los vehículos' :
                          (vehicleList.find(v => v.id === filtroVehiculo)?.placa || filtroVehiculo)}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[8px]">▼</span>
                  </button>

                  {isOpenVehicle && (
                    <div className="absolute left-0 mt-1 w-full sm:w-64 glass-panel py-1.5 rounded-xl border border-slate-800/80 shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        onClick={() => {
                          setFiltroVehiculo('Todos');
                          setIsOpenVehicle(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors ${filtroVehiculo === 'Todos'
                          ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-500'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                          }`}
                      >
                        Todos los vehículos
                      </button>
                      {vehicleList.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setFiltroVehiculo(v.id);
                            setIsOpenVehicle(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors ${filtroVehiculo === v.id
                            ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-500'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                            }`}
                        >
                          {v.placa}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* 3. ROW 1: CONTENEDORES DE KPIS (Logísticos a la izquierda, Administrativos a la derecha) */}
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">

              {/* Contenedor Logístico (Izquierda) */}
              <div className="xl:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between w-full">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                  Métricas Logísticas
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-5 gap-3 w-full">
                  {/* Viajes Realizados */}
                  <div className="glass-card p-3 rounded-xl border border-slate-800/40 flex flex-col justify-between min-h-[105px] w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate" title="Viajes Realizados">Viajes Realizados</span>
                      <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold text-slate-100">{metrics.viajes?.valor.toLocaleString()}</span>
                      <span className={`block text-[9px] ${metrics.viajes?.diff?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'} font-semibold mt-1`}>
                        {metrics.viajes?.diff?.startsWith('-') ? '▼' : '▲'} {metrics.viajes?.diff?.replace(/^[+-]/, '')}
                      </span>
                    </div>
                  </div>

                  {/* Toneladas Transportadas */}
                  <div className="glass-card p-3 rounded-xl border border-slate-800/40 flex flex-col justify-between min-h-[105px] w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate" title="Toneladas Transportadas">Ton. Transportadas</span>
                      <div className="w-7 h-7 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                        <Route className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold text-slate-100">{Math.round(metrics.toneladasSecas?.valor || 0).toLocaleString()} Tn</span>
                      <span className={`block text-[9px] ${metrics.toneladasSecas?.diff?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'} font-semibold mt-1`}>
                        {metrics.toneladasSecas?.diff?.startsWith('-') ? '▼' : '▲'} {metrics.toneladasSecas?.diff?.replace(/^[+-]/, '')}
                      </span>
                    </div>
                  </div>

                  {/* Gasto GNV */}
                  <div className="glass-card p-3 rounded-xl border border-slate-800/40 flex flex-col justify-between min-h-[105px] w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate" title="Gasto Combustible GNV">Gasto GNV</span>
                      <div className="w-7 h-7 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 shrink-0">
                        <Fuel className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold text-slate-100">S/ {Math.round(metrics.gastoGnv?.valor || 0).toLocaleString()}</span>
                      <span className={`block text-[9px] ${metrics.gastoGnv?.diff?.startsWith('-') ? 'text-emerald-400' : 'text-red-400'} font-semibold mt-1`}>
                        {metrics.gastoGnv?.diff?.startsWith('-') ? '▼' : '▲'} {metrics.gastoGnv?.diff?.replace(/^[+-]/, '')}
                      </span>
                    </div>
                  </div>

                  {/* Gasto Diesel */}
                  <div className="glass-card p-3 rounded-xl border border-slate-800/40 flex flex-col justify-between min-h-[105px] w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate" title="Gasto Combustible Diesel">Gasto Diesel</span>
                      <div className="w-7 h-7 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 shrink-0">
                        <Fuel className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold text-slate-100">S/ {Math.round(metrics.gastoDiesel?.valor || 0).toLocaleString()}</span>
                      <span className={`block text-[9px] ${metrics.gastoDiesel?.diff?.startsWith('-') ? 'text-emerald-400' : 'text-red-400'} font-semibold mt-1`}>
                        {metrics.gastoDiesel?.diff?.startsWith('-') ? '▼' : '▲'} {metrics.gastoDiesel?.diff?.replace(/^[+-]/, '')}
                      </span>
                    </div>
                  </div>

                  {/* Gasto Peajes */}
                  <div className="glass-card p-3 rounded-xl border border-slate-800/40 flex flex-col justify-between min-h-[105px] w-full col-span-2 sm:col-span-1 md:col-span-1 xl:col-span-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate" title="Gasto Peajes">Gasto Peajes</span>
                      <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                        <DollarSign className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold text-slate-100">S/ {Math.round(metrics.gastoPeajes?.valor || 0).toLocaleString()}</span>
                      <span className={`block text-[9px] ${metrics.gastoPeajes?.diff?.startsWith('-') ? 'text-emerald-400' : 'text-red-400'} font-semibold mt-1`}>
                        {metrics.gastoPeajes?.diff?.startsWith('-') ? '▼' : '▲'} {metrics.gastoPeajes?.diff?.replace(/^[+-]/, '')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenedor Administrativo (Derecha) */}
              <div className="xl:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between w-full">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  Métricas Administrativas
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                  {/* Facturación */}
                  <div className="glass-card p-3 rounded-xl border border-slate-800/40 flex flex-col justify-between min-h-[105px] w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate" title="Facturación">Facturación</span>
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                        <span className="font-bold text-xs">$</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold text-slate-100">S/ {Math.round(metrics.facturacion?.valor || 0).toLocaleString()}</span>
                      <span className={`block text-[9px] ${metrics.facturacion?.diff?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'} font-semibold mt-1`}>
                        {metrics.facturacion?.diff?.startsWith('-') ? '▼' : '▲'} {metrics.facturacion?.diff?.replace(/^[+-]/, '')}
                      </span>
                    </div>
                  </div>

                  {/* Utilidad Neta */}
                  <div className="glass-card p-3 rounded-xl border border-slate-800/40 flex flex-col justify-between min-h-[105px] w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate" title="Utilidad Neta">Utilidad Neta</span>
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold text-slate-100">S/ {Math.round(metrics.utilidadNet?.valor || 0).toLocaleString()}</span>
                      <span className={`block text-[9px] ${metrics.utilidadNet?.diff?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'} font-semibold mt-1`}>
                        {metrics.utilidadNet?.diff?.startsWith('-') ? '▼' : '▲'} {metrics.utilidadNet?.diff?.replace(/^[+-]/, '')}
                      </span>
                    </div>
                  </div>

                  {/* Utilidad Estimada */}
                  <div className="glass-card p-3 rounded-xl border border-slate-800/40 flex flex-col justify-between min-h-[105px] w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate" title="Utilidad Estimada">Utilidad Est.</span>
                      <div className="w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shrink-0">
                        <BarChart3 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold text-slate-100">S/ {Math.round(metrics.utilidadNetEstimada?.valor || 0).toLocaleString()}</span>
                      <span className={`block text-[9px] ${metrics.utilidadNetEstimada?.diff?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'} font-semibold mt-1`}>
                        {metrics.utilidadNetEstimada?.diff?.startsWith('-') ? '▼' : '▲'} {metrics.utilidadNetEstimada?.diff?.replace(/^[+-]/, '')}
                      </span>
                    </div>
                  </div>

                  {/* Por Facturar */}
                  <div className="glass-card p-3 rounded-xl border border-slate-800/40 flex flex-col justify-between min-h-[105px] w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-slate-500 truncate" title="Viajes Por Facturar">Por Facturar</span>
                      <div className="w-7 h-7 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center justify-center border border-yellow-500/20 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold text-slate-100">{metrics.porFacturar?.valor.toLocaleString()} vjs</span>
                      <span className={`block text-[9px] ${metrics.porFacturar?.diff?.startsWith('-') ? 'text-emerald-400' : 'text-red-400'} font-semibold mt-1`}>
                        {metrics.porFacturar?.diff?.startsWith('-') ? '▼' : '▲'} {metrics.porFacturar?.diff?.replace(/^[+-]/, '')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </section>

            {/* 4. ROW 2: MAP, FLEET DISTRIBUTION & KEY INDICATORS */}
            <section id="map" className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* A. MAPA (5 columnas) */}
              <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col h-[520px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping animate-duration-1000"></div>
                    <h3 className="text-sm font-semibold text-slate-200">Mapa en Tiempo Real</h3>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-medium px-2 py-0.5 rounded border border-emerald-500/20">En vivo</span>
                  </div>
                </div>

                {/* Contenedor del Mapa */}
                <div className="flex-1 min-h-0 relative">
                  <MapComponent vehicles={vehicles} darkMode={darkMode} />
                </div>

                {/* Leyenda del Mapa */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mt-4 text-[9px] sm:text-[10px] font-medium text-slate-400 text-center">
                  <div className="flex items-center justify-center gap-1 py-1.5 bg-slate-900/60 rounded border border-slate-800/40 px-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span> <span className="truncate">En ruta</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 py-1.5 bg-slate-900/60 rounded border border-slate-800/40 px-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"></span> <span className="truncate">Detenido</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 py-1.5 bg-slate-900/60 rounded border border-slate-800/40 px-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span> <span className="truncate">Carga</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 py-1.5 bg-slate-900/60 rounded border border-slate-800/40 px-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span> <span className="truncate">Descarga</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 py-1.5 bg-slate-900/60 rounded border border-slate-800/40 px-1.5 col-span-2 sm:col-span-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span> <span className="truncate">Garaje</span>
                  </div>
                </div>
              </div>

              {/* B. DISTRIBUCIÓN DE ESTADOS (3 columnas) */}
              <div className="lg:col-span-3 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col h-[520px] w-full">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-sm font-semibold text-slate-200">Distribución de Flota</h3>
                  <span className="text-[10px] bg-sky-500/15 text-sky-400 font-medium px-2 py-0.5 rounded border border-sky-500/20">GPS Real</span>
                </div>

                {/* Contenedor del Gráfico */}
                <div className="flex-1 min-h-0 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          borderColor: '#1e293b',
                          borderRadius: '8px',
                          color: '#f1f5f9',
                          fontSize: '11px',
                          borderWidth: '1px'
                        }}
                        itemStyle={{ color: '#f1f5f9' }}
                        formatter={(value, name, props) => [`${value} veh. (${props.payload.pct}%)`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Texto Central en la Dona */}
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-slate-100">{vehicles.length}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Flota Total</span>
                  </div>
                </div>

                {/* Leyenda Detallada */}
                <div className="space-y-2 mt-4 overflow-y-auto max-h-[220px] pr-1 shrink-0">
                  {pieData.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] py-1.5 px-2 bg-slate-900/35 rounded-lg border border-slate-800/40">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }}></span>
                        <span className="text-slate-300 font-medium">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono font-bold">{d.value} veh.</span>
                        <span className="text-emerald-400 font-mono font-bold">{d.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* C. INDICADORES CLAVE DIARIOS (4 columnas) */}
              <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col h-[520px]">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-sm font-semibold text-slate-200">Indicadores clave diarios</h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 font-medium px-2 py-0.5 rounded border border-slate-700/50">Día Completo</span>
                </div>

                {/* 5 Indicadores en cuadrícula */}
                <div className="grid grid-cols-2 gap-3.5 flex-1 min-h-0 overflow-y-auto pr-1">

                  {/* Indicador 1: Viajes Programados */}
                  <div className="bg-slate-900/35 border border-slate-800/60 rounded-xl p-3 flex flex-col justify-between h-[135px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Viajes Prog.</span>
                      <div className="w-6 h-6 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20 shrink-0">
                        <Route className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-1">
                      <span className="text-lg font-extrabold text-slate-100">
                        {metrics.viajesProgramados?.valor ? metrics.viajesProgramados.valor.toLocaleString() : '0'}
                      </span>
                      <span className={`text-[9px] font-semibold ${metrics.viajesProgramados?.diff?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {metrics.viajesProgramados?.diff ? `${metrics.viajesProgramados.diff.startsWith('-') ? '▼' : '▲'} ${metrics.viajesProgramados.diff.replace(/^[+-]/, '')}` : '0%'}
                      </span>
                    </div>
                    <MiniSparkline history={metrics.viajesProgramados?.history} color="#8b5cf6" />
                  </div>

                  {/* Indicador 2: Viajes Realizados Hoy */}
                  <div className="bg-slate-900/35 border border-slate-800/60 rounded-xl p-3 flex flex-col justify-between h-[135px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">Viajes Realizados</span>
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-1">
                      <span className="text-lg font-extrabold text-slate-100">
                        {metrics.volquetesActivos?.valor ? metrics.volquetesActivos.valor.toLocaleString() : '0'}
                      </span>
                      <span className={`text-[9px] font-semibold ${metrics.volquetesActivos?.diff?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {metrics.volquetesActivos?.diff ? `${metrics.volquetesActivos.diff.startsWith('-') ? '▼' : '▲'} ${metrics.volquetesActivos.diff.replace(/^[+-]/, '')}` : '0%'}
                      </span>
                    </div>
                    <MiniSparkline history={metrics.volquetesActivos?.history} color="#10b981" />
                  </div>

                  {/* Indicador 3: Toneladas Transportadas Hoy */}
                  <div className="bg-slate-900/35 border border-slate-800/60 rounded-xl p-3 flex flex-col justify-between h-[135px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate" title="Toneladas Transportadas">Ton. Transp.</span>
                      <div className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                        <BarChart3 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-1">
                      <span className="text-lg font-extrabold text-slate-100">
                        {metrics.dieselProyectadoVol?.valor ? `${metrics.dieselProyectadoVol.valor.toLocaleString()} Ton` : '0 Ton'}
                      </span>
                      <span className={`text-[9px] font-semibold ${metrics.dieselProyectadoVol?.diff?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {metrics.dieselProyectadoVol?.diff ? `${metrics.dieselProyectadoVol.diff.startsWith('-') ? '▼' : '▲'} ${metrics.dieselProyectadoVol.diff.replace(/^[+-]/, '')}` : '0%'}
                      </span>
                    </div>
                    <MiniSparkline history={metrics.dieselProyectadoVol?.history} color="#f97316" />
                  </div>

                  {/* Indicador 4: Productividad Promedio por Camión */}
                  <div className="bg-slate-900/35 border border-slate-800/60 rounded-xl p-3 flex flex-col justify-between h-[135px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate" title="Productividad Promedio">Prod. Prom.</span>
                      <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 shrink-0">
                        <Gauge className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-1">
                      <span className="text-lg font-extrabold text-sky-400">
                        {metrics.gnvProyectadoVol?.valor ? `${metrics.gnvProyectadoVol.valor.toLocaleString()} viajes/camión` : '0 viajes/camión'}
                      </span>
                      <span className={`text-[9px] font-semibold ${metrics.gnvProyectadoVol?.diff?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {metrics.gnvProyectadoVol?.diff ? `${metrics.gnvProyectadoVol.diff.startsWith('-') ? '▼' : '▲'} ${metrics.gnvProyectadoVol.diff.replace(/^[+-]/, '')}` : '0%'}
                      </span>
                    </div>
                    <MiniSparkline history={metrics.gnvProyectadoVol?.history} color="#0ea5e9" />
                  </div>

                  {/* Indicador 5: Facturación Estimada */}
                  <div className="bg-slate-900/35 border border-slate-800/60 rounded-xl p-3.5 flex flex-col justify-between h-[135px] col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Facturación Estimada Hoy</span>
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                        <DollarSign className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-1">
                      <span className="text-lg font-extrabold text-emerald-400">
                        {metrics.ahorroEstimado?.valor ? `S/ ${metrics.ahorroEstimado.valor.toLocaleString()}` : 'S/ 0'}
                      </span>
                      <span className={`text-[9px] font-semibold ${metrics.ahorroEstimado?.diff?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {metrics.ahorroEstimado?.diff ? `${metrics.ahorroEstimado.diff.startsWith('-') ? '▼' : '▲'} ${metrics.ahorroEstimado.diff.replace(/^[+-]/, '')}` : '0%'}
                      </span>
                    </div>
                    <MiniSparkline history={metrics.ahorroEstimado?.history} color="#10b981" />
                  </div>

                </div>
              </div>
            </section>

            {/* 5. ROW 3: TABLES (Top Routes & Vehicle Efficiency & Smart Recommendation) */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Top 5 Rutas (5 columnas) */}
              <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between h-[360px]">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">Top 5 Rutas por Utilidad (S/)</h3>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                          <th className="pb-2">Ruta</th>
                          <th className="pb-2 text-center">Viajes</th>
                          <th className="pb-2 text-right">Utilidad Total</th>
                          <th className="pb-2 text-right">Utilidad Prom.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {topRoutes.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-2.5 font-medium text-slate-200">{row.ruta}</td>
                            <td className="py-2.5 text-center text-slate-300 font-semibold">{row.viajes}</td>
                            <td className="py-2.5 text-right text-emerald-400 font-bold">S/ {(row.utilidad_total || 0).toLocaleString()}</td>
                            <td className="py-2.5 text-right text-slate-400 font-medium">S/ {(row.utilidad_promedio || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Rentabilidad de Vehículos (7 columnas) */}
              <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between h-[360px]">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">Rentabilidad de Vehículos (S/)</h3>

                  <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">

                    {/* Columna 1: 5 Mejores */}
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">★ 5 Mejores Volquetes</h4>
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-800 text-[9px] text-slate-500 uppercase tracking-wider">
                              <th className="pb-1">Vehículo</th>
                              <th className="pb-1 text-center">Viajes</th>
                              <th className="pb-1 text-right">Ganancia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {(efficiency.mejores || []).map((row, i) => (
                              <tr key={i} className="hover:bg-slate-900/30 transition-colors">
                                <td className="py-1.5 font-medium text-slate-200">{row.vehiculo}</td>
                                <td className="py-1.5 text-center text-slate-300 font-semibold">{row.viajes}</td>
                                <td className="py-1.5 text-right text-emerald-400 font-bold">
                                  S/ {(row.ganancia || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Columna 2: 5 Peores (Con Viajes) */}
                    <div>
                      <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">⚠ 5 Peores Volquetes (Con Viajes)</h4>
                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-800 text-[9px] text-slate-500 uppercase tracking-wider">
                              <th className="pb-1">Vehículo</th>
                              <th className="pb-1 text-center">Viajes</th>
                              <th className="pb-1 text-right">Ganancia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {(efficiency.peores || []).map((row, i) => (
                              <tr key={i} className="hover:bg-slate-900/30 transition-colors">
                                <td className="py-1.5 font-medium text-slate-200">{row.vehiculo}</td>
                                <td className="py-1.5 text-center text-slate-300 font-semibold">{row.viajes}</td>
                                <td className="py-1.5 text-right text-red-400 font-bold">
                                  S/ {(row.ganancia || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </section>


          </>
        ) : activeTab === 'monitoreo' ? (
          <MonitoringView API_BASE={API_BASE} darkMode={darkMode} />
        ) : activeTab === 'fuel-alerts' ? (
          <FuelAlertsView API_BASE={API_BASE} darkMode={darkMode} />
        ) : activeTab === 'preliquidaciones' ? (
          <PreliquidacionesView
            API_BASE={API_BASE}
            activePreliqJobId={activePreliqJobId}
            setActivePreliqJobId={setActivePreliqJobId}
            preliqJobStatus={preliqJobStatus}
            setPreliqJobStatus={setPreliqJobStatus}
            darkMode={darkMode}
          />
        ) : activeTab === 'viajes' ? (
          <ViajesView API_BASE={API_BASE} darkMode={darkMode} />
        ) : (
          <PlanningView API_BASE={API_BASE} />
        )}
      </main>

      {/* Chatbot de Gemini Agent Platform (Dialogflow CX Messenger) */}
      <df-messenger
        location="us-central1"
        project-id="project-silvia-500416"
        agent-id="61992101-926c-4468-a2a6-95931860fecc"
        language-code="es"
      >
        <df-messenger-chat-bubble chat-title="Asistente SILVIA"></df-messenger-chat-bubble>
      </df-messenger>
    </div>
  );
}

// ==========================================
// COMPONENTE AUXILIAR: PLANIFICACIÓN DE VIAJES
// ==========================================
function PlanningView({ API_BASE }) {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }));
  const [orders, setOrders] = useState([
    { cantera: 'YERBABUENA', planta: 'COLLIQUE', material: 'ARENA', volumen_m3: 175, prioridad: false }
  ]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  // Metadatos dinámicos cargados de BigQuery (ordenados alfabéticamente)
  const [materialsList, setMaterialsList] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);

  // Estado para rastrear qué celda tiene el menú desplegable abierto: { rowIdx, field }
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Estados para filtros de la tabla de asignación final
  const [filterZonaInicio, setFilterZonaInicio] = useState('ALL');
  const [filterAsigStatus, setFilterAsigStatus] = useState('ALL');
  const [showOtherVehicles, setShowOtherVehicles] = useState(false);

  // Escuchar clics fuera para cerrar menús desplegables
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.relative')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const loadExistingPlanning = async (selectedDate) => {
    setLoading(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`${API_BASE}/planning/load?date=${selectedDate}`);
      const json = await res.json();
      if (json.success) {
        if (json.exists) {
          setOrders(json.data.orders);
          setResults({
            assignments: json.data.assignments,
            demandSummary: json.data.demandSummary,
            deficits: json.data.deficits,
            drivers: json.data.drivers || []
          });
          setMessage('Planificación cargada correctamente desde BigQuery.');
          setSaveStatus('success');
        } else {
          setResults(null);
          setOrders([{ cantera: 'SAN LORENZO', planta: 'COLLIQUE', material: 'ARENA', volumen_m3: 100, prioridad: false }]);
        }
      }
    } catch (err) {
      console.error('Error al cargar planificación existente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`${API_BASE}/planning/metadata`);
        const json = await res.json();
        if (json.success) {
          setMaterialsList(json.data.materials || []);
          setLocationsList(json.data.locations || []);
          setDriversList(json.data.drivers || []);
        }

        const vehRes = await fetch(`${API_BASE}/vehicles`);
        const vehJson = await vehRes.json();
        if (vehJson.success) {
          setAllVehicles(vehJson.data || []);
        }
      } catch (err) {
        console.error('Error al cargar metadatos de planificación:', err);
      }
    };
    fetchMetadata();
    // loadExistingPlanning(date);
  }, [API_BASE]);

  const openMenu = (e, idx, field, options, onSelect = null, currentVal = null) => {
    e.stopPropagation();
    const container = document.getElementById('planning-view-root');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = e.currentTarget.getBoundingClientRect();

    setActiveDropdown({
      rowIdx: idx,
      field: field,
      x: btnRect.left - containerRect.left,
      y: btnRect.bottom - containerRect.top,
      width: btnRect.width,
      options: options,
      onSelect: onSelect,
      currentVal: currentVal !== null ? currentVal : (orders[idx] ? orders[idx][field] : null)
    });
  };

  // Cargar plantillas de demostración
  const loadTemplate = (day) => {
    setSaveStatus(null);
    setResults(null);
    if (day === 2) {
      setDate('2026-07-02');
      setOrders([
        { cantera: 'YERBABUENA', planta: 'COLLIQUE', material: 'CLINKER', volumen_m3: 175, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'COLLIQUE', material: 'DESMONTE', volumen_m3: 400, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'OQUENDO', material: 'DESMONTE', volumen_m3: 100, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'OQUENDO', material: 'DESMONTE', volumen_m3: 75, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'MEIGGS', material: 'DESMONTE', volumen_m3: 150, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'MATERIALES', material: 'ARENA', volumen_m3: 250, prioridad: false }
      ]);
    } else if (day === 4) {
      setDate('2026-07-04');
      setOrders([
        { cantera: 'YERBABUENA', planta: 'COLLIQUE', material: 'CLINKER', volumen_m3: 300, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'COLLIQUE', material: 'DESMONTE', volumen_m3: 250, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'MEIGGS', material: 'ARENA', volumen_m3: 200, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'MEIGGS', material: 'OVERFINO', volumen_m3: 25, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'MATERIALES', material: 'ARENA', volumen_m3: 200, prioridad: false }
      ]);
    } else if (day === 6) {
      setDate('2026-07-06');
      setOrders([
        { cantera: 'YERBABUENA', planta: 'COLLIQUE', material: 'CLINKER', volumen_m3: 400, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'MEIGGS', material: 'ARENA', volumen_m3: 175, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'MEIGGS', material: 'OVERFINO', volumen_m3: 25, prioridad: false },
        { cantera: 'SAN LORENZO', planta: 'MEIGGS', material: 'DESMONTE', volumen_m3: 150, prioridad: false }
      ]);
    }
  };

  const handleAddOrder = () => {
    setOrders([...orders, { cantera: 'SAN LORENZO', planta: 'OQUENDO', material: 'ARENA', volumen_m3: 100, prioridad: false }]);
  };

  const handleRemoveOrder = (idx) => {
    const newOrders = orders.filter((_, i) => i !== idx);
    setOrders(newOrders);
  };

  const handleOrderChange = (idx, field, val) => {
    const newOrders = [...orders];
    newOrders[idx][field] = val;
    setOrders(newOrders);
  };

  const handleCalculate = async () => {
    setLoading(true);
    setSaveStatus(null);
    setResults(null);
    try {
      const res = await fetch(`${API_BASE}/planning/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders, date })
      });
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
      } else {
        setMessage('Error al calcular la distribución: ' + json.error);
        setSaveStatus('error');
      }
    } catch (err) {
      setMessage('Error de red al procesar asignaciones: ' + err.message);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!results) return;

    // 1. Validar excesos y déficits para Yerbabuena y San Lorenzo
    const warnings = [];

    Object.keys(results.demandSummary).forEach(cantera => {
      const cantUpper = cantera.toUpperCase().trim();
      if (cantUpper !== 'YERBABUENA' && cantUpper !== 'SAN LORENZO') return;

      const reqTons = results.demandSummary[cantera] || 0;
      const assignedTons = results.assignments
        .filter(a => a.id !== '' && !a.isPreviousAssignment && (a.zona_inicio || '').toUpperCase().trim() === cantUpper)
        .reduce((sum, a) => sum + ((parseInt(a.viajes_asignados) || 0) * (parseFloat(a.capacidad_toneladas) || 30.0)), 0);

      const reqM3 = parseFloat((reqTons / 1.55).toFixed(1));
      const asigM3 = parseFloat((assignedTons / 1.55).toFixed(1));

      const diffM3 = asigM3 - reqM3;
      // Tolerancia pequeña para diferencias de redondeo (ej. 1.0 m3)
      if (diffM3 > 1.0) {
        warnings.push(`- ${cantera}: Exceso de +${diffM3.toFixed(1)} M³ (Solicitado: ${reqM3} M³, Asignado: ${asigM3} M³)`);
      } else if (diffM3 < -1.0) {
        warnings.push(`- ${cantera}: Déficit de ${diffM3.toFixed(1)} M³ (Solicitado: ${reqM3} M³, Asignado: ${asigM3} M³)`);
      }
    });

    if (warnings.length > 0) {
      const confirmSave = window.confirm(
        `⚠️ Alertas de Balance de Carga Detectadas:\n\n${warnings.join('\n')}\n\n¿Está seguro de que desea continuar y guardar el plan con estos balances?`
      );
      if (!confirmSave) {
        return; // Cancelar el guardado
      }
    }


    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/planning/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders, assignments: results.assignments, date })
      });
      const json = await res.json();
      if (json.success) {
        setOrders([{ cantera: 'YERBABUENA', planta: 'COLLIQUE', material: 'ARENA', volumen_m3: 175, prioridad: false }]);
        setResults(null);
        setMessage('Pedido guardado con éxito.');
        setSaveStatus('success');
      } else {
        setMessage('Error al persistir planificación: ' + json.error);
        setSaveStatus('error');
      }
    } catch (err) {
      setMessage('Error de comunicación: ' + err.message);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const getCanteraForPlant = (plantName) => {
    const ord = orders.find(o => (o.planta || '').toUpperCase().trim() === (plantName || '').toUpperCase().trim());
    if (ord) return (ord.cantera || '').toUpperCase().trim();
    return 'YERBABUENA'; // Fallback por defecto si no hay orden activa
  };



  const updateAssignmentsAndRecalculate = (updatedAssignments) => {
    const newDeficits = {};
    Object.keys(results.demandSummary).forEach(cantera => {
      const demand = results.demandSummary[cantera];
      const capacity = updatedAssignments
        .filter(a => a.id !== '' && !a.isPreviousAssignment && (a.zona_inicio || '').toUpperCase().trim() === cantera.toUpperCase().trim())
        .reduce((sum, a) => sum + ((parseInt(a.viajes_asignados) || 0) * (parseFloat(a.capacidad_toneladas) || 30.0)), 0);
      newDeficits[cantera] = parseFloat(Math.max(0, demand - capacity).toFixed(2));
    });
    setResults({
      ...results,
      assignments: updatedAssignments,
      deficits: newDeficits
    });
  };


  const handleAssignVehicleChange = (idx, selectedId) => {
    const oldVehicleId = results.assignments[idx].id;
    let updated = [...results.assignments];

    // 1. Devolver el vehículo anterior a reservas si existía
    if (oldVehicleId && oldVehicleId !== '') {
      const oldV = allVehicles.find(item => item.id === oldVehicleId);
      if (oldV) {
        updated.push({
          id: oldV.id,
          placa: oldV.placa,
          capacidad_toneladas: parseFloat(oldV.capacidad_toneladas) || 30.0,
          zona_base: oldV.zona_base,
          zona_actual: oldV.zona_actual,
          rotacion_permitida: oldV.rotacion_permitida,
          viajes_asignados: 0,
          estado_asignacion: 'RESERVA',
          cantera_trabajo: null,
          material: '',
          zona_inicio: oldV.zona_actual || oldV.zona_base || 'YERBABUENA',
          conductor_id: oldV.conductor_id || '-',
          conductor_nombre: oldV.conductor_nombre || 'Por Asignar'
        });
      }
    }

    // 2. Si se selecciona vacío, limpiar esta fila manual
    if (selectedId === '') {
      updated[idx] = {
        ...updated[idx],
        id: '',
        placa: '',
        capacidad_toneladas: 0,
        zona_inicio: 'YERBABUENA',
        cantera_trabajo: '',
        viajes_asignados: 0,
        estado_asignacion: 'RESERVA',
        material: '',
        conductor_id: '-',
        conductor_nombre: 'Por Asignar'
      };
      updateAssignmentsAndRecalculate(updated);
      return;
    }

    // 3. Obtener metadatos del nuevo vehículo
    const v = allVehicles.find(item => item.id === selectedId);
    if (!v) return;

    const currentCanteras = Array.from(new Set(orders.map(o => (o.planta || '').toUpperCase().trim()).filter(Boolean)));
    const defaultDest = currentCanteras[0] || '';
    const matchingOrder = orders.find(o => (o.planta || '').toUpperCase().trim() === defaultDest);
    const defaultMaterial = matchingOrder ? matchingOrder.material : '';

    let fallbackZona = v.zona_actual || v.zona_base || 'YERBABUENA';
    if (fallbackZona !== 'YERBABUENA' && fallbackZona !== 'SAN LORENZO') {
      fallbackZona = 'YERBABUENA';
    }

    // 4. Asignar el vehículo a la fila manual
    updated[idx] = {
      ...updated[idx],
      id: v.id,
      placa: v.placa,
      capacidad_toneladas: parseFloat(v.capacidad_toneladas) || 30.0,
      zona_inicio: fallbackZona,
      cantera_trabajo: defaultDest,
      viajes_asignados: defaultDest ? 1 : 0,
      estado_asignacion: 'LOCAL',
      material: defaultMaterial,
      conductor_id: v.conductor_id || '-',
      conductor_nombre: v.conductor_nombre || 'Por Asignar'
    };

    // 5. Remover la fila de reserva duplicada para el nuevo vehículo de la lista
    updated = updated.filter((x, i) => !(x.id === v.id && i !== idx && !x.manualOrder));

    updateAssignmentsAndRecalculate(updated);
  };


  const handleAssignCanteraChange = (idx, targetCantera) => {
    const updated = [...results.assignments];
    const isSpecialZone = targetCantera === 'JICAMARCA' || targetCantera === 'FLOR DE NIEVE';

    // Al cambiar la planta, actualizamos el material por defecto asociado a ese flete
    const matchingOrder = orders.find(o => (o.planta || '').toUpperCase().trim() === (targetCantera || '').toUpperCase().trim());
    const defaultMaterial = matchingOrder ? matchingOrder.material : '';

    const startCan = (updated[idx].zona_inicio || '').toUpperCase().trim();
    const targetCan = getCanteraForPlant(targetCantera).toUpperCase().trim();

    const actualTransfer = targetCantera && startCan !== targetCan && !isSpecialZone;
    const newStatus = targetCantera
      ? (isSpecialZone ? 'LOCAL' : (actualTransfer ? 'TRANSFERIDO' : 'LOCAL'))
      : 'RESERVA';

    updated[idx] = {
      ...updated[idx],
      cantera_trabajo: targetCantera || null,
      estado_asignacion: newStatus,
      viajes_asignados: targetCantera ? (updated[idx].viajes_asignados || 1) : 0,
      material: defaultMaterial
    };
    updateAssignmentsAndRecalculate(updated);
  };


  const handleAssignTripsChange = (idx, trips) => {
    const updated = [...results.assignments];
    updated[idx] = {
      ...updated[idx],
      viajes_asignados: parseInt(trips) || 0
    };
    updateAssignmentsAndRecalculate(updated);
  };

  const handleAssignMaterialChange = (idx, material) => {
    const updated = [...results.assignments];
    updated[idx] = {
      ...updated[idx],
      material: material
    };
    updateAssignmentsAndRecalculate(updated);
  };

  const handleAssignZonaInicioChange = (idx, zona) => {
    const updated = [...results.assignments];
    updated[idx] = {
      ...updated[idx],
      zona_inicio: zona
    };
    updateAssignmentsAndRecalculate(updated);
  };

  const handleRemoveAssignment = (idx) => {
    const targetRow = results.assignments[idx];
    if (targetRow.id === '') {
      // Fila vacía se elimina completamente de la lista de asignaciones
      const updated = results.assignments.filter((_, i) => i !== idx);
      updateAssignmentsAndRecalculate(updated);
      return;
    }

    if (targetRow.manualOrder) {
      // Si es manual, se elimina la fila completamente de la tabla superior
      const updated = results.assignments.filter((_, i) => i !== idx);

      // Devolvemos el camión a las reservas
      const v = allVehicles.find(item => item.id === targetRow.id);
      if (v) {
        updated.push({
          id: v.id,
          placa: v.placa,
          capacidad_toneladas: parseFloat(v.capacidad_toneladas) || 30.0,
          zona_base: v.zona_base,
          zona_actual: v.zona_actual,
          rotacion_permitida: v.rotacion_permitida,
          viajes_asignados: 0,
          estado_asignacion: 'RESERVA',
          cantera_trabajo: null,
          material: '',
          zona_inicio: v.zona_actual || v.zona_base || 'YERBABUENA',
          conductor_id: v.conductor_id || '-',
          conductor_nombre: v.conductor_nombre || 'Por Asignar'
        });
      }
      updateAssignmentsAndRecalculate(updated);
      return;
    }

    // Si es una asignación calculada original, la liberamos a reserva
    const updated = [...results.assignments];
    updated[idx] = {
      ...updated[idx],
      cantera_trabajo: null,
      viajes_asignados: 0,
      estado_asignacion: 'RESERVA',
      material: ''
    };
    updateAssignmentsAndRecalculate(updated);
  };

  const handleAssignConductorChange = (idx, selectedDriverId) => {
    const updated = [...results.assignments];
    const target = updated[idx];
    if (selectedDriverId === '-') {
      target.conductor_id = '-';
      target.conductor_nombre = 'Por Asignar';
    } else {
      const activeDrivers = results?.drivers || driversList || [];
      const d = activeDrivers.find(x => x.id === selectedDriverId);
      if (d) {
        target.conductor_id = d.id;
        target.conductor_nombre = d.nombre;
      }
    }
    setResults({ ...results, assignments: updated });
  };

  const getAvailableDriversForAssignment = (currentRowIdx) => {
    const activeDrivers = results?.drivers || driversList || [];

    // 1. Obtener IDs de conductores asignados en otras filas de vehículos
    const assignedOtherIds = new Set(
      results.assignments
        .filter((a, i) => i !== currentRowIdx && a.id && a.id !== '' && a.conductor_id && a.conductor_id !== '-')
        .map(a => a.conductor_id)
    );

    // 2. Filtrar lista de conductores disponibles
    const available = activeDrivers.filter(d => {
      return !assignedOtherIds.has(d.id);
    });

    return [
      { val: '-', label: 'Por Asignar' },
      ...available.map(d => ({ val: d.id, label: d.nombre }))
    ];
  };


  const handleAddAssignment = () => {
    const newAssign = {
      id: '',
      placa: '',
      capacidad_toneladas: 0,
      zona_inicio: 'YERBABUENA',
      cantera_trabajo: '',
      viajes_asignados: 0,
      estado_asignacion: 'RESERVA',
      material: '',
      isManual: true,
      manualOrder: Date.now() + Math.random(),
      conductor_id: '-',
      conductor_nombre: 'Por Asignar'
    };

    let currentAssignments = [];
    let demandSummary = {};
    let deficits = {};

    if (results) {
      currentAssignments = results.assignments || [];
      demandSummary = results.demandSummary || {};
      deficits = results.deficits || {};
    } else {
      // Inicializar resultados si aún no se ha calculado el plan de forma automática
      allVehicles.forEach(v => {
        currentAssignments.push({
          id: v.id,
          placa: v.placa,
          capacidad_toneladas: parseFloat(v.capacidad_toneladas) || 30.0,
          zona_inicio: v.zona_actual || v.zona_base || 'YERBABUENA',
          cantera_trabajo: null,
          viajes_asignados: 0,
          estado_asignacion: 'RESERVA',
          material: '',
          conductor_id: v.conductor_id || '-',
          conductor_nombre: v.conductor_nombre || 'Por Asignar'
        });
      });
      orders.forEach(o => {
        const cantera = (o.cantera || '').toUpperCase().trim();
        const vol = parseFloat(o.volumen_m3) || 0;
        const tons = parseFloat((vol * 1.55).toFixed(2));
        demandSummary[cantera] = (demandSummary[cantera] || 0) + tons;
        deficits[cantera] = (deficits[cantera] || 0) + tons;
      });
    }

    const updated = [...currentAssignments, newAssign];
    setResults({
      assignments: updated,
      demandSummary,
      deficits
    });
  };

  return (
    <div id="planning-view-root" className="space-y-6 relative animate-in fade-in duration-300">
      {/* Header Planificación */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Planificación de Viajes</h2>
          <p className="text-sm text-slate-500">Registra pedidos de flete, calcula demandas e integra reglas de rotación de flota y pernoctes automáticos.</p>
        </div>
      </div>

      {/* Formulario de Carga */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-base font-bold text-slate-200">1. Registro de Pedidos</h3>
        </div>

        {/* Tabla Editable de Pedidos */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[900px] text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-2">Cantera</th>
                <th className="py-3 px-2">Material</th>
                <th className="py-3 px-2">Planta Destino</th>
                <th className="py-3 px-2 text-center">Prioridad</th>
                <th className="py-3 px-2 text-right">Volumen (M3)</th>
                <th className="py-3 px-2 text-right">Tons. Estimadas (x1.55)</th>
                <th className="py-3 px-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {orders.map((o, idx) => (
                <tr key={idx} className="hover:bg-slate-900/10">
                  <td className="py-2.5 px-2">
                    {/* Cantera - Custom Dropdown Button */}
                    <button
                      type="button"
                      onClick={(e) => openMenu(e, idx, 'cantera', [
                        { val: 'JICAMARCA', label: 'Jicamarca' },
                        { val: 'YERBABUENA', label: 'Yerbabuena' },
                        { val: 'SAN LORENZO', label: 'San Lorenzo' },
                        { val: 'FLOR DE NIEVE', label: 'Flor de Nieve' }
                      ])}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-full min-w-[120px] flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-850 transition"
                    >
                      <span>{o.cantera ? (o.cantera.charAt(0) + o.cantera.slice(1).toLowerCase()) : 'Seleccione'}</span>
                      <span className="text-slate-500 text-[8px]">▼</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-2">
                    {/* Material - Custom Dropdown Button */}
                    <button
                      type="button"
                      onClick={(e) => openMenu(e, idx, 'material', materialsList.map(m => ({ val: m, label: m })))}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-44 min-w-[160px] flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-850 transition-colors"
                    >
                      <span className="truncate">{o.material || 'Seleccione Material'}</span>
                      <span className="text-slate-500 text-[8px]">▼</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-2">
                    {/* Planta Destino - Custom Dropdown Button */}
                    <button
                      type="button"
                      onClick={(e) => openMenu(e, idx, 'planta', locationsList.map(l => ({ val: l, label: l })))}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-44 min-w-[160px] flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-850 transition-colors"
                    >
                      <span className="truncate">{o.planta || 'Seleccione Planta'}</span>
                      <span className="text-slate-500 text-[8px]">▼</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!o.prioridad}
                      onChange={(e) => handleOrderChange(idx, 'prioridad', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 text-emerald-500 bg-slate-900 focus:ring-0 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <input
                      type="number"
                      value={o.volumen_m3}
                      onChange={(e) => handleOrderChange(idx, 'volumen_m3', parseFloat(e.target.value) || 0)}
                      className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 text-right w-24 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-400 font-medium">
                    {((o.volumen_m3 || 0) * 1.55).toFixed(1)} Tn
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      onClick={() => handleRemoveOrder(idx)}
                      className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mt-4">
          <button
            onClick={handleAddOrder}
            className="flex items-center justify-center gap-1.5 border border-slate-800 hover:bg-slate-900/50 text-slate-300 text-xs font-semibold px-3 py-2.5 rounded-lg transition cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Agregar Fila
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900/40 border border-slate-800 px-3 py-1.5 rounded-lg w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-medium shrink-0">Fecha de Operación:</span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setOrders([{ cantera: 'YERBABUENA', planta: 'COLLIQUE', material: 'ARENA', volumen_m3: 175, prioridad: false }]);
                  setResults(null);
                }}
                className="bg-transparent text-xs text-slate-200 focus:outline-none focus:ring-0 font-bold cursor-pointer text-right sm:text-left"
              />
            </div>
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-lg transition cursor-pointer shadow-lg disabled:opacity-50 w-full sm:w-auto"
            >
              <Play className="w-3.5 h-3.5" />
              Procesar Planificación
            </button>
          </div>
        </div>
      </div>

      {/* Resultados de la Asignación */}
      {results && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">

          {/* Resumen de Demanda y Balances */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.keys(results.demandSummary).map(cantera => {
              const reqTons = results.demandSummary[cantera];
              const pendingTons = results.deficits[cantera] || 0;

              // Calcular total en M3
              const totalM3 = orders
                .filter(o => (o.cantera || '').toUpperCase().trim() === cantera.toUpperCase().trim())
                .reduce((sum, o) => sum + (parseFloat(o.volumen_m3) || 0), 0);

              const pendingM3 = parseFloat((pendingTons / 1.55).toFixed(1));

              // Calcular flete total asignado
              const totalAssignedTons = results.assignments
                .filter(a => a.id !== '' && !a.isPreviousAssignment && (a.zona_inicio || '').toUpperCase().trim() === cantera.toUpperCase().trim())
                .reduce((sum, a) => sum + ((parseInt(a.viajes_asignados) || 0) * (parseFloat(a.capacidad_toneladas) || 30.0)), 0);


              const hasManualAssigned = results.assignments.some(a => {
                if (!a.isManual || a.id === '') return false;
                return (a.zona_inicio || '').toUpperCase().trim() === cantera.toUpperCase().trim();
              });

              const isExceeded = totalAssignedTons > reqTons;
              const excessTons = isExceeded ? parseFloat((totalAssignedTons - reqTons).toFixed(2)) : 0;
              const excessM3 = parseFloat((excessTons / 1.55).toFixed(1));

              let colorClasses = '';
              let statusText = '';

              if (pendingTons > 0) {
                colorClasses = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                statusText = `Déficit: ${pendingM3.toLocaleString()} M³`;
              } else if (isExceeded) {
                colorClasses = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                statusText = `Exceso: +${excessM3.toLocaleString()} M³`;
              } else {
                colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                statusText = 'Cubierto';
              }

              // Calcular desvíos detallados por combinación de material y planta receptora
              const detailAlerts = [];
              const ordersForCantera = orders.filter(o => (o.cantera || '').toUpperCase().trim() === cantera.toUpperCase().trim());

              ordersForCantera.forEach(o => {
                const req = (parseFloat(o.volumen_m3) || 0) * 1.55;
                const asg = results.assignments
                  .filter(a => a.id !== '' &&
                    !a.isPreviousAssignment &&
                    (a.zona_inicio || '').toUpperCase().trim() === cantera.toUpperCase().trim() &&
                    (a.cantera_trabajo || '').toUpperCase().trim() === (o.planta || '').toUpperCase().trim() &&
                    (a.material || '').toUpperCase().trim() === (o.material || '').toUpperCase().trim()
                  )
                  .reduce((sum, a) => sum + ((parseInt(a.viajes_asignados) || 0) * (parseFloat(a.capacidad_toneladas) || 30.0)), 0);

                const diff = asg - req;
                const diffM3 = parseFloat((diff / 1.55).toFixed(1));
                const routeKey = `${o.material} ➔ ${o.planta}`;

                if (diff < -1.55) {
                  detailAlerts.push({
                    key: routeKey,
                    text: `Déficit: ${Math.abs(diffM3)} M³`,
                    type: 'deficit'
                  });
                } else if (diff > 1.55) {
                  detailAlerts.push({
                    key: routeKey,
                    text: `Exceso: +${diffM3} M³`,
                    type: 'excess'
                  });
                }
              });

              return (
                <div key={cantera} className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{cantera}</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-100">{totalM3.toLocaleString(undefined, { maximumFractionDigits: 1 })} M³ / {reqTons.toLocaleString(undefined, { maximumFractionDigits: 1 })} Tn</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${colorClasses}`}>
                      {statusText}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium pb-1">
                    Vehículos Locales: {results.assignments.filter(a => a.zona_inicio === cantera && a.estado_asignacion === 'LOCAL').length} asignados.
                  </p>

                  {detailAlerts.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      {detailAlerts.map((alert, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[9px] font-semibold leading-relaxed">
                          <span className="text-slate-400 truncate max-w-[70%]" title={alert.key}>{alert.key}</span>
                          <span className={alert.type === 'deficit' ? 'text-orange-400 shrink-0' : 'text-yellow-400 shrink-0'}>
                            {alert.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Alertas de Reasignación / Transferencia */}
          <div className="glass-panel p-5 rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-heading)' }}>Recomendaciones de Transferencia / Rotaciones</h4>
            <div className="space-y-2">
              {!results.recommendations || results.recommendations.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No se requirieron reasignaciones externas. La flota local cubre la demanda.</p>
              ) : (
                results.recommendations.map(a => (
                  <div
                    key={a.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between items-start gap-2.5 p-3.5 rounded-lg border text-xs shadow-sm"
                    style={{ backgroundColor: 'var(--card-bg-sub)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="font-semibold text-slate-200">{a.placa} ({a.tipo || 'Volquete'})</span>
                      <span className="text-slate-400">será transferido desde</span>
                      <span
                        className="px-2 py-0.5 rounded border font-sans font-semibold text-[10px] bg-slate-900 border-slate-800 text-slate-200"
                      >
                        {a.desde}
                      </span>
                      <span className="text-slate-400">hacia</span>
                      <span
                        className="px-2 py-0.5 rounded border font-sans font-bold text-[10px] bg-slate-900 border-slate-800 text-slate-200"
                      >
                        {a.hacia}
                      </span>
                    </div>
                    <span className="font-bold text-xs text-slate-350 shrink-0">{a.viajes_asignados} fletes programados ({(a.capacidad_toneladas || 30).toLocaleString()} Tn cap.)</span>
                  </div>
                ))
              )}

            </div>
          </div>

          {/* Detalle de Flota Asignada */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asignación Final de la Flota</h4>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAddAssignment}
                  className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl border border-slate-800 transition cursor-pointer shadow w-full sm:w-auto"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Agregar Vehículo
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold px-4.5 py-2 rounded-xl transition cursor-pointer shadow-lg disabled:opacity-50 w-full sm:w-auto"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar y Guardar Plan
                </button>
              </div>
            </div>

            <div className="overflow-x-auto mt-2 no-scrollbar">
              {(() => {
                const currentCanteras = Array.from(new Set(orders.map(o => (o.planta || '').toUpperCase().trim()).filter(Boolean)));

                // Tabla Superior: No es afectada por los filtros, solo muestra vehículos activos del pedido actual
                const upperAssignments = results.assignments.filter(a => {
                  if (a.id === '') return true; // Fila vacía manual va a la superior
                  if (a.isPreviousAssignment) return false; // Excluir vehículos de pedidos anteriores
                  const target = (a.cantera_trabajo || '').toUpperCase().trim();
                  const start = (a.zona_inicio || '').toUpperCase().trim();
                  return a.viajes_asignados > 0 &&
                    currentCanteras.includes(target) &&
                    start !== 'JICAMARCA' &&
                    start !== 'FLOR DE NIEVE';
                });

                // Tabla Inferior: Muestra exclusivamente los vehículos que están en reserva (viajes_asignados === 0)
                const lowerAssignments = results.assignments.filter(a => {
                  if (a.id === '') return false;

                  // Ocultar si está asignado a pedidos anteriores o al pedido actual
                  if (a.isPreviousAssignment || (a.viajes_asignados || 0) > 0) return false;

                  const start = (a.zona_inicio || '').toUpperCase().trim();

                  // Aplicar Filtro de Zona de Inicio (filterZonaInicio)
                  if (filterZonaInicio !== 'ALL') {
                    if (start !== filterZonaInicio.toUpperCase().trim()) return false;
                  }

                  return true;
                });



                // Ordenar Tabla Superior: manuales primero, las demás alfabéticamente por zona_inicio
                upperAssignments.sort((x, y) => {
                  if (x.isManual && !y.isManual) return -1;
                  if (!x.isManual && y.isManual) return 1;
                  if (x.isManual && y.isManual) {
                    return (x.manualOrder || 0) - (y.manualOrder || 0);
                  }
                  return (x.zona_inicio || '').localeCompare(y.zona_inicio || '');
                });

                // Ordenar Tabla Inferior alfabéticamente por zona_inicio
                lowerAssignments.sort((x, y) => (x.zona_inicio || '').localeCompare(y.zona_inicio || ''));



                const materials = materialsList.length > 0 ? materialsList : ['ARENA', 'PIEDRA DE 1/2', 'HORMIGON'];

                return (
                  <>
                    {/* Tabla Superior: Vehículos Asignados al Pedido Actual */}
                    <div className="mb-6">
                      <div
                        className="px-4 py-2.5 rounded-t-lg border flex justify-between items-center"
                        style={{ backgroundColor: 'var(--card-bg-sub)', borderColor: 'var(--border-color)' }}
                      >
                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">🚚 Vehículos Asignados al Pedido Actual</span>
                        <span className="text-[10px] text-slate-500 font-semibold">{upperAssignments.length} vehículos</span>
                      </div>
                      <div
                        className="border-x border-b rounded-b-lg p-2 overflow-x-auto no-scrollbar shadow-sm"
                        style={{ backgroundColor: 'var(--card-color)', borderColor: 'var(--border-color)' }}
                      >
                        {upperAssignments.length === 0 ? (
                          <p className="text-xs text-slate-500 italic p-4 text-center">Ningún vehículo asignado en esta sección.</p>
                        ) : (
                          <table className="w-full min-w-[750px] text-xs text-left">
                            <thead>
                              <tr
                                className="border-b text-slate-500 uppercase tracking-wider font-semibold"
                                style={{ borderColor: 'var(--border-color)' }}
                              >
                                <th className="py-2.5">Vehículo</th>
                                <th className="py-2.5">Capacidad</th>
                                <th className="py-2.5">Zona Inicio</th>
                                <th className="py-2.5">Asignado A (Destino)</th>
                                <th className="py-2.5">Material</th>
                                <th className="py-2.5 text-center">Viajes Programados</th>
                                <th className="py-2.5 text-center">Conductor</th>
                                <th className="py-2.5 text-center">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                              {upperAssignments.map(a => {
                                const idx = results.assignments.indexOf(a);
                                const isEmptyRow = a.id === '';
                                return (
                                  <tr key={a.id || `empty-${idx}`} className="hover:bg-slate-500/5">
                                    <td className="py-2.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          const options = [
                                            { val: '', label: '-- Seleccionar --' },
                                            ...allVehicles
                                              .filter(v => {
                                                const assignState = results.assignments.find(x => x.id === v.id);
                                                return v.id === a.id || !assignState || (assignState.viajes_asignados || 0) <= 0;
                                              })
                                              .map(v => ({ val: v.id, label: v.placa }))
                                          ];
                                          openMenu(e, idx, 'id', options, (val) => handleAssignVehicleChange(idx, val), a.id);
                                        }}
                                        className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-36 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-850 transition"
                                      >
                                        <span>{allVehicles.find(v => v.id === a.id)?.placa || '-- Seleccionar --'}</span>
                                        <span className="text-slate-500 text-[8px]">▼</span>
                                      </button>
                                    </td>
                                    <td className="py-2.5 text-slate-400">
                                      {isEmptyRow ? '-' : `${(a.capacidad_toneladas / 1.55).toFixed(1)} M³ / ${a.capacidad_toneladas} Tn`}
                                    </td>
                                    <td className="py-2.5">
                                      {isEmptyRow ? (
                                        <span className="text-slate-500 font-semibold px-2 py-1">-</span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            const options = [
                                              { val: 'YERBABUENA', label: 'Yerbabuena' },
                                              { val: 'SAN LORENZO', label: 'San Lorenzo' }
                                            ];
                                            openMenu(e, idx, 'zona_inicio', options, (val) => handleAssignZonaInicioChange(idx, val), a.zona_inicio || 'YERBABUENA');
                                          }}
                                          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-32 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-850 transition"
                                        >
                                          <span>{a.zona_inicio === 'SAN LORENZO' ? 'San Lorenzo' : 'Yerbabuena'}</span>
                                          <span className="text-slate-500 text-[8px]">▼</span>
                                        </button>
                                      )}
                                    </td>
                                    <td className="py-2.5">
                                      {isEmptyRow ? (
                                        <span className="text-slate-500 font-semibold px-2 py-1">-</span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            const options = [
                                              { val: '', label: 'RESERVA (Sin Asignar)' },
                                              ...currentCanteras.map(c => ({ val: c, label: c }))
                                            ];
                                            openMenu(e, idx, 'cantera_trabajo', options, (val) => handleAssignCanteraChange(idx, val), a.cantera_trabajo || '');
                                          }}
                                          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-48 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-850 transition"
                                        >
                                          <span className="truncate">{a.cantera_trabajo || 'RESERVA (Sin Asignar)'}</span>
                                          <span className="text-slate-500 text-[8px]">▼</span>
                                        </button>
                                      )}
                                    </td>
                                    <td className="py-2.5">
                                      {isEmptyRow ? (
                                        <span className="text-slate-500 font-semibold px-2 py-1">-</span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            const rowMaterials = [...materials];
                                            if (a.material && !rowMaterials.includes(a.material)) {
                                              rowMaterials.push(a.material);
                                            }
                                            const options = [
                                              { val: '', label: '-- Seleccionar --' },
                                              ...rowMaterials.map(m => ({ val: m, label: m }))
                                            ];
                                            openMenu(e, idx, 'material', options, (val) => handleAssignMaterialChange(idx, val), a.material || '');
                                          }}
                                          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-36 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-850 transition"
                                        >
                                          <span className="truncate">{a.material || '-- Seleccionar --'}</span>
                                          <span className="text-slate-500 text-[8px]">▼</span>
                                        </button>
                                      )}
                                    </td>
                                    <td className="py-2.5 text-center">
                                      {isEmptyRow ? (
                                        <span className="text-slate-500 font-bold px-2 py-1">-</span>
                                      ) : (
                                        <input
                                          type="number"
                                          min="0"
                                          max="4"
                                          value={a.viajes_asignados || 0}
                                          onChange={(e) => handleAssignTripsChange(idx, e.target.value)}
                                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-200 font-bold w-16 shadow-sm"
                                        />
                                      )}
                                    </td>
                                    <td className="py-2.5">
                                      {isEmptyRow ? (
                                        <span className="text-slate-500 font-semibold px-2 py-1">-</span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            const options = getAvailableDriversForAssignment(idx);
                                            openMenu(e, idx, 'conductor_id', options, (val) => handleAssignConductorChange(idx, val), a.conductor_id || '-');
                                          }}
                                          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-48 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-850 transition mx-auto"
                                        >
                                          <span className="truncate">{a.conductor_nombre || 'Por Asignar'}</span>
                                          <span className="text-slate-500 text-[8px]">▼</span>
                                        </button>
                                      )}
                                    </td>
                                    <td className="py-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveAssignment(idx)}
                                        className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-slate-500/10 transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Sección Colapsable: Otros Vehículos (Filtros y Tabla Inferior) */}
                    <div>
                      <div
                        className="px-4 py-2.5 rounded-t-lg border flex justify-between items-center"
                        style={{ backgroundColor: 'var(--card-bg-sub)', borderColor: 'var(--border-color)' }}
                      >
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">📋 Otros Vehículos (Reserva, Zonas Locales u Otros Pedidos)</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500 font-semibold">{lowerAssignments.length} vehículos</span>
                          <button
                            type="button"
                            onClick={() => setShowOtherVehicles(!showOtherVehicles)}
                            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 transition cursor-pointer shadow-sm"
                          >
                            {showOtherVehicles ? 'Contraer ▲' : 'Ver Todos ▼'}
                          </button>
                        </div>
                      </div>

                      {showOtherVehicles && (
                        <div
                          className="border-x border-b rounded-b-lg p-4 overflow-x-auto no-scrollbar shadow-sm space-y-4"
                          style={{ backgroundColor: 'var(--card-color)', borderColor: 'var(--border-color)' }}
                        >
                          {/* Contenedor de Filtros (Dentro de la sección colapsable, solo afecta a la tabla inferior) */}
                          <div
                            className="grid grid-cols-1 gap-4 p-3 rounded-lg border shadow-sm"
                            style={{ backgroundColor: 'var(--card-bg-sub)', borderColor: 'var(--border-color)' }}
                          >
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Filtrar por Zona de Inicio</label>
                              <button
                                type="button"
                                onClick={(e) => {
                                  const options = [
                                    { val: 'ALL', label: 'Todas las zonas' },
                                    { val: 'YERBABUENA', label: 'Yerbabuena' },
                                    { val: 'SAN LORENZO', label: 'San Lorenzo' },
                                    { val: 'JICAMARCA', label: 'Jicamarca' },
                                    { val: 'FLOR DE NIEVE', label: 'Flor de Nieve' }
                                  ];
                                  openMenu(e, 0, 'filterZonaInicio', options, (val) => setFilterZonaInicio(val), filterZonaInicio);
                                }}
                                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none w-full flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-850 transition"
                              >
                                <span>
                                  {filterZonaInicio === 'ALL' ? 'Todas las zonas' :
                                    filterZonaInicio === 'YERBABUENA' ? 'Yerbabuena' :
                                      filterZonaInicio === 'SAN LORENZO' ? 'San Lorenzo' :
                                        filterZonaInicio === 'JICAMARCA' ? 'Jicamarca' :
                                          filterZonaInicio === 'FLOR DE NIEVE' ? 'Flor de Nieve' : filterZonaInicio}
                                </span>
                                <span className="text-slate-500 text-[8px]">▼</span>
                              </button>
                            </div>
                          </div>


                          {lowerAssignments.length === 0 ? (
                            <p className="text-xs text-slate-500 italic p-4 text-center">Ningún vehículo en esta sección.</p>
                          ) : (
                            <table className="w-full min-w-[650px] text-xs text-left">
                              <thead>
                                <tr
                                  className="border-b text-slate-500 uppercase tracking-wider font-semibold"
                                  style={{ borderColor: 'var(--border-color)' }}
                                >
                                  <th className="py-2.5">Vehículo</th>
                                  <th className="py-2.5">Capacidad</th>
                                  <th className="py-2.5">Zona Inicio</th>
                                  <th className="py-2.5">Asignado A (Destino)</th>
                                  <th className="py-2.5 text-center">Viajes Programados</th>
                                  <th className="py-2.5 text-center">Conductor</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                                {lowerAssignments.map(a => {
                                  const isLockedLocal = a.zona_inicio === 'JICAMARCA' || a.zona_inicio === 'FLOR DE NIEVE';

                                  return (
                                    <tr key={a.id} className="hover:bg-slate-500/5 text-slate-300">
                                      <td className="py-2.5 font-bold font-sans text-slate-300">
                                        {a.placa}
                                      </td>
                                      <td className="py-2.5 text-slate-400">{(a.capacidad_toneladas / 1.55).toFixed(1)} M³ / {a.capacidad_toneladas} Tn</td>
                                      <td className="py-2.5 text-slate-400">{a.zona_inicio}</td>
                                      <td className="py-2.5">
                                        {isLockedLocal ? (
                                          <span
                                            className="font-semibold px-2.5 py-1 rounded border max-w-[220px] truncate block text-slate-400"
                                            title={a.cantera_trabajo}
                                            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                                          >
                                            {a.cantera_trabajo || 'Monitoreo GPS'}
                                          </span>
                                        ) : (
                                          <span className="font-semibold text-slate-400 px-1 py-0.5">
                                            {a.cantera_trabajo || 'RESERVA (Sin Asignar)'}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 text-center font-bold text-slate-400">
                                        {a.viajes_asignados || 0}
                                      </td>
                                      <td className="py-2.5 text-center text-slate-400 font-semibold font-sans">
                                        {a.conductor_nombre || 'Por Asignar'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* Notificación de Estado */}
      {saveStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${saveStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
          {saveStatus === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <div className="text-xs">
            <span className="font-bold block mb-0.5">{saveStatus === 'success' ? 'Plan Guardado' : 'Error en la Operación'}</span>
            <p className="font-medium text-slate-300">{message}</p>
          </div>
        </div>
      )}

      {/* Floating dropdown menu for custom selects */}
      {activeDropdown && (
        <div
          style={{
            top: `${activeDropdown.y + 4}px`,
            left: `${activeDropdown.x}px`,
            width: `${activeDropdown.width}px`
          }}
          className="absolute glass-panel py-1.5 rounded-xl border border-slate-800/80 shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150 text-left"
        >
          {activeDropdown.options.map(opt => {
            const isSelected = activeDropdown.currentVal === opt.val;
            return (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  if (activeDropdown.onSelect) {
                    activeDropdown.onSelect(opt.val);
                  } else {
                    handleOrderChange(activeDropdown.rowIdx, activeDropdown.field, opt.val);
                  }
                  setActiveDropdown(null);
                }}
                className={`w-full text-left px-4 py-2 text-xs transition-colors block cursor-pointer ${isSelected
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-500'
                  : 'text-slate-300 hover:bg-slate-850 hover:text-slate-100'
                  }`}
              >
                {opt.label || opt.val}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// COMPONENTE SELECTOR PERSONALIZADO PREMIUM (CON MENÚ DE OPCIONES ESTILIZADO)
function CustomSelect({ label, value, onChange, options, placeholder = 'Seleccionar', darkMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayLabel = React.useMemo(() => {
    const currentOpt = options.find(o => (typeof o === 'object' ? o.value === value : o === value));
    return typeof currentOpt === 'object' ? currentOpt.label : (currentOpt || value);
  }, [options, value]);

  return (
    <div className="relative w-full z-[9999]" ref={dropdownRef}>
      <label className={`block text-[10px] uppercase tracking-wider mb-1.5 font-semibold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-xl px-3 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${darkMode
          ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-900/80 hover:border-slate-700/60'
          : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50 hover:border-slate-350'
          }`}
      >
        <span className="truncate">{displayLabel || placeholder}</span>
        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-90' : ''} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-[9999] w-full mt-1.5 border rounded-xl shadow-2xl max-h-60 overflow-y-auto no-scrollbar py-1 ${darkMode
          ? 'bg-slate-900/95 border-slate-800 text-slate-200 backdrop-blur-md'
          : 'bg-white border-slate-250 text-slate-800 shadow-xl'
          }`}>
          {options.map((opt) => {
            const optValue = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            const isSelected = optValue === value;

            return (
              <button
                key={optValue}
                type="button"
                onClick={() => {
                  onChange(optValue);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors focus:outline-none cursor-pointer flex items-center justify-between ${isSelected
                  ? (darkMode ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'bg-emerald-50 text-emerald-600 font-bold')
                  : (darkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
                  }`}
              >
                <span className="truncate">{optLabel}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MonitoringView({ API_BASE, darkMode }) {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }));
  const [vehicles, setVehicles] = useState([]);
  const [routesProgress, setRoutesProgress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados de filtros
  const [filterPlate, setFilterPlate] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterCantera, setFilterCantera] = useState('Todas');
  const [filterDest, setFilterDest] = useState('Todos');
  const [showVehiclesTable, setShowVehiclesTable] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/monitoring/status?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setVehicles(json.data.vehicles || []);
        setRoutesProgress(json.data.routes_progress || []);
      } else {
        setError(json.error || 'Error al obtener los datos de monitoreo');
      }
    } catch (err) {
      setError('Error de conexión con el servidor backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [date]);

  // Lista de placas únicas para el filtro
  const uniquePlates = ['Todos', ...new Set(vehicles.map(v => v.placa).filter(Boolean))];

  // Aplicar filtros
  const filteredVehicles = vehicles.filter(v => {
    if (filterPlate !== 'Todos' && v.placa !== filterPlate) return false;
    if (filterStatus !== 'Todos' && v.estado !== filterStatus) return false;
    if (filterCantera !== 'Todas') {
      const c = (v.cantera_origen || '').toUpperCase().trim();
      if (filterCantera === 'Yerbabuena' && c !== 'YERBABUENA') return false;
      if (filterCantera === 'San Lorenzo' && c !== 'SAN LORENZO') return false;
      if (filterCantera === 'Flor de Nieve' && c !== 'FLOR DE NIEVE') return false;
      if (filterCantera === 'Jicamarca' && c !== 'JICAMARCA') return false;
    }
    if (filterDest !== 'Todos') {
      const d = (v.destino_probable || '').toUpperCase().trim();
      if (d !== filterDest.toUpperCase()) return false;
    }
    return true;
  });

  const getStatusBadge = (estado) => {
    const est = (estado || '').toLowerCase().trim();
    switch (est) {
      case 'carga en cantera':
      case 'carga':
        return <span className="px-2 py-0.5 text-[10px] rounded font-semibold border bg-sky-500/10 text-sky-400 border-sky-500/20">Carga en Cantera</span>;
      case 'en ruta':
        return <span className="px-2 py-0.5 text-[10px] rounded font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">En Ruta</span>;
      case 'descarga en planta':
      case 'descarga':
      case 'carga/descarga':
        return <span className="px-2 py-0.5 text-[10px] rounded font-semibold border bg-purple-500/10 text-purple-400 border-purple-500/20">Descarga en Planta</span>;
      case 'detenido':
        return <span className="px-2 py-0.5 text-[10px] rounded font-semibold border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Detenido</span>;
      case 'garaje':
      case 'garage':
      default:
        return <span className="px-2 py-0.5 text-[10px] rounded font-semibold border bg-red-500/10 text-red-400 border-red-500/20">Garage</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* CABECERA Y SELECTOR DE FECHA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/60 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-400" />
            Monitoreo de Operaciones
          </h2>
          <p className="text-sm text-slate-500">Rastreo de rutas, máquina de estados y control de viajes programados</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-semibold">Fecha de Operación:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-300 font-bold"
          />
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* PANEL DE FILTROS */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/85 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-visible relative z-[60]">
        <CustomSelect
          label="Filtrar por Placa"
          value={filterPlate}
          onChange={setFilterPlate}
          options={uniquePlates}
          darkMode={darkMode}
        />

        <CustomSelect
          label="Filtrar por Estado"
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { label: 'Todos', value: 'Todos' },
            { label: 'Carga en Cantera', value: 'Carga en cantera' },
            { label: 'En Ruta', value: 'En ruta' },
            { label: 'Descarga en Planta', value: 'Descarga en planta' },
            { label: 'Detenido', value: 'Detenido' },
            { label: 'Garage', value: 'garaje' }
          ]}
          darkMode={darkMode}
        />

        <CustomSelect
          label="Cantera Origen"
          value={filterCantera}
          onChange={setFilterCantera}
          options={['Todas', 'Yerbabuena', 'San Lorenzo', 'Flor de Nieve', 'Jicamarca']}
          darkMode={darkMode}
        />

        <CustomSelect
          label="Destino Probable"
          value={filterDest}
          onChange={setFilterDest}
          options={['Todos', 'Meiggs', 'Collique', 'Materiales', 'Oquendo']}
          darkMode={darkMode}
        />
      </div>

      {/* MAPA EXPANDIDO */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col h-[500px] relative z-10">
        <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden">
          <MapComponent
            vehicles={filteredVehicles.map(v => ({
              ...v,
              lng: parseFloat(v.lng),
              lat: parseFloat(v.lat),
              placa: v.placa
            }))}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* WIDGET: AVANCE POR RUTA (5 BARRAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {routesProgress.map(r => {
          const percent = r.programados > 0 ? Math.round((r.realizados / r.programados) * 100) : 0;
          return (
            <div key={r.id} className="glass-panel p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{r.label}</span>
                <span className="text-lg font-extrabold text-slate-100">{percent}%</span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 flex">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, percent)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-bold mt-1.5">
                  <span>{r.realizados} realizados</span>
                  <span>{r.programados} prog.</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TABLA DE MONITOREO */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/60 bg-slate-950/20 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Listado de Vehículos en Operación</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Vehículos en operación con su estado y ruta en tiempo real</p>
          </div>
          <button
            onClick={() => setShowVehiclesTable(!showVehiclesTable)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-slate-100 hover:bg-slate-850 transition cursor-pointer"
          >
            {showVehiclesTable ? (
              <>
                Ocultar Listado
                <ChevronDown className="w-3.5 h-3.5 transform rotate-180 transition-transform" />
              </>
            ) : (
              <>
                Mostrar Listado ({filteredVehicles.length})
                <ChevronDown className="w-3.5 h-3.5 transition-transform" />
              </>
            )}
          </button>
        </div>
        {showVehiclesTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold bg-slate-950/40">
                  <th className="py-3 px-5 text-center">Placa</th>
                  <th className="py-3 px-5">Cantera Asignada</th>
                  <th className="py-3 px-5">Destino Asignado</th>
                  <th className="py-3 px-5 text-center">Viajes Realizados</th>
                  <th className="py-3 px-5">Destino Probable</th>
                  <th className="py-3 px-5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 font-medium italic">
                      No se encontraron vehículos operando con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  [...filteredVehicles]
                    .sort((a, b) => (a.placa || '').localeCompare(b.placa || ''))
                    .map(v => (
                      <tr key={v.vehiculo_id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3 px-5 text-center text-slate-200 font-extrabold">{v.placa}</td>
                        <td className="py-3 px-5">
                          {v.cantera_origen && v.cantera_origen.trim() !== "" ? (
                            <span className="text-black font-semibold uppercase">
                              {v.cantera_origen.trim()}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">-</span>
                          )}
                        </td>
                        <td className="py-3 px-5">
                          {v.destino_asignado && v.destino_asignado !== '-' ? (
                            <span className="font-bold text-slate-200 uppercase">{v.destino_asignado}</span>
                          ) : (
                            <span className="text-slate-500 italic">-</span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-center font-bold text-slate-300">
                          {v.viajes_realizados} / {v.viajes_programados}
                        </td>
                        <td className="py-3 px-5">
                          {v.destino_probable && v.destino_probable !== '-' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-200">{v.destino_probable}</span>
                              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15">
                                {v.destino_probable_percent}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">-</span>
                          )}
                        </td>
                        <td className="py-3 px-5">{getStatusBadge(v.estado)}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE AUXILIAR: ALERTAS DE COMBUSTIBLE
// ==========================================
function FuelAlertsView({ API_BASE, darkMode }) {
  const [placa, setPlaca] = useState('Todos');
  const [mes, setMes] = useState('Todos');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showTable, setShowTable] = useState(false);

  // Cargar placas únicas
  const [platesList, setPlatesList] = useState([]);

  const MONTHS = [
    { value: 'Todos', label: 'Todos (Mayo - Agosto)' },
    { value: '2026-05', label: 'Mayo 2026' },
    { value: '2026-06', label: 'Junio 2026' },
    { value: '2026-07', label: 'Julio 2026' },
    { value: '2026-08', label: 'Agosto 2026' }
  ];

  const fetchPlates = async () => {
    try {
      const res = await fetch(`${API_BASE}/monitoring/status`);
      const json = await res.json();
      if (json.success && json.data.vehicles) {
        const plates = ['Todos', ...new Set(json.data.vehicles.map(v => v.placa).filter(Boolean))];
        setPlatesList(plates.sort());
      }
    } catch (err) {
      console.warn('Error fetching plates for fuel alerts filter:', err);
    }
  };

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const url = `${API_BASE}/fuel/alerts?placa=${placa}&mes=${mes}&limit=100`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Error al cargar las alertas de combustible');
      }
    } catch (err) {
      setError('Error al conectar con el servidor backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlates();
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [placa, mes]);

  if (error) {
    return (
      <div className="p-6 text-center text-red-400 font-bold bg-red-500/10 border border-red-500/20 rounded-xl">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        {error}
        <button onClick={fetchAlerts} className="mt-4 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs hover:bg-slate-850 cursor-pointer block mx-auto">
          Reintentar
        </button>
      </div>
    );
  }

  const stats = data?.stats || {
    total_records: 0,
    critical_count: 0,
    warning_count: 0,
    critical_vehicles_count: 0,
    total_real_fuel: 0,
    total_expected_fuel: 0,
    total_cost: 0,
    avg_deviation_pct: 0,
    diesel_avg_dev: 0,
    gnv_avg_dev: 0
  };

  const causes = data?.causes || [];
  const ranking = data?.ranking || [];
  const fuelTypes = data?.fuel_types || [];
  const alerts = data?.alerts || [];

  // Donut chart calculations
  const dieselCount = fuelTypes.find(t => t.tipo === 'DIESEL')?.cantidad || 0;
  const gnvCount = fuelTypes.find(t => t.tipo === 'GNV')?.cantidad || 0;
  const totalVehicles = dieselCount + gnvCount || 1;
  const dieselPct = Math.round((dieselCount / totalVehicles) * 100);
  const gnvPct = Math.round((gnvCount / totalVehicles) * 100);

  const radius = 40;
  const circumference = 2 * Math.PI * radius; // 251.327
  const dieselDash = (dieselCount / totalVehicles) * circumference;
  const gnvDash = (gnvCount / totalVehicles) * circumference;

  const hasDieselData = stats.diesel_real > 0 || stats.diesel_expected > 0;
  const hasGnvData = stats.gnv_real > 0 || stats.gnv_expected > 0;
  const showDiesel = placa === 'Todos' || (hasDieselData && !hasGnvData) || (!hasDieselData && !hasGnvData);
  const showGnv = placa === 'Todos' || (hasGnvData && !hasDieselData) || (!hasDieselData && !hasGnvData);

  return (
    <div className="space-y-6 text-left">
      {/* CABECERA Y FILTRO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/60 pb-6 relative z-[60]">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Fuel className="w-6 h-6 text-emerald-400" />
            Alertas de Combustible
          </h2>
          <p className="text-sm text-slate-550">Monitoreo de anomalías en consumos y desvíos de combustible con modelo estadístico Z-Score</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-405 font-semibold whitespace-nowrap">Filtrar por Mes:</label>
            <CustomDropdown
              value={mes === 'Todos' ? '' : mes}
              onChange={(val) => setMes(val || 'Todos')}
              options={MONTHS.filter(m => m.value !== 'Todos')}
              placeholder="Todos"
              darkMode={darkMode}
              widthClass="w-36"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-405 font-semibold whitespace-nowrap">Vehículo:</label>
            <CustomDropdown
              value={placa === 'Todos' ? '' : placa}
              onChange={(val) => setPlaca(val || 'Todos')}
              options={platesList}
              placeholder="Todos"
              darkMode={darkMode}
              widthClass="w-36"
            />
          </div>

          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer self-end sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* METRICAS GENERALES (6 COLUMNAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* CRITICAL ALERTS */}
        <div className="glass-panel p-4 rounded-xl border border-red-500/20 bg-red-950/5 flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 rounded-lg border border-red-500/20 text-red-400 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-550 font-bold uppercase tracking-wider leading-none mb-1">Alertas Críticas</span>
            <span className="text-xl font-extrabold text-red-400">{stats.critical_count}</span>
          </div>
        </div>

        {/* WARNINGS */}
        <div className="glass-panel p-4 rounded-xl border border-amber-500/20 bg-amber-950/5 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-550 font-bold uppercase tracking-wider leading-none mb-1">Advertencias</span>
            <span className="text-xl font-extrabold text-amber-400">{stats.warning_count || 0}</span>
          </div>
        </div>

        {/* CRITICAL VEHICLES */}
        <div className="glass-panel p-4 rounded-xl border border-orange-500/20 bg-orange-950/5 flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/10 rounded-lg border border-orange-500/20 text-orange-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-550 font-bold uppercase tracking-wider leading-none mb-1">Vehículos Alerta</span>
            <span className="text-xl font-extrabold text-orange-400">{stats.critical_vehicles_count}</span>
          </div>
        </div>

        {/* COSTO TOTAL */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 bg-slate-800 rounded-lg text-slate-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-550 font-bold uppercase tracking-wider leading-none mb-1">Costo Despachado</span>
            <span className="text-xl font-extrabold text-slate-200">
              S/. {(stats.total_cost || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* DESVIACIÓN DIÉSEL */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 bg-slate-850 rounded-lg text-slate-400">
            <Fuel className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-550 font-bold uppercase tracking-wider leading-none mb-1">Desv. Diésel</span>
            <span className={`text-xl font-extrabold ${stats.diesel_avg_dev > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {stats.diesel_avg_dev > 0 ? '+' : ''}{stats.diesel_avg_dev}%
            </span>
          </div>
        </div>

        {/* DESVIACIÓN GNV */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 bg-slate-850 rounded-lg text-slate-400">
            <Fuel className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-550 font-bold uppercase tracking-wider leading-none mb-1">Desv. GNV</span>
            <span className={`text-xl font-extrabold ${stats.gnv_avg_dev > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {stats.gnv_avg_dev > 0 ? '+' : ''}{stats.gnv_avg_dev}%
            </span>
          </div>
        </div>
      </div>

      {/* METRICAS ADICIONALES Y CAUSAS (FILA 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* EFICIENCIA COMPARADA */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Volumen Despachado vs Esperado</h3>
            <p className="text-xs text-slate-500 mb-4">Eficiencia consolidada en base a viajes y peso transportado</p>
          </div>
          <div className="space-y-6">
            {showDiesel && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-extrabold text-emerald-400 border-b border-slate-800/40 pb-0.5 uppercase tracking-wider">
                  <span>Vehículos Diésel</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                    <span>Consumo Real</span>
                    <span className="font-bold text-slate-200">{(stats.diesel_real || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} gal</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                    <span>Consumo Esperado (Modelo)</span>
                    <span className="font-bold text-slate-200">{(stats.diesel_expected || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} gal</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, ((stats.diesel_expected || 0) / (stats.diesel_real || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-405 pt-0.5">
                  <span>Diferencia Neta:</span>
                  <span className={`font-bold ${stats.diesel_real > stats.diesel_expected ? 'text-red-400' : 'text-emerald-400'}`}>
                    {stats.diesel_real > stats.diesel_expected ? '+' : ''}{(stats.diesel_real - stats.diesel_expected).toFixed(2)} gal ({(((stats.diesel_real - stats.diesel_expected) / (stats.diesel_expected || 1)) * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}

            {showGnv && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-extrabold text-emerald-400 border-b border-slate-800/40 pb-0.5 uppercase tracking-wider">
                  <span>Vehículos GNV</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                    <span>Consumo Real</span>
                    <span className="font-bold text-slate-200">{(stats.gnv_real || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m³</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                    <span>Consumo Esperado (Modelo)</span>
                    <span className="font-bold text-slate-200">{(stats.gnv_expected || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m³</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, ((stats.gnv_expected || 0) / (stats.gnv_real || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-405 pt-0.5">
                  <span>Diferencia Neta:</span>
                  <span className={`font-bold ${stats.gnv_real > stats.gnv_expected ? 'text-red-400' : 'text-emerald-400'}`}>
                    {stats.gnv_real > stats.gnv_expected ? '+' : ''}{(stats.gnv_real - stats.gnv_expected).toFixed(2)} m³ ({(((stats.gnv_real - stats.gnv_expected) / (stats.gnv_expected || 1)) * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DISTRIBUCIÓN DE CAUSAS PROBABLES */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-200 mb-1">Distribución de Alertas por Causa Probable</h3>
          <p className="text-xs text-slate-500 mb-4">Causas identificadas por el modelo de anomalías de combustible</p>
          <div className="space-y-4">
            {/* COMPORTAMIENTO NORMAL */}
            {causes.filter(c => c.causa === 'Comportamiento Normal').map((c, idx) => {
              const maxCount = Math.max(...causes.map(x => x.cantidad)) || 1;
              const percent = Math.round((c.cantidad / maxCount) * 100);
              return (
                <div key={`norm-${idx}`} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300 font-semibold">{c.causa}</span>
                    <span className="text-emerald-400 font-bold">{c.cantidad} casos</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}

            {/* SEPARATOR AND SUBTITLE FOR ALERTS */}
            {causes.filter(c => c.causa !== 'Comportamiento Normal').length > 0 && (
              <div className="pt-2 border-t border-slate-800/40">
                <h4 className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider mb-3">Alertas</h4>
                <div className="space-y-3.5">
                  {causes.filter(c => c.causa !== 'Comportamiento Normal').map((c, idx) => {
                    const maxCount = Math.max(...causes.map(x => x.cantidad)) || 1;
                    const percent = Math.round((c.cantidad / maxCount) * 100);
                    return (
                      <div key={`alert-${idx}`} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-300 truncate max-w-[60%]">{c.causa}</span>
                          <span className="text-slate-400 font-bold text-[11px] flex gap-1.5 items-center">
                            <span className="text-red-400 font-extrabold">{c.critical_count} críticas</span>
                            <span className="text-slate-700 font-normal">|</span>
                            <span className="text-amber-400 font-extrabold">{c.warning_count} advs</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full rounded-full bg-red-500 transition-all"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RANKING Y TIPO DE COMBUSTIBLE (FILA 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RANKING DE VEHICULOS */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Top 5 Vehículos con Más Alertas</h3>
            <p className="text-xs text-slate-500 mb-4">Placas con mayor número de incidencias acumuladas (Críticas y Advertencias)</p>
          </div>
          <div className="space-y-3.5">
            {ranking.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 italic">No hay alertas registradas en el periodo</div>
            ) : (
              ranking.map((r, idx) => {
                const maxAlerts = ranking[0]?.cantidad || 1;
                const percent = Math.round((r.cantidad / maxAlerts) * 100);

                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-slate-500 text-center">#{idx + 1}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-200 font-extrabold">{r.placa}</span>
                        <span className="text-slate-405 font-bold text-[11px] flex gap-1.5 items-center">
                          <span className="text-red-400 font-extrabold">{r.critical_count || 0} críticas</span>
                          <span className="text-slate-700 font-normal">|</span>
                          <span className="text-amber-400 font-extrabold">{r.warning_count || 0} advs</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800/80">
                        <div className="bg-red-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DONUT CHART DISTRIBUCION COMBUSTIBLE */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Distribución de Flota por Combustible</h3>
            <p className="text-xs text-slate-500 mb-4">Proporción de vehículos Diesel vs GNV operando en el periodo</p>
          </div>

          <div className="flex items-center justify-around h-full py-4">
            <div className="relative w-[120px] h-[120px] shrink-0">
              <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                {/* Background Ring */}
                <circle cx="60" cy="60" r="40" fill="transparent" stroke="#1e293b" strokeWidth="12" />

                {/* Diesel Segment */}
                {dieselCount > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="40"
                    fill="transparent"
                    stroke="#3b82f6"
                    strokeWidth="12"
                    strokeDasharray={`${dieselDash} ${circumference}`}
                    strokeDashoffset="0"
                    className="transition-all duration-500"
                  />
                )}

                {/* GNV Segment */}
                {gnvCount > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="40"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${gnvDash} ${circumference}`}
                    strokeDashoffset={`-${dieselDash}`}
                    className="transition-all duration-500"
                  />
                )}
              </svg>
              {/* Inner Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-slate-200">{totalVehicles}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Flota</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div className="text-left">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase leading-none mb-0.5">Diesel</span>
                  <span className="text-xs font-bold text-slate-200">{dieselCount} vehículos ({dieselPct}%)</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <div className="text-left">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase leading-none mb-0.5">GNV</span>
                  <span className="text-xs font-bold text-slate-200">{gnvCount} vehículos ({gnvPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE ALERTAS */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/60 bg-slate-950/20 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Desglose Detallado de Alertas de Cargas</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Listado detallado de cargas y consumos analizados</p>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-slate-100 hover:bg-slate-850 transition cursor-pointer"
          >
            {showTable ? (
              <>
                Ocultar Detalles
                <ChevronDown className="w-3.5 h-3.5 transform rotate-180 transition-transform" />
              </>
            ) : (
              <>
                Mostrar Detalles ({alerts.length})
                <ChevronDown className="w-3.5 h-3.5 transition-transform" />
              </>
            )}
          </button>
        </div>
        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold bg-slate-950/40">
                  <th className="py-3 px-5">Placa</th>
                  <th className="py-3 px-5">Intervalo de Fechas</th>
                  <th className="py-3 px-5 text-center">Viajes</th>
                  <th className="py-3 px-5 text-right">Consumo Real</th>
                  <th className="py-3 px-5 text-right">Consumo Esp.</th>
                  <th className="py-3 px-5 text-right">Desviación</th>
                  <th className="py-3 px-5">Causa Probable</th>
                  <th className="py-3 px-5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-500 font-medium italic">
                      No se encontraron registros de combustible para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  alerts.map((a, idx) => {
                    const devVal = a.desviacion_porcentaje;
                    const isCrit = a.estado_alerta === 'Critico';
                    const isWarn = a.estado_alerta === 'Advertencia';

                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedAlert(a)}
                        className="hover:bg-slate-900/20 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-5 text-slate-200 font-extrabold">{a.placa}</td>
                        <td className="py-3 px-5 text-slate-400">
                          {a.fecha_inicio} ➔ {a.fecha_fin}
                        </td>
                        <td className="py-3 px-5 text-center text-slate-300 font-bold">{a.viajes_realizados}</td>
                        <td className="py-3 px-5 text-right text-slate-300 font-medium">{a.consumo_real} {a.tipo_combustible === 'GNV' ? 'm³' : 'gal'}</td>
                        <td className="py-3 px-5 text-right text-slate-300 font-medium">{a.consumo_esperado} {a.tipo_combustible === 'GNV' ? 'm³' : 'gal'}</td>
                        <td className={`py-3 px-5 text-right font-extrabold ${isCrit ? 'text-red-400' : isWarn ? 'text-orange-400' : 'text-emerald-400'}`}>
                          {devVal > 0 ? '+' : ''}{devVal}%
                        </td>
                        <td className="py-3 px-5 text-slate-400 font-medium truncate max-w-[200px]" title={a.causa_probable}>
                          {a.causa_probable}
                        </td>
                        <td className="py-3 px-5 text-center">
                          {isCrit ? (
                            <span className="px-2 py-0.5 text-[9px] rounded font-bold border bg-red-500/10 text-red-400 border-red-500/20">Crítico</span>
                          ) : isWarn ? (
                            <span className="px-2 py-0.5 text-[9px] rounded font-bold border bg-orange-500/10 text-orange-400 border-orange-500/20">Advertencia</span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] rounded font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Normal</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETALLES DE ALERTA MODAL */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/50 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  Auditoría de Combustible - {selectedAlert.placa}
                </h3>
                <p className="text-xs text-slate-500">Período del {selectedAlert.fecha_inicio} al {selectedAlert.fecha_fin}</p>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* VEHICLE DETAILS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Vehículo</span>
                  <span className="text-xs text-slate-200 font-extrabold">{selectedAlert.placa}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Marca/Modelo</span>
                  <span className="text-xs text-slate-200 font-medium">{selectedAlert.marca} {selectedAlert.modelo}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Combustible</span>
                  <span className="text-xs text-slate-200 font-bold">{selectedAlert.tipo_combustible}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Días Operados</span>
                  <span className="text-xs text-slate-200 font-medium">{selectedAlert.dias_intervalo} días</span>
                </div>
              </div>

              {/* CONSUMO COMPARISON */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* METRICAS DE CONSUMO */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-1">Métricas de Consumo</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-slate-500">Consumo Real:</span>
                      <span className="font-extrabold text-slate-200 text-sm">
                        {selectedAlert.consumo_real} {selectedAlert.tipo_combustible === 'GNV' ? 'm³' : 'gal'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Consumo Esperado:</span>
                      <span className="font-extrabold text-slate-200 text-sm">
                        {selectedAlert.consumo_esperado} {selectedAlert.tipo_combustible === 'GNV' ? 'm³' : 'gal'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Desviación:</span>
                      <span className={`font-extrabold text-sm ${selectedAlert.desviacion_porcentaje > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {selectedAlert.desviacion_porcentaje > 0 ? '+' : ''}{selectedAlert.desviacion_porcentaje}%
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Puntaje Z (Z-Score):</span>
                      <span className="font-extrabold text-slate-200 text-sm">{selectedAlert.z_score}</span>
                    </div>
                  </div>
                </div>

                {/* HISTORIAL OPERATIVO */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-1">Desempeño Operativo</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-slate-500">Distancia GPS:</span>
                      <span className="font-bold text-slate-200">{selectedAlert.distancia_km} km</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-bold">Viajes Realizados:</span>
                      <span className="font-bold text-slate-200">{selectedAlert.viajes_realizados}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Peso Transportado:</span>
                      <span className="font-bold text-slate-200">{selectedAlert.peso_transportado_ton} ton</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Velocidad Promedio:</span>
                      <span className="font-bold text-slate-200">{selectedAlert.velocidad_promedio} km/h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETALLES DE ALERTAS Y ANOMALIAS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-1">Diagnóstico del Modelo</h4>
                <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <div className={`p-3 rounded-lg border shrink-0 ${selectedAlert.estado_alerta === 'Critico' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    selectedAlert.estado_alerta === 'Advertencia' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block mb-1">
                      {selectedAlert.estado_alerta === 'Critico' ? 'ALERTA CRÍTICA DETECTADA' :
                        selectedAlert.estado_alerta === 'Advertencia' ? 'ADVERTENCIA OPERATIVA' :
                          'OPERACIÓN DENTRO DEL RANGO NORMAL'}
                    </span>
                    <p className="text-slate-400 leading-relaxed">
                      El modelo estadístico estimó una desviación de <strong>{selectedAlert.desviacion_porcentaje}%</strong> frente al consumo esperado para un viaje equivalente.
                      La causa probable identificada es: <strong className="text-slate-200">{selectedAlert.causa_probable}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800/80 flex justify-end gap-2">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold hover:bg-slate-850 transition text-slate-200 cursor-pointer"
              >
                Cerrar Auditoría
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTE AUXILIAR: CARGA DE DOCUMENTOS
// ==========================================
function PreliquidacionesView({
  API_BASE,
  activePreliqJobId,
  setActivePreliqJobId,
  preliqJobStatus,
  setPreliqJobStatus,
  darkMode
}) {
  const [step, setStep] = useState(1); // 1: Select Type, 2: Upload Files, 3: Processing, 4: Review/Approve
  const [documentType, setDocumentType] = useState('PRELIQUIDACION'); // PRELIQUIDACION, DIESEL, GNV, PEAJES
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [localProcessing, setLocalProcessing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Sync wizard step with background job status
  useEffect(() => {
    if (activePreliqJobId) {
      if (preliqJobStatus) {
        if (preliqJobStatus.status === 'completed') {
          setStep(4);
        } else if (preliqJobStatus.status === 'pending' || preliqJobStatus.status === 'processing') {
          setStep(3);
        }
      } else {
        setStep(3);
      }
    } else {
      // Return to step 1 only if we are not actively in step 2
      setStep(prev => (prev === 2 ? 2 : 1));
    }
  }, [activePreliqJobId, preliqJobStatus]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => {
      const existingKeys = new Set(prev.map(f => f.name + f.size));
      const newFiles = files.filter(f => !existingKeys.has(f.name + f.size));
      return [...prev, ...newFiles];
    });
  };

  const handleRemoveFile = (idxToRemove) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;
    setLocalProcessing(true);
    setNotification(null);

    try {
      // Leer archivos como base64
      const fileDataPromises = selectedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              data: reader.result
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const filesPayload = await Promise.all(fileDataPromises);

      const response = await fetch(`${API_BASE}/preliquidaciones/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesPayload, documentType: documentType })
      });

      const data = await response.json();
      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'No se pudo iniciar la carga');
      }

      // Establecer el Job ID en el estado superior para iniciar el polling
      setActivePreliqJobId(data.jobId);
      setPreliqJobStatus({
        status: 'pending',
        progress: 0,
        totalFiles: selectedFiles.length,
        processedFiles: 0,
        results: [],
        elapsedTime: 0
      });

      setLocalProcessing(false);
      setStep(3);
    } catch (err) {
      setLocalProcessing(false);
      setNotification({
        type: 'error',
        message: `Error al iniciar el procesamiento: ${err.message}`
      });
    }
  };

  const handleCancelProcess = async () => {
    if (!activePreliqJobId) {
      setStep(1);
      return;
    }
    try {
      await fetch(`${API_BASE}/preliquidaciones/cancel/${activePreliqJobId}`, { method: 'POST' });
      setActivePreliqJobId(null);
      setPreliqJobStatus(null);
      setSelectedFiles([]);
      setStep(1);
      setNotification({
        type: 'info',
        message: 'Procesamiento cancelado exitosamente.'
      });
    } catch (err) {
      console.error('Error al cancelar:', err);
    }
  };

  const handleCancelCarga = async () => {
    if (!activePreliqJobId) {
      setStep(1);
      return;
    }
    try {
      await fetch(`${API_BASE}/preliquidaciones/clear/${activePreliqJobId}`, { method: 'POST' });
    } catch (err) {
      console.error('Error al limpiar job:', err);
    }
    setActivePreliqJobId(null);
    setPreliqJobStatus(null);
    setSelectedFiles([]);
    setStep(1);
    setNotification({
      type: 'info',
      message: 'Carga de documentos cancelado exitosamente.'
    });
  };

  const handleApproveData = async () => {
    if (!activePreliqJobId) return;
    setLocalProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/preliquidaciones/approve/${activePreliqJobId}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al aprobar datos');
      }

      setNotification({
        type: 'success',
        message: 'Carga de datos correcta.'
      });
      setActivePreliqJobId(null);
      setPreliqJobStatus(null);
      setSelectedFiles([]);
      setStep(1);
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Error al aprobar: ${err.message}`
      });
    } finally {
      setLocalProcessing(false);
    }
  };

  const handleExportCSV = () => {
    if (!preliqJobStatus || !preliqJobStatus.results || preliqJobStatus.results.length === 0) return;

    let columns = [];
    if (documentType === 'PRELIQUIDACION') {
      columns = ['id', 'liquidacion_nro', 'transportista', 'fecha', 'nro_guia', 'placa', 'vehiculo_id', 'insumo', 'material_id', 'peso_seco', 'peso_humedo', 'monto_total', 'ruta', 'origen', 'destino', 'fuente'];
    } else if (documentType === 'DIESEL') {
      columns = ['id', 'vehiculo_id', 'placa', 'fecha', 'hora', 'galones_despachados', 'precio_unitario', 'monto_despachado', 'fuente'];
    } else if (documentType === 'GNV') {
      columns = ['fecha', 'factura', 'placa', 'm3', 'precio_unitario', 'monto_total', 'fuente'];
    } else if (documentType === 'PEAJES') {
      columns = ['tipo_servicio', 'red_uso', 'placa', 'fecha_transito', 'punto_servicio', 'comprobante', 'total_servicio', 'saldo_final', 'fuente'];
    }

    const headerLine = `Tiempo de procesamiento: ${preliqJobStatus.elapsedTime || 0} segundos\n`;
    const columnsLine = columns.join(',') + '\n';

    const rows = preliqJobStatus.results.map(rec => {
      return columns.map(col => {
        const val = rec[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',');
    }).join('\n');

    const csvContent = headerLine + columnsLine + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `verificacion_${documentType.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Determinar estados de UI
  const isJobRunning = preliqJobStatus && (preliqJobStatus.status === 'pending' || preliqJobStatus.status === 'processing');
  const isJobCompleted = preliqJobStatus && preliqJobStatus.status === 'completed';
  const results = preliqJobStatus ? preliqJobStatus.results : [];

  return (
    <div className="space-y-6 text-left">
      {/* CABECERA */}
      <div className="border-b border-slate-800/60 pb-6 text-left flex flex-col items-start justify-start w-full">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center justify-start gap-2 text-left w-full">
          <FileText className="w-6 h-6 text-emerald-400 shrink-0" />
          Carga de Documentos
        </h2>
        <p className="text-sm text-slate-500 text-left mt-1">Carga y tratamiento automático de archivos administrativos de flota (Preliquidaciones, GNV, Diesel, Peajes)</p>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${notification.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : notification.type === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs hover:text-slate-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PANEL PRINCIPAL */}
      <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6">

        {/* PASO 1: SELECCIONAR TIPO DE DOCUMENTO */}
        {step === 1 && !activePreliqJobId && !isJobCompleted && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-350 mb-3">Paso 1: Seleccione el tipo de documento a cargar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setDocumentType('PRELIQUIDACION');
                  setStep(2);
                }}
                className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:border-emerald-500/50 hover:bg-slate-850/30 text-left transition cursor-pointer group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20 group-hover:scale-105 transition shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition">Cargar Preliquidaciones</h3>
                  <p className="text-xs text-slate-500 mt-1">Ingesta y estructuración automática de guías de viajes desde PDFs de preliquidación mediante Gemini.</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setDocumentType('DIESEL');
                  setStep(2);
                }}
                className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:border-emerald-500/50 hover:bg-slate-850/30 text-left transition cursor-pointer group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition shrink-0">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition">Cuentas de Diesel</h3>
                  <p className="text-xs text-slate-500 mt-1">Carga y procesamiento de reportes de consumo de combustible diesel (.xls, .xlsx).</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setDocumentType('GNV');
                  setStep(2);
                }}
                className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:border-emerald-500/50 hover:bg-slate-850/30 text-left transition cursor-pointer group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition">Cuentas de GNV</h3>
                  <p className="text-xs text-slate-500 mt-1">Carga y procesamiento de reportes de consumo de gas natural vehicular (.xlsx).</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setDocumentType('PEAJES');
                  setStep(2);
                }}
                className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:border-emerald-500/50 hover:bg-slate-850/30 text-left transition cursor-pointer group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition">Cuentas de Peajes</h3>
                  <p className="text-xs text-slate-500 mt-1">Carga y procesamiento de reportes de consumo de peajes (.xlsx).</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: CARGA DE ARCHIVOS */}
        {step === 2 && !activePreliqJobId && !isJobCompleted && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-300">
                Paso 2: Cargar archivos de {
                  documentType === 'PRELIQUIDACION' ? 'Preliquidaciones (PDF)' :
                    documentType === 'DIESEL' ? 'Combustible Diesel (Excel)' :
                      documentType === 'GNV' ? 'Gas GNV (Excel)' : 'Peajes (Excel)'
                }
              </h3>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setStep(1);
                }}
                className="text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 px-3.5 py-1.5 rounded-lg border border-slate-700/50 transition cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Regresar
              </button>
            </div>

            {localProcessing ? (
              <div className="text-center py-8 space-y-4">
                <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-400 font-bold">Iniciando el proceso de carga...</p>
              </div>
            ) : (
              <>
                <div className="border-dashed border-2 border-slate-800 hover:border-emerald-500/50 transition rounded-xl p-8 text-center relative">
                  <input
                    type="file"
                    multiple
                    accept={
                      documentType === 'PRELIQUIDACION' ? 'application/pdf' :
                        documentType === 'DIESEL' ? '.xls,.xlsx' : '.xlsx'
                    }
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileText className="w-12 h-12 text-slate-650 mx-auto mb-3" />
                  <p className="text-sm text-slate-350 font-bold mb-1">Arrastra tus archivos aquí</p>
                  <p className="text-xs text-slate-550">
                    {documentType === 'PRELIQUIDACION' ? 'Soporta archivos PDF' : 'Soporta libros de Excel'}
                  </p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Archivos seleccionados ({selectedFiles.length})</h3>
                    <ul className="space-y-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/30">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx} className="flex justify-between items-center text-xs text-slate-350 bg-slate-900/20 p-2 rounded-lg border border-slate-800/40 hover:border-slate-800 transition">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold truncate max-w-xs sm:max-w-md">{file.name}</span>
                            <span className="text-[10px] text-slate-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(idx)}
                            className="text-slate-500 hover:text-red-400 p-1 rounded transition cursor-pointer"
                            title="Eliminar archivo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleProcess}
                      className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer"
                    >
                      Procesar documentos
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* PASO 3: PROCESAMIENTO EN PROGRESO */}
        {isJobRunning && (
          <div className="text-center py-8 space-y-6">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-355">
                {preliqJobStatus.status === 'processing'
                  ? `Procesando archivo ${preliqJobStatus.processedFiles + 1} de ${preliqJobStatus.totalFiles}...`
                  : 'Preparando análisis en segundo plano...'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Tiempo transcurrido: {preliqJobStatus.elapsedTime || 0} segundos</p>
            </div>
            <div className="max-w-md mx-auto space-y-4">
              <div className="bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${preliqJobStatus.progress || 0}%` }}></div>
              </div>
              <p className="text-xs text-slate-500 font-semibold">{(preliqJobStatus.progress || 0)}% Completado</p>

              <div className="pt-2">
                <button
                  onClick={handleCancelProcess}
                  className="bg-slate-900 border border-slate-800 hover:border-red-500/30 hover:bg-red-950/20 text-slate-300 hover:text-red-400 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancelar proceso
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 4: REVISAR Y APROBAR DATOS (TABLAS DINÁMICAS POR TIPO) */}
        {isJobCompleted && results.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div>
                <p className="text-xs text-slate-550 font-bold uppercase">Paso 4: Previsualización de datos extraídos</p>
                <p className="text-sm text-slate-350 mt-1">Se extrajeron {results.length} registros. Revisa la información antes de guardar:</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleApproveData}
                  disabled={localProcessing}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  {localProcessing ? 'Procesando...' : 'Aprobar carga'}
                </button>
                <button
                  onClick={handleCancelCarga}
                  disabled={localProcessing}
                  className="bg-slate-850 hover:bg-slate-800 hover:text-red-400 disabled:opacity-50 text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancelar carga
                </button>
                <button
                  onClick={handleExportCSV}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-950/10 text-emerald-400 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Exportar a CSV
                </button>
              </div>
            </div>

            <div className={`overflow-x-auto rounded-lg border ${darkMode ? 'border-slate-850' : 'border-slate-200'} max-h-[480px] overflow-y-auto`}>

              {/* TABLA: PRELIQUIDACIONES */}
              {documentType === 'PRELIQUIDACION' && (
                <table className={`w-full text-xs text-left border-collapse ${darkMode ? 'bg-slate-950/20' : 'bg-white'}`}>
                  <thead>
                    <tr className={`border-b ${darkMode ? 'bg-slate-900 border-slate-850 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} font-semibold sticky top-0 z-10`}>
                      <th className="px-4 py-3">Liquidación</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Nro Guía</th>
                      <th className="px-4 py-3">Placa</th>
                      <th className="px-4 py-3">Insumo</th>
                      <th className="px-4 py-3 text-right">Peso Seco</th>
                      <th className="px-4 py-3 text-right">Flete</th>
                      <th className="px-4 py-3">Origen / Destino</th>
                      <th className="px-4 py-3">Fuente (Archivo)</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-850/60' : 'divide-slate-200'}`}>
                    {results.map((rec, idx) => (
                      <tr key={idx} className={`transition-colors ${darkMode ? 'hover:bg-slate-900/30 text-slate-350' : 'hover:bg-slate-50/50 text-slate-700'}`}>
                        <td className={`px-4 py-3 font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{rec.liquidacion_nro}</td>
                        <td className="px-4 py-3">{rec.fecha}</td>
                        <td className="px-4 py-3 font-mono">{rec.nro_guia}</td>
                        <td className={`px-4 py-3 font-bold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{rec.placa}</td>
                        <td className="px-4 py-3">{rec.insumo}</td>
                        <td className="px-4 py-3 text-right">{rec.peso_seco} Tn</td>
                        <td className="px-4 py-3 text-right text-emerald-500 font-semibold">S/. {rec.monto_total?.toFixed(2)}</td>
                        <td className="px-4 py-3 truncate max-w-xs" title={`${rec.origen || 'No mapeado'} ➔ ${rec.destino || 'No mapeado'}`}>
                          <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{rec.origen || 'S/D'}</span>
                          <span className="text-slate-500 mx-1">➔</span>
                          <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{rec.destino || 'S/D'}</span>
                        </td>
                        <td className="px-4 py-3 italic max-w-xs truncate text-slate-500" title={rec.fuente}>{rec.fuente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TABLA: DIESEL */}
              {documentType === 'DIESEL' && (
                <table className={`w-full text-xs text-left border-collapse ${darkMode ? 'bg-slate-950/20' : 'bg-white'}`}>
                  <thead>
                    <tr className={`border-b ${darkMode ? 'bg-slate-900 border-slate-850 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} font-semibold sticky top-0 z-10`}>
                      <th className="px-4 py-3">ID Vehículo</th>
                      <th className="px-4 py-3">Placa</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Hora Despacho</th>
                      <th className="px-4 py-3 text-right">Galones</th>
                      <th className="px-4 py-3 text-right">P. Unitario</th>
                      <th className="px-4 py-3 text-right">Importe</th>
                      <th className="px-4 py-3">Fuente</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-850/60' : 'divide-slate-200'}`}>
                    {results.map((rec, idx) => (
                      <tr key={idx} className={`transition-colors ${darkMode ? 'hover:bg-slate-900/30 text-slate-350' : 'hover:bg-slate-50/50 text-slate-700'}`}>
                        <td className={`px-4 py-3 font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{rec.vehiculo_id}</td>
                        <td className="px-4 py-3 font-mono font-bold">{rec.placa}</td>
                        <td className="px-4 py-3">{rec.fecha}</td>
                        <td className="px-4 py-3 text-slate-400">{rec.hora ? rec.hora.split(' ')[1] : ''}</td>
                        <td className="px-4 py-3 text-right">{rec.galones_despachados?.toFixed(3)} gal</td>
                        <td className="px-4 py-3 text-right">S/. {rec.precio_unitario?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-emerald-500 font-semibold">S/. {rec.monto_despachado?.toFixed(2)}</td>
                        <td className="px-4 py-3 italic max-w-xs truncate text-slate-500" title={rec.fuente}>{rec.fuente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TABLA: GNV */}
              {documentType === 'GNV' && (
                <table className={`w-full text-xs text-left border-collapse ${darkMode ? 'bg-slate-950/20' : 'bg-white'}`}>
                  <thead>
                    <tr className={`border-b ${darkMode ? 'bg-slate-900 border-slate-850 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} font-semibold sticky top-0 z-10`}>
                      <th className="px-4 py-3">Factura</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Placa</th>
                      <th className="px-4 py-3 text-right">M³ Despachados</th>
                      <th className="px-4 py-3 text-right">P. Unitario M³</th>
                      <th className="px-4 py-3 text-right">Monto Total</th>
                      <th className="px-4 py-3">Fuente</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-850/60' : 'divide-slate-200'}`}>
                    {results.map((rec, idx) => (
                      <tr key={idx} className={`transition-colors ${darkMode ? 'hover:bg-slate-900/30 text-slate-350' : 'hover:bg-slate-50/50 text-slate-700'}`}>
                        <td className={`px-4 py-3 font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{rec.factura}</td>
                        <td className="px-4 py-3">{rec.fecha}</td>
                        <td className="px-4 py-3 font-mono font-bold">{rec.placa}</td>
                        <td className="px-4 py-3 text-right">{rec.m3?.toFixed(2)} m³</td>
                        <td className="px-4 py-3 text-right">S/. {rec.precio_unitario?.toFixed(4)}</td>
                        <td className="px-4 py-3 text-right text-emerald-500 font-semibold">S/. {rec.monto_total?.toFixed(2)}</td>
                        <td className="px-4 py-3 italic max-w-xs truncate text-slate-500" title={rec.fuente}>{rec.fuente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TABLA: PEAJES */}
              {documentType === 'PEAJES' && (
                <table className={`w-full text-xs text-left border-collapse ${darkMode ? 'bg-slate-950/20' : 'bg-white'}`}>
                  <thead>
                    <tr className={`border-b ${darkMode ? 'bg-slate-900 border-slate-850 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} font-semibold sticky top-0 z-10`}>
                      <th className="px-4 py-3">Tipo Servicio</th>
                      <th className="px-4 py-3">Red de Uso</th>
                      <th className="px-4 py-3">ID Vehículo</th>
                      <th className="px-4 py-3">Fecha Tránsito</th>
                      <th className="px-4 py-3">Punto de Servicio</th>
                      <th className="px-4 py-3">Comprobante</th>
                      <th className="px-4 py-3 text-right">Total Servicio</th>
                      <th className="px-4 py-3 text-right">Saldo Final</th>
                      <th className="px-4 py-3">Fuente</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-850/60' : 'divide-slate-200'}`}>
                    {results.map((rec, idx) => (
                      <tr key={idx} className={`transition-colors ${darkMode ? 'hover:bg-slate-900/30 text-slate-350' : 'hover:bg-slate-50/50 text-slate-700'}`}>
                        <td className="px-4 py-3">{rec.tipo_servicio}</td>
                        <td className="px-4 py-3 text-slate-400">{rec.red_uso}</td>
                        <td className={`px-4 py-3 font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{rec.placa}</td>
                        <td className="px-4 py-3">{rec.fecha_transito}</td>
                        <td className="px-4 py-3 truncate max-w-xs">{rec.punto_servicio}</td>
                        <td className="px-4 py-3 font-mono">{rec.comprobante}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${rec.total_servicio < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          S/. {rec.total_servicio?.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">S/. {rec.saldo_final?.toFixed(2)}</td>
                        <td className="px-4 py-3 italic max-w-xs truncate text-slate-500" title={rec.fuente}>{rec.fuente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          </div>
        )}

        {/* CASO 5: TRABAJO CON 0 RESULTADOS O ERROR */}
        {isJobCompleted && results.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto" />
            <p className="text-sm font-bold text-slate-355">No se pudieron extraer datos de los archivos.</p>
            <button
              onClick={() => {
                setActivePreliqJobId(null);
                setPreliqJobStatus(null);
                setSelectedFiles([]);
                setStep(1);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs transition cursor-pointer"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomDatePicker({ value, onChange, darkMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    return new Date();
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const totalDays = getDaysInMonth(year, month);
  const startDayOffset = getFirstDayOfMonth(year, month);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return 'Seleccione Día';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  };

  const isSelected = (day) => {
    if (!value) return false;
    const parts = value.split('-');
    if (parts.length === 3) {
      return parseInt(parts[0]) === year && parseInt(parts[1]) - 1 === month && parseInt(parts[2]) === day;
    }
    return false;
  };

  return (
    <div className="relative w-36" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold border rounded-lg outline-none focus:border-emerald-500 transition cursor-pointer text-left ${darkMode
          ? 'bg-slate-900 border-slate-800 text-slate-200'
          : 'bg-white border-slate-300 text-slate-800'
          }`}
      >
        <span>{getDisplayValue()}</span>
        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className={`absolute left-0 mt-1 w-64 rounded-xl border shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-100 ${darkMode
          ? 'bg-slate-900 border-slate-800 text-slate-200'
          : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div className="flex justify-between items-center mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`p-1 rounded transition cursor-pointer ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold">{monthsList[month]} {year}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              className={`p-1 rounded transition cursor-pointer ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
            {daysOfWeek.map(d => (
              <div key={d} className="py-0.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: startDayOffset }).map((_, idx) => (
              <div key={`offset-${idx}`} className="py-1"></div>
            ))}
            {Array.from({ length: totalDays }).map((_, idx) => {
              const dayNum = idx + 1;
              const active = isSelected(dayNum);
              return (
                <button
                  type="button"
                  key={`day-${dayNum}`}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`py-1 rounded-md transition font-semibold cursor-pointer ${active
                    ? 'bg-emerald-500 text-slate-950 font-extrabold'
                    : darkMode
                      ? 'hover:bg-emerald-500 hover:text-slate-950 text-slate-300'
                      : 'hover:bg-emerald-500 hover:text-white text-slate-700'
                    }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomDropdown({ value, onChange, options, placeholder, darkMode, widthClass = 'w-40' }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  const formattedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return opt;
    }
    return { value: opt, label: opt };
  });

  const selectedOpt = formattedOptions.find(o => o.value === value);
  const displayValue = selectedOpt ? selectedOpt.label : (value || placeholder);

  return (
    <div className={`relative ${widthClass}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold border rounded-lg outline-none focus:border-emerald-500 transition cursor-pointer text-left ${darkMode
          ? 'bg-slate-900 border-slate-800 text-slate-200'
          : 'bg-white border-slate-300 text-slate-800'
          }`}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border shadow-xl z-[99] animate-in fade-in slide-in-from-top-1 duration-105 ${darkMode
          ? 'bg-slate-900 border-slate-800 text-slate-200'
          : 'bg-white border-slate-200 text-slate-800'
          }`}>
          <div
            onClick={() => { onChange(''); setIsOpen(false); }}
            className={`px-3 py-1.5 text-xs cursor-pointer transition font-medium ${value === ''
              ? 'bg-emerald-500/20 text-emerald-400 font-bold'
              : darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
              }`}
          >
            Todos
          </div>
          {formattedOptions.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`px-3 py-1.5 text-xs cursor-pointer transition font-medium ${value === opt.value
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : darkMode
                  ? 'hover:bg-emerald-500 hover:text-slate-950'
                  : 'hover:bg-emerald-500 hover:text-white'
                }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ViajesView({ API_BASE, darkMode }) {
  const [todayPlanned, setTodayPlanned] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterPlaca, setFilterPlaca] = useState('');
  const [filterConductor, setFilterConductor] = useState('');
  const [filterOrigen, setFilterOrigen] = useState('');
  const [filterOptions, setFilterOptions] = useState({ placas: [], conductores: [], origenes: [] });

  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Estados de edición del plan de hoy
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [newPlannedTrips, setNewPlannedTrips] = useState(0);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchTodayPlanned = async () => {
    setLoadingToday(true);
    try {
      const res = await fetch(`${API_BASE}/monitoring/status`);
      const json = await res.json();
      if (json.success) {
        const pending = (json.data.vehicles || []).filter(v =>
          (v.viajes_programados || 0) > (v.viajes_realizados || 0) &&
          v.destino_asignado && v.destino_asignado !== '-'
        );
        setTodayPlanned(pending);
      }
    } catch (err) {
      console.error('Error fetching today planned trips:', err);
    } finally {
      setLoadingToday(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/viajes/filters`);
      const json = await res.json();
      if (json.success) {
        setFilterOptions(json.data);
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchHistory = async () => {
    if (!filterDate && !filterPlaca && !filterConductor && !filterOrigen) {
      setCompletedTrips([]);
      return;
    }
    setLoadingHistory(true);
    try {
      let query = `${API_BASE}/viajes?limit=150`;
      if (filterDate) query += `&date=${filterDate}`;
      if (filterPlaca && filterPlaca !== '') query += `&placa=${filterPlaca}`;
      if (filterConductor && filterConductor !== '') query += `&conductor=${filterConductor}`;
      if (filterOrigen && filterOrigen !== '') query += `&origen=${filterOrigen}`;

      const res = await fetch(query);
      const json = await res.json();
      if (json.success) {
        setCompletedTrips(json.data);
      }
    } catch (err) {
      console.error('Error fetching completed trips:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchTodayPlanned();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [filterDate, filterPlaca, filterConductor, filterOrigen]);

  const handleOpenEditModal = (v) => {
    const isActive = ['Carga en cantera', 'En ruta', 'Descarga en planta'].includes(v.estado);
    const minTrips = isActive ? (v.viajes_realizados + 1) : v.viajes_realizados;

    setEditingVehicle({
      ...v,
      isActive,
      minTrips
    });
    setNewPlannedTrips(v.viajes_programados);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingVehicle) return;
    if (newPlannedTrips < editingVehicle.minTrips || newPlannedTrips > editingVehicle.viajes_programados) {
      setEditError(`La cantidad de viajes debe estar entre ${editingVehicle.minTrips} y ${editingVehicle.viajes_programados}.`);
      return;
    }

    setSubmittingEdit(true);
    setEditError('');
    try {
      const res = await fetch(`${API_BASE}/planning/update-trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehiculo_id: editingVehicle.vehiculo_id,
          viajes_programados: newPlannedTrips
        })
      });
      const json = await res.json();
      if (json.success) {
        setEditingVehicle(null);
        fetchTodayPlanned();
        fetchHistory();
      } else {
        setEditError(json.error || 'Error al guardar los cambios.');
      }
    } catch (err) {
      console.error('Error updating trips:', err);
      setEditError('Error de conexión con el servidor.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const getStatusBadge = (estado) => {
    const est = (estado || '').toLowerCase().trim();
    switch (est) {
      case 'carga en cantera':
      case 'carga':
        return <span className="px-2 py-0.5 text-[10px] rounded font-semibold border bg-sky-500/10 text-sky-400 border-sky-500/20">Carga en Cantera</span>;
      case 'en ruta':
        return <span className="px-2 py-0.5 text-[10px] rounded font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">En Ruta</span>;
      case 'descarga en planta':
      case 'descarga':
      case 'carga/descarga':
        return <span className="px-2 py-0.5 text-[10px] rounded font-semibold border bg-purple-500/10 text-purple-400 border-purple-500/20">Descarga en Planta</span>;
      case 'detenido':
        return <span className="px-2 py-0.5 text-[10px] rounded font-semibold border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Detenido</span>;
      case 'garaje':
      case 'garage':
      default:
        return <span className="px-2 py-0.5 text-[10px] rounded font-semibold border bg-red-500/10 text-red-400 border-red-500/20">Garage</span>;
    }
  };

  const formatDateOnly = (dateField) => {
    if (!dateField) return '-';
    try {
      const val = dateField.value || dateField;
      if (typeof val === 'string') {
        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          return `${match[3]}/${match[2]}/${match[1]}`;
        }
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
      }
      return String(val).split('T')[0];
    } catch (e) {
      return String(dateField).split('T')[0];
    }
  };

  const hasFilter = !!(filterDate || filterPlaca || filterConductor || filterOrigen);

  const handleClearFilters = () => {
    setFilterDate('');
    setFilterPlaca('');
    setFilterConductor('');
    setFilterOrigen('');
    setCompletedTrips([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
            <Route className="w-5 h-5 text-emerald-400" />
            Control de Viajes
          </h2>
          <p className="text-xs text-slate-550">
            Monitoreo de viajes pendientes del plan del día e historial completo de fletes liquidados.
          </p>
        </div>
      </div>

      {/* PLAN DE HOY */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/60 bg-slate-950/20 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Plan de Hoy: Viajes Pendientes (No Culminados)</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Vehículos en operación con viajes programados que aún no completan su meta diaria.</p>
          </div>
          <button
            onClick={fetchTodayPlanned}
            className="p-1.5 hover:bg-slate-800/60 rounded-lg border border-slate-800 transition cursor-pointer"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loadingToday ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold bg-slate-950/40">
                <th className="py-3 px-5 text-center">Placa</th>
                <th className="py-3 px-5">Cantera Origen</th>
                <th className="py-3 px-5">Destino Asignado</th>
                <th className="py-3 px-5 text-center">Realizados / Prog.</th>
                <th className="py-3 px-5">Estado</th>
                <th className="py-3 px-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-880/40">
              {loadingToday ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-medium italic">
                    Cargando plan de hoy...
                  </td>
                </tr>
              ) : todayPlanned.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 font-medium italic">
                    No hay viajes pendientes programados para hoy. ¡Todos los camiones completaron su meta! 🎉
                  </td>
                </tr>
              ) : (
                todayPlanned.map(v => (
                  <tr key={v.vehiculo_id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-3 px-5 text-center text-slate-200 font-extrabold">{v.placa}</td>
                    <td className="py-3 px-5">
                      <span className="text-black font-semibold uppercase">{v.cantera_origen || '-'}</span>
                    </td>
                    <td className="py-3 px-5">
                      {v.destino_asignado && v.destino_asignado !== '-' ? (
                        <span className="font-bold text-slate-200 uppercase">{v.destino_asignado}</span>
                      ) : (
                        <span className="text-slate-500 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-center font-bold text-slate-400">
                      {v.viajes_realizados} / {v.viajes_programados}
                    </td>
                    <td className="py-3 px-5">{getStatusBadge(v.estado)}</td>
                    <td className="py-3 px-5 text-center">
                      <button
                        onClick={() => handleOpenEditModal(v)}
                        className="px-2 py-1 text-[11px] font-bold rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FILTROS HISTORIAL */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-slate-950/10 flex flex-wrap gap-4 items-center justify-between relative z-30">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Filtrar por Día</span>
            <CustomDatePicker
              value={filterDate}
              onChange={setFilterDate}
              darkMode={darkMode}
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Filtrar por Placa</span>
            <CustomDropdown
              value={filterPlaca}
              onChange={setFilterPlaca}
              options={filterOptions.placas}
              placeholder="Todos"
              darkMode={darkMode}
              widthClass="w-36"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Conductor</span>
            <CustomDropdown
              value={filterConductor}
              onChange={setFilterConductor}
              options={filterOptions.conductores}
              placeholder="Todos"
              darkMode={darkMode}
              widthClass="w-48"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Origen (Cantera / Locación)</span>
            <CustomDropdown
              value={filterOrigen}
              onChange={setFilterOrigen}
              options={filterOptions.origenes}
              placeholder="Todos"
              darkMode={darkMode}
              widthClass="w-56"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {hasFilter && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-850 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer border border-slate-300 dark:border-slate-800 transition"
            >
              Limpiar Filtros
            </button>
          )}
          <button
            onClick={fetchHistory}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
            Buscar
          </button>
        </div>
      </div>

      {/* HISTORIAL VIAJES COMPLETADOS */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/60 bg-slate-950/20">
          <h3 className="text-sm font-bold text-slate-200">Historial de Viajes Completados</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Listado de guías de remisión física liquidadas y registradas en BigQuery.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold bg-slate-950/40">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-center">Placa</th>
                <th className="py-3 px-4">Conductor</th>
                <th className="py-3 px-4">Origen (Cantera)</th>
                <th className="py-3 px-4">Destino (Planta)</th>
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4 text-center">Planif.</th>
                <th className="py-3 px-4 text-right">Toneladas</th>
                <th className="py-3 px-4 text-right">Gastos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {!hasFilter ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500 dark:text-slate-400 font-semibold text-sm">
                    🔍 Por favor, seleccione un día o ingrese una placa para buscar en el historial de viajes.
                  </td>
                </tr>
              ) : loadingHistory ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-medium italic">
                    Cargando historial de viajes...
                  </td>
                </tr>
              ) : completedTrips.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500 font-medium italic">
                    No se encontraron viajes completados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                completedTrips.map((t, idx) => (
                  <tr key={t.id || idx} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-3 px-4 text-slate-450 dark:text-slate-400 font-medium">{formatDateOnly(t.fecha)}</td>
                    <td className="py-3 px-4 text-center text-slate-200 font-extrabold">{t.placa || t.vehiculo_id}</td>
                    <td className="py-3 px-4 text-slate-355">{t.conductor || '-'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-300">{t.origen || '-'}</td>
                    <td className="py-3 px-4 text-slate-355">{t.destino || '-'}</td>
                    <td className="py-3 px-4 text-slate-355">{t.material || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (t.planificado || '').toLowerCase() === 'no'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {(t.planificado || '').toLowerCase() === 'no' ? 'NO' : 'SÍ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-bold">{(t.toneladas || 0.0).toFixed(1)}</td>
                    <td className="py-3 px-4 text-right text-red-400 font-bold">S/ {(t.gasto || 0.0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VENTANA EMERGENTE EDITAR PLAN */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left ${darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-200'
            : 'bg-white border-slate-200 text-slate-800'
            }`}>
            {/* Header */}
            <div className={`px-5 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-100'
              }`}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
                  <Route className="w-5 h-5 text-emerald-400" />
                  Editar Plan - {editingVehicle.placa}
                </h3>
                <p className="text-[10px] text-slate-500">Modificar la asignación diaria de viajes del vehículo</p>
              </div>
              <button
                onClick={() => setEditingVehicle(null)}
                className={`p-1 rounded-lg transition cursor-pointer ${darkMode ? 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                  }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border ${darkMode ? 'bg-slate-950/40 border-slate-800/50' : 'bg-slate-50 border-slate-100'
                }`}>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Origen (Cantera)</span>
                  <span className={`font-bold uppercase text-sm block mt-0.5 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{editingVehicle.cantera_origen || '-'}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Estado GPS</span>
                  <span className={`font-bold text-sm block mt-0.5 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{editingVehicle.estado}</span>
                </div>
                <div className="mt-1">
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Viajes Realizados</span>
                  <span className={`font-bold text-sm block mt-0.5 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{editingVehicle.viajes_realizados}</span>
                </div>
                <div className="mt-1">
                  <span className="block text-[9px] uppercase font-bold text-slate-500">Viajes Programados</span>
                  <span className={`font-bold text-sm block mt-0.5 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{editingVehicle.viajes_programados}</span>
                </div>
              </div>

              {/* Banner de explicación de reglas de negocio */}
              <div className={`p-3 rounded-lg border text-[11px] font-medium leading-relaxed ${editingVehicle.isActive
                ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-450'
                }`}>
                {editingVehicle.isActive ? (
                  <p>
                    ⚠️ El camión está activo (cargando o en ruta). No se puede reducir la programación a menos de <strong>{editingVehicle.minTrips}</strong> viajes (el viaje en curso está comprometido).
                  </p>
                ) : (
                  <p>
                    ✅ El camión se encuentra detenido/inactivo. Puedes reducir la programación hasta <strong>{editingVehicle.minTrips}</strong> viajes.
                    {editingVehicle.minTrips === 0 && ' Si la reduces a 0 viajes, se eliminará su planificación del día y quedará disponible para reasignar.'}
                  </p>
                )}
              </div>

              {/* Formulario */}
              <div className="space-y-1.5 pt-2">
                <label className={`font-bold block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total de viajes programados para hoy:</label>
                <input
                  type="number"
                  min={editingVehicle.minTrips}
                  max={editingVehicle.viajes_programados}
                  value={newPlannedTrips}
                  onChange={(e) => setNewPlannedTrips(Math.max(editingVehicle.minTrips, Math.min(editingVehicle.viajes_programados, parseInt(e.target.value) || 0)))}
                  className={`border rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 transition w-full font-bold ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                />
              </div>

              {editError && (
                <p className="text-red-500 font-semibold text-[11px] pt-1">{editError}</p>
              )}
            </div>

            {/* Footer */}
            <div className={`px-5 py-4 border-t flex justify-end gap-2 ${darkMode ? 'bg-slate-905/40 border-slate-800/60' : 'bg-slate-50 border-slate-100'
              }`}>
              <button
                onClick={() => setEditingVehicle(null)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition ${darkMode
                  ? 'bg-slate-850 hover:bg-slate-800 border-slate-800 text-slate-350'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={submittingEdit || newPlannedTrips === editingVehicle.viajes_programados}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-55 disabled:cursor-not-allowed text-slate-950 rounded-lg text-xs font-extrabold cursor-pointer transition flex items-center gap-1.5"
              >
                {submittingEdit && <RefreshCw className="w-3 h-3 animate-spin" />}
                {newPlannedTrips === 0 ? 'Eliminar Planificación' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

