# Remplit la base avec des données de test.
# A lancer depuis le dossier du projet : python remplir_base.py
# ATTENTION : supprime TOUS les utilisateurs et TOUS les messages existants.

import random
from datetime import datetime, timedelta

import bcrypt
from sqlalchemy import text

from base_de_donnees import Base, moteur, SessionLocale
from entites import Utilisateur, Message, Reaction

MOT_DE_PASSE = "Test123"  # le même pour tout le monde (respecte la règle : majuscule + chiffre)

PRENOMS = ["Ashley", "Bastien", "Cêlestine", "Djeneba", "Emma", "Felix", "Gabrielle", "Hugo",
           "Ingrid", "Jules", "Karim", "Lina", "Marlène", "Nora", "Oscar", "Pauline",
           "Quentin", "Rose", "Samuel", "Theo", "Ugo", "Victor", "Wassim", "Xavier",
           "Yasmine", "Zoe"]

# Chaque conversation : (personne 1, personne 2, liste de séances)
# Une séance = une discussion un jour donné ; 1 = personne 1 parle, 2 = personne 2 parle
CONVERSATIONS = [
    ("Ashley", "Bastien", [
        [(1, "Tu as compris la différence entre REST et WebSocket ?"),
         (2, "REST : on demande, le serveur répond"),
         (1, "Et le WebSocket reste ouvert dans les deux sens")],
        [(2, "Pourquoi le polling ne convient pas ?"),
         (1, "Il faut redemander tout le temps, ça fait trop de requêtes"),
         (2, "Ok merci")],
        [(1, "Ton WebSocket marche dans Postman ?"),
         (2, "Oui, le message arrive tout de suite"),
         (1, "Super")],
    ]),
    ("Ashley", "Cêlestine", [
        [(2, "Tu as les slides du chapitre 6 ?"),
         (1, "Oui, je te les envoie"),
         (2, "Merci !")],
        [(1, "Kafka garde les événements dans un journal"),
         (2, "Donc on peut les relire plus tard"),
         (1, "Exactement")],
    ]),
    ("Ashley", "Djeneba", [
        [(2, "Un JWT, c'est chiffré ?"),
         (1, "Non, seulement signé"),
         (2, "Donc on ne met pas de mot de passe dedans")],
        [(1, "Tu as fini le TP5 sur la sécurité ?"),
         (2, "Il me reste l'exercice sur le rate limiting"),
         (1, "Bon courage")],
    ]),
    ("Ashley", "Emma", [
        [(2, "Le rapport fait combien de pages ?"),
         (1, "Entre 5 et 8, avec un schéma d'architecture"),
         (2, "Merci")],
        [(1, "Il faut aussi une capture de la démo"),
         (2, "Avec les deux appareils"),
         (1, "Oui")],
    ]),
    ("Bastien", "Felix", [
        [(1, "Quelle différence entre PUT et PATCH ?"),
         (2, "PUT remplace tout, PATCH modifie une partie"),
         (1, "Merci")],
        [(2, "Le code 201, c'est quoi déjà ?"),
         (1, "Ressource créée"),
         (2, "Ok")],
    ]),
    ("Cêlestine", "Gabrielle", [
        [(1, "Tu préfères JSON ou XML ?"),
         (2, "JSON, c'est plus léger"),
         (1, "Pareil")],
    ]),
    ("Djeneba", "Hugo", [
        [(1, "Ça veut dire quoi l'erreur 401 ?"),
         (2, "Pas de jeton valide"),
         (1, "Et 403 ?"),
         (2, "Connecté mais pas le droit")],
    ]),
    ("Ingrid", "Jules", [
        [(1, "GraphQL, c'est quoi l'avantage ?"),
         (2, "On demande exactement les champs voulus"),
         (1, "Merci")],
    ]),
    ("Karim", "Lina", [
        [(2, "Un webhook, c'est quoi ?"),
         (1, "Le serveur appelle une URL quand un événement arrive"),
         (2, "Ok, c'est l'inverse d'une requête normale")],
    ]),
    ("Marlène", "Nora", [
        [(1, "Tu as noté la date de l'oral ?"),
         (2, "Oui, le 14"),
         (1, "Merci")],
    ]),
    ("Oscar", "Pauline", [
        [(1, "On refait le TP1 avec Postman ?"),
         (2, "Oui, demain en salle 204"),
         (1, "Ok")],
    ]),
    ("Quentin", "Rose", [
        [(2, "GET peut modifier des données ?"),
         (1, "Non, GET sert seulement à lire"),
         (2, "Merci")],
    ]),
    ("Samuel", "Theo", [
        [(1, "gRPC utilise quel format ?"),
         (2, "Protobuf, c'est du binaire"),
         (1, "Ok merci")],
    ]),
    ("Ugo", "Victor", [
        [(1, "SOAP ou REST pour le projet ?"),
         (2, "REST, c'est demandé dans l'énoncé"),
         (1, "Parfait")],
    ]),
    ("Wassim", "Xavier", [
        [(2, "Comment on évite une faille XSS ?"),
         (1, "On échappe les caractères HTML"),
         (2, "Merci")],
    ]),
    ("Yasmine", "Zoe", [
        [(1, "Tu me prêtes ton cours sur HTTP ?"),
         (2, "Oui, je t'envoie le chapitre 2"),
         (1, "Merci !")],
    ]),
    ("Ashley", "Zoe", [
        [(2, "Le serveur doit garder les messages hors ligne ?"),
         (1, "Oui, on les enregistre en base"),
         (2, "Comme Kafka, en plus simple")],
    ]),
    ("Cêlestine", "Lina", [
        [(1, "Tu as lu l'énoncé du projet ?"),
         (2, "Oui, REST pour les comptes et l'historique"),
         (1, "Et WebSocket pour les messages en direct")],
        [(2, "On part sur Python avec FastAPI ?"),
         (1, "Oui, on prend les équivalents des TP"),
         (2, "Ok, je regarde SQLAlchemy")],
        [(1, "La connexion avec le JWT marche"),
         (2, "Et sans jeton on a bien 401 ?"),
         (1, "Oui, testé dans Postman")],
        [(2, "J'ai ajouté l'accusé de réception"),
         (1, "Les coches passent au vert quand c'est lu ?"),
         (2, "Oui")],
    ]),
]

