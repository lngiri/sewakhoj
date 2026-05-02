// This is a mock utility for eSewa and Khalti integrations.
// In a real production app, this would redirect to their hosted checkout pages.

export const simulatePayment = async (
  method: 'esewa' | 'khalti' | 'cash' | string,
  amount: number,
  bookingId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
  
  if (method === 'cash') {
    return { success: true, transactionId: `CASH-${Date.now()}` };
  }

  // Simulate network delay for API calls
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 90% success rate for simulation
  const isSuccess = Math.random() > 0.1;

  if (isSuccess) {
    return { 
      success: true, 
      transactionId: `${method.toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}` 
    };
  } else {
    return { 
      success: false, 
      error: `Payment failed via ${method}. Please try again.` 
    };
  }
};
