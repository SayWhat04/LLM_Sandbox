# MediaAnalysisService - Modular Architecture

Serwis do automatycznej analizy i opisu plików multimedialnych (audio i obrazów) przy użyciu modeli LLM. Składa się z dedykowanych serwisów dla każdego typu mediów.

## Funkcjonalności

### 🎵 Analiza Audio
- **Pobieranie**: Automatyczne pobieranie plików audio z URL
- **Transkrypcja**: Konwersja mowy na tekst używając OpenAI Whisper
- **Analiza**: Szczegółowy opis zawartości audio przy użyciu GPT-4
- **Formaty**: MP3, WAV, OGG, WebM, M4A, AAC, FLAC

### 🖼️ Analiza Obrazów
- **Pobieranie**: Automatyczne pobieranie obrazów z URL
- **Optymalizacja**: Automatyczne skalowanie i kompresja dla Vision API
- **Analiza**: Szczegółowy opis obrazu przy użyciu GPT-4 Vision
- **Formaty**: JPEG, PNG, GIF, WebP, BMP, TIFF

## Instalacja

```bash
npm install axios sharp uuid openai
```

## Użycie

### Podstawowe użycie

```typescript
import { MediaAnalysisService } from './MediaAnalysisService';

const mediaService = new MediaAnalysisService();

// Analiza obrazu
const imageResult = await mediaService.analyze('https://example.com/image.jpg');
console.log(imageResult.description);

// Analiza audio
const audioResult = await mediaService.analyze('https://example.com/audio.mp3');
console.log(audioResult.description);
```

### Przykład wyniku

```typescript
{
  type: 'image',
  url: 'https://example.com/image.jpg',
  description: 'Na obrazie widać...',
  metadata: {
    width: 1920,
    height: 1080,
    format: 'jpeg',
    size: 245760,
    optimized: true
  },
  processingTime: 3500
}
```

### Sprawdzenie obsługiwanych formatów

```typescript
const supportedTypes = mediaService.getSupportedTypes();
console.log('Audio:', supportedTypes.audio);
console.log('Obrazy:', supportedTypes.image);
```

## API Reference

### `MediaAnalysisService`

#### `analyze(url: string): Promise<MediaAnalysisResult>`

Główna metoda do analizy plików multimedialnych.

**Parametry:**
- `url` - Link do pliku audio lub obrazu

**Zwraca:**
- `MediaAnalysisResult` - Obiekt z wynikami analizy

#### `getSupportedTypes(): { audio: string[], image: string[] }`

Zwraca listę obsługiwanych formatów plików.

### Typy

#### `MediaAnalysisResult`

```typescript
interface MediaAnalysisResult {
  type: 'audio' | 'image';
  url: string;
  description: string;
  metadata: AudioMetadata | ImageMetadata;
  processingTime: number;
}
```

#### `AudioMetadata`

```typescript
interface AudioMetadata {
  transcription: string;
  language: string;
  fileSize: number;
}
```

#### `ImageMetadata`

```typescript
interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  optimized: boolean;
}
```

## Demo

Uruchom plik demonstracyjny:

```bash
npx ts-node demo.ts
```

Lub przetestuj własny URL:

```typescript
import { analyzeCustomUrl } from './demo';

await analyzeCustomUrl('https://twoj-url.com/plik.mp3');
```

## Konfiguracja

### Wymagane zmienne środowiskowe

```bash
OPENAI_API_KEY=your_openai_api_key
```

### Limity

- **Audio**: Maksymalny rozmiar pliku 25MB (limit OpenAI Whisper)
- **Obrazy**: Automatyczne skalowanie do 2048x2048px
- **Timeout**: 30 sekund na pobieranie pliku

## Obsługa błędów

Serwis rzuca wyjątki z opisowymi komunikatami:

```typescript
try {
  const result = await mediaService.analyze(url);
} catch (error) {
  if (error.message.includes('Unsupported media type')) {
    console.log('Nieobsługiwany format pliku');
  } else if (error.message.includes('Failed to download')) {
    console.log('Błąd pobierania pliku');
  }
}
```

## Architektura

```
MediaAnalysisService (Orchestrator)
├── downloadFile()     → Pobieranie z URL
├── detectMediaType()  → Rozpoznawanie typu
├── AudioAnalysisService
│   ├── transcribeAudio()     → Whisper API
│   ├── generateDescription() → GPT-4
│   └── isAudioFile()         → Walidacja
└── ImageAnalysisService
    ├── optimizeImage()       → Sharp
    ├── generateDescription() → GPT-4 Vision
    └── isImageFile()         → Walidacja
```

### Dedykowane serwisy

#### AudioAnalysisService
- **Transkrypcja**: OpenAI Whisper API
- **Analiza**: GPT-4 dla opisu zawartości
- **Walidacja**: MIME types + file signatures
- **Obsługa**: MP3, WAV, OGG, WebM, M4A, AAC, FLAC

#### ImageAnalysisService  
- **Optymalizacja**: Sharp (resize, compression)
- **Analiza**: GPT-4 Vision API
- **Walidacja**: MIME types + file signatures
- **Obsługa**: JPEG, PNG, GIF, WebP, BMP, TIFF

## Zależności

- **axios**: HTTP requests
- **sharp**: Przetwarzanie obrazów
- **openai**: OpenAI API
- **uuid**: Generowanie unikalnych ID
- **fs/promises**: Operacje na plikach

## Przykłady użycia

### Analiza podcastu

```typescript
const result = await mediaService.analyze('https://example.com/podcast.mp3');
console.log('Transkrypcja:', result.metadata.transcription);
console.log('Streszczenie:', result.description);
```

### Analiza zdjęcia produktu

```typescript
const result = await mediaService.analyze('https://shop.com/product.jpg');
console.log('Opis produktu:', result.description);
console.log('Wymiary:', `${result.metadata.width}x${result.metadata.height}`);
```

### Batch processing

```typescript
const urls = ['url1.jpg', 'url2.mp3', 'url3.png'];
const results = await mediaService.analyzeMultiple(urls);

// Statystyki analizy
const stats = mediaService.getAnalysisStats(results);
console.log(`Processed ${stats.total} files in ${stats.totalProcessingTime}ms`);
```

### Używanie dedykowanych serwisów

```typescript
import { AudioAnalysisService } from './AudioAnalysisService';
import { ImageAnalysisService } from './ImageAnalysisService';

// Bezpośrednie użycie serwisu audio
const audioService = new AudioAnalysisService();
const audioResult = await audioService.analyze(audioBuffer, 'source.mp3');

// Bezpośrednie użycie serwisu obrazów
const imageService = new ImageAnalysisService();
const imageResult = await imageService.analyze(imageBuffer, 'source.jpg');
```

## Rozszerzenia

Serwis można łatwo rozszerzyć o:
- Dodatkowe formaty plików
- Różne języki transkrypcji
- Niestandardowe prompty
- Integrację z bazami danych
- Cache'owanie wyników 