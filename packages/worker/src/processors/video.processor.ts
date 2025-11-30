import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { THUMBNAIL_SIZE } from '@thumbnail-system/shared';
import { config } from '../config';

export class VideoProcessor {
  async generateThumbnail(inputPath: string, outputFilename: string): Promise<string> {
    console.log(`🎬 Generating video thumbnail:`);
    console.log(`   Input: ${inputPath}`);
    console.log(`   Output filename: ${outputFilename}`);

    // Get video duration to find midpoint
    const duration = await this.getVideoDuration(inputPath);
    const midpoint = duration / 2;
    console.log(`   Video duration: ${duration}s, extracting frame at ${midpoint}s`);

    // Extract frame at midpoint
    const tempFramePath = path.join(config.thumbnailDir, `temp-${Date.now()}.png`);
    console.log(`   Extracting frame to: ${tempFramePath}`);
    await this.extractFrame(inputPath, midpoint, tempFramePath);
    console.log(`   ✅ Frame extracted`);

    // Generate thumbnail from extracted frame
    const outputPath = path.join(config.thumbnailDir, outputFilename);
    console.log(`   Creating thumbnail: ${outputPath}`);
    console.log(`   🔍 THUMBNAIL_SIZE constant: ${THUMBNAIL_SIZE}px`);
    await sharp(tempFramePath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'inside',
        kernel: 'lanczos3',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .jpeg({ 
        quality: 95, // Maximum quality like the second image
        mozjpeg: true,
        progressive: true,
        optimizeScans: true,
        chromaSubsampling: '4:4:4'
      })
      .toFile(outputPath);
    console.log(`   ✅ Thumbnail created`);

    // Clean up temporary frame
    await fs.promises.unlink(tempFramePath);
    console.log(`   ✅ Temp file cleaned up`);

    return outputPath;
  }

  private getVideoDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  private extractFrame(inputPath: string, timestamp: number, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '1920x1080', // Extract high quality frame
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });
  }
}
