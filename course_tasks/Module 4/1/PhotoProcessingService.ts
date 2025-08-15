import { OpenAIService } from './OpenAIService';

interface CentralaResponse {
  code: number;
  message: string;
}

interface PhotoInfo {
  filename: string;
  url: string;
  currentUrl: string;
  processed: boolean;
  isBarbara: boolean;
  quality: 'good' | 'poor' | 'unusable';
  processAttempts: number;
  maxAttempts: number;
}

export class PhotoProcessingService {
  private openaiService: OpenAIService;
  private readonly API_ENDPOINT = 'https://c3ntrala.ag3nts.org/report';
  private readonly API_KEY = '97ad060a-008e-40cc-8012-f8cbaaa3968e';
  
  constructor() {
    this.openaiService = new OpenAIService();
  }

  async processPhotos(sessionId?: string): Promise<string> {
    const id = sessionId || 'default';
    try {
      console.log(`📷 [${id}] === Starting photo processing ===`);
      
      // Step 1: Get initial photo information
      console.log(`📥 [${id}] 1. Getting initial photo information...`);
      const photoUrls = await this.getInitialPhotos();
      console.log(`✅ [${id}] Received ${photoUrls.length} photo URLs`);
      
      // Step 2: Initialize photo tracking
      const photos: PhotoInfo[] = photoUrls.map(url => {
        const filename = this.extractFilename(url);
        return {
          filename,
          url,
          currentUrl: url,
          processed: false,
          isBarbara: false,
          quality: 'poor' as const,
          processAttempts: 0,
          maxAttempts: 3
        };
      });
      
      // Step 3: Process each photo
      console.log(`🔄 [${id}] 2. Processing photos...`);
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        console.log(`   📸 [${id}] Processing photo ${i + 1}/${photos.length}: ${photo.filename}`);
        await this.processPhoto(photo);
      }
      
      // Step 4: Select good quality photos of Barbara
      const goodPhotos = photos.filter(photo => 
        photo.quality === 'good' && photo.isBarbara
      );
      
      console.log(`🎯 [${id}] 3. Found ${goodPhotos.length} good quality photos of Barbara`);
      
      if (goodPhotos.length === 0) {
        throw new Error('No good quality photos of Barbara found');
      }
      
      // Step 5: Generate portrait description
      console.log(`✍️ [${id}] 4. Generating portrait description...`);
      const portraitDescription = await this.generatePortrait(goodPhotos);
      console.log(`✅ [${id}] Portrait description generated`);
      
      // Step 6: Submit final answer
      console.log(`📤 [${id}] 5. Submitting final answer...`);
      const finalResponse = await this.submitFinalAnswer(portraitDescription);
      console.log(`🎉 [${id}] Final answer submitted`);
      
      console.log(`🏁 [${id}] === Photo processing completed ===`);
      return finalResponse;
      
    } catch (error) {
      console.error(`❌ [${id}] Error in photo processing:`, error);
      throw error;
    }
  }

  private async getInitialPhotos(): Promise<string[]> {
    const response = await this.sendToCentrala('START');
    console.log('Initial response:', response.message);
    
    // Extract photo URLs from the response message
    const urls = this.extractPhotoUrls(response.message);
    console.log('Extracted URLs:', urls);
    
    return urls;
  }

  private extractPhotoUrls(message: string): string[] {
    console.log('    Extracting URLs from message:', message);
    
    // Look for complete URLs first (fallback)
    const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/gi;
    const completeUrls = message.match(urlRegex) || [];
    
    if (completeUrls.length > 0) {
      console.log('    Found complete URLs:', completeUrls);
      return completeUrls;
    }
    
    // Look for filenames and base URL separately (centrala format)
    const filenameRegex = /([A-Z0-9_]+\.(?:PNG|JPG|JPEG|GIF|WEBP))/gi;
    const baseUrlRegex = /(https?:\/\/[^\s]+\/)/gi;
    
    const filenames = message.match(filenameRegex) || [];
    const baseUrlMatch = message.match(baseUrlRegex);
    
    console.log('    Found filenames:', filenames);
    console.log('    Found base URL:', baseUrlMatch);
    
    if (filenames.length > 0 && baseUrlMatch && baseUrlMatch[0]) {
      const baseUrl = baseUrlMatch[0];
      const urls = filenames.map(filename => {
        // Ensure base URL ends with /
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        return cleanBaseUrl + filename;
      });
      
      console.log('    Constructed URLs:', urls);
      return urls;
    }
    
    console.log('    No URLs found!');
    return [];
  }

  private extractFilename(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  private async processPhoto(photo: PhotoInfo) {
    let currentUrl = photo.currentUrl;
    
    while (photo.processAttempts < photo.maxAttempts && photo.quality !== 'good') {
      photo.processAttempts++;
      
      console.log(`      Attempt ${photo.processAttempts}/${photo.maxAttempts} for ${photo.filename}`);
      
      // Analyze current photo quality and determine needed operation
      console.log(`      Analyzing photo quality...`);
      const analysis = await this.analyzePhotoQuality(currentUrl);
      console.log(`      Analysis result: Assessment=${analysis.assessment}, Action=${analysis.action}, Barbara=${analysis.isBarbara}`);
      
      if (analysis.assessment === 'good') {
        console.log(`      ✓ Photo assessed as GOOD quality - stopping processing`);
        photo.quality = 'good';
        photo.isBarbara = analysis.isBarbara;
        photo.processed = true;
        break;
      }
      
      if (analysis.assessment === 'unusable') {
        console.log(`      ✗ Photo assessed as UNUSABLE - stopping processing`);
        photo.quality = 'unusable';
        break;
      }
      
      if (analysis.action === 'none') {
        console.log(`      ✗ No repair action suggested - stopping processing`);
        photo.quality = 'poor';
        break;
      }
      
      // Send repair command to centrala
      const command = `${analysis.action} ${photo.filename}`;
      console.log(`      🔧 PROCEEDING WITH REPAIR - Sending command: ${command}`);
      
      const response = await this.sendToCentrala(command);
      console.log(`      📥 Centrala response: ${response.message}`);
      
      // Extract new filename/URL from response
      const newFilename = this.extractNewFilename(response.message, photo.filename);
      if (newFilename && newFilename !== photo.filename) {
        photo.filename = newFilename;
        currentUrl = currentUrl.replace(/[^\/]+$/, newFilename);
        photo.currentUrl = currentUrl;
        console.log(`      New filename: ${newFilename}`);
      }
      
      // Small delay to avoid rate limiting
      await this.delay(1000);
    }
    
    console.log(`      Final result: ${photo.filename} - Quality: ${photo.quality}, Barbara: ${photo.isBarbara}`);
  }

  private async analyzePhotoQuality(imageUrl: string): Promise<{
    assessment: 'good' | 'poor' | 'unusable';
    action: 'REPAIR' | 'DARKEN' | 'BRIGHTEN' | 'none';
    isBarbara: boolean;
  }> {
    // Use -small version to save tokens
    const smallUrl = imageUrl.replace(/\.([^.]+)$/, '-small.$1');
    console.log(`         Analyzing: ${imageUrl}`);
    console.log(`         Small URL: ${smallUrl}`);
    
    const prompt = `Jesteś ekspertem do naprawy zdjęć. Przeanalizuj to zdjęcie i oceń:

1. JAKOŚĆ ZDJĘCIA:
   - "good" - TYLKO perfekcyjne zdjęcia: idealne oświetlenie, zero szumów, pełna ostrość
   - "poor" - ma problemy ale da się naprawić (większość zdjęć będzie "poor")
   - "unusable" - całkowicie nieczytelne, nie do naprawy

2. AKCJA NAPRAWCZA (OBOWIĄZKOWA dla "poor"):
   Jeśli assessment="poor", MUSISZ wybrać jedną z akcji:
   
   - "REPAIR" - gdy widzisz: szumy, pixelizację, glitche, artefakty, zniekształcenia, rozmazania
   - "DARKEN" - gdy zdjęcie jest: zbyt jasne, przepalone, białe plamy, za duży kontrast
   - "BRIGHTEN" - gdy zdjęcie jest: zbyt ciemne, za mało światła, słabo widoczne detale
   
   NIGDY nie używaj "none" jeśli assessment="poor"!
   
3. Czy widzisz kobietę na zdjęciu: true/false

ZASADY:
- Jeśli zdjęcie nie jest perfekcyjne → assessment="poor" 
- Jeśli assessment="poor" → MUSISZ podać konkretną akcję (REPAIR/DARKEN/BRIGHTEN)
- W razie wątpliwości co do akcji, wybierz "REPAIR"

Odpowiedz TYLKO JSONem:

{
  "assessment": "good/poor/unusable",
  "action": "REPAIR/DARKEN/BRIGHTEN/none", 
  "isBarbara": true/false,
  "reasoning": "dlaczego ta akcja"
}`;

    let response = '';
    try {
      console.log(`         Sending prompt to GPT...`);
      response = await this.openaiService.analyzeImage(smallUrl, prompt, "gpt-4o-mini");
      console.log(`         GPT response: ${response}`);
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = response.trim();
      
      // Remove markdown code blocks if present
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
        console.log(`         Extracted from markdown: ${jsonText}`);
      }
      
      // Remove any leading/trailing text that might not be JSON
      const jsonStart = jsonText.indexOf('{');
      const jsonEnd = jsonText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
        console.log(`         Cleaned JSON: ${jsonText}`);
      }
      
      const analysis = JSON.parse(jsonText);
      console.log(`         Parsed analysis:`, analysis);
      
      let finalAction = analysis.action || 'none';
      
      // Force repair action if assessment is poor but action is none
      if (analysis.assessment === 'poor' && finalAction === 'none') {
        console.log(`         WARNING: GPT returned 'none' for poor quality - forcing REPAIR`);
        finalAction = 'REPAIR';
      }
      
      const result = {
        assessment: analysis.assessment || 'unusable',
        action: finalAction,
        isBarbara: analysis.isBarbara || false
      };
      
      console.log(`         Final result:`, result);
      return result;
    } catch (error) {
      console.error('         Error analyzing photo quality:', error);
      console.error('         Response that failed to parse:', response);
      return {
        assessment: 'unusable',
        action: 'none',
        isBarbara: false
      };
    }
  }

  private extractNewFilename(message: string, currentFilename: string): string {
    // Look for patterns like IMG_123_FXER.PNG or similar processed filenames
    const filenameRegex = /([A-Z0-9_]+\.(?:png|jpg|jpeg|gif))/gi;
    const matches = message.match(filenameRegex) || [];
    
    // Find a filename that's different from current and looks like a processed version
    const processed = matches.find(filename => 
      filename !== currentFilename && 
      (filename.includes('_FXER') || filename.includes('_DARK') || filename.includes('_BRIT') || filename.includes('_FX'))
    );
    
    return processed || currentFilename;
  }

  private async generatePortrait(goodPhotos: PhotoInfo[]): Promise<string> {
    const imageUrls = goodPhotos.map(photo => photo.currentUrl);
    console.log('Generating portrait from URLs:', imageUrls);
    
    return await this.openaiService.generatePortrait(imageUrls);
  }

  private async sendToCentrala(answer: string): Promise<CentralaResponse> {
    const payload = {
      task: "photos",
      apikey: this.API_KEY,
      answer: answer
    };

    console.log('Sending to centrala:', { ...payload, apikey: '[HIDDEN]' });

    const response = await fetch(this.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  private async submitFinalAnswer(portraitDescription: string): Promise<string> {
    const response = await this.sendToCentrala(portraitDescription);
    
    if (response.code === 0) {
      return `Success! ${response.message}`;
    } else {
      throw new Error(`Failed to submit answer: ${response.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 