/* Datos base y utilidades de fecha. Sin dependencias externas. */
(function (global) {
  'use strict';

  const FOODS = [
    { id: 'pan-palta', name: 'Pan integral con palta', emoji: '🥑', category: 'Desayuno', qty: 100, kcal: 134, p: 7.3, c: 17.6, g: 4.2 },
    { id: 'avena', name: 'Avena con leche', emoji: '🥣', category: 'Desayuno', qty: 200, kcal: 116, p: 6.5, c: 15.2, g: 3.1 },
    { id: 'huevo', name: 'Huevo revuelto', emoji: '🍳', category: 'Desayuno', qty: 100, kcal: 148, p: 11, c: 1.5, g: 11 },
    { id: 'yogur', name: 'Yogur griego natural', emoji: '🥛', category: 'Snacks', qty: 150, kcal: 59, p: 10, c: 3.6, g: 0.4 },
    { id: 'yogur-nueces', name: 'Yogur con nueces', emoji: '🥜', category: 'Snacks', qty: 100, kcal: 220, p: 12, c: 18, g: 12 },
    { id: 'plato-pollo', name: 'Pasta con pollo', emoji: '🍝', category: 'Almuerzo', qty: 250, kcal: 190, p: 14, c: 24, g: 4 },
    { id: 'arroz-frijoles', name: 'Arroz con frijoles', emoji: '🍚', category: 'Almuerzo', qty: 250, kcal: 160, p: 7, c: 30, g: 1.5 },
    { id: 'pollo', name: 'Pechuga de pollo', emoji: '🍗', category: 'Almuerzo', qty: 150, kcal: 165, p: 31, c: 0, g: 3.6 },
    { id: 'atun', name: 'Atún al natural', emoji: '🐟', category: 'Almuerzo', qty: 120, kcal: 132, p: 28, c: 0, g: 1.3 },
    { id: 'salmon', name: 'Salmón a la plancha', emoji: '🍣', category: 'Cena', qty: 150, kcal: 208, p: 20, c: 0, g: 13 },
    { id: 'papas-atun', name: 'Papas con atún', emoji: '🥔', category: 'Cena', qty: 250, kcal: 136, p: 12, c: 12, g: 4.4 },
    { id: 'ensalada', name: 'Ensalada grande', emoji: '🥗', category: 'Cena', qty: 250, kcal: 45, p: 2.5, c: 7, g: 1.2 },
    { id: 'tortilla', name: 'Tortilla de harina', emoji: '🫓', category: 'Cena', qty: 60, kcal: 312, p: 8, c: 52, g: 8 },
    { id: 'platano', name: 'Plátano', emoji: '🍌', category: 'Snacks', qty: 120, kcal: 89, p: 1.1, c: 23, g: 0.3 },
    { id: 'manzana', name: 'Manzana', emoji: '🍎', category: 'Snacks', qty: 180, kcal: 52, p: 0.3, c: 14, g: 0.2 },
    { id: 'nueces', name: 'Nueces', emoji: '🌰', category: 'Snacks', qty: 30, kcal: 654, p: 15, c: 14, g: 65 },
    { id: 'aceite', name: 'Aceite de oliva', emoji: '🫒', category: 'Otros', qty: 10, kcal: 884, p: 0, c: 0, g: 100 },
    { id: 'cafe-leche', name: 'Café con leche', emoji: '☕', category: 'Otros', qty: 250, kcal: 45, p: 2.6, c: 4.8, g: 1.8 },
    { id: 'lentejas', name: 'Lentejas cocidas', emoji: '🫘', category: 'Cena', qty: 250, kcal: 116, p: 9, c: 20, g: 0.4 },
    { id: 'queso', name: 'Queso fresco', emoji: '🧀', category: 'Snacks', qty: 60, kcal: 265, p: 17, c: 3, g: 20 }
  ];

  const MEALS = [
    { id: 'desayuno', label: 'Desayuno', emoji: '🌅' },
    { id: 'almuerzo', label: 'Almuerzo', emoji: '☀️' },
    { id: 'cena', label: 'Cena', emoji: '🌙' },
    { id: 'snack1', label: 'Snack 1', emoji: '🍎' },
    { id: 'snack2', label: 'Snack 2', emoji: '🥜' }
  ];

  const SOCIAL_POSTS = [
    {
      id: 'p1', user: 'Camila R.', avatar: '🧑🏽‍🦱', time: 'hace 2 h',
      text: 'Hoy tocó entrenar pierna 🍗 Después de 3 semanas siguiendo el plan, ya se nota la diferencia en el peso. ¡Vamos con todo!',
      tag: 'Ganancia muscular', likes: 24, comments: [{ user: 'Diego M.', text: '¡Excelente! 💪' }]
    },
    {
      id: 'p2', user: 'Mateo G.', avatar: '🧔🏽', time: 'hace 5 h',
      text: 'El desayuno que más me está ayudando: pan integral con palta y huevo. Simple, llena y me da energía para toda la mañana.',
      tag: 'Desayunos', likes: 17, comments: []
    },
    {
      id: 'p3', user: 'Lucía F.', avatar: '👩🏻‍🦰', time: 'ayer',
      text: 'Consejo para quienes empiezan: no obsesionarse con el número de la báscula. Registrar las comidas ya es un gran paso ✅',
      tag: 'Consejos', likes: 42, comments: [{ user: 'Ana P.', text: 'Totalmente cierto 🙌' }]
    }
  ];

  function keyOf(date) {
    const d = new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function fromKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function startOfWeek(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // lunes = 0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function seededState() {
    const today = keyOf(new Date());
    const back = (n) => keyOf(addDays(new Date(), -n));

    return {
      version: 2,
      syncCode: null,
      updatedAt: 0,
      profile: {
        onboarded: false,
        demo: true,
        name: 'T',
        goal: 'Ganancia Muscular',
        emoji: '💪',
        startWeight: 60,
        targetWeight: 66,
        weeklyRate: 0.6,
        waterGoal: 8,
        reminders: false,
        reminderTime: '09:00',
        targets: { kcal: 2354, p: 108, c: 304, g: 78 }
      },
      days: {
        [today]: {
          water: 3,
          finished: false,
          meals: {
            desayuno: [{ id: 'pan-palta', grams: 478 }],
            almuerzo: [{ id: 'plato-pollo', grams: 250 }, { id: 'arroz-frijoles', grams: 350 }, { id: 'aceite', grams: 15 }],
            cena: [],
            snack1: [{ id: 'yogur-nueces', grams: 200 }, { id: 'platano', grams: 80 }]
          }
        },
        [back(1)]: {
          water: 6, finished: true,
          meals: {
            desayuno: [{ id: 'avena', grams: 220 }],
            almuerzo: [{ id: 'arroz-frijoles', grams: 400 }],
            cena: [{ id: 'salmon', grams: 180 }],
            snack1: [{ id: 'manzana', grams: 180 }]
          }
        },
        [back(2)]: {
          water: 5, finished: true,
          meals: {
            desayuno: [{ id: 'huevo', grams: 150 }],
            almuerzo: [{ id: 'pollo', grams: 200 }],
            cena: [{ id: 'lentejas', grams: 300 }],
            snack1: [{ id: 'platano', grams: 120 }]
          }
        },
        [back(3)]: {
          water: 7, finished: true,
          meals: {
            desayuno: [{ id: 'pan-palta', grams: 300 }],
            almuerzo: [{ id: 'atun', grams: 150 }],
            cena: [{ id: 'papas-atun', grams: 300 }],
            snack1: [{ id: 'yogur', grams: 200 }]
          }
        }
      },
      weights: [
        { date: back(21), kg: 58.6 },
        { date: back(14), kg: 59.1 },
        { date: back(7), kg: 59.6 },
        { date: today, kg: 60 }
      ],
      photos: [],
      customFoods: [],
      favorites: [],
      recentFoods: [],
      posts: [],
      metrics: [{ id: 'm1', name: 'Cintura', value: 78, unit: 'cm', date: today }],
      social: { likes: {}, comments: {}, joined: {} },
      chat: [],
      bannerDismissed: false
    };
  }

  function calculateTargets(profile) {
    const weight = Number(profile.weight) || 70;
    const height = Number(profile.height) || 170;
    const age = Number(profile.age) || 30;
    const activity = Number(profile.activity) || 1.375;
    const bmr = 10 * weight + 6.25 * height - 5 * age + (profile.sex === 'femenino' ? -161 : 5);
    const goalAdjust = profile.goal === 'ganancia' ? 250 : profile.goal === 'perdida' ? -400 : 0;
    const kcal = Math.max(1200, Math.round((bmr * activity + goalAdjust) / 10) * 10);
    const proteinPerKg = profile.goal === 'ganancia' ? 1.8 : profile.goal === 'perdida' ? 2 : 1.6;
    const p = Math.round(weight * proteinPerKg);
    const g = Math.round((kcal * 0.25) / 9);
    const c = Math.max(0, Math.round((kcal - p * 4 - g * 9) / 4));
    return { kcal, p, c, g };
  }

  function realState(profile) {
    const today = keyOf(new Date());
    const goal = profile.goal || 'mantenimiento';
    const startWeight = Number(profile.weight) || 70;
    const targetWeight = Number(profile.targetWeight) || startWeight;
    const targets = calculateTargets(profile);
    const goalLabels = { ganancia: '💪 Ganancia Muscular', perdida: '🔥 Pérdida de Grasa', mantenimiento: '⚖️ Mantenimiento' };
    return {
      version: 2,
      syncCode: null,
      updatedAt: 0,
      profile: {
        onboarded: true,
        demo: false,
        name: String(profile.name || 'T').trim().slice(0, 20),
        goal: goalLabels[goal],
        emoji: goal === 'ganancia' ? '💪' : goal === 'perdida' ? '🔥' : '⚖️',
        startWeight,
        targetWeight,
        weeklyRate: goal === 'mantenimiento' ? 0.1 : 0.5,
        waterGoal: 8,
        reminders: false,
        reminderTime: '09:00',
        targets,
        age: Number(profile.age) || 30,
        height: Number(profile.height) || 170,
        sex: profile.sex || 'masculino',
        activity: Number(profile.activity) || 1.375
      },
      days: {},
      weights: [{ date: today, kg: startWeight }],
      photos: [],
      customFoods: [],
      favorites: [],
      recentFoods: [],
      posts: [],
      metrics: [],
      social: { likes: {}, comments: {}, joined: {} },
      chat: [],
      bannerDismissed: false
    };
  }

  const UNIT_OVERRIDES = {
    huevo: [{ label: 'unidad', grams: 50 }],
    platano: [{ label: 'unidad', grams: 120 }],
    manzana: [{ label: 'unidad', grams: 180 }],
    tortilla: [{ label: 'tortilla', grams: 60 }],
    'pan-palta': [{ label: 'porción', grams: 100 }],
    'queso': [{ label: 'porción', grams: 30 }],
    'aceite': [{ label: 'cucharada', grams: 10 }]
  };

  function unitsFor(food) {
    return [
      { label: 'gramos', grams: 1 },
      ...(UNIT_OVERRIDES[food.id] || [{ label: 'porción', grams: 100 }]),
      { label: 'cucharada', grams: 15 },
      { label: 'taza', grams: 200 }
    ];
  }

  global.APP_DATA = { FOODS, MEALS, SOCIAL_POSTS, seededState, realState, calculateTargets, unitsFor, keyOf, fromKey, addDays, startOfWeek };
})(window);
