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

function ingMatch(userIng, dishIng) {
  const u = norm(userIng), di = norm(dishIng);
  if (!u || !di) return false;
  if (di.includes(u) || u.includes(di)) return true;
  const alts = ING_ALIAS[u] || [];
  for (const a of alts) if (di.includes(a) || a.includes(di)) return true;
  const ut = u.split(' '), dt = di.split(' ');
  for (const x of ut) for (const y of dt)
    if (x.length >= 4 && y.length >= 4 && lev(x, y) <= 1) return true;
  return false;
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

  const scored = DISHES
    .filter(function (d) { return d.category !== 'meetha' && d.category !== 'mashroob'; })
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
