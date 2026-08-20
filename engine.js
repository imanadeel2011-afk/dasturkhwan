/* ============================================================
   DASTURKHWAN — LOCAL ENGINE  v4
   No API. No internet. No cost. 175 dishes.

   This file OVERRIDES doSuggest() and doChat() from index.html.
   Because <script src="engine.js"> loads AFTER the inline script,
   these definitions win. Nothing else in index.html needs editing.
   ============================================================ */

let DISHES = [];
let INDEX  = [];
let DISHES_READY = false;

const STOP = new Set([
  'ka','ki','ke','mein','me','hai','ho','hain','kya','kaise','kaisay','banao',
  'banana','banaye','banane','banaun','banau','bana','banain','tarika','tareeqa',
  'recipe','bataye','batao','bata','se','ko','aaj','kal','raat','subah','sham',
  'shaam','mujhe','chahiye','par','pe','kar','karo','karna','ek','aur','ya','plz',
  'please','yar','yaar','bhai','wala','wali','wale','achi','acha','koi','kuch',
  'sa','si','the','an','of','for','my','want','how','to','make','ap','aap',
  'hum','with','and','exact','step','by','authentic','restaurant','jaisi','jaisa',
  'measurements','perfect','liye','cooking','tip','sawaal','poocho','dum'
]);

const norm   = s => (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const tokens = s => norm(s).split(' ').filter(t => t.length > 1 && !STOP.has(t));

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
    if (d === 1) return 0.75;
    if (d === 2) return 0.45;
  }
  return 0;
}

/* ---------------- INGREDIENT ALIASES ----------------
   index.html checkboxes spell things differently from
   dishes.json. This bridges them.
------------------------------------------------------ */
const ING_ALIAS = {
  'gobhi':['gobi','phool gobi'], 'gobi':['gobhi','phool gobi'],
  'loki':['lauki'], 'lauki':['loki'],
  'torai':['tori'], 'tori':['torai'],
  'shalgam':['shaljam'], 'shaljam':['shalgam'],
  'anday':['anda','ande'], 'anda':['anday'],
  'boti':['mutton','beef'],
  'chawal':['basmati chawal'], 'basmati chawal':['chawal'],
  'machli':['machli','jhinga'],
  'daal mash':['sabut mash','mash'], 'daal masoor':['masoor'],
  'daal chana':['chana daal'], 'daal moong':['moong'],
  'kabuli chana':['chana','channay','chole'],
  'sarson ka saag':['sarson'], 'palak':['palak','saag'],
  'ghee':['ghee','makhan','charbi'],
  'doodh':['doodh','khoya','cream','dahi'],
  'cheeni':['cheeni','khoya'],
  'atta':['atta','maida','suji'],
  'tinda':['tinda'], 'arvi':['arvi'], 'methi':['methi'],
};

/* Words too generic to identify an ingredient on their own.
   "Shimla Mirch" must not match "Lal Mirch" just because both say mirch. */
const WEAK_ING_WORDS = new Set(['mirch','masala','atta','daal','powder','ka','ki','sabut','pisa','pisi']);

function ingMatch(userIng, dishIng) {
  const u = norm(userIng), di = norm(dishIng);
  if (!u || !di) return false;

  if (di === u) return true;

  /* A bare weak word ("Atta") must match exactly — otherwise every
     Atta dish matches "Makai ka Atta", which is a different thing. */
  const diBare = di.split(' ').length === 1 && WEAK_ING_WORDS.has(di);
  const uBare  = u.split(' ').length === 1 && WEAK_ING_WORDS.has(u);
  if (diBare || uBare) {
    if (di !== u) {
      const alts0 = ING_ALIAS[u] || [];
      if (alts0.indexOf(di) === -1) return false;
      return true;
    }
  }

  if (di.includes(u) || u.includes(di)) return true;

  const alts = ING_ALIAS[u] || [];
  for (const a of alts) if (di === a || di.includes(a) || a.includes(di)) return true;

  const ut = u.split(' ').filter(function (w) { return w.length >= 3; });
  const dt = di.split(' ').filter(function (w) { return w.length >= 3; });
  if (!ut.length || !dt.length) return false;

  /* every distinctive word in the user's ingredient must be present */
  const strong = ut.filter(function (w) { return !WEAK_ING_WORDS.has(w); });
  const need = strong.length ? strong : ut;

  return need.every(function (x) {
    return dt.some(function (y) { return x === y || (x.length >= 5 && lev(x, y) <= 1); });
  });
}

