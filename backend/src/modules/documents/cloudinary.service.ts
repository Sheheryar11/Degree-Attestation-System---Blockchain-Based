import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    if (!cloudName || cloudName === 'changeme') {
      this.logger.warn('Cloudinary not configured — file uploads will use placeholder URLs');
      return;
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key:    this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
    });
    this.enabled = true;
    this.logger.log(`Cloudinary connected — cloud: ${cloudName}`);
  }

  async uploadBuffer(buffer: Buffer, originalName: string, folder: string): Promise<UploadApiResponse> {
    if (!this.enabled) {
      const fakeId = `${folder}/local_${Date.now()}_${originalName.replace(/[^a-z0-9.]/gi, '_')}`;
      return {
        public_id: fakeId,
        secure_url: `http://localhost:3001/local-files/${fakeId}`,
        url: `http://localhost:3001/local-files/${fakeId}`,
      } as unknown as UploadApiResponse;
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'raw', use_filename: true, unique_filename: true },
        (error, result) => {
          if (error) return reject(error);
          resolve(result!);
        },
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    if (!this.enabled) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  }
}
