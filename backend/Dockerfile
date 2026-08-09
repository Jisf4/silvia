# Usar una imagen base oficial de Node.js ligera
FROM node:20-slim

# Instalar dependencias del sistema operativo: Python 3, pip y poppler-utils (pdftotext)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Establecer directorio de trabajo para la aplicación Node.js
WORKDIR /app

# Copiar archivos de dependencias de Node.js
COPY backend/package*.json ./

# Instalar dependencias de producción de Node.js
RUN npm ci --omit=dev

# Copiar la carpeta del backend
COPY backend/src ./src

# Copiar el prompt del agente
COPY backend/docs/prompt.txt ./docs/prompt.txt

# Copiar scripts de Python del nivel superior necesarios para el backend
COPY process_upload_pdf.py ./

# Copiar la base de datos local de CSVs de consulta/lookup
COPY processed_data ./processed_data

# Crear entorno virtual de Python e instalar librerías requeridas
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir google-genai pandas pypdf

# Configurar variables de entorno para que apunten a las rutas de producción en el contenedor
ENV PORT=8080
ENV PYTHON_CMD="python3"
ENV PROCESS_PDF_SCRIPT="/app/process_upload_pdf.py"
ENV VEHICLES_CSV_PATH="/app/processed_data/vehiculos.csv"
ENV MATERIALS_CSV_PATH="/app/processed_data/materiales.csv"
ENV TMP_DIR="/app/tmp"
ENV EXPORT_DIR="/app/exports"
ENV GPS_CSV_PATH="/app/processed_data/prueba_gps.csv"

# Exponer el puerto estándar
EXPOSE 8080

# Iniciar la aplicación backend
CMD ["node", "src/index.js"]
