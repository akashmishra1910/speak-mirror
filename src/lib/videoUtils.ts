import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

async function loadFFmpeg(ffmpeg: FFmpeg) {
  const cdns = [
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm',
    'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  ];

  for (const baseURL of cdns) {
    try {
      console.log(`Attempting to load FFmpeg core from ${baseURL}...`);
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      console.log(`Successfully loaded FFmpeg core from ${baseURL}`);
      return;
    } catch (err) {
      console.warn(`Failed to load FFmpeg from ${baseURL}:`, err);
    }
  }

  throw new Error("Failed to load FFmpeg from all available CDNs. Please check your network connection.");
}

export async function compressForStorage(
  blob: Blob, 
  onProgress?: (progress: number) => void
): Promise<Blob> {
  try {
    const ffmpeg = new FFmpeg();
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }

    await loadFFmpeg(ffmpeg);

    const inputName = 'input.webm';
    const outputName = 'output.webm';

    await ffmpeg.writeFile(inputName, await fetchFile(blob));
    await ffmpeg.exec([
      '-i', inputName,
      '-vcodec', 'libvpx-vp9',
      '-b:v', '400k',        // 400 Kbps video — good enough for review
      '-vf', 'scale=640:-1', // downscale to 640px width
      '-r', '24',            // 24fps
      '-acodec', 'libopus',
      '-b:a', '64k',         // 64 Kbps audio
      outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    return new Blob([data as any], { type: 'video/webm' });
  } catch (error) {
    console.warn("FFmpeg compression failed or is unsupported. Falling back to high quality blob.", error);
    return blob;
  }
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function convertToMp4(
  webmBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  try {
    const ffmpeg = new FFmpeg();
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }

    await loadFFmpeg(ffmpeg);

    const inputName = 'input.webm';
    const outputName = 'output.mp4';

    await ffmpeg.writeFile(inputName, await fetchFile(webmBlob));
    
    // Transcode WebM (VP9/Opus) to MP4 (H.264/AAC) using ultrafast preset for browser speed
    await ffmpeg.exec([
      '-i', inputName,
      '-vcodec', 'libx264',
      '-preset', 'ultrafast',
      '-acodec', 'aac',
      outputName
    ]);

    const data = await ffmpeg.readFile(outputName);
    return new Blob([data as any], { type: 'video/mp4' });
  } catch (error) {
    console.error("FFmpeg MP4 conversion failed:", error);
    throw error;
  }
}
