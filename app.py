from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import google.generativeai as genai
import os
import json
import datetime
import mysql.connector
from dotenv import load_dotenv # <-- AGREGAR ESTA LÍNEA
from datetime import datetime, timezone, timedelta
import pytz # ✅ Agrega esta línea
import io
import pandas as pd
import csv
from sqlalchemy import text
from dotenv import load_dotenv
from sqlalchemy import or_, and_ # Asegúrate de que esta línea esté al inicio del archivo

# Cargar las variables de entorno del archivo .env
load_dotenv()

# Importaciones para Google Drive
from googleapiclient.http import MediaInMemoryUpload
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Importa PyMySQL para que SQLAlchemy pueda usarlo
import pymysql
pymysql.install_as_MySQLdb()

app = Flask(__name__)
app.config['SQLALCHEMY_ECHO'] = True

# Configura la conexión a tu base de datos MySQL
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'una_clave_secreta_muy_segura'
db = SQLAlchemy(app)

# Configura la API de Gemini con tu clave
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))


# --- Modelos de SQLAlchemy para las tablas migradas ---

class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    correo = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    def __repr__(self):
        return f'<Usuario {self.correo}>'

class Estructura(db.Model):
    __tablename__ = 'estructuras'
    id_estructura = db.Column(db.Integer, primary_key=True)
    estructura = db.Column(db.String(255))
    
class Subestructura(db.Model):
    __tablename__ = 'subestructuras'
    id_subestructura = db.Column(db.Integer, primary_key=True)
    id_estructura = db.Column(db.Integer, db.ForeignKey('estructuras.id_estructura'))
    subestructura = db.Column(db.String(255))

class Proveedor(db.Model):
    __tablename__ = 'proveedores'
    id_proveedor = db.Column(db.Integer, primary_key=True)
    nombre_proveedores = db.Column(db.String(255))
    dni_cuit = db.Column('DNI/CUIT', db.String(255))
    autorizados = db.Column('AUTORIZADOS', db.String(255))

class Gasto(db.Model):
    __tablename__ = 'gastos'
    id_gastos = db.Column(db.Integer, primary_key=True)
    fecha_del_gasto = db.Column('FECHA DEL GASTO', db.Date)
    detalle = db.Column('DETALLE', db.Text)
    importe = db.Column('IMPORTE', db.Float)
    id_estructura = db.Column(db.Integer, db.ForeignKey('estructuras.id_estructura'))
    id_subestructura = db.Column(db.Integer, db.ForeignKey('subestructuras.id_subestructura'))
    id_proveedor = db.Column(db.Integer, db.ForeignKey('proveedores.id_proveedor'))
    n_factura = db.Column('N FACTURA', db.String(255))
    # ✅ CORREGIR ESTA LÍNEA
    n_de_semana_del_consumo = db.Column('N DE SEMANA DEL CONSUMO', db.Integer)
    id_orden = db.Column('id_orden', db.Integer)
    fecha_de_pago = db.Column('FECHA DE PAGO', db.Date)
    numero_de_semana_del_pago = db.Column('NUMERO DE SEMANA DEL PAGO', db.Integer)
    informe = db.Column('INFORME', db.Text)
    moneda = db.Column('MONEDA', db.String(50))
    cot = db.Column('COT.', db.Float)
    url = db.Column('url', db.Text)
    tipo = db.Column('tipo_de_movimiento', db.String(12))
    percent_comision = db.Column('percent_comision', db.Float)
    gastos_bancarios = db.Column('gastos_bancarios', db.Float)    

    
    estructura = db.relationship('Estructura')
    subestructura = db.relationship('Subestructura')
    proveedor = db.relationship('Proveedor')
    
    def to_dict(self):
        return {
            "id_gastos": self.id_gastos,
            "fecha_gasto": self.fecha_del_gasto.isoformat() if self.fecha_del_gasto else None,
            "descripcion": self.detalle,
            "importe": self.importe,
            "semana_consumo": self.n_de_semana_del_consumo,
            "fecha_pago": self.fecha_de_pago.isoformat() if self.fecha_de_pago else None,
            "semana_pago": self.numero_de_semana_del_pago,
            "orden_pago": self.id_orden,
            "estado": 'Pagado' if self.id_orden is not None and self.id_orden > 0 else 'Pendiente',
            "informe": self.informe,
            "moneda": self.moneda,
            "cotizacion": self.cot,
            "total": (self.importe / self.cot) if self.cot is not None and self.cot > 0 else (self.importe if self.moneda == 'USD' else None),
            "ver_factura": self.url,
            "id_proveedor": self.id_proveedor,
            "proveedor": self.proveedor.nombre_proveedores if self.proveedor else None, # ✅ CAMBIO CRÍTICO AQUÍ
            "id_estructura": self.id_estructura,
            "estructura": self.estructura.estructura if self.estructura else None,
            "id_subestructura": self.id_subestructura,
            "subestructura": self.subestructura.subestructura if self.subestructura else None,
            "tipo_de_movimiento": self.tipo,
            "percent_comision": self.percent_comision,
            "gastos_bancarios": self.gastos_bancarios
        }



