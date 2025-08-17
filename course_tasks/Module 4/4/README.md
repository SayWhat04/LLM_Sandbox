# Drone Navigation API - Zadanie 4.4

API do obsługi instrukcji lotu drona na mapie 4x4.

## Opis zadania

Dron porusza się po mapie 4x4 i zawsze zaczyna w lewym górnym rogu (pozycja 1,1 - pin startowy). 
API przyjmuje instrukcje w języku naturalnym i odpowiada opisem miejsca, gdzie dron wylądował.

## Mapa

```
RZĄD 1: [pin startowy] [łąka] [drzewo] [dom]
RZĄD 2: [łąka] [wiatrak] [łąka] [łąka]  
RZĄD 3: [łąka] [łąka] [skały] [drzewa]
RZĄD 4: [góry] [góry] [samochód] [jaskinia]
```

## Uruchomienie

```bash
# Uruchomienie serwera
npm run task4_4
# lub
bun run task4_4
```

Serwer uruchomi się na porcie 3000 (lub PORT z .env).

## API Endpoints

### POST /api/drone

Główny endpoint do analizy instrukcji drona.

**Request:**
```json
{
  "instruction": "poleciałem jedno pole w prawo, a później na sam dół"
}
```

**Response:**
```json
{
  "description": "góry",
  "debug": {
    "finalPosition": { "row": 4, "col": 2 },
    "reasoning": "Start (1,1) -> prawo (1,2) -> dół x3 (4,2)",
    "instruction": "poleciałem jedno pole w prawo, a później na sam dół",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Inne endpointy

- `GET /api/status` - Status serwisu
- `GET /api/test` - Test endpoint
- `GET /health` - Health check
- `GET /` - Dokumentacja API

## Przykłady testowania

### Test 1: Ruch w prawo
```bash
curl -X POST http://localhost:3000/api/drone \
  -H "Content-Type: application/json" \
  -d '{"instruction": "poleciałem jedno pole w prawo"}'
```
Oczekiwana odpowiedź: `{"description": "łąka"}`

### Test 2: Ruch w dół
```bash
curl -X POST http://localhost:3000/api/drone \
  -H "Content-Type: application/json" \
  -d '{"instruction": "poleciałem w dół"}'
```
Oczekiwana odpowiedź: `{"description": "łąka"}`

### Test 3: Złożony ruch
```bash
curl -X POST http://localhost:3000/api/drone \
  -H "Content-Type: application/json" \
  -d '{"instruction": "poleciałem dwa pola w prawo, potem jedno w dół"}'
```
Oczekiwana odpowiedź: `{"description": "łąka"}`

### Test 4: Ruch do rogu
```bash
curl -X POST http://localhost:3000/api/drone \
  -H "Content-Type: application/json" \
  -d '{"instruction": "poleciałem na sam dół i na sam prawo"}'
```
Oczekiwana odpowiedź: `{"description": "jaskinia"}`

## Wystawienie na HTTPS

Aby wystawić API na HTTPS (wymagane przez zadanie), możesz użyć:

### 1. ngrok (najszybsze)
```bash
# Zainstaluj ngrok
npm install -g ngrok

# Uruchom API lokalnie
npm run task4_4

# W drugim terminalu
ngrok http 3000
```

### 2. Cloudflare Tunnel
```bash
npm install -g cloudflared
cloudflared tunnel --url http://localhost:3000
```

### 3. Deploy na platformę chmurową
- Vercel: `vercel --prod`
- Railway: `railway deploy`
- Render: Deploy przez GitHub

## Struktura odpowiedzi

API zawsze zwraca obiekt JSON z kluczem `description` (wymagany) oraz opcjonalnym `debug`:

```json
{
  "description": "maksymalnie dwa słowa opisujące miejsce",
  "debug": {
    "finalPosition": { "row": X, "col": Y },
    "reasoning": "analiza krok po kroku",
    "instruction": "oryginalna instrukcja",
    "timestamp": "czas przetworzenia"
  }
}
```

## Obsługa błędów

W przypadku błędu API zwraca:
```json
{
  "description": "błąd",
  "error": "opis błędu",
  "debug": {
    "instruction": "problematyczna instrukcja",
    "timestamp": "czas błędu"
  }
}
```

## Bezstanowość

API jest bezstanowe - każde zapytanie traktowane jest jako nowy lot zaczynający się od pozycji (1,1).

## Technologie

- **Backend**: Express.js + TypeScript
- **AI**: OpenAI GPT-4o
- **Fallback**: Regex parsing (backup dla OpenAI)
- **Runtime**: Bun 