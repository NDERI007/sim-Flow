const GSM_7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæÉ !"#¤%&\'()*+,-./0123456789:;<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_7_EXTENDED = '^{}\\[~]|€';

function isGsm7Char(char: string): boolean {
  return GSM_7_BASIC.includes(char) || GSM_7_EXTENDED.includes(char);
}

export function getGsm7Length(message: string): number {
  let length = 0;
  for (const char of message) {
    if (!isGsm7Char(char)) {
      return -1;
    }
    length += GSM_7_EXTENDED.includes(char) ? 2 : 1;
  }
  return length;
}

export function calculateSmsSegments(message: string): number {
  if (!message) return 1;

  const gsm7Length = getGsm7Length(message);
  let segmentSize: number;
  let maxSingleSegment: number;

  if (gsm7Length >= 0) {
    segmentSize = 153;
    maxSingleSegment = 160;
    return gsm7Length <= maxSingleSegment
      ? 1
      : Math.ceil(gsm7Length / segmentSize);
  } else {
    const ucs2Length = message.length;
    segmentSize = 67;
    maxSingleSegment = 70;
    return ucs2Length <= maxSingleSegment
      ? 1
      : Math.ceil(ucs2Length / segmentSize);
  }
}
//UCS-2 (aka Unicode SMS) is used when your message contains non-GSM characters, like:

//Emojis 😃

//Chinese/Arabic/Korean/Hindi characters

//Accented letters not supported in GSM-7 (ą, ë, ç, etc.)

//Each character = 2 bytes

//unicode is more expressive, but takes more space.
// If even one character isn’t supported in GSM-7, the entire message is sent as UCS-2, and your segment limit drops.
//GSM-7 allows up to 160 characters per segment

//UCS-2 allows only up to 70 characters per segment
//That’s incorrect — the first and all other segments in UCS-2 multipart messages are limited to 67, not 70 or 79.

//There is no bigger first segment — the moment a message needs to be split, all segments use the smaller limit.
