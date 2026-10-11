from fastapi import FastAPI, HTTPException, Request, Header, Depends, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from base_de_donnees import Base, moteur, SessionLocale
from entites import Utilisateur
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
import bcrypt
from datetime import datetime, timedelta, timezone
import jwt
from sqlalchemy import or_, and_
from entites import Utilisateur, Message

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
        return [{"id": u.id, "username": u.username, "connecte": u.id in connectes} for u in utilisateurs]
    finally:
        session.close()


# #### HISTORIQUE ####

@app.get("/api/messages/{utilisateurId}")
def historique(utilisateurId: int, payload: dict = Depends(utilisateur_courant)):
    moi = int(payload["sub"])
    session = SessionLocale()

    if session.get(Utilisateur, utilisateurId) is None:
        session.close()
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # les messages dans les deux sens, du plus vieux au plus récent
    messages = session.query(Message).filter(
        or_(
            and_(Message.expediteurId == moi, Message.destinataireId == utilisateurId),
            and_(Message.expediteurId == utilisateurId, Message.destinataireId == moi)
        )
    ).order_by(Message.dateEnvoi).all()
    session.close()

    return [
        {
            "id": m.id,
            "expediteurId": m.expediteurId,
            "destinataireId": m.destinataireId,
            "contenu": m.contenu,
            "dateEnvoi": m.dateEnvoi.isoformat(timespec="seconds")
        }
        for m in messages
    ]

# #### WEBSOCKET ####

connectes = {}  # id de l'utilisateur -> sa connexion websocket

# prévient tout le monde que quelqu'un s'est connecté ou déconnecté
async def prevenir_statut():
    for ws in list(connectes.values()):
        try:
            await ws.send_json({"type": "statut"})
        except Exception:
            pass

@app.websocket("/ws/messages")
async def canal_messages(websocket: WebSocket, token: str = ""):
    # pas de token valide = pas de connexion
    try:
        payload = verifier_token(token)
        moi = int(payload["sub"])
    except Exception:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    connectes[moi] = websocket
    await prevenir_statut()

    try:
        while True:
            data = await websocket.receive_json()
            contenu = str(data.get("contenu", "")).strip()
            destinataireId = data.get("destinataireId")
            if contenu == "" or destinataireId is None:
                continue

            # on enregistre avec l'heure du serveur
            session = SessionLocale()
            m = Message(expediteurId=moi, destinataireId=int(destinataireId),
                        contenu=contenu, dateEnvoi=datetime.now())
            session.add(m)
            session.commit()
            session.refresh(m)
            session.close()

            message = {
                "type": "message",
                "expediteurId": m.expediteurId,
                "destinataireId": m.destinataireId,
                "contenu": m.contenu,
                "dateEnvoi": m.dateEnvoi.isoformat(timespec="seconds")
            }

            await websocket.send_json(message)
            if m.destinataireId in connectes and m.destinataireId != moi:
                await connectes[m.destinataireId].send_json(message)

    except WebSocketDisconnect:
        pass
    finally:
        if connectes.get(moi) is websocket:
            del connectes[moi]
        await prevenir_statut()

app.mount("/", StaticFiles(directory="client", html=True), name="client")