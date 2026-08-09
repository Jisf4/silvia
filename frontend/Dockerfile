FROM nginx:alpine

# Copiar la configuración personalizada de Nginx
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos pre-compilados localmente
COPY frontend/dist /usr/share/nginx/html

# Exponer el puerto estándar de Cloud Run (8080)
EXPOSE 8080

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
