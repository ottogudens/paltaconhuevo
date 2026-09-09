import requests

url = "https://image.pollinations.ai/prompt/delicious%20avocado%20toast%20with%20poached%20egg,%20food%20photography,%20realistic?width=800&height=600&nologo=true"
res = requests.get(url)
print('Status:', res.status_code)
print('Content-Type:', res.headers.get('content-type'))
print('Size:', len(res.content))
