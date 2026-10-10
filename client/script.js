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
        aideMdp.style.color = "#bc3636";
        messageErreur.textContent = "";
        return;
    }

    aideMdp.style.color = "";
    messageErreur.textContent = "";

    try {
        const reponse = await fetch("/api/comptes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, motDePasse: mdp })
        });
        const donnees = await reponse.json();

        if (reponse.status === 201) {
            // compte créé : on repasse sur la connexion avec le nom déjà rempli
            blocInscription.style.display = "none";
            blocConnexion.style.display = "block";
            document.getElementById("login-username").value = donnees.username;
            document.getElementById("inscription-mdp").value = "";
            messageErreur.style.color = "#4ade80";
            messageErreur.textContent = "Votre compte a bien été créé, vous pouvez vous connecter";
        } else {
            // erreur envoyée par le serveur (nom déjà pris, etc)
            messageErreur.textContent = donnees.error;
        }
    } catch (e) {
        messageErreur.textContent = "Impossible de joindre le serveur";
    }
});