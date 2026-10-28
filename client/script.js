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
    arreterSaisie();
    autreEcrit = false;

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

    const zone = document.getElementById("zone-messagerie");
    zone.classList.toggle("onglet-utilisateurs", !estMessages);
    if (!estMessages) {
        zone.classList.remove("conversation-ouverte");
        destinataire = null;
    }

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

// met en surbrillance la personne avec qui on parle, dans les deux listes
function marquerSelection() {
    document.querySelectorAll(".conversation, .utilisateur").forEach(function (ligne) {
        const estChoisie = destinataire !== null && Number(ligne.dataset.id) === destinataire.id;
        ligne.classList.toggle("selectionne", estChoisie);
    });
}

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

        // tri : d'abord les personnes en ligne, puis ordre alphabétique (localeCompare gère les accents)
        utilisateurs.sort(function (a, b) {
            if (a.connecte !== b.connecte) {
                return a.connecte ? -1 : 1;
            }
            return a.username.localeCompare(b.username, "fr");
        });

        const liste = document.getElementById("liste-utilisateurs");
        liste.innerHTML = "";

        for (const u of utilisateurs) {
            // on ne s'affiche pas dans la liste
            if (u.id === monId) {
                continue;
            }

            const ligne = document.createElement("div");
            ligne.className = "utilisateur";
            ligne.dataset.id = u.id;
            ligne.innerHTML = `
                <div class="avatar"><span class="pastille ${u.connecte ? "en-ligne" : ""}"></span></div>
                <div class="infos">
                    <p class="nom"></p>
                    <p class="statut" data-connecte="${u.connecte}">${u.connecte ? "En ligne" : "Hors ligne"}</p>
                </div>`;
            ligne.querySelector(".nom").textContent = u.username;

            ligne.addEventListener("click", function () {
                ouvrirConversation(u);
            });

            liste.appendChild(ligne);
            afficherStatutListe(u.id); // "en train d'écrire…" si besoin

            if (destinataire && u.id === destinataire.id) {
                afficherStatut(u.connecte);
            }
        }

        if (liste.innerHTML === "") {
            liste.innerHTML = '<p class="vide">Personne d\'autre n\'est inscrit pour l\'instant.</p>';
        }
        marquerSelection();
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
            // conversation ouverte = déjà lue, pas de pastille
            const nonLus = (destinataire && c.id === destinataire.id) ? 0 : c.nonLus;
            const ligne = document.createElement("div");
            ligne.className = "conversation";
            ligne.dataset.id = c.id;
            ligne.innerHTML = `
                <div class="avatar"><span class="pastille ${c.connecte ? "en-ligne" : ""}"></span></div>
                <div class="infos">
                    <p class="nom"></p>
                    <p class="apercu"></p>
                </div>
                <span class="heure">${c.dateEnvoi.slice(11, 16)}</span>
                ${nonLus > 0 ? `<span class="badge">${nonLus}</span>` : ""}`;
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
        marquerSelection();
    } catch (e) {
        messageErreur.textContent = "Impossible de joindre le serveur";
    }
}

// #### OUVRIR UNE CONVERSATION ####

