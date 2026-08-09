import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BigQuery } from '@google-cloud/bigquery';
import { sendTelegramAlert } from './telegramNotifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bigquery = new BigQuery({ projectId: 'project-silvia-500416' });

// Variable en memoria para almacenar las posiciones en tiempo real de los vehículos
export let livePositions = [];

// Variable en memoria para las ubicaciones geográficas de BigQuery
let ubicacionesList = [];

// ID incremental para gps_positions
let nextGpsId = 2500000;

// Inicializar el ID máximo en gps_positions
async function initGpsId() {
  try {
    const query = 'SELECT MAX(id) as max_id FROM `silvia_dataset.gps_positions`';
    const [rows] = await bigquery.query({ query });
    if (rows && rows[0] && rows[0].max_id) {
      nextGpsId = parseInt(rows[0].max_id) + 1;
      console.log(`[GPS Ingestor] ID inicial para BigQuery establecido en ${nextGpsId}`);
    }
  } catch (err) {
    console.error('[GPS Ingestor] Error al inicializar ID de gps_positions:', err.message);
  }
}

// Cargar ubicaciones desde la tabla ubicaciones de BigQuery
async function loadUbicaciones() {
  try {
    const query = 'SELECT nombre, lat, lon FROM `silvia_dataset.ubicaciones` WHERE lat IS NOT NULL AND lon IS NOT NULL';
    const [rows] = await bigquery.query({ query });
    ubicacionesList = rows.map(r => ({
      nombre: r.nombre,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon)
    }));
    console.log(`[GPS Ingestor] Cargadas ${ubicacionesList.length} ubicaciones geográficas de BigQuery para geofencing.`);
  } catch (err) {
    console.error('[GPS Ingestor] Error al cargar ubicaciones de BigQuery:', err.message);
  }
}

// Calcular distancia en metros usando la fórmula de Haversine
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metros
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Carga de vehículos activos y sus device_ids desde la tabla vehiculos de BigQuery
async function fetchFleetVehicles() {
  try {
    const query = 'SELECT id, placa, tipo, device_id FROM `silvia_dataset.vehiculos` WHERE device_id IS NOT NULL';
    const [rows] = await bigquery.query({ query });
    
    return rows.map(v => ({
      vehiculo_id: v.id,
      plate: v.placa ? v.placa.toUpperCase() : '',
      deviceId: parseInt(v.device_id),
      className: v.tipo && (v.tipo.toUpperCase() === 'REMOLCADOR' || v.tipo.toUpperCase() === 'TRACTO') ? 'Tracto' : 'Camion'
    }));
  } catch (err) {
    console.error('[GPS Ingestor] Error al cargar flota desde BigQuery (usando fallback local):', err.message);
    return loadFleetConfigFallback();
  }
}

