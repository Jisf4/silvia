import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar cliente de BigQuery
// BigQuery utilizará automáticamente las Application Default Credentials (ADC) si no se especifica otra clave.
const bigquery = new BigQuery();
const datasetId = process.env.BQ_DATASET || 'silvia_dataset';

async function runSeed() {
  console.log('=== Iniciando Proceso de Inicialización y Sembrado de BigQuery ===');

  try {
    // 1. Crear el dataset si no existe
    console.log(`Verificando existencia del dataset: ${datasetId}...`);
    const [datasetExists] = await bigquery.dataset(datasetId).exists();
    if (!datasetExists) {
      console.log(`Creando dataset ${datasetId}...`);
      await bigquery.createDataset(datasetId, { location: 'US' });
      console.log('Dataset creado exitosamente.');
    } else {
      console.log('El dataset ya existe.');
    }

    // 2. Leer y ejecutar el archivo DDL para crear las tablas
    const ddlPath = path.join(__dirname, 'create_tables.sql');
    console.log(`Leyendo DDL desde: ${ddlPath}...`);
    let ddlSql = fs.readFileSync(ddlPath, 'utf8');

    // Reemplazar la referencia por defecto silvia_dataset por el datasetId de la variable de entorno
    ddlSql = ddlSql.replaceAll('silvia_dataset', datasetId);

    // Separar por comandos individuales (BigQuery no soporta múltiples sentencias CREATE en una única llamada simple de API a menos que sea un script completo)
    // Para simplificar, ejecutaremos todo el script como una consulta de script de BigQuery (usando BEGIN/END o simplemente enviando el bloque completo)
    console.log('Creando/Reemplazando tablas en BigQuery...');
    await bigquery.query({ query: ddlSql });
    console.log('Tablas creadas de manera exitosa.');

    // 3. Insertar datos semilla usando sentencias INSERT
    console.log('Inyectando datos semilla...');

    const seedQueries = [
      // CLIENTES
      `INSERT INTO \`${datasetId}.CLIENTES\` (id, nombre) VALUES
        (1, 'Obra Los Portales - Ate'),
        (2, 'Obra Alto Verde - Ventanilla'),
        (3, 'Obra San Juan - Miraflores'),
        (4, 'Obra Santa Clara - Vitarte'),
        (5, 'Obra El Sol - Chorrillos');`,

      // MATERIALES
      `INSERT INTO \`${datasetId}.MATERIALES\` (id, nombre) VALUES
        (1, 'Arena Gruesa'),
        (2, 'Piedra Chancada'),
        (3, 'Tierra de Chacra'),
        (4, 'Fierro Corrugado'),
        (5, 'Cemento Sol');`,

      // VEHICULOS
      `INSERT INTO \`${datasetId}.VEHICULOS\` (id, placa, tipo, marca, modelo, motor, n_serie, tipo_combustible, anio_fabricacion, anio_modelo, capacidad_toneladas) VALUES
        (1, 'BCI734', 'Camion', 'Volvo', 'FMX 460', 'D13K460', 'VOLVO87654321', 'Diesel', DATE(2022, 5, 12), DATE(2022, 1, 1), 25.0),
        (2, 'ABL875', 'Camion', 'Mercedes-Benz', 'Actros 2645', 'OM471', 'MB9876543210', 'Diesel', DATE(2021, 8, 20), DATE(2021, 1, 1), 25.0),
        (3, 'AFG456', 'Camion', 'Scania', 'G450', 'DC13', 'SCANIA112233', 'Diesel', DATE(2023, 2, 15), DATE(2023, 1, 1), 20.0),
        (4, 'BDP123', 'Camion', 'Volvo', 'VM 330', 'MWM7B330', 'VOLVO99887766', 'Diesel', DATE(2020, 11, 5), DATE(2021, 1, 1), 18.0),
        (5, 'BEE245', 'Camion', 'Hino', '700 ZS', 'E13C-WD', 'HINO44556677', 'Diesel', DATE(2019, 4, 10), DATE(2019, 1, 1), 15.0),
        (6, 'ABN852', 'Camion', 'Volvo', 'FMX 460', 'D13K460', 'VOLVO55443322', 'Diesel', DATE(2022, 6, 18), DATE(2022, 1, 1), 25.0),
        (7, 'BYP838', 'Tracto', 'Kenworth', 'T800', 'ISX15', 'KW8877665544', 'Diesel', DATE(2023, 1, 10), DATE(2023, 1, 1), 32.0);`,

      // UBICACIONES
      `INSERT INTO \`${datasetId}.UBICACIONES\` (id, cliente_id, nombre, lat, lon) VALUES
        (1, NULL, 'Cantera A - Lurín', -12.26235, -76.83488),
        (2, NULL, 'Cantera B - Carabayllo', -11.90469, -77.05320),
        (3, NULL, 'Cantera C - Huachipa', -12.01990, -76.91946),
        (4, 1, 'Obra Los Portales - Ate', -12.02255, -76.94691),
        (5, 2, 'Obra Alto Verde - Ventanilla', -11.97852, -77.10819),
        (6, 3, 'Obra San Juan - Miraflores', -11.98978, -77.11448),
        (7, 4, 'Obra Santa Clara - Vitarte', -11.95072, -77.08073),
        (8, 5, 'Obra El Sol - Chorrillos', -11.97579, -77.11313);`,

      // CONDUCTORES
      `INSERT INTO \`${datasetId}.CONDUCTORES\` (id, vehiculo_id, nombre, edad, dni, estado, fecha_ingreso, fecha_salida) VALUES
        (1, 1, 'Juan Pérez Valenzuela', 42, 40123456, 1, DATE(2020, 1, 15), NULL),
        (2, 2, 'Carlos Mendoza Ruiz', 35, 45987654, 1, DATE(2021, 6, 10), NULL),
        (3, 3, 'Luis Alva Guerrero', 48, 80112233, 1, DATE(2018, 9, 1), NULL),
        (4, 4, 'Miguel Torres Díaz', 29, 70334455, 1, DATE(2023, 3, 20), NULL),
        (5, 5, 'Jorge Chávez Benítez', 51, 90887766, 1, DATE(2015, 11, 1), NULL);`,

      // VIAJES (Historial de enero 2026 para rellenar gráficos)
      // Generamos varios viajes para que los dashboards ejecutivos muestren curvas fluidas.
      `INSERT INTO \`${datasetId}.VIAJES\` (id, vehiculo_id, cliente_id, material_id, conductor, fecha, origen, destino, guia_cliente, guia_transportista, distancia_km, toneladas, flete, monto_sin_igv, gasto) VALUES
        (1001, 1, 1, 1, 'Juan Pérez Valenzuela', TIMESTAMP('2026-01-01 08:30:00 UTC'), 'Cantera A - Lurín', 'Obra Los Portales - Ate', 'GC-00192', 'GT-00912', 35.5, 25.0, 800.0, 750.0, 200.0),
        (1002, 2, 2, 2, 'Carlos Mendoza Ruiz', TIMESTAMP('2026-01-01 10:15:00 UTC'), 'Cantera B - Carabayllo', 'Obra Alto Verde - Ventanilla', 'GC-00193', 'GT-00913', 42.0, 24.5, 950.0, 900.0, 250.0),
        (1003, 3, 3, 3, 'Luis Alva Guerrero', TIMESTAMP('2026-01-02 07:00:00 UTC'), 'Cantera A - Lurín', 'Obra San Juan - Miraflores', 'GC-00194', 'GT-00914', 28.0, 20.0, 700.0, 650.0, 180.0),
        (1004, 4, 4, 1, 'Miguel Torres Díaz', TIMESTAMP('2026-01-02 11:30:00 UTC'), 'Cantera C - Huachipa', 'Obra Santa Clara - Vitarte', 'GC-00195', 'GT-00915', 15.2, 18.0, 500.0, 480.0, 120.0),
        (1005, 5, 5, 2, 'Jorge Chávez Benítez', TIMESTAMP('2026-01-03 09:00:00 UTC'), 'Cantera A - Lurín', 'Obra El Sol - Chorrillos', 'GC-00196', 'GT-00916', 30.1, 15.0, 600.0, 560.0, 150.0),
        (1006, 1, 1, 1, 'Juan Pérez Valenzuela', TIMESTAMP('2026-01-08 08:00:00 UTC'), 'Cantera A - Lurín', 'Obra Los Portales - Ate', 'GC-00197', 'GT-00917', 35.5, 25.0, 800.0, 750.0, 195.0),
        (1007, 2, 2, 2, 'Carlos Mendoza Ruiz', TIMESTAMP('2026-01-08 14:00:00 UTC'), 'Cantera B - Carabayllo', 'Obra Alto Verde - Ventanilla', 'GC-00198', 'GT-00918', 42.0, 25.0, 950.0, 900.0, 240.0),
        (1008, 3, 3, 3, 'Luis Alva Guerrero', TIMESTAMP('2026-01-15 08:30:00 UTC'), 'Cantera A - Lurín', 'Obra San Juan - Miraflores', 'GC-00199', 'GT-00919', 28.0, 20.0, 700.0, 650.0, 175.0),
        (1009, 4, 4, 1, 'Miguel Torres Díaz', TIMESTAMP('2026-01-15 13:00:00 UTC'), 'Cantera C - Huachipa', 'Obra Santa Clara - Vitarte', 'GC-00200', 'GT-00920', 15.2, 17.8, 500.0, 480.0, 118.0),
        (1010, 5, 5, 2, 'Jorge Chávez Benítez', TIMESTAMP('2026-01-22 09:15:00 UTC'), 'Cantera A - Lurín', 'Obra El Sol - Chorrillos', 'GC-00201', 'GT-00921', 30.1, 15.0, 600.0, 560.0, 145.0),
        (1011, 1, 1, 1, 'Juan Pérez Valenzuela', TIMESTAMP('2026-01-22 14:30:00 UTC'), 'Cantera A - Lurín', 'Obra Los Portales - Ate', 'GC-00202', 'GT-00922', 35.5, 25.0, 800.0, 750.0, 202.0),
        (1012, 2, 2, 2, 'Carlos Mendoza Ruiz', TIMESTAMP('2026-01-29 09:00:00 UTC'), 'Cantera B - Carabayllo', 'Obra Alto Verde - Ventanilla', 'GC-00203', 'GT-00923', 42.0, 24.8, 950.0, 900.0, 248.0),
        (1013, 3, 3, 3, 'Luis Alva Guerrero', TIMESTAMP('2026-01-29 11:30:00 UTC'), 'Cantera A - Lurín', 'Obra San Juan - Miraflores', 'GC-00204', 'GT-00924', 28.0, 19.5, 700.0, 650.0, 170.0);`,

      // TRIP_FEATURES (Rendimiento por viaje)
      `INSERT INTO \`${datasetId}.TRIP_FEATURES\` (viaje_id, velocidad_promedio, velocidad_maxima, combustible_litros, utilidad) VALUES
        (1001, 45.2, 75.0, 52.0, 550.0),
        (1002, 38.5, 68.0, 68.0, 650.0),
        (1003, 50.1, 80.0, 38.0, 470.0),
        (1004, 35.0, 60.0, 22.0, 360.0),
        (1005, 42.8, 72.0, 41.0, 410.0),
        (1006, 46.0, 78.0, 50.5, 555.0),
        (1007, 39.0, 70.0, 66.5, 660.0),
        (1008, 49.5, 82.0, 37.0, 475.0),
        (1009, 36.2, 62.0, 21.5, 362.0),
        (1010, 43.1, 74.0, 40.2, 415.0),
        (1011, 44.8, 76.0, 53.0, 548.0),
        (1012, 38.2, 67.0, 69.0, 652.0),
        (1013, 48.9, 81.0, 36.2, 480.0);`,

      // COMBUSTIBLE (Registro de recargas)
      `INSERT INTO \`${datasetId}.COMBUSTIBLE\` (id, vehiculo_id, fecha, hora, galones_despachados, monto_despachado, precio_unitario) VALUES
        (2001, 1, TIMESTAMP('2026-01-01 07:00:00 UTC'), TIMESTAMP('2026-01-01 07:00:00 UTC'), 15.5, 232.5, 15.0),
        (2002, 2, TIMESTAMP('2026-01-01 08:30:00 UTC'), TIMESTAMP('2026-01-01 08:30:00 UTC'), 20.0, 300.0, 15.0),
        (2003, 3, TIMESTAMP('2026-01-02 06:15:00 UTC'), TIMESTAMP('2026-01-02 06:15:00 UTC'), 12.0, 182.4, 15.2),
        (2004, 4, TIMESTAMP('2026-01-02 10:00:00 UTC'), TIMESTAMP('2026-01-02 10:00:00 UTC'), 8.5, 129.2, 15.2),
        (2005, 5, TIMESTAMP('2026-01-03 08:00:00 UTC'), TIMESTAMP('2026-01-03 08:00:00 UTC'), 11.2, 170.2, 15.2),
        (2006, 1, TIMESTAMP('2026-01-08 07:15:00 UTC'), TIMESTAMP('2026-01-08 07:15:00 UTC'), 16.0, 248.0, 15.5),
        (2007, 2, TIMESTAMP('2026-01-08 12:30:00 UTC'), TIMESTAMP('2026-01-08 12:30:00 UTC'), 19.5, 302.25, 15.5),
        (2008, 3, TIMESTAMP('2026-01-15 07:00:00 UTC'), TIMESTAMP('2026-01-15 07:00:00 UTC'), 11.8, 182.9, 15.5),
        (2009, 4, TIMESTAMP('2026-01-15 11:45:00 UTC'), TIMESTAMP('2026-01-15 11:45:00 UTC'), 8.0, 124.0, 15.5),
        (2010, 5, TIMESTAMP('2026-01-22 08:00:00 UTC'), TIMESTAMP('2026-01-22 08:00:00 UTC'), 10.5, 168.0, 16.0),
        (2011, 1, TIMESTAMP('2026-01-22 13:00:00 UTC'), TIMESTAMP('2026-01-22 13:00:00 UTC'), 15.8, 252.8, 16.0),
        (2012, 2, TIMESTAMP('2026-01-29 07:30:00 UTC'), TIMESTAMP('2026-01-29 07:30:00 UTC'), 20.5, 328.0, 16.0),
        (2013, 3, TIMESTAMP('2026-01-29 10:00:00 UTC'), TIMESTAMP('2026-01-29 10:00:00 UTC'), 11.0, 176.0, 16.0);`,

      // MODEL_PREDICTIONS (Historial de predicciones)
      `INSERT INTO \`${datasetId}.MODEL_PREDICTIONS\` (model_id, vehiculo_id, fecha_prediccion, valor_variables, valor_predicho, valor_real, error_pct) VALUES
        (5001, 1, TIMESTAMP('2026-01-01 08:00:00 UTC'), '{"origen": "Cantera A", "destino": "Obra Los Portales", "toneladas": 25.0}', 45.0, 42.0, 7.1),
        (5002, 2, TIMESTAMP('2026-01-01 09:30:00 UTC'), '{"origen": "Cantera B", "destino": "Obra Alto Verde", "toneladas": 24.5}', 15.0, 13.2, 13.6),
        (5003, 3, TIMESTAMP('2026-01-02 06:45:00 UTC'), '{"origen": "Cantera A", "destino": "Obra San Juan", "toneladas": 20.0}', 480.0, 462.0, 3.8);`,

      // GPS_POSITIONS (Últimas posiciones iniciales simuladas)
      // Usamos coordenadas reales del area de Lima para que aparezcan correctamente en el mapa
      `INSERT INTO \`${datasetId}.GPS_POSITIONS\` (id, vehiculo_id, timestamp_gps, estado, velocidad, odometro, geom) VALUES
        (3001, 1, CURRENT_TIMESTAMP(), 'En ruta', 28, 46597.4, ST_GEOGPOINT(-77.05320, -11.90469)),
        (3002, 2, CURRENT_TIMESTAMP(), 'En ruta', 33, 48588.1, ST_GEOGPOINT(-77.08938, -11.96924)),
        (3003, 3, CURRENT_TIMESTAMP(), 'Detenido', 0, 55737.8, ST_GEOGPOINT(-77.10819, -11.97852)),
        (3004, 4, CURRENT_TIMESTAMP(), 'Descargando', 0, 49465.4, ST_GEOGPOINT(-77.09129, -11.95346)),
        (3005, 5, CURRENT_TIMESTAMP(), 'Mantenimiento', 0, 63967.6, ST_GEOGPOINT(-77.10820, -11.98232));`
    ];

    for (let i = 0; i < seedQueries.length; i++) {
      console.log(`Ejecutando query de semilla ${i + 1}/${seedQueries.length}...`);
      await bigquery.query({ query: seedQueries[i] });
    }

    console.log('=== Proceso de Inicialización y Sembrado Finalizado Exitosamente ===');
  } catch (error) {
    console.error('Error al inicializar o sembrar la base de datos:', error);
    process.exit(1);
  }
}

runSeed();
