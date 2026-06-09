# Performance & Optimization

SpeakMirror processes rich media, audio, and high-frequency face mesh data directly in the browser. The following optimization techniques are used to ensure stable rendering at 60fps even on lower-end mobile devices.

---

## 1. Web Worker Offloading (MediaPipe)

Running AI inference (MediaPipe FaceMesh) on the main JavaScript execution thread blocks the UI event loop, causing recording stutter and frame dropping.

### Our Solution:
- A dedicated **Web Worker** handles the FaceMesh model loading and processing.
- The main thread grabs video frame buffers and transfers them directly to the Web Worker via `worker.postMessage`.
- Landmark coordinates are sent back via messages, keeping the main thread free for canvas draws and recording controls.

### Buffer Transfer Optimization:
Instead of copying full image matrices between the main thread and the worker, we use **Transferable Objects** to move the backing memory buffer in `O(1)` time without copy overhead.

---

## 2. Dynamic Frame Rendering (Canvas Watermarking)

Instead of recording the raw camera stream directly:
1. Webcam frames are rendered onto an offscreen canvas at 30fps.
2. The watermark, timers, and active guides are drawn onto the canvas.
3. A MediaStream is captured directly from the canvas via `canvas.captureStream(30)`.
4. The canvas stream is combined with the microphone audio track and fed into the `MediaRecorder`.

This enables burning watermarks and UI overlays directly into the exported video file.

---

## 3. React Performance Optimization

We limit React re-renders during recording:
- **`useCallback`** memoizes stream event handlers and canvas draw loops.
- **`useMemo`** caches parsed AI transcripts, analytics charts, and emotion metrics.
- Sub-components are split by concerns: changing speech stats doesn't cause the entire practice interface or video player to re-render.