async function ouvrirConversation(u) {
    arreterSaisie();
    autreEcrit = false;
    clearTimeout(minuteurAutre);

    destinataire = u;
    marquerSelection();
    // on ouvre la conversation >> sa pastille de non lus disparaît
    const badge = document.querySelector('.conversation[data-id="' + u.id + '"] .badge');
    if (badge) {
        badge.remove();
    }
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

// pastille avec texte en ligne / hors ligne, ou "en train d'écrire"
function afficherStatut(connecte) {
    destinataireConnecte = connecte;
    const statut = document.getElementById("statut-destinataire");
    if (autreEcrit && destinataire) {
        statut.textContent = destinataire.username + " est en train d'écrire…";
        statut.classList.add("ecrit");
    } else {
        statut.textContent = connecte ? "En ligne" : "Hors ligne";
        statut.classList.remove("ecrit");
    }
    document.getElementById("pastille-destinataire").classList.toggle("en-ligne", connecte);
}

// la flèche retour n'existe que sur la page mobile pour opti la place
const btnRetour = document.getElementById("btn-retour");
if (btnRetour) {
    btnRetour.addEventListener("click", function () {
        
        arreterSaisie();
        autreEcrit = false;

        document.getElementById("zone-messagerie").classList.remove("conversation-ouverte");
        destinataire = null; // on ne regarde plus la conversation
    });
}

// #### WEBSOCKET ####

function connecterSocket() {
    socket = new WebSocket("ws://" + location.host + "/ws/messages?token=" + token);

    // dès que le canal est (re)ouvert >> on recharge la conversation affichée
    socket.addEventListener("open", function () {
        if (destinataire) {
            ouvrirConversation(destinataire); // appelle déjà signalerLu() à la fin
        }
    });

    // le téléphone coupe la connexion quand l'écran se verrouille >> on se reconnecte tout seul
    socket.addEventListener("close", function () {
        if (token) {
            setTimeout(connecterSocket, 2000);
        }
    });

    // à chaque fois que le serveur nous envoie quelque chose
    socket.addEventListener("message", function (e) {
        const data = JSON.parse(e.data);

        if (data.type === "statut") {
            // si quelqu'un s'est connecté ou déconnecté >> on redemande les listes
            chargerUtilisateurs();
            chargerConversations();
        } else if (data.type === "message") {
            majSaisieListe(data.expediteurId, false); // il a envoyé >> il n'écrit plus
            if (destinataire && (data.expediteurId === destinataire.id || data.destinataireId === destinataire.id)) {
                if (data.expediteurId === destinataire.id) {
                    afficherSaisieAutre(false);
                }
                afficherBulle(data);
                // message reçu pendant que la conversation est ouverte = lu
                if (data.expediteurId === destinataire.id) {
                    signalerLu();
                }
            }
            // le dernier message change >> on met la liste à jour
            chargerConversations();
        } else if (data.type === "saisie") {
            majSaisieListe(data.expediteurId, data.enTrain); // dans la liste des utilisateurs
            // on n'affiche l'indicateur que si c'est la personne de la conversation ouverte
            if (destinataire && data.expediteurId === destinataire.id) {
                afficherSaisieAutre(data.enTrain);
            }
        
        } else if (data.type === "reaction") {
            // RÉACTIONS : quelqu'un a réagi >> on met à jour la bulle en direct
            const bulle = document.querySelector('.bulle[data-id="' + data.messageId + '"]');
            if (bulle) {
                majReactions(bulle, data.reactions);
            }
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

    // RÉACTIONS : celles déjà présentes + clic sur la bulle pour réagir
    majReactions(bulle, m.reactions || []);
    bulle.addEventListener("click", function (e) {
        e.stopPropagation();
        ouvrirChoixReactions(bulle);
    });

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

// #### INDICATEUR DE SAISIE ####

let jeTape = false;              // on a déjà prévenu l'autre qu'on écrit ?
let minuteurSaisie = null;       // détecte qu'on a arrêté de taper (2 s sans touche)
let autreEcrit = false;          // la personne affichée est en train d'écrire ?
let minuteurAutre = null;        // sécurité si le "stop" ne arrive jamais (ex : il ferme l'appli)
let destinataireConnecte = false;

function envoyerSaisie(enTrain) {
    if (destinataire && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "saisie", destinataireId: destinataire.id, enTrain: enTrain }));
    }
}

// on prévient qu'on a arrêté d'écrire (seulement si on avait dit qu'on écrivait)
function arreterSaisie() {
    clearTimeout(minuteurSaisie);
    if (jeTape) {
        jeTape = false;
        envoyerSaisie(false);
    }
}

// à chaque touche dans le champ
document.getElementById("champ-message").addEventListener("input", function () {
    if (this.value.trim() === "") {
        arreterSaisie(); // champ vidé = on n'écrit plus
        return;
    }
    // on n'envoie "true" qu'une fois, pas à chaque lettre
    if (!jeTape) {
        jeTape = true;
        envoyerSaisie(true);
    }
    // on relance le compte à rebours à chaque touche
    clearTimeout(minuteurSaisie);
    minuteurSaisie = setTimeout(arreterSaisie, 2000);
});

// affiche ou cache "Untel est en train d'écrire…" dans l'en-tête
function afficherSaisieAutre(enTrain) {
    autreEcrit = enTrain;
    clearTimeout(minuteurAutre);
    if (enTrain) {
        minuteurAutre = setTimeout(function () { afficherSaisieAutre(false); }, 5000);
    }
    afficherStatut(destinataireConnecte);
}

// #### RÉACTIONS ####

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]; // les mêmes que dans main.py

// la barre d'émojis : une seule pour toute la page, on la place sous la bulle choisie
const choixReactions = document.createElement("div");
choixReactions.className = "choix-reactions";
for (const emoji of EMOJIS) {
    const bouton = document.createElement("button");
    bouton.textContent = emoji;
    bouton.addEventListener("click", function (e) {
        e.stopPropagation();
        envoyerReaction(Number(choixReactions.dataset.messageId), emoji);
        choixReactions.remove();
    });
    choixReactions.appendChild(bouton);
}

function ouvrirChoixReactions(bulle) {
    // déjà ouverte sous cette bulle >> on la ferme
    if (choixReactions.isConnected && choixReactions.dataset.messageId === bulle.dataset.id) {
        choixReactions.remove();
        return;
    }
    choixReactions.dataset.messageId = bulle.dataset.id;
    choixReactions.classList.toggle("envoyee", bulle.classList.contains("envoyee"));
    bulle.after(choixReactions);
}

// clic n'importe où ailleurs >> on ferme la barre
document.addEventListener("click", function () {
    choixReactions.remove();
});

function envoyerReaction(messageId, emoji) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "reaction", messageId: messageId, emoji: emoji }));
    }
}

