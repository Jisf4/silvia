import express from 'express';
import { BigQuery } from '@google-cloud/bigquery';
import { livePositions, monitoringStates, rebuildMonitoringFromHistory, getValidQuarry } from '../services/gpsIngestor.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// In‑memory store for preliquidación jobs
const preliqJobs = {};
const bigquery = new BigQuery({ projectId: process.env.GOOGLE_CLOUD_PROJECT || 'project-silvia-500416' });
const datasetId = process.env.BQ_DATASET || 'silvia_dataset';

// Helper: Ejecutar query de BigQuery o retornar null si falla
async function runQuery(sql) {
  try {
    const [rows] = await bigquery.query({ query: sql.replaceAll('silvia_dataset', datasetId) });
    return rows;
  } catch (error) {
    console.error('[BigQuery Error]:', error.message);
    // Si falla (credenciales, dataset no existe, etc.), se devuelve null para usar los datos mock
    return null;
  }
}

const resolveProbableRoute = (vehId, startZone) => {
  const lp = (livePositions || []).find(p => p.vehiculo_id === vehId);
  const s = (monitoringStates || {})[vehId];
  if (!lp || !s) return 'Sin datos GPS';

  const start = startZone || 'JICAMARCA';
  if (s.state === 'garaje' || lp.estado === 'garaje') {
    return 'Fuera de Servicio (Garaje)';
  }
  if (lp.estado === 'No batería') {
    return 'Sin conexión GPS';
  }
  if (s.state === 'Detenido') {
    const loc = s.probable_destination && s.probable_destination !== '-' ? s.probable_destination : start;
    if (loc === 'YERBABUENA' || loc === 'JICAMARCA' || loc === 'FLOR DE NIEVE') {
      return `Detenido en Base ${loc} (No trabaja)`;
    }
    return `Detenido en ${loc}`;
  }
  if (s.state === 'En ruta') {
    const origin = s.current_origin || start;
    const dest = s.probable_destination && s.probable_destination !== '-' ? s.probable_destination : 'Planta';
    return `${origin} ➔ ${dest}`;
  }
  if (s.state === 'Carga en cantera') {
    return `Cargando en ${s.probable_destination && s.probable_destination !== '-' ? s.probable_destination : start}`;
  }
  if (s.state === 'Descarga en planta') {
    return `Descargando en ${s.probable_destination && s.probable_destination !== '-' ? s.probable_destination : 'Planta'}`;
  }
  return lp.estado || 'Detenido';
};

// Helper: Calcular variación porcentual mensual
function calculatePctDiff(curr, prev) {
  if (prev === null || prev === undefined || prev === 0) return '+0.0%';
  const diff = ((curr - prev) / prev) * 100;
  const prefix = diff >= 0 ? '+' : '';
  return `${prefix}${diff.toFixed(1)}%`;
}

// Helper: Obtener período mensual anterior (ej: '2026-06' -> '2026-05')
function getPreviousPeriod(period) {
  const [year, month] = period.split('-').map(Number);
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

// Caché en memoria para las métricas de KPI
let cachedMetrics = null;
let lastCacheUpdateTime = null;

// Helper: Verificar si la caché está obsoleta (vence diariamente a las 6:00 PM hora de Perú / GMT-5)
function isCacheStale(lastUpdate) {
  if (!lastUpdate) return true;

  // Convertir hora actual a zona horaria de Perú (America/Lima)
  const nowPeruStr = new Date().toLocaleString('en-US', { timeZone: 'America/Lima' });
  const nowPeru = new Date(nowPeruStr);

  // Convertir última actualización a zona horaria de Perú
  const lastPeruStr = new Date(lastUpdate).toLocaleString('en-US', { timeZone: 'America/Lima' });
  const lastPeru = new Date(lastPeruStr);

  // Encontrar el límite de las 6:00 PM más reciente en Perú relativo a 'nowPeru'
  let mostRecentSixPm = new Date(nowPeru);
  mostRecentSixPm.setHours(18, 0, 0, 0);
  if (nowPeru < mostRecentSixPm) {
    // Si aún no son las 6:00 PM hoy, el límite más reciente fue ayer a las 6:00 PM
    mostRecentSixPm.setDate(mostRecentSixPm.getDate() - 1);
  }

  // Si la última actualización ocurrió antes del límite de las 6:00 PM, está obsoleta
  return lastPeru < mostRecentSixPm;
}

// Endpoint raíz de /api
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API del Dashboard SILVIA activa.',
    endpoints: {
      metrics: '/api/metrics',
      positions: '/api/vehicles/positions',
      indicators: '/api/charts/indicators',
      topRoutes: '/api/routes/top',
      efficiency: '/api/vehicles/efficiency',
      predict: '/api/predict (POST)'
    }
  });
});

// 1. ENDPOINT: Posiciones en tiempo real (Mapa)
router.get('/vehicles/positions', (req, res) => {
  // Retorna el arreglo de posiciones actualizado en memoria
  res.json({
    success: true,
    data: livePositions
  });
});

// Endpoint: Obtener lista de vehículos (placas ordenadas alfabéticamente)
router.get('/vehicles', async (req, res) => {
  const sql = `
    SELECT v.id, v.placa, v.capacidad_toneladas, v.zona_base, v.zona_actual, v.conductor as conductor_id, cond.nombre as conductor_nombre
    FROM \`${datasetId}.vehiculos\` v
    LEFT JOIN \`${datasetId}.conductores\` cond ON v.conductor = cond.id
    ORDER BY v.placa ASC;
  `;
  const data = await runQuery(sql);
  if (data && data.length > 0) {
    res.json({
      success: true,
      data: data
    });
  } else {
    // Fallback local ordenado alfabéticamente
    res.json({
      success: true,
      data: [
        { id: 'VE-01', placa: 'VQ-08 (AFG456)' },
        { id: 'VE-02', placa: 'VQ-12 (BCI734)' },
        { id: 'VE-03', placa: 'VQ-19 (BEE245)' },
        { id: 'VE-04', placa: 'VQ-27 (BDP123)' },
        { id: 'VE-05', placa: 'VQ-31 (ABL875)' }
      ]
    });
  }
});

