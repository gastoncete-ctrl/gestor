
# --- Endpoint: años disponibles para un mes dado -----------------------------
@app.route('/api/faena/la-pampa/years', methods=['GET'])
def get_years_for_month():
    month = request.args.get('month', type=int)
    if not month or month < 1 or month > 12:
        return jsonify({'error': 'month inválido'}), 400
    try:
        conn = mysql.connector.connect(**DB_CONFIG, charset='utf8mb4', use_unicode=True)
        cur  = conn.cursor(dictionary=True)

        tbl = 'faena_pampa'
        # reutilizamos helper para detectar la columna real de fecha
        col_fecha = _pick_column(cur, tbl, 'fecha faena', 'fecha_faena', 'fecha')

        # Obtenemos los años (desc), sólo donde exista al menos una fila para ese mes
        cur.execute(f"""
            SELECT DISTINCT YEAR(`{col_fecha}`) AS y
            FROM `{tbl}`
            WHERE MONTH(`{col_fecha}`) = %s
            ORDER BY y DESC
        """, (month,))
        years = [row['y'] for row in cur.fetchall()]

        cur.close(); conn.close()

        resp = jsonify({'month': month, 'years': years})
        # cache cortita (5 min) para aliviar repetidas consultas del mismo mes
        resp.headers['Cache-Control'] = 'public, max-age=300'
        return resp
    except mysql.connector.Error as err:
        print(f'Error de base de datos: {err}')
        return jsonify({'error': 'No se pudieron obtener los años'}), 500
    except Exception as e:
        print(f'Error inesperado: {e}')
        return jsonify({'error': 'Error interno'}), 500
