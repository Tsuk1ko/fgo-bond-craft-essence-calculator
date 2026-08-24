import webp from 'webp-converter';

export const convertToWebp = async (inputPath: string, outputPath: string, quality = 95) => {
  const stderr = await webp.cwebp(inputPath, outputPath, `-q ${quality}`);
  if (stderr) throw new Error(stderr);
};
