import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk

# Crear ventana
root = tk.Tk()
root.title("Ingreso al sistema")
root.geometry("350x600")
root.config(bg="#f2f2f2")
root.resizable(False, False)

# ---- SECCIÓN LOGIN ----
login_frame = tk.Frame(root, bg="#f2f2f2")
login_frame.pack(pady=20)

tk.Label(login_frame, text="INGRESÁ", font=("Arial", 12, "bold"), bg="#f2f2f2").pack(pady=10)

correo_login = tk.Entry(login_frame, width=30, font=("Arial", 10))
correo_login.insert(0, "TUCORREO@EJEMPLO.COM")
correo_login.pack(pady=5)

password_login = tk.Entry(login_frame, width=30, font=("Arial", 10), show="*")
password_login.insert(0, "CONTRASEÑA")
password_login.pack(pady=5)

tk.Label(login_frame, text="¿Olvidaste tu contraseña?", fg="black",
         font=("Arial", 9, "underline"), bg="#f2f2f2").pack(pady=5)

tk.Button(login_frame, text="ENTRAR", bg="#d9d9d9", width=25, height=2).pack(pady=10)

# ---- SECCIÓN REGISTRO ----
registro_frame = tk.Frame(root, bg="#f2f2f2")
registro_frame.pack(pady=30)

tk.Label(registro_frame, text="REGISTRATE", font=("Arial", 12, "bold"), bg="#f2f2f2").pack(pady=10)

correo_registro = tk.Entry(registro_frame, width=30, font=("Arial", 10))
correo_registro.insert(0, "TUCORREO@EJEMPLO.COM")
correo_registro.pack(pady=5)

tk.Button(registro_frame, text="REGISTRAR", bg="#d9d9d9", width=25, height=2).pack(pady=10)

# ---- LOGO TORO ----
try:
    img = Image.open("logo-cuadrado-kesslerkosher-SIN-FONDO (1).png")
    img = img.resize((150, 150), Image.ANTIALIAS)  # Redimensionamos
    logo = ImageTk.PhotoImage(img)

    label_logo = tk.Label(root, image=logo, bg="#f2f2f2")
    label_logo.pack(pady=20)
except Exception as e:
    tk.Label(root, text="No se pudo cargar el logo", bg="#f2f2f2", fg="red").pack()

root.mainloop()