DEBUT = datetime(2026, 9, 26, 9, 0)
MAINTENANT = datetime.now()

random.seed(42)  # pour obtenir toujours les mêmes données


def dates_des_seances(nb):
    """Choisit nb jours différents entre DEBUT et maintenant, dans l'ordre."""
    nb_jours = max((MAINTENANT - DEBUT).days, 1)
    jours = sorted(random.sample(range(nb_jours), min(nb, nb_jours)))
    return [DEBUT + timedelta(days=j, hours=random.randint(0, 11), minutes=random.randint(0, 59))
            for j in jours]


session = SessionLocale()
try:
    Base.metadata.create_all(moteur)

    # 1. On vide les tables (les messages d'abord, à cause des clés étrangères)
    session.query(Reaction).delete()  # avant les messages, à cause de la clé étrangère
    session.query(Message).delete()
    session.query(Utilisateur).delete()
    session.commit()
    session.execute(text("ALTER TABLE messages AUTO_INCREMENT = 1"))
    session.execute(text("ALTER TABLE utilisateurs AUTO_INCREMENT = 1"))
    session.commit()

    # 2. On crée les 26 comptes (même mot de passe, haché avec bcrypt)
    mdp_hache = bcrypt.hashpw(MOT_DE_PASSE.encode(), bcrypt.gensalt()).decode()
    ids = {}
    for prenom in PRENOMS:
        u = Utilisateur(username=prenom, motDePasse=mdp_hache)
        session.add(u)
        session.flush()  # pour obtenir l'id tout de suite
        ids[prenom] = u.id
    session.commit()

    # 3. On crée les messages
    nb_messages = 0
    for p1, p2, seances in CONVERSATIONS:
        for date, echanges in zip(dates_des_seances(len(seances)), seances):
            for qui, contenu in echanges:
                exp, dest = (p1, p2) if qui == 1 else (p2, p1)
                date += timedelta(minutes=random.randint(1, 6), seconds=random.randint(0, 59))
                if date > MAINTENANT:
                    date = MAINTENANT - timedelta(minutes=1)
                session.add(Message(expediteurId=ids[exp], destinataireId=ids[dest],
                                    contenu=contenu, dateEnvoi=date, statut="lu"))
                nb_messages += 1
    session.commit()

    # 4. Les 2 derniers messages reçus par Cêlestine restent "livré" (pas encore lus) pour montrer les coches
    derniers = (session.query(Message)
                .filter(Message.destinataireId == ids["Cêlestine"])
                .order_by(Message.dateEnvoi.desc()).limit(2).all())
    for m in derniers:
        m.statut = "livre"
    session.commit()

    print(f"{len(PRENOMS)} utilisateurs et {nb_messages} messages créés.")
    print(f"Mot de passe de tous les comptes : {MOT_DE_PASSE}")
finally:
    session.close()
