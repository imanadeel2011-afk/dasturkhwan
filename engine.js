/* =========================================================
   DASTURKHWAN — LOCAL ENGINE  v3
   No API. No internet. No cost. 175 dishes.
   Drop-in replacement — overwrite engine.js completely.
   ========================================================= */

let DISHES = [];
let INDEX  = [];

/* Words we ignore when matching user text */
const STOP = new Set([
  'ka','ki','ke','mein','me','hai','ho','hain','kya','kaise','kaisay','banao',
  'banana','banaye','banane','banaun','banau','bana','tarika','tareeqa','recipe',
  'bataye','batao','bata','se','ko','aaj','kal','raat','subah','sham','shaam',
  'mujhe','chahiye','par','pe','kar','karo','karna','ek','aur','ya','plz','please',
  'yar','yaar','bhai','wala','wali','wale','achi','acha','koi','kuch','sa','si',
  'the','a','an','of','for','me','my','i','want','how','to','make','ap','aap','hum'
]);

const norm   = s => (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const tokens = s => norm(s).split(' ').filter(t => t.length > 1 && !STOP.has(t));

/* Levenshtein — gives us typo tolerance ("bryani" -> "biryani") */
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({length: a.length + 1}, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1,
                d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[a.length][b.length];
}

function fuzzyHit(q, target) {
  if (q === target) return 1;
  if (target.startsWith(q) && q.length >= 4) return 0.8;
  if (q.length >= 5) {
    const d = lev(q, target);
    if (d === 1) return 0.75;   // "khaddi" vs "khadi"  — near certain
    if (d === 2) return 0.45;   // "chai"   vs "chapli" — weak, rank it low
  }
  return 0;
}

/* ---------------- LOAD ---------------- */
async function loadDishes() {
  const res = await fetch('dishes.json');
  DISHES = await res.json();
  INDEX = DISHES.map(d => ({
    dish:   d,
    nameT:  tokens(d.name),
    catT:   tokens(d.category),
    regT:   tokens(d.region),
    ingT:   tokens(d.ingredients.join(' ')),
    descT:  tokens(d.roman_urdu)
  }));
  console.log(`Dasturkhwan: ${DISHES.length} dishes loaded — offline ready`);
  return DISHES;
}

/* ---------------- CONTEXT ---------------- */
function currentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 11 || m <= 2) return 'winter';
  if (m >= 4 && m <= 9)  return 'summer';
  return 'all';
}

function currentSlot() {
  const h = new Date().getHours();
  if (h >=  5 && h < 11) return 'nashta';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 19) return 'chai';
  return 'dinner';
}

const SLOT_LABEL = {
  nashta: 'Nashta', lunch: 'Dopehar ka khana', chai: 'Chai time',
  dinner: 'Raat ka khana', iftar: 'Iftar'
};

