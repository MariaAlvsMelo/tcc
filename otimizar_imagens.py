# Como usar (na pasta do projeto, onde ficam "frontend" e "backend"):
#   pip install pillow
#   python otimizar_imagens.py
# O original fica salvo em "backup_img_original" (não envie essa pasta ao GitHub).
import os
import shutil
from PIL import Image

PASTA = os.path.join("frontend", "img")
BACKUP = "backup_img_original"

# nome: (largura máxima em px, formato final)
CONFIG = {
    "capa1.png": (700, "jpg"), "capa2.png": (700, "jpg"),
    "capa3.png": (700, "jpg"), "capa4.png": (700, "jpg"),
    "fundo.png": (1400, "jpg"),
    "login.png": (700, "png"),
    "logo.png": (400, "png"),
    "entrenotas.png": (480, "png"),
    "banner-icon.png": (200, "png"), "conf.png": (200, "png"),
    "comp.png": (200, "png"), "home-icon.png": (160, "png"),
    "perfil-icon.png": (160, "png"), "avaliar-icon.png": (160, "png"),
    "comentario.png": (160, "png"),
}

if not os.path.exists(BACKUP):
    shutil.copytree(PASTA, BACKUP)

for nome, (largura, formato) in CONFIG.items():
    origem = os.path.join(BACKUP, nome)
    if not os.path.exists(origem):
        continue

    img = Image.open(origem)
    if img.width > largura:
        altura = round(img.height * largura / img.width)
        img = img.resize((largura, altura), Image.LANCZOS)

    base = os.path.splitext(nome)[0]

    if formato == "jpg":
        img.convert("RGB").save(
            os.path.join(PASTA, base + ".jpg"),
            "JPEG", quality=80, optimize=True, progressive=True
        )
        antigo = os.path.join(PASTA, nome)
        if os.path.exists(antigo):
            os.remove(antigo)
    else:
        img.save(os.path.join(PASTA, nome), "PNG", optimize=True)

    print("ok:", nome)

print("Pronto!")