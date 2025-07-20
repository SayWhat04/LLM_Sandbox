import { OpenAIService } from './OpenAIService';
import * as fs from 'fs';
import * as path from 'path';

export interface MapFragment {
  id: string;
  filename: string;
  base64Data: string;
}

export interface AnalysisResult {
  success: boolean;
  analysis: string;
  suggestedLocation?: string;
  confidence?: number;
  incorrectFragment?: string;
  finalAnswer?: string;
  error?: string;
}

export class MapAnalysisService {
  private openaiService: OpenAIService;
  private resourcesPath: string;
  private visionModel: string;

  constructor(visionModel: string = "gpt-4o") {
    this.openaiService = new OpenAIService();
    this.resourcesPath = path.join(__dirname, 'resources');
    this.visionModel = visionModel;
  }

  async loadMapFragments(): Promise<MapFragment[]> {
    const fragments: MapFragment[] = [];
    
    try {
      const files = fs.readdirSync(this.resourcesPath);
      const imageFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

      for (const filename of imageFiles) {
        const filePath = path.join(this.resourcesPath, filename);
        const imageBuffer = fs.readFileSync(filePath);
        const base64Data = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        
        fragments.push({
          id: path.parse(filename).name,
          filename,
          base64Data
        });
      }

      console.log(`✅ Loaded ${fragments.length} map fragments`);
      return fragments;
    } catch (error) {
      console.error('❌ Error loading map fragments:', error);
      throw error;
    }
  }

  async analyzeMapFragments(): Promise<AnalysisResult> {
    try {
      const fragments = await this.loadMapFragments();
      
      if (fragments.length === 0) {
        throw new Error('No map fragments found');
      }

      const imageUrls = fragments.map(fragment => fragment.base64Data);
      
      const prompt = `Przeanalizuj te 4 fragmenty mapy i zidentyfikuj polskie miasto, z którego pochodzą.

**KONTEKST - NAZWY ULIC NA FRAGMENTACH:**
- Fragment 1: KALINKOWA, BRZEŹNA, CHOPINA, CHEŁMIŃSKA
- Fragment 2: KALINKOWA, KONSTANTEGO ILDEFONSA GAŁCZYŃSKIEGO, STROMA, WŁADYSŁAWA REYMONTA
- Fragment 3: BOCZNA, TWARDOWSKIEGO, DWORSKA SŁOMIANA, SZWEDZKA  
- Fragment 4: CMENTARNA, PARKOWA

**WAŻNE INFORMACJE:**
- Miasto znajduje się w POLSCE
- W tym mieście jeżdżą TRAMWAJE i AUTOBUSY
- Jeden z fragmentów pochodzi z innej miejscowości
- ZAWSZE sugeruj się podanymi nazwami ulic - to są dokładne nazwy z map

**ZADANIE:**
Na podstawie podanych nazw ulic zidentyfikuj:
1. Które fragmenty (1, 2, 3, 4) należą do tego samego miasta
2. Który fragment pochodzi z innej miejscowości 
3. Jakie to polskie miasto (małe miasto)

**INSTRUKCJA ANALIZY:**
1. Przeanalizuj nazwy ulic pod kątem polskich miast z tramwajami i autobusami
2. Zwróć uwagę na powtarzające się ulice (np. KALINKOWA w fragmentach 1 i 2)
3. Zidentyfikuj fragment, który ma zupełnie inne nazwy ulic
4. Na podstawie charakterystycznych nazw ulic określ miasto.
5. Zwróć uwagę na to które ulice się ze sobą przecinają.
6. To że jakaś ulica znajduje się na dwóch fragmentach nie oznacza że pochodzą one z tego samego miasta.

Odpowiedz w formacie JSON (bez znaczników markdown):
{
  "analysis": "szczegółowa analiza nazw ulic i identyfikacja miasta",
  "results": {
    "mainLocation": "nazwa małego polskiego miasta",
    "confidence": "poziom pewności 1-10", 
    "correctFragments": ["fragmenty należące do małego miasta"],
    "incorrectFragment": {
      "id": "ID błędnego fragmentu",
      "reasoning": "dlaczego ten fragment nie pasuje"
    }
  },
  "finalAnswer": "[nazwa miasta]"
}

**Pamiętaj:**
- Sugeruj się ZAWSZE podanymi nazwami ulic
- Szukaj polskiego miasta z tramwajami i autobusami
- Na końcu jasno podaj miasto w "finalAnswer"
- Zwróć tylko czysty JSON bez znaczników markdown`;

      const response = await this.openaiService.analyzeImages(imageUrls, prompt, this.visionModel);
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // Oczyszczenie odpowiedzi z znaczników markdown
      let cleanContent = content;
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
      }
      
      // Próba parsowania JSON
      let analysisData;
      try {
        console.log('Raw content:', content);
        console.log('Clean content for parsing:', cleanContent);
        analysisData = JSON.parse(cleanContent);
      } catch (parseError) {
        console.log('⚠️ Could not parse JSON, returning as plain text');
        console.log('Parse error:', parseError);
        return {
          success: true,
          analysis: content
        };
      }

      // Wyświetl kontekst ulic użytych w analizie
      console.log('\n🛣️ KONTEKST NAZW ULIC UŻYTYCH W ANALIZIE:');
      console.log('═══════════════════════════════════════════════');
      console.log('📍 Fragment 1: KALINKOWA, BRZEŹNA, CHOPINA, CHEŁMIŃSKA');
      console.log('📍 Fragment 2: KALINKOWA, K.I.GAŁCZYŃSKIEGO, STROMA, W.REYMONTA');
      console.log('📍 Fragment 3: BOCZNA, TWARDOWSKIEGO, DWORSKA SŁOMIANA, SZWEDZKA');
      console.log('📍 Fragment 4: CMENTARNA, PARKOWA');
      console.log('═══════════════════════════════════════════════');

      return {
        success: true,
        analysis: content,
        suggestedLocation: analysisData.results?.mainLocation,
        confidence: analysisData.results?.confidence,
        incorrectFragment: analysisData.results?.incorrectFragment?.id,
        finalAnswer: analysisData.finalAnswer
      };

    } catch (error) {
      console.error('❌ Error analyzing map fragments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        analysis: ''
      };
    }
  }
} 