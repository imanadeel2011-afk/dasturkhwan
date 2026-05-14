from flask import Flask, request, jsonify, send_file
import requests, threading, time
from datetime import datetime

app = Flask(__name__)

GROQ_KEY = "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"
ID_INSTANCE = "a7107616198"
API_TOKEN = "a8bd23b1c1c645ad8a565f055c341b31bdc535f268904fc095"
SUPABASE_URL = "https://mpoxvwvbpjoenidfjdee.supabase.co"
SUPABASE_KEY = "sb_publishable_gdyh83prdKxwsi3UGtreFA_RgDnn-tl

"

def get_setting(key):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/settings?key=eq.{key}&select=value",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    )
    data = r.json()
    return data[0]['value'] if data else None

def save_setting(key, value):
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/settings?key=eq.{key}",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"},
        json={"value": value}
    )

def get_suggestion():
    try:
        r = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {GROQ_KEY}'},
            json={'model': 'llama-3.3-70b-versatile', 'max_tokens': 200,
                  'messages': [{'role': 'user', 'content': 'Pakistani ghar ke liye aaj 2 dishes suggest karo. Sirf naam aur 1 line kyun. Roman Urdu mein.'}]},
            timeout=30
        )
        return r.json()['choices'][0]['message']['content']
    except:
        return "Aaj: Chicken Karahi aur Daal Chawal"

def send_whatsapp():
    phone = get_setting('phone')
    suggestion = get_suggestion()
    msg = f"Dasturkhwan — Aaj Ka Khana\n\n{suggestion}\n\nAapka Pakistani Food AI"
    url = f"https://api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    requests.post(url, json={"chatId": f"{phone}@c.us", "message": msg})
    print(f"Message bheja: {phone}")

@app.route('/')
def home():
    return send_file('index.html')

@app.route('/save', methods=['POST'])
def save():
    data = request.json
    if 'phone' in data:
        save_setting('phone', data['phone'])
    if 'time' in data:
        save_setting('time', data['time'])
    return jsonify({'status': 'saved'})

@app.route('/test', methods=['GET'])
def test():
    send_whatsapp()
    return jsonify({'status': 'sent'})

@app.route('/check', methods=['GET'])
def check():
    send_whatsapp()
    return jsonify({'status': 'sent'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)