import express from 'express';
import { ArxivService } from './ArxivService';
import type { ProcessedArticle, ArxivAnswer } from './ArxivService';

const app = express();
const port = 3000;

app.use(express.json());

// Główny serwis
const arxivService = new ArxivService();

// Route do uruchomienia pełnego procesu przetwarzania
app.post('/api/process-article', async (req, res) => {
  try {
    console.log('\n🎯 Rozpoczynam pełny proces przetwarzania artykułu ArXiv...');
    console.log('═══════════════════════════════════════════════════════════════════');

    // 1. Przetwórz artykuł
    const article = await arxivService.processArticle();
    console.log(`📄 Artykuł "${article.title}" przetworzony`);
    console.log(`📊 Obrazów: ${article.images.length}, Audio: ${article.audios.length}`);

    // 2. Zapisz przetworzony artykuł ze słowniczkiem skrótów
    await arxivService.saveProcessedArticleWithGlossary(article);

    // 3. Pobierz pytania
    const questions = await arxivService.downloadQuestions();
    console.log(`❓ Pobrano ${questions.length} pytań`);

    // 4. Odpowiedz na pytania
    const answers = await arxivService.answerQuestions(article, questions);

    console.log(answers);

    // 5. Wyślij odpowiedzi
    const submitted = await arxivService.submitAnswers(answers);

    console.log('\n🎉 WYNIKI:');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`✅ Status: ${submitted ? 'Sukces' : 'Błąd wysyłania'}`);
    console.log('\n📝 Odpowiedzi:');
    Object.entries(answers).forEach(([key, value]) => {
      console.log(`${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
    });

    res.json({
      success: submitted,
      article: {
        title: article.title,
        contentLength: article.content.length,
        imagesCount: article.images.length,
        audiosCount: article.audios.length
      },
      questions: questions,
      answers: answers,
      submitted: submitted
    });

  } catch (error) {
    console.error('❌ Błąd przetwarzania:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route do pobierania tylko HTML
app.get('/api/download-html', async (req, res) => {
  try {
    const html = await arxivService.downloadHtml();
    res.json({
      success: true,
      html: html.substring(0, 1000) + '...',
      length: html.length
    });
  } catch (error) {
    console.error('❌ Błąd pobierania HTML:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route do pobierania tylko pytań
app.get('/api/download-questions', async (req, res) => {
  try {
    const questions = await arxivService.downloadQuestions();
    res.json({
      success: true,
      questions: questions
    });
  } catch (error) {
    console.error('❌ Błąd pobierania pytań:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route do testowania konwersji HTML na MD
app.post('/api/test-conversion', async (req, res) => {
  try {
    const article = await arxivService.processArticle();
    res.json({
      success: true,
      title: article.title,
      content: article.content.substring(0, 2000) + '...',
      contentLength: article.content.length,
      imagesCount: article.images.length,
      audiosCount: article.audios.length
    });
  } catch (error) {
    console.error('❌ Błąd konwersji:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route do sprawdzania statusu
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ready',
    message: 'ArXiv Article Processing Service',
    endpoints: {
      'POST /api/process-article': 'Przetwórz artykuł i odpowiedz na pytania',
      'GET /api/download-html': 'Pobierz tylko HTML',
      'GET /api/download-questions': 'Pobierz tylko pytania',
      'POST /api/test-conversion': 'Testuj konwersję HTML na MD'
    }
  });
});

// Automatyczne uruchomienie przy starcie
const runProcessingOnStartup = async () => {
  console.log('\n🚀 Uruchamiam automatyczne przetwarzanie artykułu...');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  
  try {
    // 1. Przetwórz artykuł
    console.log('\n📄 ETAP 1: Przetwarzanie artykułu...');
    const article = await arxivService.processArticle();
    console.log(`✅ Artykuł "${article.title}" przetworzony`);
    console.log(`📊 Statystyki: ${article.content.length} znaków, ${article.images.length} obrazów, ${article.audios.length} plików audio`);

    // 2. Zapisz przetworzony artykuł ze słowniczkiem skrótów
    console.log('\n📚 ETAP 2: Generowanie słowniczka skrótów i zapis artykułu...');
    await arxivService.saveProcessedArticleWithGlossary(article);

    // 3. Pobierz pytania
    console.log('\n❓ ETAP 3: Pobieranie pytań...');
    const questions = await arxivService.downloadQuestions();
    console.log(`✅ Pobrano ${questions.length} pytań:`);
    questions.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.substring(0, 80)}${q.length > 80 ? '...' : ''}`);
    });

    // 4. Odpowiedz na pytania
    console.log('\n💭 ETAP 4: Odpowiadanie na pytania...');
    const answers = await arxivService.answerQuestions(article, questions);

    // 5. Wyślij odpowiedzi
    console.log('\n📤 ETAP 5: Wysyłanie odpowiedzi...');
    const submitted = await arxivService.submitAnswers(answers);

    // Podsumowanie
    console.log('\n🎉 PODSUMOWANIE:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`✅ Status: ${submitted ? 'SUKCES - wszystko wykonane!' : 'BŁĄD - problemy z wysyłaniem'}`);
    console.log(`📄 Artykuł: ${article.title}`);
    console.log(`📊 Przetworzono: ${article.images.length} obrazów, ${article.audios.length} audio`);
    console.log(`❓ Odpowiedzi na ${Object.keys(answers).length} pytań:`);
    
    Object.entries(answers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
    });

    if (submitted) {
      console.log('\n🎯 ZADANIE UKOŃCZONE POMYŚLNIE!');
    } else {
      console.log('\n⚠️ ZADANIE CZĘŚCIOWO UKOŃCZONE - sprawdź logi błędów');
    }

  } catch (error) {
    console.error('\n❌ BŁĄD KRYTYCZNY:', error);
    console.log('\n🔄 Serwis nadal działa - możesz spróbować ponownie przez API');
  }
};

// Export dla bezpośredniego wykonania
export { arxivService };

// Jeśli uruchamiany bezpośrednio
if (require.main === module) {
  console.log('🚀 Uruchamiam bezpośrednie przetwarzanie artykułu...');
  
  const runDirect = async () => {
    try {
      const article = await arxivService.processArticle();
      await arxivService.saveProcessedArticleWithGlossary(article);
      const questions = await arxivService.downloadQuestions();
      const answers = await arxivService.answerQuestions(article, questions);
      const submitted = await arxivService.submitAnswers(answers);
      
      console.log('✅ Bezpośrednie wykonanie zakończone:', submitted ? 'SUKCES' : 'BŁĄD');
      process.exit(submitted ? 0 : 1);
    } catch (error) {
      console.error('❌ Błąd bezpośredniego wykonania:', error);
      process.exit(1);
    }
  };
  
  runDirect();
} else {
  // Start serwera tylko jeśli nie uruchamiany bezpośrednio
  app.listen(port, () => {
    console.log(`🚀 ArXiv Processing Server uruchomiony na http://localhost:${port}`);
    console.log('\nDostępne endpointy:');
    console.log('  GET  /api/status - Status serwisu');
    console.log('  POST /api/process-article - Pełny proces przetwarzania');
    console.log('  GET  /api/download-html - Tylko pobieranie HTML');
    console.log('  GET  /api/download-questions - Tylko pobieranie pytań');
    console.log('  POST /api/test-conversion - Test konwersji HTML→MD');
    
    // Uruchom automatyczne przetwarzanie po krótkiej przerwie
    setTimeout(runProcessingOnStartup, 3000);
  });
} 