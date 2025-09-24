import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NotificationService {
    private EXPO_API_URL = 'https://exp.host/--/api/v2/push/send';

    async sendPushNotification(expoPushToken: string, title: string, body:
        string) {
        const message = {
            to: expoPushToken,
            sound: 'default',
            title,
            body,
        };
        const response = await axios.post(this.EXPO_API_URL, message, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });

        // STORE RESPONSE INTO DATABASE FOR LOGGING PURPOSES
        
        return response.data;
    }
}
