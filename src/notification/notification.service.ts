import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NotificationService {
    private EXPO_API_URL = 'https://exp.host/--/api/v2/push/send';

    async sendPushNotification(expoPushToken: string, title: string, body:
        string, data?: any) {
        const message = {
            to: expoPushToken,
            sound: 'default',
            title,
            body,
            data,
        };

        try {
            const response = await axios.post(this.EXPO_API_URL, message, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });
        // STORE RESPONSE INTO DATABASE FOR LOGGING PURPOSES
        return response.data;
        } catch (error) {
            console.error('Error sending push notification:', error);
            throw error;
        }
    }
}
