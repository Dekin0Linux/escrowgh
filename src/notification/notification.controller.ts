import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SendNotificationDto } from './dto/send-notification.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { IsAdminGuard } from 'src/common/guards/is-admin.guard';

@ApiBearerAuth() 
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }
    @Post('send-notification')
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    async sendNotification(
        @Body() body: SendNotificationDto
    ) {
        return this.notificationService.sendPushNotification(
            body.token,
            body.title,
            body.message,
        );
    }
    
}
