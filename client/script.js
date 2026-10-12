// les éléments de la page
const blocConnexion = document.getElementById("bloc-connexion");
const blocInscription = document.getElementById("bloc-inscription");
const messageErreur = document.getElementById("message-erreur");

// infos de la personne connectée 
let token = null;
let monId = null;
let monUsername = null;
let socket = null;

// #### PASSER DE LA CONNEXION A L'INSCRIPTION ####

document.getElementById("lien-inscription").addEventListener("click", function (e) {
    e.preventDefault();
    blocConnexion.style.display = "none";
    blocInscription.style.display = "block";
    messageErreur.textContent = "";
});

document.getElementById("lien-connexion").addEventListener("click", function (e) {
    e.preventDefault();
    blocInscription.style.display = "none";
    blocConnexion.style.display = "block";
    messageErreur.textContent = "";
});


// #### L'OEIL POUR VOIR LE MOT DE PASSE ####

function basculerMdp(idChamp) {
    const champ = document.getElementById(idChamp);
    if (champ.type === "password") {
        champ.type = "text";
    } else {
        champ.type = "password";
    }
}

document.getElementById("btn-oeil-login").addEventListener("click", function () {
    basculerMdp("login-mdp");
});

document.getElementById("btn-oeil-inscription").addEventListener("click", function () {
    basculerMdp("inscription-mdp");
});


// #### INSCRIPTION ####

// règle entre 6 à 30  caractères, une majuscule et un chiffre
function mdpValide(mdp) {
    return mdp.length >= 6 && mdp.length <= 30 && /[A-Z]/.test(mdp) && /[0-9]/.test(mdp);
}

document.getElementById("btn-inscription").addEventListener("click", async function () {
    const username = document.getElementById("inscription-username").value.trim();
    const mdp = document.getElementById("inscription-mdp").value;
    const aideMdp = document.getElementById("aide-mdp");

    messageErreur.style.color = "";

    if (username === "" || mdp === "") {
        messageErreur.textContent = "Remplissez tous les champs";
        return;
    }

    if (!mdpValide(mdp)) {
        // on affiche la règle en rouge sous le bouton
        aideMdp.style.display = "block";
        aideMdp.style.color = "#bc3636";
        messageErreur.textContent = "";
        return;
    }
    // mot de passe ok : on recache la règle
    aideMdp.style.display = "none";
    messageErreur.textContent = "";

    try {
        const reponse = await fetch("/api/comptes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, motDePasse: mdp })
        });
        const donnees = await reponse.json();

        if (reponse.status === 201) {
            // compte créé >> on repasse sur la connexion avec le nom déjà rempli pour que l'utilisateur n'ai que à remplir son mdp pour sa première co
            blocInscription.style.display = "none";
            blocConnexion.style.display = "block";
            document.getElementById("login-username").value = donnees.username;
            document.getElementById("inscription-mdp").value = "";
            messageErreur.style.color = "#4ade80";
            messageErreur.textContent = "Votre compte a bien été créé, vous pouvez vous connecter";
        } else {
            // erreur envoyée par le serveur
            messageErreur.textContent = donnees.error;
        }
    } catch (e) {
        messageErreur.textContent = "Impossible de joindre le serveur";
    }
});

// #### CONNEXION ####

document.getElementById("btn-connexion").addEventListener("click", async function () {
    const username = document.getElementById("login-username").value.trim();
    const mdp = document.getElementById("login-mdp").value;

    messageErreur.style.color = "";

    if (username === "" || mdp === "") {
        messageErreur.textContent = "Remplis tous les champs";
        return;
    }

    try {
        const reponse = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, motDePasse: mdp })
        });
        const donnees = await reponse.json();

        if (reponse.status === 200) {
            // on garde le token pour les prochaines requêtes
            token = donnees.token;
            monId = donnees.id;
            monUsername = donnees.username;
            ouvrirMessagerie();
        } else {
            messageErreur.textContent = donnees.error;
        }
    } catch (e) {
        messageErreur.textContent = "Impossible de joindre le serveur";
    }
});

// on cache l'onglet connexion et on montre l'onhget messagerie
function ouvrirMessagerie() {
    document.getElementById("zone-connexion").style.display = "none";
    document.getElementById("zone-messagerie").style.display = "flex";
    messageErreur.textContent = "";
    afficherOnglet("messages");
    connecterSocket();
}

// appuyer sur Entrée = cliquer sur le bouton de connexion
function entreeValide(idChamp, idBouton) {
    document.getElementById(idChamp).addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            document.getElementById(idBouton).click();
        }
    });
}

entreeValide("login-username", "btn-connexion");
entreeValide("login-mdp", "btn-connexion");
entreeValide("inscription-username", "btn-inscription");
entreeValide("inscription-mdp", "btn-inscription");


// #### DECONNEXION ####

