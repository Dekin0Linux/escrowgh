import { Injectable } from '@nestjs/common';
import {v2 as cloudinary} from 'cloudinary';
import * as dotenv from 'dotenv';
import * as streamifier from 'streamifier';
dotenv.config();

@Injectable()
export class CloudinaryService {
    constructor(){
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    async uploadImage(file: Express.Multer.File): Promise<string> {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'nest-uploads' }, // optional folder
            (error, result:any) => {
              if (error) return reject(error);
              resolve(result?.secure_url); // return the uploaded image URL
            },
          );
    
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
      }
}
