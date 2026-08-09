import React, { useState, useEffect, useRef, memo } from 'react';

// Centro aproximado de Lima Metropolitana donde operan los vehículos
const defaultCenter = {
  lat: -11.98,
  lng: -77.05,
};

function MapComponent({ vehicles = [], darkMode = false }) {
  const apiKey = import.meta.env.VITE_HERE_MAPS_API_KEY || '';
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const getStatusBadgeClass = (estado) => {
    switch (estado) {
      case 'Carga en cantera': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'En ruta': return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'Descarga en planta':
      case 'carga/descarga': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Detenido': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'garaje': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // 1. Inicialización única del mapa de HERE
  useEffect(() => {
    if (!apiKey || !window.H || !mapRef.current) return;

    // Si ya existe mapa, limpiamos
    if (mapInstanceRef.current) {
      mapInstanceRef.current.map.dispose();
      mapInstanceRef.current = null;
      setMapReady(false);
    }

    try {
      const platform = new window.H.service.Platform({
        apikey: apiKey
      });

      const defaultLayers = platform.createDefaultLayers();

      // HERE tiene esquemas claros/oscuros. Si está activo el modo oscuro, usamos la capa vectorial nocturna (night).
      let baseLayer = defaultLayers.vector.normal.map;
      if (darkMode && defaultLayers.vector.normal.night) {
        baseLayer = defaultLayers.vector.normal.night;
      }

      const map = new window.H.Map(
        mapRef.current,
        baseLayer,
        {
          zoom: 11,
          center: defaultCenter,
          pixelRatio: window.devicePixelRatio || 1
        }
      );

      // Habilitar comportamiento del mapa (Zoom, arrastrar)
      const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));

      // Crear componentes de UI por defecto
      const ui = window.H.ui.UI.createDefault(map, defaultLayers, 'es-ES');

      mapInstanceRef.current = { map, platform, ui, behavior };
      setMapReady(true);

      const handleResize = () => map.getViewPort().resize();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.map.dispose();
          } catch (e) {
            console.warn('Error disposing map:', e);
          }
          mapInstanceRef.current = null;
          setMapReady(false);
          markersRef.current = []; // Limpiar marcadores obsoletos
        }
      };
    } catch (err) {
      console.error('Error al inicializar HERE Maps:', err);
    }
  }, [apiKey, darkMode]);

  // 1.5. Escuchar evento de enfoque de vehículo desde el Chatbot
  useEffect(() => {
    const handleFocus = (e) => {
      const { placa, lat, lng } = e.detail;
      if (!mapInstanceRef.current || !mapReady) return;
      const { map } = mapInstanceRef.current;
      console.log('[MapComponent] Enfocando vehículo vía evento:', placa, lat, lng);
      
      const targetCenter = { lat: parseFloat(lat), lng: parseFloat(lng) };
      map.setCenter(targetCenter, true);
      map.setZoom(14, true);

      // Buscar el marcador de ese vehículo para seleccionarlo y abrir su popup
      const marker = markersRef.current.find(m => {
        const d = m.getData();
        if (!d) return false;
        const match = d.placa.match(/\(([^)]+)\)/);
        const shortPlate = match ? match[1] : d.placa;
        return shortPlate.toUpperCase().trim() === placa.toUpperCase().trim() ||
               d.vehiculo_id.toUpperCase().trim() === placa.toUpperCase().trim();
      });

      if (marker) {
        setSelectedVehicle(marker.getData());
      }
    };

    window.addEventListener('focus-vehicle-on-map', handleFocus);
    return () => {
      window.removeEventListener('focus-vehicle-on-map', handleFocus);
    };
  }, [mapReady]);

  // 2. Inyección dinámica/Reconciliación de marcadores (Evita parpadeo)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const { map } = mapInstanceRef.current;

    const currentMarkers = markersRef.current || [];
    const newMarkers = [];

    // Recorrer los vehículos entrantes
    vehicles.forEach((v) => {
      const lat = parseFloat(v.lat);
      const lng = parseFloat(v.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      // Calcular color del estado
      let color = '#64748b'; // Slate (Inactivo)
      if (v.estado === 'Carga en cantera') color = '#0ea5e9'; // Celeste
      if (v.estado === 'En ruta') color = '#10b981'; // Verde
      if (v.estado === 'Descarga en planta' || v.estado === 'carga/descarga') color = '#8b5cf6'; // Morado
      if (v.estado === 'Detenido') color = '#eab308'; // Amarillo
      if (v.estado === 'garaje') color = '#ef4444'; // Rojo

      // Extraer placa corta
      const match = v.placa.match(/\(([^)]+)\)/);
      const shortPlate = match ? match[1] : v.placa;

      const angle = v.angle || 0;
      const isMoving = v.velocidad > 1;

      // Generar SVG
      const svgMarkup = `<svg width="90" height="38" viewBox="0 0 90 38" xmlns="http://www.w3.org/2000/svg"><path d="M 45 26 L 41 34 L 49 34 Z" fill="#0f172a" stroke="${color}" stroke-width="1.5" /><rect x="2" y="2" width="86" height="24" rx="12" fill="#0f172a" stroke="${color}" stroke-width="2" /><circle cx="12" cy="14" r="4.5" fill="${color}" /><text x="22" y="17" fill="#f1f5f9" font-size="10" font-family="monospace, sans-serif" font-weight="bold">${shortPlate}</text><g transform="translate(74, 14)"><g transform="rotate(${angle})"><path d="M -3 4 L 0 -4 L 3 4 L 0 2 Z" fill="${isMoving ? color : '#475569'}" /></g></g></svg>`;

      // Buscar si ya existe un marcador para este vehículo
      const existingMarker = currentMarkers.find(
        (m) => m.getData() && m.getData().vehiculo_id === v.vehiculo_id
      );

      if (existingMarker) {
        // 1. Actualizar la posición del marcador existente
        existingMarker.setGeometry({ lat, lng });

        // 2. Comprobar si las propiedades que afectan al icono cambiaron para recrearlo
        const prevData = existingMarker.getData();
        const iconChanged =
          prevData.estado !== v.estado ||
          prevData.angle !== v.angle ||
          prevData.velocidad !== v.velocidad ||
          prevData.placa !== v.placa;

        if (iconChanged) {
          try {
            const icon = new window.H.map.Icon(svgMarkup, {
              size: { w: 90, h: 38 },
              anchor: { x: 45, y: 34 }
            });
            existingMarker.setIcon(icon);
          } catch (err) {
            console.warn('Error al actualizar icono del marcador:', err);
          }
        }

        // Actualizar la metadata guardada en el marcador
        existingMarker.setData(v);
        newMarkers.push(existingMarker);
      } else {
        // Crear un marcador nuevo
        try {
          const icon = new window.H.map.Icon(svgMarkup, {
            size: { w: 90, h: 38 },
            anchor: { x: 45, y: 34 }
          });
          const marker = new window.H.map.Marker({ lat, lng }, { icon });

          marker.setData(v);

          marker.addEventListener('tap', (evt) => {
            setSelectedVehicle(v);
            map.setCenter(evt.target.getGeometry(), true);
          });

          map.addObject(marker);
          newMarkers.push(marker);
        } catch (err) {
          console.warn('Error al inyectar marcador nuevo en HERE Maps:', err);
        }
      }
    });

    // Remover marcadores antiguos que ya no corresponden a ningún vehículo en la lista
    currentMarkers.forEach((m) => {
      const isStillPresent = newMarkers.some(
        (nm) => nm.getData() && nm.getData().vehiculo_id === m.getData().vehiculo_id
      );
      if (!isStillPresent) {
        try {
          map.removeObject(m);
        } catch (e) {
          console.warn('Error al remover marcador huérfano:', e);
        }
      }
    });

    // Guardar la nueva lista de marcadores activos en la referencia
    markersRef.current = newMarkers;
  }, [vehicles, mapReady]);

  // 3. Renderizado de Fallback (Simulación con SVG interactivo si no hay API Key)
  if (!apiKey || !window.H) {
    return (
      <div className={`relative w-full h-full flex flex-col items-center justify-center rounded-xl border overflow-hidden min-h-[350px] ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        {/* Grilla de fondo */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
        
        {/* Alerta flotante informativa */}
        <div className="absolute top-3 left-3 right-3 z-10 glass-card px-3 py-2 rounded-lg text-xs text-slate-400 flex items-center justify-between border border-slate-700/50">
          <span>📍 Modo de Simulación de Mapa Activo (HERE Maps)</span>
          {!apiKey && <span className="text-[10px] text-orange-400">Define VITE_HERE_MAPS_API_KEY en .env para ver mapa real</span>}
        </div>

        {/* Canvas de Mapa de Lima simulado */}
        <div className="relative w-full h-full flex items-center justify-center p-8">
          <svg className="absolute inset-0 w-full h-full text-slate-800/25" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0 350 Q 150 300 250 250 T 400 180 T 600 150 L 600 400 L 0 400 Z" fill={darkMode ? "#020617" : "#bfdbfe"} opacity="0.4" />
            <line x1="0" y1="100" x2="600" y2="300" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="2" strokeDasharray="5 5" />
            <line x1="100" y1="0" x2="400" y2="400" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="1.5" />
            <line x1="200" y1="0" x2="500" y2="400" stroke={darkMode ? "#1e293b" : "#cbd5e1"} strokeWidth="1" />
            <path d="M 50 150 C 200 100, 300 300, 550 200" fill="none" stroke={darkMode ? "#334155" : "#94a3b8"} strokeWidth="3" opacity="0.5" />
          </svg>

          {/* Marcadores sobre el SVG */}
          <div className="absolute inset-0">
            {vehicles.map((v) => {
              if (typeof v.lat !== 'number' || typeof v.lng !== 'number' || isNaN(v.lat) || isNaN(v.lng)) return null;

              const latMin = -12.3;
              const latMax = -11.7;
              const lngMin = -77.25;
              const lngMax = -76.8;

              const x = ((v.lng - lngMin) / (lngMax - lngMin)) * 100;
              const y = 100 - ((v.lat - latMin) / (latMax - latMin)) * 100;

              const isSelected = selectedVehicle?.placa === v.placa;

              return (
                <div
                  key={v.placa}
                  className="absolute transition-all duration-500 ease-out cursor-pointer group"
                  style={{
                    left: `${Math.max(5, Math.min(95, x))}%`,
                    top: `${Math.max(5, Math.min(95, y))}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => setSelectedVehicle(isSelected ? null : v)}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="absolute inline-flex h-6 w-6 rounded-full animate-ping opacity-25" 
                      style={{
                        backgroundColor: v.estado === 'En ruta' ? '#10b981' : v.estado === 'Detenido' ? '#f97316' : v.estado === 'carga/descarga' ? '#8b5cf6' : '#ef4444'
                      }}
                    ></span>
                    <div 
                      className={`relative z-10 w-4 h-4 rounded-full border-2 border-slate-900 transition-transform group-hover:scale-125 ${
                        v.estado === 'En ruta' ? 'bg-emerald-500' : v.estado === 'Detenido' ? 'bg-orange-500' : v.estado === 'carga/descarga' ? 'bg-purple-500' : 'bg-red-500'
                      }`}
                    />
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 glass-card px-2 py-0.5 rounded text-[10px] whitespace-nowrap font-medium text-slate-200 border border-slate-700/50 shadow-lg pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                      {v.placa}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ficha de info seleccionada */}
          {selectedVehicle && (
            <div className="absolute bottom-6 left-6 right-6 glass-panel p-4 rounded-xl border border-slate-700/60 shadow-xl z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-fade-in">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-slate-100">{selectedVehicle.placa}</h4>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium border ${getStatusBadgeClass(selectedVehicle.estado)}`}>
                    {selectedVehicle.estado}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Velocidad: <span className="text-slate-300 font-medium">{selectedVehicle.velocidad} km/h</span> | Odómetro: <span className="text-slate-300 font-medium">{(selectedVehicle.odometro || 0).toLocaleString()} km</span>
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500">Coordenadas</span>
                  <span className="text-slate-350 font-mono">{selectedVehicle.lat.toFixed(5)}, {selectedVehicle.lng.toFixed(5)}</span>
                </div>
                <button 
                  onClick={() => setSelectedVehicle(null)} 
                  className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Renderizado del mapa de HERE con ficha de info unificada
  return (
    <div className="relative w-full h-full rounded-xl border border-slate-800 overflow-hidden min-h-[350px] bg-slate-950">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {selectedVehicle && (
        <div className="absolute bottom-6 left-6 right-6 glass-panel p-4 rounded-xl border border-slate-700/60 shadow-xl z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-slate-100">{selectedVehicle.placa}</h4>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium border ${getStatusBadgeClass(selectedVehicle.estado)}`}>
                {selectedVehicle.estado}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Velocidad: <span className="text-slate-300 font-medium">{selectedVehicle.velocidad} km/h</span> | Odómetro: <span className="text-slate-300 font-medium">{(selectedVehicle.odometro || 0).toLocaleString()} km</span>
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-slate-500">Coordenadas</span>
              <span className="text-slate-300 font-mono">{selectedVehicle.lat.toFixed(5)}, {selectedVehicle.lng.toFixed(5)}</span>
            </div>
            <button 
              onClick={() => setSelectedVehicle(null)} 
              className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MapComponent);
