from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from base_de_donnees import Base


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True)
    motDePasse = Column(String(100))  # le hash, pas le vrai mot de passe


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    expediteurId = Column(Integer, ForeignKey("utilisateurs.id"))
    destinataireId = Column(Integer, ForeignKey("utilisateurs.id"))
    contenu = Column(Text)
    dateEnvoi = Column(DateTime)