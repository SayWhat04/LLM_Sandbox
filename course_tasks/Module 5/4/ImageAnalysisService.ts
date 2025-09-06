import sharp from 'sharp';
import OpenAI from 'openai';
import { OpenAIService } from './OpenAIService';

export interface ImageAnalysisResult {
  description: string;
  metadata: ImageMetadata;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  optimized: boolean;
  originalSize?: number;
}

export class ImageAnalysisService {
  private openAIService: OpenAIService;

  constructor() {
    this.openAIService = new OpenAIService();
  }

  /**
   * Analyze image file from buffer
   */
  async analyze(buffer: Buffer, sourceUrl: string): Promise<ImageAnalysisResult> {
    console.log(`🖼️ Processing image file (${buffer.length} bytes)...`);
    
    try {
      // Optimize image for Vision API
      const optimizedResult = await this.optimizeImage(buffer);
      
      // Generate description using Vision API
      const description = await this.generateDescription(optimizedResult.buffer, sourceUrl);
      
      const metadata: ImageMetadata = {
        width: optimizedResult.metadata.width,
        height: optimizedResult.metadata.height,
        format: optimizedResult.metadata.format,
        size: optimizedResult.buffer.length,
        optimized: optimizedResult.wasOptimized,
        originalSize: buffer.length
      };
      
      console.log(`✅ Image processing completed`);
      return { description, metadata };
      
    } catch (error) {
      console.error('❌ Error processing image:', error);
      throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize image for Vision API (max 2048x2048, good quality)
   */
  private async optimizeImage(buffer: Buffer): Promise<{
    buffer: Buffer;
    metadata: { width: number; height: number; format: string };
    wasOptimized: boolean;
  }> {
    try {
      console.log('🔧 Optimizing image...');
      
      // Get original metadata
      const originalMetadata = await sharp(buffer).metadata();
      
      // Check if optimization is needed
      const needsResize = (originalMetadata.width || 0) > 2048 || (originalMetadata.height || 0) > 2048;
      const needsCompression = buffer.length > 1024 * 1024; // 1MB
      
      if (!needsResize && !needsCompression) {
        console.log('🔧 Image already optimized, using original');
        return {
          buffer,
          metadata: {
            width: originalMetadata.width || 0,
            height: originalMetadata.height || 0,
            format: originalMetadata.format || 'unknown'
          },
          wasOptimized: false
        };
      }
      
      // Optimize image
      const optimizedBuffer = await sharp(buffer)
        .resize(2048, 2048, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85,
          progressive: true 
        })
        .toBuffer();
      
      const optimizedMetadata = await sharp(optimizedBuffer).metadata();
      
      console.log(`🔧 Image optimized: ${originalMetadata.width}x${originalMetadata.height} → ${optimizedMetadata.width}x${optimizedMetadata.height}, ${buffer.length} → ${optimizedBuffer.length} bytes`);
      
      return {
        buffer: optimizedBuffer,
        metadata: {
          width: optimizedMetadata.width || 0,
          height: optimizedMetadata.height || 0,
          format: optimizedMetadata.format || 'jpeg'
        },
        wasOptimized: true
      };
      
    } catch (error) {
      console.error('❌ Error optimizing image:', error);
      throw new Error(`Image optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate image description using Vision API
   */
  private async generateDescription(imageBuffer: Buffer, sourceUrl: string): Promise<string> {
    try {
      console.log('🧠 Generating image description...');
      
      const base64Image = imageBuffer.toString('base64');
      
      const systemMessage = `Jesteś ekspertem od analizy obrazów. Stwórz szczegółowy opis obrazu.

Uwzględnij:
- Główne obiekty i elementy na obrazie
- Kolory, kompozycję i styl
- Kontekst i scenę
- Emocje i atmosferę
- Tekst widoczny na obrazie (jeśli jest)
- Jakość i charakterystykę techniczną (jeśli istotne)

Opisz szczegółowo ale przystępnie w języku polskim. Jeśli obraz jest niewyraźny lub trudny do interpretacji, zaznacz to w opisie.`;

      const response = await this.openAIService.completion(
        {messages: [
          { role: "system", content: systemMessage },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Przeanalizuj obraz z ${sourceUrl}. Stwórz szczegółowy opis tego, co widzisz.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high"
                }
              }
            ] as any
          }
        ]}
      ) as OpenAI.Chat.Completions.ChatCompletion;

      const description = response.choices[0].message.content || "Nie udało się wygenerować opisu obrazu.";
      console.log(`🧠 Description generated (${description.length} characters)`);
      
      return description;
      
    } catch (error) {
      console.error('❌ Error generating image description:', error);
      throw new Error(`Description generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if buffer contains image data
   */
  static isImageFile(buffer: Buffer, mimeType: string): boolean {
    // Check MIME type first
    const imageMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/webp', 'image/bmp', 'image/tiff'
    ];
    
    if (imageMimeTypes.some(type => mimeType.includes(type))) {
      return true;
    }
    
    // Fallback: Check file signature
    return ImageAnalysisService.isImageBySignature(buffer);
  }

  /**
   * Check if buffer contains image data by examining file signature (magic bytes)
   */
  private static isImageBySignature(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    
    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return true;
    
    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    
    // GIF
    if (buffer.toString('ascii', 0, 3) === 'GIF') return true;
    
    // WebP
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;
    
    // BMP
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) return true;
    
    return false;
  }

  /**
   * Get supported image MIME types
   */
  static getSupportedMimeTypes(): string[] {
    return [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/webp', 'image/bmp', 'image/tiff'
    ];
  }

  /**
   * Get image metadata without processing
   */
  async getMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 