/* ---------------- LOAD ---------------- */
async function loadDishes() {
  const res = await fetch('dishes.json');
  DISHES = await res.json();
  INDEX = DISHES.map(d => ({
    dish: d,
    nameT: tokens(d.name), catT: tokens(d.category), regT: tokens(d.region),
    ingT: tokens(d.ingredients.join(' ')), descT: tokens(d.roman_urdu)
  }));
  DISHES_READY = true;
  console.log('Dasturkhwan: ' + DISHES.length + ' dishes loaded — offline ready');
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
const SLOT_LABEL = { nashta:'Nashta', lunch:'Dopehar ka khana', chai:'Chai time',
                     dinner:'Raat ka khana', iftar:'Iftar' };
const REGION_LABEL = { punjab:'Punjab', sindh:'Sindh', karachi:'Karachi',
  kpk:'Khyber Pakhtunkhwa', balochistan:'Balochistan', kashmir:'Kashmir',
  gilgit:'Gilgit-Baltistan' };

const recipeSteps = d => d.recipe.split(/(?=\d+\.\s)/)
  .map(s => s.replace(/^\d+\.\s*/,'').trim()).filter(Boolean);

function recent() { try { return JSON.parse(localStorage.getItem('dk_recent')||'[]'); } catch(e) { return []; } }
function remember(id) {
  const r = [id].concat(recent().filter(x => x !== id)).slice(0, 14);
  try { localStorage.setItem('dk_recent', JSON.stringify(r)); } catch(e) {}
}
function clearRecent() { try { localStorage.removeItem('dk_recent'); } catch(e) {} }

/* ---------------- SCORING ---------------- */
function scoreDish(d, opts, season, slot, seen, avoidNames) {
  let s = 0;

  if (d.meal_time.indexOf(slot) > -1) s += 30; else s -= 40;

  if      (d.season.indexOf(season) > -1) s += 22;
  else if (d.season.indexOf('all')  > -1) s += 13;
  else                                    s -= 25;

  if (opts.occasion) {
    if (d.occasion.indexOf(opts.occasion) > -1) s += 28; else s -= 22;
  }

  /* Time is a HARD constraint — the user said how long they have.
     A soft penalty let 50-min dishes win a 25-min request. */
  const max = opts.maxTime || 999;
  if (d.time <= max)          s += 18;
  else if (d.time <= max + 10) s -= 60;    // slight overrun, allowed if nothing else fits
  else                         s -= 200;   // way over — effectively excluded

  if (opts.category) s += (d.category === opts.category) ? 80 : -80;
  if (opts.region)   s += (d.region   === opts.region)   ? 80 : -80;

  /* ---- INGREDIENTS: the decisive factor for this app ---- */
  if (opts.ingredients && opts.ingredients.length) {
    const matched = d.ingredients.filter(function (di) {
      return opts.ingredients.some(function (ui) { return ingMatch(ui, di); });
    });
    const coverage = matched.length / d.ingredients.length;
    const mainHave = opts.ingredients.some(function (ui) { return ingMatch(ui, d.ingredients[0]); });

    if (mainHave) s += 55; else s -= 45;   // main ingredient decides it
    s += coverage * 45;
    if (matched.length === 0) s -= 90;
  }

  if (d.category === 'mashroob' && slot !== 'chai') s -= 30;

  const idx = seen.indexOf(d.id);
  if (idx > -1) s -= (50 - idx * 3);

  if (avoidNames && avoidNames.length) {
    const dn = norm(d.name);
    if (avoidNames.some(function (a) { return a && (dn.indexOf(a) > -1 || a.indexOf(dn) > -1); })) s -= 70;
  }

  return s + Math.random() * 14;
}

function suggestDish(opts) {
  opts = opts || {};
  if (!DISHES.length) return null;
  const season = currentSeason();
  const slot   = opts.mealTime || currentSlot();
  const seen   = recent();
  const scored = DISHES.map(function (d) {
    return { d: d, s: scoreDish(d, opts, season, slot, seen, opts.avoid) };
  }).sort(function (a,b) { return b.s - a.s; });
  const pick = scored[0].d;
  remember(pick.id);
  return { pick: pick, alternates: scored.slice(1,4).map(function(x){return x.d;}),
           slot: slot, slotLabel: SLOT_LABEL[slot], season: season };
}

/* N different dishes that actually go together — not 3 daals */
function suggestMulti(opts, count) {
  opts = opts || {}; count = count || 2;
  if (!DISHES.length) return [];
  const season = currentSeason();
  const slot   = opts.mealTime || currentSlot();
  const seen   = recent();

  /* If what the user has is mostly baking/dessert items, desserts must
     be allowed — otherwise "Doodh + Cheeni + Elaichi" returns a paratha. */
  const SWEET_ING = ['cheeni','khoya','doodh','elaichi','badam','pista','kishmish',
                     'nariyal','khajoor','seviyan','suji','gur','bread','zarda rang'];
  const picked = (opts.ingredients || []).map(norm);
  const sweetHits = picked.filter(function (x) { return SWEET_ING.indexOf(x) > -1; }).length;
  const sweetMode = picked.length > 0 && sweetHits >= Math.ceil(picked.length * 0.6);

  const scored = DISHES
    .filter(function (d) {
      if (d.category === 'mashroob') return false;
      if (d.category === 'meetha')   return sweetMode;   // desserts only when asked for
      return !sweetMode;                                  // sweet mode = sweet answers
    })
    .map(function (d) { return { d: d, s: scoreDish(d, opts, season, slot, seen, opts.avoid) }; })
    .sort(function (a,b) { return b.s - a.s; });

  const out = [], usedCat = {};
  for (let i = 0; i < scored.length && out.length < count; i++) {
    const d = scored[i].d;
    if (usedCat[d.category]) continue;          // variety pass
    out.push(d); usedCat[d.category] = 1;
  }
  for (let i = 0; i < scored.length && out.length < count; i++) {
    if (out.indexOf(scored[i].d) === -1) out.push(scored[i].d);
  }
  out.forEach(function (d) { remember(d.id); });
  return out;
}

function suggestDessert(opts) {
  opts = opts || {};
  const season = currentSeason(), seen = recent();
  const scored = DISHES.filter(function (d) { return d.category === 'meetha'; })
    .map(function (d) {
      return { d: d, s: scoreDish(d, { occasion: opts.occasion }, season, 'dinner', seen, opts.avoid) };
    }).sort(function (a,b) { return b.s - a.s; });
  if (!scored.length) return null;
  remember(scored[0].d.id);
  return scored[0].d;
}

/* ---------------- SEARCH ---------------- */
const SLOT_WORDS = /\b(nashta|nashte|breakfast|subah|iftar|sehri|roza|ramzan|ramadan|snack|shaam|sham|dinner|raat|lunch|dopehar|dupehar)\b/g;

function findDish(query) {
  const cleaned = norm(query).replace(SLOT_WORDS, ' ');
  const qt = tokens(cleaned);
  if (!qt.length) return [];
  const phrase = cleaned.trim();

  return INDEX.map(function (e) {
    let s = 0;
    const fullName = norm(e.dish.name);
    if (phrase.length >= 4) {
      if (fullName === phrase)                 s += 60;
      else if (fullName.indexOf(phrase) > -1)  s += 40;
      else if (phrase.indexOf(fullName) > -1)  s += 40;
    }
    for (let i = 0; i < qt.length; i++) {
      const q = qt[i];
      for (const t of e.nameT) { const h = fuzzyHit(q,t); s += (h === 1 ? 26 : h * 11); }
      for (const t of e.regT)  s += fuzzyHit(q,t) * 14;
      for (const t of e.catT)  s += fuzzyHit(q,t) * 6;
      for (const t of e.ingT)  s += fuzzyHit(q,t) * 4;
      for (const t of e.descT) s += fuzzyHit(q,t) * 1.5;
    }
    return { dish: e.dish, s: s };
  }).filter(function (r) { return r.s >= 7; })
    .sort(function (a,b) { return b.s - a.s; })
    .map(function (r) { return r.dish; });
}

/* ---------------- TEXT BUILDERS ---------------- */
function dishWhy(d, userIng) {
  const tag = (d.roman_urdu.split('—')[1] || d.roman_urdu).trim();
  const bits = [tag];
  if (userIng && userIng.length) {
    const m = d.ingredients.filter(function (di) {
      return userIng.some(function (ui) { return ingMatch(ui, di); });
    });
    if (m.length >= 2) bits.push('Aap ke paas ' + m.slice(0,3).join(', ') + ' maujood hai');
  }
  const s = currentSeason();
  if (d.season.indexOf('winter') > -1 && s === 'winter') bits.push('Sardi ke liye behtareen');
  if (d.season.indexOf('summer') > -1 && s === 'summer') bits.push('Garmi mein halka rehta hai');
  bits.push(d.time + ' minute mein tayyar');
  return bits.join('. ') + '.';
}

function dishTags(d) {
  const t = [d.time + ' min', d.category];
  if (d.region !== 'punjab') t.push(REGION_LABEL[d.region] || d.region);
  if (d.season.indexOf('winter') > -1) t.push('Sardi');
  if (d.season.indexOf('summer') > -1) t.push('Garmi');
  if (d.occasion.indexOf('khaas') > -1) t.push('Dawat');
  return t.slice(0, 4);
}

/* Plain-text recipe, used by Chef Chat and WhatsApp share */
function dishToText(d) {
  return d.name + '\n' + d.roman_urdu + '\n\n' +
         'Time: ' + d.time + ' minute   |   ' + (REGION_LABEL[d.region] || d.region) + '\n\n' +
         'AJZA:\n' + d.ingredients.join(' • ') + '\n\nTARIKA:\n' +
         recipeSteps(d).map(function (s,i) { return (i+1) + '. ' + s; }).join('\n');
}

/* ============================================================
   OVERRIDES — replace the AI versions from index.html
   ============================================================ */

window.doSuggest = function () {
  if (!DISHES_READY) { toast('Dishes load ho rahi hain, 1 second...', true); return; }

  const ing = [].slice.call(document.querySelectorAll('input[name="ing"]:checked'))
                .map(function (i) { return i.value; });
  if (!ing.length) { toast('Kuch ingredients select karo!', true); return; }

  const occSel = document.querySelector('input[name="occ"]:checked');
  const dcSel  = document.querySelector('input[name="dc"]:checked');
  const tmSel  = document.querySelector('input[name="tm"]:checked');
  const dstSel = document.querySelector('input[name="dst"]:checked');

  const occ = occSel ? occSel.value : 'ghar';
  const dc  = parseInt(dcSel ? dcSel.value : '2', 10);
  const tmR = tmSel ? tmSel.value : '30-45 minute';
  const dst = dstSel ? dstSel.value : 'nahi';
  const maxTime = tmR.indexOf('15') === 0 ? 25 : (tmR.indexOf('30') === 0 ? 45 : 60);

  const lastEl = document.getElementById('lastMeal');
  const lastInput = lastEl ? lastEl.value.trim() : '';
  let hist = [];
  try { hist = (JSON.parse(localStorage.getItem('dkh_h') || '[]') || []).slice(0,5).map(function(x){return x.meal;}); } catch(e) {}
  const avoid = [lastInput].concat(hist).filter(Boolean).map(norm);

  const btn = document.getElementById('sugBtn');
  btn.disabled = true;
  document.getElementById('sugLoader').style.display = 'block';
  document.getElementById('sugResult').style.display = 'none';

  setTimeout(function () {
    try {
      const opts = { occasion: occ, maxTime: maxTime, ingredients: ing, avoid: avoid };
      const picks = suggestMulti(opts, dc);

      if (!picks.length) {
        toast('In ingredients se koi dish nahi mili — kuch aur select karo', true);
        return;
      }

      const obj = {
        dishes: picks.map(function (d, i) {
          return { num: i+1, name: d.name, why: dishWhy(d, ing), tags: dishTags(d), _d: d };
        }),
        overall: buildOverall(picks, occ)
      };

      if (dst === 'haan') {
        const ds = suggestDessert({ occasion: occ, avoid: avoid });
        if (ds) obj.dessert = { name: ds.name, why: dishWhy(ds, ing), tags: dishTags(ds), _d: ds };
      }

      showDishesLocal(obj);
      S.s('dkh_lr', makeTextLocal(obj));
      document.getElementById('sugResult').style.display = 'block';
      document.getElementById('sugResult').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      toast('Error: ' + e.message, true);
    } finally {
      btn.disabled = false;
      document.getElementById('sugLoader').style.display = 'none';
    }
  }, 260);
};

function buildOverall(picks, occ) {
  const total = Math.max.apply(null, picks.map(function (d) { return d.time; }));
  const names = picks.map(function (d) { return d.name; }).join(' aur ');
  const occTxt = occ === 'khaas'  ? 'Dawat ke liye ye combination behtareen rahega'
               : occ === 'mehman' ? 'Mehmanon ke liye ye achi jorri hai'
               :                    'Ghar ke khane ke liye ye set mukammal hai';
  return occTxt + '. ' + names + ' — taqreeban ' + total +
         ' minute mein tayyar. Roti ya chawal saath rakhein.';
}

function showDishesLocal(obj) {
  const box = document.getElementById('dishCards');
  let html = '';

  function card(d, label, idx) {
    const tags = (d.tags || []).map(function (t) { return '<span class="dtag">' + t + '</span>'; }).join('');
    const full = d._d;
    const steps = recipeSteps(full).map(function (s) { return '<li style="margin-bottom:5px">' + s + '</li>'; }).join('');
    return '<div class="dcard">' +
      '<div class="dnum">' + label + '</div>' +
      '<div class="dname">' + d.name + '</div>' +
      '<div class="dwhy">' + d.why + '</div>' +
      (tags ? '<div class="dtags">' + tags + '</div>' : '') +
      '<button class="btn btn-ghost" style="width:100%;margin-top:11px" ' +
        'onclick="toggleRec(\'rec' + idx + '\',this)">Poori Recipe Dekhein</button>' +
      '<div id="rec' + idx + '" style="display:none;margin-top:12px;' +
        'border-top:1px solid rgba(200,140,8,0.13);padding-top:12px">' +
        '<div class="lbl">Ajza</div>' +
        '<div style="font-size:12.5px;color:var(--parch);line-height:1.9;margin-bottom:12px">' +
          full.ingredients.join(' &nbsp;•&nbsp; ') + '</div>' +
        '<div class="lbl">Tarika</div>' +
        '<ol style="font-size:12.5px;color:var(--cream);line-height:1.75;padding-left:18px;margin-top:6px">' +
          steps + '</ol>' +
      '</div></div>';
  }

  (obj.dishes || []).forEach(function (d, i) { html += card(d, 'Dish ' + (d.num || i+1), i); });
  if (obj.dessert) html += card(obj.dessert, 'Meetha', 99);
  if (obj.overall) html += '<div class="overall-box">' + obj.overall + '</div>';
  box.innerHTML = html;
}

window.toggleRec = function (id, btn) {
  const el = document.getElementById(id);
  const open = el.style.display === 'block';
  el.style.display = open ? 'none' : 'block';
  btn.textContent = open ? 'Poori Recipe Dekhein' : 'Recipe Chupayein';
};

function makeTextLocal(obj) {
  let t = '';
  (obj.dishes || []).forEach(function (d) { t += dishToText(d._d) + '\n\n'; });
  if (obj.dessert) t += 'MEETHA\n' + dishToText(obj.dessert._d) + '\n\n';
  if (obj.overall) t += obj.overall;
  return t.trim();
}

/* ---------------- CHEF CHAT OVERRIDE ---------------- */
window.doChat = function () {
  const inp = document.getElementById('chatInp');
  const msg = inp.value.trim();
  if (!msg) return;

  addMsg(msg, 'user');
  inp.value = '';

  if (!DISHES_READY) {
    addMsg('Dishes load ho rahi hain — 1 second baad dobara poochein.', 'bot');
    return;
  }

  const btn = document.getElementById('chatBtn');
  btn.disabled = true;
  const tid = 'c' + Date.now();
  addMsg('Soch raha hoon...', 'bot typing', tid);

  setTimeout(function () {
    const t = document.getElementById(tid);
    if (t) t.remove();
    addMsg(chefReplyText(msg), 'bot');
    btn.disabled = false;
  }, 320);
};

function chefReplyText(query) {
  const q = norm(query);

  if (/^(salam|assalam|asalam|hi|hello|hey|oye)/.test(q))
    return 'Assalam-o-Alaikum! Main aapka chef hoon.\n\nKisi bhi dish ka naam likhein, ya batayein ghar mein kya kya hai — ya sirf likhein "aaj kya banao".';

  if (/(shukriya|thanks|thank you|jazak)/.test(q))
    return 'Khush rahein! Aur kuch poochna ho to hazir hoon.';

  let forced = null;
  if (/(nashta|nashte|breakfast|subah)/.test(q))        forced = 'nashta';
  else if (/(iftar|roza|ramzan|ramadan|sehri)/.test(q)) forced = 'iftar';
  else if (/(chai time|snack|shaam|sham)/.test(q))      forced = 'chai';
  else if (/(dinner|raat)/.test(q))                     forced = 'dinner';
  else if (/(lunch|dopehar|dupehar)/.test(q))           forced = 'lunch';

  const wantsSuggestion = /(kya\s*bana|suggest|batao\s*kya|samajh\s*nahi|bhook|bhuk|kuch\s*bhi)/.test(q);
  const matches = findDish(query);

  if ((wantsSuggestion || forced) && !matches.length) {
    const r = suggestDish(forced ? { mealTime: forced } : {});
    return r.slotLabel + ' ke liye meri tajweez:\n\n' + dishToText(r.pick) +
      '\n\nYe bhi ban sakta hai: ' + r.alternates.map(function(d){return d.name;}).join(', ');
  }

  if (!matches.length)
    return 'Maazrat, ye dish meri list mein nahi hai.\n\nYe try karein: Chicken Karahi, Biryani, Daal Mash, Chapli Kebab, Sajji, Halwa Puri, Nihari, Haleem\n\n— ya likhein "aaj kya banao".';

  const others = matches.slice(1, 3);
  return dishToText(matches[0]) +
    (others.length ? '\n\nMilti julti: ' + others.map(function(x){return x.name;}).join(', ') : '');
}

/* ---------------- BOOT ---------------- */
document.addEventListener('DOMContentLoaded', function () {
  loadDishes().then(function () {
    // no AI any more — fix the wording that says there is
    document.querySelectorAll('.hero-desc').forEach(function (el) {
      el.innerHTML = el.innerHTML.replace('AI batayega', 'App batayega');
    });
    document.querySelectorAll('.hero-tag').forEach(function (el) {
      if (el.textContent.indexOf('AI') > -1) el.textContent = '175 Pakistani Dishes';
    });
    document.querySelectorAll('.pgh p').forEach(function (el) {
      el.innerHTML = el.innerHTML.replace('AI batayega', 'App batayega')
                                 .replace('AI in meals', 'App in meals');
    });
    const ld = document.querySelector('#sugLoader p');
    if (ld) ld.textContent = 'Dishes dhoondi ja rahi hain...';
  }).catch(function (e) { console.error('dishes.json load failed:', e); });
});

/* ============================================================
   WHATSAPP REMOVAL  (v5)
   Green API's free plan caps at 3 chats, so auto-messaging can
   never be free for many users. Removed entirely — along with
   Supabase — so the app has no external services at all.
   Replaced with copy-to-clipboard + native share, both unlimited
   and free.
   ============================================================ */

/* Kill the old network functions so nothing can call a dead backend */
window.registerUser = function () {};
window.loadUsers    = function () {};
window.renderWA     = function () {};
window.saveSettings = function () {};
window.sendTestWA   = function () {};
window.enableNotif  = function () {};

/* Copy the last suggestion to the clipboard */
window.copyRecipe = function () {
  const txt = (S.g('dkh_lr') || '').trim();
  if (!txt) { toast('Pehle suggestion lo!', true); return; }
  const done = () => toast('Copy ho gaya! Kahin bhi paste karein');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(done).catch(fallbackCopy);
  } else fallbackCopy();

  function fallbackCopy() {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); }
    catch (e) { toast('Copy nahi hua', true); }
    document.body.removeChild(ta);
  }
};

