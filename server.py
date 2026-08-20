"""
Dasturkhwan — server
Serves the app. That's all it does.

No API keys. No database. No external services.
Nothing here can expire, hit a cap, or start charging.
Unlimited users, free forever.
"""

import os
import json
from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

HERE = os.path.dirname(os.path.abspath(__file__))


@app.route('/')
def home():
    return send_file('index.html')


@app.route('/health')
def health():
    """Quick check that everything deployed correctly."""
    try:
        with open(os.path.join(HERE, 'dishes.json'), encoding='utf-8') as f:
            n = len(json.load(f))
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

    files = ['index.html', 'engine.js', 'dishes.json', 'manifest.json', 'sw.js',
             'icon-192.png', 'icon-512.png', 'icon-512-maskable.png']
    return jsonify({
        'ok': True,
        'dishes_loaded': n,
        'files': {f: os.path.exists(os.path.join(HERE, f)) for f in files}
    })


# Serves engine.js, dishes.json, manifest.json, sw.js and the icons.
# Must stay LAST — it catches every path not matched above.
@app.route('/<path:filename>')
def serve_any_file(filename):
    return send_from_directory(HERE, filename)


@app.after_request
def no_cache(resp):
    """Browsers were serving a stale copy of the app. Tell them not to
    cache the HTML/JS/JSON so an update always lands immediately."""
    p = (request.path or '')
    if p == '/' or p.endswith(('.html', '.js', '.json')):
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
    return resp


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
