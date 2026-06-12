export const processCashPayment = async (
  bookingId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
  return { success: true, transactionId: `CASH-${Date.now()}-${bookingId.slice(0, 8)}` };
};