/* Native share sheet — user picks WhatsApp, SMS, email, anything */
window.shareRecipe = function () {
  const txt = (S.g('dkh_lr') || '').trim();
  if (!txt) { toast('Pehle suggestion lo!', true); return; }
  const body = txt + '\n\n— Dasturkhwan\nhttps://dasturkhwan.onrender.com';
  if (navigator.share) {
    navigator.share({ title: 'Dasturkhwan — Aaj Ka Khana', text: body })
      .catch(function () {});
  } else {
    window.copyRecipe();
  }
};

/* Old names still referenced by index.html buttons */
window.shareWA = window.shareRecipe;
window.fabWA   = window.shareRecipe;

function stripWhatsAppUI() {
  /* 1. Remove the Auto WhatsApp tab and its page */
  const tab = document.getElementById('nt-wa');
  if (tab) tab.remove();
  const page = document.getElementById('pg-wa');
  if (page) page.remove();

  /* 2. Turn the floating green button into a Share button */
  const fab = document.querySelector('.wafab');
  if (fab) {
    fab.innerHTML = '<div class="fring"></div>↗';
    fab.title = 'Share karein';
    fab.onclick = window.shareRecipe;
  }

  /* 3. Home page quick action: Auto WhatsApp -> Share */
  document.querySelectorAll('.qat').forEach(function (b) {
    if ((b.textContent || '').toLowerCase().indexOf('whatsapp') > -1) {
      b.classList.remove('wa');
      b.innerHTML = '<span>Recipe Share Karo</span>';
      b.onclick = window.shareRecipe;
    }
  });

  /* 4. Result buttons: "WhatsApp Bhejo" -> Copy + Share */
  document.querySelectorAll('.ract .btn-wa').forEach(function (b) {
    b.className = 'btn btn-ghost';
    b.style.marginTop = '0';
    b.textContent = 'Copy Karo';
    b.onclick = window.copyRecipe;
  });
  const ract = document.querySelector('.ract');
  if (ract && !document.getElementById('shareBtn')) {
    const s = document.createElement('button');
    s.id = 'shareBtn';
    s.className = 'btn btn-ghost';
    s.style.cssText = 'width:100%;margin-top:8px;justify-content:center';
    s.textContent = 'Share Karo';
    s.onclick = window.shareRecipe;
    ract.parentNode.insertBefore(s, ract.nextSibling);
  }

  /* 5. Profile: remove the WhatsApp number field */
  const pwa = document.getElementById('pWA');
  if (pwa) { const row = pwa.closest('.frow'); if (row) row.remove(); }

  /* 6. Privacy note is now literally true — no server, no database */
  document.querySelectorAll('.asbar span').forEach(function (el) {
    el.textContent = 'Sab data sirf aapke phone mein — koi server nahi';
  });
}