function deconnecter() {
    if (socket) {
        socket.close();
        socket = null;
    }

    // on oublie le token
    token = null;
    monId = null;
    monUsername = null;
    destinataire = null;

    document.getElementById("zone-messagerie").style.display = "none";
    document.getElementById("zone-messagerie").classList.remove("conversation-ouverte");
    document.getElementById("zone-connexion").style.display = "";
    document.getElementById("login-mdp").value = "";
}

document.getElementById("btn-deconnexion").addEventListener("click", deconnecter);


// #### ONGLETS CONVERSATION/UTILISATEURS ####

let destinataire = null; // la personne avec qui on parle

function afficherOnglet(nom) {
    const estMessages = (nom === "messages");

    document.getElementById("liste-conversations").style.display = estMessages ? "block" : "none";
    document.getElementById("liste-utilisateurs").style.display = estMessages ? "none" : "block";
    document.getElementById("titre-liste").textContent = estMessages ? "Messages" : "Utilisateurs";

    // le logo de l'onglet qu'on a sélectionner est mis en avant 
    document.getElementById("onglet-messages").classList.toggle("actif", estMessages);
    document.getElementById("onglet-personnes").classList.toggle("actif", !estMessages);

    if (estMessages) {
        chargerConversations();
    } else {
        chargerUtilisateurs();
    }
}

document.getElementById("onglet-messages").addEventListener("click", function () {
    afficherOnglet("messages");
});

document.getElementById("onglet-personnes").addEventListener("click", function () {
    afficherOnglet("personnes");
});


// #### LISTE DES UTILISATEURS ####

