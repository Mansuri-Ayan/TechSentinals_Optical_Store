import urllib.request
import urllib.error

url = 'http://127.0.0.1:8000/sales/?page=1&limit=6&paginate=true&is_lab_order=true&tab=queue'
headers = {
    'Accept': 'application/json',
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.status}")
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} {e.reason}")
    try:
        print(e.read().decode('utf-8'))
    except Exception:
        pass
except urllib.error.URLError as e:
    print(f"URLError: {e.reason}")