// 2. ENDPOINT: Métricas Consolidadas (Tarjetas superiores)
router.get('/metrics', async (req, res) => {
  const currPeriod = req.query.periodo || '2026-06';
  const vehiculoId = req.query.vehiculo_id || 'Todos';
  const prevPeriod = getPreviousPeriod(currPeriod);

  // 1. Si es el mes en curso (2026-07), verificar vigencia de caché de 24h
  if (currPeriod === '2026-07') {
    try {
      const checkSql = `
        SELECT MAX(last_updated) AS max_last_updated 
        FROM \`silvia_dataset.kpi_metrics_monthly\` 
        WHERE periodo = '2026-07';
      `;
      const checkResult = await runQuery(checkSql);
      const lastUpdated = checkResult && checkResult[0] && checkResult[0].max_last_updated
        ? new Date(checkResult[0].max_last_updated.value)
        : null;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (!lastUpdated || lastUpdated < oneDayAgo) {
        console.log(`[API Metrics] Caché de mes actual '2026-07' obsoleta o inexistente. Recalculando desde tablas crudas...`);

        // Recalcular mes actual en BigQuery
        const recalculateSql = `
          DELETE FROM \`silvia_dataset.kpi_metrics_monthly\` WHERE periodo = '2026-07';
          
          INSERT INTO \`silvia_dataset.kpi_metrics_monthly\` (
            periodo,
            vehiculo_id,
            facturacion,
            gastos,
            combustible_monto,
            combustible_galones,
            gnv_monto,
            gnv_m3,
            peajes_monto,
            combustible_esperado_monto,
            gnv_esperado_monto,
            distancia_km,
            ingresos_proyectados,
            viajes_realizados,
            peso_seco,
            viajes_sin_guia,
            last_updated
          )
          WITH base_metrics AS (
            -- 1. Viajes
            SELECT 
              '2026-07' AS periodo,
              vehiculo_id,
              SUM(monto_total) AS facturacion,
              SUM(gastos) AS gastos,
              0.0 AS combustible_monto,
              0.0 AS combustible_galones,
              0.0 AS gnv_monto,
              0.0 AS gnv_m3,
              0.0 AS peajes_monto,
              0.0 AS combustible_esperado_monto,
              0.0 AS gnv_esperado_monto,
              0.0 AS distancia_km,
              0.0 AS ingresos_proyectados,
              COUNT(*) AS viajes_realizados,
              SUM(peso_seco) AS peso_seco,
              COUNTIF(nro_guia IS NULL OR TRIM(nro_guia) = '' OR nro_guia = 'None') AS viajes_sin_guia
            FROM \`silvia_dataset.viajes\`
            WHERE FORMAT_TIMESTAMP('%Y-%m', fecha) = '2026-07' AND vehiculo_id IS NOT NULL
            GROUP BY 1, 2

            UNION ALL

            -- 2. Combustible (Diesel)
            SELECT 
              '2026-07' AS periodo,
              vehiculo_id,
              0.0 AS facturacion,
              0.0 AS gastos,
              SUM(monto_despachado) AS combustible_monto,
              SUM(galones_despachados) AS combustible_galones,
              0.0 AS gnv_monto,
              0.0 AS gnv_m3,
              0.0 AS peajes_monto,
              0.0 AS combustible_esperado_monto,
              0.0 AS gnv_esperado_monto,
              0.0 AS distancia_km,
              0.0 AS ingresos_proyectados,
              0 AS viajes_realizados,
              0.0 AS peso_seco,
              0 AS viajes_sin_guia
            FROM \`silvia_dataset.combustible\`
            WHERE FORMAT_TIMESTAMP('%Y-%m', fecha) = '2026-07' AND vehiculo_id IS NOT NULL
            GROUP BY 1, 2

            UNION ALL

            -- 3. GNV (joined with vehiculos on plate)
            SELECT 
              '2026-07' AS periodo,
              v.id AS vehiculo_id,
              0.0 AS facturacion,
              0.0 AS gastos,
              0.0 AS combustible_monto,
              0.0 AS combustible_galones,
              SUM(g.monto_total) AS gnv_monto,
              SUM(g.m3) AS gnv_m3,
              0.0 AS peajes_monto,
              0.0 AS combustible_esperado_monto,
              0.0 AS gnv_esperado_monto,
              SUM(g.km_recorridos) AS distancia_km,
              0.0 AS ingresos_proyectados,
              0 AS viajes_realizados,
              0.0 AS peso_seco,
              0 AS viajes_sin_guia
            FROM \`silvia_dataset.gnv\` g
            JOIN \`silvia_dataset.vehiculos\` v ON TRIM(g.placa) = TRIM(v.placa)
            WHERE FORMAT_DATE('%Y-%m', g.fecha) = '2026-07'
            GROUP BY 1, 2

            UNION ALL

            -- 4. Peajes (placa contains vehiculo_id)
            SELECT 
              '2026-07' AS periodo,
              placa AS vehiculo_id,
              0.0 AS facturacion,
              0.0 AS gastos,
              0.0 AS combustible_monto,
              0.0 AS combustible_galones,
              0.0 AS gnv_monto,
              0.0 AS gnv_m3,
              SUM(CASE WHEN tipo_servicio = 'Consumo' THEN -total_servicio ELSE 0.0 END) AS peajes_monto,
              0.0 AS combustible_esperado_monto,
              0.0 AS gnv_esperado_monto,
              0.0 AS distancia_km,
              0.0 AS ingresos_proyectados,
              0 AS viajes_realizados,
              0.0 AS peso_seco,
              0 AS viajes_sin_guia
            FROM \`silvia_dataset.peajes\`
            WHERE FORMAT_DATE('%Y-%m', fecha_transito) = '2026-07' AND placa IS NOT NULL
            GROUP BY 1, 2

            UNION ALL

            -- 5. Anomaly expected fuel amounts & distance for DIESEL
            SELECT 
              '2026-07' AS periodo,
              vehiculo_id,
              0.0 AS facturacion,
              0.0 AS gastos,
              0.0 AS combustible_monto,
              0.0 AS combustible_galones,
              0.0 AS gnv_monto,
              0.0 AS gnv_m3,
              0.0 AS peajes_monto,
              SUM(IF(tipo_combustible = 'DIESEL', consumo_esperado * precio_unitario, 0.0)) AS combustible_esperado_monto,
              SUM(IF(tipo_combustible = 'GNV', consumo_esperado * precio_unitario, 0.0)) AS gnv_esperado_monto,
              SUM(distancia_km) AS distancia_km,
              0.0 AS ingresos_proyectados,
              0 AS viajes_realizados,
              0.0 AS peso_seco,
              0 AS viajes_sin_guia
            FROM \`silvia_dataset.fuel_anomalies\`
            WHERE FORMAT_TIMESTAMP('%Y-%m', fecha_fin) = '2026-07' AND vehiculo_id IS NOT NULL
            GROUP BY 1, 2

            UNION ALL

            -- 6. Ingresos Proyectados (Option A: from planificacion_asignaciones)
            SELECT 
              '2026-07' AS periodo,
              p.vehiculo_id,
              0.0 AS facturacion,
              0.0 AS gastos,
              0.0 AS combustible_monto,
              0.0 AS combustible_galones,
              0.0 AS gnv_monto,
              0.0 AS gnv_m3,
              0.0 AS peajes_monto,
              0.0 AS combustible_esperado_monto,
              0.0 AS gnv_esperado_monto,
              0.0 AS distancia_km,
              SUM(p.viajes_asignados * COALESCE(v_avg.flete_promedio, v_global.flete_promedio, 500.0)) AS ingresos_proyectados,
              0 AS viajes_realizados,
              0.0 AS peso_seco,
              0 AS viajes_sin_guia
            FROM \`silvia_dataset.planificacion_asignaciones\` p
            LEFT JOIN (
              SELECT 
                vehiculo_id,
                origen,
                AVG(monto_total) AS flete_promedio
              FROM \`silvia_dataset.viajes\`
              GROUP BY 1, 2
            ) v_avg ON p.vehiculo_id = v_avg.vehiculo_id AND TRIM(p.cantera_origen) = TRIM(v_avg.origen)
            LEFT JOIN (
              SELECT 
                vehiculo_id,
                AVG(monto_total) AS flete_promedio
              FROM \`silvia_dataset.viajes\`
              GROUP BY 1
            ) v_global ON p.vehiculo_id = v_global.vehiculo_id
            WHERE FORMAT_DATE('%Y-%m', p.fecha_operacion) = '2026-07'
            GROUP BY 1, 2
          )
          SELECT 
            periodo,
            vehiculo_id,
            SUM(facturacion) AS facturacion,
            SUM(gastos) AS gastos,
            SUM(combustible_monto) AS combustible_monto,
            SUM(combustible_galones) AS combustible_galones,
            SUM(gnv_monto) AS gnv_monto,
            SUM(gnv_m3) AS gnv_m3,
            SUM(peajes_monto) AS peajes_monto,
            SUM(combustible_esperado_monto) AS combustible_esperado_monto,
            SUM(gnv_esperado_monto) AS gnv_esperado_monto,
            SUM(distancia_km) AS distancia_km,
            SUM(ingresos_proyectados) AS ingresos_proyectados,
            SUM(viajes_realizados) AS viajes_realizados,
            SUM(peso_seco) AS peso_seco,
            SUM(viajes_sin_guia) AS viajes_sin_guia,
            CURRENT_TIMESTAMP() AS last_updated
          FROM base_metrics
          GROUP BY 1, 2;
        `;
        await runQuery(recalculateSql);
      }
    } catch (err) {
      console.error("[API Metrics] Error al verificar/recalcular mes en curso:", err);
    }
  }

  // 2. Consulta sobre la tabla agregada kpi_metrics_monthly para el mes solicitado y el anterior
  let sql = "";
  if (vehiculoId === 'Todos' || !vehiculoId) {
    sql = `
      SELECT 
        periodo,
        SUM(facturacion) AS facturacion,
        SUM(gastos) AS gastos,
        SUM(combustible_monto) AS combustible_monto,
        SUM(combustible_galones) AS combustible_galones,
        SUM(gnv_monto) AS gnv_monto,
        SUM(gnv_m3) AS gnv_m3,
        SUM(peajes_monto) AS peajes_monto,
        SUM(combustible_esperado_monto) AS combustible_esperado_monto,
        SUM(gnv_esperado_monto) AS gnv_esperado_monto,
        SUM(distancia_km) AS distancia_km,
        SUM(ingresos_proyectados) AS ingresos_proyectados,
        SUM(viajes_realizados) AS viajes_realizados,
        SUM(peso_seco) AS peso_seco,
        SUM(viajes_sin_guia) AS viajes_sin_guia
      FROM \`silvia_dataset.kpi_metrics_monthly\`
      WHERE periodo IN ('${currPeriod}', '${prevPeriod}')
      GROUP BY periodo;
    `;
  } else {
    sql = `
      SELECT 
        periodo,
        SUM(facturacion) AS facturacion,
        SUM(gastos) AS gastos,
        SUM(combustible_monto) AS combustible_monto,
        SUM(combustible_galones) AS combustible_galones,
        SUM(gnv_monto) AS gnv_monto,
        SUM(gnv_m3) AS gnv_m3,
        SUM(peajes_monto) AS peajes_monto,
        SUM(combustible_esperado_monto) AS combustible_esperado_monto,
        SUM(gnv_esperado_monto) AS gnv_esperado_monto,
        SUM(distancia_km) AS distancia_km,
        SUM(ingresos_proyectados) AS ingresos_proyectados,
        SUM(viajes_realizados) AS viajes_realizados,
        SUM(peso_seco) AS peso_seco,
        SUM(viajes_sin_guia) AS viajes_sin_guia
      FROM \`silvia_dataset.kpi_metrics_monthly\`
      WHERE periodo IN ('${currPeriod}', '${prevPeriod}') AND vehiculo_id = '${vehiculoId}'
      GROUP BY periodo;
    `;
  }

  try {
    const results = await runQuery(sql);

    // Si no se devolvieron filas, significa que este vehículo/mes no tiene actividad operacional
    if (!results || results.length === 0) {
      return res.json({
        success: true,
        source: 'BigQuery (Aggregate Cache - No Activity)',
        data: {
          facturacion: { valor: 0, diff: '+0.0%' },
          utilidadNet: { valor: 0, diff: '+0.0%' },
          utilidadNetEstimada: { valor: 0, diff: '+0.0%' },
          viajes: { valor: 0, diff: '+0.0%' },
          toneladasSecas: { valor: 0, diff: '+0.0%' },
          combustible: { valor: 0, diff: '+0.0%' },
          consumoEspecif: { valor: 0, diff: '+0.0%' },
          viajesSinGuia: { valor: 0, diff: '+0.0%' }
        }
      });
    }

    const currRow = results.find(r => r.periodo === currPeriod) || {
      facturacion: 0, gastos: 0, combustible_monto: 0, combustible_galones: 0, gnv_monto: 0, gnv_m3: 0, peajes_monto: 0,
      combustible_esperado_monto: 0, gnv_esperado_monto: 0, distancia_km: 0, ingresos_proyectados: 0, viajes_realizados: 0, peso_seco: 0, viajes_sin_guia: 0
    };
    const prevRow = results.find(r => r.periodo === prevPeriod) || {
      facturacion: 0, gastos: 0, combustible_monto: 0, combustible_galones: 0, gnv_monto: 0, gnv_m3: 0, peajes_monto: 0,
      combustible_esperado_monto: 0, gnv_esperado_monto: 0, distancia_km: 0, ingresos_proyectados: 0, viajes_realizados: 0, peso_seco: 0, viajes_sin_guia: 0
    };

    const facturacion = currRow.facturacion || 0;

    // Combustible real unificado (Diesel + GNV)
    const combustibleMonto = (currRow.combustible_monto || 0) + (currRow.gnv_monto || 0);
    const peajesMonto = currRow.peajes_monto || 0;

    // Utilidad Neta Real: facturación menos gastos de viajes, combustible real (Diesel/GNV) y peajes
    const utilidadNet = facturacion - (currRow.gastos || 0) - combustibleMonto - peajesMonto;

    // Ingresos Proyectados:
    // - Para meses anteriores a junio (cerrados): no estimamos pendientes (ingresos_proyectados = facturacion)
    // - Para junio (mes recién cerrado con guías pendientes): extrapolamos con descuento del 35%
    // - Para julio en adelante (meses con planificación): usamos planificación con descuento del 35%
    let ingresosProyectados = 0;
    if (currPeriod < '2026-06') {
      ingresosProyectados = facturacion;
    } else if (currRow.ingresos_proyectados && currRow.ingresos_proyectados > 0) {
      ingresosProyectados = currRow.ingresos_proyectados * 0.65; // Margen pesimista del 35%
    } else {
      const viajesRealizados = currRow.viajes_realizados || 0;
      const viajesSinGuia = currRow.viajes_sin_guia || 0;
      const viajesFacturados = viajesRealizados - viajesSinGuia;
      if (viajesRealizados > 0 && viajesFacturados > 0) {
        // Mantenemos la facturación real ya ingresada al 100% y aplicamos un factor pesimista de 65% a la estimación del saldo pendiente
        const ingresosFacturados = facturacion;
        const ingresosEstimadosPendientes = (facturacion / viajesFacturados) * viajesSinGuia * 0.65;
        ingresosProyectados = ingresosFacturados + ingresosEstimadosPendientes;
      } else {
        ingresosProyectados = facturacion;
      }
    }

    // Combustible esperado unificado (Diesel + GNV)
    const combustibleEsperadoMonto = (currRow.combustible_esperado_monto || 0) + (currRow.gnv_esperado_monto || 0);
    const combustibleEsperadoFinal = combustibleEsperadoMonto > 0 ? combustibleEsperadoMonto : combustibleMonto;

    // Utilidad Neta Estimada: ingresos proyectados menos gastos de viajes, combustible esperado y peajes
    const utilidadNetEstimada = ingresosProyectados - (currRow.gastos || 0) - combustibleEsperadoFinal - peajesMonto;

    const viajes = currRow.viajes_realizados || 0;
    const toneladasSecas = currRow.peso_seco || 0;

    // Volumen total de combustible (Diesel galones + GNV m3)
    const combustibleVolumen = (currRow.combustible_galones || 0) + (currRow.gnv_m3 || 0);
    const distancia = currRow.distancia_km || 0;

    // Eficiencia: km/gal. Calculado como: kilómetros recorridos / volumen total
    const consumoEspecif = combustibleVolumen > 0 ? (distancia / combustibleVolumen) : 0;
    const viajesSinGuia = currRow.viajes_sin_guia || 0;

    const gastoGnv = Math.abs(currRow.gnv_monto || 0);
    const prevGastoGnv = Math.abs(prevRow.gnv_monto || 0);
    const gastoDiesel = Math.abs(currRow.combustible_monto || 0);
    const prevGastoDiesel = Math.abs(prevRow.combustible_monto || 0);
    const gastoPeajes = Math.abs(currRow.peajes_monto || 0);
    const prevGastoPeajes = Math.abs(prevRow.peajes_monto || 0);

    const prevFacturacion = prevRow.facturacion || 0;
    const prevCombustibleMonto = (prevRow.combustible_monto || 0) + (prevRow.gnv_monto || 0);
    const prevPeajesMonto = prevRow.peajes_monto || 0;
    const prevUtilidadNet = prevFacturacion - (prevRow.gastos || 0) - prevCombustibleMonto - prevPeajesMonto;

    // Ingresos Proyectados previos
    let prevIngresosProyectados = 0;
    if (prevPeriod < '2026-06') {
      prevIngresosProyectados = prevFacturacion;
    } else if (prevRow.ingresos_proyectados && prevRow.ingresos_proyectados > 0) {
      prevIngresosProyectados = prevRow.ingresos_proyectados * 0.65; // Margen pesimista del 35%
    } else {
      const prevViajesRealizados = prevRow.viajes_realizados || 0;
      const prevViajesSinGuia = prevRow.viajes_sin_guia || 0;
      const prevViajesFacturados = prevViajesRealizados - prevViajesSinGuia;
      if (prevViajesRealizados > 0 && prevViajesFacturados > 0) {
        const prevIngresosFacturados = prevFacturacion;
        const prevIngresosEstimadosPendientes = (prevFacturacion / prevViajesFacturados) * prevViajesSinGuia * 0.65;
        prevIngresosProyectados = prevIngresosFacturados + prevIngresosEstimadosPendientes;
      } else {
        prevIngresosProyectados = prevFacturacion;
      }
    }

    const prevCombustibleEsperadoMonto = (prevRow.combustible_esperado_monto || 0) + (prevRow.gnv_esperado_monto || 0);
    const prevCombustibleEsperadoFinal = prevCombustibleEsperadoMonto > 0 ? prevCombustibleEsperadoMonto : prevCombustibleMonto;
    const prevUtilidadNetEstimada = prevIngresosProyectados - (prevRow.gastos || 0) - prevCombustibleEsperadoFinal - prevPeajesMonto;

    const prevCombustibleVolumen = (prevRow.combustible_galones || 0) + (prevRow.gnv_m3 || 0);
    const prevDistancia = prevRow.distancia_km || 0;
    const prevConsumoEspecif = prevCombustibleVolumen > 0 ? (prevDistancia / prevCombustibleVolumen) : 0;
    const prevViajesSinGuia = prevRow.viajes_sin_guia || 0;
    const prevViajes = prevRow.viajes_realizados || 0;
    const prevToneladasSecas = prevRow.peso_seco || 0;

    // 1. La sección diaria siempre debe mostrar los datos del día de hoy
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const targetDate = todayStr;

    //let viajesProgramados = 0;
    //let volquetesActivos = 0;
    //let dieselProyectadoVol = 0;
    //let gnvProyectadoVol = 0;
    let viajesProgramados = {};
    let volquetesActivos = {};
    let dieselProyectadoVol = {};
    let gnvProyectadoVol = {};
    let ahorroEstimado = {};

    if (targetDate) {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      if (targetDate === todayStr) {
        // Recalcular el día actual y el anterior si la caché tiene más de 1 hora o no existe
        const checkSql = `
          SELECT MAX(last_updated) AS max_last_updated 
          FROM \`silvia_dataset.kpi_metrics_daily\` 
          WHERE fecha = DATE('${targetDate}');
        `;
        try {
          const checkResult = await runQuery(checkSql);
          const lastUpdated = checkResult && checkResult[0] && checkResult[0].max_last_updated
            ? new Date(checkResult[0].max_last_updated.value)
            : null;

          const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
          if (!lastUpdated || lastUpdated < fifteenSecondsAgo) {
            console.log(`[API Metrics] Caché diaria de '${targetDate}' obsoleta o inexistente. Actualizando...`);
            const updateSql = `
              DELETE FROM \`silvia_dataset.kpi_metrics_daily\` 
              WHERE fecha IN (DATE('${targetDate}'), DATE_SUB(DATE('${targetDate}'), INTERVAL 1 DAY));
              
              INSERT INTO \`silvia_dataset.kpi_metrics_daily\` (
                fecha,
                vehiculo_id,
                viajes_programados,
                volquetes_activos,
                diesel_proyectado,
                gnv_proyectado,
                ahorro_estimado,
                last_updated
              )
              WITH date_veh_base AS (
                SELECT fecha_operacion AS fecha, vehiculo_id 
                FROM \`silvia_dataset.planificacion_asignaciones\`
                WHERE fecha_operacion IN (DATE('${targetDate}'), DATE_SUB(DATE('${targetDate}'), INTERVAL 1 DAY)) AND vehiculo_id IS NOT NULL
                UNION DISTINCT
                SELECT DATE(fecha) AS fecha, vehiculo_id 
                FROM \`silvia_dataset.viajes\`
                WHERE DATE(fecha) IN (DATE('${targetDate}'), DATE_SUB(DATE('${targetDate}'), INTERVAL 1 DAY)) AND vehiculo_id IS NOT NULL
                UNION DISTINCT
                SELECT d.fecha_operacion AS fecha, v.id AS vehiculo_id
                FROM \`silvia_dataset.viajes_detectados\` d
                JOIN \`silvia_dataset.vehiculos\` v ON TRIM(d.placa) = TRIM(v.placa)
                WHERE d.fecha_operacion IN (DATE('${targetDate}'), DATE_SUB(DATE('${targetDate}'), INTERVAL 1 DAY))
              ),
              plan_daily AS (
                SELECT fecha_operacion AS fecha, vehiculo_id, SUM(viajes_asignados) AS viajes_asignados
                FROM \`silvia_dataset.planificacion_asignaciones\`
                WHERE fecha_operacion IN (DATE('${targetDate}'), DATE_SUB(DATE('${targetDate}'), INTERVAL 1 DAY))
                GROUP BY 1, 2
              ),
              real_daily AS (
                SELECT fecha, vehiculo_id, SUM(viajes_realizados) AS viajes_realizados, SUM(facturacion_estimada) AS facturacion_estimada FROM (
                  SELECT DATE(fecha) AS fecha, vehiculo_id, COUNT(*) AS viajes_realizados, SUM(monto_total) AS facturacion_estimada
                  FROM \`silvia_dataset.viajes\`
                  WHERE DATE(fecha) IN (DATE('${targetDate}'), DATE_SUB(DATE('${targetDate}'), INTERVAL 1 DAY))
                  GROUP BY 1, 2
                  UNION ALL
                  SELECT d.fecha_operacion AS fecha, v.id AS vehiculo_id, COUNT(*) AS viajes_realizados, SUM(COALESCE(r_avg.flete_promedio, 500.0)) AS facturacion_estimada
                  FROM \`silvia_dataset.viajes_detectados\` d
                  JOIN \`silvia_dataset.vehiculos\` v ON TRIM(d.placa) = TRIM(v.placa)
                  LEFT JOIN (
                    SELECT TRIM(origen_des) AS origen, TRIM(destino_des) AS destino, AVG(monto_total) AS flete_promedio
                    FROM \`silvia_dataset.viajes\`
                    GROUP BY 1, 2
                  ) r_avg ON TRIM(d.zona_inicio) = r_avg.origen AND TRIM(d.destino_asignado) = r_avg.destino
                  WHERE d.fecha_operacion IN (DATE('${targetDate}'), DATE_SUB(DATE('${targetDate}'), INTERVAL 1 DAY))
                  GROUP BY 1, 2
                )
                GROUP BY 1, 2
              )
              SELECT 
                b.fecha,
                b.vehiculo_id,
                COALESCE(p.viajes_asignados, 0) AS viajes_programados,
                COALESCE(r.viajes_realizados, 0) AS volquetes_activos,
                COALESCE(r.viajes_realizados, 0) * COALESCE(v.capacidad_toneladas, 40.0) AS diesel_proyectado,
                CASE WHEN COALESCE(r.viajes_realizados, 0) > 0 THEN 1 ELSE 0 END AS gnv_proyectado,
                COALESCE(r.facturacion_estimada, 0.0) AS ahorro_estimado,
                CURRENT_TIMESTAMP() AS last_updated
              FROM date_veh_base b
              JOIN \`silvia_dataset.vehiculos\` v ON b.vehiculo_id = v.id
              LEFT JOIN plan_daily p ON b.fecha = p.fecha AND b.vehiculo_id = p.vehiculo_id
              LEFT JOIN real_daily r ON b.fecha = r.fecha AND b.vehiculo_id = r.vehiculo_id;
            `;
            await runQuery(updateSql);
            console.log(`[API Metrics] Caché diaria de '${targetDate}' actualizada con éxito.`);
          }
        } catch (err) {
          console.warn("[API Metrics] Error al actualizar la caché diaria:", err.message);
        }
      }

      // Query daily metrics for the last 7 days ending on targetDate
      // Line 687 changed from \$ to $
      const qDailyKpi7Days = `
        SELECT 
          fecha,
          SUM(viajes_programados) AS viajes_programados,
          SUM(volquetes_activos) AS volquetes_activos,
          SUM(diesel_proyectado) AS diesel_proyectado,
          SUM(gnv_proyectado) AS gnv_proyectado,
          SUM(ahorro_estimado) AS ahorro_estimado
        FROM \`silvia_dataset.kpi_metrics_daily\`
        WHERE fecha BETWEEN DATE_SUB(DATE('${targetDate}'), INTERVAL 6 DAY) AND DATE('${targetDate}')
        
          ${vehiculoId && vehiculoId !== 'Todos' ? `AND vehiculo_id = '${vehiculoId}'` : ''}
        GROUP BY fecha
        ORDER BY fecha ASC;
      `;

      try {
        const dailyRows = await runQuery(qDailyKpi7Days);

        // Find targetDate row and previous day row
        const targetDateObj = new Date(targetDate);
        const prevDateObj = new Date(targetDateObj.getTime() - 24 * 60 * 60 * 1000);
        const prevDateStr = prevDateObj.toISOString().split('T')[0];

        const currDayRow = dailyRows.find(r => {
          const rowDateStr = r.fecha.value || r.fecha;
          return rowDateStr === targetDate;
        }) || {};

        const prevDayRow = dailyRows.find(r => {
          const rowDateStr = r.fecha.value || r.fecha;
          return rowDateStr === prevDateStr;
        }) || {};

        let viajesProgVal = currDayRow.viajes_programados || 0;
        let viajesRealVal = currDayRow.volquetes_activos || 0;
        let toneladasVal = currDayRow.diesel_proyectado || 0;
        let activeCamiones = currDayRow.gnv_proyectado || 0;
        let facturacionVal = currDayRow.ahorro_estimado || 0;

        let prevViajesProgVal = prevDayRow.viajes_programados || 0;
        let prevViajesRealVal = prevDayRow.volquetes_activos || 0;
        let prevToneladasVal = prevDayRow.diesel_proyectado || 0;
        let prevActiveCamiones = prevDayRow.gnv_proyectado || 0;
        let prevFacturacionVal = prevDayRow.ahorro_estimado || 0;

        // Productividad promedio por camión
        let productividadVal = activeCamiones > 0 ? (viajesRealVal / activeCamiones) : 0;
        let prevProductividadVal = prevActiveCamiones > 0 ? (prevViajesRealVal / prevActiveCamiones) : 0;

        // Generate 7-day sparkline history
        const viajesProgHistory = dailyRows.map(r => r.viajes_programados || 0);
        const viajesRealHistory = dailyRows.map(r => r.volquetes_activos || 0);
        const toneladasHistory = dailyRows.map(r => Math.round(r.diesel_proyectado || 0));
        const productividadHistory = dailyRows.map(r => {
          const act = r.gnv_proyectado || 0;
          const real = r.volquetes_activos || 0;
          return act > 0 ? parseFloat((real / act).toFixed(2)) : 0;
        });
        const facturacionHistory = dailyRows.map(r => Math.round(r.ahorro_estimado || 0));

        viajesProgramados = { valor: viajesProgVal, diff: calculatePctDiff(viajesProgVal, prevViajesProgVal), history: viajesProgHistory };
        volquetesActivos = { valor: viajesRealVal, diff: calculatePctDiff(viajesRealVal, prevViajesRealVal), history: viajesRealHistory };
        dieselProyectadoVol = { valor: Math.round(toneladasVal), diff: calculatePctDiff(toneladasVal, prevToneladasVal), history: toneladasHistory };
        gnvProyectadoVol = { valor: parseFloat(productividadVal.toFixed(2)), diff: calculatePctDiff(productividadVal, prevProductividadVal), history: productividadHistory };
        ahorroEstimado = { valor: Math.round(facturacionVal), diff: calculatePctDiff(facturacionVal, prevFacturacionVal), history: facturacionHistory };

      } catch (err) {
        console.warn("[API Metrics] Error query kpi_metrics_daily, using zeros:", err.message);
        viajesProgramados = { valor: 0, diff: '+0.0%', history: [] };
        volquetesActivos = { valor: 0, diff: '+0.0%', history: [] };
        dieselProyectadoVol = { valor: 0, diff: '+0.0%', history: [] };
        gnvProyectadoVol = { valor: 0, diff: '+0.0%', history: [] };
        ahorroEstimado = { valor: 0, diff: '+0.0%', history: [] };
      }
    } else {
      viajesProgramados = { valor: 0, diff: '+0.0%', history: [] };
      volquetesActivos = { valor: 0, diff: '+0.0%', history: [] };
      dieselProyectadoVol = { valor: 0, diff: '+0.0%', history: [] };
      gnvProyectadoVol = { valor: 0, diff: '+0.0%', history: [] };
      ahorroEstimado = { valor: 0, diff: '+0.0%', history: [] };
    }

    res.json({
      success: true,
      source: 'BigQuery (Aggregate Cache)',
      data: {
        facturacion: { valor: facturacion, diff: calculatePctDiff(facturacion, prevFacturacion) },
        utilidadNet: { valor: utilidadNet, diff: calculatePctDiff(utilidadNet, prevUtilidadNet) },
        utilidadNetEstimada: { valor: utilidadNetEstimada, diff: calculatePctDiff(utilidadNetEstimada, prevUtilidadNetEstimada) },
        viajes: { valor: viajes, diff: calculatePctDiff(viajes, prevViajes) },
        toneladasSecas: { valor: toneladasSecas, diff: calculatePctDiff(toneladasSecas, prevToneladasSecas) },
        combustible: { valor: Math.round(combustibleVolumen), diff: calculatePctDiff(combustibleVolumen, prevCombustibleVolumen) },
        consumoEspecif: { valor: parseFloat(consumoEspecif.toFixed(2)) || 0, diff: calculatePctDiff(consumoEspecif, prevConsumoEspecif) },
        viajesSinGuia: { valor: viajesSinGuia, diff: calculatePctDiff(viajesSinGuia, prevViajesSinGuia) },
        gastoGnv: { valor: gastoGnv, diff: calculatePctDiff(gastoGnv, prevGastoGnv) },
        gastoDiesel: { valor: gastoDiesel, diff: calculatePctDiff(gastoDiesel, prevGastoDiesel) },
        gastoPeajes: { valor: gastoPeajes, diff: calculatePctDiff(gastoPeajes, prevGastoPeajes) },
        porFacturar: { valor: viajesSinGuia, diff: calculatePctDiff(viajesSinGuia, prevViajesSinGuia) },
        viajesProgramados: viajesProgramados,
        volquetesActivos: volquetesActivos,
        dieselProyectadoVol: dieselProyectadoVol,
        gnvProyectadoVol: gnvProyectadoVol,
        ahorroEstimado: ahorroEstimado
      }
    });
  } catch (error) {
    console.warn("[API Metrics] Error al realizar la consulta agregada, usando fallback simulado:", error.message);

    // Fallback: Datos mock dinámicos basados en mes seleccionado
    const isJune = currPeriod === '2026-06';
    const baseMult = isJune ? 1.0 : (currPeriod === '2026-07' ? 1.05 : 0.95);

    res.json({
      success: true,
      source: 'Mock (Fallback)',
      data: {
        facturacion: { valor: Math.round(1248750 * baseMult), diff: '+4.2%' },
        utilidadNet: { valor: Math.round(262450 * baseMult), diff: '+5.1%' },
        utilidadNetEstimada: { valor: Math.round(278600 * baseMult), diff: '+4.8%' },
        viajes: { valor: Math.round(532 * baseMult), diff: '+1.8%' },
        toneladasSecas: { valor: Math.round(12450 * baseMult), diff: '+3.5%' },
        combustible: { valor: Math.round(2842 * baseMult), diff: '-2.4%' },
        consumoEspecif: { valor: parseFloat((14.2 * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2)), diff: '+2.1%' },
        viajesSinGuia: { valor: Math.round(48 * baseMult), diff: '+1.5%' },
        gastoGnv: { valor: Math.round(18450 * baseMult), diff: '-1.5%' },
        gastoDiesel: { valor: Math.round(52300 * baseMult), diff: '+2.4%' },
        gastoPeajes: { valor: Math.round(8900 * baseMult), diff: '+0.8%' },
        porFacturar: { valor: Math.round(48 * baseMult), diff: '+1.5%' },
        viajesProgramados: { valor: Math.round(25 * baseMult), diff: '+2.4%', history: [22, 24, 21, 23, 22, 25, 24] },
        volquetesActivos: { valor: Math.round(18 * baseMult), diff: '+1.1%', history: [16, 17, 18, 17, 18, 18, 18] },
        dieselProyectadoVol: { valor: Math.round(1450 * baseMult), diff: '-3.2%', history: [1500, 1480, 1470, 1460, 1490, 1450, 1440] },
        gnvProyectadoVol: { valor: Math.round(850 * baseMult), diff: '+5.4%', history: [800, 810, 830, 820, 840, 850, 860] },
        ahorroEstimado: { valor: Math.round(4800 * baseMult), diff: '+8.1%', history: [4200, 4300, 4400, 4500, 4700, 4800, 4900] }
      }
    });
  }
});

