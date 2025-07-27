# Barbara Tracker API

Backend Express.js do wyszukiwania Barbary Zawadzkiej z wykorzystaniem API centrali.

## Uruchomienie

```bash
# Z poziomu root projektu
npm run task3_4

# Lub bezpośrednio
bun run "course_tasks/Module 3/4/app.ts"
```

Serwer uruchomi się na porcie `3000`.

## API Endpoints

### 1. Sprawdzenie statusu API
```http
GET /api/health
```

**Odpowiedź:**
```json
{
  "success": true,
  "message": "Barbara Tracker API działa",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### 2. Rozpoczęcie wyszukiwania
```http
POST /api/search/start
```

**Odpowiedź:**
```json
{
  "success": true,
  "searchId": "search_1705315845123",
  "message": "Wyszukiwanie rozpoczęte"
}
```

### 3. Sprawdzenie statusu wyszukiwania
```http
GET /api/search/:searchId/status
```

**Odpowiedź:**
```json
{
  "success": true,
  "data": {
    "id": "search_1705315845123",
    "status": "running|completed|error",
    "progress": {
      "currentIteration": 5,
      "peopleChecked": 12,
      "placesChecked": 8,
      "barbaraLocationsFound": 2
    },
    "results": {
      "barbaraLocations": ["WARSZAWA", "KRAKOW"],
      "foundConnections": [...],
      "foundPlaceConnections": [...],
      "initialPlaces": ["WARSZAWA"],
      "finalAnswer": "KRAKOW",
      "submitted": false,
      "submissionResult": null
    },
    "logs": ["2024-01-15T10:30:45.123Z: 🔍 Rozpoczynam poszukiwania..."],
    "error": null
  }
}
```

### 4. Wysłanie odpowiedzi do centrali
```http
POST /api/search/submit
Content-Type: application/json

{
  "city": "KRAKOW"
}
```

**Odpowiedź:**
```json
{
  "success": true,
  "message": "Odpowiedź zaakceptowana"
}
```

## Jak używać

1. **Uruchom serwer:** `npm run task3_4`
2. **Rozpocznij wyszukiwanie:** `POST /api/search/start`
3. **Monitoruj postęp:** `GET /api/search/{searchId}/status`
4. **Wyślij odpowiedź:** `POST /api/search/submit` z nazwą miasta

## Przykład użycia z curl

```bash
# 1. Sprawdź czy API działa
curl http://localhost:3000/api/health

# 2. Rozpocznij wyszukiwanie
curl -X POST http://localhost:3000/api/search/start

# 3. Sprawdź status (zastąp SEARCH_ID prawdziwym ID)
curl http://localhost:3000/api/search/SEARCH_ID/status

# 4. Wyślij odpowiedź
curl -X POST http://localhost:3000/api/search/submit \
  -H "Content-Type: application/json" \
  -d '{"city": "NAZWA_MIASTA"}'
```

## Statusy wyszukiwania

- **`idle`** - wyszukiwanie nie zostało rozpoczęte
- **`running`** - wyszukiwanie w toku
- **`completed`** - wyszukiwanie zakończone
- **`error`** - wystąpił błąd

## Funkcjonalność

API automatycznie:
1. Pobiera notatkę o Barbarze z centrali
2. Analizuje ją za pomocą LLM (wyodrębnia imiona i miasta)
3. Iteracyjnie odpytuje API `/people` i `/places`
4. Śledzi powiązania między osobami a miejscami
5. Identyfikuje miejsca gdzie widziano Barbarę
6. Znajduje nowe miejsca (nie z pierwotnej notatki)

## Technologia

- **Express.js** - serwer HTTP
- **TypeScript** - typowanie
- **OpenAI API** - analiza tekstu
- **Fetch API** - komunikacja z centralą
- **CORS** - obsługa cross-origin requests

## Struktura odpowiedzi

Wszystkie endpointy zwracają JSON z polem `success` i odpowiednimi danymi lub błędami.

```json
{
  "success": true,
  "data": {...}
}
```

lub

```json
{
  "success": false,
  "error": "Opis błędu"
}
``` 