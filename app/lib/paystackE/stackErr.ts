import { AxiosError } from 'axios';

interface PaystackErrorResponse {
  status: false; // specifically false on errors
  message: string;
  [key: string]: unknown; // allow for extra Paystack fields
}

export function parsePaystackError(error: unknown): {
  reason: string;
  statusCode: number;
  raw?: PaystackErrorResponse;
} {
  if (isAxiosErrorWithResponse<PaystackErrorResponse>(error)) {
    const reason =
      error.response?.data?.message || error.message || 'Unknown error';
    const statusCode = error.response?.status || 500;
    return {
      reason,
      statusCode,
      raw: error.response?.data,
    };
  }

  if (error instanceof Error) {
    return {
      reason: error.message,
      statusCode: 500,
    };
  }

  return {
    reason: 'Unexpected error format',
    statusCode: 500,
  };
}

function isAxiosErrorWithResponse<T>(error: unknown): error is AxiosError<T> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}
