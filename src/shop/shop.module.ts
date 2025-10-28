import { Module } from '@nestjs/common';
import { ShopService } from './shop.service';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports: [DatabaseModule,],
  providers: [ShopService,CloudinaryService],
  exports: [ShopService,]
})
export class ShopModule {}