document.addEventListener('DOMContentLoaded', function () {
  stripWhatsAppUI();
  setTimeout(stripWhatsAppUI, 400);   // catch anything rendered late
});

/* ============================================================
   INGREDIENT EXPANSION + USABILITY  (v6)
   Adds the ingredients that actually appear in dishes.json but
   had no checkbox — Dahi alone is in 34 dishes. Plus a selection
   counter, quick-picks and a Clear button.
   All injected here so index.html needs no editing.
   ============================================================ */

/* New aliases for the ingredients being added */
Object.assign(ING_ALIAS, {
  'makai ka atta': ['makai', 'makki'],
  'jhinga':        ['jhinga'],
  'band gobi':     ['band gobi'],
  'shimla mirch':  ['shimla'],
  'dahi':          ['dahi', 'yogurt'],
  'makhan':        ['makhan', 'butter'],
  'seviyan':       ['seviyan'],
  'suji':          ['suji', 'sooji'],
  'maida':         ['maida'],
  'nariyal':       ['nariyal', 'coconut'],
  'khajoor':       ['khajoor', 'dates'],
  'elaichi':       ['elaichi'],
  'badam':         ['badam'],
  'pista':         ['pista'],
  'kishmish':      ['kishmish'],
  'hari mirch':    ['hari mirch'],
  'podina':        ['podina'],
  'dhania':        ['dhania'],
  'imli':          ['imli'],
  'paneer':        ['paneer'],
  'cream':         ['cream'],
  'gandum':        ['gandum'],
  'bread':         ['bread'],
  'paye':          ['paye', 'siri']
});

