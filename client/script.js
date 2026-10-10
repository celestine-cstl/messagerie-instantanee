// les éléments de la page qu'on utilise souvent
const blocConnexion = document.getElementById("bloc-connexion");
const blocInscription = document.getElementById("bloc-inscription");
const messageErreur = document.getElementById("message-erreur");


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

// même règle que dans le contrat : 6 caractères, une majuscule, un chiffre
function mdpValide(mdp) {
    return mdp.length >= 6 && /[A-Z]/.test(mdp) && /[0-9]/.test(mdp);
}

document.getElementById("btn-inscription").addEventListener("click", function () {
    const username = document.getElementById("inscription-username").value.trim();
    const mdp = document.getElementById("inscription-mdp").value;

    if (username === "" || mdp === "") {
        messageErreur.textContent = "Remplis tous les champs";
        return;
    }

    if (!mdpValide(mdp)) {
        messageErreur.textContent = "Mot de passe : 6 caractères minimum, une majuscule et un chiffre";
        return;
    }

    messageErreur.textContent = "";
    // à faire : envoyer au serveur (POST /api/comptes) quand celui de Lina sera prêt
    console.log("inscription ok côté page :", username);
});