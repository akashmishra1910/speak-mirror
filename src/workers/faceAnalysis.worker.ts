// faceAnalysis.worker.ts
/* eslint-disable no-restricted-globals */

let landmarker: any = null;

async function loadModel() {
  try {
    const moduleUrl = `${self.location.origin}/mediapipe/vision_bundle.js`;
    // Using importShim or Function import to fetch ES module from local origin in worker
    const vision = await new Function(`return import("${moduleUrl}")`)();
    const { FilesetResolver, FaceLandmarker } = vision;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      `${self.location.origin}/mediapipe/wasm`
    );

    const modelAssetPath = `${self.location.origin}/mediapipe/face_landmarker.task`;

    try {
      // Attempt GPU-accelerated initialization
      landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
      });
      console.log("MediaPipe FaceLandmarker successfully initialized on GPU");
    } catch (gpuErr) {
      console.warn("MediaPipe GPU initialization failed, falling back to CPU:", gpuErr);
      // Fallback to CPU execution
      landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
      });
      console.log("MediaPipe FaceLandmarker successfully initialized on CPU");
    }

    self.postMessage({ type: "ready" });
  } catch (err) {
    console.error("Failed to load MediaPipe model in worker:", err);
    self.postMessage({ type: "error", error: String(err) });
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, imageData, imageBitmap, timestampMs } = e.data;

  if (type === "init") {
    await loadModel();
    return;
  }

  if (type === "detect") {
    if (!landmarker) {
      self.postMessage({ type: "error", error: "Model not initialized" });
      return;
    }

    const source = imageBitmap || imageData;
    if (!source) {
      self.postMessage({ type: "error", error: "No image source provided" });
      return;
    }

    try {
      // Run face mesh detection on the transferred ImageBitmap or ImageData with temporal video mode
      const results = landmarker.detectForVideo(source, timestampMs || performance.now());
      
      // Release GPU/graphic resources immediately in the worker thread
      if (imageBitmap && typeof imageBitmap.close === "function") {
        imageBitmap.close();
      }
      
      self.postMessage({ type: "results", results });
    } catch (err) {
      console.error("FaceLandmarker detection error in worker:", err);
      if (imageBitmap && typeof imageBitmap.close === "function") {
        imageBitmap.close();
      }
      self.postMessage({ type: "error", error: String(err) });
    }
  }
};

export {};
