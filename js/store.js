/* Estado de la app: persistencia, cálculos y acciones. */
(function (global) {
  'use strict';

  const { FOODS, keyOf, addDays, startOfWeek, seededState } = global.APP_DATA;
  const STORAGE_KEY = 'nutriplan.state.v1';

  let state = load();
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seededState();
      const saved = JSON.parse(raw);
      const seed = seededState();
      return {
        ...seed,
        ...saved,
        customFoods: saved.customFoods || [],
        profile: { ...seed.profile, ...saved.profile, targets: { ...seed.profile.targets, ...(saved.profile.targets || {}) } },
        social: { ...seed.social, ...saved.social }
      };
    } catch (error) {
      console.warn('No se pudo leer el estado guardado:', error);
      return seededState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('No se pudo guardar el estado:', error);
    }
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => listeners.splice(listeners.indexOf(fn), 1);
  }

  function emptyDay() {
    return { water: 0, finished: false, meals: { desayuno: [], almuerzo: [], cena: [], snack1: [], snack2: [] } };
  }

  function getDay(key) {
    if (!state.days[key]) state.days[key] = emptyDay();
    const day = state.days[key];
    day.meals = day.meals || {};
    Object.keys(emptyDay().meals).forEach((meal) => { day.meals[meal] = day.meals[meal] || []; });
    return day;
  }

  function foodById(id) {
    return FOODS.find((food) => food.id === id) || state.customFoods.find((food) => food.id === id);
  }

  function addCustomFood(food) {
    const grams = Math.max(1, Number(food.grams) || 100);
    const factor = 100 / grams;
    const custom = {
      id: 'custom-' + Date.now(),
      name: String(food.name || 'Comida').trim().slice(0, 60),
      emoji: '📷',
      category: 'Otros',
      qty: grams,
      photo: food.photo || null,
      kcal: Math.round((Number(food.kcal) || 0) * factor),
      p: Math.round((Number(food.p) || 0) * factor * 10) / 10,
      c: Math.round((Number(food.c) || 0) * factor * 10) / 10,
      g: Math.round((Number(food.g) || 0) * factor * 10) / 10
    };
    state.customFoods.unshift(custom);
    save();
    return custom;
  }

  function itemNutrition(entry) {
    const food = foodById(entry.id);
    if (!food) return { kcal: 0, p: 0, c: 0, g: 0 };
    const factor = entry.grams / 100;
    return {
      kcal: Math.round(food.kcal * factor),
      p: Math.round(food.p * factor * 10) / 10,
      c: Math.round(food.c * factor * 10) / 10,
      g: Math.round(food.g * factor * 10) / 10
    };
  }

  function totalsFor(key) {
    const day = getDay(key);
    const total = { kcal: 0, p: 0, c: 0, g: 0 };
    Object.values(day.meals).forEach((items) => {
      items.forEach((entry) => {
        const n = itemNutrition(entry);
        total.kcal += n.kcal; total.p += n.p; total.c += n.c; total.g += n.g;
      });
    });
    total.p = Math.round(total.p); total.c = Math.round(total.c); total.g = Math.round(total.g);
    return total;
  }

  function scoreFor(key) {
    const total = totalsFor(key);
    if (!total.kcal) return null;
    const t = state.profile.targets;
    const kcalDev = Math.min(1, Math.abs(total.kcal - t.kcal) / t.kcal);
    const macroDev = (['p', 'c', 'g'].reduce((sum, m) => sum + Math.min(1, Math.abs(total[m] - t[m]) / t[m]), 0) / 3);
    return Math.max(35, Math.round(100 - (kcalDev * 45 + macroDev * 35)));
  }

  function weekDays(anchor) {
    const monday = startOfWeek(anchor || new Date());
    const names = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    return names.map((label, i) => {
      const date = addDays(monday, i);
      const key = keyOf(date);
      return { key, label, num: date.getDate(), today: key === keyOf(new Date()), selected: false };
    });
  }

  function projection() {
    const p = state.profile;
    const current = state.weights.length ? state.weights[state.weights.length - 1].kg : p.startWeight;
    const remaining = Math.max(0, Math.round((p.targetWeight - current) * 10) / 10);
    const weeks = Math.max(0, Math.ceil(remaining / p.weeklyRate));
    const eta = keyOf(addDays(new Date(), weeks * 7));
    const span = Math.max(0.1, p.targetWeight - p.startWeight);
    const progress = Math.max(0, Math.min(1, (current - p.startWeight) / span));
    return { current, remaining, weeks, eta, progress, goal: p.targetWeight };
  }

  function addFood(dayKey, meal, foodId, grams) {
    getDay(dayKey).meals[meal].push({ id: foodId, grams: Math.max(1, Number(grams) || 100) });
    save();
  }

  function removeFood(dayKey, meal, index) {
    getDay(dayKey).meals[meal].splice(index, 1);
    save();
  }

  function setWater(dayKey, value) {
    getDay(dayKey).water = Math.max(0, Math.min(state.profile.waterGoal, value));
    save();
  }

  function finishDay(dayKey) {
    getDay(dayKey).finished = true;
    save();
  }

  function addWeight(kg) {
    const value = Math.round(Number(kg) * 10) / 10;
    if (!value || value < 20 || value > 400) return false;
    const today = keyOf(new Date());
    const last = state.weights.find((w) => w.date === today);
    if (last) last.kg = value; else state.weights.push({ date: today, kg: value });
    state.weights.sort((a, b) => a.date.localeCompare(b.date));
    save();
    return true;
  }

  function addPhoto(dataUrl) {
    state.photos.unshift({ id: 'f' + Date.now(), src: dataUrl, date: keyOf(new Date()) });
    save();
  }

  function removePhoto(id) {
    state.photos = state.photos.filter((photo) => photo.id !== id);
    save();
  }

  function addMetric(name, value, unit) {
    if (!name || !value) return false;
    state.metrics.push({ id: 'm' + Date.now(), name: name.trim(), value: value.trim(), unit: (unit || '').trim(), date: keyOf(new Date()) });
    save();
    return true;
  }

  function toggleLike(postId) {
    const likes = state.social.likes;
    likes[postId] = !likes[postId];
    save();
    return likes[postId];
  }

  function toggleJoin(postId) {
    const joined = state.social.joined;
    joined[postId] = !joined[postId];
    save();
    return joined[postId];
  }

  function addComment(postId, text) {
    if (!text || !text.trim()) return false;
    state.social.comments[postId] = state.social.comments[postId] || [];
    state.social.comments[postId].push({ user: 'Tú', text: text.trim() });
    save();
    return true;
  }

  function addChat(role, text, suggestion) {
    state.chat.push({ role, text, time: Date.now(), suggestion: suggestion || null });
    save();
  }

  function clearChat() {
    state.chat = [];
    save();
  }

  function dismissBanner() {
    state.bannerDismissed = true;
    save();
  }

  function reset() {
    state = seededState();
    save();
  }

  global.Store = {
    get state() { return state; },
    save, subscribe, emptyDay, getDay, foodById, itemNutrition, addCustomFood,
    totalsFor, scoreFor, weekDays, projection,
    addFood, removeFood, setWater, finishDay, addWeight,
    addPhoto, removePhoto, addMetric,
    toggleLike, toggleJoin, addComment,
    addChat, clearChat, dismissBanner, reset
  };
})(window);
