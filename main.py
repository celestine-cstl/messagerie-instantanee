from fastapi import FastAPI, HTTPException, Request, Header, Depends
from fastapi.staticfiles import StaticFiles
from base_de_donnees import Base, moteur, SessionLocale
from entites import Utilisateur
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
import bcrypt
from datetime import datetime, timedelta, timezone
import jwt

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

# Règle du mdp : 6 à 30 caractères, une majuscule et un chiffre
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

# JWT
SECRET = "mySecretKeyMySecretKeyMySecretKey123!"

def generer_token(id_utilisateur, username):
    maintenant = datetime.now(timezone.utc)
    payload = {
        "sub": str(id_utilisateur),
        "username": username,
        "iat": maintenant,
        "exp": maintenant + timedelta(hours=1),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")

def verifier_token(token):
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None

# vérifie le token avant les routes protégées
def utilisateur_courant(authorization: str = Header(default=None)):
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")
    donnees = verifier_token(authorization.replace("Bearer ", ""))
    if donnees is None:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    return donnees

# CONNEXION
@app.post("/api/auth/login")
def login(identifiants: CompteRequest):
    # trop long = forcément faux (et bcrypt plante au dessus de 72 octets)
    if len(identifiants.motDePasse) > 30:
        raise HTTPException(status_code=401, detail="Identifiants ou mot de passes invalides")
    session = SessionLocale()
    try:
        u = session.query(Utilisateur).filter_by(username=identifiants.username.strip()).first()
        # même message que le nom ou le mdp soit faux
        if u is None or not bcrypt.checkpw(identifiants.motDePasse.encode(), u.motDePasse.encode()):
            raise HTTPException(status_code=401, detail="Identifiants ou mot de passes invalides")
        token = generer_token(u.id, u.username)
        return {"token": token, "id": u.id, "username": u.username}
    finally:
        session.close()

# UTILISATEURS
@app.get("/api/utilisateurs")
def lister_utilisateurs(moi: dict = Depends(utilisateur_courant)):
    session = SessionLocale()
    try:
        utilisateurs = session.query(Utilisateur).all()
        return [{"id": u.id, "username": u.username, "connecte": False} for u in utilisateurs]
    finally:
        session.close()

app.mount("/", StaticFiles(directory="client", html=True), name="client")