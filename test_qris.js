const qris = '00020101021126650013ID.CO.BCA.WWW011893600014000315204481453033605802ID5908AZZURAVN6005METRO61053411162160712A012658823156304CA1B';
const amount = 10000;

const generateDynamicQris = (qris, amount) => {
  if (!qris) return '';
  let amtStr = amount.toString();
  if (amtStr.includes('.')) amtStr = amount.toFixed(0);
  
  let idx = 0;
  const tags = {};
  while (idx < qris.length) {
    const tag = qris.substring(idx, idx + 2);
    const len = parseInt(qris.substring(idx + 2, idx + 4), 10);
    if (isNaN(len)) break;
    const val = qris.substring(idx + 4, idx + 4 + len);
    tags[tag] = val;
    idx += 4 + len;
  }
  
  tags['01'] = '12';
  tags['54'] = amtStr;
  
  let newQris = '';
  for (let i = 0; i < 63; i++) {
    const t = i.toString().padStart(2, '0');
    if (tags[t]) {
      const v = tags[t];
      newQris += t + v.length.toString().padStart(2, '0') + v;
    }
  }
  
  newQris += '6304';
  
  let crc = 0xFFFF;
  for (let i = 0; i < newQris.length; i++) {
    crc ^= (newQris.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) > 0) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  newQris += crc.toString(16).toUpperCase().padStart(4, '0');
  return newQris;
};

console.log("Original QRIS:", qris);
console.log("Parsed Tags:", generateDynamicQris(qris, amount));
