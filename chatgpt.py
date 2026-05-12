<script>
// ⚠️ # TEST ONLY - DO NOT SHARE PUBLICLY
const API_KEY = "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";

// ================= PAGE NAV =================
function showPage(pageId, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));

  document.getElementById(pageId).classList.add('active');

  if (btn) btn.classList.add('active');
  else {
    const t = document.getElementById('tab-' + pageId);
    if (t) t.classList.add('active');
  }
}

// ================= GET SUGGESTION =================
async function getSuggestion() {
  const family = document.querySelector('input[name="family"]:checked')?.value || '3-4 log';
  const occasion = document.querySelector('input[name="occasion"]:checked')?.value || 'ghar';
  const dishes = document.querySelector('input[name="dishes"]:checked')?.value || '2 dishes';
  const time = document.querySelector('input[name="time"]:checked')?.value || '30-45 minute';
  const desert = document.querySelector('input[name="desert"]:checked')?.value || 'nahi';
  const lastMeal = document.getElementById('lastMeal').value.trim() || 'kuch nahi';

  const selected = [...document.querySelectorAll('input[name="ingredients"]:checked')].map(i => i.value);

  if (!selected.length) {
    alert('⚠️ Ingredients select karo!');
    return;
  }

  const prompt = `Tu Pakistani food expert hai.

Log: ${family}
Occasion: ${occasion}
Kal kya khaya: ${lastMeal} (repeat nahi)
Dishes: ${dishes}
Time: ${time}
Ingredients: ${selected.join(', ')}
Desert: ${desert}

Roman Urdu mein proper recipe do.`;

  const btn = document.getElementById('mainSubmitBtn');
  btn.disabled = true;

  document.getElementById('loading').style.display = 'block';
  document.getElementById('result').style.display = 'none';

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 1200,
        messages: [
          { role: "system", content: "Sirf Roman Urdu mein jawab do." },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    const text = data.choices?.[0]?.message?.content || "Koi response nahi mila";

    document.getElementById('resultText').innerText = text;
    document.getElementById('result').style.display = 'block';

    // Save history
    const history = JSON.parse(localStorage.getItem('dkh_history') || '[]');
    history.unshift({
      date: new Date().toLocaleString(),
      suggestion: text
    });
    localStorage.setItem('dkh_history', JSON.stringify(history.slice(0, 20)));

  } catch (err) {
    alert("❌ Error: " + err.message);
  } finally {
    btn.disabled = false;
    document.getElementById('loading').style.display = 'none';
  }
}

// ================= CHAT =================
async function sendChat() {
  const input = document.getElementById('chatInput').value.trim();
  if (!input) return;

  const box = document.getElementById('chatHistory');

  const userDiv = document.createElement('div');
  userDiv.className = 'chat-message chat-user';
  userDiv.textContent = input;
  box.appendChild(userDiv);

  document.getElementById('chatInput').value = '';

  const botDiv = document.createElement('div');
  botDiv.className = 'chat-message chat-agent';
  botDiv.textContent = '⏳ Soch raha hoon...';
  box.appendChild(botDiv);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        messages: [
          { role: "system", content: "Tu Pakistani chef hai. Roman Urdu mein jawab de." },
          { role: "user", content: input }
        ]
      })
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    botDiv.innerHTML = "<strong>🤖 Chef:</strong><br>" + data.choices[0].message.content;

  } catch (err) {
    botDiv.textContent = "❌ Error: " + err.message;
  }

  box.scrollTop = box.scrollHeight;
}

// ================= HISTORY =================
function renderHistory() {
  const history = JSON.parse(localStorage.getItem('dkh_history') || '[]');
  const el = document.getElementById('historyList');

  if (!history.length) {
    el.innerHTML = '<p style="color:#94a3b8;text-align:center">Koi history nahi</p>';
    return;
  }

  el.innerHTML = history.map(item => `
    <div style="padding:10px;border:1px solid rgba(255,255,255,0.1);margin-bottom:10px;border-radius:10px">
      <strong>${item.date}</strong><br>
      ${item.suggestion.substring(0,200)}...
    </div>
  `).join('');
}

// ================= INIT =================
window.onload = function () {
  renderHistory();
};
</script>