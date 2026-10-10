from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from base_de_donnees import Base, moteur, SessionLocale
from entites import Utilisateur
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
import bcrypt

# crée les tables dans mysql si elles n'existent pas encore
Base.metadata.create_all(moteur)

app = FastAPI()

# juste pour tester que le serveur répond
@app.get("/api/test")
def test():
    return {"message": "le serveur marche"}

# ERREURS
# toutes les erreurs au format {"error": "..."}
@app.exception_handler(HTTPException)
async def gestion_erreurs(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

# json mal formé ou champ manquant -> 400
@app.exception_handler(RequestValidationError)
async def erreur_validation(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"error": "Données invalides"})


# COMPTES
class CompteRequest(BaseModel):
    username: str
    motDePasse: str

# Règle du mdp : au moins 6 caractères, une majuscule et un chiffre
def mdp_valide(mdp):
    a_majuscule = any(c.isupper() for c in mdp)
    a_chiffre = any(c.isdigit() for c in mdp)
    return 6 <= len(mdp) <= 30 and a_majuscule and a_chiffre

@app.post("/api/comptes", status_code=201)
def creer_compte(compte: CompteRequest):
    username = compte.username.strip()
    if username == "" or compte.motDePasse == "":
        raise HTTPException(status_code=400, detail="Tous les champs sont obligatoires")
    if len(username) > 50:
        raise HTTPException(status_code=400, detail="Nom d'utilisateur trop long (50 caractères max)")
    if not mdp_valide(compte.motDePasse):
        raise HTTPException(status_code=400, detail="Mot de passe incorrect : 6 à 30 caractères, une majuscule et un chiffre")
    session = SessionLocale()
    try:
        # le username doit être unique
        if session.query(Utilisateur).filter_by(username=username).first():
            raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris")
        # on hache le mot de passe avant de l'enregistrer
        mdp_hache = bcrypt.hashpw(compte.motDePasse.encode(), bcrypt.gensalt()).decode()
        nouveau = Utilisateur(username=username, motDePasse=mdp_hache)
        session.add(nouveau)
        session.commit()
        return {"id": nouveau.id, "username": nouveau.username}
    finally:
        session.close()

# UTILISATEURS
@app.get("/api/utilisateurs")
def lister_utilisateurs():
    session = SessionLocale()
    try:
        utilisateurs = session.query(Utilisateur).all()
        return [{"id": u.id, "username": u.username, "connecte": False} for u in utilisateurs]
    finally:
        session.close()

app.mount("/", StaticFiles(directory="client", html=True), name="client")