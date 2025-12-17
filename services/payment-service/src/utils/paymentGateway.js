const { v4: uuidv4 } = require('uuid');

/**
 * Mock payment gateway integration
 * Replace with real Stripe/PayPal integration in production
 */
class PaymentGateway {
  /**
   * Process payment
   */
  static async charge(amount, currency, customerId) {
    console.log(`Processing payment: $${amount} ${currency} for customer ${customerId}`);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock 90% success rate
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        transactionId: `txn_${uuidv4()}`,
        amount,
        currency
      };
    } else {
      return {
        success: false,
        transactionId: null,
        error: 'Insufficient funds',
        errorCode: 'INSUFFICIENT_FUNDS'
      };
    }
  }

/**
   * Process refund
   */
  static async refund(transactionId, amount, currency) {
    console.log(`Processing refund: $${amount} ${currency} for transaction ${transactionId}`);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
      return {
        success: true,
        refundTransactionId: `rfnd_${uuidv4()}`,
        originalTransactionId: transactionId,
        amount,
        currency
      };
    } else {
      return {
        success: false,
        refundTransactionId: null,
        error: 'Refund processing failed',
        errorCode: 'REFUND_FAILED'
      };
    }
  }
}

module.exports = PaymentGateway;