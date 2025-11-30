import sharp from 'sharp';
import path from 'path';
import { THUMBNAIL_SIZE } from '@thumbnail-system/shared';
import { config } from '../config';

export class ImageProcessor {
  async generateThumbnail(inputPath: string, outputFilename: string): Promise<string> {
    const outputPath = path.join(config.thumbnailDir, outputFilename);

    console.log(`📸 Generating thumbnail:`);
    console.log(`   Input: ${inputPath}`);
    console.log(`   Output: ${outputPath}`);
    console.log(`   Thumbnail dir: ${config.thumbnailDir}`);
    console.log(`   🔍 THUMBNAIL_SIZE constant: ${THUMBNAIL_SIZE}px`);

    // High quality thumbnail - no sharpening to preserve original quality
    const ext = path.extname(outputFilename).toLowerCase();
    const sharpInstance = sharp(inputPath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'inside',
        kernel: 'lanczos3',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      });

    if (ext === '.png') {
      await sharpInstance
        .png({ quality: 100, compressionLevel: 0, effort: 10 })
        .toFile(outputPath);
    } else {
      // Maximum quality JPEG like the second image
      await sharpInstance
        .jpeg({ quality: 95, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' })
        .toFile(outputPath);
    }

    console.log(`✅ Thumbnail saved to: ${outputPath}`);

    return outputPath;
  }
}
