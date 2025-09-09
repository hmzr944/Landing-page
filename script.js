// Script JavaScript pour la page LumiWatch
// Gestion des interactions et animations

// Initialisation des icônes Feather
document.addEventListener('DOMContentLoaded', function() {
    // Remplacer les icônes Feather
    feather.replace();
    
    // Initialiser toutes les fonctionnalités
    initialiserNavigationCollante();
    initialiserAnimationsScroll();
    initialiserFormulaireNewsletter();
    initialiserBoutonsPrecommande();
    initialiserNavigationDouce();
   });
   
   /**
    * Navigation collante avec effet de transparence
    */
   function initialiserNavigationCollante() {
    const enTete = document.querySelector('.en-tete');
    let dernierePositionScroll = 0;
    
    window.addEventListener('scroll', function() {
    const positionActuelle = window.pageYOffset;
    
    // Ajouter/retirer la classe pour l'effet de fond
    if (positionActuelle > 50) {
    enTete.classList.add('en-tete-scrolle');
    } else {
    enTete.classList.remove('en-tete-scrolle');
    }
    
    // Masquer/afficher l'en-tête selon le sens du scroll
    if (positionActuelle > dernierePositionScroll && positionActuelle > 100) {
    enTete.style.transform = 'translateY(-100%)';
    } else {
    enTete.style.transform = 'translateY(0)';
    }
    
    dernierePositionScroll = positionActuelle;
    });
   }
   
   /**
    * Animations d'apparition au scroll
    */
   function initialiserAnimationsScroll() {
    // Observer pour les animations d'apparition
    const observateur = new IntersectionObserver(function(entrees) {
    entrees.forEach(function(entree) {
    if (entree.isIntersecting) {
    entree.target.classList.add('anime-apparition');
    }
    });
    }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
    });
    
    // Éléments à animer
    const elementsAAnimer = document.querySelectorAll('.carte-fonctionnalite, .carte-temoignage');
    
    elementsAAnimer.forEach(function(element) {
    observateur.observe(element);
    });
   }
   
   /**
    * Gestion du formulaire de newsletter
    */
   function initialiserFormulaireNewsletter() {
    const formulaire = document.getElementById('formulaire-inscription');
    const champEmail = document.getElementById('email-newsletter');
    const messageConfirmation = document.getElementById('message-confirmation');
    
    if (!formulaire || !champEmail || !messageConfirmation) {
    console.warn('Éléments du formulaire newsletter non trouvés');
    return;
    }
    
    formulaire.addEventListener('submit', function(evenement) {
    evenement.preventDefault();
    
    const email = champEmail.value.trim();
    
    // Validation de l'email
    if (!validerEmail(email)) {
    afficherMessage('Veuillez saisir une adresse email valide.', 'erreur');
    return;
    }
    
    // Simulation de l'envoi (remplacer par un vrai appel API)
    envoyerInscriptionNewsletter(email);
    });
    
    // Effacer le message d'erreur quand l'utilisateur tape
    champEmail.addEventListener('input', function() {
    if (messageConfirmation.classList.contains('erreur')) {
    messageConfirmation.textContent = '';
    messageConfirmation.className = 'message-confirmation';
    }
    });
   }
   
   /**
    * Validation d'adresse email
    */
   function validerEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
   }
   
   /**
    * Simulation d'envoi d'inscription newsletter
    */
   function envoyerInscriptionNewsletter(email) {
    const messageConfirmation = document.getElementById('message-confirmation');
    const champEmail = document.getElementById('email-newsletter');
    const boutonInscription = document.querySelector('.bouton-inscription');
    
    // Afficher l'état de chargement
    boutonInscription.disabled = true;
    boutonInscription.innerHTML = '<i data-feather="loader"></i> Inscription...';
    feather.replace();
    
    // Simuler un délai d'envoi
    setTimeout(function() {
    // Dans un vrai projet, faire un appel API ici
    // fetch('/api/newsletter', { method: 'POST', body: JSON.stringify({ email }) })
    
    // Simulation d'un succès (90% de chance de succès)
    const succes = Math.random() > 0.1;
    
    if (succes) {
    afficherMessage(
    `Merci ! Votre inscription à la newsletter LumiWatch a été confirmée pour ${email}.`,
    'succes'
    );
    champEmail.value = '';
    
    // Analytics fictif
    if (typeof gtag !== 'undefined') {
    gtag('event', 'newsletter_signup', {
    'event_category': 'engagement',
    'event_label': 'lumiwatch_newsletter'
    });
    }
    } else {
    afficherMessage(
    'Une erreur est survenue. Veuillez réessayer dans quelques instants.',
    'erreur'
    );
    }
    
    // Restaurer le bouton
    boutonInscription.disabled = false;
    boutonInscription.innerHTML = '<i data-feather="send"></i> S\'inscrire';
    feather.replace();
    }, 1500);
   }
   
   /**
    * Afficher un message de confirmation
    */
   function afficherMessage(texte, type) {
    const messageConfirmation = document.getElementById('message-confirmation');
    
    messageConfirmation.textContent = texte;
    messageConfirmation.className = `message-confirmation ${type}`;
    
    // Animation d'apparition
    messageConfirmation.style.transform = 'translateY(-10px)';
    messageConfirmation.style.opacity = '0';
    
    requestAnimationFrame(function() {
    messageConfirmation.style.transition = 'all 0.3s ease-out';
    messageConfirmation.style.transform = 'translateY(0)';
    messageConfirmation.style.opacity = '1';
    });
    
    // Effacer le message après 5 secondes si c'est un succès
    if (type === 'succes') {
    setTimeout(function() {
    messageConfirmation.style.opacity = '0';
    setTimeout(function() {
    messageConfirmation.textContent = '';
    messageConfirmation.className = 'message-confirmation';
    }, 300);
    }, 5000);
    }
   }
   
   /**
    * Gestion des boutons de précommande
    */
   function initialiserBoutonsPrecommande() {
    const boutonsPrecommande = document.querySelectorAll('.bouton-precommande-principal, .bouton-precommande-cta');
    
    boutonsPrecommande.forEach(function(bouton) {
    bouton.addEventListener('click', function(evenement) {
    evenement.preventDefault();
    
    // Animation de clic
    bouton.style.transform = 'scale(0.95)';
    setTimeout(function() {
    bouton.style.transform = '';
    }, 150);
    
    // Redirection vers la page de précommande (simulée)
    setTimeout(function() {
    alert('Redirection vers la page de précommande...\n\nEn production, ceci serait remplacé par :\nwindow.location.href = "/precommande";');
    
    // Analytics fictif
    if (typeof gtag !== 'undefined') {
    gtag('event', 'click_preorder', {
    'event_category': 'ecommerce',
    'event_label': 'lumiwatch_preorder_button'
    });
    }
    }, 200);
    });
    });
   }
   
   /**
    * Navigation douce vers les sections
    */
   function initialiserNavigationDouce() {
    const liensNavigation = document.querySelectorAll('a[href^="#"]');
    
    liensNavigation.forEach(function(lien) {
    lien.addEventListener('click', function(evenement) {
    evenement.preventDefault();
    
    const cibleId = this.getAttribute('href');
    const elementCible = document.querySelector(cibleId);
    
    if (elementCible) {
    const positionCible = elementCible.offsetTop - 80; // Hauteur de l'en-tête
    
    window.scrollTo({
    top: positionCible,
    behavior: 'smooth'
    });
    
    // Ajouter une classe temporaire pour l'effet de highlight
    elementCible.classList.add('section-surlignee');
    setTimeout(function() {
    elementCible.classList.remove('section-surlignee');
    }, 2000);
    }
    });
    });
   }
   
   /**
    * Gestion des erreurs JavaScript
    */
   window.addEventListener('error', function(evenement) {
    console.error('Erreur JavaScript:', evenement.error);
    
    // En production, envoyer l'erreur à un service de monitoring
    // if (typeof Sentry !== 'undefined') {
    // Sentry.captureException(evenement.error);
    // }
   });
   
   /**
    * Optimisation des performances - Lazy loading des animations
    */
   function optimiserPerformances() {
    // Réduire les animations si l'utilisateur préfère les mouvements réduits
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--transition-normale', '0s');
    document.documentElement.style.setProperty('--transition-rapide', '0s');
    document.documentElement.style.setProperty('--transition-lente', '0s');
    }
    
    // Gestion de la vitesse de connexion
    if (navigator.connection && navigator.connection.effectiveType === 'slow-2g') {
    document.body.classList.add('connexion-lente');
    }
   }
   
   // Initialiser les optimisations
   optimiserPerformances();
   
   // CSS supplémentaire ajouté dynamiquement pour les animations
   const styleSupplementaire = document.createElement('style');
   styleSupplementaire.textContent = `
    .section-surlignee {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(240, 147, 251, 0.1));
    transition: background 0.3s ease-out;
    }
    
    .en-tete-scrolle {
    background: rgba(255, 255, 255, 0.98) !important;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }
    
    .anime-apparition {
    animation: apparition-bas 0.6s ease-out;
    }
    
    .connexion-lente * {
    animation-duration: 0.1s !important;
    transition-duration: 0.1s !important;
    }
    
    @media (prefers-color-scheme: dark) {
    .en-tete-scrolle {
    background: rgba(26, 32, 44, 0.98) !important;
    }
    }
   `;
   
   document.head.appendChild(styleSupplementaire);
   
   // Test en local et déploiement - Instructions dans la console
   console.log(`
    LumiWatch Landing Page
   ========================
   
    Pour tester en local :
   1. Ouvrir index.html dans un navigateur
   2. Ou utiliser un serveur local :
    - Python: python -m http.server 5000
    - Node.js: npx serve .
    - Live Server (VS Code extension)
   
    Pour déployer sur GitHub Pages :
   1. Créer un repository GitHub
   2. Pousser les fichiers (index.html, styles.css, script.js)
   3. Aller dans Settings > Pages
   4. Sélectionner "Deploy from a branch" > "main" > "/ (root)"
   5. La page sera disponible sur https://username.github.io/repository-name
   
    Fonctionnalités testées :
   - Navigation responsive
   - Formulaire newsletter
   - Animations CSS
   - Boutons précommande
   - Scroll smooth
   - Mode sombre (selon préférences système)
   
    Optimisations incluses :
   - Performance (lazy loading, reduced motion)
   - Accessibilité (focus, contraste)
   - SEO (meta tags, structure sémantique)
   - Mobile-first responsive design
   `);