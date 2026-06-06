import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)

GROQ_KEY = os.getenv("GROQ_API_KEY", "")
ID_INSTANCE = "7107616198"
API_TOKEN = "a8bd23b1c1c645ad8a565f055c341b31bdc535f268904fc095"
SUPABASE_URL = "https://mpoxvwvbpjoenidfjdee.supabase.co"
SUPABASE_KEY = "sb_publishable_gdyh83prdKxwsi3UGtreFA_RgDnn-tl"

def get_suggestion():
    try:
        r = requests.post('https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {GROQ_KEY}', 'Content-Type': 'application/json'},
            json={'model': 'llama-3.3-70b-versatile', 'max_tokens': 200, 'temperature': 0.9,
                  'messages': [{'role': 'user', 'content': f'Pakistani ghar ke liye aaj {datetime.now().strftime("%A %d %B")} ko 2 dishes suggest karo. Sirf naam aur 1 line kyun. Roman Urdu mein.'}]},
            timeout=30)
        return r.json()['choices'][0]['message']['content']
    except:
        return "Chicken Karahi aur Daal Chawal"

def send_whatsapp(phone, msg):
    url = f"https://api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    requests.post(url, json={"chatId": f"{phone}@c.us", "message": msg})

def get_all_users():
    r = requests.get(f"{SUPABASE_URL}/rest/v1/users?active=eq.true&select=*",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    return r.json()

def add_user(name, phone, time):
    # Check if phone already exists
    r = requests.get(f"{SUPABASE_URL}/rest/v1/users?phone=eq.{phone}&select=id",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    existing = r.json()
    if existing:
        # Update existing
        requests.patch(f"{SUPABASE_URL}/rest/v1/users?phone=eq.{phone}",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"},
            json={"name": name, "time": time, "active": True})
    else:
        # Insert new
        requests.post(f"{SUPABASE_URL}/rest/v1/users",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"},
            json={"name": name, "phone": phone, "time": time, "active": True})

@app.route('/')
def home():
    return send_file('index.html')

@app.route('/manifest.json')
def manifest():
    return send_file('manifest.json', mimetype='application/manifest+json')

@app.route('/sw.js')
def sw():
    return send_file('sw.js', mimetype='application/javascript')

@app.route('/ai', methods=['POST'])
def ai():
    data = request.json
    messages = data.get('messages', [])
    max_tokens = data.get('max_tokens', 700)
    temperature = data.get('temperature', 0.8)
    try:
        r = requests.post('https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {GROQ_KEY}', 'Content-Type': 'application/json'},
            json={'model': 'llama-3.3-70b-versatile', 'max_tokens': max_tokens,
                  'temperature': temperature, 'messages': messages},
            timeout=30)
        return jsonify(r.json())
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    time = data.get('time', '08:00').strip()
    if not phone:
        return jsonify({'status': 'error', 'message': 'Phone required'}), 400
    num = phone.replace(' ', '').replace('+', '').replace('-', '')
    if num.startswith('0'):
        num = '92' + num[1:]
    add_user(name, num, time)
    return jsonify({'status': 'registered', 'phone': num, 'time': time})

@app.route('/users', methods=['GET'])
def users():
    return jsonify(get_all_users())

@app.route('/check', methods=['GET'])
def check():
    now = datetime.now()
    current_time = now.strftime('%H:%M')
    all_users = get_all_users()
    sent = []
    suggestion = get_suggestion()
    for user in all_users:
        user_time = user.get('time', '08:00')
        if user_time == current_time:
            phone = user.get('phone', '')
            name = user.get('name', 'User')
            msg = f"*Dasturkhwan — Aaj Ka Khana*\nAssalam o Alaikum {name}!\n\n{suggestion}\n\n_Aapka Pakistani Food AI_"
            send_whatsapp(phone, msg)
            sent.append(phone)
    return jsonify({'status': 'checked', 'time': current_time, 'sent_to': sent, 'total_users': len(all_users)})

@app.route('/test', methods=['GET'])
def test():
    suggestion = get_suggestion()
    all_users = get_all_users()
    if all_users:
        user = all_users[0]
        phone = user.get('phone', '')
        name = user.get('name', 'User')
        msg = f"*Dasturkhwan — Test Message*\nAssalam o Alaikum {name}!\n\n{suggestion}\n\n_Aapka Pakistani Food AI_"
        send_whatsapp(phone, msg)
        return jsonify({'status': 'sent', 'to': phone, 'suggestion': suggestion})
    return jsonify({'status': 'no users'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
