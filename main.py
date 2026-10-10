from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from base_de_donnees import Base, moteur
import entites

# crée les tables dans mysql si elles n'existent pas encore
Base.metadata.create_all(moteur)

app = FastAPI()

app.mount("/", StaticFiles(directory="client", html=True), name="client")