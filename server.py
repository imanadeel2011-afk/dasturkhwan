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

def get_setting(key):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/settings?key=eq.{key}&select=value",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    data = r.json()
    return data[0]['value'] if data else None

def save_setting(key, value):
    requests.patch(f"{SUPABASE_URL}/rest/v1/settings?key=eq.{key}",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"},
        json={"value": value})

@app.route('/')
def home():
    return send_file('index.html')

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

@app.route('/save', methods=['POST'])
def save():
    data = request.json
    if 'phone' in data: save_setting('phone', data['phone'])
    if 'time' in data: save_setting('time', data['time'])
    return jsonify({'status': 'saved'})

@app.route('/test', methods=['GET'])
def test():
    phone = get_setting('phone') or "923054387261"
    try:
        r = requests.post('https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {GROQ_KEY}', 'Content-Type': 'application/json'},
            json={'model': 'llama-3.3-70b-versatile', 'max_tokens': 200, 'temperature': 0.9,
                  'messages': [{'role': 'user', 'content': f'Pakistani ghar ke liye aaj {datetime.now().strftime("%A %d %B")} ko 2 dishes suggest karo. Roman Urdu mein.'}]},
            timeout=30)
        suggestion = r.json()['choices'][0]['message']['content']
    except:
        suggestion = "Chicken Karahi aur Daal Chawal"
    msg = f"Dasturkhwan — Aaj Ka Khana\n\n{suggestion}\n\nAapka Pakistani Food AI"
    url = f"https://api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    requests.post(url, json={"chatId": f"{phone}@c.us", "message": msg})
    return jsonify({'status': 'sent', 'suggestion': suggestion})

@app.route('/check', methods=['GET'])
def check():
    return test()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
