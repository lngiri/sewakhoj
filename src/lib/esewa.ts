import crypto from 'crypto';

export function generateEsewaSignature(secretKey: string, message: string) {
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(message);
  const hashInBase64 = hmac.digest('base64');
  return hashInBase64;
}

export function generateEsewaPayload(amount: number, transactionId: string) {
  const merchantCode = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
  const secretKey = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
  
  // Tax amounts (0 for simplicity in this marketplace model, commission handled internally)
  const taxAmount = 0;
  const totalAmount = amount + taxAmount;
  const productDeliveryCharge = 0;
  const productServiceCharge = 0;

  // The signed fields required by eSewa
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionId},product_code=${merchantCode}`;
  const signature = generateEsewaSignature(secretKey, message);

  return {
    amount: amount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    transaction_uuid: transactionId,
    product_code: merchantCode,
    product_service_charge: productServiceCharge,
    product_delivery_charge: productDeliveryCharge,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/esewa/verify`,
    failure_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=payment_failed`,
    signed_field_names: signedFieldNames,
    signature: signature,
  };
}
