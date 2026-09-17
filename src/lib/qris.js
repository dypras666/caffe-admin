// QRIS CRC16-CCITT calculation
function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) > 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function parseTLVs(str) {
  const tlvs = [];
  let i = 0;
  while (i < str.length) {
    if (i + 4 > str.length) break;
    const tag = str.substring(i, i + 2);
    const len = parseInt(str.substring(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > str.length) break;
    const value = str.substring(i + 4, i + 4 + len);
    tlvs.push({ tag, len, value });
    i += 4 + len;
  }
  return tlvs;
}

export function generateDynamicQris(baseQris, amount) {
  if (!baseQris) return '';
  
  // 1. Remove existing CRC (tag 63) which is at the end of the string.
  // Tag 63 length is 04, so the total length of the tag is 4 + 4 = 8.
  let qrisWithoutCrc = baseQris.substring(0, baseQris.length - 8);

  // 2. Parse TLVs
  let tlvs = parseTLVs(qrisWithoutCrc);
  
  // Change Tag 01 (Static) to 12 (Dynamic)
  const tag01 = tlvs.find(t => t.tag === '01');
  if (tag01 && tag01.value === '11') {
    tag01.value = '12';
  }

  // Remove existing Tag 54
  tlvs = tlvs.filter(t => t.tag !== '54');

  // Add Tag 54 (Amount)
  const amtStr = String(amount);
  const amtLenStr = amtStr.length.toString().padStart(2, '0');
  tlvs.push({ tag: '54', len: amtStr.length, value: amtStr });

  // Re-assemble string
  // Sort tags by ID to be strictly compliant, though many parsers don't care.
  // Actually, sorting might break tag 26..51 ordering if not careful, so just append tag 54.
  // Wait, let's just append it.
  
  let newQrisStr = '';
  for (const t of tlvs) {
    const lenStr = String(t.value.length).padStart(2, '0');
    newQrisStr += `${t.tag}${lenStr}${t.value}`;
  }

  // Calculate new CRC
  const payloadForCrc = newQrisStr + '6304';
  const newCrc = crc16(payloadForCrc);

  return payloadForCrc + newCrc;
}
