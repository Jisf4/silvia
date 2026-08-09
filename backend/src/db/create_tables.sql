-- DDL de BigQuery para el Proyecto SILVIA (Virgen de la Estrella SAC)
-- Nota: BigQuery soporta llaves primarias y foráneas de manera INFORMATIVA (NOT ENFORCED).
-- Se asume un dataset llamado 'silvia_dataset'. Reemplazar si es necesario.

-- Crear Tabla CLIENTES
CREATE OR REPLACE TABLE `silvia_dataset.CLIENTES` (
  id STRING PRIMARY KEY NOT ENFORCED,
  nombre STRING
);

-- Crear Tabla MATERIALES
CREATE OR REPLACE TABLE `silvia_dataset.MATERIALES` (
  id STRING PRIMARY KEY NOT ENFORCED,
  nombre STRING
);

-- Crear Tabla VEHICULOS
CREATE OR REPLACE TABLE `silvia_dataset.VEHICULOS` (
  id STRING PRIMARY KEY NOT ENFORCED,
  placa STRING,
  tipo STRING,
  remolque STRING,
  marca STRING,
  modelo STRING,
  motor STRING,
  n_serie STRING,
  device_id STRING,
  tipo_combustible STRING,
  anio_fabricacion INT64,
  anio_modelo INT64,
  capacidad_toneladas FLOAT64,
  conductor STRING
);

-- Crear Tabla UBICACIONES
CREATE OR REPLACE TABLE `silvia_dataset.UBICACIONES` (
  id STRING PRIMARY KEY NOT ENFORCED,
  cliente_id STRING REFERENCES `silvia_dataset.CLIENTES`(id) NOT ENFORCED,
  nombre STRING,
  tipo STRING,
  lat FLOAT64,
  lon FLOAT64
);

-- Crear Tabla CONDUCTORES
CREATE OR REPLACE TABLE `silvia_dataset.CONDUCTORES` (
  id STRING PRIMARY KEY NOT ENFORCED,
  vehiculo_id STRING REFERENCES `silvia_dataset.VEHICULOS`(id) NOT ENFORCED,
  nombre STRING,
  edad INT64,
  dni INT64,
  estado STRING,
  fecha_ingreso DATE,
  fecha_salida DATE
);

-- Crear Tabla VIAJES
CREATE OR REPLACE TABLE `silvia_dataset.VIAJES` (
  id INT64 PRIMARY KEY NOT ENFORCED,
  vehiculo_id STRING REFERENCES `silvia_dataset.VEHICULOS`(id) NOT ENFORCED,
  vehiculo_des STRING,
  cliente_id STRING REFERENCES `silvia_dataset.CLIENTES`(id) NOT ENFORCED,
  cliente_des STRING,
  material_id STRING REFERENCES `silvia_dataset.MATERIALES`(id) NOT ENFORCED,
  material_des STRING,
  conductor_id STRING REFERENCES `silvia_dataset.CONDUCTORES`(id) NOT ENFORCED,
  conductor_des STRING,
  fecha TIMESTAMP,
  origen STRING REFERENCES `silvia_dataset.UBICACIONES`(id) NOT ENFORCED,
  origen_des STRING,
  destino STRING REFERENCES `silvia_dataset.UBICACIONES`(id) NOT ENFORCED,
  destino_des STRING,
  guia_cliente STRING,
  guia_transportista STRING,
  distancia_km FLOAT64,
  toneladas FLOAT64,
  flete FLOAT64,
  monto_sin_igv FLOAT64,
  gasto FLOAT64
);

-- Crear Tabla COMBUSTIBLE
CREATE OR REPLACE TABLE `silvia_dataset.COMBUSTIBLE` (
  id INT64 PRIMARY KEY NOT ENFORCED,
  vehiculo_id STRING REFERENCES `silvia_dataset.VEHICULOS`(id) NOT ENFORCED,
  fecha TIMESTAMP,
  hora TIMESTAMP,
  galones_despachados FLOAT64,
  monto_despachado FLOAT64,
  precio_unitario FLOAT64
);

-- Crear Tabla GPS_POSITIONS
CREATE OR REPLACE TABLE `silvia_dataset.GPS_POSITIONS` (
  id INT64 PRIMARY KEY NOT ENFORCED,
  vehiculo_id STRING REFERENCES `silvia_dataset.VEHICULOS`(id) NOT ENFORCED,
  timestamp_gps TIMESTAMP,
  estado STRING,
  velocidad NUMERIC,
  odometro NUMERIC,
  geom GEOGRAPHY
);

-- Crear Tabla TRIP_FEATURES
CREATE OR REPLACE TABLE `silvia_dataset.TRIP_FEATURES` (
  viaje_id INT64 PRIMARY KEY NOT ENFORCED REFERENCES `silvia_dataset.VIAJES`(id) NOT ENFORCED,
  velocidad_promedio NUMERIC,
  velocidad_maxima NUMERIC,
  combustible_litros NUMERIC,
  utilidad NUMERIC
);

-- Crear Tabla MODEL_PREDICTIONS
CREATE OR REPLACE TABLE `silvia_dataset.MODEL_PREDICTIONS` (
  model_id INT64 PRIMARY KEY NOT ENFORCED,
  vehiculo_id STRING REFERENCES `silvia_dataset.VEHICULOS`(id) NOT ENFORCED,
  fecha_prediccion TIMESTAMP,
  valor_variables STRING,
  valor_predicho FLOAT64,
  valor_real FLOAT64,
  error_pct FLOAT64
);

-- Crear Tabla MANTENIMIENTOS
CREATE OR REPLACE TABLE `silvia_dataset.MANTENIMIENTOS` (
  id INT64 PRIMARY KEY NOT ENFORCED,
  vehiculo_id STRING REFERENCES `silvia_dataset.VEHICULOS`(id) NOT ENFORCED,
  placa STRING,
  fecha DATE,
  tipo_mantenimiento STRING, -- Ejemplo: 'Inspeccion Neumaticos', 'Reparacion Mecanica'
  detalle STRING,            -- Observación de la reparación o inspección
  estado STRING,             -- Ejemplo: 'Completado', 'Inspeccionado'
  medida_llanta STRING,      -- Si aplica
  posicion_llanta STRING     -- Si aplica
);

-- Crear Tabla LIQUIDACIONES
CREATE OR REPLACE TABLE `silvia_dataset.LIQUIDACIONES` (
  id STRING PRIMARY KEY NOT ENFORCED,
  liquidacion_nro STRING,
  transportista STRING,
  fecha DATE,
  nro_guia STRING,
  placa STRING,
  vehiculo_id STRING,
  insumo STRING,
  material_id STRING,
  peso_seco NUMERIC,
  peso_humedo NUMERIC,
  monto_total NUMERIC,
  flete NUMERIC,
  ruta STRING,
  origen STRING,
  destino STRING,
  fecha_carga TIMESTAMP
);