/* [id, label, value] — value must match dishes.json spelling */
const NEW_INGREDIENTS = {
  'gosht': [
    ['i_jh', 'Jhinga',  'Jhinga'],
    ['i_py2','Paye',    'Paye']
  ],
  'sabzi': [
    ['i_sm', 'Shimla Mirch', 'Shimla Mirch'],
    ['i_bgb','Band Gobi',    'Band Gobi']
  ],
  'anaj': [
    ['i_mka','Makai ka Atta', 'Makai ka Atta'],
    ['i_md', 'Maida',         'Maida'],
    ['i_sj', 'Suji',          'Suji'],
    ['i_gnd','Gandum',        'Gandum']
  ],
  'meetha': [
    ['i_el', 'Elaichi',  'Elaichi'],
    ['i_bd', 'Badam',    'Badam'],
    ['i_ps', 'Pista',    'Pista'],
    ['i_ksh','Kishmish', 'Kishmish'],
    ['i_nry','Nariyal',  'Nariyal'],
    ['i_khj','Khajoor',  'Khajoor'],
    ['i_svy','Seviyan',  'Seviyan'],
    ['i_brd','Bread',    'Bread']
  ]
};

/* Two brand-new sections */
const NEW_SECTIONS = [
  { title: 'Dairy', after: 'meetha', items: [
    ['i_dh', 'Dahi',   'Dahi'],
    ['i_crm','Cream',  'Cream'],
    ['i_mkn','Makhan', 'Makhan'],
    ['i_pnr','Paneer', 'Paneer']
  ]},
  { title: 'Masalay aur Herbs', after: 'dairy', items: [
    ['i_hm', 'Hari Mirch', 'Hari Mirch'],
    ['i_dhn','Dhania',     'Dhania'],
    ['i_pod','Podina',     'Podina'],
    ['i_iml','Imli',       'Imli'],
    ['i_lmu','Limu',       'Limu'],
    ['i_ajw','Ajwain',     'Ajwain'],
    ['i_kln','Kalonji',    'Kalonji'],
    ['i_sf', 'Saunf',      'Saunf']
  ]}
];

