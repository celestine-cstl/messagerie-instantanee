// les éléments de la page
const blocConnexion = document.getElementById("bloc-connexion");
const blocInscription = document.getElementById("bloc-inscription");
const messageErreur = document.getElementById("message-erreur");

// infos de la personne connectée 
let token = null;
let monId = null;
let monUsername = null;

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
}


// #### DECONNEXION ####

function deconnecter() {
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
        document.getElementById("liste-conversations").innerHTML =
            '<p class="vide">Pas encore de conversation. Va dans l\'onglet "Utilisateurs" pour écrire à quelqu\'un.</p>';
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
        }

        if (liste.innerHTML === "") {
            liste.innerHTML = '<p class="vide">Personne d\'autre n\'est inscrit pour l\'instant.</p>';
        }
    } catch (e) {
        messageErreur.textContent = "Impossible de joindre le serveur";
    }
}


// #### OUVRIR UNE CONVERSATION ####

function ouvrirConversation(u) {
    destinataire = u;

    document.getElementById("nom-destinataire").textContent = u.username;
    document.getElementById("statut-destinataire").textContent = u.connecte ? "En ligne" : "Hors ligne";
    document.getElementById("pastille-destinataire").classList.toggle("en-ligne", u.connecte);
    document.getElementById("historique").innerHTML = "";
    // sur téléphone : on passe à l'écran de la conversation
    document.getElementById("zone-messagerie").classList.add("conversation-ouverte");
}
// la flèche retour n'existe que sur la page mobile pour opti la place
const btnRetour = document.getElementById("btn-retour");
if (btnRetour) {
    btnRetour.addEventListener("click", function () {
        document.getElementById("zone-messagerie").classList.remove("conversation-ouverte");
    });
}