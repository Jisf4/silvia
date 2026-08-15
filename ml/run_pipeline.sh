#!/bin/bash
# Pipeline de Machine Learning para Detección de Anomalías de Combustible
# Virgen de la Estrella SAC - Dashboard SILVIA
set -e

# Definir variables de entorno y rutas
PYTHON_EXEC="/home/josue/.conda/envs/silvia/bin/python"
ML_DIR="/home/josue/Documents/SILVIA/project/ml"

echo "========================================================================"
echo "      INICIANDO PIPELINE INTEGRADO DE MACHINE LEARNING DE COMBUSIBLE    "
echo "========================================================================"

echo -e "\n[PASO 1/3] Ejecutando Análisis de Datos (EDA) e Integrando Fuentes..."
$PYTHON_EXEC "$ML_DIR/ml_dataset_builder.py"

echo -e "\n[PASO 2/3] Entrenando y Comparando 15 Técnicas de Modelos en Paralelo..."
$PYTHON_EXEC "$ML_DIR/ml_model_trainer.py"

echo -e "\n[PASO 3/3] Detectando Anomalías y Diagnosticando Causas Probables..."
$PYTHON_EXEC "$ML_DIR/ml_anomaly_detector.py"

echo -e "\n[PASO 4/4] Ejecutando análisis explicativo SHAP y regenerando informes..."
$PYTHON_EXEC "$ML_DIR/generate_shap_analysis.py"
$PYTHON_EXEC "$ML_DIR/generate_report.py"
$PYTHON_EXEC "$ML_DIR/generate_docx_report.py"

echo -e "\n========================================================================"
echo "     ¡PIPELINE DE MACHINE LEARNING EJECUTADO Y COMPLETADO CON ÉXITO!    "
echo "========================================================================"