async function chargerUtilisateurs() {
    try {
        const reponse = await fetch("/api/utilisateurs", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (reponse.status === 401) {
            deconnecter();
            messageErreur.textContent = "Session expirée, reconnecte-toi";
            return;
        }

        const utilisateurs = await reponse.json();
        const liste = document.getElementById("liste-utilisateurs");
        liste.innerHTML = "";

        for (const u of utilisateurs) {
            // on ne s'affiche pas dans la liste
            if (u.id === monId) {
                continue;
            }

            const ligne = document.createElement("div");
            ligne.className = "utilisateur";
            ligne.innerHTML = `
                <div class="avatar"><span class="pastille ${u.connecte ? "en-ligne" : ""}"></span></div>
                <div class="infos">
                    <p class="nom"></p>
                    <p class="statut">${u.connecte ? "En ligne" : "Hors ligne"}</p>
                </div>`;
            ligne.querySelector(".nom").textContent = u.username;

            ligne.addEventListener("click", function () {
                ouvrirConversation(u);
            });

            liste.appendChild(ligne);

            if (destinataire && u.id === destinataire.id) {
                afficherStatut(u.connecte);
            }
        }

        if (liste.innerHTML === "") {
            liste.innerHTML = '<p class="vide">Personne d\'autre n\'est inscrit pour l\'instant.</p>';
        }
    } catch (e) {
        messageErreur.textContent = "Impossible de joindre le serveur";
    }
}

// #### LISTE DES CONVERSATIONS ####

async function chargerConversations() {
    try {
        const reponse = await fetch("/api/conversations", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (reponse.status === 401) {
            deconnecter();
            messageErreur.textContent = "Session expirée, reconnecte-toi";
            return;
        }

        const conversations = await reponse.json();
        const liste = document.getElementById("liste-conversations");
        liste.innerHTML = "";

        for (const c of conversations) {
            const ligne = document.createElement("div");
            ligne.className = "conversation";
            ligne.innerHTML = `
                <div class="avatar"><span class="pastille ${c.connecte ? "en-ligne" : ""}"></span></div>
                <div class="infos">
                    <p class="nom"></p>
                    <p class="apercu"></p>
                </div>
                <span class="heure">${c.dateEnvoi.slice(11, 16)}</span>`;
            ligne.querySelector(".nom").textContent = c.username;
            ligne.querySelector(".apercu").textContent = c.dernierMessage;

            ligne.addEventListener("click", function () {
                ouvrirConversation(c);
            });

            liste.appendChild(ligne);
        }

        if (conversations.length === 0) {
            liste.innerHTML = '<p class="vide">Pas encore de conversation. Va dans l\'onglet "Utilisateurs" pour écrire à quelqu\'un.</p>';
        }
    } catch (e) {
        messageErreur.textContent = "Impossible de joindre le serveur";
    }
}

// #### OUVRIR UNE CONVERSATION ####

async function ouvrirConversation(u) {
    destinataire = u;

    document.getElementById("nom-destinataire").textContent = u.username;
    afficherStatut(u.connecte);
    document.getElementById("historique").innerHTML = "";
    // sur téléphone >> on passe à l'écran de la conversation pour opti l'espace
    document.getElementById("zone-messagerie").classList.add("conversation-ouverte");

    // on récupère les anciens messages des conversztiond
    try {
        const reponse = await fetch("/api/messages/" + u.id, {
            headers: { "Authorization": "Bearer " + token }
        });
        if (reponse.status === 401) {
            deconnecter();
            messageErreur.textContent = "Session expirée, reconnecte-toi";
            return;
        }
        const messages = await reponse.json();
        for (const m of messages) {
            afficherBulle(m);
        }
        signalerLu(); // on vient de lire la conversation
    } catch (e) {
        messageErreur.textContent = "Impossible de joindre le serveur";
    }
}

// pastille avec texte en ligne ou hors ligne 
function afficherStatut(connecte) {
    document.getElementById("statut-destinataire").textContent = connecte ? "En ligne" : "Hors ligne";
    document.getElementById("pastille-destinataire").classList.toggle("en-ligne", connecte);
}

// la flèche retour n'existe que sur la page mobile pour opti la place
const btnRetour = document.getElementById("btn-retour");
if (btnRetour) {
    btnRetour.addEventListener("click", function () {
        document.getElementById("zone-messagerie").classList.remove("conversation-ouverte");
        destinataire = null; // on ne regarde plus la conversation
    });
}

// #### WEBSOCKET ####

function connecterSocket() {
    socket = new WebSocket("ws://" + location.host + "/ws/messages?token=" + token);

    // ACCUSÉ : dès que le canal est ouvert, on signale ce qu'on est en train de lire
    socket.addEventListener("open", signalerLu);

    // à chaque fois que le serveur nous envoie quelque chose
    socket.addEventListener("message", function (e) {
        const data = JSON.parse(e.data);

        if (data.type === "statut") {
            // si quelqu'un s'est connecté ou déconnecté >> on redemande les listes
            chargerUtilisateurs();
            chargerConversations();
        } else if (data.type === "message") {
            if (destinataire && (data.expediteurId === destinataire.id || data.destinataireId === destinataire.id)) {
                afficherBulle(data);
                // ACCUSÉ : message reçu pendant que la conversation est ouverte = lu
                if (data.expediteurId === destinataire.id) {
                    signalerLu();
                }
            }
            // le dernier message change >> on met la liste à jour
            chargerConversations();
        } else if (data.type === "accuse") {
            // ACCUSÉ : le serveur nous dit que nos messages ont changé de statut
            for (const id of data.ids) {
                const coche = document.querySelector('.bulle[data-id="' + id + '"] .coche');
                if (coche) {
                    majCoche(coche, data.statut);
                }
            }
        }
    });
}

function afficherBulle(m) {
    const estEnvoyee = (m.expediteurId === monId);

    const bulle = document.createElement("div");
    bulle.className = "bulle " + (estEnvoyee ? "envoyee" : "recue");
    bulle.dataset.id = m.id; // ACCUSÉ : pour retrouver la bulle quand l'accusé arrive
    bulle.textContent = m.contenu;

    const heure = document.createElement("span");
    heure.className = "heure";
    heure.textContent = m.dateEnvoi.slice(11, 16); // garde juste HH:MM

    // ACCUSÉ : les coches ne s'affichent que sur nos propres messages
    if (estEnvoyee) {
        const coche = document.createElement("span");
        coche.className = "coche";
        heure.appendChild(coche);
        majCoche(coche, m.statut);
    }

    bulle.appendChild(heure);

    const historique = document.getElementById("historique");
    historique.appendChild(bulle);
    historique.scrollTop = historique.scrollHeight; // descend en bas
}

// ✓ = envoyé, ✓✓ = livré, ✓✓ en vert = lu
function majCoche(coche, statut) {
    coche.textContent = (statut === "envoye") ? " ✓" : " ✓✓";
    coche.classList.toggle("lu", statut === "lu");
    coche.title = (statut === "envoye") ? "Envoyé" : (statut === "livre") ? "Livré" : "Lu";
}

// dit au serveur qu'on a lu les messages de la personne affichée
function signalerLu() {
    if (destinataire && socket && socket.readyState === WebSocket.OPEN
        && document.visibilityState === "visible") {
        socket.send(JSON.stringify({ type: "lu", expediteurId: destinataire.id }));
    }
}

// quand on revient sur l'onglet ou l'appli -> la conversation affichée devient lue
document.addEventListener("visibilitychange", signalerLu);

function envoyerMessage() {
    const champ = document.getElementById("champ-message");
    const contenu = champ.value.trim();

    if (contenu === "" || !destinataire || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
    }

    socket.send(JSON.stringify({
        type: "message",
        destinataireId: destinataire.id,
        contenu: contenu
    }));
    champ.value = "";
}

document.getElementById("btn-envoyer").addEventListener("click", envoyerMessage);

document.getElementById("champ-message").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        envoyerMessage();
    }
});
