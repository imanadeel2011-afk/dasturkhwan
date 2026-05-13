from flask import Flask, request, jsonify, send_file
import json
import os
import requests
import schedule
import time
import threading
from datetime import datetime

app = Flask(__name__)

GROQ_KEY = "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"
ID_INSTANCE = "7107616198"
API_TOKEN = "a8bd23b1c1c645ad8a565f055c341b31bdc535f268904fc095"

def load_settings():
    try:
        with open('settings.json', 'r') as f:
            return json.load(f)
    except:
        return {"phone": "923001234567", "time": "08:00"}

def get_suggestion():
    try:
        r = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {GROQ_KEY}'},
            json={
                'model': 'llama-3.3-70b-versatile',
                'max_tokens': 200,
                'messages': [{'role': 'user', 'content': 'Pakistani ghar ke liye aaj 2 dishes suggest karo. Sirf naam aur 1 line kyun. Roman Urdu mein.'}]
            },
            timeout=30
        )
        return r.json()['choices'][0]['message']['content']
    except:
        return "Aaj: Chicken Karahi aur Daal Chawal"

def send_whatsapp():
    s = load_settings()
    num = s['phone'].replace(' ', '')
    if num.startswith('0'):
        num = '92' + num[1:]

    suggestion = get_suggestion()
    msg = f"Dasturkhwan — Aaj Ka Khana\n\n{suggestion}\n\nAapka Pakistani Food AI"

    url = f"https://api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    requests.post(url, json={"chatId": f"{num}@c.us", "message": msg})
    print(f"Message bheja: {num}")

def run_schedule():
    while True:
        s = load_settings()
        schedule.clear()
        schedule.every().day.at(s['time']).do(send_whatsapp)
        schedule.run_pending()
        time.sleep(30)

@app.route('/')return jsonify({'status': 'sent'})

@app.route('/check', methods=['GET'])
def check_and_send():
    send_whatsapp()
    return jsonify({'status': 'sent'})
def home():
    return send_file('index.html')

@app.route('/save', methods=['POST'])
def save():
    data = request.json
    with open('settings.json', 'w') as f:
        json.dump(data, f)
    return jsonify({'status': 'saved'})


    current_time = f"{now.hour:02d}:{now.minute:02d}"
    if current_time == s.get('time', '08:00'):
        send_whatsapp()
        return jsonify({'status': 'sent', 'time': current_time})
    return jsonify({'status': 'skipped', 'time': current_time})

if __name__ == '__main__':
    t = threading.Thread(target=run_schedule)
    t.daemon = True
    t.start()
    app.run(host='0.0.0.0', port=5000)