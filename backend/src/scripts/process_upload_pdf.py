import os
import sys
import re
import json
import time
import socket
import subprocess
import io
import pandas as pd
from datetime import datetime
from google import genai
from google.genai import types
from pypdf import PdfReader, PdfWriter

# Set socket timeout
socket.setdefaulttimeout(120)

PROJECT_ID = "project-silvia-500416"

# Load lookups
def clean_plate(plate):
    if not plate or not isinstance(plate, str):
        return ""
    cleaned = re.sub(r'[^A-Z0-9]', '', plate.upper())
    if cleaned in ('NA', 'TOTAL', 'RESUMEN', 'PROMEDIO', 'FLETE', 'GUIA', 'GUIDE', 'CANT', 'CANTERA'):
        return ""
    return cleaned

def load_catalogs():
    # Load Vehículos
    veh_path = os.environ.get("VEHICLES_CSV_PATH", "/home/josue/Documents/SILVIA/processed_data/vehiculos.csv")
    placa_to_id = {}
    if os.path.exists(veh_path):
        df_veh = pd.read_csv(veh_path)
        for row in df_veh.itertuples():
            cp = clean_plate(row.placa)
            if cp:
                placa_to_id[cp] = row.id
                
    # Load Materiales
    mat_path = os.environ.get("MATERIALS_CSV_PATH", "/home/josue/Documents/SILVIA/processed_data/materiales.csv")
    materiales_list = []
    if os.path.exists(mat_path):
        df_mat = pd.read_csv(mat_path)
        for row in df_mat.itertuples():
            materiales_list.append({
                "id": row.id,
                "nombre": str(row.nombre).strip().upper()
            })
            
    return placa_to_id, materiales_list

def find_material_id(insumo, materiales_list):
    if not insumo:
        return None
    insumo_upper = str(insumo).strip().upper()
    insumo_upper = insumo_upper.replace("PUSOLANA", "PUZOLANA").replace("M.PRIMA", "MATERIA PRIMA").replace("OVER FINO", "OVERFINO")
    
    # Direct match
    for mat in materiales_list:
        mat_name = mat["nombre"]
        if mat_name in insumo_upper or insumo_upper in mat_name:
            return mat["id"]
            
    # Word match
    insumo_words = [w for w in re.split(r'\W+', insumo_upper) if len(w) > 3]
    for mat in materiales_list:
        mat_name = mat["nombre"]
        for word in insumo_words:
            if word in mat_name or mat_name in word:
                return mat["id"]
    return None

def extract_routes_from_pdf(pdf_path):
    """
    Parse PDF with pdftotext -layout to find ORIGEN and DESTINO headers per guide.
    """
    try:
        result = subprocess.run(["pdftotext", "-layout", pdf_path, "-"], capture_output=True, text=True, check=True)
        text = result.stdout
    except Exception as e:
        sys.stderr.write(f"[ERROR] pdftotext failed: {e}\n")
        return {}

    lines = text.split("\n")
    current_origen = None
    current_destino = None
    guide_map = {}

    for line in lines:
        if "ORIGEN:" in line:
            parts = line.split("ORIGEN:")
            if len(parts) > 1:
                current_origen = parts[1].strip()
        if "DESTINO:" in line:
            parts = line.split("DESTINO:")
            if len(parts) > 1:
                current_destino = parts[1].strip()

        # Match guide like '191 / 0561711'
        match = re.search(r"(\d{3})\s*/\s*(\d{5,8})", line)
        if match:
            guia_normalized = f"{match.group(1)}/{match.group(2)}"
            guide_map[guia_normalized] = (current_origen, current_destino)

    return guide_map