// 3. ENDPOINT: Indicadores Clave (4 gráficos de líneas)
router.get('/charts/indicators', async (req, res) => {
  const { groupMode = 'Diario' } = req.query;

  let sql = '';
  if (groupMode === 'Semanal') {
    // Rango mensual (últimos 28 días) con datos diarios para suavizar curvas
    sql = `
      WITH MaxDate AS (
        SELECT MAX(DATE(SAFE_CAST(fecha AS TIMESTAMP), 'America/Lima')) as max_f 
        FROM \`silvia_dataset.viajes\`
        WHERE DATE(SAFE_CAST(fecha AS TIMESTAMP), 'America/Lima') <= CURRENT_DATE('America/Lima')
      )
      SELECT 
        DATE(SAFE_CAST(fecha AS TIMESTAMP), 'America/Lima') as raw_date,
        CAST(SUM(COALESCE(monto_total, 0.0) - COALESCE(gastos, 0.0)) AS INT64) as utilidad,
        0.0 as km,
        COUNT(id) as viajes
      FROM \`silvia_dataset.viajes\`, MaxDate
      WHERE DATE(SAFE_CAST(fecha AS TIMESTAMP), 'America/Lima') BETWEEN DATE_SUB(max_f, INTERVAL 27 DAY) AND max_f
      GROUP BY raw_date
      ORDER BY raw_date;
    `;
  } else {
    // Rango de una semana (últimos 7 días) con subdivisiones diarias (conversión a hora de Perú)
    sql = `
      WITH MaxDate AS (
        SELECT MAX(DATE(SAFE_CAST(fecha AS TIMESTAMP), 'America/Lima')) as max_f 
        FROM \`silvia_dataset.viajes\`
        WHERE DATE(SAFE_CAST(fecha AS TIMESTAMP), 'America/Lima') <= CURRENT_DATE('America/Lima')
      )
      SELECT 
        FORMAT_TIMESTAMP('%d/%m', SAFE_CAST(fecha AS TIMESTAMP), 'America/Lima') as label,
        CAST(SUM(COALESCE(monto_total, 0.0) - COALESCE(gastos, 0.0)) AS INT64) as utilidad,
        0.0 as km,
        COUNT(id) as viajes,
        DATE(SAFE_CAST(fecha AS TIMESTAMP), 'America/Lima') as raw_date
      FROM \`silvia_dataset.viajes\`, MaxDate
      WHERE DATE(SAFE_CAST(fecha AS TIMESTAMP), 'America/Lima') BETWEEN DATE_SUB(max_f, INTERVAL 6 DAY) AND max_f
      GROUP BY label, raw_date
      ORDER BY raw_date;
    `;
  }

  const bqData = await runQuery(sql);

  if (bqData && bqData.length > 0) {
    if (groupMode === 'Semanal') {
      const formattedData = bqData.map((row, index) => {
        const dateObj = new Date(row.raw_date);
        // getDay() === 1 es lunes en JS. Marcamos primer, último y lunes como semanales
        const isWeekly = dateObj.getDay() === 1 || index === 0 || index === bqData.length - 1;

        let label = '';
        if (isWeekly) {
          const tempDate = new Date(dateObj.getTime());
          tempDate.setHours(0, 0, 0, 0);
          tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
          const week1 = new Date(tempDate.getFullYear(), 0, 4);
          const weekNum = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          label = `W${weekNum} ${day}/${month}`;
        }

        return {
          dia: label,
          utilidad: row.utilidad,
          combustible: Math.round(row.km * 0.15),
          km: Math.round(row.km),
          viajes: row.viajes,
          isWeekly: isWeekly
        };
      });

      res.json({
        success: true,
        source: 'BigQuery',
        data: formattedData
      });
    } else {
      const formattedData = bqData.map(row => ({
        dia: row.label,
        utilidad: row.utilidad,
        combustible: Math.round(row.km * 0.15),
        km: Math.round(row.km),
        viajes: row.viajes,
        isWeekly: true
      }));

      res.json({
        success: true,
        source: 'BigQuery',
        data: formattedData
      });
    }
  } else {
    // Fallback local (acotado al 9 de junio)
    if (groupMode === 'Semanal') {
      const mockCharts = [];
      for (let i = 0; i < 28; i++) {
        const date = new Date('2026-06-09');
        date.setDate(date.getDate() - (27 - i));
        const isWeekly = date.getDay() === 1 || i === 0 || i === 27;

        let label = '';
        if (isWeekly) {
          const tempDate = new Date(date.getTime());
          tempDate.setHours(0, 0, 0, 0);
          tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
          const week1 = new Date(tempDate.getFullYear(), 0, 4);
          const weekNum = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

          const dayStr = String(date.getDate()).padStart(2, '0');
          const monthStr = String(date.getMonth() + 1).padStart(2, '0');
          label = `W${weekNum} ${dayStr}/${monthStr}`;
        }

        mockCharts.push({
          dia: label,
          utilidad: 8000 + Math.round(Math.sin(i / 2) * 4000) + 1000,
          combustible: 45 + Math.round(Math.sin(i / 2) * 20) + 5,
          km: 250 + Math.round(Math.sin(i / 2) * 120) + 25,
          viajes: 4 + Math.round(Math.sin(i / 2) * 3) + 1,
          isWeekly: isWeekly
        });
      }
      res.json({
        success: true,
        source: 'Mock (Local)',
        data: mockCharts
      });
    } else {
      const mockCharts = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date('2026-06-09');
        date.setDate(date.getDate() - (6 - i));
        const dayStr = String(date.getDate()).padStart(2, '0');
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        mockCharts.push({
          dia: `${dayStr}/${monthStr}`,
          utilidad: 10000 + Math.round(Math.sin(i) * 3000) + 1000,
          combustible: 50 + Math.round(Math.sin(i) * 15) + 5,
          km: 300 + Math.round(Math.sin(i) * 100) + 25,
          viajes: 5 + Math.round(Math.sin(i) * 2) + 1,
          isWeekly: true
        });
      }
      res.json({
        success: true,
        source: 'Mock (Local)',
        data: mockCharts
      });
    }
  }
});

// 4. ENDPOINT: Top 5 Rutas por Utilidad
router.get('/routes/top', async (req, res) => {
  const { periodo, vehiculo_id } = req.query;

  let whereClauses = [];
  if (periodo) {
    whereClauses.push(`FORMAT_TIMESTAMP('%Y-%m', fecha) = '${periodo}'`);
  }
  if (vehiculo_id && vehiculo_id !== 'Todos') {
    whereClauses.push(`vehiculo_id = '${vehiculo_id}'`);
  }
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      CONCAT(origen_des, ' -> ', destino_des) as ruta,
      COUNT(id) as viajes,
      CAST(SUM(COALESCE(monto_total, 0.0) - COALESCE(gastos, 0.0)) AS INT64) as utilidad_total,
      CAST(AVG(COALESCE(monto_total, 0.0) - COALESCE(gastos, 0.0)) AS INT64) as utilidad_promedio
    FROM \`silvia_dataset.viajes\`
    ${whereSql}
    GROUP BY 1
    ORDER BY utilidad_total DESC
    LIMIT 5;
  `;

  const bqData = await runQuery(sql);

  if (bqData && bqData.length > 0) {
    res.json({
      success: true,
      source: 'BigQuery',
      data: bqData
    });
  } else {
    // Fallback exacto a la imagen del modelo
    res.json({
      success: true,
      source: 'Mock (Local)',
      data: [
        { ruta: 'Cantera A -> Obra Los Portales', viajes: 68, utilidad_total: 45680, utilidad_promedio: 672 },
        { ruta: 'Cantera B -> Obra Alto Verde', viajes: 54, utilidad_total: 32140, utilidad_promedio: 595 },
        { ruta: 'Cantera A -> Obra San Juan', viajes: 45, utilidad_total: 24780, utilidad_promedio: 551 },
        { ruta: 'Cantera C -> Obra Santa Clara', viajes: 38, utilidad_total: 18920, utilidad_promedio: 498 },
        { ruta: 'Cantera B -> Obra El Sol', viajes: 32, utilidad_total: 15320, utilidad_promedio: 479 }
      ]
    });
  }
});

// 5. ENDPOINT: Eficiencia de Vehículos
router.get('/vehicles/efficiency', async (req, res) => {
  const { periodo } = req.query;
  const targetPeriod = periodo || '2026-07';

  const sql = `
    SELECT 
      v.placa as vehiculo,
      m.viajes_realizados as viajes,
      CAST(COALESCE(m.facturacion, 0.0) - COALESCE(m.gastos, 0.0) - COALESCE(m.combustible_monto, 0.0) - COALESCE(m.gnv_monto, 0.0) - COALESCE(m.peajes_monto, 0.0) AS INT64) as ganancia
    FROM \`silvia_dataset.kpi_metrics_monthly\` m
    JOIN \`silvia_dataset.vehiculos\` v ON m.vehiculo_id = v.id
    WHERE m.periodo = '${targetPeriod}'
      AND m.viajes_realizados > 0;
  `;

  try {
    const bqData = await runQuery(sql);

    // Ordenar de mejor a peor ganancia
    const sortedDesc = [...bqData].sort((a, b) => b.ganancia - a.ganancia);
    // Ordenar de peor a mejor ganancia
    const sortedAsc = [...bqData].sort((a, b) => a.ganancia - b.ganancia);

    const mejores = sortedDesc.slice(0, 5);
    const peores = sortedAsc.slice(0, 5);

    if (mejores.length > 0 || peores.length > 0) {
      res.json({
        success: true,
        source: 'BigQuery (Aggregate KPI)',
        data: { mejores, peores }
      });
    } else {
      const isJune = targetPeriod === '2026-06';
      const baseMult = isJune ? 1.0 : (targetPeriod === '2026-07' ? 1.05 : 0.95);
      res.json({
        success: true,
        source: 'Mock (Fallback)',
        data: {
          mejores: [
            { vehiculo: 'BAE736', viajes: Math.round(26 * baseMult), ganancia: Math.round(2183 * baseMult) },
            { vehiculo: 'CBR854', viajes: Math.round(43 * baseMult), ganancia: Math.round(1463 * baseMult) },
            { vehiculo: 'C9W737', viajes: Math.round(56 * baseMult), ganancia: Math.round(449 * baseMult) },
            { vehiculo: 'CBA709', viajes: Math.round(10 * baseMult), ganancia: Math.round(373 * baseMult) },
            { vehiculo: 'CHS718', viajes: Math.round(41 * baseMult), ganancia: Math.round(-264 * baseMult) }
          ],
          peores: [
            { vehiculo: 'CBR796', viajes: Math.round(41 * baseMult), ganancia: Math.round(-17528 * baseMult) },
            { vehiculo: 'CBR872', viajes: Math.round(41 * baseMult), ganancia: Math.round(-16880 * baseMult) },
            { vehiculo: 'AHJ786', viajes: Math.round(81 * baseMult), ganancia: Math.round(-14306 * baseMult) },
            { vehiculo: 'CBR846', viajes: Math.round(43 * baseMult), ganancia: Math.round(-11907 * baseMult) },
            { vehiculo: 'BYP824', viajes: Math.round(43 * baseMult), ganancia: Math.round(-8762 * baseMult) }
          ]
        }
      });
    }
  } catch (error) {
    console.warn("[API Efficiency] Error al consultar eficiencia de ganancia, usando fallback mock:", error.message);
    res.json({
      success: true,
      source: 'Mock (Fallback)',
      data: {
        mejores: [
          { vehiculo: 'BAE736', viajes: 26, ganancia: 2183 },
          { vehiculo: 'CBR854', viajes: 43, ganancia: 1463 },
          { vehiculo: 'C9W737', viajes: 56, ganancia: 449 },
          { vehiculo: 'CBA709', viajes: 10, ganancia: 373 },
          { vehiculo: 'CHS718', viajes: 41, ganancia: -264 }
        ],
        peores: [
          { vehiculo: 'CBR796', viajes: 41, ganancia: -17528 },
          { vehiculo: 'CBR872', viajes: 41, ganancia: -16880 },
          { vehiculo: 'AHJ786', viajes: 81, ganancia: -14306 },
          { vehiculo: 'CBR846', viajes: 43, ganancia: -11907 },
          { vehiculo: 'BYP824', viajes: 43, ganancia: -8762 }
        ]
      }
    });
  }
});

// 6. ENDPOINT: Predicción de Próximo Viaje
router.post('/predict', async (req, res) => {
  const { origen, destino, material, toneladas } = req.body;

  // Validaciones básicas
  if (!origen || !destino || !material || !toneladas) {
    return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
  }

  // Lógica de cálculo heurístico (simulando un modelo de ML)
  const tons = parseFloat(toneladas) || 20;

  // Asignamos una distancia estimada
  let distancia = 25;
  if (origen.includes('Lurín') && destino.includes('Ate')) distancia = 35.5;
  if (origen.includes('Carabayllo')) distancia = 42.0;
  if (origen.includes('Huachipa')) distancia = 15.2;

  const eta = Math.round(distancia * 1.2 + (tons * 0.2));
  const combustibleEstimado = parseFloat((distancia * 0.35 + (tons * 0.05)).toFixed(1));
  const utilidadEstimada = Math.round(distancia * 15 - combustibleEstimado * 16);

  // Seleccionar un vehículo recomendado basado en el rendimiento
  // VQ-12 (BCI734) es la mejor opción por defecto
  const recomendacion = 'VQ-12 (BCI734)';
  const confianza = 87; // Nivel de confianza del modelo

  // Intentamos registrar la predicción en BigQuery de forma asíncrona
  try {
    const timestampStr = new Date().toISOString();
    const modelId = Date.now();
    const insertSql = `
      INSERT INTO \`${datasetId}.MODEL_PREDICTIONS\` (model_id, vehiculo_id, fecha_prediccion, valor_variables, valor_predicho, valor_real, error_pct)
      VALUES (${modelId}, 'VE-01', TIMESTAMP('${timestampStr}'), '{"origen": "${origen}", "destino": "${destino}", "toneladas": ${tons}, "material": "${material}"}', ${utilidadEstimada}, NULL, NULL);
    `;
    // Ejecutar en BigQuery si está activo
    bigquery.query({ query: insertSql }).catch(() => { });
  } catch (err) {
    // Fallar en silencio si no está BigQuery
  }

  res.json({
    success: true,
    data: {
      eta: `${eta} min`,
      combustible: `${combustibleEstimado} gal`,
      utilidad: `S/ ${utilidadEstimada.toLocaleString()}`,
      confianza: `${confianza}%`,
      recomendacion: recomendacion
    }
  });
});

// ==========================================
// MÓDULO: PLANIFICACIÓN DE VIAJES
// ==========================================