@app.route('/api/gastos_pagos/all', methods=['GET'])
def get_all_gastos_for_download():
    try:
        # Realiza uniones (joins) para obtener los datos de las tablas relacionadas
        gastos = db.session.query(
            Gasto,
            Estructura.estructura,
            Subestructura.subestructura,
            Proveedor.nombre_proveedores.label('proveedor_nombre')
        ).outerjoin(Estructura, Gasto.id_estructura == Estructura.id_estructura) \
         .outerjoin(Subestructura, Gasto.id_subestructura == Subestructura.id_subestructura) \
         .outerjoin(Proveedor, Gasto.id_proveedor == Proveedor.id_proveedor) \
         .order_by(Gasto.fecha_del_gasto.desc()) \
         .all()
        
        gastos_list = []
        for gasto, estructura_nombre, subestructura_nombre, proveedor_nombre in gastos:
            gasto_dict = gasto.to_dict()
            gasto_dict['estructura'] = estructura_nombre
            gasto_dict['subestructura'] = subestructura_nombre
            gasto_dict['proveedor'] = proveedor_nombre
            gastos_list.append(gasto_dict)
        
        return jsonify({'gastos': gastos_list}), 200
    except Exception as e:
        print(f"Error al obtener todos los gastos con detalles: {e}")
        return jsonify({'error': 'Error al obtener todos los gastos con detalles.'}), 500











@app.route("/api/filtered_gastos", methods=["POST"])
def filtered_gastos():
    try:
        data = request.get_json()
        page = data.get("page", 1)
        per_page = data.get("per_page", 16)
        estado = data.get("estado")
        filters_data = data.get("filters", {})

        sql_query = "SELECT * FROM gastos"
        where_clauses = []
        params = {}

        # Mapeo de nombres de campo del frontend a nombres de columna de la DB
        db_column_map = {
            "fecha_gasto": "`FECHA DEL GASTO`",
            "descripcion": "`DETALLE`",
            "estructura": "`ESTRUCTURA`",
            "subestructura": "`SUBESTRUCTURA`",
            "importe": "`IMPORTE`",
            "semana_consumo": "`N DE SEMANA DEL CONSUMO`",
            "fecha_pago": "`FECHA DE PAGO`",
            "semana_pago": "`NUMERO DE SEMANA DEL PAGO`",
            "orden_pago": "`id_orden`",
            "estado": "`ESTADO`",
            "proveedor": "`PROVEEDOR/AUTORIZADO`",
            "informe": "`INFORME`",
            "moneda": "`MONEDA`",
            "cotizacion": "`COT.`",
            "total": "`TOTAL`",
        }

        if estado:
            where_clauses.append("`ESTADO` = :estado")
            params['estado'] = estado

        if filters_data and 'filters' in filters_data:
            for i, f in enumerate(filters_data['filters']):
                column_field = f['column']
                operator = f['operator']
                value = f['value']
                param_name = f'value{i}'

                db_column = db_column_map.get(column_field)

                if not db_column:
                    db_column = f"`{column_field}`"

                if operator == "es igual a":
                    where_clauses.append(f"{db_column} = :{param_name}")
                    params[param_name] = value
                elif operator == "no es igual a":
                    where_clauses.append(f"{db_column} != :{param_name}")
                    params[param_name] = value
                elif operator == "mayor que":
                    where_clauses.append(f"{db_column} > :{param_name}")
                    params[param_name] = value
                elif operator == "menor que":
                    where_clauses.append(f"{db_column} < :{param_name}")
                    params[param_name] = value
                elif operator == "contiene":
                    where_clauses.append(f"{db_column} LIKE :{param_name}")
                    params[param_name] = f"%{value}%"
                elif operator == "empieza con":
                    where_clauses.append(f"{db_column} LIKE :{param_name}")
                    params[param_name] = f"{value}%"
                elif operator == "termina con":
                    where_clauses.append(f"{db_column} LIKE :{param_name}")
                    params[param_name] = f"%{value}"

        if where_clauses:
            sql_query += " WHERE " + " AND ".join(where_clauses)

        sort = filters_data.get('sort')
        if sort and sort.get('column'):
            sort_column_field = sort['column']
            sort_order = sort['order']
            
            # Usamos el mapeo para obtener el nombre correcto de la columna
            db_sort_column = db_column_map.get(sort_column_field)

            # Si el mapeo existe, lo usamos.
            if db_sort_column:
                sql_query += f' ORDER BY {db_sort_column} {sort_order}'
            # Si no existe, usamos el nombre del frontend, asumiendo que es el nombre de la columna
            else:
                sql_query += f' ORDER BY `{sort_column_field}` {sort_order}'

        sql_query += f" LIMIT {per_page} OFFSET {(page - 1) * per_page}"

        with app.app_context():
            connection = db.engine.connect()
            result = connection.execute(text(sql_query), params)
            gastos = [dict(row._mapping) for row in result.fetchall()]
            connection.close()

        total_records = db.session.query(Gasto).count()
        total_pages = (total_records + per_page - 1) // per_page

        return jsonify({"gastos": gastos, "total_pages": total_pages, "current_page": page}), 200

    except Exception as e:
        print(f"Error en la consulta de filtrado: {e}")
        return jsonify({"error": "Ocurrió un error al procesar tu solicitud."}), 500






  

# --- CONFIGURACIÓN DE GOOGLE DRIVE ---
# Reemplaza el ID de la carpeta
GOOGLE_DRIVE_FOLDER_ID = os.environ.get('GOOGLE_DRIVE_FOLDER_ID')
# Reemplaza el nombre del archivo de credenciales
GOOGLE_DRIVE_CREDENTIALS_FILE = os.environ.get('GOOGLE_DRIVE_CREDENTIALS_FILE')
SCOPES = ['https://www.googleapis.com/auth/drive']
# Reemplaza el nombre del archivo de token
TOKEN_FILE = os.environ.get('TOKEN_FILE')