// Carga local de fallback
function loadFleetConfigFallback() {
  const fleetVehicles = [];
  try {
    const csvPath = process.env.VEHICLES_CSV_PATH || path.join(process.cwd(), '../processed_data/vehiculos.csv');
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split('\n');
      const header = lines[0].split(',');
      const idIdx = header.indexOf('id');
      const plateIdx = header.indexOf('placa');
      const typeIdx = header.indexOf('tipo');
      const deviceIdIdx = header.indexOf('device_id');

      if (idIdx !== -1 && plateIdx !== -1 && deviceIdIdx !== -1) {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(',');
          if (cols.length > Math.max(idIdx, plateIdx, deviceIdIdx)) {
            const id = cols[idIdx].trim();
            const plate = cols[plateIdx].trim().toUpperCase();
            const tipo = typeIdx !== -1 ? cols[typeIdx].trim() : 'Camión';
            const deviceIdStr = cols[deviceIdIdx].trim();
            
            if (deviceIdStr) {
              fleetVehicles.push({
                vehiculo_id: id,
                plate: plate,
                deviceId: parseInt(deviceIdStr),
                className: tipo.toUpperCase() === 'REMOLCADOR' || tipo.toUpperCase() === 'TRACTO' ? 'Tracto' : 'Camion'
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[GPS Ingestor] Error en fallback local:', err.message);
  }
  return fleetVehicles;
}

// Registrar posiciones en prueba_gps.csv en lote
function appendBatchToPruebaGps(rows) {
  const filePath = process.env.GPS_CSV_PATH || path.join(process.cwd(), '../processed_data/prueba_gps.csv');
  let nextId = 1;
  
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      const lines = content.split('\n');
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 1];
        const lastId = parseInt(lastLine.split(',')[0]);
        if (!isNaN(lastId)) {
          nextId = lastId + 1;
        }
      }
    } else {
      fs.writeFileSync(filePath, 'id,vehiculo_id,timestamp_gps,estado,velocidad,odometro,lat,lon\n', 'utf8');
    }
    
    let csvLines = '';
    rows.forEach((row, index) => {
      const rowId = nextId + index;
      csvLines += `${rowId},${row.vehiculo_id},${row.timestamp_gps},${row.estado},${row.velocidad},${row.odometro},${row.lat},${row.lon}\n`;
    });
    
    fs.appendFileSync(filePath, csvLines, 'utf8');
  } catch (error) {
    console.error('[Telemetry API] Error al guardar lote en prueba_gps.csv:', error.message);
  }
}

// Consultar la API de telemetría real para un dispositivo específico
async function fetchTelemetryForDevice(deviceId) {
  const url = 'https://mdl-gps.j2f.pe/APIv4/Tracking/GetLocation';
  const headers = {
    'Authorization': 'Bearer bbc85281-5d8f-460e-bb50-0a89df435fc4',
    'Content-Type': 'application/json'
  };
  const body = JSON.stringify({
    accountId: 'e11cc4392afe',
    deviceId: deviceId
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    return null;
  }
}

// Ciclo principal de consulta de toda la flota en paralelo
async function processTelemetryCycle() {
  const perusTimeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Lima', hour12: false });
  const currentHour = parseInt(perusTimeStr.split(':')[0]);
  const isWorkingHours = (currentHour >= 4 && currentHour < 18);

  console.log(`[Telemetry API] Iniciando consulta paralela de la flota a las ${new Date().toLocaleTimeString('es-PE', { timeZone: 'America/Lima' })}...`);
  
  const fleetVehicles = await fetchFleetVehicles();
  if (fleetVehicles.length === 0) {
    console.warn('[Telemetry API] No se encontraron vehículos activos para consultar.');
    return;
  }

  const csvRows = [];
  let successCount = 0;

  const promises = fleetVehicles.map(async (vehicle) => {
    try {
      const json = await fetchTelemetryForDevice(vehicle.deviceId);
      
      if (json && json.success && json.data) {
        const d = json.data;
        
        const msMatch = d.realDate ? d.realDate.match(/\/Date\((\d+)\)\//) : null;
        const dateObj = msMatch ? new Date(parseInt(msMatch[1])) : new Date();
        const timestampGps = dateObj.toISOString().replace('T', ' ').substring(0, 19);

        const lat = parseFloat(d.lat) || 0.0;
        const lng = parseFloat(d.lng) || 0.0;
        const speed = parseFloat(d.speed) || 0.0;
        const odo = parseFloat(d.odo) || 0.0;
        const angle = parseInt(d.angle) || 0;

        // Determinación del estado
        let estado = 'Detenido';
        
        // Calcular distancia mínima a ubicaciones
        let minDistance = Infinity;
        if (lat !== 0 && lng !== 0) {
          for (const u of ubicacionesList) {
            const dist = getDistance(lat, lng, u.lat, u.lon);
            if (dist < minDistance) {
              minDistance = dist;
            }
          }
        }

        if (minDistance <= 300 && speed < 18) {
          // Cercano a punto de operación y con velocidad baja (< 18 km/h) -> Carga/Descarga
          estado = 'carga/descarga';
        } else if (speed > 1) {
          // Velocidad normal en ruta -> En ruta
          estado = 'En ruta';
        } else {
          // Detenido o velocidad muy baja y lejos de puntos de operación
          if (!isWorkingHours) {
            estado = 'garaje';
          } else {
            estado = 'Detenido';
          }
        }

        successCount++;

        csvRows.push({
          vehiculo_id: vehicle.vehiculo_id,
          timestamp_gps: timestampGps,
          estado: estado,
          velocidad: speed,
          odometro: odo,
          lat: lat,
          lon: lng
        });

        return {
          id: 0,
          vehiculo_id: vehicle.vehiculo_id,
          placa: `${vehicle.vehiculo_id} (${d.title || vehicle.plate})`,
          timestamp_gps: dateObj,
          estado: estado,
          velocidad: speed,
          odometro: odo,
          lat: lat,
          lng: lng,
          angle: angle,
          className: vehicle.className
        };
      } else {
        const prevPos = livePositions.find(p => p.vehiculo_id === vehicle.vehiculo_id);
        if (prevPos) {
          return {
            ...prevPos,
            timestamp_gps: new Date()
          };
        } else {
          return {
            id: 0,
            vehiculo_id: vehicle.vehiculo_id,
            placa: `${vehicle.vehiculo_id} (${vehicle.plate})`,
            timestamp_gps: new Date(),
            estado: 'Detenido',
            velocidad: 0.0,
            odometro: 45000.0,
            lat: -12.046374,
            lng: -77.042793,
            angle: 0,
            className: vehicle.className
          };
        }
      }
    } catch (err) {
      console.error(`[Telemetry API] Error al procesar telemetría para vehículo ${vehicle.plate}:`, err.message);
      const prevPos = livePositions.find(p => p.vehiculo_id === vehicle.vehiculo_id);
      return prevPos ? { ...prevPos, timestamp_gps: new Date() } : {
        id: 0,
        vehiculo_id: vehicle.vehiculo_id,
        placa: `${vehicle.vehiculo_id} (${vehicle.plate})`,
        timestamp_gps: new Date(),
        estado: 'Detenido',
        velocidad: 0.0,
        odometro: 45000.0,
        lat: -12.046374,
        lng: -77.042793,
        angle: 0,
        className: vehicle.className
      };
    }
  });

  const results = await Promise.all(promises);

  livePositions = results.map((pos, idx) => ({
    ...pos,
    id: idx + 1
  }));

  try {
    await updateRealTimeMonitoring();
  } catch (err) {
    console.error('[GPS Ingestor] Error al actualizar máquina de estados de monitoreo en tiempo real:', err.message);
  }

  console.log(`[Telemetry API] Posiciones de la flota actualizadas: ${successCount}/${fleetVehicles.length} consultas exitosas.`);

  // Algoritmo de agrupación para depósitos/garajes dinámicos (Co-ubicación de la flota)
  if (!isWorkingHours) {
    const stoppedVehicles = livePositions.filter(p => p.estado === 'garaje');
    const visited = new Set();
    const clusters = [];

    for (let i = 0; i < stoppedVehicles.length; i++) {
      if (visited.has(stoppedVehicles[i].vehiculo_id)) continue;
      
      const cluster = [stoppedVehicles[i]];
      visited.add(stoppedVehicles[i].vehiculo_id);

      for (let j = 0; j < stoppedVehicles.length; j++) {
        if (i === j) continue;
        if (visited.has(stoppedVehicles[j].vehiculo_id)) continue;

        const dist = getDistance(stoppedVehicles[i].lat, stoppedVehicles[i].lng, stoppedVehicles[j].lat, stoppedVehicles[j].lng);
        if (dist <= 150) {
          cluster.push(stoppedVehicles[j]);
          visited.add(stoppedVehicles[j].vehiculo_id);
        }
      }

      if (cluster.length >= 3) {
        clusters.push(cluster);
      }
    }

    if (clusters.length > 0) {
      console.log(`[GPS Ingestor] 🚗 ¡Análisis de Co-ubicación! Detectados ${clusters.length} depósitos/garajes de flota dinámicos:`);
      clusters.forEach((c, idx) => {
        const plates = c.map(v => v.placa.split(' ')[0]).join(', ');
        const avgLat = c.reduce((acc, curr) => acc + curr.lat, 0) / c.length;
        const avgLng = c.reduce((acc, curr) => acc + curr.lng, 0) / c.length;
        console.log(`   └─ Garaje Depósito #${idx + 1}: Centro en (${avgLat.toFixed(5)}, ${avgLng.toFixed(5)}) con ${c.length} vehículos: [${plates}]`);
      });
    }
  }

  // Guardar en prueba_gps.csv y BigQuery gps_positions en lote
  if (csvRows.length > 0) {
    appendBatchToPruebaGps(csvRows);
    
    // Inserción en BigQuery
    try {
      const bqValues = csvRows.map(row => {
        const gpsId = nextGpsId++;
        return `(${gpsId}, '${row.vehiculo_id}', '${row.timestamp_gps}', '${row.estado}', ${row.velocidad}, ${row.odometro}, ${row.lat}, ${row.lon})`;
      }).join(',\n');

      const insertSql = `
        INSERT INTO \`silvia_dataset.gps_positions\` (id, vehiculo_id, timestamp_gps, estado, velocidad, odometro, lat, lon)
        VALUES ${bqValues};
      `;
      await bigquery.query({ query: insertSql });
      console.log(`[Telemetry API] Registrados ${csvRows.length} reportes en gps_positions de BigQuery.`);
    } catch (err) {
      console.error('[Telemetry API] Error al guardar reportes en BigQuery gps_positions:', err.message);
    }
  }
}

// Planificador dinámico basado en horario laboral de Perú (4 AM - 6 PM)
function scheduleNextCycle() {
  const now = new Date();
  const perusTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'America/Lima', hour12: false });
  const currentHour = parseInt(perusTimeStr.split(':')[0]);
  
  const isWorkingHours = (currentHour >= 4 && currentHour < 18);
  const delay = isWorkingHours ? 60000 : 600000; // 60s o 10 minutos (600000ms)
  
  console.log(`[Telemetry API] Próxima consulta programada en ${delay / 1000}s (Hora Perú: ${perusTimeStr}, Horario Laboral: ${isWorkingHours})`);
  
  setTimeout(async () => {
    await processTelemetryCycle();
    scheduleNextCycle();
  }, delay);
}

// Variables para el monitoreo de viajes en memoria
export let monitoringStates = {};
export let lastRebuiltDate = '';
export let geofences = {};

const CANTERAS = ['SAN LORENZO', 'YERBABUENA', 'FLOR DE NIEVE', 'JICAMARCA', 'MINERA LOS PRIMOS', 'ROMAÑA', 'CHANCAY', 'PORTILLO', 'CHAMBALA'];

// Cargar todas las geocercas activas desde la base de datos de BigQuery
export async function loadGeofences() {
  try {
    geofences = {};

    // Agregar garajes estáticos conocidos como fallback
    const staticGarages = [
      { nombre: 'GARAGE NORTE', lat: -11.96035, lon: -77.09323 },
      { nombre: 'GARAGE OQUENDO', lat: -11.98970, lon: -77.11461 },
      { nombre: 'GARAGE CALLAO', lat: -11.98237, lon: -77.10813 },
      { nombre: 'GARAGE ESTE', lat: -11.95202, lon: -77.07103 },
      { nombre: 'GARAGE ANCON', lat: -11.91925, lon: -77.07046 }
    ];

    staticGarages.forEach(g => {
      geofences[g.nombre] = {
        lat: g.lat,
        lon: g.lon,
        radius: 300,
        type: 'garaje'
      };
    });

    const query = 'SELECT nombre, lat, lon, tipo FROM `silvia_dataset.ubicaciones` WHERE lat IS NOT NULL AND lon IS NOT NULL';
    const [rows] = await bigquery.query({ query });
    rows.forEach(r => {
      const name = r.nombre.toUpperCase().trim();
      const isCantera = CANTERAS.some(c => name.includes(c)) || (r.tipo || '').toUpperCase().trim() === 'CANTERA';
      const isGarage = name.includes('GARAGE') || name.includes('COCHERA') || name.includes('BASE') || (r.tipo || '').toUpperCase().trim() === 'GARAJE' || (r.tipo || '').toUpperCase().trim() === 'GARAGE';
      
      let gfType = 'planta';
      if (isCantera) gfType = 'cantera';
      else if (isGarage) gfType = 'garaje';

      geofences[name] = {
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        radius: 300, // 300 metros de tolerancia
        type: gfType
      };
    });
    console.log(`[GPS Ingestor] Geocercas cargadas: ${Object.keys(geofences).length} ubicaciones geográficas.`);
  } catch (err) {
    console.error('[GPS Ingestor] Error al cargar geocercas de BigQuery:', err.message);
  }
}

export let vehicleBases = {};
export let vehiclePlates = {};
export let lastQuarryMap = {};

// Helper: Asegurar que el nombre del origen sea una cantera válida (sino buscar la última o fallback)
export function getValidQuarry(name, vid) {
  const CANTERAS = ['SAN LORENZO', 'YERBABUENA', 'FLOR DE NIEVE', 'JICAMARCA'];
  if (name) {
    const upperName = name.toUpperCase().trim();
    const isValid = CANTERAS.some(c => upperName.includes(c));
    if (isValid) {
      // Retornar nombre limpio de la cantera
      if (upperName.includes('SAN LORENZO')) return 'SAN LORENZO';
      if (upperName.includes('YERBABUENA') || upperName.includes('HIERBABUENA')) return 'YERBABUENA';
      if (upperName.includes('FLOR DE NIEVE')) return 'FLOR DE NIEVE';
      if (upperName.includes('JICAMARCA')) return 'JICAMARCA';
      return upperName;
    }
  }
  if (vid && lastQuarryMap[vid]) {
    return lastQuarryMap[vid];
  }
  return 'SAN LORENZO'; // Fallback por defecto
}

// Cargar de manera histórica las últimas canteras conocidas para la flota
export async function loadLastQuarries() {
  const CANTERAS = ['SAN LORENZO', 'YERBABUENA', 'FLOR DE NIEVE', 'JICAMARCA'];
  try {
    const query = `
      SELECT vehiculo_id, origen_des 
      FROM \`silvia_dataset.viajes\` 
      WHERE origen_des IS NOT NULL 
      ORDER BY fecha DESC
    `;
    const [rows] = await bigquery.query({ query });
    lastQuarryMap = {};
    rows.forEach(r => {
      const vid = r.vehiculo_id;
      if (lastQuarryMap[vid]) return; // Ya tenemos el último

      const name = r.origen_des.toUpperCase().trim();
      const isValid = CANTERAS.some(c => name.includes(c));
      if (isValid) {
        if (name.includes('SAN LORENZO')) lastQuarryMap[vid] = 'SAN LORENZO';
        else if (name.includes('YERBABUENA') || name.includes('HIERBABUENA')) lastQuarryMap[vid] = 'YERBABUENA';
        else if (name.includes('FLOR DE NIEVE')) lastQuarryMap[vid] = 'FLOR DE NIEVE';
        else if (name.includes('JICAMARCA')) lastQuarryMap[vid] = 'JICAMARCA';
        else lastQuarryMap[vid] = name;
      }
    });
    console.log(`[GPS Ingestor] Cargadas últimas canteras conocidas para ${Object.keys(lastQuarryMap).length} vehículos.`);
  } catch (err) {
    console.error('[GPS Ingestor] Error al cargar últimas canteras históricas:', err.message);
  }
}

export async function loadVehicleBases() {
  try {
    const query = 'SELECT id, placa, zona_base FROM `silvia_dataset.vehiculos`';
    const [rows] = await bigquery.query({ query });
    vehicleBases = {};
    vehiclePlates = {};
    rows.forEach(r => {
      if (r.zona_base) {
        vehicleBases[r.id] = r.zona_base.toUpperCase().trim();
      }
      vehiclePlates[r.id] = r.placa;
    });
    console.log(`[GPS Ingestor] Zonas base y placas cargadas: ${Object.keys(vehiclePlates).length} registros.`);
  } catch (err) {
    console.error('[GPS Ingestor] Error al cargar zonas base de vehículos:', err.message);
  }
}

// Calcular rumbo/ángulo entre dos puntos cardinales (grados de 0 a 360)
function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

export async function rebuildTodayMonitoringStates() {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  monitoringStates = await rebuildMonitoringFromHistory(todayStr);
  return monitoringStates;
}

// Reconstruir la máquina de estados históricamente releyendo puntos desde BigQuery
export async function rebuildMonitoringFromHistory(dateStr) {
  console.log(`[GPS Ingestor] Reconstruyendo máquina de estados para ${dateStr}...`);
  
  if (Object.keys(geofences).length === 0) {
    await loadGeofences();
  }
  if (Object.keys(vehicleBases).length === 0) {
    await loadVehicleBases();
  }

  // 1. Obtener la planificación diaria
  const planQuery = `
    SELECT vehiculo_id, cantera_origen, zona_inicio, viajes_asignados
    FROM \`silvia_dataset.planificacion_asignaciones\`
    WHERE fecha_operacion = DATE('${dateStr}') AND viajes_asignados > 0;
  `;
  let assignments = [];
  try {
    const [rows] = await bigquery.query({ query: planQuery });
    assignments = rows;
  } catch (err) {
    console.warn(`[GPS Ingestor] Error cargando asignaciones de viajes:`, err.message);
  }

  // 2. Obtener solicitudes (rutas planificadas del día)
  const routesQuery = `
    SELECT cantera, planta, volumen_m3
    FROM \`silvia_dataset.planificacion_solicitudes\`
    WHERE fecha_operacion = DATE('${dateStr}');
  `;
  let routes = [];
  try {
    const [rows] = await bigquery.query({ query: routesQuery });
    routes = rows;
  } catch (err) {
    console.warn(`[GPS Ingestor] Error cargando rutas de solicitudes:`, err.message);
  }

  // 3. Obtener la trayectoria GPS del día
  const gpsQuery = `
    SELECT vehiculo_id, timestamp_gps, lat, lon, velocidad
    FROM \`silvia_dataset.gps_positions\`
    WHERE DATE(timestamp_gps) = DATE('${dateStr}')
    ORDER BY vehiculo_id, timestamp_gps ASC;
  `;
  let gpsPoints = [];
  try {
    const [rows] = await bigquery.query({ query: gpsQuery });
    gpsPoints = rows;
  } catch (err) {
    console.error(`[GPS Ingestor] Error cargando historial GPS:`, err.message);
  }

  const dayStates = {};
  
  // Agrupar coordenadas por vehículo
  const gpsByVehicle = {};
  gpsPoints.forEach(p => {
    const vid = p.vehiculo_id;
    if (!gpsByVehicle[vid]) gpsByVehicle[vid] = [];
    gpsByVehicle[vid].push(p);
  });

  // Procesar secuencialmente la trayectoria de cada vehículo
  for (const vid in gpsByVehicle) {
    const points = gpsByVehicle[vid];
    const baseCantera = vehicleBases[vid] || null;
    const vehPlan = assignments.find(a => a.vehiculo_id === vid);
    const tripsPlanned = vehPlan ? parseInt(vehPlan.viajes_asignados) : 0;
    const assignedCantera = getValidQuarry(vehPlan ? (vehPlan.zona_inicio || vehPlan.cantera_origen) : baseCantera, vid);

    const s = {
      state: 'Detenido',
      last_transition_time: null,
      current_origin: null,
      current_destination: null,
      trips_completed: 0,
      trips_planned: tripsPlanned,
      assigned_cantera: assignedCantera,
      probable_destination: '-',
      probable_destination_percent: 0,
      trips_by_route: {},
      has_moved_today: false
    };

    points.forEach((p, idx) => {
      const lat = parseFloat(p.lat);
      const lon = parseFloat(p.lon);
      const speed = parseFloat(p.velocidad);
      const ts = new Date(p.timestamp_gps.value || p.timestamp_gps).getTime();
      if (speed > 1.5) {
        s.has_moved_today = true;
      }

      let activeGfName = null;
      let minGfDist = Infinity;
      for (const name in geofences) {
        const gf = geofences[name];
        const dist = getDistance(lat, lon, gf.lat, gf.lon);
        if (dist <= gf.radius && dist < minGfDist) {
          activeGfName = name;
          minGfDist = dist;
        }
      }

      const currentState = s.state;
      const ptDate = new Date(p.timestamp_gps.value || p.timestamp_gps);
      const perusTimeStr = ptDate.toLocaleTimeString('en-US', { timeZone: 'America/Lima', hour12: false });
      const currentHour = parseInt(perusTimeStr.split(':')[0]);
      const isWorkingHours = (currentHour >= 4 && currentHour < 18);

      if (currentState === 'Detenido' || currentState === 'garaje' || currentState === 'IDLE') {
        if (activeGfName && geofences[activeGfName].type === 'cantera') {
          s.state = 'Carga en cantera';
          s.last_transition_time = ts;
          s.current_origin = activeGfName;
        } else if (activeGfName && geofences[activeGfName].type === 'planta') {
          s.state = 'Descarga en planta';
          s.last_transition_time = ts;
          s.current_destination = activeGfName;
        } else if (activeGfName && geofences[activeGfName].type === 'garaje') {
          s.state = speed > 1 ? 'En ruta' : 'garaje';
          s.last_transition_time = ts;
        } else {
          s.state = speed > 1 ? 'En ruta' : (isWorkingHours ? (s.has_moved_today ? 'Detenido' : 'garaje') : 'garaje');
          s.last_transition_time = ts;
        }
      } else if (currentState === 'Carga en cantera') {
        if (activeGfName === s.current_origin) {
          // Sigue en la cantera
        } else {
          const duration = ts - (s.last_transition_time || ts);
          if (duration >= 600000) { // 10 minutos
            s.state = 'En ruta';
          } else {
            s.state = speed > 1 ? 'En ruta' : (isWorkingHours ? (s.has_moved_today ? 'Detenido' : 'garaje') : 'garaje');
            s.current_origin = null;
          }
          s.last_transition_time = ts;
        }
      } else if (currentState === 'En ruta') {
        if (activeGfName && geofences[activeGfName].type === 'planta') {
          s.state = 'Descarga en planta';
          s.last_transition_time = ts;
          s.current_destination = activeGfName;
        } else if (activeGfName && activeGfName === s.current_origin) {
          s.state = 'Carga en cantera';
          s.last_transition_time = ts;
        } else if (activeGfName && geofences[activeGfName].type === 'garaje') {
          s.state = speed > 1 ? 'En ruta' : 'garaje';
          s.last_transition_time = ts;
        } else if (speed <= 1) {
          s.state = isWorkingHours ? (s.has_moved_today ? 'Detenido' : 'garaje') : 'garaje';
          s.last_transition_time = ts;
        }
      } else if (currentState === 'Descarga en planta') {
        if (activeGfName === s.current_destination) {
          // Sigue descargando
        } else {
          const duration = ts - (s.last_transition_time || ts);
          if (duration >= 900000) { // 15 minutos
            s.trips_completed += 1;
            const dest = s.current_destination || 'MEIGGS';
            s.trips_by_route[dest] = (s.trips_by_route[dest] || 0) + 1;
            s.state = speed > 1 ? 'En ruta' : (isWorkingHours ? (s.has_moved_today ? 'Detenido' : 'garaje') : 'garaje');
            s.current_origin = null;
            s.current_destination = null;
          } else {
            s.state = 'En ruta';
            s.current_destination = null;
          }
          s.last_transition_time = ts;
        }
      }

      // Predicción vectorial de rumbo si está en movimiento
      if (s.state === 'En ruta' && idx > 0) {
        const prevPt = points[idx - 1];
        const vBearing = getBearing(parseFloat(prevPt.lat), parseFloat(prevPt.lon), lat, lon);
        
        const originName = (s.current_origin || s.assigned_cantera || '').toUpperCase().trim();
        const plannedPlants = new Set(routes.map(r => r.planta.toUpperCase().trim()));
        const candidatePlants = Object.keys(geofences).filter(name => {
          const isPlanta = geofences[name].type === 'planta';
          if (!isPlanta) return false;
          if (originName) {
            return routes.some(r => r.cantera.toUpperCase().trim() === originName && r.planta.toUpperCase().trim() === name);
          }
          return plannedPlants.has(name);
        });
        let bestDest = '-';
        let maxScore = -1;
        let scoresSum = 0;

        const scores = candidatePlants.map(pName => {
          const destGf = geofences[pName];
          const destBearing = getBearing(lat, lon, destGf.lat, destGf.lon);
          let diff = Math.abs(vBearing - destBearing);
          if (diff > 180) diff = 360 - diff;
          const scoreDir = Math.max(0, Math.cos(diff * Math.PI / 180));
          const dist = getDistance(lat, lon, destGf.lat, destGf.lon);
          const scoreDist = 1 / Math.max(1, dist);

          // Ponderación por plan semanal/diario
          let planWeight = 1.0;
          if (s.current_origin) {
            const hasRoute = routes.some(r => r.cantera.toUpperCase().trim() === s.current_origin && r.planta.toUpperCase().trim() === pName);
            if (!hasRoute) planWeight = 0.05; // Penaliza fuertemente si no está programada hoy
          }

          const totalScore = scoreDir * scoreDist * planWeight;
          return { name: pName, score: totalScore };
        });

        scores.forEach(sc => {
          scoresSum += sc.score;
          if (sc.score > maxScore) {
            maxScore = sc.score;
            bestDest = sc.name;
          }
        });

        if ((bestDest === '-' || maxScore <= 0) && candidatePlants.length > 0) {
          let closest = '-';
          let minDist = Infinity;
          candidatePlants.forEach(pName => {
            const destGf = geofences[pName];
            const dist = getDistance(lat, lon, destGf.lat, destGf.lon);
            if (dist < minDist) {
              minDist = dist;
              closest = pName;
            }
          });
          if (closest !== '-') {
            bestDest = closest;
            scoresSum = 100;
            maxScore = 35;
          }
        }

        if (scoresSum > 0 && maxScore > 0 && bestDest !== '-') {
          s.probable_destination = bestDest;
          s.probable_destination_percent = Math.round((maxScore / scoresSum) * 100);
        } else {
          s.probable_destination = '-';
          s.probable_destination_percent = 0;
        }
      } else if (s.state === 'Carga en cantera') {
        s.probable_destination = s.current_origin || '-';
        s.probable_destination_percent = 100;
      } else if (s.state === 'Descarga en planta') {
        s.probable_destination = s.current_destination || '-';
        s.probable_destination_percent = 100;
      } else {
        s.probable_destination = '-';
        s.probable_destination_percent = 0;
      }
    });

    dayStates[vid] = s;
  }

  // Cargar camiones inactivos del plan que no registraron posiciones GPS hoy
  assignments.forEach(a => {
    if (!dayStates[a.vehiculo_id]) {
      dayStates[a.vehiculo_id] = {
        state: 'Detenido',
        last_transition_time: null,
        current_origin: null,
        current_destination: null,
        trips_completed: 0,
        trips_planned: parseInt(a.viajes_asignados) || 0,
        assigned_cantera: getValidQuarry(a.cantera_origen, a.vehiculo_id),
        probable_destination: '-',
        probable_destination_percent: 0
      };
    }
  });

  return dayStates;
}

// Actualizar en tiempo real el estatus en base a la telemetría del ciclo
export async function updateRealTimeMonitoring() {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const perusTimeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Lima', hour12: false });
  const currentHour = parseInt(perusTimeStr.split(':')[0]);
  const isWorkingHours = (currentHour >= 4 && currentHour < 18);
  
  if (lastRebuiltDate !== todayStr) {
    try {
      if (lastRebuiltDate) {
        console.log(`[GPS Ingestor] Fin de día detectado. Cerrando automáticamente planificaciones para la fecha: ${lastRebuiltDate}`);
        await autoCloseDayPlanning(lastRebuiltDate).catch(err => {
          console.error(`[GPS Ingestor] Error al auto-cerrar planificaciones para ${lastRebuiltDate}:`, err.message);
        });
      }
      monitoringStates = await rebuildMonitoringFromHistory(todayStr);
      lastRebuiltDate = todayStr;
      return;
    } catch (err) {
      console.error('[GPS Ingestor] Error de fecha cambio de día en monitoreo:', err.message);
    }
  }

  if (Object.keys(geofences).length === 0) {
    await loadGeofences();
  }
  if (Object.keys(vehicleBases).length === 0) {
    await loadVehicleBases();
  }

  // Cargar asignaciones activas
  let assignments = [];
  try {
    const planQuery = `
      SELECT vehiculo_id, cantera_origen, zona_inicio, viajes_asignados
      FROM \`silvia_dataset.planificacion_asignaciones\`
      WHERE fecha_operacion = DATE('${todayStr}') AND viajes_asignados > 0;
    `;
    const [rows] = await bigquery.query({ query: planQuery });
    assignments = rows;
  } catch (err) {
    // Ignorar
  }

  // Cargar solicitudes/rutas planificadas del día
  let routes = [];
  try {
    const routesQuery = `
      SELECT cantera, planta, volumen_m3
      FROM \`silvia_dataset.planificacion_solicitudes\`
      WHERE fecha_operacion = DATE('${todayStr}');
    `;
    const [rows] = await bigquery.query({ query: routesQuery });
    routes = rows;
  } catch (err) {
    // Ignorar
  }

  livePositions.forEach(p => {
    const vid = p.vehiculo_id;
    const lat = parseFloat(p.lat);
    const lon = parseFloat(p.lng);
    const speed = parseFloat(p.velocidad);
    const angle = parseInt(p.angle) || 0;
    const ts = new Date().getTime();

    const baseCantera = vehicleBases[vid] || null;
    const vehPlan = assignments.find(a => a.vehiculo_id === vid);
    const tripsPlanned = vehPlan ? parseInt(vehPlan.viajes_asignados) : 0;
    const assignedCantera = getValidQuarry(vehPlan ? (vehPlan.zona_inicio || vehPlan.cantera_origen) : baseCantera, vid);

    if (!monitoringStates[vid]) {
      monitoringStates[vid] = {
        state: 'Detenido',
        last_transition_time: ts,
        current_origin: null,
        current_destination: null,
        trips_completed: 0,
        trips_planned: tripsPlanned,
        assigned_cantera: assignedCantera,
        probable_destination: '-',
        probable_destination_percent: 0,
        trips_by_route: {},
        has_moved_today: false
      };
    } else {
      monitoringStates[vid].trips_planned = tripsPlanned;
      monitoringStates[vid].assigned_cantera = assignedCantera;
      if (monitoringStates[vid].has_moved_today === undefined) {
        monitoringStates[vid].has_moved_today = false;
      }
    }

    const s = monitoringStates[vid];
    if (speed > 1.5) {
      s.has_moved_today = true;
    }

    let activeGfName = null;
    let minGfDist = Infinity;
    for (const name in geofences) {
      const gf = geofences[name];
      const dist = getDistance(lat, lon, gf.lat, gf.lon);
      if (dist <= gf.radius && dist < minGfDist) {
        activeGfName = name;
        minGfDist = dist;
      }
    }

    const currentState = s.state;
    if (currentState === 'Detenido' || currentState === 'garaje' || currentState === 'IDLE') {
      if (activeGfName && geofences[activeGfName].type === 'cantera') {
        s.state = 'Carga en cantera';
        s.last_transition_time = ts;
        s.current_origin = activeGfName;
      } else if (activeGfName && geofences[activeGfName].type === 'planta') {
        s.state = 'Descarga en planta';
        s.last_transition_time = ts;
        s.current_destination = activeGfName;
      } else if (activeGfName && geofences[activeGfName].type === 'garaje') {
        s.state = speed > 1 ? 'En ruta' : 'garaje';
        s.last_transition_time = ts;
      } else {
        s.state = speed > 1 ? 'En ruta' : (isWorkingHours ? (s.has_moved_today ? 'Detenido' : 'garaje') : 'garaje');
      }
    } else if (currentState === 'Carga en cantera') {
      if (activeGfName === s.current_origin) {
        // Sigue en origen
      } else {
        const duration = ts - (s.last_transition_time || ts);
        if (duration >= 600000) {
          s.state = 'En ruta';
        } else {
          s.state = speed > 1 ? 'En ruta' : (isWorkingHours ? (s.has_moved_today ? 'Detenido' : 'garaje') : 'garaje');
          s.current_origin = null;
        }
        s.last_transition_time = ts;
      }
    } else if (currentState === 'En ruta') {
      if (activeGfName && geofences[activeGfName].type === 'planta') {
        s.state = 'Descarga en planta';
        s.last_transition_time = ts;
        s.current_destination = activeGfName;
      } else if (activeGfName && activeGfName === s.current_origin) {
        s.state = 'Carga en cantera';
        s.last_transition_time = ts;
      } else if (activeGfName && geofences[activeGfName].type === 'garaje') {
        s.state = speed > 1 ? 'En ruta' : 'garaje';
        s.last_transition_time = ts;
      } else if (speed <= 1) {
        s.state = isWorkingHours ? (s.has_moved_today ? 'Detenido' : 'garaje') : 'garaje';
      }
    } else if (currentState === 'Descarga en planta') {
      if (activeGfName === s.current_destination) {
        // Sigue descargando
      } else {
        const duration = ts - (s.last_transition_time || ts);
        if (duration >= 900000) {
          s.trips_completed += 1;
          const dest = s.current_destination || 'MEIGGS';
          s.trips_by_route[dest] = (s.trips_by_route[dest] || 0) + 1;

          // Registrar dinámicamente si es Jicamarca o Flor de Nieve
          const origin = s.assigned_cantera || '';
          registerCompletedTrip(vid, origin, dest).catch(err => {
            console.error('Error registrando viaje:', err.message);
          });

          s.state = speed > 1 ? 'En ruta' : (isWorkingHours ? (s.has_moved_today ? 'Detenido' : 'garaje') : 'garaje');
          s.current_origin = null;
          s.current_destination = null;
        } else {
          s.state = 'En ruta';
          s.current_destination = null;
        }
        s.last_transition_time = ts;
      }
    }

    if (s.state === 'En ruta') {
      const originName = (s.current_origin || s.assigned_cantera || '').toUpperCase().trim();
      const plannedPlants = new Set(routes.map(r => r.planta.toUpperCase().trim()));
      const candidatePlants = Object.keys(geofences).filter(name => {
        const isPlanta = geofences[name].type === 'planta';
        if (!isPlanta) return false;
        // Limitar destinos probables solo para San Lorenzo y Yerbabuena
        if (originName === 'SAN LORENZO' || originName === 'YERBABUENA') {
          return routes.some(r => r.cantera.toUpperCase().trim() === originName && r.planta.toUpperCase().trim() === name);
        }
        // Para Jicamarca, Flor de Nieve o cualquier otro, consideramos todas las plantas
        return true;
      });
      let bestDest = '-';
      let maxScore = -1;
      let scoresSum = 0;

      const scores = candidatePlants.map(pName => {
        const destGf = geofences[pName];
        const destBearing = getBearing(lat, lon, destGf.lat, destGf.lon);
        let diff = Math.abs(angle - destBearing);
        if (diff > 180) diff = 360 - diff;
        const scoreDir = Math.max(0, Math.cos(diff * Math.PI / 180));
        const dist = getDistance(lat, lon, destGf.lat, destGf.lon);
        const scoreDist = 1 / Math.max(1, dist);

        const totalScore = scoreDir * scoreDist;
        return { name: pName, score: totalScore };
      });

      scores.forEach(sc => {
        scoresSum += sc.score;
        if (sc.score > maxScore) {
          maxScore = sc.score;
          bestDest = sc.name;
        }
      });

      if ((bestDest === '-' || maxScore <= 0) && candidatePlants.length > 0) {
        let closest = '-';
        let minDist = Infinity;
        candidatePlants.forEach(pName => {
          const destGf = geofences[pName];
          const dist = getDistance(lat, lon, destGf.lat, destGf.lon);
          if (dist < minDist) {
            minDist = dist;
            closest = pName;
          }
        });
        if (closest !== '-') {
          bestDest = closest;
          scoresSum = 100;
          maxScore = 35;
        }
      }

      if (scoresSum > 0 && maxScore > 0 && bestDest !== '-') {
        s.probable_destination = bestDest;
        s.probable_destination_percent = Math.round((maxScore / scoresSum) * 100);
      } else {
        s.probable_destination = '-';
        s.probable_destination_percent = 0;
      }
    } else if (s.state === 'Carga en cantera') {
      s.probable_destination = s.current_origin || '-';
      s.probable_destination_percent = 100;
    } else if (s.state === 'Descarga en planta') {
      s.probable_destination = s.current_destination || '-';
      s.probable_destination_percent = 100;
    } else {
      s.probable_destination = '-';
      s.probable_destination_percent = 0;
    }
    
    // Sincronizar el estado del vehículo con el de la máquina de estados de monitoreo en tiempo real
    p.estado = s.state;
  });
}

// Iniciar el ciclo de polling dinámico e inicializar geocercas/estados
export async function startGpsIngestion() {
  try {
    console.log('[GPS Ingestor] Iniciando consultas periódicas con planificación de horario laboral.');
    await initGpsId();
    await loadUbicaciones();
    await loadGeofences();
    await loadVehicleBases();
    await loadLastQuarries();

    // Reconstrucción inicial al arrancar el servidor
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    try {
      monitoringStates = await rebuildMonitoringFromHistory(todayStr);
      lastRebuiltDate = todayStr;
      console.log(`[GPS Ingestor] Inicialización de máquina de estados completada con éxito (${Object.keys(monitoringStates).length} camiones).`);
    } catch (err) {
      console.error('[GPS Ingestor] Error al reconstruir estados de monitoreo inicial:', err.message);
    }

    await processTelemetryCycle();
    scheduleNextCycle();
  } catch (err) {
    console.error('[GPS Ingestor] Error crítico durante el inicio de la ingesta GPS:', err.message);
  }
}

// Helpers determinísticos para la persistencia diaria
const DRIVERS_LIST = [
  'Juan Pérez', 'Carlos Gómez', 'Luis Martínez', 'José Rodríguez', 'Pedro Sánchez',
  'Miguel Ángel', 'Francisco Javier', 'Manuel Torres', 'Santiago Flores', 'David Ruiz',
  'Juan Carlos', 'Alejandro Morales', 'Jesús Castillo', 'Daniel Gutiérrez', 'Javier Ortiz',
  'Óscar Romero', 'Julio Silva', 'Ángel Medina', 'Rogelio Espinoza', 'Fernando Herrera', 
  'René Paredes', 'Gonzalo Vargas', 'Eduardo Ramos', 'Marcos Cruz', 'Alfredo Flores', 
  'Roberto Núñez', 'Edgar León'
];
function getDriverForVehicle(vehId) {
  if (!vehId) return 'Por Asignar';
  const num = parseInt(vehId.replace(/\D/g, '')) || 0;
  const index = num % DRIVERS_LIST.length;
  return DRIVERS_LIST[index];
}

async function registerCompletedTrip(vid, origin, dest) {
  const startZone = (origin || '').toUpperCase().trim();
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const placa = vehiclePlates[vid] || vid;
  const driver = getDriverForVehicle(vid);
  
  // Mapear material por defecto
  let material = 'ARENA';
  if (startZone === 'FLOR DE NIEVE') {
    material = 'PIEDRA DE 1/2';
  } else if (startZone === 'YERBABUENA') {
    material = 'ARENA';
  } else if (startZone === 'SAN LORENZO') {
    material = 'AFIRMADO';
  }

  // 1. Asegurar la creación de la tabla intermedia viajes_detectados
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \`project-silvia-500416.silvia_dataset.viajes_detectados\` (
        fecha_operacion DATE,
        placa STRING,
        zona_inicio STRING,
        destino_asignado STRING,
        material STRING,
        conductor STRING,
        timestamp_completado TIMESTAMP
      );
    `;
    await bigquery.query({ query: createTableQuery });
  } catch (err) {
    console.error(`[GPS Ingestor] Error asegurando tabla viajes_detectados:`, err.message);
  }

  // 2. Registrar en la tabla intermedia viajes_detectados para todos los orígenes
  const insDetectado = `
    INSERT INTO \`project-silvia-500416.silvia_dataset.viajes_detectados\` 
      (fecha_operacion, placa, zona_inicio, destino_asignado, material, conductor, timestamp_completado)
    VALUES (DATE('${todayStr}'), '${placa}', '${startZone}', '${dest}', '${material}', '${driver}', CURRENT_TIMESTAMP())
  `;
  try {
    await bigquery.query({ query: insDetectado });
    console.log(`[GPS Ingestor] Viaje detectado persistido en viajes_detectados para ${placa} (${startZone} -> ${dest})`);
    
    // Enviar alerta a Telegram en tiempo real
    const alertMsg = `🚚 <b>Viaje Completado</b>\n\nEl volquete <b>${placa}</b> ha completado un ciclo de viaje:\n📍 <b>Origen:</b> ${startZone}\n🏁 <b>Destino:</b> ${dest}\n📦 <b>Material:</b> ${material}\n👤 <b>Conductor:</b> ${driver}`;
    sendTelegramAlert(alertMsg).catch(err => {
      console.error('[GPS Ingestor] Error enviando alerta de viaje a Telegram:', err.message);
    });
  } catch (err) {
    console.error(`[GPS Ingestor] Error insertando en viajes_detectados:`, err.message);
  }

  // 3. Registrar dinámicamente Jicamarca y Flor de Nieve en planificacion_diaria (para control del día)
  if (startZone === 'JICAMARCA' || startZone === 'FLOR DE NIEVE') {
    const query = `
      INSERT INTO \`project-silvia-500416.silvia_dataset.planificacion_diaria\` 
        (fecha_operacion, placa, zona_inicio, destino_asignado, material, viajes_programados, conductor, estado)
      VALUES (DATE('${todayStr}'), '${placa}', '${startZone}', '${dest}', '${material}', 1, '${driver}', 'CUMPLIDO')
    `;
    try {
      await bigquery.query({ query });
      console.log(`[GPS Ingestor] Registro dinámico en planificacion_diaria para ${placa} (${startZone} -> ${dest})`);
    } catch (err) {
      console.error(`[GPS Ingestor] Error insertando en planificacion_diaria:`, err.message);
    }
  }
}