function recipeSteps(dish) {
  return dish.recipe.split(/(?=\d+\.\s)/)
    .map(s => s.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

/* Don't repeat recent suggestions */
function recent() {
  try { return JSON.parse(localStorage.getItem('dk_recent') || '[]'); } catch { return []; }
}
function remember(id) {
  const r = [id, ...recent().filter(x => x !== id)].slice(0, 12);
  try { localStorage.setItem('dk_recent', JSON.stringify(r)); } catch {}
}
function clearRecent() { try { localStorage.removeItem('dk_recent'); } catch {} }

/* ---------------- SUGGESTION ENGINE ----------------
   opts = {
     mealTime : 'nashta'|'lunch'|'chai'|'dinner'|'iftar'   (default: auto by clock)
     occasion : 'ghar'|'mehman'|'khaas'
     maxTime  : minutes
     category : 'gosht'|'chicken'|'daal'|...
     region   : 'punjab'|'sindh'|'balochistan'|...
   }
------------------------------------------------------ */
function suggestDish(opts = {}) {
  if (!DISHES.length) return null;

  const season = currentSeason();
  const slot   = opts.mealTime || currentSlot();
  const seen   = recent();

  const scored = DISHES.map(d => {
    let s = 0;

    // 1. Meal slot — the strongest signal
    if (d.meal_time.includes(slot)) s += 35; else s -= 45;

    // 2. Season
    if      (d.season.includes(season)) s += 25;
    else if (d.season.includes('all'))  s += 15;
    else                                s -= 25;

    // 3. Occasion
    if (opts.occasion) {
      if (d.occasion.includes(opts.occasion)) s += 30; else s -= 25;
    }

    // 4. Cooking time
    const max = opts.maxTime || 999;
    if (d.time <= max) s += 15; else s -= 60;

    // 5. Explicit filters
    if (opts.category && d.category === opts.category) s += 80;
    if (opts.category && d.category !== opts.category) s -= 80;
    if (opts.region   && d.region   === opts.region)   s += 80;
    if (opts.region   && d.region   !== opts.region)   s -= 80;

    // 6. Drinks are a side, not an answer
    if (d.category === 'mashroob' && slot !== 'chai') s -= 30;
    if (d.category === 'meetha'   && slot === 'lunch') s -= 20;

    // 7. Variety — recent dishes pushed down
    const idx = seen.indexOf(d.id);
    if (idx > -1) s -= (55 - idx * 4);

    s += Math.random() * 18;
    return { d, s };
  });

  scored.sort((a, b) => b.s - a.s);
  const pick = scored[0].d;
  remember(pick.id);

  return {
    pick,
    alternates: scored.slice(1, 4).map(x => x.d),
    slot,
    slotLabel: SLOT_LABEL[slot],
    season
  };
}

/* ---------------- SEARCH ---------------- */
/* Meal-slot words must not be treated as dish names
   ("iftar" is 2 letters from "matar" — that caused false hits) */
const SLOT_WORDS = /\b(nashta|nashte|breakfast|subah|iftar|sehri|roza|ramzan|ramadan|chai\s*time|snack|shaam|sham|dinner|raat|lunch|dopehar|dupehar)\b/g;

function findDish(query) {
  const cleaned = norm(query).replace(SLOT_WORDS, ' ');
  const qt = tokens(cleaned);
  if (!qt.length) return [];

  const phrase = cleaned.trim();

  const out = INDEX.map(e => {
    let s = 0;
    const fullName = norm(e.dish.name);

    // whole-phrase match beats everything ("halwa puri", "khaddi kebab")
    if (phrase.length >= 4) {
      if (fullName === phrase)            s += 60;
      else if (fullName.includes(phrase)) s += 40;
      else if (phrase.includes(fullName)) s += 40;
    }

    for (const q of qt) {
      for (const t of e.nameT) {
        const h = fuzzyHit(q, t);
        s += h === 1 ? 26 : h * 11;      // exact name token >> fuzzy one
      }
      for (const t of e.regT)  s += fuzzyHit(q, t) * 14;
      for (const t of e.catT)  s += fuzzyHit(q, t) * 6;
      for (const t of e.ingT)  s += fuzzyHit(q, t) * 4;
      for (const t of e.descT) s += fuzzyHit(q, t) * 1.5;
    }
    return { dish: e.dish, s };
  }).filter(r => r.s >= 7);

  out.sort((a, b) => b.s - a.s);
  return out.map(r => r.dish);
}

/* ---------------- CHEF CHAT ---------------- */
function chefReply(query) {
  const q = norm(query);

  if (/^(salam|assalam|asalam|hi|hello|hey|oye)/.test(q))
    return { type:'text', text:
      'Assalam-o-Alaikum! 👨‍🍳 Main aapka chef hoon.<br>' +
      'Kisi bhi dish ka naam likhein, ya batayein ghar mein kya kya hai — ' +
      'ya sirf likhein <b>"aaj kya banao"</b>.' };

  if (/(shukriya|thanks|thank you|jazak)/.test(q))
    return { type:'text', text: 'Khush rahein! 😊 Aur kuch poochna ho to hazir hoon.' };

  // explicit meal-slot requests
  let forced = null;
  if (/(nashta|nashte|breakfast|subah)/.test(q))        forced = 'nashta';
  else if (/(iftar|roza|ramzan|ramadan|sehri)/.test(q)) forced = 'iftar';
  else if (/(chai|snack|shaam|sham)/.test(q))           forced = 'chai';
  else if (/(dinner|raat)/.test(q))                     forced = 'dinner';
  else if (/(lunch|dopehar|dupehar)/.test(q))           forced = 'lunch';

  const wantsSuggestion = /(kya\s*bana|suggest|batao\s*kya|samajh\s*nahi|bhook|bhuk|kuch\s*bhi)/.test(q);
  const matches = findDish(query);

  // slot words are stripped inside findDish, so an empty match here
  // genuinely means "suggest me something" rather than "find this dish"
  if ((wantsSuggestion || forced) && !matches.length) {
    const r = suggestDish(forced ? { mealTime: forced } : {});
    return { type:'dish', dish:r.pick,
      lead: `<b>${r.slotLabel}</b> ke liye meri tajweez: <b>${r.pick.name}</b>`,
      others: `Ye bhi ban sakta hai: ${r.alternates.map(d=>d.name).join(', ')}` };
  }

  if (!matches.length)
    return { type:'text', text:
      'Maazrat, ye dish meri list mein nahi hai. 🤔<br>' +
      'Ye try karein: <b>Chicken Karahi, Biryani, Daal Mash, Chapli Kebab, Sajji, Halwa Puri</b><br>' +
      '— ya likhein <b>"aaj kya banao"</b>.' };

  const dish   = matches[0];
  const others = matches.slice(1, 3);
  return {
    type:'dish', dish,
    lead: `<b>${dish.name}</b> — ${dish.roman_urdu.split('—')[1]?.trim() || ''}`,
    others: others.length ? `Milti julti: ${others.map(d=>d.name).join(', ')}` : null
  };
}

/* ---------------- RENDER ---------------- */
const REGION_LABEL = {
  punjab:'Punjab', sindh:'Sindh', karachi:'Karachi', kpk:'Khyber Pakhtunkhwa',
  balochistan:'Balochistan', kashmir:'Kashmir', gilgit:'Gilgit-Baltistan'
};

function dishToHTML(dish) {
  const steps = recipeSteps(dish).map(s => `<li>${s}</li>`).join('');
  const ings  = dish.ingredients.map(i => `<li>${i}</li>`).join('');
  const slots = dish.meal_time.map(m => SLOT_LABEL[m]).join(' / ');
  return `
  <div class="dish-card">
    <h3>${dish.name}</h3>
    <p class="dish-sub">${dish.roman_urdu}</p>
    <p class="dish-meta">
      ⏱ ${dish.time} min &nbsp;•&nbsp; 🕐 ${slots} &nbsp;•&nbsp;
      📍 ${REGION_LABEL[dish.region] || dish.region} &nbsp;•&nbsp; 🍲 ${dish.category}
    </p>
    <h4>Ajza (Ingredients)</h4>
    <ul>${ings}</ul>
    <h4>Tarika (Recipe)</h4>
    <ol>${steps}</ol>
  </div>`;
}

/* ---------------- UI HOOKS ----------------
   These auto-wire if your HTML has the matching ids.
   Nothing breaks if the ids don't exist.
------------------------------------------- */
function renderSuggestion(targetId = 'result', opts = {}) {
  const box = document.getElementById(targetId);
  if (!box) return;
  const r = suggestDish(opts);
  if (!r) { box.innerHTML = '<p>Dishes load ho rahi hain...</p>'; return; }
  box.innerHTML =
    `<p class="slot-line">${r.slotLabel} — ${r.season === 'winter' ? 'Sardi' : r.season === 'summer' ? 'Garmi' : ''}</p>` +
    dishToHTML(r.pick) +
    `<p class="alt">Aur options: ${r.alternates.map(d => d.name).join(' • ')}</p>`;
}

function sendChefMessage(inputId = 'chatInput', boxId = 'chatBox') {
  const input = document.getElementById(inputId);
  const box   = document.getElementById(boxId);
  if (!input || !box) return;
  const msg = input.value.trim();
  if (!msg) return;

  box.innerHTML += `<div class="msg user">${msg}</div>`;
  input.value = '';

  const r = chefReply(msg);
  const html = r.type === 'dish'
    ? `<p>${r.lead}</p>${dishToHTML(r.dish)}${r.others ? `<p class="alt">${r.others}</p>` : ''}`
    : `<p>${r.text}</p>`;
  box.innerHTML += `<div class="msg chef">${html}</div>`;
  box.scrollTop = box.scrollHeight;
}

/* Auto-load on page ready */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    loadDishes().catch(e => console.error('dishes.json load failed:', e));
  });
}

/* Node/test export */
if (typeof module !== 'undefined') {
  module.exports = { tokens, fuzzyHit, currentSlot, currentSeason,
                     recipeSteps, SLOT_LABEL, REGION_LABEL };
}