function makeCheckbox(id, label, value) {
  const inp = document.createElement('input');
  inp.className = 'ci'; inp.type = 'checkbox';
  inp.name = 'ing'; inp.id = id; inp.value = value;
  const lab = document.createElement('label');
  lab.className = 'cl'; lab.setAttribute('for', id);
  lab.textContent = label;
  return [inp, lab];
}

/* Find a section's .ig grid by the heading text above it */
function gridAfterHeading(match) {
  const heads = document.querySelectorAll('#pg-suggest .sh');
  for (const h of heads) {
    if ((h.textContent || '').toLowerCase().indexOf(match) > -1) {
      let el = h.nextElementSibling;
      while (el && !el.classList.contains('ig')) el = el.nextElementSibling;
      return el;
    }
  }
  return null;
}

function expandIngredients() {
  const suggest = document.getElementById('pg-suggest');
  if (!suggest || document.getElementById('i_dh')) return;   // already done

  /* 1. Add to existing sections */
  const map = {
    gosht:  gridAfterHeading('gosht'),
    sabzi:  gridAfterHeading('sabziyan'),
    anaj:   gridAfterHeading('anaj'),
    meetha: gridAfterHeading('meetha')
  };
  Object.keys(NEW_INGREDIENTS).forEach(function (key) {
    const grid = map[key];
    if (!grid) return;
    NEW_INGREDIENTS[key].forEach(function (row) {
      if (document.getElementById(row[0])) return;
      const parts = makeCheckbox(row[0], row[1], row[2]);
      grid.appendChild(parts[0]); grid.appendChild(parts[1]);
    });
  });

  /* 2. Add the two new sections after Meetha */
  const meethaGrid = map.meetha;
  if (meethaGrid) {
    let anchor = meethaGrid;
    NEW_SECTIONS.forEach(function (sec) {
      const h = document.createElement('div');
      h.className = 'sh';
      h.textContent = sec.title;
      const g = document.createElement('div');
      g.className = 'ig';
      sec.items.forEach(function (row) {
        if (document.getElementById(row[0])) return;
        const parts = makeCheckbox(row[0], row[1], row[2]);
        g.appendChild(parts[0]); g.appendChild(parts[1]);
      });
      anchor.parentNode.insertBefore(h, anchor.nextSibling);
      anchor.parentNode.insertBefore(g, h.nextSibling);
      anchor = g;
    });
  }

  addIngredientControls();
  wireCounter();
}

/* Quick-picks, counter, clear */
function addIngredientControls() {
  const card = document.querySelector('#pg-suggest .card:nth-of-type(3)');
  const firstHead = document.querySelector('#pg-suggest .sh');
  if (!firstHead || document.getElementById('ingTools')) return;

  const bar = document.createElement('div');
  bar.id = 'ingTools';
  bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:4px';
  bar.innerHTML =
    '<button class="qc" onclick="quickPick(\'basics\')">Ghar ki aam cheezein</button>' +
    '<button class="qc" onclick="quickPick(\'chicken\')">Chicken set</button>' +
    '<button class="qc" onclick="quickPick(\'sweet\')">Meethay ka saman</button>' +
    '<button class="qc" onclick="quickPick(\'clear\')">Sab clear</button>' +
    '<span id="ingCount" style="margin-left:auto;font-size:11px;color:var(--muted);font-weight:700"></span>';
  firstHead.parentNode.insertBefore(bar, firstHead);
}

window.quickPick = function (kind) {
  const sets = {
    basics:  ['Pyaz','Tamatar','Adrak','Lahsan','Aalu','Hari Mirch'],
    chicken: ['Chicken','Pyaz','Tamatar','Adrak','Lahsan','Dahi','Hari Mirch'],
    sweet:   ['Doodh','Cheeni','Ghee','Elaichi','Badam','Khoya'],
    clear:   []
  };
  const want = sets[kind] || [];
  document.querySelectorAll('input[name="ing"]').forEach(function (i) {
    i.checked = want.indexOf(i.value) > -1;
  });
  updateIngCount();
  if (kind !== 'clear') toast(want.length + ' ingredients select ho gaye');
};

