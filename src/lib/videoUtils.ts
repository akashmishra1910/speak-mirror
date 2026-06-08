export async function compressForStorage(
  blob: Blob, 
  onProgress?: (progress: number) => void
): Promise<Blob> {
  try {
    // Lazily load FFmpeg and utility modules only when called
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();
    
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

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