// affiche les réactions en petit sur le bas de la bulle, comme WhatsApp : 👍❤️ 2
function majReactions(bulle, reactions) {
    let zone = bulle.querySelector(".reactions");
    if (!zone) {
        zone = document.createElement("span");
        zone.className = "reactions";
        bulle.appendChild(zone);
    }
    const emojis = [];
    for (const r of reactions) {
        if (!emojis.includes(r.emoji)) {
            emojis.push(r.emoji);
        }
    }
    zone.textContent = emojis.join("") + (reactions.length > 1 ? " " + reactions.length : "");
    zone.style.display = reactions.length > 0 ? "" : "none";
    bulle.classList.toggle("a-reactions", reactions.length > 0);
}

// #### SAISIE DANS LA LISTE DES UTILISATEURS ####

const ecrivent = {}; // id de ceux qui nous écrivent en ce moment -> leur minuteur de sécurité

function majSaisieListe(id, enTrain) {
    clearTimeout(ecrivent[id]);
    delete ecrivent[id];
    if (enTrain) {
        ecrivent[id] = setTimeout(function () { majSaisieListe(id, false); }, 5000);
    }
    afficherStatutListe(id);
}

// sous le nom : "est en train d'écrire…" ou "En ligne" / "Hors ligne"
function afficherStatutListe(id) {
    const statut = document.querySelector('.utilisateur[data-id="' + id + '"] .statut');
    if (!statut) {
        return;
    }
    const ecrit = id in ecrivent;
    if (ecrit) {
        statut.textContent = "est en train d'écrire…";
    } else {
        statut.textContent = statut.dataset.connecte === "true" ? "En ligne" : "Hors ligne";
    }
    statut.classList.toggle("ecrit", ecrit);
}

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
    arreterSaisie();
}

document.getElementById("btn-envoyer").addEventListener("click", envoyerMessage);

document.getElementById("champ-message").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        envoyerMessage();
    }
});