export async function autoCloseDayPlanning(dateStr) {
  try {
    const dbVehicles = await bigquery.query({ query: 'SELECT id, placa FROM `silvia_dataset.vehiculos`' }).then(r => r[0]) || [];
    const dbLocations = await bigquery.query({ query: 'SELECT id, nombre FROM `silvia_dataset.ubicaciones`' }).then(r => r[0]) || [];
    const dbMaterials = await bigquery.query({ query: 'SELECT id, nombre FROM `silvia_dataset.materiales`' }).then(r => r[0]) || [];
    const dbConductors = await bigquery.query({ query: 'SELECT id, nombre FROM `silvia_dataset.conductores`' }).then(r => r[0]) || [];

    const getVehId = (placa) => {
      const clean = (placa || '').replace('-', '').toUpperCase().trim();
      const v = dbVehicles.find(x => (x.placa || '').replace('-', '').toUpperCase().trim() === clean);
      return v ? v.id : '';
    };
    const getLocId = (name) => {
      const clean = (name || '').toUpperCase().trim();
      const l = dbLocations.find(x => (x.nombre || '').toUpperCase().trim() === clean);
      return l ? l.id : '';
    };
    const getMatId = (name) => {
      const clean = (name || '').toUpperCase().trim();
      const m = dbMaterials.find(x => (x.nombre || '').toUpperCase().trim() === clean);
      return m ? m.id : '';
    };
    const getConductorId = (name) => {
      const clean = (name || '').toUpperCase().trim();
      const c = dbConductors.find(x => (x.nombre || '').toUpperCase().trim() === clean);
      return c ? c.id : '';
    };

    const maxTripRows = await bigquery.query({ query: 'SELECT MAX(id) as max_id FROM `silvia_dataset.VIAJES`' }).then(r => r[0]) || [{ max_id: 1000 }];
    let nextTripId = (maxTripRows[0] && maxTripRows[0].max_id ? parseInt(maxTripRows[0].max_id) : 1000) + 1;

    const dailyRows = await bigquery.query({
      query: `SELECT placa, zona_inicio, destino_asignado, material, viajes_programados, conductor FROM \`silvia_dataset.planificacion_diaria\` WHERE fecha_operacion = DATE('${dateStr}')`
    }).then(r => r[0]) || [];

    if (dailyRows.length === 0) return;

    const tripsToInsert = [];
    for (const row of dailyRows) {
      const startZone = (row.zona_inicio || '').toUpperCase().trim();
      const isJicaOrFlor = (startZone === 'JICAMARCA' || startZone === 'FLOR DE NIEVE');
      const vehId = getVehId(row.placa);
      
      let count = 0;
      if (isJicaOrFlor) {
        count = 1;
      } else {
        const completedRows = await bigquery.query({
          query: `SELECT COUNT(*) as cnt FROM \`project-silvia-500416.silvia_dataset.viajes_detectados\` WHERE placa = '${row.placa}' AND fecha_operacion = DATE('${dateStr}')`
        }).then(r => r[0]) || [{ cnt: 0 }];
        const completed = completedRows[0] && completedRows[0].cnt ? parseInt(completedRows[0].cnt) : 0;
        count = completed > 0 ? completed : 0;
      }

      for (let i = 0; i < count; i++) {
        const destPlant = (row.destino_asignado || 'MEIGGS').toUpperCase().trim();
        const mat = (row.material || 'ARENA').toUpperCase().trim();
        tripsToInsert.push({
          id: nextTripId++,
          vehiculo_id: vehId || 'VE-01',
          vehiculo_des: row.placa,
          cliente_id: 'C-01',
          cliente_des: 'VIRGEN DE LA ESTRELLA SAC',
          material_id: getMatId(mat) || 'M-01',
          material_des: mat,
          conductor_id: getConductorId(row.conductor) || 'CO-01',
          conductor_des: row.conductor || 'Juan Pérez',
          fecha: `${dateStr} 18:00:00`,
          origen: getLocId(startZone) || 'U-01',
          origen_des: startZone,
          destino: getLocId(destPlant) || 'U-12',
          destino_des: destPlant,
          guia_cliente: `GC-${nextTripId}`,
          guia_transportista: `GT-${nextTripId}`,
          distancia_km: 45.0,
          toneladas: 48.0,
          flete: 500.0,
          monto_sin_igv: 500.0,
          gasto: 150.0
        });
      }
    }

    if (tripsToInsert.length > 0) {
      const values = tripsToInsert.map(t => {
        return `(${t.id}, '${t.vehiculo_id}', '${t.vehiculo_des}', '${t.cliente_id}', '${t.cliente_des}', '${t.material_id}', '${t.material_des}', '${t.conductor_id}', '${t.conductor_des}', TIMESTAMP('${t.fecha}'), '${t.origen}', '${t.origen_des}', '${t.destino}', '${t.destino_des}', '${t.guia_cliente}', '${t.guia_transportista}', ${t.distancia_km}, ${t.toneladas}, ${t.flete}, ${t.monto_sin_igv}, ${t.gasto})`;
      }).join(', ');

      const insQuery = `
        INSERT INTO \`silvia_dataset.VIAJES\` 
          (id, vehiculo_id, vehiculo_des, cliente_id, cliente_des, material_id, material_des, conductor_id, conductor_des, fecha, origen, origen_des, destino, destino_des, guia_cliente, guia_transportista, distancia_km, toneladas, flete, monto_sin_igv, gasto)
        VALUES ${values}
      `;
      await bigquery.query({ query: insQuery });
      console.log(`[GPS Ingestor] Auto-Consolidados ${tripsToInsert.length} viajes para la fecha finalizada: ${dateStr}.`);
    }

    await bigquery.query({ query: `DELETE FROM \`silvia_dataset.planificacion_diaria\` WHERE fecha_operacion = DATE('${dateStr}')` });
    try {
      await bigquery.query({ query: `DELETE FROM \`project-silvia-500416.silvia_dataset.viajes_detectados\` WHERE fecha_operacion = DATE('${dateStr}')` });
    } catch (delErr) {
      console.warn(`[GPS Ingestor] No se pudo limpiar la tabla viajes_detectados:`, delErr.message);
    }
  } catch (err) {
    console.error(`[GPS Ingestor] Error en autoCloseDayPlanning para ${dateStr}:`, err.message);
  }
}

