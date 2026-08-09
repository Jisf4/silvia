# SILVIA (Sistema Integrado Logístico para Volquetes con Inteligencia Artificial) - Plataforma de optimización y control de flota de transporte

SILVIA es una plataforma web y conversacional de nivel empresarial diseñada para la optimización de rutas, control de telemetría GPS, seguimiento de viajes y detección inteligente de anomalías de combustible para flotas de carga pesada.

La plataforma integra un **Dashboard ejecutivo en tiempo real** y un **Agente conversacional inteligente** alimentado por Agent Platform de Google Cloud (Vertex AI).

---

## Arquitectura general del sistema

El sistema sigue una arquitectura moderna dividida en tres capas principales:

1. **Frontend (React)**: Interfaz de usuario premium diseñada con una estética de alto impacto visual (modo oscuro, gráficos dinámicos de rendimiento y telemetría de vehículos en tiempo real).
2. **Backend (Node.js & Express)**: Microservicio encargado de la ingesta de posiciones GPS, geofencing determinístico en tiempo real, ejecución del algoritmo de planificación y endpoints de reportería.
3. **Capa de datos (Google BigQuery)**: Almacén de datos analítico (Data Warehouse) donde se aloja el histórico de viajes, recargas de combustible (GNV/Diesel), peajes y métricas consolidadas de la flota.

---

## Funcionalidades clave

### 1. Ingesta GPS y geofencing en tiempo real
El backend procesa constantemente las coordenadas de la flota. Al cruzar las coordenadas con geocercas poligonales de canteras y plantas de descarga, el sistema detecta de forma automática:
- El inicio y fin de cada viaje.
- El estado operativo del vehículo ("Carga en cantera", "En ruta", "Descarga en planta", "Garaje").
- Registro automático de viajes completados e inyección instantánea en BigQuery.

### 2. Algoritmo híbrido de planificación de viajes (3 Fases)
Optimiza la asignación de viajes diarios de la flota según las demandas de volumen (m³) de cada cantera:
- **Fase A (Pedidos prioritarios)** y **Fase B (Pedidos normales)**.
- **Asignación local y apoyo rotativo**: Prioriza vehículos asignados a la base y gestiona el apoyo de camiones externos según su perfil de rotación.
- **Dynamic Fit y Round-Robin**: Selecciona el subconjunto óptimo de camiones para cubrir la demanda con el menor exceso de capacidad y distribuye los viajes de forma uniforme entre ellos para balancear la carga de trabajo.
- **Prevención de transferencias cruzadas**: Evita tránsitos vacíos innecesarios entre bases.

### 3. Detección inteligente de anomalías de combustible
Utilizando modelos de Machine Learning, el sistema analiza el consumo real frente al consumo esperado (calculado por rendimiento óptimo según distancia y peso transportado) para alertar sobre desvíos críticos o posibles pérdidas de combustible.

---

## Capa de inteligencia artificial y agentes

SILVIA utiliza un agente inteligente avanzado basado en **Gemini 2.5 Flash** a través de **Vertex AI SDK** para interactuar de forma natural con los operadores humanos a través de dos interfaces: **Chat Web integrado** y **Bot de Telegram**.

### Arquitectura del agente Text-to-SQL (Híbrido)

Para evitar alucinaciones matemáticas y garantizar una precisión del 100% en los reportes financieros u operativos, el agente implementa un esquema de **Function calling**:

```text
               [ Operador hace una consulta cuantitativa ]
              (Ej: "¿Cuál fue la utilidad neta en mayo de 2026?")
                                   │
                                   ▼
                       [ Vertex AI (Gemini 2.5) ]
              Identifica que requiere datos cuantitativos.
              Consulta el esquema de BigQuery provisto en
              las instrucciones del sistema (prompt.txt).
                                   │
                                   ▼
                       [ Generación de SQL ]
              Gemini genera el query SQL preciso de BigQuery.
                                   │
                                   ▼
                     [ Ejecución del Tool (execute_sql) ]
              Llama al webhook del backend para correr el 
              query de forma segura y solo lectura.
                                   │
                                   ▼
                       [ Formateo de Respuesta ]
              Gemini recibe las filas de datos reales, realiza
              el análisis cualitativo y redacta la respuesta.
```

### Configuración del agente:
* **Instrucciones del sistema (`prompt.txt`)**: Contiene el diccionario detallado del esquema de las 14 tablas en BigQuery, reglas de negocio específicas (ej: cálculo de utilidad neta como `facturacion - gastos - combustible - peajes`) y manejo del año por defecto de la plataforma (**2026**).
* **Gestión de sesiones**: El backend cuenta con una caché de sesiones en memoria que asocia el `chatId` del usuario de Telegram con su historial de conversación, lo que permite mantener un contexto fluido y responder preguntas de seguimiento (ej: *"¿y de qué cantera hizo más viajes?"*).
* **Alertas activas**: Al finalizar un viaje o cerrar la jornada, el backend empuja de forma proactiva alertas de resumen y estadísticas directo al grupo de Telegram utilizando la API del bot.

---

### Configuración crítica de despliegue
Para asegurar que los hilos de ingesta GPS en segundo plano y el bot conversacional de Telegram (Long Polling) permanezcan activos de forma continua, el despliegue del backend utiliza la opción de **CPU siempre asignada (`--no-cpu-throttling`)**:


### Variables de entorno requeridas:
- `GOOGLE_CLOUD_PROJECT`: ID del proyecto de GCP.
- `BQ_DATASET`: Dataset de BigQuery (ej: `silvia_dataset`).
- `TELEGRAM_BOT_TOKEN`: Token API proporcionado por BotFather.
- `TELEGRAM_CHAT_ID`: ID del grupo o chat donde se enviarán las notificaciones operativas automáticas.
- `SERVER_PUBLIC_URL`: URL pública autogenerada de Cloud Run (usada para la redirección de webhooks).
