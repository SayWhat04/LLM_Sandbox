import fs from 'fs/promises';
import OpenAI, { toFile } from 'openai';
import { OpenAIService } from './OpenAIService';

export interface AudioAnalysisResult {
  description: string;
  metadata: AudioMetadata;
}

export interface AudioMetadata {
  transcription: string;
  language: string;
  fileSize: number;
  duration?: number;
}

export class AudioAnalysisService {
  private openAIService: OpenAIService;
  private openai: OpenAI;

  constructor() {
    this.openAIService = new OpenAIService();
    this.openai = new OpenAI();
  }

  /**
   * Analyze audio file from buffer
   */
  async analyze(buffer: Buffer, sourceUrl: string): Promise<AudioAnalysisResult> {
    console.log(`🎵 Processing audio file (${buffer.length} bytes)...`);
    
    try {
      // Transcribe audio using OpenAI Whisper
      const transcription = await this.transcribeAudio(buffer);
      
      // Generate description using LLM
      const description = await this.generateDescription(transcription, sourceUrl);
      
      const metadata: AudioMetadata = {
        transcription,
        language: 'pl',
        fileSize: buffer.length
      };
      
      console.log(`✅ Audio processing completed`);
      return { description, metadata };
      
    } catch (error) {
      console.error('❌ Error processing audio:', error);
      throw new Error(`Audio processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(buffer: Buffer): Promise<string> {
    try {
      console.log('📝 Transcribing audio...');
      
      const file = await toFile(buffer, 'audio.ogg');
      const transcription = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'pl'
      });

      console.log(`📝 Transcription completed (${transcription.text.length} characters)`);
      return transcription.text;
      
    } catch (error) {
      console.error('❌ Error transcribing audio:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate audio description using LLM
   */
  private async generateDescription(transcription: string, sourceUrl: string): Promise<string> {
    try {
      console.log('🧠 Generating audio description...');
      
      const systemMessage = `Jesteś ekspertem od analizy treści audio. Stwórz szczegółowy opis zawartości pliku audio na podstawie transkrypcji.

Uwzględnij:
- Główne tematy i treści
- Ton i charakter nagrania
- Kluczowe informacje i wnioski
- Kontekst i cel nagrania
- Jakość i charakterystykę audio (jeśli można wywnioskować)

Opisz treść zwięźle ale kompletnie w języku polskim. Jeśli transkrypcja jest bardzo krótka lub niejasna, zaznacz to w opisie.`;

      const userMessage = `Przeanalizuj transkrypcję audio z ${sourceUrl}:

"${transcription}"

Stwórz szczegółowy opis zawartości tego pliku audio.`;

      const response = await this.openAIService.completion(
        {messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ]}
      ) as OpenAI.Chat.Completions.ChatCompletion;

      const description = response.choices[0].message.content || "Nie udało się wygenerować opisu audio.";
      console.log(`🧠 Description generated (${description.length} characters)`);
      
      return description;
      
    } catch (error) {
      console.error('❌ Error generating audio description:', error);
      throw new Error(`Description generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if buffer contains audio data by examining file signature
   */
  static isAudioFile(buffer: Buffer, mimeType: string): boolean {
    // Check MIME type first
    const audioMimeTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
      'audio/webm', 'audio/m4a', 'audio/aac', 'audio/flac'
    ];
    
    if (audioMimeTypes.some(type => mimeType.includes(type))) {
      return true;
    }
    
    // Fallback: Check file signature
    return AudioAnalysisService.isAudioBySignature(buffer);
  }

  /**
   * Check if buffer contains audio data by examining file signature (magic bytes)
   */
  private static isAudioBySignature(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    
    // MP3
    if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) return true;
    if (buffer.toString('ascii', 0, 3) === 'ID3') return true;
    
    // WAV
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') return true;
    
    // OGG
    if (buffer.toString('ascii', 0, 4) === 'OggS') return true;
    
    // M4A/AAC
    if (buffer.toString('ascii', 4, 8) === 'ftyp') return true;
    
    return false;
  }

  /**
   * Get supported audio MIME types
   */
  static getSupportedMimeTypes(): string[] {
    return [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
      'audio/webm', 'audio/m4a', 'audio/aac', 'audio/flac'
    ];
  }
} 