def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python process_upload_pdf.py <pdf_path>\n")
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        sys.stderr.write(f"File not found: {pdf_path}\n")
        sys.exit(1)
        
    placa_to_id, materiales_list = load_catalogs()
    routes_map = extract_routes_from_pdf(pdf_path)
    
    filename = os.path.basename(pdf_path)
    match_nro = re.search(r'(\d+)', filename)
    liquidacion_nro = match_nro.group(1) if match_nro else "DESCONOCIDO"
    
    # Initialize Vertex AI client
    client_gemini = genai.Client(
        vertexai=True,
        project=PROJECT_ID,
        location='us-central1',
        http_options=types.HttpOptions(timeout=300000)
    )
    
    # Read PDF using pypdf to process page-by-page
    try:
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        sys.stderr.write(f"[INFO] PDF has {total_pages} pages. Processing page-by-page...\n")
    except Exception as e:
        sys.stderr.write(f"[ERROR] Failed to read PDF with pypdf: {e}\n")
        sys.exit(1)
        
    processed_records = []
    
    for page_idx in range(total_pages):
        sys.stderr.write(f"[INFO] Processing page {page_idx + 1} of {total_pages}...\n")
        
        # Get single page bytes
        try:
            writer = PdfWriter()
            writer.add_page(reader.pages[page_idx])
            bytes_io = io.BytesIO()
            writer.write(bytes_io)
            page_bytes = bytes_io.getvalue()
        except Exception as e:
            sys.stderr.write(f"[ERROR] Failed to extract bytes for page {page_idx + 1}: {e}. Skipping...\n")
            continue
            
        # Pacing delay to stay well within Vertex AI RPM limits (1.5 seconds between calls)
        time.sleep(1.5)

        # Prompt and generate content for this page with robust retry backoff
        max_retries = 5
        retry_delay = 5
        response = None
        
        for attempt in range(1, max_retries + 1):
            try:
                response = client_gemini.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[
                        types.Part.from_bytes(data=page_bytes, mime_type='application/pdf'),
                        "Extrae de manera sumamente precisa y detallada todas las guías de transporte individuales listadas en esta página de pre-liquidación. "
                        "Asegúrate de ignorar por completo cualquier tabla o fila que pertenezca a la sección 'RESUMEN', resúmenes consolidados, totales generales o promedios. "
                        "Responde únicamente con una tabla Markdown que contenga las siguientes columnas: "
                        "fecha, nro_guia, placa, peso_seco, peso_humedo, monto_total, insumo. "
                        "No agregues texto explicativo, notas ni introducciones. Solo la tabla markdown."
                    ],
                    config=types.GenerateContentConfig(
                        temperature=0.0
                    )
                )
                break
            except Exception as e:
                import random
                # Adding randomized jitter to prevent resource contention
                jitter = random.uniform(0.5, 2.0)
                if attempt < max_retries:
                    sys.stderr.write(f"[WARN] Attempt {attempt} failed on page {page_idx + 1}: {e}. Retrying in {retry_delay + jitter:.2f}s...\n")
                    time.sleep(retry_delay + jitter)
                    retry_delay *= 2
                else:
                    sys.stderr.write(f"[ERROR] Gemini API failed on page {page_idx + 1} after {max_retries} attempts: {e}. Skipping page...\n")
                    response = None
                    
        if not response or not response.text:
            continue
            
        text = response.text
        lines = [line.strip() for line in text.split("\n") if "|" in line]
        lines = [l for l in lines if not re.match(r'^[\s|:-]+$', l)]
        
        if len(lines) < 2:
            sys.stderr.write(f"[WARN] No valid markdown table detected on page {page_idx + 1}\n")
            continue
            
        header = [col.strip().lower() for col in lines[0].split("|")[1:-1]]
        required_cols = {"fecha", "nro_guia", "placa", "peso_seco", "peso_humedo", "monto_total", "insumo"}
        if not required_cols.issubset(set(header)):
            sys.stderr.write(f"[WARN] Invalid columns on page {page_idx + 1}: {header}. Skipping table...\n")
            continue
            
        for line in lines[1:]:
            cols = [col.strip() for col in line.split("|")[1:-1]]
            if len(cols) != len(header):
                continue
                
            row = dict(zip(header, cols))
            
            # Validar que no sea fila de totales o resumen
            nro_guia = row.get("nro_guia", "").strip()
            if not nro_guia or "total" in nro_guia.lower() or "resumen" in nro_guia.lower() or "promedio" in nro_guia.lower():
                continue
            
            # Parse date
            fecha_raw = row.get("fecha", "").strip()
            fecha_clean = fecha_raw
            for fmt in ("%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d"):
                try:
                    fecha_clean = datetime.strptime(fecha_raw, fmt).strftime("%Y-%m-%d")
                    break
                except ValueError:
                    pass
                    
            # Clean plate and lookup ID
            placa_raw = row.get("placa", "")
            placa_clean = clean_plate(placa_raw)
            if not placa_clean:
                continue
            vehiculo_id = placa_to_id.get(placa_clean, None)
            
            # Clean material and lookup ID
            insumo_raw = row.get("insumo", "")
            material_id = find_material_id(insumo_raw, materiales_list)
            
            # Clean float helper
            def clean_float(val):
                if not val:
                    return 0.0
                try:
                    cleaned = re.sub(r'[^\d.]', '', val.replace(',', ''))
                    return float(cleaned) if cleaned else 0.0
                except ValueError:
                    return 0.0
                    
            peso_seco = clean_float(row.get("peso_seco"))
            peso_humedo = clean_float(row.get("peso_humedo"))
            monto_total = clean_float(row.get("monto_total"))
            
            # Unique ID
            nro_guia_clean = re.sub(r'[^a-zA-Z0-9]', '', row.get("nro_guia", ""))
            unique_id = f"{liquidacion_nro}-{nro_guia_clean}"
            
            # Resolve routes from pdftotext layout map
            guia_clean = row.get("nro_guia", "").replace(" ", "")
            origen, destino = routes_map.get(guia_clean, (None, None))
            
            record = {
                "id": unique_id,
                "liquidacion_nro": liquidacion_nro,
                "transportista": "VIRGEN DE ESTRELLA S.A.C.",
                "fecha": fecha_clean,
                "nro_guia": row.get("nro_guia", "").replace(" ", ""),
                "placa": placa_clean,
                "vehiculo_id": vehiculo_id,
                "insumo": insumo_raw,
                "material_id": material_id,
                "peso_seco": peso_seco,
                "peso_humedo": peso_humedo,
                "monto_total": monto_total,
                "origen": origen,
                "destino": destino
            }
            processed_records.append(record)
            
    print(json.dumps(processed_records))

if __name__ == "__main__":
    main()
