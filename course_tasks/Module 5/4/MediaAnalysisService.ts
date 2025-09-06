import axios from 'axios';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AudioAnalysisService } from './AudioAnalysisService';
import { ImageAnalysisService } from './ImageAnalysisService';
import type { AudioAnalysisResult, AudioMetadata } from './AudioAnalysisService';
import type { ImageAnalysisResult, ImageMetadata } from './ImageAnalysisService';

export interface MediaAnalysisResult {
  type: 'audio' | 'image';
  url: string;
  description: string;
  metadata: AudioMetadata | ImageMetadata;
  processingTime: number;
}

export class MediaAnalysisService {
  private audioService: AudioAnalysisService;
  private imageService: ImageAnalysisService;
  private storageDir: string;

  constructor() {
    this.audioService = new AudioAnalysisService();
    this.imageService = new ImageAnalysisService();
    this.storageDir = path.join(__dirname, 'storage');
  }

  /**
   * Main method to analyze media from URL
   */
  async analyze(url: string): Promise<MediaAnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Starting analysis of: ${url}`);
      
      // Download file
      const fileData = await this.downloadFile(url);
      
      // Detect media type
      const mediaType = this.detectMediaType(fileData.buffer, fileData.mimeType);
      
      let result: AudioAnalysisResult | ImageAnalysisResult;
      
      if (mediaType === 'audio') {
        result = await this.audioService.analyze(fileData.buffer, url);
      } else {
        result = await this.imageService.analyze(fileData.buffer, url);
      }
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Analysis completed in ${processingTime}ms`);
      
      return {
        type: mediaType,
        url,
        description: result.description,
        metadata: result.metadata,
        processingTime
      };
      
    } catch (error) {
      console.error(`❌ Error analyzing media from ${url}:`, error);
      throw new Error(`Failed to analyze media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    try {
      console.log(`⬇️ Downloading file from: ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'MediaAnalysisService/1.0'
        }
      });

      const buffer = Buffer.from(response.data);
      const mimeType = response.headers['content-type'] || 'application/octet-stream';
      
      const urlPath = new URL(url).pathname;
      const filename = path.basename(urlPath) || `file_${uuidv4()}`;
      
      console.log(`📦 Downloaded ${buffer.length} bytes, MIME type: ${mimeType}`);
      
      return { buffer, mimeType, filename };
      
    } catch (error) {
      console.error(`❌ Error downloading file from ${url}:`, error);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect if file is audio or image based on MIME type and file signature
   */
  private detectMediaType(buffer: Buffer, mimeType: string): 'audio' | 'image' {
    // Use dedicated services to check file types
    if (AudioAnalysisService.isAudioFile(buffer, mimeType)) {
      return 'audio';
    }
    
    if (ImageAnalysisService.isImageFile(buffer, mimeType)) {
      return 'image';
    }
    
    throw new Error(`Unsupported media type: ${mimeType}. Supported types: audio (${AudioAnalysisService.getSupportedMimeTypes().join(', ')}) and images (${ImageAnalysisService.getSupportedMimeTypes().join(', ')})`);
  }

  /**
   * Get supported media types from both services
   */
  getSupportedTypes(): { audio: string[]; image: string[] } {
    return {
      audio: AudioAnalysisService.getSupportedMimeTypes(),
      image: ImageAnalysisService.getSupportedMimeTypes()
    };
  }

  /**
   * Analyze multiple URLs in parallel
   */
  async analyzeMultiple(urls: string[]): Promise<MediaAnalysisResult[]> {
    console.log(`🔍 Starting batch analysis of ${urls.length} files...`);
    
    try {
      const results = await Promise.all(
        urls.map(async (url, index) => {
          try {
            console.log(`📂 Processing file ${index + 1}/${urls.length}: ${url}`);
            return await this.analyze(url);
          } catch (error) {
            console.error(`❌ Failed to process ${url}:`, error);
            throw new Error(`Failed to process ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        })
      );
      
      console.log(`✅ Batch analysis completed: ${results.length} files processed`);
      return results;
      
    } catch (error) {
      console.error('❌ Batch analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get analysis statistics for a batch of results
   */
  getAnalysisStats(results: MediaAnalysisResult[]): {
    total: number;
    byType: { audio: number; image: number };
    avgProcessingTime: number;
    totalProcessingTime: number;
  } {
    const total = results.length;
    const byType = {
      audio: results.filter(r => r.type === 'audio').length,
      image: results.filter(r => r.type === 'image').length
    };
    const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    const avgProcessingTime = total > 0 ? totalProcessingTime / total : 0;

    return {
      total,
      byType,
      avgProcessingTime: Math.round(avgProcessingTime),
      totalProcessingTime
    };
  }
} 