import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import * as streamifier from 'streamifier';
dotenv.config();

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    //  Step 1: File size check (e.g. 2MB max)
    const MAX_SIZE = 1 * 1024 * 1024; // 4MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File too large. Maximum allowed size is 4MB.');
    }

    // Step 2: Optional file type check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG and PNG image formats are allowed.');
    }

    // Step 3: Upload to Cloudinary
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'nest-uploads',
          resource_type: 'image',
          // transformation: [
          //   { width: 1200, height: 1200, crop: 'limit' }, // optional resize cap
          // ],
        },
        (error, result: any) => {
          if (error) return reject(error);
          resolve(result?.secure_url);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
