// ui-improvements.js
document.addEventListener('DOMContentLoaded', function() {
  // Barre de progression si elle existe
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    function updateProgress() {
      const fields = document.querySelectorAll('#workflow-form input[required], #workflow-form select[required], #workflow-form textarea[required]');
      let filled = 0;
      fields.forEach(f => {
        if (f.value && f.value.trim() !== '') filled++;
      });
      const percent = fields.length ? Math.round((filled / fields.length) * 100) : 0;
      const percentEl = document.getElementById('progress-percent');
      if (percentEl) percentEl.textContent = percent + '%';
      progressBar.style.width = percent + '%';
    }
    document.querySelectorAll('#workflow-form input, #workflow-form select, #workflow-form textarea').forEach(el => {
      el.addEventListener('input', updateProgress);
      el.addEventListener('change', updateProgress);
    });
    updateProgress();
  }

  // Bouton d'aide flottant
  const helpBtn = document.getElementById('help-button');
  if (helpBtn) {
    helpBtn.addEventListener('click', function() {
      if (confirm('Voulez-vous revoir le tutoriel ?')) {
        localStorage.removeItem('tourShown');
        location.reload();
      }
    });
  }

  // Amélioration des notifications (déjà géré dans auth.js)
});