import axios from "axios";


function sendSMS(recipient:string, msg:string) {

    // DATA TO BE SENT
    const data = {
        "sender": process.env.SMS_BUSINESS_ID,
        "message": msg,
        "recipients": [recipient]
    };

    const config = {
        method: 'post',
        url: 'https://sms.arkesel.com/api/v2/sms/send',
        headers: {
            'api-key': process.env.SMS_API_KEY
        },
        data: data
    };

    axios(config)
        .then(function (response) {
            return response.status
        })
        .catch(function (error) {
            console.log(error);
            return false
    });
}

export {sendSMS}