def get_drive_service():
    creds = None
    
    # 1. Intenta obtener el token desde la variable de entorno.
    token_data_str = os.environ.get("GOOGLE_DRIVE_TOKEN_JSON")
    
    if token_data_str:
        # 2. Si el token existe, carga las credenciales.
        token_data = json.loads(token_data_str)
        creds = Credentials.from_authorized_user_info(info=token_data, scopes=SCOPES)
    
    # 3. Si no hay token, o el token no es válido, levanta un error.
    # En la nube, siempre debe haber un token válido.
    if not creds or not creds.valid:
        raise RuntimeError("Google Drive token not found.")
        
    return build("drive", "v3", credentials=creds)


def upload_to_drive(file_content, filename, mimetype):
    try:
        service = get_drive_service()
        
        file_metadata = {
            'name': filename,
            'parents': [GOOGLE_DRIVE_FOLDER_ID]
        }
        
        media = MediaInMemoryUpload(file_content, mimetype=mimetype)
        
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='webViewLink'
        ).execute()

        print(f'Archivo subido con éxito. URL: {file.get("webViewLink")}')
        return file.get('webViewLink')
        
    except HttpError as error:
        print(f'Ocurrió un error al subir el archivo: {error}')
        return None

def get_next_file_number():
    base_path = os.path.join(os.getcwd(), 'uploaded_files')
    if not os.path.exists(base_path):
        os.makedirs(base_path)

    files = [f for f in os.listdir(base_path) if os.path.isfile(os.path.join(base_path, f))]
    if not files:
        return 1

    numbers = []
    for file in files:
        name = os.path.splitext(file)[0]
        if name.isdigit():
            numbers.append(int(name))
            
    if not numbers:
        return 1

    return max(numbers) + 1

# --- Funciones actualizadas con SQLAlchemy ---

def get_estructuras():
    return Estructura.query.all()

def get_subestructuras(estructura_id):
    return Subestructura.query.filter_by(id_estructura=estructura_id).all()

def get_proveedores():
    return Proveedor.query.all()

@app.route("/")
def home():
    if 'user_id' in session:
        return redirect(url_for('main'))
    return render_template("index.html")

@app.route("/main")
def main():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template("main.html")

@app.route("/estructuras")
def estructuras():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template("estructuras.html")

@app.route("/proveedores")
def proveedores():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    proveedores_data = get_proveedores()
    return render_template("proveedores.html", proveedores=proveedores_data)

@app.route("/gastos")
def gastos():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    estructuras = get_estructuras()
    proveedores = get_proveedores()
    return render_template("gastos.html", estructuras=estructuras, proveedores=proveedores)

@app.route("/pagos")
def pagos():
    if 'user_id' not in session:
        return redirect(url_for('home'))
    return render_template("pagos.html")

@app.route("/register", methods=["POST"])
def register():
    correo = request.form.get("correo_registro")
    password = request.form.get("password_registro")
    
    if Usuario.query.filter_by(correo=correo).first():
        return "El correo ya está registrado.", 409
    
    hashed_password = generate_password_hash(password)
    
    nuevo_usuario = Usuario(correo=correo, password_hash=hashed_password)
    db.session.add(nuevo_usuario)
    db.session.commit()

    session['user_id'] = nuevo_usuario.id
    
    return redirect(url_for("main"))

@app.route("/login", methods=["POST"])
def login():
    correo = request.form.get("correo_login")
    password = request.form.get("password_login")
    
    usuario = Usuario.query.filter_by(correo=correo).first()
    
    if usuario and check_password_hash(usuario.password_hash, password):
        session['user_id'] = usuario.id
        return redirect(url_for("main"))
    else:
        return "Credenciales incorrectas.", 401

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('home'))

@app.route('/api/subestructuras/<int:estructura_id>')
def api_subestructuras(estructura_id):
    subestructuras = get_subestructuras(estructura_id)
    return jsonify([
        {"id_subestructura": s.id_subestructura, "subestructura": s.subestructura} 
        for s in subestructuras
    ])

