import crypto from 'crypto';

export function generateEsewaSignature(secretKey: string, message: string) {
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(message);
  const hashInBase64 = hmac.digest('base64');
  return hashInBase64;
}

export async function generateEsewaPayload(supabaseAdmin: any, amount: number, transactionId: string) {
  // Fetch dynamic eSewa keys from the Connect Hub (Database)
  const { data: esewaConfig } = await supabaseAdmin
    .from('api_integrations')
    .select('merchant_id, api_secret, endpoint_url')
    .eq('service_name', 'esewa')
    .single();

  const merchantCode = esewaConfig?.merchant_id || process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
  const secretKey = esewaConfig?.api_secret || process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
  const endpoint = esewaConfig?.endpoint_url || process.env.ESEWA_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
  
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
    payload: {
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
    },
    endpoint
  };
}
