/* Arranque, navegación y eventos. */
(function () {
  'use strict';

  const { FOODS, SOCIAL_POSTS, keyOf } = window.APP_DATA;
  const Store = window.Store;
  const UI = window.UI;

  const view = document.getElementById('view');
  const modalRoot = document.getElementById('modal-root');
  const toastEl = document.getElementById('toast');
  const TABS = ['plan', 'social', 'progreso', 'coach'];

  let tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'plan';
  let selectedDate = keyOf(new Date());
  let toastTimer;
  let pendingFoodPhoto = null;

  function render() {
    view.innerHTML = UI.render(tab, selectedDate);
    document.querySelectorAll('.tab').forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
    scrollChat();
  }

  function scrollChat() {
    const log = document.getElementById('chat-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  function openModal(html) {
    modalRoot.innerHTML = html;
    const focusable = modalRoot.querySelector('input:not([type="hidden"]), textarea, button.btn');
    if (focusable) focusable.focus();
  }

  function closeModal() {
    modalRoot.innerHTML = '';
    render();
  }

  function inputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function coachReply(prompt) {
    const p = prompt.toLowerCase();
    const totals = Store.totalsFor(keyOf(new Date()));
    const t = Store.state.profile.targets;
    const remaining = {
      kcal: Math.max(0, t.kcal - totals.kcal),
      p: Math.max(0, t.p - totals.p),
      c: Math.max(0, t.c - totals.c),
      g: Math.max(0, t.g - totals.g)
    };

    if (p.includes('desayuno')) {
      const items = Store.getDay(keyOf(new Date())).meals.desayuno;
      const names = items.map((i) => Store.foodById(i.id)?.name).filter(Boolean).join(' y ');
      return names
        ? `Tu desayuno de hoy lleva ${names}. Para variar sin salirte del plan, prueba avena con leche (200 g) y un huevo: aporta unos 530 kcal con proteínas y grasas más equilibradas. ¿Quieres que lo registre?`
        : 'Todavía no registraste desayuno. Una opción equilibrada: avena con leche (200 g) y huevo revuelto (100 g).';
    }

    if (p.includes('falta') || p.includes('restant') || p.includes('qued')) {
      if (remaining.kcal === 0) return 'Ya completaste tus kcal de hoy. Si tienes hambre, elige algo liviano como una manzana o un yogur natural.';
      return `Te quedan ${UI.fmt(remaining.kcal)} kcal, ${remaining.p} g de proteínas, ${remaining.c} g de carbs y ${remaining.g} g de grasas. Te sugiero arroz con frijoles (250 g) + pechuga de pollo (150 g) + una manzana (180 g).`;
    }

    if (p.includes('cena') || p.includes('cenar')) {
      return 'Tres opciones para cenar dentro de tu plan:\n1) Salmón a la plancha (150 g) con ensalada grande.\n2) Lentejas cocidas (250 g) con tortilla de harina (60 g).\n3) Papas con atún (250 g) y queso fresco (40 g).';
    }

    if (p.includes('hola') || p.includes('buenos')) {
      return '¡Hola! Soy tu coach de nutrición. Puedo ayudarte a ajustar tus comidas, completar lo que falta del día o buscar ideas para cenar.';
    }

    if (p.includes('peso') || p.includes('objetivo')) {
      const proj = Store.projection();
      return `Vas en ${proj.current} kg y tu objetivo es ${proj.goal} kg. Al ritmo actual llegarías en unas ${proj.weeks} semanas. Puedes actualizar tu peso en Progreso → Actualizar Progreso.`;
    }

    if (totals.kcal === 0) {
      return 'Aún no registraste comidas hoy. Empieza por el desayuno y vuelve a preguntarme: analizaré tus macros y te diré qué te falta.';
    }

    return `Hoy llevas ${UI.fmt(totals.kcal)} de ${UI.fmt(t.kcal)} kcal, ${totals.p}/${t.p} g de proteínas, ${totals.c}/${t.c} g de carbs y ${totals.g}/${t.g} g de grasas. ${remaining.p > 10 ? 'Prioriza proteínas en tu próxima comida.' : 'Tus proteínas están encaminadas; cuida el total calórico.'}`;
  }

  function sendCoach(text) {
    const clean = String(text || '').trim();
    if (!clean) return;
    Store.addChat('user', clean);
    render();
    const input = document.getElementById('coach-input');
    if (input) input.value = '';
    setTimeout(() => {
      Store.addChat('coach', coachReply(clean));
      render();
    }, 550);
  }

  function filterFoods(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#food-list .food-row').forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  function filterPosts(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#post-results .post-result').forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  function updateQtyPreview() {
    const preview = document.getElementById('qty-preview');
    if (!preview) return;
    const action = document.querySelector('[data-action="confirm-food"]');
    if (!action) return;
    const grams = Number(inputValue('qty-input')) || 0;
    const n = Store.itemNutrition({ id: action.dataset.food, grams });
    preview.innerHTML = `<span>≈ ${UI.fmt(n.kcal)} kcal</span><span>${n.p}P / ${n.c}C / ${n.g}G</span>`;
  }

  function share(postId) {
    const url = location.href;
    if (navigator.share) {
      navigator.share({ title: 'NutriPlan', text: 'Mira esta publicación en NutriPlan', url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast('Enlace copiado al portapapeles')).catch(() => toast('No se pudo copiar el enlace'));
    } else {
      toast('Compartir no está disponible en este navegador');
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target;

    if (target.classList && target.classList.contains('overlay')) {
      closeModal();
      return;
    }

    const el = target.closest('[data-action]');
    if (!el) return;
    const { action } = el.dataset;

    if (action === 'close-modal') {
      if (el.classList.contains('overlay') && target !== el) return;
      closeModal();
      return;
    }

    switch (action) {
      case 'select-day':
        selectedDate = el.dataset.date;
        render();
        break;
      case 'go-today':
        selectedDate = keyOf(new Date());
        render();
        break;
      case 'water': {
        const day = Store.getDay(selectedDate);
        Store.setWater(selectedDate, day.water + 1);
        render();
        toast(day.water >= Store.state.profile.waterGoal ? '¡Meta de agua cumplida! 💧' : `Vas por ${day.water + 1} vasos de agua`);
        break;
      }
      case 'dismiss-banner':
        Store.dismissBanner();
        render();
        break;
      case 'quick-add':
        openModal(UI.addFood('desayuno'));
        break;
      case 'add-food':
        openModal(UI.addFood(el.dataset.meal));
        break;
      case 'pick-food':
        openModal(UI.quantity(el.dataset.food, el.dataset.meal));
        updateQtyPreview();
        break;
      case 'photo-food':
        pendingFoodPhoto = null;
        openModal(UI.photoFood(el.dataset.meal));
        break;
      case 'save-photo-food': {
        const name = inputValue('photo-food-name');
        const kcal = Number(inputValue('photo-food-kcal'));
        if (!name || !kcal) { toast('Agrega un nombre y las calorías estimadas'); break; }
        if (!pendingFoodPhoto) { toast('Elige una foto del alimento'); break; }
        const custom = Store.addCustomFood({
          name, grams: Number(inputValue('photo-food-grams')) || 250, kcal,
          p: Number(inputValue('photo-food-p')) || 0,
          c: Number(inputValue('photo-food-c')) || 0,
          g: Number(inputValue('photo-food-g')) || 0,
          photo: pendingFoodPhoto
        });
        Store.addFood(selectedDate, el.dataset.meal, custom.id, custom.qty);
        pendingFoodPhoto = null;
        closeModal();
        toast('Comida con foto guardada');
        break;
      }
      case 'confirm-food': {
        const grams = Number(inputValue('qty-input'));
        if (!grams || grams < 1) { toast('Ingresa una cantidad válida'); break; }
        Store.addFood(selectedDate, el.dataset.meal, el.dataset.food, grams);
        closeModal();
        toast(`${Store.foodById(el.dataset.food).name} agregado`);
        break;
      }
      case 'remove-food':
        Store.removeFood(selectedDate, el.dataset.meal, Number(el.dataset.index));
        render();
        toast('Alimento eliminado');
        break;
      case 'finish-day':
        Store.finishDay(selectedDate);
        render();
        toast('Día terminado. ¡Buen trabajo!');
        break;
      case 'edit-targets':
        openModal(UI.targets());
        break;
      case 'save-targets': {
        const targets = {
          kcal: Number(inputValue('target-kcal')) || 2000,
          p: Number(inputValue('target-p')) || 0,
          c: Number(inputValue('target-c')) || 0,
          g: Number(inputValue('target-g')) || 0
        };
        Store.state.profile.targets = targets;
        Store.save();
        closeModal();
        toast('Objetivos actualizados');
        break;
      }
      case 'weight':
      case 'sync':
        openModal(UI.weight());
        break;
      case 'save-weight': {
        const weight = Number(inputValue('weight-input'));
        const target = Number(inputValue('target-input'));
        if (!Store.addWeight(weight)) { toast('Ingresa un peso válido'); break; }
        if (target >= 20 && target <= 400) {
          Store.state.profile.targetWeight = target;
          Store.save();
        }
        closeModal();
        toast('Progreso actualizado');
        break;
      }
      case 'photo':
        openModal(UI.photo());
        break;
      case 'remove-photo':
        Store.removePhoto(el.dataset.id);
        openModal(UI.photo());
        toast('Foto eliminada');
        break;
      case 'metric':
        openModal(UI.metric());
        break;
      case 'save-metric':
        if (!Store.addMetric(inputValue('metric-name'), inputValue('metric-value'), inputValue('metric-unit'))) {
          toast('Completa nombre y valor');
          break;
        }
        closeModal();
        toast('Métrica guardada');
        break;
      case 'comment':
        openModal(UI.comment(el.dataset.post));
        break;
      case 'save-comment':
        if (!Store.addComment(el.dataset.post, inputValue('comment-input'))) { toast('Escribe un comentario'); break; }
        closeModal();
        toast('Comentario publicado');
        break;
      case 'score-detail':
        openModal(UI.scoreDetail());
        break;
      case 'stats-detail':
        openModal(UI.statsDetail());
        break;
      case 'like':
        Store.toggleLike(el.dataset.post);
        render();
        break;
      case 'join':
        Store.toggleJoin(el.dataset.post);
        render();
        break;
      case 'share':
        share();
        break;
      case 'story':
        openModal(UI.story(Number(el.dataset.index) || 0));
        break;
      case 'search':
        openModal(UI.socialSearch());
        break;
      case 'filter-post':
        filterPosts(inputValue('social-search'));
        break;
      case 'coach-chip':
        sendCoach(el.dataset.prompt);
        break;
      case 'attach':
        toast('Elige una foto en Progreso → Fotos');
        break;
      case 'settings':
        openModal(UI.settings());
        break;
      case 'save-profile': {
        const name = inputValue('profile-name');
        const goal = inputValue('profile-goal');
        if (name) Store.state.profile.name = name;
        if (goal) Store.state.profile.goal = goal;
        Store.save();
        closeModal();
        toast('Ajustes guardados');
        break;
      }
      case 'clear-chat':
        Store.clearChat();
        closeModal();
        toast('Conversación borrada');
        break;
      case 'reset':
        if (confirm('¿Restablecer todos los datos? Se borrarán tus registros.')) {
          Store.reset();
          selectedDate = keyOf(new Date());
          closeModal();
          toast('Datos restablecidos');
        }
        break;
      default:
        break;
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'food-search') filterFoods(event.target.value);
    if (event.target.id === 'social-search') filterPosts(event.target.value);
    if (event.target.id === 'qty-input') updateQtyPreview();
    if (event.target.id === 'coach-input') {
      const send = document.getElementById('coach-send');
      if (send) send.classList.toggle('ready', !!event.target.value.trim());
    }
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id === 'coach-form') {
      event.preventDefault();
      sendCoach(inputValue('coach-input'));
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalRoot.innerHTML) closeModal();
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'food-photo-input' && event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        pendingFoodPhoto = String(reader.result);
        const preview = document.getElementById('food-photo-preview');
        if (preview) preview.innerHTML = `<img src="${pendingFoodPhoto}" alt="Vista previa del alimento">`;
      };
      reader.readAsDataURL(event.target.files[0]);
    }
    if (event.target.id === 'photo-input' && event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        Store.addPhoto(String(reader.result));
        openModal(UI.photo());
        render();
        toast('Foto guardada');
      };
      reader.readAsDataURL(file);
    }
  });

  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      tab = btn.dataset.tab;
      location.hash = tab;
      render();
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  });

  window.addEventListener('hashchange', () => {
    const next = location.hash.slice(1);
    if (TABS.includes(next) && next !== tab) {
      tab = next;
      render();
    }
  });

  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((error) => console.warn('Service worker no disponible:', error));
    });
  }
})();