@app.route('/api/analizar', methods=['POST'])
def analizar_archivo():
    if 'file' not in request.files:
        return jsonify({"error": "No se encontró el archivo"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No se seleccionó ningún archivo"}), 400
    
    try:
        # Volvemos a leer el contenido del archivo para el análisis
        file_content_for_gemini = file.read()
        file.seek(0) # Rebobinamos el puntero del archivo para la próxima lectura
        file_content_for_drive = file.read()

        # --- 1. Analizar el archivo con Gemini ---
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content([
            "Analiza este documento (PDF o imagen) y extrae la fecha, el monto total, el nombre del proveedor, número de factura (o de remito o de comprobante o de identificación de documento) y una breve descripción. El monto total debe ser un número con dos decimales, y la fecha en formato AAAA-MM-DD. Si no encuentras alguno de los datos, responde con un valor nulo para ese campo. El resultado debe estar en formato JSON. Solo incluye el JSON en la respuesta, sin texto adicional.",
            {
                'mime_type': file.mimetype,
                'data': file_content_for_gemini
            }
        ])

        if not response or not response.text:
            return jsonify({"error": "La API no devolvió una respuesta válida."}), 500

        try:
            start_index = response.text.find('{')
            end_index = response.text.rfind('}') + 1
            json_text = response.text[start_index:end_index]
            parsed_json = json.loads(json_text)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"La respuesta de la API no es un JSON válido. Error: {e}")
            print(f"Raw response: {response.text}")
            return jsonify({"error": "La respuesta de la API no es un JSON válido.", "raw_response": response.text}), 500
        
        # --- 2. Subir el archivo a Google Drive ---
        # Obtener el número consecutivo para el nombre del archivo
        siguiente_numero = get_next_file_number()
        # Usar el nombre original del archivo para obtener la extensión
        extension = file.filename.split('.')[-1]
        nuevo_nombre_archivo = f"{siguiente_numero}.{extension}"
        
        link_drive = upload_to_drive(file_content_for_drive, nuevo_nombre_archivo, file.mimetype)

        if not link_drive:
             return jsonify({"error": "Error al subir el archivo a Google Drive."}), 500

        # --- 3. Retornar la respuesta con el enlace de Drive ---
        fecha = parsed_json.get('fecha')
        descripcion = parsed_json.get('descripcion')
        monto = parsed_json.get('monto') or parsed_json.get('monto_total')
        proveedor_nombre = parsed_json.get('proveedor')
        numero_factura = parsed_json.get('numero_factura')
        
        return jsonify({
            "fecha": fecha,
            "descripcion": descripcion,
            "monto": monto,
            #"proveedor": proveedor_nombre,
            "numero_factura": numero_factura,
            "link_drive": link_drive
        }), 200

    except Exception as e:
        print(f"Error general en la función analizar_archivo: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/guardar_gasto', methods=['POST'])
def guardar_gasto():
    data = request.json
    fecha = data.get('fecha')
    descripcion = data.get('descripcion')
    monto = data.get('monto')
    moneda = data.get('moneda')
    id_estructura = data.get('id_estructura')
    id_subestructura = data.get('id_subestructura')
    id_proveedor = data.get('id_proveedor')
    numero_factura = data.get('numero_factura')
    semana_consumo = data.get('semana_consumo')
    link_drive = data.get('link_drive')
    tipo_de_movimiento = data.get('tipo_de_movimiento') 

    if not all([fecha, descripcion, monto, id_estructura, id_subestructura, id_proveedor]):
        return jsonify({"error": "Faltan datos para guardar el gasto."}), 400

    try:
        monto_float = float(monto)
    except (ValueError, TypeError):
        return jsonify({"error": "El monto no es un número válido."}), 400

    try:
        nuevo_gasto = Gasto(
            fecha_del_gasto=fecha,
            detalle=descripcion,
            importe=monto_float,
            moneda=moneda,
            id_estructura=id_estructura,
            id_subestructura=id_subestructura,
            id_proveedor=id_proveedor,
            n_factura=numero_factura,
            n_de_semana_del_consumo=semana_consumo,
            url=link_drive,
            tipo=tipo_de_movimiento,
        )
        db.session.add(nuevo_gasto)
        db.session.commit()
        
        return jsonify({"success": "Gasto guardado exitosamente."}), 200

    except Exception as e:
        db.session.rollback()  # ✅ Importante: revierte la transacción en caso de error
        error_message = f"Error al guardar en la base de datos: {e}"
        print(error_message) # ✅ Imprime el error exacto en la consola del servidor
        return jsonify({"error": "Hubo un error al guardar los datos en la base de datos."}), 500

@app.route('/api/proveedores', methods=['GET'])
def api_proveedores():
    proveedores = get_proveedores()
    return jsonify([
        {"id_proveedor": p.id_proveedor, "nombre_proveedores": p.nombre_proveedores} 
        for p in proveedores
    ])

@app.route('/api/estructuras', methods=['GET'])
def api_estructuras():
    estructuras = Estructura.query.all()
    estructuras_list = []
    for estructura in estructuras:
        subestructuras = Subestructura.query.filter_by(id_estructura=estructura.id_estructura).all()
        estructuras_list.append({
            "id_estructura": estructura.id_estructura,
            "estructura": estructura.estructura,
            "subestructuras": [{"id_subestructura": s.id_subestructura, "subestructura": s.subestructura} for s in subestructuras]
        })
    return jsonify(estructuras_list)

@app.route('/api/proveedores/registrar', methods=['POST'])
def registrar_proveedor():
    data = request.json
    nombre = data.get('nombre')
    cuit = data.get('cuit')
    cbu_alias = data.get('cbu_alias')

    if not all([nombre, cuit, cbu_alias]):
        return jsonify({"error": "Faltan datos para registrar el proveedor."}), 400
    
    try:
        nuevo_proveedor = Proveedor(
            nombre_proveedores=nombre,
            dni_cuit=cuit,
            autorizados=cbu_alias
        )
        db.session.add(nuevo_proveedor)
        db.session.commit()
        
        return jsonify({"success": "Proveedor registrado exitosamente.", "id": nuevo_proveedor.id_proveedor}), 201
    
    except Exception as e:
        return jsonify({"error": f"Error al registrar el proveedor: {e}"}), 500

@app.route('/api/gastos_pagos', methods=['GET'])
def get_gastos_pagos():
    try:
        # Se obtiene la página y el estado de los parámetros de la URL
        page = request.args.get('page', 1, type=int)
        per_page = 14
        estado_filtro = request.args.get('estado', 'todo', type=str)
        
        query = db.session.query(
            Gasto.id_gastos,
            Gasto.fecha_del_gasto,
            Gasto.detalle,
            Gasto.importe,
            Gasto.n_de_semana_del_consumo,
            Gasto.id_orden,
            Gasto.fecha_de_pago,
            Gasto.numero_de_semana_del_pago,
            Gasto.n_factura,
            Gasto.informe,
            Gasto.moneda,
            Gasto.cot,
            Gasto.url,
            Gasto.id_estructura,
            Gasto.id_subestructura,
            Estructura.estructura,
            Subestructura.subestructura,
            Proveedor.nombre_proveedores
        ).outerjoin(Estructura, Gasto.id_estructura == Estructura.id_estructura)\
        .outerjoin(Subestructura, Gasto.id_subestructura == Subestructura.id_subestructura)\
        .outerjoin(Proveedor, Gasto.id_proveedor == Proveedor.id_proveedor)
        
        # Aplica el filtro de estado si no es "todo"
        if estado_filtro == 'pendiente':
            query = query.filter(Gasto.id_orden.is_(None) | (Gasto.id_orden == 0))
        elif estado_filtro == 'pagado':
            query = query.filter(Gasto.id_orden.isnot(None) & (Gasto.id_orden > 0))

        total_gastos = query.count()
        
        paginated_gastos = query.paginate(page=page, per_page=per_page, error_out=False)
        
        gastos_list = []
        for gasto in paginated_gastos.items:
            importe = gasto.importe if gasto.importe is not None else None
            cotizacion = gasto.cot if gasto.cot is not None else None
            
            # Realiza el cálculo del total convertido en USD
            total_convertido = None
            if gasto.moneda == 'USD':
                total_convertido = gasto.importe
            elif gasto.cot is not None and gasto.cot > 0:
                total_convertido = gasto.importe / gasto.cot
            
            estado = 'Pagado' if gasto.id_orden is not None and gasto.id_orden > 0 else 'Pendiente'
            
            gastos_list.append({
                "id_gastos": gasto.id_gastos,
                "fecha_gasto": gasto.fecha_del_gasto.strftime('%Y-%m-%d') if gasto.fecha_del_gasto else None,
                "descripcion": gasto.detalle,
                "estructura": gasto.estructura,
                "id_estructura": gasto.id_estructura,
                "subestructura": gasto.subestructura,
                "id_subestructura": gasto.id_subestructura,
                "importe": importe,
                "semana_consumo": gasto.n_de_semana_del_consumo,
                "orden_pago": gasto.id_orden,
                "fecha_pago": gasto.fecha_de_pago.strftime('%Y-%m-%d') if gasto.fecha_de_pago else None,  # 👈 formateada
                "semana_pago": gasto.numero_de_semana_del_pago,
                "n_factura": gasto.n_factura,
                "proveedor": gasto.nombre_proveedores,
                "informe": gasto.informe,
                "moneda": gasto.moneda,
                "cotizacion": cotizacion,
                "total": total_convertido,
                "estado": estado,
                "ver_factura": gasto.url
            })
            
        return jsonify({
            "gastos": gastos_list,
            "total_pages": paginated_gastos.pages,
            "total_items": total_gastos
        }), 200
        
    except Exception as e:
        print(f"Error al obtener datos de gastos: {e}")
        return jsonify({"error": "Error al obtener datos de gastos."}), 500

@app.route('/api/guardar_cambios/<int:gasto_id>', methods=['POST'])
def guardar_cambios(gasto_id):
    try:
        data = request.json
        print(f"Datos recibidos para el gasto {gasto_id}: {data}") 
        gasto = Gasto.query.get(gasto_id)

        if not gasto:
            return jsonify({'error': 'Gasto no encontrado.'}), 404

        # Lógica para actualizar los campos
        if 'fecha_del_gasto' in data and data['fecha_del_gasto']:
            gasto.fecha_del_gasto = datetime.strptime(data['fecha_del_gasto'], '%Y-%m-%d').date()
        if 'detalle' in data and data['detalle']:
            gasto.detalle = data['detalle']
        if 'importe' in data and data['importe'] is not None:
            gasto.importe = data['importe']
        if 'id_estructura' in data and data['id_estructura']:
            gasto.id_estructura = data['id_estructura']
        if 'id_subestructura' in data and data['id_subestructura']:
            gasto.id_subestructura = data['id_subestructura']

        # ✅ LÓGICA CORREGIDA PARA LOS CAMPOS QUE NO SE GUARDABAN
        if 'n_de_semana_del_consumo' in data and data['n_de_semana_del_consumo']:
            gasto.n_de_semana_del_consumo = data['n_de_semana_del_consumo']
        if 'fecha_de_pago' in data and data['fecha_de_pago']:
            gasto.fecha_de_pago = datetime.strptime(data['fecha_de_pago'], '%Y-%m-%d').date()
        if 'numero_de_semana_del_pago' in data and data['numero_de_semana_del_pago']:
            gasto.numero_de_semana_del_pago = data['numero_de_semana_del_pago']
        if 'id_orden' in data and data['id_orden']:
            gasto.id_orden = data['id_orden']
            
        if 'id_proveedor' in data and data['id_proveedor']:
            gasto.id_proveedor = data['id_proveedor']
        if 'moneda' in data and data['moneda']:
            gasto.moneda = data['moneda']
        
        # Lógica para la cotización
        if 'cotizacion' in data:
            cot_value = data['cotizacion']
            if cot_value is not None and str(cot_value).strip() != '':
                try:
                    gasto.cot = float(cot_value)
                except ValueError:
                    print(f"Advertencia: No se pudo convertir 'cotizacion' a float. Valor recibido: '{cot_value}'")
            else:
                gasto.cot = None
        
        db.session.commit()
        return jsonify({'success': 'Cambios guardados exitosamente.'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error al guardar cambios para el gasto {gasto_id}: {e}")
        return jsonify({'error': str(e)}), 500

# NUEVA RUTA: Endpoint para eliminar un gasto
@app.route('/api/gastos/<int:gasto_id>', methods=['DELETE'])
def eliminar_gasto(gasto_id):
    try:
        gasto = Gasto.query.get(gasto_id)
        if gasto is None:
            return jsonify({'error': 'Gasto no encontrado.'}), 404
        
        db.session.delete(gasto)
        db.session.commit()
        return jsonify({'success': 'Gasto eliminado exitosamente.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


#ANULACIÓN DE DATOS    
    
class Anulado(db.Model):
    __tablename__ = 'anulados'
    id_gastos = db.Column(db.Integer, primary_key=True)
    fecha_del_gasto = db.Column('FECHA DEL GASTO', db.Date)
    detalle = db.Column('DETALLE', db.Text)
    importe = db.Column('IMPORTE', db.Float)
    id_estructura = db.Column(db.Integer)
    id_subestructura = db.Column(db.Integer)
    id_proveedor = db.Column(db.Integer)
    n_factura = db.Column('N FACTURA', db.String(255))
    n_de_semana_del_consumo = db.Column('N DE SEMANA DEL CONSUMO', db.Integer)
    id_orden = db.Column('id_orden', db.Integer)
    fecha_de_pago = db.Column('FECHA DE PAGO', db.Date)
    numero_de_semana_del_pago = db.Column('NUMERO DE SEMANA DEL PAGO', db.Integer)
    informe = db.Column('INFORME', db.Text)
    moneda = db.Column('MONEDA', db.String(50))
    cot = db.Column('COT.', db.Float)
    url = db.Column('url', db.Text)   
    
#RUTA PARA ANULADOS    
@app.route('/api/anular_gasto/<int:gasto_id>', methods=['DELETE'])
def anular_gasto(gasto_id):
    try:
        gasto_a_anular = Gasto.query.get(gasto_id)
        if gasto_a_anular is None:
            return jsonify({'error': 'Gasto no encontrado.'}), 404
        
        # Crear un nuevo registro en la tabla 'anulados'
        gasto_anulado = Anulado(
            id_gastos=gasto_a_anular.id_gastos,
            fecha_del_gasto=gasto_a_anular.fecha_del_gasto,
            detalle=gasto_a_anular.detalle,
            importe=gasto_a_anular.importe,
            id_estructura=gasto_a_anular.id_estructura,
            id_subestructura=gasto_a_anular.id_subestructura,
            id_proveedor=gasto_a_anular.id_proveedor,
            n_factura=gasto_a_anular.n_factura,
            n_de_semana_del_consumo=gasto_a_anular.n_de_semana_del_consumo,
            id_orden=gasto_a_anular.id_orden,
            fecha_de_pago=gasto_a_anular.fecha_de_pago,
            numero_de_semana_del_pago=gasto_a_anular.numero_de_semana_del_pago,
            informe=gasto_a_anular.informe,
            moneda=gasto_a_anular.moneda,
            cot=gasto_a_anular.cot,
            url=gasto_a_anular.url
        )
        
        db.session.add(gasto_anulado)
        db.session.delete(gasto_a_anular)
        db.session.commit()
        
        return jsonify({'success': 'Gasto anulado y movido exitosamente.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500    
    
    
    







# Nuevo modelo de la tabla de ordenes
class Orden(db.Model):
    __tablename__ = 'ordenes'
    id_orden = db.Column(db.Integer, primary_key=True)
    id_gastos = db.Column(db.Integer, db.ForeignKey('gastos.id_gastos'), primary_key=True)

# Nueva ruta para la orden de pago
@app.route('/api/generar_orden', methods=['POST'])
def generar_orden():
    try:
        data = request.json
        gastos_ids = data.get('gastos_ids', [])

        if not gastos_ids:
            return jsonify({'error': 'No se seleccionaron gastos para generar la orden.'}), 400

        # Obtener el último número de orden
        ultima_orden = Orden.query.order_by(db.desc(Orden.id_orden)).first()
        nueva_orden_id = ultima_orden.id_orden + 1 if ultima_orden else 1

        # 👇 Definimos la fecha una sola vez
        hoy = datetime.date.today()
        semana = hoy.isocalendar()[1]

        for gasto_id in gastos_ids:
            # 1. Actualizar el campo id_orden en gastos
            gasto = Gasto.query.get(gasto_id)
            if gasto:
                gasto.id_orden = nueva_orden_id
                gasto.fecha_de_pago = hoy
                gasto.numero_de_semana_del_pago = semana

            # 2. Insertar en la tabla ordenes
            nueva_orden_gasto = Orden(id_orden=nueva_orden_id, id_gastos=gasto_id)
            db.session.add(nueva_orden_gasto)

        db.session.commit()
        return jsonify({
            'success': f'Orden de pago N° {nueva_orden_id} generada exitosamente.',
            'orden_id': nueva_orden_id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error al generar la orden de pago: {e}")
        return jsonify({'error': f"Error al generar la orden de pago: {str(e)}"}), 500
  
@app.route('/getUltimaOrden', methods=['GET'])
def get_ultima_orden():
    try:
        # Buscar el valor más alto en la columna id_orden de la tabla Gasto
        ultima_orden_id = db.session.query(db.func.max(Gasto.id_orden)).scalar()
        
        # Si hay un valor, sumarle 1; si no, empezar en 1
        proxima_orden = (ultima_orden_id) if ultima_orden_id else 1
        
        return jsonify({"numero_orden": proxima_orden})
    except Exception as e:
        print("Error al obtener la próxima orden:", e)
        return jsonify({"error": "No se pudo obtener el número de la próxima orden"}), 500


@app.route('/confirmarOrden', methods=['POST'])
def confirmar_orden():
    try:
        data = request.get_json()
        gastos_ids_data = data.get("gastos", [])
        fecha_confirmacion_str = data.get("fecha_confirmacion") # ✅ Obtenemos la fecha del navegador

        if not gastos_ids_data:
            return jsonify({"error": "No se enviaron gastos para confirmar."}), 400

        # Obtener el siguiente número de orden
        ultima_orden = db.session.query(db.func.max(Gasto.id_orden)).scalar()
        nueva_orden_id = (ultima_orden + 1) if ultima_orden else 1

        # ✅ Convertimos la fecha de cadena a un objeto de fecha de Python
        hoy = datetime.strptime(fecha_confirmacion_str, '%Y-%m-%d').date()
        semana = hoy.isocalendar()[1]

        for gasto_item in gastos_ids_data:
            gasto_id = gasto_item.get("id_gastos")
            gasto = db.session.get(Gasto, gasto_id)

            if gasto:
                gasto.id_orden = nueva_orden_id
                gasto.fecha_de_pago = hoy
                gasto.numero_de_semana_del_pago = semana

        db.session.commit()
        return jsonify({"ok": True, "nuevaOrden": nueva_orden_id})

    except Exception as e:
        db.session.rollback()
        print("Error al confirmar orden:", e)
        return jsonify({"error": "No se pudo confirmar la orden."}), 500








    
    
    
    
    
    

@app.route('/api/aplicar_cotizacion', methods=['POST'])
def aplicar_cotizacion():
    try:
        data = request.json
        cotizacion = data.get('cotizacion')

        if cotizacion is None or cotizacion <= 0:
            return jsonify({"error": "La cotización debe ser un número positivo."}), 400
        
        # Encuentra todos los gastos que son "pendientes" y tienen moneda "ARG"
        # La condición para pendiente es que id_orden sea NULL o 0
        gastos_a_actualizar = Gasto.query.filter(
            Gasto.id_orden.is_(None) | (Gasto.id_orden == 0),
            Gasto.moneda == 'ARG'
        ).all()
        
        if not gastos_a_actualizar:
            return jsonify({"error": "No hay gastos pendientes con moneda ARG para actualizar."}), 404

        # Itera sobre los gastos y actualiza el campo 'cot'
        for gasto in gastos_a_actualizar:
            gasto.cot = cotizacion
        
        # Guarda los cambios en la base de datos
        db.session.commit()
        
        return jsonify({"success": f"Cotización {cotizacion} aplicada a {len(gastos_a_actualizar)} gastos pendientes."}), 200

    except Exception as e:
        print(f"Error al aplicar cotización: {e}")
        db.session.rollback()  # Revierte los cambios si hay un error
        return jsonify({"error": str(e)}), 500








# Definición del modelo para la tabla 'orden_pagos'
class OrdenPago(db.Model):
    __tablename__ = 'orden_pagos'
    id = db.Column(db.Integer, primary_key=True)
    id_ordenes = db.Column(db.Integer)
    nombre = db.Column(db.String(255))
    razon_social = db.Column(db.String(255))
    numero_pago = db.Column(db.String(255))
    monto_total = db.Column(db.Numeric(10, 2))
    monto_pagado = db.Column(db.Numeric(10, 2))
    moneda = db.Column(db.String(10))

    def as_dict(self):
        return {
            "id_ordenes": self.id_ordenes,
            "nombre": self.nombre,
            "razon_social": self.razon_social,
            "numero_pago": self.numero_pago,
            "monto_total": float(self.monto_total) if self.monto_total is not None else None,
            "monto_pagado": float(self.monto_pagado) if self.monto_pagado is not None else None,
            "moneda": self.moneda
        }

@app.route("/ordenes_pago")
def ordenes_pago():
    """Ruta para cargar la plantilla principal de órdenes de pago."""
    return render_template('estructuras.html')

@app.route("/api/ordenes_pago", methods=['GET'])
def get_all_ordenes_pago():
    """Ruta API para obtener todas las filas de la tabla orden_pagos."""
    try:
        ordenes = OrdenPago.query.all()
        ordenes_list = [orden.as_dict() for orden in ordenes]
        return jsonify({"data": ordenes_list}), 200
    except Exception as e:
        print(f"Error al obtener datos de órdenes de pago: {e}")
        return jsonify({"error": "Error al obtener datos de órdenes de pago."}), 500

@app.route("/api/ordenes_pago/<int:id_orden>", methods=['GET'])
def get_filtered_ordenes_pago(id_orden):
    """Ruta API para obtener filas filtradas por id_ordenes."""
    try:
        ordenes = OrdenPago.query.filter_by(id_ordenes=id_orden).all()
        ordenes_list = [orden.as_dict() for orden in ordenes]
        return jsonify({"data": ordenes_list}), 200
    except Exception as e:
        print(f"Error al filtrar por id_orden: {e}")
        return jsonify({"error": "Error al filtrar por id_orden."}), 500

@app.route("/api/ordenes_ids", methods=['GET'])
def get_ordenes_ids():
    """Ruta API para obtener solo los IDs de las órdenes, sin duplicados."""
    try:
        # Usar group_by para obtener IDs únicos
        ids = db.session.query(OrdenPago.id_ordenes).group_by(OrdenPago.id_ordenes).all()
        ids_list = [item[0] for item in ids if item[0] is not None]
        return jsonify({"ids": ids_list}), 200
    except Exception as e:
        print(f"Error al obtener IDs de órdenes: {e}")
        return jsonify({"error": "Error al obtener IDs de órdenes."}), 500











@app.route("/finanzas")
def finanzas():
    if 'user_id' not in session:
        return redirect(url_for('main'))
    return render_template("finanzas.html")




Claro, lo haré de esa manera para simplificar la tabla.

Para lograrlo, necesitamos actualizar tanto el backend (el archivo app.py) como el frontend (el archivo finanzas.html) para que trabajen juntos.

Cambios en el backend (app.py)
He modificado la función get_saldo_financiera() para que ahora devuelva un solo campo llamado presupuesto_invoice. Este campo se llena con el id_orden si el gasto es de tipo "Sale por financiera" o con el n_factura si es de tipo "Ingresa a la financiera".

Reemplaza la función en tu archivo app.py con el siguiente código:

Python

@app.route('/api/finanzas/saldo_financiera', methods=['GET'])
def get_saldo_financiera():
    try:
        # ✅ Paso 1: Obtener los gastos con los nuevos filtros
        gastos_financiera = db.session.query(Gasto).filter(
            or_(
                Gasto.tipo == 'Ingresa a la financiera',
                and_(Gasto.tipo == 'Sale por financiera', Gasto.id_orden.isnot(None))
            )
        ).order_by(Gasto.fecha_del_gasto).all()
        
        # ✅ Paso 2: Agrupar los gastos
        movimientos_agrupados = {}
        for gasto in gastos_financiera:
            tipo = gasto.tipo
            id_referencia = gasto.id_orden if tipo == 'Sale por financiera' else gasto.id_gastos
            
            # Aseguramos que el importe no sea nulo antes de la conversión
            importe_gasto = float(gasto.importe) if gasto.importe is not None else 0

            # ✅ Lógica de conversión de moneda
            if gasto.moneda and gasto.moneda.upper() != 'USD':
                if gasto.cot and float(gasto.cot) > 0:
                    importe_convertido = importe_gasto / float(gasto.cot)
                else:
                    importe_convertido = importe_gasto
            else:
                importe_convertido = importe_gasto
            
            # ✅ NUEVA LÓGICA para el campo combinado
            if tipo == 'Ingresa a la financiera':
                # El campo combinado es el n_factura
                presupuesto_invoice_valor = gasto.n_factura
            else:
                # El campo combinado es el id_orden
                presupuesto_invoice_valor = gasto.id_orden

            if id_referencia not in movimientos_agrupados:
                movimientos_agrupados[id_referencia] = {
                    'importe_total': 0,
                    'fecha': None,
                    'tipo': tipo,
                    'detalle': gasto.detalle,
                    'comision_porcentaje': gasto.percent_comision,
                    'gastos_bancarios': gasto.gastos_bancarios,
                    'presupuesto_invoice': presupuesto_invoice_valor # ✅ Nuevo campo
                }
            
            # Lógica para la fecha
            if tipo == 'Sale por financiera' and gasto.fecha_de_pago:
                movimientos_agrupados[id_referencia]['fecha'] = gasto.fecha_de_pago.strftime('%Y-%m-%d')
            elif tipo == 'Ingresa a la financiera':
                movimientos_agrupados[id_referencia]['fecha'] = gasto.fecha_del_gasto.strftime('%Y-%m-%d')

            # Sumamos o restamos el importe
            if tipo == 'Sale por financiera':
                movimientos_agrupados[id_referencia]['importe_total'] -= importe_convertido
            else:
                movimientos_agrupados[id_referencia]['importe_total'] += importe_convertido

        # ✅ Paso 3: Construir la respuesta final y enviarla
        resultados = []
        for id_ref, datos in movimientos_agrupados.items():
            if datos['importe_total'] != 0:
                importe_formateado = round(datos['importe_total'], 2)
                
                # ✅ Lógica para determinar el concepto
                concepto = 'Aporte' if datos['tipo'] == 'Ingresa a la financiera' else 'Presupuesto Nro'
                
                resultados.append({
                    'fecha': datos['fecha'] if datos['fecha'] is not None else '',
                    'concepto': concepto,
                    'importe': importe_formateado,
                    'comision_porcentaje': datos['comision_porcentaje'],
                    'gastos_bancarios': datos['gastos_bancarios'],
                    'presupuesto_invoice': datos['presupuesto_invoice']
                })
        
        # ✅ Ordenamos los resultados por fecha
        resultados.sort(key=lambda x: (x['fecha'] if x['fecha'] else '9999-12-31'))

        return jsonify({'data': resultados}), 200

    except Exception as e:
        print(f"Error al obtener el saldo de la financiera: {e}")
        return jsonify({'error': 'Error interno del servidor.'}), 500













@app.route("/produccion")
def produccion():
    if 'user_id' not in session:
        return redirect(url_for('main'))
    return render_template("produccion.html")


@app.route("/la-pampa")
def lapampa():
    if 'user_id' not in session:
        return redirect(url_for('main'))
    return render_template("la-pampa.html")

