// src/config/payment.js
import { PAYU_ACTION_URL, PAYU_MERCHANT_KEY, API_BASE_URL } from "@env";

export const paymentConfig = {
  payu: {
    actionUrl: PAYU_ACTION_URL || "https://secure.payu.in/_payment",
    merchantKey: PAYU_MERCHANT_KEY,
    successUrl: `${API_BASE_URL}/payu/success-forward`,
    failureUrl: `${API_BASE_URL}/payu/failure-forward`,
  },
};
