// js/tutorial.js

let tourSteps = [];
let currentStep = 0;
let tourActive = false;

function startTour(steps) {
  tourSteps = steps;
  currentStep = 0;
  tourActive = true;
  showStep();
}

function showStep() {
  if (!tourActive || currentStep >= tourSteps.length) {
    endTour();
    return;
  }
  const step = tourSteps[currentStep];
  const target = document.querySelector(step.selector);
  if (!target) {
    // Si l'élément n'existe pas, passer à l'étape suivante
    currentStep++;
    showStep();
    return;
  }
  // Supprimer les anciennes surbrillances
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  target.classList.add('tour-highlight');

  // Créer ou mettre à jour la bulle
  let bubble = document.getElementById('tour-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'tour-bubble';
    bubble.className = 'tour-step';
    document.body.appendChild(bubble);
  }
  bubble.innerHTML = `
    <h4>${step.title}</h4>
    <p>${step.content}</p>
    <div class="tour-buttons">
      <button onclick="nextStep()">Suivant</button>
      <button class="skip" onclick="endTour()">Ignorer</button>
    </div>
  `;

  // Positionner la bulle près de la cible
  const targetRect = target.getBoundingClientRect();
  const bubbleRect = bubble.getBoundingClientRect();
  let top = targetRect.bottom + 10;
  let left = targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2);
  if (top + bubbleRect.height > window.innerHeight) {
    top = targetRect.top - bubbleRect.height - 10;
  }
  if (left < 10) left = 10;
  if (left + bubbleRect.width > window.innerWidth - 10) left = window.innerWidth - bubbleRect.width - 10;
  bubble.style.top = top + 'px';
  bubble.style.left = left + 'px';
}

window.nextStep = function() {
  currentStep++;
  showStep();
};

window.endTour = function() {
  tourActive = false;
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  const bubble = document.getElementById('tour-bubble');
  if (bubble) bubble.remove();
};

// Fonction à appeler pour initialiser le tutoriel selon la page
function initTutorial(pageSteps) {
  // Vérifier dans localStorage si le tour a déjà été montré
  if (localStorage.getItem('tourShown') !== 'true') {
    // Démarrer le tour après un court délai pour que le DOM soit prêt
    setTimeout(() => startTour(pageSteps), 1000);
    localStorage.setItem('tourShown', 'true');
  }
}