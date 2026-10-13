import urllib.request
import json

query = """[out:json][timeout:35];
(
  relation["waterway"="river"]["name:en"="Padma"](20.5,88.0,26.7,92.8);
  relation["waterway"="river"]["name:en"="Jamuna"](20.5,88.0,26.7,92.8);
  relation["waterway"="river"]["name:en"="Meghna"](20.5,88.0,26.7,92.8);
);
out geom 100;
"""

try:
    req = urllib.request.Request(
        'https://overpass-api.de/api/interpreter',
        data=query.encode('utf-8'),
        headers={'User-Agent': 'BDMapsApp/1.0'}
    )
    res = urllib.request.urlopen(req, timeout=30)
    data = json.loads(res.read())
    print("Elements count:", len(data.get('elements', [])))
    if data.get('elements'):
        print("First element tags:", data['elements'][0].get('tags'))
except Exception as e:
    print("Error:", e)
