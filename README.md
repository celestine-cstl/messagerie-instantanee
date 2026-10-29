# messagerie-instantanee
Projet API et Web Services - messagerie temps réel

**Messagerie instantanée entre deux appareils (ordinateur et iPhone) : comptes sécurisés par JWT, API REST pour les comptes et l'historique, WebSocket pour les messages en direct, persistance MySQL, accusés de réception, indicateur de saisie, réactions et notification hors ligne.**

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white)

> Projet réalisé en binôme par **Lina CHRAA** et **Cêlestine Coustillac**. Le serveur est écrit en **Python** avec **FastAPI** et lancé par **Uvicorn**. **SQLAlchemy** fait le lien avec la base **MySQL**, **bcrypt** hache les mots de passe et **PyJWT** crée les jetons de connexion. Les deux clients, une page pour l'ordinateur et une pour le téléphone, sont en **HTML, CSS et JavaScript**. **Postman** a servi à tester chaque endpoint et le WebSocket, et **Word** au rapport écrit.

<br>

## 🛠️ Compétences mobilisées

- **Architecture client-serveur** : les deux appareils ne se parlent jamais directement, tout passe par le serveur
- **API REST** : ressources identifiées par une URL, verbes HTTP, codes de statut (`201`, `401`, `404`), format JSON
- **Temps réel** : canal WebSocket bidirectionnel pour pousser les messages sans que le client ait à redemander (pas de polling)
- **Sécurité** : mots de passe hachés avec bcrypt, jeton JWT signé, protection des endpoints, expéditeur toujours lu dans le jeton, affichage en `textContent` contre la faille XSS
- **Persistance** : chaque message est enregistré en base avant d'être envoyé
- **Tests** : Postman pour REST et WebSocket, puis tests en conditions réelles entre un PC et un iPhone

<br>

## 🚀 Lancer le projet

**1. À installer :** Python 3, MySQL. Pour tester avec un téléphone, les 2 appareils doivent être **sur le même Wi-Fi**.


**2. Installer les bibliothèques**

```bash
pip install -r requirements.txt
```

**3. Créer la base vide** dans MySQL (Workbench ou `mysql -u root -p`). Les tables sont créées automatiquement au démarrage du serveur.

```sql
CREATE DATABASE messagerie_db;
```

**4. Créer `config.py`** à partir du modèle, puis y mettre son utilisateur et son mot de passe MySQL. Ce fichier est dans le `.gitignore` et n'est jamais publié.

```bash
copy config_exemple.py config.py      # Windows
cp config_exemple.py config.py        # macOS / Linux
```

**5. (Facultatif) Remplir la base avec des données de test.** Attention : ce script **supprime tout ce qui est déjà dans la base**.

```bash
python remplir_base.py
```
Il crée 26 utilisateurs et 18 conversations. Tous les comptes ont le mot de passe : `Test123` pour les tests.

**6. Lancer le serveur** depuis le dossier du projet.

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

**7. Ouvrir les pages.** L'adresse IP de l'ordinateur se trouve avec `ipconfig` (Windows, ligne « Adresse IPv4 ») ou `ipconfig getifaddr en0` (Mac).

| Où | Adresse |
|---|---|
| Ordinateur | http://localhost:8000/ordinateur.html |
| iPhone (Safari) | http://IP-de-l-ordinateur:8000/mobile.html |
| Documentation Swagger | http://localhost:8000/docs |

<br>

## 🎬 Scénario de démonstration

**Créer un compte** (sur l'ordinateur, lien « S'inscrire ») :
1. Essayer un mot de passe **non conforme**, par exemple `abc` : la règle s'affiche en rouge (*6 à 30 caractères, une majuscule et un chiffre*) et le compte n'est pas créé.
2. Essayer un nom **déjà pris**, par exemple `Lina` : le message *« Ce nom d'utilisateur est déjà pris »* s'affiche.
3. Créer un compte valide, par exemple `Nouveau` / `Test123` : un message vert confirme la création et le nom est déjà rempli pour se connecter.

**Se connecter :**

4. Essayer un **mauvais mot de passe** : la connexion est refusée. Le message est le même si c'est le nom qui est faux, pour ne pas indiquer quels comptes existent.
5. Sur l'ordinateur, se connecter avec **Cêlestine** / `Test123`.
6. Sur l'iPhone, se connecter avec **Lina** / `Test123`. Sur l'ordinateur, la pastille de Lina passe au vert.

**Échanger des messages :**

7. Envoyer un message depuis l'ordinateur : il apparaît tout de suite sur l'iPhone.
8. Répondre depuis l'iPhone : la réponse apparaît tout de suite sur l'ordinateur.
9. Se déconnecter puis se reconnecter sur l'ordinateur : l'historique est toujours là.

**Notification hors ligne :** déconnecter un des deux comptes, lui envoyer un message depuis l'autre, puis regarder la ligne `[WEBHOOK]` dans le terminal du serveur.

<br>

## 📡 API

| Méthode | Endpoint | Rôle | Jeton |
|---|---|---|---|
| `POST` | `/api/comptes` | Créer un compte (`201`) | Non |
| `POST` | `/api/auth/login` | Se connecter, renvoie le jeton JWT | Non |
| `GET` | `/api/utilisateurs` | Utilisateurs et statut en ligne | Oui |
| `GET` | `/api/conversations` | Conversations, dernier message, non-lus | Oui |
| `GET` | `/api/messages/{id}` | Historique avec l'utilisateur `{id}` | Oui |

Le jeton s'envoie dans l'en-tête `Authorization: Bearer <jeton>`. Le WebSocket s'ouvre sur `ws://<adresse>:8000/ws/messages?token=<jeton>`. Un message suit le format demandé par l'énoncé :

```json
{"type": "message", "expediteurId": 1, "destinataireId": 2, "contenu": "Bonjour !", "dateEnvoi": "2026-10-11T16:08:06"}
```

<br>

## 📁 Organisation du dépôt

```
messagerie-instantanee/
├── main.py              # le serveur : endpoints REST, WebSocket, JWT
├── base_de_donnees.py   # connexion à MySQL
├── entites.py           # les tables : utilisateurs, messages, reactions
├── remplir_base.py      # données de test
├── config_exemple.py    # modèle de config.py (identifiants MySQL)
├── requirements.txt
└── client/
    ├── ordinateur.html
    ├── mobile.html
    ├── script.js
    └── style.css
```