function updateIngCount() {
  const n = document.querySelectorAll('input[name="ing"]:checked').length;
  const el = document.getElementById('ingCount');
  if (el) el.textContent = n ? n + ' selected' : '';
  const btn = document.getElementById('sugBtn');
  if (btn) btn.textContent = n
    ? 'Aaj Ka Khana Suggest Karo (' + n + ')'
    : 'Aaj Ka Khana Suggest Karo';
}

function wireCounter() {
  document.querySelectorAll('input[name="ing"]').forEach(function (i) {
    i.addEventListener('change', updateIngCount);
  });
  updateIngCount();
}

document.addEventListener('DOMContentLoaded', function () {
  expandIngredients();
  setTimeout(expandIngredients, 500);
});

/* ============================================================
   USABILITY PACK  (v7)
   1. Ingredient search — 70+ checkboxes need filtering
   2. "Khanay" browse tab — all 175 dishes, searchable/filterable
   3. Favourites (saved on the phone)
   4. Sticky suggest button
   5. Chef Chat chips that reflect the real dish range
   ============================================================ */

/* ---------------- FAVOURITES ---------------- */
function favs() {
  try { return JSON.parse(localStorage.getItem('dk_fav') || '[]'); } catch (e) { return []; }
}
function isFav(id) { return favs().indexOf(id) > -1; }
window.toggleFav = function (id, btn) {
  const f = favs();
  const i = f.indexOf(id);
  if (i > -1) { f.splice(i, 1); toast('Favourites se hata diya'); }
  else { f.push(id); toast('Favourites mein save ho gaya'); }
  try { localStorage.setItem('dk_fav', JSON.stringify(f)); } catch (e) {}
  if (btn) { btn.textContent = isFav(id) ? '♥' : '♡'; btn.style.color = isFav(id) ? 'var(--red)' : 'var(--muted)'; }
  const badge = document.getElementById('favCount');
  if (badge) badge.textContent = favs().length ? '(' + favs().length + ')' : '';
};

/* ---------------- 1. INGREDIENT SEARCH ---------------- */
function addIngredientSearch() {
  const tools = document.getElementById('ingTools');
  if (!tools || document.getElementById('ingSearch')) return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-bottom:10px';
  wrap.innerHTML =
    '<input class="fi" id="ingSearch" placeholder="Ingredient dhoondein — jaise dahi, gajar, elaichi..." ' +
    'oninput="filterIngredients(this.value)">';
  tools.parentNode.insertBefore(wrap, tools);
}

window.filterIngredients = function (q) {
  const term = norm(q);
  document.querySelectorAll('#pg-suggest .ig').forEach(function (grid) {
    let shown = 0;
    grid.querySelectorAll('label.cl').forEach(function (lab) {
      const input = document.getElementById(lab.getAttribute('for'));
      const txt = norm(lab.textContent + ' ' + (input ? input.value : ''));
      const hit = !term || txt.indexOf(term) > -1;
      lab.style.display = hit ? '' : 'none';
      if (hit) shown++;
    });
    /* hide the section heading too when nothing in it matches */
    let head = grid.previousElementSibling;
    while (head && !head.classList.contains('sh')) head = head.previousElementSibling;
    if (head) head.style.display = shown ? '' : 'none';
    grid.style.display = shown ? '' : 'none';
  });
};

/* ---------------- 2. BROWSE TAB ---------------- */
let BROWSE_FILTER = { q: '', cat: 'all', region: 'all', fav: false };

const CAT_LABEL = {
  all:'Sab', chicken:'Chicken', gosht:'Gosht', sabzi:'Sabzi', daal:'Daal',
  chawal:'Chawal', bbq:'BBQ', machli:'Machli', anday:'Anday', roti:'Roti',
  nashta:'Nashta', snacks:'Snacks', meetha:'Meetha', mashroob:'Mashroob'
};

function buildBrowseTab() {
  if (document.getElementById('pg-browse')) return;
  const nav = document.querySelector('.nav');
  const chefTab = document.getElementById('nt-chat');
  if (!nav || !chefTab) return;

  const btn = document.createElement('button');
  btn.className = 'ntab';
  btn.id = 'nt-browse';
  btn.innerHTML = 'Khanay <span id="favCount" style="font-size:10px;opacity:.7"></span>';
  btn.onclick = function () { goTab('browse', btn); setTimeout(renderBrowse, 30); };
  nav.insertBefore(btn, chefTab.nextSibling);

  const page = document.createElement('div');
  page.className = 'pg';
  page.id = 'pg-browse';
  page.innerHTML =
    '<div class="wrap">' +
      '<div class="pgh"><h2>Saray Khanay</h2><p>175 Pakistani dishes — dhoondein ya browse karein</p></div>' +
      '<div class="div"><div class="divl"></div><div class="divd">&#10022;</div><div class="divl"></div></div>' +
      '<input class="fi" id="browseSearch" placeholder="Dish ya ingredient dhoondein..." ' +
        'oninput="browseSet(\'q\', this.value)" style="margin-bottom:10px">' +
      '<div class="qcs" id="browseCats"></div>' +
      '<div class="qcs" id="browseRegions"></div>' +
      '<div id="browseCount" style="font-size:11px;color:var(--muted);font-weight:700;margin:4px 0 10px"></div>' +
      '<div id="browseList"></div>' +
    '</div>';
  document.body.appendChild(page);

  /* category chips */
  const cats = ['all'].concat(Object.keys(CAT_LABEL).filter(function (k) {
    return k !== 'all' && DISHES.some(function (d) { return d.category === k; });
  }));
  document.getElementById('browseCats').innerHTML =
    cats.map(function (c) {
      return '<button class="qc" data-cat="' + c + '" onclick="browseSet(\'cat\',\'' + c + '\')">' +
             (CAT_LABEL[c] || c) + '</button>';
    }).join('') +
    '<button class="qc" data-fav="1" onclick="browseSet(\'fav\')">&#9825; Favourites</button>';

  /* region chips */
  const regions = ['all'].concat(Object.keys(REGION_LABEL).filter(function (r) {
    return DISHES.some(function (d) { return d.region === r; });
  }));
  document.getElementById('browseRegions').innerHTML =
    regions.map(function (r) {
      return '<button class="qc" data-region="' + r + '" onclick="browseSet(\'region\',\'' + r + '\')">' +
             (r === 'all' ? 'Har ilaqa' : REGION_LABEL[r]) + '</button>';
    }).join('');

  const badge = document.getElementById('favCount');
  if (badge) badge.textContent = favs().length ? '(' + favs().length + ')' : '';
}

