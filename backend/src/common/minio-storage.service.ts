import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioStorageService implements OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private client: Minio.Client | null = null;
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService) {
    this.bucketName = this.config.get<string>('MINIO_BUCKET', 'vidcraft-media');
  }

  private getClient(): Minio.Client {
    if (!this.client) {
      this.client = new Minio.Client({
        endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
        port: Number(this.config.get<string>('MINIO_PORT', '9000')),
        useSSL: false,
        accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
        secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
      });
    }
    return this.client;
  }

  async onModuleInit() {
    try {
      const client = this.getClient();
      const exists = await client.bucketExists(this.bucketName);
      if (!exists) {
        await client.makeBucket(this.bucketName);
        this.logger.log(`Bucket "${this.bucketName}" created`);
      }
      // 设为公开读，前端可直接通过 URL 访问图片
      await client.setBucketPolicy(this.bucketName, JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        }],
      }));
      this.logger.log(`Bucket "${this.bucketName}" policy set to public-read`);
    } catch (err) {
      this.logger.warn(`MinIO init failed (storage may be unavailable): ${(err as Error).message}`);
    }
  }

  /** Upload a file buffer to MinIO, returns the full public URL */
  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    await this.getClient().putObject(this.bucketName, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    const publicBase = this.config.get<string>('MEDIA_PUBLIC_BASE');
    if (publicBase) {
      return `${publicBase}/${this.bucketName}/${key}`;
    }
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get<number>('MINIO_PORT', 9000);
    return `http://${endpoint}:${port}/${this.bucketName}/${key}`;
  }

  /** Download a file from MinIO by URL, returns the buffer */
  async downloadFile(fileUrl: string): Promise<Buffer> {
    const key = this.extractKey(fileUrl);
    const stream = await this.getClient().getObject(this.bucketName, key);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /** Delete a file from MinIO by URL */
  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractKey(fileUrl);
    await this.getClient().removeObject(this.bucketName, key);
  }

  getBucket(): string {
    return this.bucketName;
  }

  /** Extract object key from a MinIO URL like http://host:port/bucket/key */
  private extractKey(fileUrl: string): string {
    try {
      const url = new URL(fileUrl);
      const path = url.pathname.substring(1);
      const bucketPrefix = `${this.bucketName}/`;
      if (path.startsWith(bucketPrefix)) {
        return path.substring(bucketPrefix.length);
      }
      return path;
    } catch {
      return fileUrl;
    }
  }
}
