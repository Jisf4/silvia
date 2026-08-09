import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize BigQuery client
const bigquery = new BigQuery();
const datasetId = process.env.BQ_DATASET || 'silvia_dataset';
const processedDataDir = path.join(__dirname, '..', '..', '..', 'processed_data');

async function loadCsvs() {
  console.log('=== INICIANDO LA CARGA DE ARCHIVOS CSV A BIGQUERY ===');
  console.log(`Dataset de destino: ${datasetId}`);
  console.log(`Directorio de datos procesados: ${processedDataDir}`);

  try {
    // 1. Verificar/Crear Dataset
    console.log(`Verificando existencia del dataset: ${datasetId}...`);
    const [datasetExists] = await bigquery.dataset(datasetId).exists();
    if (!datasetExists) {
      console.log(`Creando dataset ${datasetId}...`);
      await bigquery.createDataset(datasetId, { location: 'US' });
      console.log('Dataset creado exitosamente.');
    } else {
      console.log('El dataset ya existe.');
    }

    // 2. Recrear tablas ejecutando el DDL
    const ddlPath = path.join(__dirname, 'create_tables.sql');
    console.log(`Leyendo DDL de creación de tablas desde: ${ddlPath}...`);
    let ddlSql = fs.readFileSync(ddlPath, 'utf8');
    ddlSql = ddlSql.replaceAll('silvia_dataset', datasetId);

    console.log('Ejecutando DDL en BigQuery para restablecer las tablas...');
    await bigquery.query({ query: ddlSql });
    console.log('Tablas inicializadas exitosamente.');

    // Definición de las cargas de CSV estándar
    // Nombre del archivo CSV -> Nombre de la tabla en BigQuery
    const csvTables = [
      { file: 'clientes.csv', table: 'CLIENTES' },
      { file: 'materiales.csv', table: 'MATERIALES' },
      { file: 'vehiculos.csv', table: 'VEHICULOS' },
      { file: 'conductores.csv', table: 'CONDUCTORES' },
      { file: 'ubicaciones.csv', table: 'UBICACIONES' },
      { file: 'viajes.csv', table: 'VIAJES' },
      { file: 'combustible.csv', table: 'COMBUSTIBLE' },
      { file: 'mantenimientos.csv', table: 'MANTENIMIENTOS' }
    ];

    // Cargar cada tabla estándar
    for (const item of csvTables) {
      const filePath = path.join(processedDataDir, item.file);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Archivo no encontrado: ${filePath}. Se omitirá.`);
        continue;
      }

      console.log(`Cargando ${item.file} en la tabla ${item.table}...`);
      
      const metadata = {
        sourceFormat: 'CSV',
        skipLeadingRows: 1,
        writeDisposition: 'WRITE_TRUNCATE',
        allowJaggedRows: true,
        allowQuotedNewlines: true,
      };

      const [job] = await bigquery
        .dataset(datasetId)
        .table(item.table)
        .load(filePath, metadata);

      console.log(`Trabajo de carga para ${item.table} completado (ID: ${job.id}).`);
      
      // Consultar cuántos registros se cargaron
      const [rows] = await bigquery.query({
        query: `SELECT COUNT(*) as count FROM \`${datasetId}.${item.table}\``
      });
      console.log(`✅ Carga completada. Total registros en ${item.table}: ${rows[0].count}`);
    }

    // 3. Procesar GPS_POSITIONS con tabla intermedia para transformar lat/lon a GEOGRAPHY
    const gpsCsvPath = path.join(processedDataDir, 'gps_positions.csv');
    if (fs.existsSync(gpsCsvPath)) {
      const stagingTableName = 'GPS_POSITIONS_STAGING';
      console.log('\n--- Iniciando proceso especial para GPS_POSITIONS ---');
      
      // Crear tabla de staging temporal
      console.log(`Creando tabla staging: ${stagingTableName}...`);
      const createStagingSql = `
        CREATE OR REPLACE TABLE \`${datasetId}.${stagingTableName}\` (
          id INT64,
          vehiculo_id STRING,
          timestamp_gps TIMESTAMP,
          estado STRING,
          velocidad NUMERIC,
          odometro NUMERIC,
          lat FLOAT64,
          lon FLOAT64
        );
      `;
      await bigquery.query({ query: createStagingSql });
      console.log('Tabla staging creada.');

      // Cargar CSV en tabla staging
      console.log(`Cargando gps_positions.csv en tabla staging...`);
      const stagingMetadata = {
        sourceFormat: 'CSV',
        skipLeadingRows: 1,
        writeDisposition: 'WRITE_TRUNCATE',
        allowJaggedRows: true,
        allowQuotedNewlines: true
      };

      const [gpsJob] = await bigquery
        .dataset(datasetId)
        .table(stagingTableName)
        .load(gpsCsvPath, stagingMetadata);

      console.log(`Trabajo de carga para staging completado (ID: ${gpsJob.id}).`);

      // Copiar de staging a la tabla real transformando lat/lon en geom (GEOGRAPHY)
      console.log('Insertando datos en la tabla GPS_POSITIONS real con conversión a GEOGRAPHY...');
      const transferSql = `
        INSERT INTO \`${datasetId}.GPS_POSITIONS\` (id, vehiculo_id, timestamp_gps, estado, velocidad, odometro, geom)
        SELECT 
          id, 
          vehiculo_id, 
          timestamp_gps, 
          estado, 
          velocidad, 
          odometro, 
          ST_GEOGPOINT(lon, lat)
        FROM \`${datasetId}.${stagingTableName}\`
        WHERE lat IS NOT NULL AND lon IS NOT NULL AND lat != 0.0 AND lon != 0.0;
      `;
      await bigquery.query({ query: transferSql });

      // Dropear tabla de staging
      console.log(`Eliminando tabla staging temporal...`);
      await bigquery.query({ query: `DROP TABLE \`${datasetId}.${stagingTableName}\`` });

      // Verificar conteo en GPS_POSITIONS
      const [gpsRows] = await bigquery.query({
        query: `SELECT COUNT(*) as count FROM \`${datasetId}.GPS_POSITIONS\``
      });
      console.log(`✅ Carga de GPS_POSITIONS completada. Total registros: ${gpsRows[0].count}`);
    } else {
      console.warn(`⚠️ Archivo gps_positions.csv no encontrado en ${gpsCsvPath}.`);
    }

    console.log('\n=== CARGA DE DATOS REALES A BIGQUERY COMPLETADA CON ÉXITO ===');
  } catch (error) {
    console.error('Error durante la carga de CSVs a BigQuery:', error);
    process.exit(1);
  }
}

loadCsvs();
