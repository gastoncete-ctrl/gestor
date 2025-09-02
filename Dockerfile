# Usa una imagen oficial de Python como base
FROM python:3.13-slim

# Establece la carpeta de trabajo dentro del contenedor
WORKDIR /app

# Copia el archivo requirements.txt y los instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del código de la aplicación
COPY . .

# Define la variable de entorno para que Flask sepa dónde está el archivo de la aplicación
ENV FLASK_APP=app.py

# Exponemos el puerto 8080 que usará Cloud Run
EXPOSE 8080

# Comando para ejecutar la aplicación con un servidor web de producción
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "app:app"]