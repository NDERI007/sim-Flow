import axios from 'axios';

async function sendSmsOnfon(to: string[], message: string, sender_id: string) {
  const ONFON_ENDPOINT = 'https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS';

  const payload = {
    SenderId: sender_id,
    ApiKey: process.env.ONFON_ACCESS_KEY,
    ClientId: process.env.ONFON_CLIENT_ID,
    MessageParameters: to.map((n) => ({ Number: n, Text: message })),
  };

  try {
    const res = await axios.post(ONFON_ENDPOINT, payload, {
      timeout: 10000,
      timeoutErrorMessage: 'TIMEOUT',
      headers: { 'Content-Type': 'application/json' },
    });

    const recipients = res.data?.recipients;
    if (!recipients || !Array.isArray(recipients)) {
      console.error('Malformed Onfon response:', res.data);
      throw new Error('Malformed Onfon response');
    }

    return recipients.map((r: any) => ({
      phone: r.Number,
      status: r.Code === '000' ? 'success' : 'failed',
      code: r.Code,
      message: r.Message || 'No message',
      type: classifyError(r.Code),
    }));
  } catch (err) {
    const parsed = parseError(err);
    return to.map((phone) => ({
      phone,
      status: 'failed',
      code: parsed.code,
      message: parsed.message,
      type: parsed.type,
    }));
  }
}

type ParsedError = {
  message: string;
  code: string;
  type: 'RETRIABLE' | 'NON_RETRIABLE' | 'UNKNOWN';
};

const classifyError = (code: string): ParsedError['type'] => {
  const nonRetriable = new Set([
    '007',
    '008',
    '009',
    '010',
    '011',
    '013',
    '015',
    '019',
    '020',
    '021',
    '023',
    '024',
    '028',
    '029',
    '030',
    '031',
    '039',
    '042',
    '801',
    '803',
    '804',
    '805',
    '807',
    '808',
    '809',
  ]);

  const retriable = new Set(['006', '033', '034']);

  if (retriable.has(code)) return 'RETRIABLE';
  if (nonRetriable.has(code)) return 'NON_RETRIABLE';
  return 'UNKNOWN';
};

const parseError = (err: unknown): ParsedError => {
  if (err instanceof Error && err.message === 'TIMEOUT') {
    return { message: 'Timeout', code: 'TIMEOUT', type: 'RETRIABLE' };
  }

  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.code ?? 'AXIOS_ERR';
    const message =
      err.response?.data?.message ?? err.message ?? 'Unknown Axios error';

    return {
      code,
      message,
      type: classifyError(code),
    };
  }

  if (typeof err === 'object' && err !== null) {
    const maybeErr = err as { code?: string; message?: string };
    const code = maybeErr.code ?? 'UNKNOWN';
    const message = maybeErr.message ?? 'Unknown structured error';
    return {
      code,
      message,
      type: classifyError(code),
    };
  }

  return {
    code: 'UNKNOWN',
    message: String(err),
    type: 'UNKNOWN',
  };
};

export { sendSmsOnfon };
