import requests
import os
import sys

BASE = os.getenv('ML_BASE_URL', 'http://localhost:8000')
SERVICE_KEY = os.getenv('ML_INTERNAL_API_KEY', 'test-key')
HEADERS = {
    'Content-Type': 'application/json',
    'X-Modliq-Service-Key': SERVICE_KEY,
}

def check(name, method, path, expected_status=200, json=None):
    try:
        if method == 'GET':
            r = requests.get(f'{BASE}{path}', headers=HEADERS, timeout=10)
        else:
            r = requests.post(f'{BASE}{path}', headers=HEADERS, json=json or {}, timeout=10)
        ok = r.status_code == expected_status
        print(f'{name}: {r.status_code} {"OK" if ok else "FAIL"}')
        return ok
    except Exception as e:
        print(f'{name}: ERROR {e}')
        return False

results = []

# Public endpoints
results.append(check('health', 'GET', '/health'))
results.append(check('warmup', 'GET', '/warmup'))

# Protected endpoints with service key
results.append(check('dataset-health', 'POST', '/dataset-health', 422, {
    'rows': [{'temperature': 80, 'pressure': 450, 'yield': 95}],
    'mode': 'generic'
}))
results.append(check('parse-goal', 'POST', '/parse-goal', 422, {
    'goal_text': 'maximize yield',
    'columns': ['yield', 'temperature']
}))

# Protected endpoint without service key should fail
try:
    r = requests.post(f'{BASE}/parse-goal', json={'goal_text': 'maximize yield', 'columns': ['yield']}, timeout=10)
    no_auth_ok = r.status_code == 401
    print(f'parse-goal-no-auth: {r.status_code} {"OK" if no_auth_ok else "FAIL"}')
    results.append(no_auth_ok)
except Exception as e:
    print(f'parse-goal-no-auth: ERROR {e}')
    results.append(False)

if all(results):
    print('ALL SMOKE TESTS PASSED')
    sys.exit(0)
else:
    print('SOME SMOKE TESTS FAILED')
    sys.exit(1)
