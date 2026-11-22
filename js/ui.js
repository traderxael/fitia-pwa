/* Render de pantallas y modales. Toda la lógica vive en Store. */
(function (global) {
  'use strict';

  const { FOODS, MEALS, SOCIAL_POSTS, keyOf, addDays } = global.APP_DATA;
  const Store = global.Store;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function fmt(value) {
    return String(Math.round(value || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const ICONS = {
    edit: '<svg viewBox="0 0 24 24"><path d="m4 16.5-.5 3.5 3.5-.5L19 7.5 16.5 5 4 16.5Z"/><path d="m14.5 7 2.5 2.5"/></svg>',
    drop: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.2 6 10.2A6 6 0 0 1 6 13.2C6 9.2 12 3 12 3Z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.4 7 7.2 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4h-.2a1.7 1.7 0 0 0-1.6 1Z"/></svg>'
  };

  function foodThumb(food) {
    const emoji = food && food.emoji ? food.emoji : '🍽️';
    const inner = food && food.photo ? `<img src="${esc(food.photo)}" alt="">` : emoji;
    return `<span class="food-emoji" aria-hidden="true">${inner}</span>`;
  }

  function macroBar(name, value, target, accent) {
    const pct = Math.min(100, Math.round((value / target) * 100));
    return `<div>
      <div class="macro-name">${name} <span>›</span></div>
      <div class="macro-value">${fmt(value)} <em>/ ${fmt(target)} g</em></div>
      <div class="bar ${accent ? 'accent-bar' : ''}"><i style="width:${pct}%"></i></div>
    </div>`;
  }

  function mealTotals(items) {
    return items.reduce((acc, entry) => {
      const n = Store.itemNutrition(entry);
      acc.kcal += n.kcal; acc.p += n.p; acc.c += n.c; acc.g += n.g;
      return acc;
    }, { kcal: 0, p: 0, c: 0, g: 0 });
  }

  /* ---------------- Plan ---------------- */
  function renderPlan(selectedKey) {
    const s = Store.state;
    const day = Store.getDay(selectedKey);
    const totals = Store.totalsFor(selectedKey);
    const t = s.profile.targets;
    const pct = Math.min(100, Math.round((totals.kcal / t.kcal) * 100));
    const isToday = selectedKey === keyOf(new Date());
    const headerLabel = isToday ? 'Hoy' : new Date(selectedKey + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });

    const week = Store.weekDays().map((d) => `
      <button class="day ${d.key === selectedKey ? 'selected' : ''} ${d.today ? 'today' : ''}" type="button" data-action="select-day" data-date="${d.key}" aria-label="${d.label} ${d.num}">
        <span class="day-label">${d.label}</span>
        <span class="day-num">${d.num}</span>
        <span class="day-dot"></span>
      </button>`).join('');

    const promo = s.bannerDismissed ? '' : `
      <div class="promo">
        <div>
          <h3>Cuenta calorías desde tu primera comida</h3>
          <button class="btn btn-sm" type="button" data-action="quick-add">Registrar ahora</button>
        </div>
        <span class="emoji" aria-hidden="true">📅🔥</span>
        <button class="btn-icon btn-close" type="button" data-action="dismiss-banner" aria-label="Cerrar aviso">×</button>
      </div>`;

    const visibleMeals = MEALS.filter((m) => m.id !== 'snack2' || day.meals.snack2.length);
    const meals = visibleMeals.map((meal) => {
      const items = day.meals[meal.id];
      const mt = mealTotals(items);
      const rows = items.map((entry, index) => {
        const food = Store.foodById(entry.id);
        const n = Store.itemNutrition(entry);
        return `<div class="food-item">
          ${foodThumb(food)}
          <div class="grow">
            <div class="food-name">${esc(food ? food.name : entry.id)}</div>
            <div class="food-detail">${entry.grams} g · ${n.p}P / ${n.c}C / ${n.g}G</div>
          </div>
          <span class="food-kcal">${fmt(n.kcal)} kcal</span>
          <button class="remove-food" type="button" data-action="remove-food" data-meal="${meal.id}" data-index="${index}" aria-label="Quitar ${esc(food ? food.name : 'alimento')}">×</button>
        </div>`;
      }).join('');
      return `<section class="card meal">
        <div class="meal-head">
          <div>
            <div class="meal-title">${meal.label}</div>
            <div class="meal-sub">${mt.kcal ? `🔥 ${fmt(mt.kcal)} kcal • ${fmt(mt.p)} P | ${fmt(mt.c)} C | ${fmt(mt.g)} G` : 'Sin registrar'}</div>
          </div>
          <button class="meal-more" type="button" data-action="add-food" data-meal="${meal.id}" aria-label="Agregar a ${meal.label}">⋯</button>
        </div>
        ${rows}
        <button class="add-row" type="button" data-action="add-food" data-meal="${meal.id}" aria-label="Agregar alimento a ${meal.label}">+</button>
      </section>`;
    }).join('');

    const finishDisabled = totals.kcal === 0 || day.finished;

    return `
      <div class="plan-header">
        <button class="btn-ghost" style="border:0;background:none;color:var(--text);padding:0;font-size:32px;font-weight:700;letter-spacing:-.03em;display:flex;align-items:center;gap:6px" type="button" data-action="go-today">${esc(headerLabel)} <span class="muted" style="font-size:20px">⌄</span></button>
        <div class="header-actions">
          <button class="metric-chip" type="button" data-action="water" aria-label="Registrar vaso de agua">${ICONS.drop}<span>${day.water}</span></button>
          <button class="avatar" type="button" data-action="settings" aria-label="Ajustes">${esc(s.profile.name.charAt(0).toUpperCase())}</button>
        </div>
      </div>

      <div class="week">${week}</div>
      ${promo}

      <section class="card">
        <div class="kcal-head">
          <button class="btn-icon edit" type="button" data-action="edit-targets" aria-label="Editar objetivos">${ICONS.edit}</button>
          <div class="kcal-label">kcal ›</div>
          <div class="kcal-value"><span class="consumed">${fmt(totals.kcal)}</span> / ${fmt(t.kcal)}</div>
          <button class="more" type="button" data-action="edit-targets" aria-label="Más opciones de calorías">···</button>
        </div>
        <svg class="gauge" viewBox="0 0 300 64" aria-label="${pct}% del objetivo calórico">
          <path class="track" pathLength="100" d="M 18 54 Q 150 -6 282 54"/>
          <path class="fill" pathLength="100" stroke-dasharray="${pct} 100" d="M 18 54 Q 150 -6 282 54"/>
        </svg>
        <div class="gauge-labels"><span>${fmt(t.kcal * 0.9)}</span><span>${fmt(t.kcal * 1.1)}</span></div>
        <div class="macros">
          ${macroBar('Proteínas', totals.p, t.p)}
          ${macroBar('Carbs', totals.c, t.c)}
          ${macroBar('Grasas', totals.g, t.g)}
        </div>
        <button class="btn" type="button" data-action="finish-day" ${finishDisabled ? 'disabled' : ''}>${day.finished ? '✓ Día terminado' : '+ Terminar Día'}</button>
      </section>

      <div class="stack">${meals}</div>`;
  }

  /* ---------------- Progreso ---------------- */
  function weightChart(weights) {
    const points = weights.slice(-6);
    if (points.length < 2) return '<div class="small muted center" style="padding:30px 0">Registra tu peso para ver la curva.</div>';
    const values = points.map((p) => p.kg);
    const min = Math.min(...values) - 0.6;
    const max = Math.max(...values) + 0.6;
    const range = Math.max(0.1, max - min);
    const coords = points.map((p, i) => {
      const x = 6 + (i / (points.length - 1)) * 88;
      const y = 58 - ((p.kg - min) / range) * 46;
      return { x, y, date: p.date };
    });
    const line = coords.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} 64 L ${coords[0].x.toFixed(1)} 64 Z`;
    return `<svg viewBox="0 0 100 66" preserveAspectRatio="none" aria-label="Evolución del peso">
      <defs><linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffc400" stop-opacity=".45"/><stop offset="100%" stop-color="#ffc400" stop-opacity="0"/></linearGradient></defs>
      <path class="area" d="${area}"/><path class="line" d="${line}" vector-effect="non-scaling-stroke"/>
      ${coords.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.3" fill="#ffc400" vector-effect="non-scaling-stroke"/>`).join('')}
    </svg>`;
  }

  function calChart() {
    const s = Store.state;
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      const key = keyOf(date);
      return { label: new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).slice(0, 2), value: Store.totalsFor(key).kcal };
    });
    const max = Math.max(s.profile.targets.kcal, ...days.map((d) => d.value));
    return days.map((d, i) => `<div class="chart-col ${i === 6 ? 'last' : ''}" title="${fmt(d.value)} kcal">
      <i style="height:${Math.max(4, (d.value / max) * 58)}px"></i><span>${esc(d.label)}</span>
    </div>`).join('');
  }

  function renderProgreso() {
    const s = Store.state;
    const proj = Store.projection();
    const days = Store.weekDays();
    const streak = Store.streak();
    const week = Store.weeklySummary();
    const streakCard = `
      <section class="card streak-card">
        <div class="row-between">
          <div>
            <div class="streak-title"><span aria-hidden="true">🔥</span> <strong>${streak}</strong> días de racha</div>
            <p class="small muted">${week.average ? `Promedio semanal: ${fmt(week.average)} kcal/día` : 'Registra comidas para empezar tu racha'}</p>
          </div>
          <div class="streak-week">
            ${week.days.map((d) => `<div class="streak-day ${d.logged ? 'on' : ''}" title="${d.num}: ${d.kcal ? fmt(d.kcal) + ' kcal' : 'sin registrar'}"><span>${d.label}</span><i></i></div>`).join('')}
          </div>
        </div>
      </section>`;
    const scoreCols = days.map((d) => {
      const score = Store.scoreFor(d.key);
      return `<div class="score-day"><span>${d.label}</span><div class="score-pill" title="${score ? score + '/100' : 'Sin datos'}"><i style="width:${score || 0}%"></i></div></div>`;
    }).join('');

    const photos = s.photos.slice(0, 4).map((p) => `<img src="${esc(p.src)}" alt="Foto de progreso del ${esc(p.date)}">`).join('');
    const metrics = s.metrics.slice(-3).map((m) => `<div class="mini-row"><span>${esc(m.name)}</span><strong>${esc(m.value)} ${esc(m.unit)}</strong></div>`).join('');

    return `
      ${streakCard}
      <section class="connect" style="margin-top:16px">
        <div>
          <h2>Connect</h2>
          <p>Registra tu peso y pasos automáticamente.</p>
          <button class="btn btn-sm" type="button" data-action="sync">Sincronizar ahora</button>
        </div>
        <span class="connect-art" aria-hidden="true">⚖️</span>
      </section>

      <div class="section-head"><h2>Score Nutricional</h2><button class="link-arrow" type="button" data-action="score-detail" aria-label="Ver detalle del score">›</button></div>
      <section class="card score-card">
        <div class="score-week">${scoreCols}</div>
        <div class="score-note"><span aria-hidden="true">💡</span><span>${Store.scoreFor(keyOf(new Date())) ? 'Sigue registrando comidas para descubrir información sobre tu semana.' : 'Sigue registrando comidas para descubrir información sobre tu semana.'}</span></div>
      </section>

      <div class="section-head"><h2>Objetivo</h2><button class="link-arrow" type="button" data-action="weight" aria-label="Editar objetivo">›</button></div>
      <section class="card goal-card">
        <h3>${s.profile.emoji} ${esc(s.profile.goal)}</h3>
        <div class="goal-numbers">
          <strong>${fmt(proj.current)} kg</strong>
          <span class="accent">${ICONS.target}</span>
          <strong>${fmt(proj.goal)} kg</strong>
        </div>
        <div class="bar accent-bar"><i style="width:${Math.round(proj.progress * 100)}%"></i></div>
        <div class="goal-meta"><span>${ICONS.calendar} Llegarás en</span><strong>${proj.weeks} semanas</strong></div>
        <button class="btn" type="button" data-action="weight">+ Actualizar Progreso</button>
      </section>

      <div class="section-head"><h2>Estadísticas</h2><button class="link-arrow" type="button" data-action="stats-detail" aria-label="Ver estadísticas">›</button></div>
      <div class="stats-grid">
        <section class="card stat">
          <div class="stat-title"><span class="ico">⚡</span> Calorías</div>
          <div class="stat-chart">${calChart()}</div>
        </section>
        <section class="card stat">
          <div class="stat-title"><span class="ico">🏋️</span> Peso Balanza</div>
          <div style="margin-top:auto">
            <div style="font-size:24px;font-weight:700">${fmt(proj.current)}<span style="font-size:14px">kg</span></div>
            <div class="stat-line">${weightChart(s.weights)}</div>
            <div class="row" style="justify-content:space-between;font-size:11px;color:var(--faint)">
              ${s.weights.slice(-4).map((w) => `<span>${w.date.slice(8)}</span>`).join('')}
            </div>
          </div>
        </section>
        <section class="card stat">
          <div class="stat-title"><span class="ico">📷</span> Fotos</div>
          <button class="stat-cta" type="button" data-action="photo" style="border:0;background:none;color:var(--text);width:100%">
            ${photos ? `<span class="photo-grid" style="display:grid">${photos}</span>` : `<span class="ico">📸</span><strong>Añadir fotos</strong><span>para ver el progreso</span>`}
          </button>
        </section>
        <section class="card stat">
          <div class="stat-title"><span class="ico">📊</span> Métricas</div>
          <div class="stat-cta" style="margin-top:auto">
            <span class="ico">🧮</span>
            <button class="btn btn-ghost btn-sm" type="button" data-action="metric" style="width:100%;margin-bottom:10px">Agregar métrica</button>
            ${metrics ? `<div class="mini-list">${metrics}</div>` : '<span>Registra medidas corporales</span>'}
          </div>
        </section>
      </div>`;
  }

  /* ---------------- Social ---------------- */
  function renderSocial() {
    const s = Store.state;
    const stories = ['🧑🏽‍🦱', '🧔🏽', '👩🏻‍🦰', '👨🏽‍🦱', '👩🏽‍🦱', '🧑🏼']
      .map((avatar, index) => `<button class="story" type="button" data-action="story" data-index="${index}" aria-label="Ver historia"><span class="story-ring"><span>${avatar}</span></span><span>Nuevo</span></button>`).join('');

    const posts = SOCIAL_POSTS.map((post) => {
      const liked = !!s.social.likes[post.id];
      const joined = !!s.social.joined[post.id];
      const comments = [...post.comments, ...(s.social.comments[post.id] || [])];
      return `<article class="card post">
        <div class="post-head">
          <span class="post-avatar" aria-hidden="true">${post.avatar}</span>
          <div class="grow"><strong style="font-size:14px">${esc(post.user)}</strong><div class="tiny muted">${esc(post.time)}</div></div>
          <button class="btn btn-ghost btn-sm" type="button" data-action="join" data-post="${post.id}">${joined ? 'Siguiendo' : 'Seguir'}</button>
        </div>
        <p class="post-body">${esc(post.text)}</p>
        <span class="post-tag">#${esc(post.tag)}</span>
        <div class="post-actions">
          <button class="post-action ${liked ? 'liked' : ''}" type="button" data-action="like" data-post="${post.id}" aria-label="Me gusta">${liked ? '♥' : '♡'} ${post.likes + (liked ? 1 : 0)}</button>
          <button class="post-action" type="button" data-action="comment" data-post="${post.id}" aria-label="Comentar">💬 ${comments.length}</button>
          <button class="post-action" type="button" data-action="share" aria-label="Compartir">↗ Compartir</button>
        </div>
        ${comments.map((c) => `<div class="comment"><strong>${esc(c.user)}:</strong><span>${esc(c.text)}</span></div>`).join('')}
      </article>`;
    }).join('');

    return `
      <div class="social-header"><h1>Social</h1><button class="btn-icon" type="button" data-action="search" aria-label="Buscar">${ICONS.search}</button></div>
      <div class="stories">${stories}</div>
      <div class="stack" style="margin-top:12px">${posts}</div>`;
  }

  /* ---------------- Coach ---------------- */
  function coachHeadline() {
    const totals = Store.totalsFor(keyOf(new Date()));
    const t = Store.state.profile.targets;
    if (!totals.kcal) return 'Registra tu primera comida';
    const names = { p: 'proteínas', c: 'carbohidratos', g: 'grasas' };
    const off = ['p', 'c', 'g'].filter((m) => totals[m] > t[m] * 1.15);
    const low = ['p', 'c', 'g'].filter((m) => totals[m] < t[m] * 0.4);
    if (off.length) return `${off.map((m) => names[m]).join(' y ')} por encima de tu objetivo`;
    if (low.length) return `Te faltan ${low.map((m) => names[m]).join(' y ')} hoy`;
    return 'Ningún nutriente clave fuera de rango';
  }

  function renderCoach() {
    const chat = Store.state.chat.map((msg, index) => `<div class="bubble ${msg.role}">${esc(msg.text)}${msg.suggestion ? `<button class="suggestion-btn" type="button" data-action="coach-apply" data-index="${index}">✓ ${esc(msg.suggestion.label)}</button>` : ''}</div>`).join('');
    return `
      <div class="coach-view">
        <div class="coach-top">
          <button class="btn-icon" type="button" data-action="settings" aria-label="Menú">☰</button>
          <h2>NutriPlan Coach</h2>
          <button class="btn-icon" type="button" data-action="settings" aria-label="Ajustes">${ICONS.settings}</button>
        </div>
        <div class="coach-hero">
          <div class="spark" aria-hidden="true">✨</div>
          <h1>${esc(coachHeadline())}</h1>
          <div class="chips">
            <button class="chip" type="button" data-action="coach-chip" data-prompt="cambiar mi desayuno">🔄 Cambiar mi desayuno</button>
            <button class="chip" type="button" data-action="coach-chip" data-prompt="armar lo que falta del día">📋 Armar lo que falta del día</button>
            <button class="chip" type="button" data-action="coach-chip" data-prompt="ideas para cena">👨‍🍳 Ideas para cena</button>
          </div>
        </div>
        <div class="chat-log" id="chat-log">${chat}</div>
        <form class="composer" id="coach-form">
          <button class="attach" type="button" data-action="attach" aria-label="Adjuntar foto">🖼️</button>
          <input id="coach-input" type="text" placeholder="Preguntar a NutriPlan Coach" aria-label="Preguntar a NutriPlan Coach" autocomplete="off">
          <button class="send" id="coach-send" type="submit" aria-label="Enviar mensaje">↑</button>
        </form>
      </div>`;
  }

  function render(tab, selectedKey) {
    if (tab === 'plan') return renderPlan(selectedKey);
    if (tab === 'progreso') return renderProgreso();
    if (tab === 'social') return renderSocial();
    return renderCoach();
  }

  /* ---------------- Modales ---------------- */
  function shell(title, subtitle, body) {
    return `<div class="overlay" data-action="close-modal">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}" data-sheet>
        <div class="sheet-grab"></div>
        <button class="btn-icon btn-close" type="button" data-action="close-modal" aria-label="Cerrar">×</button>
        <h2>${esc(title)}</h2>
        ${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ''}
        ${body}
      </div>
    </div>`;
  }

  function addFood(meal) {
    const all = [...Store.state.customFoods, ...FOODS];
    const list = all.map((food) => `<button class="food-row" type="button" data-action="pick-food" data-food="${food.id}" data-meal="${meal}">
      ${foodThumb(food)}
      <span class="food-info"><strong>${esc(food.name)}</strong><small>${food.kcal} kcal · ${food.p}P / ${food.c}C / ${food.g}G por 100 g</small></span>
      <span class="plus">+</span>
    </button>`).join('');
    return shell('¿Qué has comido hoy?', 'Elige un alimento. No te preocupes por los pesos exactos: una estimación sirve.',
      `<button class="btn btn-ghost" type="button" data-action="photo-food" data-meal="${meal}" style="margin-bottom:12px">📷 Registrar con una foto</button>
       <input class="search-input" id="food-search" type="search" placeholder="Buscar alimento…" aria-label="Buscar alimento">
       <div class="food-list" id="food-list">${list}</div>`);
  }

  function photoFood(meal) {
    return shell('Registrar con foto', 'Sube una foto y estima los valores. Puedes aproximar: para eso está el coach.', `
      <label class="photo-drop" for="food-photo-input">
        <span id="food-photo-preview" class="photo-drop-inner">📷<small>Toca para elegir una foto</small></span>
        <input id="food-photo-input" type="file" accept="image/*" hidden>
      </label>
      <label class="field"><span>Nombre del alimento</span><input id="photo-food-name" type="text" placeholder="Mi desayuno" maxlength="60"></label>
      <label class="field"><span>Cantidad (g)</span><input id="photo-food-grams" type="number" min="1" max="3000" value="250"></label>
      <div class="row">
        <label class="field grow"><span>kcal</span><input id="photo-food-kcal" type="number" min="0" max="5000" placeholder="450"></label>
        <label class="field grow"><span>Proteínas</span><input id="photo-food-p" type="number" min="0" placeholder="25"></label>
      </div>
      <div class="row">
        <label class="field grow"><span>Carbs</span><input id="photo-food-c" type="number" min="0" placeholder="45"></label>
        <label class="field grow"><span>Grasas</span><input id="photo-food-g" type="number" min="0" placeholder="15"></label>
      </div>
      <button class="btn" type="button" data-action="save-photo-food" data-meal="${meal}">Guardar en ${esc(MEALS.find((m) => m.id === meal).label)}</button>`);
  }

  function quantity(foodId, meal) {
    const food = Store.foodById(foodId);
    return shell(food.name, `Agregar a ${MEALS.find((m) => m.id === meal).label}`, `
      <label class="field"><span>Cantidad (gramos)</span><input id="qty-input" type="number" min="1" max="3000" step="1" value="${food.qty}"></label>
      <div class="qty-preview" id="qty-preview"></div>
      <button class="btn" type="button" data-action="confirm-food" data-food="${food.id}" data-meal="${meal}">Agregar comida</button>`);
  }

  function weight() {
    const proj = Store.projection();
    return shell('Actualizar progreso', 'Registra tu peso de hoy para recalcular la fecha de tu objetivo.', `
      <label class="field"><span>Peso actual (kg)</span><input id="weight-input" type="number" min="20" max="400" step="0.1" value="${proj.current}"></label>
      <label class="field"><span>Peso objetivo (kg)</span><input id="target-input" type="number" min="20" max="400" step="0.1" value="${Store.state.profile.targetWeight}"></label>
      <button class="btn" type="button" data-action="save-weight">Guardar progreso</button>`);
  }

  function targets() {
    const t = Store.state.profile.targets;
    return shell('Objetivos diarios', 'Ajusta tus metas de calorías y macronutrientes.', `
      <label class="field"><span>Calorías (kcal)</span><input id="target-kcal" type="number" min="500" max="10000" value="${t.kcal}"></label>
      <div class="row">
        <label class="field grow"><span>Proteínas (g)</span><input id="target-p" type="number" min="0" value="${t.p}"></label>
        <label class="field grow"><span>Carbs (g)</span><input id="target-c" type="number" min="0" value="${t.c}"></label>
        <label class="field grow"><span>Grasas (g)</span><input id="target-g" type="number" min="0" value="${t.g}"></label>
      </div>
      <button class="btn" type="button" data-action="save-targets">Guardar objetivos</button>`);
  }

  function photo() {
    const photos = Store.state.photos.map((p) => `<div style="position:relative"><img src="${esc(p.src)}" alt="Foto de progreso" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px">
      <button class="btn-icon btn-close" type="button" data-action="remove-photo" data-id="${p.id}" aria-label="Eliminar foto">×</button></div>`).join('');
    return shell('Fotos de progreso', 'Guarda una foto cada semana para ver tu evolución.', `
      <label class="btn btn-ghost" style="margin-bottom:16px">📷 Tomar o elegir foto<input id="photo-input" type="file" accept="image/*" hidden></label>
      <div class="photo-grid">${photos}</div>`);
  }

  function metric() {
    return shell('Agregar métrica', 'Por ejemplo: cintura, pecho o porcentaje de grasa.', `
      <label class="field"><span>Nombre</span><input id="metric-name" type="text" placeholder="Cintura" maxlength="30"></label>
      <div class="row">
        <label class="field grow"><span>Valor</span><input id="metric-value" type="text" placeholder="78" maxlength="12"></label>
        <label class="field grow"><span>Unidad</span><input id="metric-unit" type="text" placeholder="cm" maxlength="8"></label>
      </div>
      <button class="btn" type="button" data-action="save-metric">Guardar métrica</button>`);
  }

  function comment(postId) {
    return shell('Comentarios', 'Comparte tu experiencia con la comunidad.', `
      <label class="field"><span>Tu comentario</span><input id="comment-input" type="text" placeholder="Escribe algo…" maxlength="240"></label>
      <button class="btn" type="button" data-action="save-comment" data-post="${postId}">Publicar comentario</button>`);
  }

  function scoreDetail() {
    const rows = Store.weekDays().map((d) => {
      const score = Store.scoreFor(d.key);
      const kcal = Store.totalsFor(d.key).kcal;
      return `<div class="mini-row" style="font-size:13px;padding:8px 0;border-bottom:1px solid var(--border)"><span>${d.label} · ${d.num}</span><strong>${kcal ? `${fmt(kcal)} kcal · ${score}/100` : 'Sin registrar'}</strong></div>`;
    }).join('');
    return shell('Score Nutricional', 'Mide qué tan cerca estuviste de tus objetivos cada día.', rows);
  }

  const STORIES = [
    { avatar: '🧑🏽‍🦱', text: 'Hoy elegí el pan integral con palta que me recomendó el coach. ¡Riquísimo y me mantuvo lleno toda la mañana!' },
    { avatar: '🧔🏽', text: 'Semana 6 del plan. La báscula dice 59.6 kg y ya casi llego a mi objetivo. Constancia.' },
    { avatar: '👩🏻‍🦰', text: 'Mi cena de hoy: salmón con ensalada. 20 minutos y queda increíble 🐟' },
    { avatar: '👨🏽‍🦱', text: 'Aprendí a registrar las comidas aunque no sean exactas. Una estimación sirve para avanzar.' },
    { avatar: '👩🏽‍🦱', text: 'Más agua, más energía. Hoy ya voy por 6 vasos 💧' },
    { avatar: '🧑🏼', text: 'Primera vez que completo mis macros. Pequeñas victorias cada día.' }
  ];

  function story(index) {
    const item = STORIES[index] || STORIES[0];
    return shell('Historia', 'Lo que la comunidad está compartiendo hoy.', `
      <div class="card" style="text-align:center;padding:32px 20px">
        <div style="font-size:64px">${item.avatar}</div>
        <p style="margin-top:16px;font-size:15px;line-height:1.5">${esc(item.text)}</p>
      </div>`);
  }

  function socialSearch() {
    const rows = SOCIAL_POSTS.map((post, i) => `<button class="food-row post-result" type="button" data-post="${i}" style="margin-bottom:6px">
      <span class="food-emoji" aria-hidden="true">${post.avatar}</span>
      <span class="food-info"><strong>${esc(post.user)}</strong><small>${esc(post.text.slice(0, 90))}…</small></span>
    </button>`).join('');
    return shell('Buscar en Social', 'Encuentra publicaciones por persona o palabra.', `
      <input class="search-input" id="social-search" type="search" placeholder="Buscar publicación…" aria-label="Buscar publicación">
      <div id="post-results">${rows}</div>`);
  }

  function settings() {
    const s = Store.state;
    return shell('Ajustes', 'Tus datos se guardan solo en este dispositivo.', `
      <label class="field"><span>Nombre</span><input id="profile-name" type="text" value="${esc(s.profile.name)}" maxlength="20"></label>
      <label class="field"><span>Objetivo</span><input id="profile-goal" type="text" value="${esc(s.profile.goal)}" maxlength="40"></label>
      <button class="btn" type="button" data-action="save-profile">Guardar cambios</button>
      <button class="btn btn-ghost" type="button" data-action="clear-chat" style="margin-top:10px">Borrar conversación del Coach</button>
      <button class="btn btn-ghost" type="button" data-action="export-data" style="margin-top:10px">⬇️ Exportar mis datos</button>
      <button class="btn btn-ghost" type="button" data-action="import-data" style="margin-top:10px">⬆️ Importar datos</button>
      <input id="import-input" type="file" accept="application/json,.json" hidden>
      <button class="btn btn-ghost" type="button" data-action="reset" style="margin-top:10px;color:#ff8a8a">Restablecer todos los datos</button>`);
  }

  function statsDetail() {
    const s = Store.state;
    const rows = s.weights.map((w) => `<div class="mini-row" style="font-size:13px;padding:8px 0;border-bottom:1px solid var(--border)"><span>${esc(w.date)}</span><strong>${w.kg} kg</strong></div>`).join('');
    return shell('Estadísticas', 'Historial de peso registrado.', rows || '<p class="muted">Todavía no hay registros.</p>');
  }

  global.UI = { render, addFood, photoFood, quantity, weight, targets, photo, metric, comment, scoreDetail, settings, statsDetail, story, socialSearch, macroBar, esc, fmt };
})(window);
