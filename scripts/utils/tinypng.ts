import tinify from 'tinify';

tinify.key = process.env.TINY_PNG_APIKEY || '';

let isFreeAvailable = true;

const tinyPNGFree = async (data: ArrayBuffer) => {
  const tinyRes = await fetch('https://tinypng.com/backend/opt/shrink', {
    method: 'POST',
    body: data,
    headers: { 'Content-Type': 'image/png' },
  });
  const resultUrl = tinyRes.headers.get('location');
  if (!resultUrl) {
    throw new Error(`Tiny png failed ${tinyRes.status} ${await tinyRes.text()}`);
  }
  return await fetch(resultUrl).then(r => r.arrayBuffer());
};

export const tinyPNG = async (data: ArrayBuffer) => {
  if (isFreeAvailable) {
    try {
      return await tinyPNGFree(data);
    } catch {
      console.log('Tinypng free is out of quota');
      isFreeAvailable = false;
    }
  }
  return await tinify.fromBuffer(Buffer.from(data)).toBuffer();
};
