from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import quote_plus # pour que ça prenne en compte les caractères spéciaux dans les mdp
import config

# adresse de la base : pilote://utilisateur:motdepasse@machine:port/base
url = f"mysql+mysqlconnector://{config.MYSQL_USER}:{quote_plus(config.MYSQL_MDP)}@localhost:3306/{config.MYSQL_BASE}"

moteur = create_engine(url)
SessionLocale = sessionmaker(bind=moteur)
Base = declarative_base()