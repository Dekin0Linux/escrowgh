import axios from 'axios';
import { generateTransactionId } from 'utils';

const paymentApiUrl = 'https://api.paystack.co/v1.1';

const username = process.env.PAYMENT_API_USERNAME;
const password = process.env.PAYMENT_API_PASSWORD;

// "MTN" for MTN
// "VDF" for Vodafone
// "ATL" for Airtel
// "TGO" for Tigo

type PaymentData = {
    sellerMomoNumber: string;
    network: string;

    // processing_code: string; // "000200"
    amount: number | string;
    "r-switch": string; // "MTN" for MTN , "VDF" for Vodafone, "ATL" for Airtel, "TGO" for Tigo
    desc: string;
    pass_code: string;
}

// headers
const headers = {
    'api-key': process.env.PAYMENT_API_KEY,
    'Content-Type': 'application/json',
    "Authorization": 'Basic '+ btoa(username + ':' + password)
}

// transfer funds
export async function transferPayment(data: PaymentData) {
    const transactionId = generateTransactionId();
    try {

        const payload = {
            subscriber_number: data.sellerMomoNumber,
            account_issuer: data.network,
            merchant_id: process.env.PAYMENT_MERCHANT_ID,
            transaction_id: transactionId,
            processing_code: "000200",
            amount: data.amount,
            "r-switch": "MTN", 
            desc: data.desc,
            pass_code: ""
        }

        let response = await axios.post(`${paymentApiUrl}/transaction/process`, payload, { headers });
        return response.data;
    } catch (error) {
        throw error;
    }
}
