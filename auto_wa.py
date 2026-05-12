import pywhatkit
import schedule
import time
import json
import os
from datetime import datetime
import requests

GROQ_KEY = "gsk_7DprAgi8sY4YAohI37OPWGdyb3FY5Da7RG0lvzi"

def load_settings():
    if os.path.exists('settings.json'):
        with open('settings.json', 'r') as f:
            return json.load(f)
    return {"phone": "+923000000000", "time": "08:00"}

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

def send_message():
    s = load_settings()
    msg = f"*Dasturkhwan — Aaj Ka Khana*\n\n{get_suggestion()}\n\n_Aapka Pakistani Food AI_"
    num = s['phone'].replace(' ', '')
    if num.startswith('0'):
        num = '+92' + num[1:]
    now = datetime.now()
    sm = (now.minute + 2) % 60
    sh = now.hour + (1 if now.minute + 2 >= 60 else 0)
    print(f"Sending to {num}...")
    pywhatkit.sendwhatmsg(num, msg, sh % 24, sm, wait_time=20)
    print("Sent!")

def main():
    print("Dasturkhwan Auto WhatsApp Shuru!")
    print("Website se time/number change karo")
    print("Ctrl+C se band karo")
    print("-" * 40)
    while True:
        s = load_settings()
        schedule.clear()
        schedule.every().day.at(s['time']).do(send_message)
        schedule.run_pending()
        time.sleep(30)

if __name__ == '__main__':
    main()