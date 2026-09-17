const qris = '00020101021126650013ID.CO.BCA.WWW011893600014000315204481453033605802ID5908AZZURAVN6005METRO61053411162160712A012658823156304CA1B';

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
console.log(tags);