// 7. ENDPOINT: Obtener vehículos con su zona actual y capacidad
router.get('/planning/vehicles', async (req, res) => {
  try {
    const sql = `
      SELECT id, placa, capacidad_toneladas, zona_base, zona_actual, rotacion_permitida
      FROM \`${datasetId}.vehiculos\`
      ORDER BY placa ASC;
    `;
    const data = await runQuery(sql);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.1. ENDPOINT: Obtener metadatos de planificación (materiales y ubicaciones ordenados alfabéticamente)
router.get('/planning/metadata', async (req, res) => {
  try {
    const sqlMaterials = `
      SELECT DISTINCT nombre
      FROM \`${datasetId}.materiales\`
      WHERE nombre IS NOT NULL AND nombre != ''
      ORDER BY nombre ASC;
    `;
    const sqlUbicaciones = `
      SELECT DISTINCT nombre, tipo
      FROM \`${datasetId}.ubicaciones\`
      WHERE nombre IS NOT NULL AND nombre != ''
      ORDER BY nombre ASC;
    `;
    const materials = await runQuery(sqlMaterials);
    const locations = await runQuery(sqlUbicaciones);
    res.json({
      success: true,
      data: {
        materials: materials.map(m => m.nombre.trim()),
        locations: locations.map(l => l.nombre.trim())
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function getCanteraForPlant(plantName, orders = []) {
  const name = (plantName || '').toUpperCase().trim();
  const found = (orders || []).find(o => (o.planta || '').toUpperCase().trim() === name);
  if (found) {
    return found.cantera.toUpperCase().trim();
  }
  if (['COLLIQUE', 'OQUENDO', 'HUACHIPA', 'LURIN', 'CAJAMARQUILLA'].includes(name)) {
    return 'SAN LORENZO';
  }
  return 'YERBABUENA'; // Default/Fallback
}



// 7.2. ENDPOINT: Cargar planificación existente para una fecha determinada
router.get('/planning/load', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ success: false, error: 'Falta el parámetro date' });
  }
  try {
    // 1. Cargar solicitudes
    const sqlOrders = `
      SELECT cantera, planta, material, volumen_m3, prioridad
      FROM \`${datasetId}.planificacion_solicitudes\`
      WHERE fecha_operacion = DATE('${date}')
    `;
    const dbOrders = await runQuery(sqlOrders);

    // Cargar todos los conductores activos
    const sqlAllDrivers = `SELECT id, nombre FROM \`${datasetId}.conductores\` WHERE estado = 'activo' ORDER BY nombre ASC`;
    const allDrivers = await runQuery(sqlAllDrivers) || [];

    // 2. Cargar todos los vehículos y sus asignaciones guardadas para hoy
    const sqlVehicles = `
      SELECT 
        v.id, 
        v.placa, 
        v.capacidad_toneladas, 
        v.zona_base, 
        v.zona_actual, 
        v.rotacion_permitida,
        v.conductor as default_conductor_id,
        cond.nombre as default_conductor_nombre,
        p.zona_inicio as zona_inicio_previa,
        p.viajes_asignados as viajes_previos,
        p.cantera_origen as cantera_asignada_previa,
        p.estado_asignacion as estado_previo,
        p.material as material_previo,
        d.conductor as saved_conductor_nombre
      FROM \`${datasetId}.vehiculos\` v
      LEFT JOIN \`${datasetId}.conductores\` cond ON v.conductor = cond.id
      LEFT JOIN \`${datasetId}.planificacion_asignaciones\` p 
        ON v.id = p.vehiculo_id AND p.fecha_operacion = DATE('${date}')
      LEFT JOIN \`${datasetId}.planificacion_diaria\` d
        ON v.placa = d.placa AND d.fecha_operacion = DATE('${date}')
    `;
    const dbVehicles = await runQuery(sqlVehicles);

    // Cargar historial GPS de hoy para detectar la última cantera visitada
    const sqlGpsQuarries = `
      SELECT g.vehiculo_id, u.nombre as cantera_detectada
      FROM \`${datasetId}.gps_positions\` g
      CROSS JOIN \`${datasetId}.ubicaciones\` u
      WHERE DATE(g.timestamp_gps) = DATE('${date}')
        AND LOWER(u.tipo) = 'cantera'
        AND ST_DISTANCE(ST_GEOGPOINT(g.lon, g.lat), ST_GEOGPOINT(u.lon, u.lat)) <= 300
      ORDER BY g.vehiculo_id, g.timestamp_gps DESC
    `;
    const dbGpsQuarries = await runQuery(sqlGpsQuarries);
    const lastQuarryMap = {};
    if (dbGpsQuarries && dbGpsQuarries.length > 0) {
      dbGpsQuarries.forEach(row => {
        const vid = row.vehiculo_id;
        if (!lastQuarryMap[vid]) {
          lastQuarryMap[vid] = row.cantera_detectada.toUpperCase().trim();
        }
      });
    }

    if (dbOrders.length === 0 && dbVehicles.filter(v => (v.viajes_previos || 0) > 0).length === 0) {
      return res.json({ success: true, exists: false });
    }

    const recommendations = [];
    dbVehicles.forEach(v => {
      const hasPrev = (v.viajes_previos || 0) > 0;
      if (hasPrev) {
        const baseCan = (v.zona_base || 'YERBABUENA').toUpperCase().trim();
        const startCan = (v.zona_inicio_previa || baseCan).toUpperCase().trim();
        if (baseCan !== startCan && ['YERBABUENA', 'SAN LORENZO'].includes(baseCan) && ['YERBABUENA', 'SAN LORENZO'].includes(startCan)) {
          recommendations.push({
            id: v.id,
            placa: v.placa,
            tipo: v.tipo || 'Volquete',
            desde: baseCan,
            hacia: startCan,
            viajes_asignados: parseInt(v.viajes_previos),
            capacidad_toneladas: parseFloat(v.capacidad_toneladas)
          });
        }
      }
    });

    const dbAssignments = dbVehicles.map(v => {
      const hasPrev = (v.viajes_previos || 0) > 0;
      let startZone = (hasPrev && v.zona_inicio_previa)
        ? v.zona_inicio_previa.toUpperCase().trim()
        : (v.zona_actual || v.zona_base || 'YERBABUENA').toUpperCase().trim();

      if (!hasPrev) {
        const lastVisitedQuarry = lastQuarryMap[v.id];
        if (lastVisitedQuarry) {
          startZone = lastVisitedQuarry;
        } else {
          const resolvedCan = getCanteraForPlant(startZone, dbOrders);
          if (resolvedCan) {
            startZone = resolvedCan.toUpperCase().trim();
          }
        }
      }

      const validZones = ['YERBABUENA', 'SAN LORENZO', 'JICAMARCA', 'FLOR DE NIEVE'];
      if (!validZones.includes(startZone)) {
        startZone = (v.zona_base || 'YERBABUENA').toUpperCase().trim();
      }
      if (!validZones.includes(startZone)) {
        startZone = 'YERBABUENA';
      }

      const isAlwaysAssigned = (startZone === 'JICAMARCA' || startZone === 'FLOR DE NIEVE');
      const prevDest = hasPrev ? v.cantera_asignada_previa : (isAlwaysAssigned ? startZone : null);
      let prevEst = hasPrev ? v.estado_previo : (isAlwaysAssigned ? 'LOCAL' : 'RESERVA');

      // Auto-corrección de transferencias locales erróneas cargadas de base de datos
      if (hasPrev && prevEst === 'TRANSFERIDO' && prevDest) {
        const destCan = getCanteraForPlant(prevDest, dbOrders).toUpperCase().trim();
        if (startZone === destCan) {
          prevEst = 'LOCAL';
        }
      }

      // Determine conductor
      let cId = '-';
      let cName = 'Por Asignar';
      
      if (v.saved_conductor_nombre) {
        const found = allDrivers.find(d => d.nombre.toUpperCase().trim() === v.saved_conductor_nombre.toUpperCase().trim());
        if (found) {
          cId = found.id;
          cName = found.nombre;
        } else {
          cName = v.saved_conductor_nombre;
        }
      } else if (v.default_conductor_id && v.default_conductor_id !== '-') {
        cId = v.default_conductor_id;
        cName = v.default_conductor_nombre || 'Por Asignar';
      }

      return {
        id: v.id,
        placa: v.placa,
        capacidad_toneladas: parseFloat(v.capacidad_toneladas) || 30.0,
        zona_inicio: startZone,
        rotacion_permitida: v.rotacion_permitida,
        viajes_asignados: hasPrev ? parseInt(v.viajes_previos) : 0,
        estado_asignacion: prevEst,
        cantera_trabajo: prevDest,
        material: hasPrev ? v.material_previo || '' : '',
        isPreviousAssignment: false,
        conductor_id: cId,
        conductor_nombre: cName
      };
    });


    // 3. Calcular demanda y déficits
    const totalDemand = {};
    dbOrders.forEach(o => {
      const cantera = (o.cantera || '').toUpperCase().trim();
      const vol = parseFloat(o.volumen_m3) || 0;
      const tons = parseFloat((vol * 1.55).toFixed(2));
      totalDemand[cantera] = (totalDemand[cantera] || 0) + tons;
    });

    const deficits = {};
    Object.keys(totalDemand).forEach(cantera => {
      const demand = totalDemand[cantera];
      const capacity = dbAssignments
        .filter(a => (a.zona_inicio || '').toUpperCase().trim() === cantera.toUpperCase().trim())
        .reduce((sum, a) => sum + ((parseInt(a.viajes_asignados) || 0) * (parseFloat(a.capacidad_toneladas) || 30.0)), 0);
      deficits[cantera] = parseFloat(Math.max(0, demand - capacity).toFixed(2));
    });

    // Resolver ruta probable en tiempo real para vehículos de Jicamarca y Flor de Nieve
    dbAssignments.forEach(a => {
      const start = (a.zona_inicio || '').toUpperCase().trim();
      if (start === 'JICAMARCA' || start === 'FLOR DE NIEVE') {
        const s = (monitoringStates || {})[a.id];
        const rawCantera = s ? (s.assigned_cantera || s.current_origin || start) : start;
        a.cantera_trabajo = getValidQuarry(rawCantera, a.id);
        a.viajes_asignados = 1;
        a.estado_asignacion = 'LOCAL';
      }
    });

    res.json({
      success: true,
      exists: true,
      data: {
        orders: dbOrders,
        assignments: dbAssignments,
        demandSummary: totalDemand,
        deficits: deficits,
        recommendations: recommendations,
        drivers: allDrivers
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. ENDPOINT: Calcular asignación de flota (Algoritmo de 3 fases con Prioridades)
router.post('/planning/calculate', async (req, res) => {
  const { orders, date } = req.body;
  if (!orders || !Array.isArray(orders) || !date) {
    return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos' });
  }

  try {
    const sqlVehicles = `
      SELECT 
        v.id, 
        v.placa, 
        v.capacidad_toneladas, 
        v.zona_base, 
        v.zona_actual, 
        v.rotacion_permitida,
        v.conductor as conductor_id,
        cond.nombre as conductor_nombre,
        p.viajes_programados as viajes_previos,
        p.destino_asignado as cantera_asignada_previa,
        p.estado as estado_previo,
        p.material as material_previo,
        COALESCE(c.viajes_realizados, 0) as viajes_completados
      FROM \`${datasetId}.vehiculos\` v
      LEFT JOIN \`${datasetId}.conductores\` cond ON v.conductor = cond.id
      LEFT JOIN \`${datasetId}.planificacion_diaria\` p 
        ON v.placa = p.placa AND p.fecha_operacion = DATE('${date}')
      LEFT JOIN (
        SELECT vehiculo_id, COUNT(*) as viajes_realizados
        FROM \`${datasetId}.viajes\`
        WHERE DATE(fecha) = DATE('${date}')
        GROUP BY vehiculo_id
      ) c ON v.id = c.vehiculo_id
    `;
    const dbVehicles = await runQuery(sqlVehicles);

    // Cargar historial GPS de hoy para detectar la última cantera visitada
    const sqlGpsQuarries = `
      SELECT g.vehiculo_id, u.nombre as cantera_detectada
      FROM \`${datasetId}.gps_positions\` g
      CROSS JOIN \`${datasetId}.ubicaciones\` u
      WHERE DATE(g.timestamp_gps) = DATE('${date}')
        AND LOWER(u.tipo) = 'cantera'
        AND ST_DISTANCE(ST_GEOGPOINT(g.lon, g.lat), ST_GEOGPOINT(u.lon, u.lat)) <= 300
      ORDER BY g.vehiculo_id, g.timestamp_gps DESC
    `;
    const dbGpsQuarries = await runQuery(sqlGpsQuarries);
    const lastQuarryMap = {};
    if (dbGpsQuarries && dbGpsQuarries.length > 0) {
      dbGpsQuarries.forEach(row => {
        const vid = row.vehiculo_id;
        if (!lastQuarryMap[vid]) {
          lastQuarryMap[vid] = row.cantera_detectada.toUpperCase().trim();
        }
      });
    }

    const vehiclesList = dbVehicles && dbVehicles.length > 0 ? dbVehicles : [
      { id: 'VE-01', placa: 'F3F817', capacidad_toneladas: 48, zona_base: 'YERBABUENA', zona_actual: 'YERBABUENA', rotacion_permitida: '' },
      { id: 'VE-02', placa: 'BBJ814', capacidad_toneladas: 48, zona_base: 'YERBABUENA', zona_actual: 'YERBABUENA', rotacion_permitida: '' },
      { id: 'VE-03', placa: 'ATN880', capacidad_toneladas: 48, zona_base: 'YERBABUENA', zona_actual: 'YERBABUENA', rotacion_permitida: 'SAN LORENZO' },
      { id: 'VE-04', placa: 'AYM897', capacidad_toneladas: 48, zona_base: 'YERBABUENA', zona_actual: 'YERBABUENA', rotacion_permitida: '' },
      { id: 'VE-05', placa: 'BYP824', capacidad_toneladas: 48, zona_base: 'JICAMARCA', zona_actual: 'JICAMARCA', rotacion_permitida: 'YERBABUENA' }
    ];

    // Inicializar demandas: totales, prioritarias y normales
    const totalDemand = {};
    const priorityDemand = {};
    const normalDemand = {};

    orders.forEach(o => {
      const cantera = (o.cantera || '').toUpperCase().trim();
      const vol = parseFloat(o.volumen_m3) || 0;
      const tons = parseFloat((vol * 1.55).toFixed(2));
      const isPriority = o.prioridad === true || String(o.prioridad).toLowerCase() === 'true' || o.prioridad === 1 || String(o.prioridad) === '1';

      if (!totalDemand[cantera]) {
        totalDemand[cantera] = 0;
        priorityDemand[cantera] = 0;
        normalDemand[cantera] = 0;
      }
      totalDemand[cantera] += tons;
      if (isPriority) {
        priorityDemand[cantera] += tons;
      } else {
        normalDemand[cantera] += tons;
      }
    });

    const currentCanteras = new Set([
      ...orders.map(o => (o.cantera || '').toUpperCase().trim()),
      ...orders.map(o => (o.planta || '').toUpperCase().trim())
    ]);

    let statusVehicles = vehiclesList.map(v => {
      let startZone = (v.zona_actual || v.zona_base || 'YERBABUENA').toUpperCase().trim();

      const lastVisitedQuarry = lastQuarryMap[v.id];
      if (lastVisitedQuarry) {
        startZone = lastVisitedQuarry;
      } else {
        const resolvedCan = getCanteraForPlant(startZone, orders);
        if (resolvedCan) {
          startZone = resolvedCan.toUpperCase().trim();
        }
      }

      const validZones = ['YERBABUENA', 'SAN LORENZO', 'JICAMARCA', 'FLOR DE NIEVE'];
      if (!validZones.includes(startZone)) {
        startZone = (v.zona_base || 'YERBABUENA').toUpperCase().trim();
      }
      if (!validZones.includes(startZone)) {
        startZone = 'YERBABUENA';
      }

      const isAlwaysAssigned = (startZone === 'JICAMARCA' || startZone === 'FLOR DE NIEVE');
      const prevViajes = parseInt(v.viajes_previos) || 0;
      const completed = parseInt(v.viajes_completados) || 0;
      const isBusy = prevViajes > 0 && completed < prevViajes;

      const prevDest = isBusy ? v.cantera_asignada_previa : (isAlwaysAssigned ? startZone : null);
      let prevEst = isBusy ? v.estado_previo : (isAlwaysAssigned ? 'LOCAL' : 'RESERVA');

      // Auto-corrección de transferencias locales erróneas cargadas de base de datos
      if (isBusy && prevEst === 'TRANSFERIDO' && prevDest) {
        const destCan = getCanteraForPlant(prevDest, orders).toUpperCase().trim();
        if (startZone === destCan) {
          prevEst = 'LOCAL';
        }
      }

      return {
        id: v.id,
        placa: v.placa,
        capacidad_toneladas: parseFloat(v.capacidad_toneladas) || 30.0,
        zona_base: v.zona_base,
        zona_actual: v.zona_actual,
        rotacion_permitida: v.rotacion_permitida,
        viajes_asignados: isBusy ? prevViajes : 0,
        estado_asignacion: prevEst,
        cantera_trabajo: prevDest,
        material: isBusy ? v.material_previo || '' : '',
        zona_inicio: startZone,
        isPreviousAssignment: isBusy,
        conductor_id: v.conductor_id || '-',
        conductor_nombre: v.conductor_nombre || 'Por Asignar'
      };


    });

    // Mezclar la lista de vehículos de forma aleatoria para no cargar siempre los mismos camiones
    statusVehicles.sort(() => Math.random() - 0.5);

    let hasTransferredYerbabuenaToSanLorenzo = false;
    let hasTransferredSanLorenzoToYerbabuena = false;

    // Determina si un vehículo puede ser asignado/transferido a una cantera destino
    const canVehicleSupportCantera = (v, targetCantera) => {
      const startZone = (v.zona_inicio || '').toUpperCase().trim();
      const plate = (v.placa || '').replace('-', '').toUpperCase().trim();
      const target = targetCantera.toUpperCase().trim();

      // Si el vehículo es de Jicamarca o Flor de Nieve
      if (startZone === 'JICAMARCA' || startZone === 'FLOR DE NIEVE') {
        // Excepción: BYP-824 puede ir a Yerbabuena o San Lorenzo si no tiene viajes en progreso
        if (plate === 'BYP824' && (v.viajes_asignados || 0) === 0 && (target === 'YERBABUENA' || target === 'SAN LORENZO')) {
          return true;
        }
        // De lo contrario, solo puede ir a su propia cantera de origen
        return target === startZone;
      }
      return true;
    };

    // Obtener la cantidad máxima de viajes permitidos según la cantera/vehículo
    const getVehicleMaxTrips = (v, cantera, isPriority = false) => {
      const target = (cantera || '').toUpperCase().trim();
      const start = (v.zona_inicio || '').toUpperCase().trim();

      // Si Yerbabuena es origen o destino, el límite es siempre 2.
      if (start === 'YERBABUENA' || target === 'YERBABUENA') {
        return 2;
      }

      // Regla de Prioridad de San Lorenzo: si es prioridad y la cantera es San Lorenzo, el límite es 2 en lugar de 4.
      if (isPriority && (target === 'SAN LORENZO' || start === 'SAN LORENZO')) {
        return 2;
      }

      return 4; // San Lorenzo y otros pueden hacer hasta 4 viajes en flujo normal
    };

    const allocateToVehicles = (vehicles, cantera, planta, material, order, isTransfer, isPriority) => {
      const targetCan = (cantera || '').toUpperCase().trim();

      // FASE 1: Selección Dinámica por Mejor Ajuste (Dynamic Fit Selection)
      // Determinamos el subconjunto de vehículos necesarios para cubrir la demanda con cero déficit y mínimo exceso
      let tempTonsRemaining = order.tonsRemaining;
      const selectedVehicles = [];
      const availableCandidates = [...vehicles];

      while (tempTonsRemaining > 0 && availableCandidates.length > 0) {
        let bestIdx = -1;
        let bestExcess = Infinity;
        let maxCapFound = -Infinity;
        let bestMaxCapIdx = -1;

        for (let i = 0; i < availableCandidates.length; i++) {
          const v = availableCandidates[i];
          const startCan = (v.zona_inicio || '').toUpperCase().trim();
          const actualTransfer = isTransfer && (startCan !== targetCan);

          // Prevenir transferencias cruzadas
          if (actualTransfer) {
            if (startCan === 'YERBABUENA' && targetCan === 'SAN LORENZO' && hasTransferredSanLorenzoToYerbabuena) continue;
            if (startCan === 'SAN LORENZO' && targetCan === 'YERBABUENA' && hasTransferredYerbabuenaToSanLorenzo) continue;
          }

          const maxTrips = getVehicleMaxTrips(v, cantera, isPriority);
          const remainingTrips = maxTrips - (v.viajes_asignados || 0);
          if (remainingTrips <= 0) continue;

          const totalCap = remainingTrips * v.capacidad_toneladas;

          if (totalCap >= tempTonsRemaining) {
            // Este camión cubre el remanente. Evaluamos el exceso.
            const excess = totalCap - tempTonsRemaining;
            if (excess < bestExcess) {
              bestExcess = excess;
              bestIdx = i;
            }
          } else {
            // No cubre el remanente. Buscamos la mayor capacidad.
            if (totalCap > maxCapFound) {
              maxCapFound = totalCap;
              bestMaxCapIdx = i;
            }
          }
        }

        const selectedIdx = bestIdx !== -1 ? bestIdx : bestMaxCapIdx;
        if (selectedIdx === -1) break;

        const v = availableCandidates[selectedIdx];
        const maxTrips = getVehicleMaxTrips(v, cantera, isPriority);
        const remainingTrips = maxTrips - (v.viajes_asignados || 0);

        const tripsNeeded = Math.ceil(tempTonsRemaining / v.capacidad_toneladas);
        const tripsToAssign = Math.min(remainingTrips, tripsNeeded);

        selectedVehicles.push({
          vehicle: v,
          remainingTrips,
          actualTransfer: isTransfer && ((v.zona_inicio || '').toUpperCase().trim() !== targetCan),
          startCan: (v.zona_inicio || '').toUpperCase().trim(),
          capacity: v.capacidad_toneladas,
          assignedTrips: 0
        });

        tempTonsRemaining -= tripsToAssign * v.capacidad_toneladas;
        availableCandidates.splice(selectedIdx, 1); // Remover de los candidatos disponibles
      }

      if (selectedVehicles.length === 0) return;

      // FASE 2: Optimización por Rondas (Round-Robin sobre el subconjunto seleccionado)
      // Distribuimos los viajes de forma uniforme entre los vehículos seleccionados para evitar viajes vacíos o excesivos
      let addedAny = true;
      while (order.tonsRemaining > 0 && addedAny) {
        addedAny = false;
        for (const item of selectedVehicles) {
          if (order.tonsRemaining <= 0) break;

          if (item.assignedTrips < item.remainingTrips) {
            item.assignedTrips += 1;
            order.tonsRemaining = parseFloat((order.tonsRemaining - item.capacity).toFixed(2));
            addedAny = true;
          }
        }
      }

      // Aplicar los viajes optimizados a los vehículos y marcar banderas
      selectedVehicles.forEach(item => {
        const v = item.vehicle;
        const tripsToAssign = item.assignedTrips;
        if (tripsToAssign > 0) {
          // Marcar banderas de transferencia si se concreta la asignación
          if (item.actualTransfer) {
            if (item.startCan === 'YERBABUENA' && targetCan === 'SAN LORENZO') {
              hasTransferredYerbabuenaToSanLorenzo = true;
            }
            if (item.startCan === 'SAN LORENZO' && targetCan === 'YERBABUENA') {
              hasTransferredSanLorenzoToYerbabuena = true;
            }
          }

          v.cantera_trabajo = planta;
          v.material = material;
          v.viajes_asignados = (v.viajes_asignados || 0) + tripsToAssign;
          v.estado_asignacion = item.actualTransfer ? 'TRANSFERIDO' : 'LOCAL';
        }
      });
    };


    // ALGORITMO DE DISTRIBUCIÓN
    // Crear lista de órdenes con demandas
    const demandOrders = orders.map((o, idx) => {
      const vol = parseFloat(o.volumen_m3) || 0;
      const tons = parseFloat((vol * 1.55).toFixed(2));
      const isPriority = o.prioridad === true || String(o.prioridad).toLowerCase() === 'true' || o.prioridad === 1 || String(o.prioridad) === '1';
      return {
        ...o,
        index: idx,
        isPriority,
        tonsRemaining: tons,
        totalTons: tons
      };
    });

    // Separar en prioritarios y normales
    const priorityOrders = demandOrders.filter(o => o.isPriority && o.tonsRemaining > 0);
    const normalOrders = demandOrders.filter(o => !o.isPriority && o.tonsRemaining > 0);

    // --- FASE A: PROCESAR PEDIDOS PRIORITARIOS PRIMERO ---
    // 1. Prioridad - Asignación local
    priorityOrders.forEach(o => {
      const cantera = (o.cantera || '').toUpperCase().trim();
      const planta = (o.planta || '').toUpperCase().trim();
      const locals = statusVehicles.filter(v =>
        !v.isPreviousAssignment &&
        v.zona_inicio === cantera &&
        (v.estado_asignacion === 'RESERVA' || v.estado_asignacion === 'LOCAL') &&
        (v.viajes_asignados === 0 || (v.cantera_trabajo === planta && v.material === o.material)) &&
        v.viajes_asignados < getVehicleMaxTrips(v, cantera, o.isPriority) &&
        canVehicleSupportCantera(v, cantera)
      );
      allocateToVehicles(locals, cantera, planta, o.material, o, false, o.isPriority);
    });

    // 2. Prioridad - Apoyo rotativo
    priorityOrders.forEach(o => {
      if (o.tonsRemaining <= 0) return;
      const cantera = (o.cantera || '').toUpperCase().trim();
      const planta = (o.planta || '').toUpperCase().trim();
      const rotators = statusVehicles.filter(v =>
        !v.isPreviousAssignment &&
        (v.rotacion_permitida || '').toUpperCase().includes(cantera) &&
        (v.estado_asignacion === 'RESERVA' || (v.estado_asignacion === 'LOCAL' && v.viajes_asignados === 0)) &&
        (v.viajes_asignados === 0 || (v.cantera_trabajo === planta && v.material === o.material)) &&
        v.viajes_asignados < getVehicleMaxTrips(v, cantera, o.isPriority) &&
        canVehicleSupportCantera(v, cantera)
      );
      allocateToVehicles(rotators, cantera, planta, o.material, o, true, o.isPriority);
    });

    // 3. Prioridad - Reserva general
    priorityOrders.forEach(o => {
      if (o.tonsRemaining <= 0) return;
      const cantera = (o.cantera || '').toUpperCase().trim();
      const planta = (o.planta || '').toUpperCase().trim();
      const reserves = statusVehicles.filter(v =>
        !v.isPreviousAssignment &&
        v.estado_asignacion === 'RESERVA' &&
        (v.viajes_asignados === 0 || (v.cantera_trabajo === planta && v.material === o.material)) &&
        v.viajes_asignados < getVehicleMaxTrips(v, cantera, o.isPriority) &&
        canVehicleSupportCantera(v, cantera)
      );
      allocateToVehicles(reserves, cantera, planta, o.material, o, true, o.isPriority);
    });

    // Trasladar cualquier tonelaje prioritario no cubierto al flujo normal
    const allRemainingOrders = [
      ...normalOrders,
      ...priorityOrders.filter(o => o.tonsRemaining > 0)
    ];

    // --- FASE B: PROCESAR PEDIDOS NORMALES ---
    // 1. Normal - Asignación local
    allRemainingOrders.forEach(o => {
      if (o.tonsRemaining <= 0) return;
      const cantera = (o.cantera || '').toUpperCase().trim();
      const planta = (o.planta || '').toUpperCase().trim();
      const locals = statusVehicles.filter(v =>
        !v.isPreviousAssignment &&
        v.zona_inicio === cantera &&
        (v.estado_asignacion === 'RESERVA' || v.estado_asignacion === 'LOCAL') &&
        (v.viajes_asignados === 0 || (v.cantera_trabajo === planta && v.material === o.material)) &&
        v.viajes_asignados < getVehicleMaxTrips(v, cantera, o.isPriority) &&
        canVehicleSupportCantera(v, cantera)
      );
      allocateToVehicles(locals, cantera, planta, o.material, o, false, o.isPriority);
    });

    // 2. Normal - Apoyo rotativo
    allRemainingOrders.forEach(o => {
      if (o.tonsRemaining <= 0) return;
      const cantera = (o.cantera || '').toUpperCase().trim();
      const planta = (o.planta || '').toUpperCase().trim();
      const rotators = statusVehicles.filter(v =>
        !v.isPreviousAssignment &&
        (v.rotacion_permitida || '').toUpperCase().includes(cantera) &&
        (v.estado_asignacion === 'RESERVA' ||
          (v.estado_asignacion === 'LOCAL' && v.viajes_asignados === 0) ||
          (v.estado_asignacion === 'TRANSFERIDO' && v.cantera_trabajo === planta)) &&
        (v.viajes_asignados === 0 || (v.cantera_trabajo === planta && v.material === o.material)) &&
        v.viajes_asignados < getVehicleMaxTrips(v, cantera, o.isPriority) &&
        canVehicleSupportCantera(v, cantera)
      );
      allocateToVehicles(rotators, cantera, planta, o.material, o, true, o.isPriority);
    });

    // 3. Normal - Reserva general
    allRemainingOrders.forEach(o => {
      if (o.tonsRemaining <= 0) return;
      const cantera = (o.cantera || '').toUpperCase().trim();
      const planta = (o.planta || '').toUpperCase().trim();
      const reserves = statusVehicles.filter(v =>
        !v.isPreviousAssignment &&
        (v.estado_asignacion === 'RESERVA' ||
          (v.estado_asignacion === 'TRANSFERIDO' && v.cantera_trabajo === planta)) &&
        (v.viajes_asignados === 0 || (v.cantera_trabajo === planta && v.material === o.material)) &&
        v.viajes_asignados < getVehicleMaxTrips(v, cantera, o.isPriority) &&
        canVehicleSupportCantera(v, cantera)
      );
      allocateToVehicles(reserves, cantera, planta, o.material, o, true, o.isPriority);
    });

    // Calcular déficits finales agrupando por la cantera original
    const finalDeficits = {};
    orders.forEach(o => {
      const cantera = (o.cantera || '').toUpperCase().trim();
      finalDeficits[cantera] = 0;
    });
    demandOrders.forEach(o => {
      const cantera = (o.cantera || '').toUpperCase().trim();
      const orderRem = allRemainingOrders.find(x => x.index === o.index) || priorityOrders.find(x => x.index === o.index);
      const rem = orderRem ? orderRem.tonsRemaining : 0;
      finalDeficits[cantera] = parseFloat((finalDeficits[cantera] + rem).toFixed(2));
    });

    // Resolver ruta probable de Jicamarca/Flor de Nieve
    statusVehicles.forEach(v => {
      const start = (v.zona_inicio || '').toUpperCase().trim();
      if (start === 'JICAMARCA' || start === 'FLOR DE NIEVE') {
        // Excepción: Si ya fue transferido a apoyar Yerbabuena/San Lorenzo por el algoritmo, respetamos esa asignación
        if (v.viajes_asignados > 0 && v.estado_asignacion === 'TRANSFERIDO') {
          return;
        }
        const s = (monitoringStates || {})[v.id];
        const rawCantera = s ? (s.assigned_cantera || s.current_origin || start) : start;
        v.cantera_trabajo = getValidQuarry(rawCantera, v.id);
        v.viajes_asignados = 1;
        v.estado_asignacion = 'LOCAL';
      }
    });

    // Coleccionar recomendaciones estáticas y pre-aplicar traslados en la asignación final
    const recommendations = [];
    statusVehicles.forEach(v => {
      if (v.viajes_asignados > 0 && v.estado_asignacion === 'TRANSFERIDO') {
        const origCan = (v.zona_inicio || '').toUpperCase().trim();
        const destCan = getCanteraForPlant(v.cantera_trabajo, orders).toUpperCase().trim();
        if (origCan !== destCan && ['YERBABUENA', 'SAN LORENZO'].includes(origCan) && ['YERBABUENA', 'SAN LORENZO'].includes(destCan)) {
          recommendations.push({
            id: v.id,
            placa: v.placa,
            tipo: v.tipo || 'Volquete',
            desde: origCan,
            hacia: destCan,
            viajes_asignados: v.viajes_asignados,
            capacidad_toneladas: v.capacidad_toneladas
          });
          // Pre-aplicar el traslado en la asignación final
          v.zona_inicio = destCan;
          v.estado_asignacion = 'LOCAL';
        }
      }
    });

    const sqlAllDrivers = `SELECT id, nombre FROM \`${datasetId}.conductores\` WHERE estado = 'activo' ORDER BY nombre ASC`;
    const allDrivers = await runQuery(sqlAllDrivers) || [];

    res.json({
      success: true,
      data: {
        assignments: statusVehicles,
        demandSummary: totalDemand,
        deficits: finalDeficits,
        recommendations: recommendations,
        drivers: allDrivers
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

// 9. ENDPOINT: Guardar planificación y aplicar pernocte dinámico
router.post('/planning/save', async (req, res) => {
  const { orders, assignments, date } = req.body;
  if (!orders || !assignments || !date) {
    return res.status(400).json({ success: false, error: 'Faltan parámetros' });
  }

  try {
    const createReqs = `
      CREATE TABLE IF NOT EXISTS \`${datasetId}.planificacion_solicitudes\` (
        id STRING,
        fecha_operacion DATE,
        cantera STRING,
        planta STRING,
        material STRING,
        volumen_m3 FLOAT64,
        toneladas_calculadas FLOAT64,
        prioridad BOOLEAN
      );
    `;
    const createAsig = `
      CREATE TABLE IF NOT EXISTS \`${datasetId}.planificacion_asignaciones\` (
        id STRING,
        fecha_operacion DATE,
        vehiculo_id STRING,
        cantera_origen STRING,
        zona_inicio STRING,
        viajes_asignados INT64,
        estado_asignacion STRING,
        material STRING
      );
    `;
    const createPlanDiaria = `
      CREATE TABLE IF NOT EXISTS \`${datasetId}.planificacion_diaria\` (
        fecha_operacion DATE,
        placa STRING,
        zona_inicio STRING,
        destino_asignado STRING,
        material STRING,
        viajes_programados INT64,
        conductor STRING,
        estado STRING
      );
    `;
    await runQuery(createReqs);
    await runQuery(createAsig);
    await runQuery(createPlanDiaria);

    const alterReqs = `ALTER TABLE \`${datasetId}.planificacion_solicitudes\` ADD COLUMN IF NOT EXISTS prioridad BOOLEAN;`;
    const alterAsig = `ALTER TABLE \`${datasetId}.planificacion_asignaciones\` ADD COLUMN IF NOT EXISTS material STRING;`;
    await runQuery(alterReqs);
    await runQuery(alterAsig);

    // Borrado y guardado de solicitudes
    if (orders.length > 0) {
      const deleteConditions = orders.map(o => {
        return `(UPPER(TRIM(cantera)) = '${o.cantera.toUpperCase().trim()}' AND UPPER(TRIM(planta)) = '${o.planta.toUpperCase().trim()}' AND UPPER(TRIM(material)) = '${o.material.toUpperCase().trim()}')`;
      }).join(' OR ');
      const delReqs = `DELETE FROM \`${datasetId}.planificacion_solicitudes\` WHERE fecha_operacion = DATE('${date}') AND (${deleteConditions});`;
      await runQuery(delReqs);

      const valParts = orders.map((o, idx) => {
        const tons = parseFloat((o.volumen_m3 * 1.55).toFixed(2));
        const prio = !!o.prioridad;
        const uniqueId = `${date}_${o.cantera.toUpperCase().trim()}_${o.planta.toUpperCase().trim()}_${o.material.toUpperCase().trim()}`;
        return `('${uniqueId}', DATE('${date}'), '${o.cantera}', '${o.planta}', '${o.material}', ${o.volumen_m3}, ${tons}, ${prio})`;
      }).join(', ');

      const insReqs = `
        INSERT INTO \`${datasetId}.planificacion_solicitudes\` (id, fecha_operacion, cantera, planta, material, volumen_m3, toneladas_calculadas, prioridad)
        VALUES ${valParts};
      `;
      await runQuery(insReqs);
    }

    if (assignments.length > 0) {
      // 1. Borrar asignaciones existentes de planificacion_asignaciones para hoy
      const delAsig = `DELETE FROM \`${datasetId}.planificacion_asignaciones\` WHERE fecha_operacion = DATE('${date}');`;
      await runQuery(delAsig);

      // 2. Borrar planificacion_diaria de hoy
      const delPlanDiaria = `DELETE FROM \`${datasetId}.planificacion_diaria\` WHERE fecha_operacion = DATE('${date}');`;
      await runQuery(delPlanDiaria);

      // Invalida caché diaria en kpi_metrics_daily
      const delKpiDaily = `DELETE FROM \`${datasetId}.kpi_metrics_daily\` WHERE fecha = DATE('${date}');`;
      await runQuery(delKpiDaily);

      // 3. Insertar fletes activos en planificacion_asignaciones
      const activeAssignments = assignments.filter(a => (a.viajes_asignados || 0) > 0 && a.id);
      if (activeAssignments.length > 0) {
        const valParts = activeAssignments.map((a, idx) => {
          return `('${date}_as_${a.id}', DATE('${date}'), '${a.id}', '${a.cantera_trabajo || ''}', '${a.zona_inicio}', ${a.viajes_asignados}, '${a.estado_asignacion}', '${a.material || ''}')`;
        }).join(', ');

        const insAsig = `
          INSERT INTO \`${datasetId}.planificacion_asignaciones\` (id, fecha_operacion, vehiculo_id, cantera_origen, zona_inicio, viajes_asignados, estado_asignacion, material)
          VALUES ${valParts};
        `;
        await runQuery(insAsig);
      }

      // 4. Insertar fletes activos de Yerbabuena y San Lorenzo en planificacion_diaria
      const activeDiaria = assignments.filter(a => (a.viajes_asignados || 0) > 0 && a.id && ['YERBABUENA', 'SAN LORENZO'].includes((a.zona_inicio || '').toUpperCase().trim()));
      if (activeDiaria.length > 0) {
        const diariaParts = activeDiaria.map(a => {
          const driver = (a.conductor_nombre && a.conductor_nombre !== 'Por Asignar') ? a.conductor_nombre : '-';
          return `(DATE('${date}'), '${a.placa}', '${a.zona_inicio}', '${a.cantera_trabajo || ''}', '${a.material || ''}', ${a.viajes_asignados}, '${driver}', 'EN PROGRESO')`;
        }).join(', ');

        const insDiaria = `
          INSERT INTO \`${datasetId}.planificacion_diaria\` (fecha_operacion, placa, zona_inicio, destino_asignado, material, viajes_programados, conductor, estado)
          VALUES ${diariaParts};
        `;
        await runQuery(insDiaria);
      }

      // 5. Actualizar pernocte
      const updateParts = assignments
        .filter(a => a.estado_asignacion !== 'RESERVA' && a.cantera_trabajo)
        .map(a => `SELECT '${a.id}' AS v_id, '${a.cantera_trabajo}' AS new_za`);

      if (updateParts.length > 0) {
        const unionSql = updateParts.join(' UNION ALL ');
        const updateSql = `
          UPDATE \`${datasetId}.vehiculos\` v
          SET zona_actual = t.new_za
          FROM (${unionSql}) t
          WHERE v.id = t.v_id;
        `;
        await runQuery(updateSql);
      }
    }

    // Reconstruir los estados de monitoreo en memoria de inmediato para que sincronicen con el nuevo plan
    try {
      const { rebuildTodayMonitoringStates } = await import('../services/gpsIngestor.js');
      await rebuildTodayMonitoringStates();
    } catch (rebuildErr) {
      console.error('[Planning Save] Error al reconstruir estados de monitoreo:', rebuildErr.message);
    }

    res.json({ success: true, message: 'Planificación guardada y pernocte de flota actualizado con éxito.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. ENDPOINT: Cierre de día - Cerrar plan diario y consolidar viajes históricos
router.post('/planning/close-day', async (req, res) => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ success: false, error: 'Falta la fecha date' });
  }

  try {
    // 1. Cargar datos maestros para mapear IDs
    const dbVehicles = await runQuery(`SELECT id, placa FROM \`${datasetId}.vehiculos\``) || [];
    const dbLocations = await runQuery(`SELECT id, nombre FROM \`${datasetId}.ubicaciones\``) || [];
    const dbMaterials = await runQuery(`SELECT id, nombre FROM \`${datasetId}.materiales\``) || [];
    const dbClients = await runQuery(`SELECT id, nombre FROM \`${datasetId}.clientes\``) || [];
    const dbConductors = await runQuery(`SELECT id, nombre FROM \`${datasetId}.conductores\``) || [];

    // Helpers de mapeo
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

    // Obtener Max ID de viajes para autoincrementar
    const maxTripRows = await runQuery(`SELECT MAX(id) as max_id FROM \`${datasetId}.VIAJES\``) || [{ max_id: 1000 }];
    let nextTripId = (maxTripRows[0] && maxTripRows[0].max_id ? parseInt(maxTripRows[0].max_id) : 1000) + 1;

    // 2. Leer registros de planificacion_diaria para la fecha dada
    const dailyRows = await runQuery(`
      SELECT placa, zona_inicio, destino_asignado, material, viajes_programados, conductor, estado
      FROM \`${datasetId}.planificacion_diaria\`
      WHERE fecha_operacion = DATE('${date}')
    `) || [];

    if (dailyRows.length === 0) {
      return res.json({ success: true, message: 'No hay planificaciones diarias registradas para cerrar en esta fecha.' });
    }

    const tripsToInsert = [];

    for (const row of dailyRows) {
      const startZone = (row.zona_inicio || '').toUpperCase().trim();
      const isJicaOrFlor = (startZone === 'JICAMARCA' || startZone === 'FLOR DE NIEVE');
      const vehId = getVehId(row.placa);

      let count = 0;
      if (isJicaOrFlor) {
        // Para Jicamarca y Flor de Nieve, cada fila es un viaje ya registrado por GPS
        count = 1;
      } else {
        // Para Yerbabuena y San Lorenzo, contamos los viajes reales completados desde la tabla viajes_detectados en BigQuery
        const detectedRows = await runQuery(`
          SELECT COUNT(*) as cnt 
          FROM \`${datasetId}.viajes_detectados\` 
          WHERE placa = '${row.placa}' AND fecha_operacion = DATE('${date}')
        `) || [{ cnt: 0 }];
        count = detectedRows[0] && detectedRows[0].cnt ? parseInt(detectedRows[0].cnt) : 0;
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
          fecha: `${date} 18:00:00`,
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
        return `(${t.id}, '${t.vehiculo_id}', '${t.vehiculo_des}', '${t.cliente_id}', '${t.cliente_des}', '${t.material_id}', '${t.material_des}', '${t.conductor_id}', '${t.conductor_des}', TIMESTAMP('${t.fecha}'), '${t.origen}', '${t.origen_des}', '${t.destino}', '${t.destino_des}', NULL, '${t.guia_transportista}', ${t.toneladas}, ${t.toneladas}, ${t.flete}, ${t.gasto})`;
      }).join(', ');

      const insQuery = `
        INSERT INTO \`${datasetId}.viajes\` 
          (id, vehiculo_id, vehiculo_des, cliente_id, cliente_des, material_id, material_des, conductor_id, conductor_des, fecha, origen, origen_des, destino, destino_des, nro_liquidacion, nro_guia, peso_seco, peso_humedo, monto_total, gastos)
        VALUES ${values}
      `;
      await runQuery(insQuery);
      console.log(`[GPS Ingestor] Consolidados ${tripsToInsert.length} viajes del día en la tabla histórica viajes.`);
    }

    // 3. Limpiar planificacion_diaria para hoy
    await runQuery(`DELETE FROM \`${datasetId}.planificacion_diaria\` WHERE fecha_operacion = DATE('${date}')`);

    // 4. Limpiar viajes_detectados para hoy
    try {
      await runQuery(`DELETE FROM \`${datasetId}.viajes_detectados\` WHERE fecha_operacion = DATE('${date}')`);
    } catch (delErr) {
      console.warn('[Close Day] No se pudo limpiar la tabla viajes_detectados:', delErr.message);
    }

    // Notificar Cierre de Día por Telegram
    import('../services/telegramNotifier.js').then(notifier => {
      const msg = `📊 <b>Cierre de Día Completado</b>\n\nSe ha ejecutado el cierre de la jornada de forma exitosa para la fecha <b>${date}</b>.\n🏁 Se consolidaron un total de <b>${tripsToInsert.length} viajes</b> en el historial operativo.`;
      notifier.sendTelegramAlert(msg);
    }).catch(err => {
      console.error('[Close Day] Error enviando notificación de cierre a Telegram:', err.message);
    });

    res.json({ success: true, message: `Día cerrado correctamente. Se consolidaron ${tripsToInsert.length} viajes en el historial.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Endpoint: Obtener el estado del monitoreo de viajes en tiempo real
router.get('/monitoring/status', async (req, res) => {
  const date = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  try {
    let dayStates = {};
    if (date === todayStr) {
      dayStates = monitoringStates;
    } else {
      dayStates = await rebuildMonitoringFromHistory(date);
    }

    // Cargar solicitudes/pedidos del día para calcular viajes programados por ruta
    const sqlRequests = `
      SELECT cantera, planta, volumen_m3
      FROM \`${datasetId}.planificacion_solicitudes\`
      WHERE fecha_operacion = DATE('${date}');
    `;
    const dbRequests = await runQuery(sqlRequests) || [];

    // Cargar destinos asignados de la planificación del día
    const sqlPlan = `
      SELECT UPPER(TRIM(placa)) as placa, destino_asignado
      FROM \`${datasetId}.planificacion_diaria\`
      WHERE fecha_operacion = DATE('${date}')
        AND viajes_programados > 0;
    `;
    const dbPlan = await runQuery(sqlPlan) || [];

    // Calcular viajes programados estimando que un viaje transporta 31 m3 promedio (capacidad típica de remolcador)
    const getPlannedTrips = (cantera, planta) => {
      const matchOrders = dbRequests.filter(r => {
        const cMatch = (r.cantera || '').toUpperCase().trim() === cantera.toUpperCase();
        const pMatch = planta === 'ALL' || (r.planta || '').toUpperCase().trim() === planta.toUpperCase();
        return cMatch && pMatch;
      });
      const totalVol = matchOrders.reduce((sum, r) => sum + (parseFloat(r.volumen_m3) || 0), 0);
      return totalVol > 0 ? Math.ceil(totalVol / 31.0) : 0;
    };

    // Calcular viajes realizados por ruta sumando la inferencia de viajes realizados de cada vehículo en esa ruta
    let slMeiggsReal = 0;
    let slColliqueReal = 0;
    let slMaterialesReal = 0;
    let slOquendoReal = 0;
    let ybMeiggsReal = 0;

    // Mapear vehículos y sumar viajes por ruta
    const vehicles = Object.keys(dayStates).map(vid => {
      const ds = dayStates[vid];
      const lp = livePositions.find(p => p.vehiculo_id === vid);

      // Obtener placa limpia (ej. BCI734 de VE-01 (BCI734))
      let plateClean = vid;
      if (lp && lp.placa) {
        const match = lp.placa.match(/\(([^)]+)\)/);
        plateClean = match ? match[1] : lp.placa;
      } else {
        const match = vid.match(/\(([^)]+)\)/);
        plateClean = match ? match[1] : vid;
      }

      // Buscar planificación para esta placa
      const cleanPlateForMatch = plateClean.toUpperCase().replace(/[-\s]/g, '');
      const planRow = dbPlan.find(p => {
        const pPlate = (p.placa || '').toUpperCase().replace(/[-\s]/g, '');
        return pPlate === cleanPlateForMatch;
      });
      const destinoAsignado = planRow ? planRow.destino_asignado : '-';

      const tbr = ds.trips_by_route || {};
      const origin = (ds.assigned_cantera || ds.current_origin || '').toUpperCase().trim();

      for (const dest in tbr) {
        const count = tbr[dest] || 0;
        const d = dest.toUpperCase().trim();
        if (origin === 'SAN LORENZO') {
          if (d === 'MEIGGS') slMeiggsReal += count;
          else if (d === 'COLLIQUE') slColliqueReal += count;
          else if (d === 'MATERIALES') slMaterialesReal += count;
          else if (d === 'OQUENDO') slOquendoReal += count;
        } else if (origin === 'YERBABUENA') {
          ybMeiggsReal += count;
        }
      }

      return {
        vehiculo_id: vid,
        placa: plateClean,
        viajes_programados: ds.trips_planned,
        viajes_realizados: ds.trips_completed,
        destino_probable: ds.probable_destination,
        destino_probable_percent: ds.probable_destination_percent,
        destino_asignado: destinoAsignado,
        estado: ds.state,
        cantera_origen: origin,
        lat: lp ? lp.lat : (ds.state === 'Carga en cantera' && lp ? lp.lat : -12.04637),
        lng: lp ? lp.lng : (ds.state === 'Carga en cantera' && lp ? lp.lng : -77.04279),
        velocidad: lp ? lp.velocidad : 0,
        angle: lp ? lp.angle : 0
      };
    });

    // Consolidar progreso de las 5 rutas
    const routesProgress = [
      { id: 'sl_meiggs', label: 'San Lorenzo a Meiggs', realizados: slMeiggsReal, programados: getPlannedTrips('SAN LORENZO', 'MEIGGS') },
      { id: 'sl_collique', label: 'San Lorenzo a Collique', realizados: slColliqueReal, programados: getPlannedTrips('SAN LORENZO', 'COLLIQUE') },
      { id: 'sl_materiales', label: 'San Lorenzo a Materiales', realizados: slMaterialesReal, programados: getPlannedTrips('SAN LORENZO', 'MATERIALES') },
      { id: 'sl_oquendo', label: 'San Lorenzo a Oquendo', realizados: slOquendoReal, programados: getPlannedTrips('SAN LORENZO', 'OQUENDO') },
      { id: 'yb_meiggs', label: 'Yerbabuena a Meiggs', realizados: ybMeiggsReal, programados: getPlannedTrips('YERBABUENA', 'ALL') }
    ];

    res.json({
      success: true,
      data: {
        date,
        vehicles,
        routes_progress: routesProgress
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/viajes (Historial de viajes completados)
router.get('/viajes', async (req, res) => {
  const { date, placa, conductor, origen, limit = 150 } = req.query;

  try {
    let whereConditions = [];
    if (date) {
      whereConditions.push(`DATE(fecha, 'America/Lima') = DATE('${date}')`);
    }
    if (placa && placa.trim() !== '' && placa !== 'Todos') {
      whereConditions.push(`(UPPER(vehiculo_des) = '${placa.toUpperCase().trim()}' OR UPPER(vehiculo_id) = '${placa.toUpperCase().trim()}')`);
    }
    if (conductor && conductor.trim() !== '' && conductor !== 'Todos') {
      whereConditions.push(`UPPER(conductor_des) = '${conductor.toUpperCase().trim()}'`);
    }
    if (origen && origen.trim() !== '' && origen !== 'Todos') {
      whereConditions.push(`UPPER(origen_des) = '${origen.toUpperCase().trim()}'`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const sql = `
      SELECT 
        id, 
        vehiculo_id, 
        vehiculo_des AS placa, 
        conductor_des AS conductor, 
        fecha, 
        origen_des AS origen, 
        destino_des AS destino, 
        material_des AS material,
        nro_guia, 
        peso_seco AS toneladas, 
        monto_total AS flete, 
        gastos AS gasto
      FROM \`${datasetId}.viajes\`
      ${whereClause}
      ORDER BY fecha DESC
      LIMIT ${parseInt(limit)};
    `;

    const data = await runQuery(sql) || [];
    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/viajes/filters (Obtener listas distintas de placas, conductores y orígenes para los filtros)
router.get('/viajes/filters', async (req, res) => {
  try {
    const sql = `
      SELECT 
        (SELECT ARRAY_AGG(DISTINCT vehiculo_des IGNORE NULLS) FROM \`${datasetId}.viajes\` WHERE vehiculo_des != '') AS placas,
        (SELECT ARRAY_AGG(DISTINCT conductor_des IGNORE NULLS) FROM \`${datasetId}.viajes\` WHERE conductor_des != '') AS conductores,
        (SELECT ARRAY_AGG(DISTINCT origen_des IGNORE NULLS) FROM \`${datasetId}.viajes\` WHERE origen_des != '') AS origenes
    `;
    const rows = await runQuery(sql) || [];
    const result = rows[0] || {};
    
    const placas = (result.placas || []).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const conductores = (result.conductores || []).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const origenes = (result.origenes || []).filter(Boolean).sort((a, b) => a.localeCompare(b));

    res.json({
      success: true,
      data: { placas, conductores, origenes }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/planning/update-trips (Modificar o eliminar viajes programados para hoy)
router.post('/planning/update-trips', async (req, res) => {
  const { vehiculo_id, viajes_programados } = req.body;
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  try {
    const planned = parseInt(viajes_programados);
    if (isNaN(planned) || planned < 0) {
      return res.status(400).json({ success: false, error: 'Cantidad de viajes inválida' });
    }

    if (planned === 0) {
      // Eliminar asignación del plan para hoy
      const delAsig = `DELETE FROM \`${datasetId}.planificacion_asignaciones\` WHERE fecha_operacion = DATE('${todayStr}') AND vehiculo_id = '${vehiculo_id}';`;
      await runQuery(delAsig);

      // Obtener placa para limpiar de planificacion_diaria
      const plateQuery = `SELECT placa FROM \`${datasetId}.vehiculos\` WHERE id = '${vehiculo_id}';`;
      const plateRows = await runQuery(plateQuery) || [];
      if (plateRows.length > 0) {
        const placa = plateRows[0].placa;
        const delDiaria = `DELETE FROM \`${datasetId}.planificacion_diaria\` WHERE fecha_operacion = DATE('${todayStr}') AND placa = '${placa}';`;
        await runQuery(delDiaria);
      }
    } else {
      // Actualizar viajes_asignados en planificacion_asignaciones
      const updateAsig = `
        UPDATE \`${datasetId}.planificacion_asignaciones\`
        SET viajes_asignados = ${planned}
        WHERE fecha_operacion = DATE('${todayStr}') AND vehiculo_id = '${vehiculo_id}';
      `;
      await runQuery(updateAsig);

      // Obtener placa para actualizar en planificacion_diaria
      const plateQuery = `SELECT placa FROM \`${datasetId}.vehiculos\` WHERE id = '${vehiculo_id}';`;
      const plateRows = await runQuery(plateQuery) || [];
      if (plateRows.length > 0) {
        const placa = plateRows[0].placa;
        const updateDiaria = `
          UPDATE \`${datasetId}.planificacion_diaria\`
          SET viajes_programados = ${planned}
          WHERE fecha_operacion = DATE('${todayStr}') AND placa = '${placa}';
        `;
        await runQuery(updateDiaria);
      }
    }

    // Reconstruir estados en el ingestor de GPS en tiempo real para reflejar cambios de inmediato
    try {
      const { rebuildTodayMonitoringStates } = await import('../services/gpsIngestor.js');
      await rebuildTodayMonitoringStates();
    } catch (e) {
      console.warn('[GPS Ingestor] No se pudo reconstruir estados tras modificar viajes:', e.message);
    }

    res.json({ success: true, message: 'Planificación actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/fuel/alerts
router.get('/fuel/alerts', async (req, res) => {
  const { placa, mes, limit } = req.query;

  try {
    let whereConditions = [];
    const queryOptions = { params: {} };

    // Solo permitir ver datos a partir de Mayo 2026 (post-entrenamiento)
    whereConditions.push("DATE(fecha_fin) >= DATE('2026-05-01')");

    if (placa && placa !== 'Todos') {
      whereConditions.push('placa = @placa');
      queryOptions.params.placa = placa;
    }

    if (mes && mes !== 'Todos') {
      whereConditions.push("FORMAT_DATE('%Y-%m', fecha_fin) = @mes");
      queryOptions.params.mes = mes;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    if (Object.keys(queryOptions.params).length === 0) {
      delete queryOptions.params;
    }

    // 1. Query general stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNTIF(estado_alerta = 'Critico') as critical_count,
        COUNTIF(estado_alerta = 'Advertencia') as warning_count,
        COUNT(DISTINCT IF(estado_alerta = 'Critico', vehiculo_id, NULL)) as critical_vehicles_count,
        ROUND(SUM(consumo_real), 2) as total_real_fuel,
        ROUND(SUM(consumo_esperado), 2) as total_expected_fuel,
        ROUND(SUM(monto_despachado), 2) as total_cost,
        ROUND(AVG(desviacion_porcentaje), 2) as avg_deviation_pct,
        ROUND(SUM(IF(UPPER(tipo_combustible) = 'DIESEL', consumo_real, 0.0)), 2) as diesel_real,
        ROUND(SUM(IF(UPPER(tipo_combustible) = 'DIESEL', consumo_esperado, 0.0)), 2) as diesel_expected,
        ROUND(SUM(IF(UPPER(tipo_combustible) = 'GNV', consumo_real, 0.0)), 2) as gnv_real,
        ROUND(SUM(IF(UPPER(tipo_combustible) = 'GNV', consumo_esperado, 0.0)), 2) as gnv_expected,
        ROUND(AVG(IF(UPPER(tipo_combustible) = 'DIESEL', desviacion_porcentaje, NULL)), 2) as diesel_avg_dev,
        ROUND(AVG(IF(UPPER(tipo_combustible) = 'GNV', desviacion_porcentaje, NULL)), 2) as gnv_avg_dev
      FROM \`project-silvia-500416.silvia_dataset.fuel_anomalies\`
      ${whereClause}
    `;

    const [statsRows] = await bigquery.query({
      query: statsQuery,
      ...queryOptions
    });

    const stats = statsRows[0] || {};

    // 2. Query distribution of probable causes
    const causeQuery = `
      SELECT 
        causa_probable, 
        COUNT(*) as total_count,
        COUNTIF(estado_alerta = 'Critico') as critical_count,
        COUNTIF(estado_alerta = 'Advertencia') as warning_count
      FROM \`project-silvia-500416.silvia_dataset.fuel_anomalies\`
      ${whereClause}
      GROUP BY causa_probable
      ORDER BY total_count DESC
    `;

    const [causeRows] = await bigquery.query({
      query: causeQuery,
      ...queryOptions
    });

    // 3. Query ranking of top 5 vehicles with most alerts (Critico + Advertencia)
    const rankingQuery = `
      SELECT 
        placa, 
        COUNTIF(estado_alerta IN ('Critico', 'Advertencia')) as alert_count,
        COUNTIF(estado_alerta = 'Critico') as critical_count,
        COUNTIF(estado_alerta = 'Advertencia') as warning_count
      FROM \`project-silvia-500416.silvia_dataset.fuel_anomalies\`
      ${whereClause}
      GROUP BY placa
      ORDER BY alert_count DESC
      LIMIT 5
    `;

    const [rankingRows] = await bigquery.query({
      query: rankingQuery,
      ...queryOptions
    });

    // 4. Query doughnut distribution of vehicles by fuel type
    const fuelTypeQuery = `
      SELECT tipo_combustible, COUNT(DISTINCT vehiculo_id) as vehicle_count
      FROM \`project-silvia-500416.silvia_dataset.fuel_anomalies\`
      ${whereClause}
      GROUP BY tipo_combustible
    `;

    const [fuelTypeRows] = await bigquery.query({
      query: fuelTypeQuery,
      ...queryOptions
    });

    // 5. Query list of latest anomalies
    const limitNum = parseInt(limit) || 100;
    const listQuery = `
      SELECT 
        vehiculo_id, placa, marca, modelo, 
        FORMAT_DATE('%Y-%m-%d', fecha_inicio) as fecha_inicio,
        FORMAT_DATE('%Y-%m-%d', fecha_fin) as fecha_fin,
        dias_intervalo, viajes_realizados, peso_transportado_ton,
        ROUND(distancia_km, 2) as distancia_km,
        ROUND(velocidad_promedio, 2) as velocidad_promedio,
        excesos_velocidad,
        ROUND(consumo_real, 2) as consumo_real,
        ROUND(consumo_esperado, 2) as consumo_esperado,
        ROUND(desviacion_porcentaje, 2) as desviacion_porcentaje,
        ROUND(z_score, 2) as z_score,
        estado_alerta, causa_probable,
        tipo_combustible
      FROM \`project-silvia-500416.silvia_dataset.fuel_anomalies\`
      ${whereClause}
      ORDER BY fecha_fin DESC, z_score DESC
      LIMIT ${limitNum}
    `;

    const [listRows] = await bigquery.query({
      query: listQuery,
      ...queryOptions
    });

    res.json({
      success: true,
      data: {
        stats: {
          total_records: parseInt(stats.total_records) || 0,
          critical_count: parseInt(stats.critical_count) || 0,
          warning_count: parseInt(stats.warning_count) || 0,
          critical_vehicles_count: parseInt(stats.critical_vehicles_count) || 0,
          total_real_fuel: parseFloat(stats.total_real_fuel) || 0,
          total_expected_fuel: parseFloat(stats.total_expected_fuel) || 0,
          total_cost: parseFloat(stats.total_cost) || 0,
          avg_deviation_pct: parseFloat(stats.avg_deviation_pct) || 0,
          diesel_real: parseFloat(stats.diesel_real) || 0,
          diesel_expected: parseFloat(stats.diesel_expected) || 0,
          gnv_real: parseFloat(stats.gnv_real) || 0,
          gnv_expected: parseFloat(stats.gnv_expected) || 0,
          diesel_avg_dev: parseFloat(stats.diesel_avg_dev) || 0,
          gnv_avg_dev: parseFloat(stats.gnv_avg_dev) || 0
        },
        causes: causeRows.map(r => ({
          causa: r.causa_probable,
          cantidad: parseInt(r.total_count) || 0,
          critical_count: parseInt(r.critical_count) || 0,
          warning_count: parseInt(r.warning_count) || 0
        })),
        ranking: rankingRows.map(r => ({
          placa: r.placa,
          cantidad: parseInt(r.alert_count) || 0,
          critical_count: parseInt(r.critical_count) || 0,
          warning_count: parseInt(r.warning_count) || 0
        })),
        fuel_types: fuelTypeRows.map(r => ({
          tipo: r.tipo_combustible,
          cantidad: parseInt(r.vehicle_count) || 0
        })),
        alerts: listRows
      }
    });

  } catch (err) {
    console.error('Error fetching fuel alerts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to explain vehicle loss or fuel anomalies
async function explainVehicleLossOrFuel(placa, targetPeriod) {
  // 1. Obtener ID del vehículo
  const sqlVeh = `SELECT id, placa FROM \`silvia_dataset.vehiculos\` WHERE placa = '${placa}' LIMIT 1;`;
  const resVeh = await runQuery(sqlVeh);
  if (!resVeh || resVeh.length === 0) {
    return {
      textResponse: `No encontré ningún vehículo con la placa **${placa}** en los registros.`,
      extraData: {}
    };
  }
  const veh = resVeh[0];
  const vehiculoId = veh.id;

  // 2. Obtener métricas mensuales
  const sqlMetrics = `
    SELECT 
      m.facturacion,
      m.gastos,
      m.combustible_monto,
      m.combustible_galones,
      m.gnv_monto,
      m.gnv_m3,
      m.peajes_monto,
      m.viajes_realizados
    FROM \`silvia_dataset.kpi_metrics_monthly\` m
    WHERE m.vehiculo_id = '${vehiculoId}' AND m.periodo = '${targetPeriod}';
  `;
  const resMetrics = await runQuery(sqlMetrics);
  if (!resMetrics || resMetrics.length === 0) {
    return {
      textResponse: `No encontré métricas mensuales registradas para el vehículo **${placa}** en el periodo **${targetPeriod}**.`,
      extraData: {}
    };
  }
  const m = resMetrics[0];

  // Calcular ganancia neta
  const facturacion = m.facturacion || 0;
  const gastos = m.gastos || 0;
  const combustible = m.combustible_monto || 0;
  const gnv = m.gnv_monto || 0;
  const peajes = m.peajes_monto || 0;
  const viajes = m.viajes_realizados || 0;

  const ganancia = facturacion - gastos - combustible - gnv - peajes;

  // 3. Obtener alertas de combustible
  const sqlAnom = `
    SELECT 
      COUNTIF(estado_alerta = 'Critico') as alertas,
      SUM(CASE WHEN estado_alerta = 'Critico' THEN (consumo_real - consumo_esperado) ELSE 0.0 END) as exceso
    FROM \`silvia_dataset.fuel_anomalies\`
    WHERE vehiculo_id = '${vehiculoId}' AND FORMAT_TIMESTAMP('%Y-%m', fecha_fin) = '${targetPeriod}';
  `;
  const resAnom = await runQuery(sqlAnom);
  const anom = resAnom && resAnom[0] ? resAnom[0] : { alertas: 0, exceso: 0 };

  const numAlertas = anom.alertas || 0;
  const excesoComb = anom.exceso || 0;

  const nombreMeses = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
    '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };
  const mesLabel = nombreMeses[targetPeriod.split('-')[1]] || targetPeriod;

  let textResponse = `Análisis financiero para el vehículo **${placa}** en **${mesLabel} de 2026**:\n\n`;
  if (ganancia < 0) {
    textResponse += `• **Pérdida Neta**: S/. ${Math.abs(Math.round(ganancia)).toLocaleString()}\n`;
  } else {
    textResponse += `• **Ganancia Neta**: S/. ${Math.round(ganancia).toLocaleString()}\n`;
  }
  textResponse += `• **Viajes Realizados**: ${viajes} viajes.\n`;
  textResponse += `• **Ingresos (Facturación)**: S/. ${Math.round(facturacion).toLocaleString()}.\n`;
  textResponse += `• **Gasto en Combustible**: S/. ${Math.round(combustible + gnv).toLocaleString()}`;
  if (m.combustible_galones > 0) textResponse += ` (${Math.round(m.combustible_galones)} gal Diesel)`;
  if (m.gnv_m3 > 0) textResponse += ` (${Math.round(m.gnv_m3)} m³ GNV)`;
  textResponse += `.\n`;
  textResponse += `• **Gasto en Peajes**: S/. ${Math.round(peajes).toLocaleString()}.\n`;
  textResponse += `• **Alertas de Consumo**: ${numAlertas} alertas críticas detectadas por el modelo de ML`;
  if (excesoComb > 0) textResponse += `, con un sobreconsumo estimado de ${Math.round(excesoComb)} gal/m³`;
  textResponse += `.\n\n`;

  let causaPerdida = '';
  if (ganancia < 0) {
    causaPerdida += `**Causa principal de la pérdida**:\n`;
    if (facturacion < (combustible + gnv + peajes)) {
      causaPerdida += `1. **Bajos ingresos facturados**: A pesar de realizar **${viajes} viajes**, la facturación registrada fue de solo **S/. ${Math.round(facturacion).toLocaleString()}** (un promedio de flete de S/. ${viajes > 0 ? (facturacion / viajes).toFixed(2) : 0} por viaje). Esto indica que una gran parte de los viajes no cuenta con guía de remisión física liquidada, o corresponde a traslados internos no facturables.\n`;
    }
    if (numAlertas > 0) {
      causaPerdida += `2. **Desperdicio de combustible**: Se identificaron ${numAlertas} anomalías de consumo. El combustible representó el **${facturacion > 0 ? Math.round(((combustible + gnv) / facturacion) * 100) : '>100'}%** de la facturación, cuando la meta operativa para este tipo de vehículo es menor al 45%.\n`;
    }
  } else {
    causaPerdida += `El vehículo operó de manera rentable en este mes, logrando cubrir sus costos de combustible y peajes con la facturación liquidada.\n`;
  }

  textResponse += causaPerdida;

  return {
    textResponse,
    extraData: {
      placa: placa,
      periodo: targetPeriod,
      mes: mesLabel,
      viajes_realizados: viajes,
      facturacion: facturacion,
      combustible_monto: combustible + gnv,
      peajes_monto: peajes,
      ganancia: ganancia,
      anomalias_alertas: numAlertas,
      sobreconsumo_exceso: excesoComb,
      causa_perdida: causaPerdida,
      explicacion: textResponse
    }
  };
}

// POST /api/agent/webhook (Fulfillment para Gemini Enterprise Agent Platform / Dialogflow CX)
router.post('/agent/webhook', async (req, res) => {
  const body = req.body || {};
  const tag = body.fulfillmentInfo?.tag || body.intentInfo?.displayName || '';
  const parameters = body.sessionInfo?.parameters || body.intentInfo?.parameters || {};

  console.log(`[Gemini Webhook] Recibida petición con tag/intent: "${tag}"`);
  console.log(`[Gemini Webhook] Body:`, JSON.stringify(body));
  console.log(`[Gemini Webhook] Query:`, JSON.stringify(req.query));
  console.log(`[Gemini Webhook] Headers:`, JSON.stringify(req.headers));

  let textResponse = '';
  let customPayload = null;
  let extraData = {};

  try {
    // 1. Extraer Placa y Periodo si están presentes
    let placaParam = '';
    if (parameters.placa) {
      placaParam = typeof parameters.placa === 'object'
        ? (parameters.placa.value || parameters.placa.originalValue || '')
        : parameters.placa;
    }
    placaParam = String(placaParam).toUpperCase().trim();

    let targetPeriod = '2026-07'; // Por defecto
    let inputMes = parameters.mes || parameters.periodo || parameters.date || parameters.date_time || '';
    if (typeof inputMes === 'object') {
      const year = inputMes.year || 2026;
      const month = inputMes.month ? String(inputMes.month).padStart(2, '0') : '07';
      targetPeriod = `${year}-${month}`;
    } else if (typeof inputMes === 'string' && inputMes) {
      if (inputMes.includes('-')) {
        targetPeriod = inputMes.substring(0, 7); // YYYY-MM
      } else {
        const meses = {
          enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
          julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
        };
        const lower = inputMes.toLowerCase().trim();
        for (const name in meses) {
          if (lower.includes(name)) {
            targetPeriod = `2026-${meses[name]}`;
            break;
          }
        }
      }
    }

    if (tag === 'execute_sql' || parameters.query || parameters.sql || body.query || body.sql) {
      const sqlQuery = parameters.query || parameters.sql || body.query || body.sql || '';
      console.log(`[Gemini Webhook] SQL Query a ejecutar: "${sqlQuery}"`);

      if (!sqlQuery) {
        return res.status(400).json({ error: 'No se proporcionó ninguna consulta SQL.' });
      }

      const upperQuery = sqlQuery.toUpperCase().trim();
      if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
        return res.status(403).json({ error: 'Error de seguridad: Solo se permiten consultas de lectura (SELECT / WITH).' });
      }

      try {
        // Normalizar filtros de fecha YYYY-MM-DD a YYYY-MM para la columna periodo
        let cleanSqlQuery = sqlQuery.replace(/(periodo\s*(?:=|(?:LIKE)|(?:IN\s*\())\s*['"])(\d{4})-(\d{2})-(\d{2})(['"])/gi, "$1$2-$3$5");
        
        // Si la consulta intenta seleccionar placa de kpi_metrics_monthly o kpi_metrics_daily sin un JOIN
        const upperClean = cleanSqlQuery.toUpperCase();
        if (upperClean.includes('KPI_METRICS_') && upperClean.includes('PLACA') && !upperClean.includes('JOIN')) {
          console.log('[Gemini Webhook] SQL Query requiere traducción automática para asociar la placa...');
          if (upperClean.includes('KPI_METRICS_MONTHLY')) {
            cleanSqlQuery = cleanSqlQuery
              .replace(/FROM\s+silvia_dataset\.kpi_metrics_monthly\b(\s+(?!WHERE|JOIN|GROUP|ORDER|LIMIT|ON|SELECT)[a-zA-Z0-9_]+)?/gi, "FROM silvia_dataset.kpi_metrics_monthly m JOIN silvia_dataset.vehiculos v ON m.vehiculo_id = v.id")
              .replace(/\bplaca\b/gi, "v.placa")
              .replace(/\bfacturacion\b/gi, "m.facturacion")
              .replace(/\bgastos\b/gi, "m.gastos")
              .replace(/\bcombustible_monto\b/gi, "m.combustible_monto")
              .replace(/\bgnv_monto\b/gi, "m.gnv_monto")
              .replace(/\bpeajes_monto\b/gi, "m.peajes_monto")
              .replace(/\bperiodo\b/gi, "m.periodo")
              .replace(/\butilidad_neta\b/gi, "utilidad_neta");
          } else if (upperClean.includes('KPI_METRICS_DAILY')) {
            cleanSqlQuery = cleanSqlQuery
              .replace(/FROM\s+silvia_dataset\.kpi_metrics_daily\b(\s+(?!WHERE|JOIN|GROUP|ORDER|LIMIT|ON|SELECT)[a-zA-Z0-9_]+)?/gi, "FROM silvia_dataset.kpi_metrics_daily d JOIN silvia_dataset.vehiculos v ON d.vehiculo_id = v.id")
              .replace(/\bplaca\b/gi, "v.placa")
              .replace(/\bfacturacion\b/gi, "d.facturacion")
              .replace(/\bgastos\b/gi, "d.gastos")
              .replace(/\bcombustible_monto\b/gi, "d.combustible_monto")
              .replace(/\bgnv_monto\b/gi, "d.gnv_monto")
              .replace(/\bpeajes_monto\b/gi, "d.peajes_monto")
              .replace(/\bperiodo\b/gi, "d.periodo")
              .replace(/\bfecha_operacion\b/gi, "d.fecha_operacion");
          }
        }

        console.log(`[Gemini Webhook] SQL Query ejecutado (limpio): "${cleanSqlQuery}"`);

        const bqData = await runQuery(cleanSqlQuery);

        let explanation = "";
        let causaPerdida = "";
        let flatData = {};

        if (bqData && bqData.length === 1) {
          const r = bqData[0];
          const allowedKeys = ['placa', 'facturacion', 'gastos', 'combustible_monto', 'gnv_monto', 'peajes_monto', 'ganancia_neta'];
          allowedKeys.forEach(key => {
            if (r[key] !== undefined) {
              flatData[key] = r[key];
            }
          });

          const hasFinancials = r.ganancia_neta !== undefined || r.ganancia !== undefined || r.facturacion !== undefined || r.combustible_monto !== undefined || r.peajes_monto !== undefined || r.gnv_monto !== undefined;

          if (hasFinancials) {
            const gan = r.ganancia_neta !== undefined ? r.ganancia_neta : (r.ganancia !== undefined ? r.ganancia : 0);
            if (gan < 0) {
              const absGan = Math.abs(Math.round(gan));
              const fac = Math.round(r.facturacion || 0);
              const comb = Math.round(r.combustible_monto || r.combustible || r.combustible_costo || 0);
              const pea = Math.round(r.peajes_monto || r.peajes || r.peajes_costo || 0);
              const viajes = r.viajes_realizados || r.viajes || 49;

              explanation = `El vehículo registra una pérdida neta de S/. ${absGan.toLocaleString()} en este periodo. Realizó ${viajes} viajes con una facturación de S/. ${fac.toLocaleString()} (un promedio de flete de S/. ${(viajes > 0 ? fac / viajes : 0).toFixed(2)} por viaje). Los costos operativos fueron: S/. ${comb.toLocaleString()} en combustible y S/. ${pea.toLocaleString()} en peajes. La causa principal de la pérdida es que los ingresos de flete son muy bajos en relación a los costos de operación incurridos, lo que sugiere guías de remisión física sin liquidar o traslados internos.`;
              causaPerdida = `Bajos ingresos por flete promedio (S/. ${(viajes > 0 ? fac / viajes : 0).toFixed(2)} por viaje) frente a costos de combustible (S/. ${comb.toLocaleString()}) y peajes (S/. ${pea.toLocaleString()}).`;
            } else {
              explanation = `El vehículo operó de manera rentable en este periodo, logrando una ganancia neta de S/. ${Math.round(gan).toLocaleString()}.`;
              causaPerdida = `Operación rentable.`;
            }
          }
        }
        if (!explanation && bqData && bqData.length > 0) {
          const rowsSummary = bqData.slice(0, 5).map(row => {
            return Object.entries(row).map(([k, v]) => {
              if (v && typeof v === 'object' && v.value !== undefined) return `${k}: ${v.value}`;
              return `${k}: ${v}`;
            }).join(', ');
          }).join(' | ');
          explanation = `Resultados obtenidos: ${rowsSummary}`;
          causaPerdida = 'Consulta general';
        }

        // Limitar a un máximo de 30 registros para evitar exceder el límite de tamaño de Dialogflow CX (10-20KB)
        const rowCount = bqData ? bqData.length : 0;
        const results = bqData ? bqData.slice(0, 30) : [];

        const resp = {
          results: results,
          row_count: rowCount,
          explicacion: explanation,
          causa_perdida: causaPerdida,
          ...flatData
        };
        console.log(`[Gemini Webhook] Enviando respuesta a Dialogflow CX (filas devueltas: ${results.length} de ${rowCount}):`, JSON.stringify(resp));
        return res.json(resp);
      } catch (err) {
        console.warn('[Gemini Webhook] Error al ejecutar SQL:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }
    else if ((tag === 'consultar_vehiculo' || tag === 'Default Welcome Intent' || tag === 'consultar_combustible') && placaParam && targetPeriod < '2026-07') {
      // Si consultan un vehículo específico para un mes pasado, explicar pérdida o rendimiento del combustible
      const result = await explainVehicleLossOrFuel(placaParam, targetPeriod);
      textResponse = result.textResponse;
      extraData = result.extraData;
    }
    else if (tag === 'consultar_vehiculo' || tag === 'Default Welcome Intent') {
      if (!placaParam) {
        textResponse = '¿De qué vehículo o placa deseas conocer el estado actual?';
      } else {
        // Consultar catálogo de placas desde BigQuery
        const platesMap = {};
        const plateRows = await runQuery('SELECT id, placa FROM `silvia_dataset.vehiculos`');
        if (plateRows) {
          plateRows.forEach(r => {
            platesMap[r.id] = (r.placa || '').toUpperCase().trim();
          });
        }
        let vehicle = null;
        let matchedVid = null;
        let matchedPlate = '';
        for (const vid in monitoringStates) {
          const plate = platesMap[vid];
          if (plate === placaParam || vid.toUpperCase().trim() === placaParam) {
            vehicle = monitoringStates[vid];
            matchedVid = vid;
            matchedPlate = plate;
            break;
          }
        }

        if (vehicle && matchedVid) {
          const lp = livePositions[matchedVid] || {};
          const plan = vehicle.trips_planned || 0;
          const done = vehicle.trips_completed || 0;
          const state = vehicle.state || 'Detenido';
          const speed = lp.velocidad || 0;
          const dest = vehicle.probable_destination || '-';
          const percent = vehicle.probable_destination_percent || 0;
          const origin = vehicle.assigned_cantera || vehicle.current_origin || 'sin cantera';
          const lat = lp.lat || -12.04637;
          const lng = lp.lng || -77.04279;

          textResponse = `El camión con placa **${matchedPlate}** se encuentra actualmente en estado **"${state}"**.\n\n` +
            `• Cantera de Origen: ${origin}\n` +
            `• Viajes del día: ${done} realizados de ${plan} programados.\n` +
            (state === 'En ruta' && dest !== '-'
              ? `• Destino estimado: ${dest} (con un ${percent}% de rumbo de coincidencia).\n`
              : '') +
            `• Velocidad actual: ${speed} km/h.`;

          // Payload para centrar el mapa en el frontend
          customPayload = {
            action: 'focus_vehicle',
            placa: matchedPlate,
            lat: lat,
            lng: lng
          };

          extraData = {
            placa: matchedPlate,
            estado: state,
            cantera_origen: origin,
            viajes_realizados: done,
            viajes_programados: plan,
            destino_probable: dest,
            velocidad: speed,
            lat: lat,
            lng: lng,
            action: 'focus_vehicle'
          };
        } else {
          textResponse = `No encontré ningún camión operando con la placa o identificador **"${placaParam}"** en el monitoreo de hoy. Por favor, verifica la placa e intenta de nuevo.`;
        }
      }
    }
    else if (tag === 'consultar_combustible') {
      // 1. Consultar métricas del mes actual (Julio 2026)
      const statsQuery = `
        SELECT 
          COUNT(*) as total_records,
          COUNTIF(estado_alerta = 'Critico') as critical_count,
          COUNT(DISTINCT IF(estado_alerta = 'Critico', vehiculo_id, NULL)) as critical_vehicles_count,
          ROUND(SUM(monto_despachado), 2) as total_cost,
          ROUND(AVG(desviacion_porcentaje), 2) as avg_deviation_pct
        FROM \`project-silvia-500416.silvia_dataset.fuel_anomalies\`
        WHERE FORMAT_DATE('%Y-%m', fecha_fin) = '2026-07'
      `;

      const [statsRows] = await bigquery.query({ query: statsQuery });
      const stats = statsRows[0] || {};

      const count = parseInt(stats.critical_count) || 0;
      const vehs = parseInt(stats.critical_vehicles_count) || 0;
      const cost = parseFloat(stats.total_cost) || 0;
      const dev = parseFloat(stats.avg_deviation_pct) || 0;

      // 2. Obtener Historial Financiero consolidado por vehículo y mes para los meses clave (Febrero, Junio, Julio 2026)
      const financialHistorySql = `
        SELECT 
          v.placa,
          m.periodo,
          m.viajes_realizados as viajes,
          CAST(m.facturacion AS INT64) as facturacion,
          CAST(m.combustible_monto + m.gnv_monto AS INT64) as combustible_costo,
          CAST(m.peajes_monto AS INT64) as peajes_costo,
          CAST(COALESCE(m.facturacion, 0.0) - COALESCE(m.gastos, 0.0) - COALESCE(m.combustible_monto, 0.0) - COALESCE(m.gnv_monto, 0.0) - COALESCE(m.peajes_monto, 0.0) AS INT64) as ganancia
        FROM \`silvia_dataset.kpi_metrics_monthly\` m
        JOIN \`silvia_dataset.vehiculos\` v ON m.vehiculo_id = v.id
        WHERE m.periodo IN ('2026-02', '2026-06', '2026-07')
          AND m.viajes_realizados > 0;
      `;
      const financialHistory = await runQuery(financialHistorySql);

      // 3. Obtener Historial de Anomalías de Combustible por vehículo y mes
      const fuelAnomaliesHistorySql = `
        SELECT 
          placa,
          FORMAT_TIMESTAMP('%Y-%m', fecha_fin) as periodo,
          COUNTIF(estado_alerta = 'Critico') as alertas_criticas,
          ROUND(SUM(CASE WHEN estado_alerta = 'Critico' THEN (consumo_real - consumo_esperado) ELSE 0.0 END), 2) as exceso_consumo
        FROM \`silvia_dataset.fuel_anomalies\`
        WHERE FORMAT_TIMESTAMP('%Y-%m', fecha_fin) IN ('2026-02', '2026-06', '2026-07')
        GROUP BY placa, periodo;
      `;
      const fuelAnomaliesHistory = await runQuery(fuelAnomaliesHistorySql);

      extraData = {
        critical_count: count,
        critical_vehicles_count: vehs,
        total_cost: cost,
        avg_deviation_pct: dev,
        financial_history: financialHistory || [],
        fuel_anomalies_history: fuelAnomaliesHistory || []
      };

      textResponse = `Resumen de Alertas de Combustible de este mes (Julio 2026):\n\n` +
        `• Alertas críticas absolutas: ${count} anomalías.\n` +
        `• Vehículos con alertas críticas: ${vehs} camiones.\n` +
        `• Desviación promedio de consumo: ${dev > 0 ? '+' : ''}${dev}%.\n` +
        `• Costo total despachado: S/. ${cost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}.\n\n` +
        `Puedes consultar el detalle completo de las cargas sospechosas en la sección "Alertas de combustible" del panel lateral.`;
    }
    else if (tag === 'consultar_viajes') {
      let totalPlanned = 0;
      let totalCompleted = 0;
      let vehiclesCount = 0;

      Object.values(monitoringStates).forEach(v => {
        totalPlanned += (v.trips_planned || 0);
        totalCompleted += (v.trips_completed || 0);
        vehiclesCount++;
      });

      const percent = totalPlanned > 0 ? ((totalCompleted / totalPlanned) * 100).toFixed(1) : '0.0';

      extraData = {
        total_planned: totalPlanned,
        total_completed: totalCompleted,
        vehicles_count: vehiclesCount,
        percent: percent
      };

      textResponse = `Resumen operativo de la flota para hoy:\n\n` +
        `• Vehículos operando hoy: ${vehiclesCount} unidades.\n` +
        `• Viajes totales programados: ${totalPlanned} viajes.\n` +
        `• Viajes completados hasta ahora: ${totalCompleted} viajes.\n` +
        `• Avance global del plan del día: **${percent}%** del total.`;
    }
    else {
      textResponse = 'Hola, soy el asistente inteligente de SILVIA. Puedo darte información del estado de los vehículos, alertas de combustible y progreso de viajes del día. ¿En qué puedo ayudarte?';
    }
  } catch (err) {
    console.error('[Gemini Webhook] Error interno:', err.message);
    textResponse = 'Lo siento, ha ocurrido un error interno en el servidor al consultar los datos.';
  }

  // Responder con formato Dialogflow CX / Gemini Agent Platform
  const responseObj = {
    fulfillmentResponse: {
      messages: [
        {
          text: {
            text: [textResponse]
          }
        }
      ]
    },
    ...extraData
  };

  if (customPayload) {
    responseObj.fulfillmentResponse.messages.push({
      payload: customPayload
    });
  }

  res.json(responseObj);
});

// POST /api/agent/search (Búsqueda abierta en internet con DuckDuckGo)
router.post('/agent/search', async (req, res) => {
  const body = req.body || {};

  // Extraer el parámetro "query" de Dialogflow CX
  const query = body.sessionInfo?.parameters?.query || body.query || '';

  console.log(`[Gemini Search Webhook] Recibida consulta abierta: "${query}"`);

  if (!query) {
    return res.json({ respuesta: 'No se especificó ninguna consulta de búsqueda.' });
  }

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo respondió con código: ${response.status}`);
    }

    const html = await response.text();

    // Extraer fragmentos usando Regex
    const results = [];
    const resultReg = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = resultReg.exec(html)) !== null && results.length < 5) {
      const snippet = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (snippet) {
        results.push(snippet);
      }
    }

    if (results.length === 0) {
      return res.json({
        respuesta: `No se encontraron resultados web relevantes para: "${query}".`
      });
    }

    const respuesta = `Resultados de búsqueda web para "${query}":\n\n` +
      results.map((r, i) => `[Resultado ${i + 1}]: ${r}`).join('\n\n');

    console.log(`[Gemini Search Webhook] Búsqueda exitosa. Retornados ${results.length} snippets.`);
    res.json({ respuesta });
  } catch (err) {
    console.error('[Gemini Search Webhook] Error al buscar:', err.message);
    res.json({
      respuesta: `Error al consultar internet: ${err.message}. Por favor, formula la pregunta de otra manera.`
    });
  }
});

// --- CARGA DE PRELIQUIDACIONES EN SEGUNDO PLANO ---
async function processBatchInBg(jobId) {
  const job = preliqJobs[jobId];
  if (!job) return;
  job.status = 'processing';
  job.startTime = Date.now();

  console.log(`[Preliq Worker] Iniciando job ${jobId} para ${job.files.length} archivos`);

  for (let index = 0; index < job.files.length; index++) {
    // Si el trabajo fue cancelado en el camino, salir.
    if (job.status === 'cancelled') {
      console.log(`[Preliq Worker] Job ${jobId} fue cancelado por el usuario.`);
      break;
    }

    const file = job.files[index];
    job.progress = Math.round((index / job.files.length) * 100);
    console.log(`[Preliq Worker] Procesando archivo ${index + 1}/${job.files.length}: ${file.name}`);
    try {
      // Ejecutar script Python
      const isPreliq = !job.documentType || job.documentType === 'PRELIQUIDACION';
      const pythonCmd = process.env.PYTHON_CMD || '/opt/miniconda3/bin/conda run -n silvia python';
      
      const defaultScript = isPreliq 
        ? path.join(__dirname, '..', 'scripts', 'process_upload_pdf.py') 
        : path.join(__dirname, '..', 'scripts', 'process_upload_excel.py');
      const scriptPath = (isPreliq ? process.env.PROCESS_PDF_SCRIPT : process.env.PROCESS_EXCEL_SCRIPT) || defaultScript;
      
      const cmd = isPreliq 
        ? `${pythonCmd} "${scriptPath}" "${file.path}"`
        : `${pythonCmd} "${scriptPath}" "${job.documentType}" "${file.path}"`;

      const stdout = await new Promise((resolve, reject) => {
        exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
          if (error) {
            console.error(`[Preliq Worker] Python error para ${file.name}:`, stderr);
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout);
          }
        });
      });

      // Borrar el archivo temporal de inmediato para no saturar disco
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      const records = JSON.parse(stdout);

      // Agregar fuente (fuente de datos = nombre original) a cada record
      for (const rec of records) {
        rec.fuente = file.name;
        if (isPreliq) {
          // Mapear flete de monto_total
          rec.flete = rec.monto_total || 0.0;
        }
        // Asignar estado por defecto para la previsualización
        rec.estado = 'Pendiente de aprobación';
        job.results.push(rec);
      }
    } catch (err) {
      console.error(`[Preliq Worker] Error procesando archivo ${file.name}:`, err.message);
      // Intentar borrar el PDF temporal por seguridad en caso de fallo
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (_) { }
      }
    }

    job.processedFiles = index + 1;
  }

  // Si fue cancelado, no marcar como completado
  if (job.status === 'cancelled') {
    // Asegurar que se limpien todos los archivos temporales restantes si los hubiera
    job.files.forEach(f => {
      if (fs.existsSync(f.path)) {
        try { fs.unlinkSync(f.path); } catch (_) { }
      }
    });
    return;
  }

  job.status = 'completed';
  job.progress = 100;
  job.elapsedTime = parseFloat(((Date.now() - job.startTime) / 1000).toFixed(2));

  console.log(`[Preliq Worker] Job ${jobId} completado en ${job.elapsedTime}s. Generando CSV...`);
  generateCsvFile(jobId, job);
}

router.post('/preliquidaciones/upload', async (req, res) => {
  const files = req.body.files || [];
  const documentType = req.body.documentType || 'PRELIQUIDACION';
  if (files.length === 0) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const tmpDir = process.env.TMP_DIR || path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  try {
    // Escribir los PDFs a disco inmediatamente y liberar la memoria base64
    const fileConfigs = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const base64Data = f.data.split(';base64,').pop();
      const pdfPath = path.join(tmpDir, `upload_${Date.now()}_${i}_${f.name}`);
      fs.writeFileSync(pdfPath, base64Data, { encoding: 'base64' });
      fileConfigs.push({
        name: f.name,
        path: pdfPath
      });
    }

    // Inicializar el trabajo en memoria
    preliqJobs[jobId] = {
      status: 'pending',
      progress: 0,
      totalFiles: files.length,
      processedFiles: 0,
      results: [],
      startTime: Date.now(),
      elapsedTime: 0,
      files: fileConfigs,
      documentType: documentType
    };

    // Disparar procesamiento asíncrono
    processBatchInBg(jobId);

    // Responder de inmediato
    res.json({ success: true, jobId });
  } catch (err) {
    console.error('[Preliq Upload] Error inicializando carga:', err);
    res.status(500).json({ error: 'Error al inicializar la carga de archivos: ' + err.message });
  }
});

router.get('/preliquidaciones/status/:jobId', (req, res) => {
  const job = preliqJobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: 'Trabajo no encontrado' });
  }

  if (job.status === 'processing' || job.status === 'pending') {
    job.elapsedTime = parseFloat(((Date.now() - job.startTime) / 1000).toFixed(2));
  }

  res.json({
    status: job.status,
    progress: job.progress,
    totalFiles: job.totalFiles,
    processedFiles: job.processedFiles,
    elapsedTime: job.elapsedTime,
    results: job.results
  });
});

router.post('/preliquidaciones/cancel/:jobId', (req, res) => {
  const job = preliqJobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: 'Trabajo no encontrado' });
  }

  console.log(`[Preliq] Cancelando job ${req.params.jobId}`);
  job.status = 'cancelled';

  // Limpiar cualquier archivo temporal del job que quede en disco
  if (job.files && job.files.length > 0) {
    job.files.forEach(f => {
      if (fs.existsSync(f.path)) {
        try { fs.unlinkSync(f.path); } catch (_) { }
      }
    });
  }

  res.json({ success: true });
});

router.post('/preliquidaciones/clear/:jobId', (req, res) => {
  if (preliqJobs[req.params.jobId]) {
    delete preliqJobs[req.params.jobId];
    console.log(`[Preliq] Job ${req.params.jobId} descartado de memoria.`);
  }
  res.json({ success: true });
});

router.post('/preliquidaciones/approve/:jobId', async (req, res) => {
  const job = preliqJobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: 'Trabajo no encontrado' });
  }
  if (job.status !== 'completed') {
    return res.status(400).json({ error: 'El trabajo no ha finalizado' });
  }

  try {
    console.log(`[Preliq Approve] Insertando ${job.results.length} registros en BigQuery para el job ${req.params.jobId}`);

    // Insertar registros en BigQuery de acuerdo al tipo de documento
    const docType = job.documentType || 'PRELIQUIDACION';
    for (const rec of job.results) {
      let insertSql = '';
      
      if (docType === 'PRELIQUIDACION') {
        insertSql = `
          INSERT INTO \`${datasetId}.liquidaciones\` (
            id, liquidacion_nro, transportista, fecha, nro_guia, placa, 
            vehiculo_id, insumo, material_id, peso_seco, peso_humedo, 
            monto_total, flete, ruta, origen, destino, fecha_carga
          ) VALUES (
            '${rec.id}',
            ${rec.liquidacion_nro ? `'${rec.liquidacion_nro}'` : 'NULL'},
            ${rec.transportista ? `'${rec.transportista}'` : 'NULL'},
            ${rec.fecha ? `TIMESTAMP('${rec.fecha}')` : 'NULL'},
            ${rec.nro_guia ? `'${rec.nro_guia}'` : 'NULL'},
            ${rec.placa ? `'${rec.placa}'` : 'NULL'},
            ${rec.vehiculo_id ? `'${rec.vehiculo_id}'` : 'NULL'},
            ${rec.insumo ? `'${rec.insumo}'` : 'NULL'},
            ${rec.material_id ? `'${rec.material_id}'` : 'NULL'},
            ${rec.peso_seco || 0.0},
            ${rec.peso_humedo || 0.0},
            ${rec.monto_total || 0.0},
            ${rec.flete || 0.0},
            ${rec.origen && rec.destino ? `'${rec.origen} - ${rec.destino}'` : 'NULL'},
            ${rec.origen ? `'${rec.origen}'` : 'NULL'},
            ${rec.destino ? `'${rec.destino}'` : 'NULL'},
            CURRENT_TIMESTAMP()
          )
        `;
      } else if (docType === 'DIESEL') {
        insertSql = `
          INSERT INTO \`${datasetId}.combustible\` (
            id, vehiculo_id, fecha, hora, galones_despachados, precio_unitario, monto_despachado
          ) VALUES (
            '${rec.id}',
            ${rec.vehiculo_id ? `'${rec.vehiculo_id}'` : 'NULL'},
            ${rec.fecha ? `TIMESTAMP('${rec.fecha}')` : 'NULL'},
            ${rec.hora ? `TIMESTAMP('${rec.hora}')` : 'NULL'},
            ${rec.galones_despachados || 0.0},
            ${rec.precio_unitario || 0.0},
            ${rec.monto_despachado || 0.0}
          )
        `;
      } else if (docType === 'GNV') {
        insertSql = `
          INSERT INTO \`${datasetId}.gnv\` (
            fecha, factura, placa, m3, precio_unitario, monto_total, km_recorridos
          ) VALUES (
            ${rec.fecha ? `DATE('${rec.fecha}')` : 'NULL'},
            ${rec.factura ? `'${rec.factura}'` : 'NULL'},
            ${rec.placa ? `'${rec.placa}'` : 'NULL'},
            ${rec.m3 || 0.0},
            ${rec.precio_unitario || 0.0},
            ${rec.monto_total || 0.0},
            0.0
          )
        `;
      } else if (docType === 'PEAJES') {
        insertSql = `
          INSERT INTO \`${datasetId}.peajes\` (
            tipo_servicio, red_uso, placa, fecha_transito, punto_servicio, comprobante, total_servicio, saldo_final
          ) VALUES (
            ${rec.tipo_servicio ? `'${rec.tipo_servicio}'` : 'NULL'},
            ${rec.red_uso ? `'${rec.red_uso}'` : 'NULL'},
            ${rec.placa ? `'${rec.placa}'` : 'NULL'},
            ${rec.fecha_transito ? `DATE('${rec.fecha_transito}')` : 'NULL'},
            ${rec.punto_servicio ? `'${rec.punto_servicio}'` : 'NULL'},
            ${rec.comprobante ? `'${rec.comprobante}'` : 'NULL'},
            ${rec.total_servicio || 0.0},
            ${rec.saldo_final || 0.0}
          )
        `;
      }

      const resQuery = await runQuery(insertSql);
      if (resQuery === null) {
        throw new Error(`Fallo al ejecutar inserción SQL para el registro del documento.`);
      }
    }

    // Una vez aprobados los datos, eliminamos el job de memoria
    delete preliqJobs[req.params.jobId];
    console.log(`[Preliq Approve] Job ${req.params.jobId} aprobado e insertado con éxito.`);

    res.json({ success: true });
  } catch (err) {
    console.error(`[Preliq Approve] Error al insertar datos en BigQuery:`, err);
    res.status(500).json({ error: 'Error al persistir los datos en BigQuery: ' + err.message });
  }
});

router.get('/preliquidaciones/export/:jobId', async (req, res) => {
  const job = preliqJobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: 'Trabajo no encontrado' });
  }

  const exportDir = process.env.EXPORT_DIR || path.join(process.cwd(), 'exports');
  const filePath = path.join(exportDir, `preliq_${req.params.jobId}.csv`);

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="preliq_${req.params.jobId}.csv"`);
    return res.sendFile(filePath);
  } else {
    // Si por alguna razón no existe en disco, generarlo al vuelo
    generateCsvFile(req.params.jobId, job);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="preliq_${req.params.jobId}.csv"`);
      return res.sendFile(filePath);
    }
    return res.status(404).json({ error: 'Archivo CSV no encontrado' });
  }
});

function generateCsvFile(jobId, job) {
  console.log('[CSV] Inside generateCsvFile, jobId=', jobId, 'elapsedTime=', job.elapsedTime);
  try {
    const exportDir = process.env.EXPORT_DIR || path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    const lines = [];
    lines.push(`Tiempo de procesamiento: ${job.elapsedTime} segundos`);
    lines.push('id,liquidacion_nro,transportista,fecha,nro_guia,placa,vehiculo_id,insumo,material_id,peso_seco,peso_humedo,monto_total,ruta,origen,destino,fuente,fecha_carga');

    (job.results || []).forEach(rec => {
      const row = [
        rec.id || '',
        rec.liquidacion_nro || '',
        rec.transportista || 'VIRGEN DE ESTRELLA S.A.C.',
        rec.fecha || '',
        rec.nro_guia || '',
        rec.placa || '',
        rec.vehiculo_id || '',
        `"${rec.insumo || ''}"`,
        rec.material_id || '',
        rec.peso_seco || 0,
        rec.peso_humedo || 0,
        rec.monto_total || 0,
        rec.origen && rec.destino ? `"${rec.origen} - ${rec.destino}"` : '',
        `"${rec.origen || ''}"`,
        `"${rec.destino || ''}"`,
        `"${rec.fuente || ''}"`,
        new Date().toISOString()
      ].join(',');
      lines.push(row);
    });

    const csvContent = lines.join('\n');
    const filePath = path.join(exportDir, `preliq_${jobId}.csv`);
    fs.writeFileSync(filePath, csvContent, { encoding: 'utf8' });
    console.log(`[CSV Export] Archivo creado en ${filePath}`);
  } catch (e) {
    console.error('[CSV Export] Error generando CSV:', e);
  }
}
router.get('/debug/generate/:jobId', (req, res) => {
  const dummyJob = {
    status: 'completed',
    elapsedTime: 1.23,
    results: [{
      id: 'test_dummy_id',
      liquidacion_nro: '12345',
      fecha: '2023-01-01',
      nro_guia: 'G123',
      placa: 'ABC123',
      peso_seco: 1000,
      peso_humedo: 1100,
      monto_total: 5000,
      flete: 5000,
      insumo: 'ARENA',
      fuente: 'test_file.pdf'
    }]
  };
  generateCsvFile(req.params.jobId, dummyJob);
  res.json({ msg: 'dummy CSV generated', jobId: req.params.jobId });
});

// POST /api/telegram-webhook
router.post('/telegram-webhook', async (req, res) => {
  try {
    const update = req.body;
    if (update && update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      if (text) {
        // Ejecución asíncrona para responder 200 OK inmediatamente
        import('../services/telegramAgent.js').then(agent => {
          agent.processTelegramMessage(chatId, text);
        }).catch(err => {
          console.error('[Telegram Webhook Error]:', err);
        });
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('[Telegram Webhook Endpoint Error]:', err);
    res.sendStatus(500);
  }
});

export default router;
