import os
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from dotenv import load_dotenv

# Cargar las variables de entorno del archivo .env
load_dotenv()

# Define los SCOPES que tu aplicación necesita para Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive']

def create_permanent_token():
    creds = None
    
    token_file_path = os.getenv('TOKEN_FILE', 'token.json')
    client_secrets_path = os.getenv('GOOGLE_DRIVE_CREDENTIALS_FILE', 'client_secret.json')
    
    # Intenta cargar el token existente
    if os.path.exists(token_file_path):
        creds = Credentials.from_authorized_user_file(token_file_path, SCOPES)
    
    # Si no hay un token válido, o si es la primera vez, inicia el flujo de autorización
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Token expirado, refrescando...")
            creds.refresh(Request())
        else:
            print("No se encontró un token válido. Iniciando el flujo de autorización...")
            flow = InstalledAppFlow.from_client_secrets_file(client_secrets_path, SCOPES)
            # Aquí se solicitan los permisos para un token "offline"
            creds = flow.run_local_server(port=0, prompt='consent', access_type='offline')
            print("¡Autorización exitosa! Nuevo token obtenido.")

    # Guarda el token de actualización para futuras sesiones
    with open(token_file_path, 'w') as token:
        token.write(creds.to_json())
    
    print(f"El token (incluyendo el token de actualización) se ha guardado en '{token_file_path}'.")

if __name__ == '__main__':
    create_permanent_token()