window.browseSet = function (key, val) {
  if (key === 'fav') BROWSE_FILTER.fav = !BROWSE_FILTER.fav;
  else BROWSE_FILTER[key] = val;
  renderBrowse();
};

function renderBrowse() {
  const list = document.getElementById('browseList');
  if (!list || !DISHES.length) return;

  const q = norm(BROWSE_FILTER.q);
  const favList = favs();

  let out = DISHES.filter(function (d) {
    if (BROWSE_FILTER.fav && favList.indexOf(d.id) === -1) return false;
    if (BROWSE_FILTER.cat !== 'all' && d.category !== BROWSE_FILTER.cat) return false;
    if (BROWSE_FILTER.region !== 'all' && d.region !== BROWSE_FILTER.region) return false;
    if (!q) return true;
    return norm(d.name + ' ' + d.roman_urdu + ' ' + d.ingredients.join(' ')).indexOf(q) > -1;
  });

  out.sort(function (a, b) { return a.name.localeCompare(b.name); });

  /* highlight active chips */
  document.querySelectorAll('#browseCats .qc, #browseRegions .qc').forEach(function (b) {
    const on = (b.dataset.cat === BROWSE_FILTER.cat) ||
               (b.dataset.region === BROWSE_FILTER.region) ||
               (b.dataset.fav && BROWSE_FILTER.fav);
    b.style.background = on ? 'var(--gold2)' : '';
    b.style.color = on ? '#0C0803' : '';
    b.style.fontWeight = on ? '800' : '600';
  });

  document.getElementById('browseCount').textContent =
    out.length + (out.length === 1 ? ' dish' : ' dishes');

  if (!out.length) {
    list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:30px;font-size:13px">' +
      'Koi dish nahi mili — filter badal kar dekhein</div>';
    return;
  }

  list.innerHTML = out.map(function (d) {
    const fav = isFav(d.id);
    const steps = recipeSteps(d).map(function (s) { return '<li style="margin-bottom:5px">' + s + '</li>'; }).join('');
    return '<div class="dcard" style="padding:15px">' +
      '<button onclick="toggleFav(' + d.id + ',this)" ' +
        'style="position:absolute;top:12px;right:14px;background:none;border:none;cursor:pointer;' +
        'font-size:20px;line-height:1;color:' + (fav ? 'var(--red)' : 'var(--muted)') + '">' +
        (fav ? '&#9829;' : '&#9825;') + '</button>' +
      '<div class="dname" style="font-size:21px;padding-right:30px">' + d.name + '</div>' +
      '<div class="dwhy" style="font-size:12px">' + d.roman_urdu.split('—').slice(1).join('—').trim() + '</div>' +
      '<div class="dtags">' + dishTags(d).map(function (t) {
        return '<span class="dtag">' + t + '</span>'; }).join('') + '</div>' +
      '<button class="btn btn-ghost" style="width:100%;margin-top:10px" ' +
        'onclick="toggleRec(\'br' + d.id + '\',this)">Recipe Dekhein</button>' +
      '<div id="br' + d.id + '" style="display:none;margin-top:12px;' +
        'border-top:1px solid rgba(200,140,8,0.13);padding-top:12px">' +
        '<div class="lbl">Ajza</div>' +
        '<div style="font-size:12.5px;color:var(--parch);line-height:1.9;margin-bottom:12px">' +
          d.ingredients.join(' &nbsp;&#8226;&nbsp; ') + '</div>' +
        '<div class="lbl">Tarika</div>' +
        '<ol style="font-size:12.5px;color:var(--cream);line-height:1.75;padding-left:18px;margin-top:6px">' +
          steps + '</ol>' +
      '</div></div>';
  }).join('');
}

/* ---------------- 3. STICKY SUGGEST BUTTON ---------------- */
function stickySuggest() {
  const btn = document.getElementById('sugBtn');
  if (!btn || btn.dataset.sticky) return;
  btn.dataset.sticky = '1';
  btn.style.position = 'sticky';
  btn.style.bottom = '14px';
  btn.style.zIndex = '150';
  btn.style.boxShadow = '0 6px 26px rgba(0,0,0,0.55), 0 5px 22px rgba(200,140,8,0.32)';
}

/* ---------------- 4. BETTER CHEF CHIPS ---------------- */
function refreshChefChips() {
  const box = document.querySelector('#pg-chat .qcs');
  if (!box || box.dataset.done) return;
  box.dataset.done = '1';
  const picks = ['Chicken Karahi','Chicken Biryani','Nihari','Chapli Kebab','Balochi Sajji',
                 'Halwa Puri','Sarson Ka Saag','Haleem','Kheer','Gulab Jamun','Chapshoro','Sohbat'];
  box.innerHTML = picks.map(function (p) {
    return '<button class="qc" onclick="qAsk(\'' + p + '\')">' + p + '</button>';
  }).join('') +
  '<button class="qc" onclick="qAsk(\'aaj kya banao\')">Aaj kya banao?</button>' +
  '<button class="qc" onclick="qAsk(\'nashte mein kya banao\')">Nashta</button>' +
  '<button class="qc" onclick="qAsk(\'iftar mein kya banao\')">Iftar</button>';
}

/* ---------------- BOOT ---------------- */
function usabilityPack() {
  if (!DISHES.length) { setTimeout(usabilityPack, 300); return; }
  addIngredientSearch();
  buildBrowseTab();
  stickySuggest();
  refreshChefChips();
}
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(usabilityPack, 600);
});
