import ExifReader from 'exifreader';
import { PhotoMetadata } from './types';

export class MetadataExtractor {
  static async extractMetadata(imageBuffer: Buffer): Promise<PhotoMetadata> {
    try {
      const tags = ExifReader.load(imageBuffer);
      
      const metadata: PhotoMetadata = {};

      // Camera information
      if (tags['Make']?.description) {
        metadata.camera = tags['Make'].description;
        if (tags['Model']?.description) {
          metadata.camera += ` ${tags['Model'].description}`;
        }
      }

      // Lens information
      if (tags['LensModel']?.description) {
        metadata.lens = tags['LensModel'].description;
      }

      // ISO
      if (tags['ISOSpeedRatings']?.value) {
        metadata.iso = parseInt(tags['ISOSpeedRatings'].value.toString());
      }

      // Aperture
      if (tags['FNumber']?.value) {
        metadata.aperture = `f/${tags['FNumber'].value}`;
      }

      // Shutter speed
      if (tags['ExposureTime']?.value) {
        const exposureTime = tags['ExposureTime'].value;
        if (exposureTime < 1) {
          metadata.shutterSpeed = `1/${Math.round(1 / exposureTime)}s`;
        } else {
          metadata.shutterSpeed = `${exposureTime}s`;
        }
      }

      // Focal length
      if (tags['FocalLength']?.value) {
        metadata.focalLength = `${tags['FocalLength'].value}mm`;
      }

      // GPS coordinates
      if (tags['GPSLatitude']?.value && tags['GPSLongitude']?.value) {
        const lat = this.convertDMSToDD(tags['GPSLatitude'].value, tags['GPSLatitudeRef']?.value);
        const lon = this.convertDMSToDD(tags['GPSLongitude'].value, tags['GPSLongitudeRef']?.value);
        
        if (!isNaN(lat) && !isNaN(lon)) {
          metadata.gps = {
            latitude: lat,
            longitude: lon
          };
        }
      }

      // Date taken
      if (tags['DateTimeOriginal']?.description) {
        metadata.dateTaken = new Date(tags['DateTimeOriginal'].description);
      } else if (tags['CreateDate']?.description) {
        metadata.dateTaken = new Date(tags['CreateDate'].description);
      }

      return metadata;
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      return {};
    }
  }

  private static convertDMSToDD(dms: number[], ref?: string): number {
    if (!dms || dms.length < 3) return NaN;

    const degrees = dms[0];
    const minutes = dms[1];
    const seconds = dms[2];

    let dd = degrees + minutes / 60 + seconds / 3600;

    if (ref === 'S' || ref === 'W') {
      dd = dd * -1;
    }

    return dd;
  }

  static async getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
    // This would typically use sharp, but for simplicity we'll return defaults
    // In production, you'd use: const metadata = await sharp(imageBuffer).metadata();
    return { width: 0, height: 0 };
  }
}