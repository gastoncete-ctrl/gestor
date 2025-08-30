import tkinter as tk
from PIL import Image, ImageTk
import os
import glob

# Crear ventana
root = tk.Tk()
root.title("Ingreso al sistema")
root.geometry("350x600")
root.config(bg="#f2f2f2")
root.resizable(False, False)

# ---- FUENTE ----
FUENTE_TITULO = ("Roboto Condensed", 12, "bold")
FUENTE_TEXTO = ("Roboto Condensed", 10)
FUENTE_LINK = ("Roboto Condensed", 9, "underline")

# ---- SECCIÓN LOGIN ----
login_frame = tk.Frame(root, bg="#f2f2f2")
login_frame.pack(pady=20)

tk.Label(login_frame, text="INGRESÁ", font=FUENTE_TITULO, bg="#f2f2f2").pack(pady=10)

correo_login = tk.Entry(login_frame, width=30, font=FUENTE_TEXTO)
correo_login.insert(0, "TUCORREO@EJEMPLO.COM")
correo_login.pack(pady=5)

password_login = tk.Entry(login_frame, width=30, font=FUENTE_TEXTO, show="*")
password_login.insert(0, "CONTRASEÑA")
password_login.pack(pady=5)

tk.Label(login_frame, text="¿Olvidaste tu contraseña?", fg="black",
         font=FUENTE_LINK, bg="#f2f2f2").pack(pady=5)

tk.Button(login_frame, text="ENTRAR", bg="#d9d9d9", width=25, height=2, font=FUENTE_TEXTO).pack(pady=10)

# ---- SECCIÓN REGISTRO ----
registro_frame = tk.Frame(root, bg="#f2f2f2")
registro_frame.pack(pady=30)

tk.Label(registro_frame, text="REGISTRATE", font=FUENTE_TITULO, bg="#f2f2f2").pack(pady=10)

correo_registro = tk.Entry(registro_frame, width=30, font=FUENTE_TEXTO)
correo_registro.insert(0, "TUCORREO@EJEMPLO.COM")
correo_registro.pack(pady=5)

tk.Button(registro_frame, text="REGISTRAR", bg="#d9d9d9", width=25, height=2, font=FUENTE_TEXTO).pack(pady=10)

# ---- LOGO TORO ----
try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    png_files = glob.glob(os.path.join(current_dir, "*.png"))

    if png_files:
        img = Image.open(png_files[0])
        img = img.resize((150, 150), Image.Resampling.LANCZOS)
        logo = ImageTk.PhotoImage(img)

        label_logo = tk.Label(root, image=logo, bg="#f2f2f2")
        label_logo.image = logo
        label_logo.pack(pady=20)
    else:
        tk.Label(root, text="No se encontró ningún archivo PNG", bg="#f2f2f2", fg="red", font=FUENTE_TEXTO).pack()

except Exception as e:
    tk.Label(root, text=f"Error al cargar el logo: {e}", bg="#f2f2f2", fg="red", font=FUENTE_TEXTO).pack()

root.mainloop()
