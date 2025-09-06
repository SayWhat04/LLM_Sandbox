import { MediaAnalysisService } from './MediaAnalysisService';
import { AudioAnalysisService } from './AudioAnalysisService';
import { ImageAnalysisService } from './ImageAnalysisService';

async function demonstrateMediaAnalysis() {
  const mediaService = new MediaAnalysisService();

  console.log('🚀 MediaAnalysisService Demo - Modular Architecture');
  console.log('=====================================================');

  // Przykładowe URL do testowania (zastąp własnymi)
  const testUrls = {
    // Przykład pliku audio (MP3)
    audio: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    
    // Przykład obrazu (JPEG/PNG)
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png'
  };

  try {
    // Test analizy obrazu
    console.log('\n📸 Testowanie analizy obrazu...');
    const imageResult = await mediaService.analyze(testUrls.image);
    
    console.log('Wyniki analizy obrazu:');
    console.log(`- Typ: ${imageResult.type}`);
    console.log(`- URL: ${imageResult.url}`);
    console.log(`- Czas przetwarzania: ${imageResult.processingTime}ms`);
    console.log(`- Metadane:`, imageResult.metadata);
    console.log(`- Opis: ${imageResult.description}`);

    // Test analizy audio
    console.log('\n🎵 Testowanie analizy audio...');
    const audioResult = await mediaService.analyze(testUrls.audio);
    
    console.log('Wyniki analizy audio:');
    console.log(`- Typ: ${audioResult.type}`);
    console.log(`- URL: ${audioResult.url}`);
    console.log(`- Czas przetwarzania: ${audioResult.processingTime}ms`);
    console.log(`- Metadane:`, audioResult.metadata);
    console.log(`- Opis: ${audioResult.description}`);

    // Pokaż obsługiwane typy plików
    console.log('\n📋 Obsługiwane typy plików:');
    const supportedTypes = mediaService.getSupportedTypes();
    console.log('Audio:', supportedTypes.audio.join(', '));
    console.log('Obrazy:', supportedTypes.image.join(', '));

    // Demo batch processing
    console.log('\n🔄 Testowanie batch processing...');
    const batchUrls = [testUrls.image, testUrls.audio];
    const batchResults = await mediaService.analyzeMultiple(batchUrls);
    
    console.log('Wyniki batch processing:');
    batchResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.type.toUpperCase()}: ${result.url}`);
      console.log(`   Czas: ${result.processingTime}ms`);
      console.log(`   Opis: ${result.description.substring(0, 100)}...`);
    });

    // Pokaż statystyki
    const stats = mediaService.getAnalysisStats(batchResults);
    console.log('\n📊 Statystyki analizy:');
    console.log(`- Łącznie plików: ${stats.total}`);
    console.log(`- Audio: ${stats.byType.audio}, Obrazy: ${stats.byType.image}`);
    console.log(`- Średni czas: ${stats.avgProcessingTime}ms`);
    console.log(`- Łączny czas: ${stats.totalProcessingTime}ms`);

    // Demo dedykowanych serwisów
    console.log('\n🔧 Demo dedykowanych serwisów...');
    console.log('Audio MIME types:', AudioAnalysisService.getSupportedMimeTypes().slice(0, 3).join(', '), '...');
    console.log('Image MIME types:', ImageAnalysisService.getSupportedMimeTypes().slice(0, 3).join(', '), '...');

  } catch (error) {
    console.error('❌ Błąd podczas demonstracji:', error);
    
    if (error instanceof Error) {
      console.error('Szczegóły:', error.message);
    }
  }
}

// Funkcja pomocnicza do testowania z własnym URL
export async function analyzeCustomUrl(url: string) {
  const mediaService = new MediaAnalysisService();
  
  try {
    console.log(`🔍 Analizowanie: ${url}`);
    const result = await mediaService.analyze(url);
    
    console.log('\n✅ Wyniki analizy:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Błąd analizy:', error);
    throw error;
  }
}

// Uruchom demo jeśli plik jest wykonywany bezpośrednio
if (require.main === module) {
  demonstrateMediaAnalysis()
    .then(() => {
      console.log('\n🎉 Demo zakończone pomyślnie!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Demo zakończone błędem:', error);
      process.exit(1);
    });
}

export { demonstrateMediaAnalysis }; 