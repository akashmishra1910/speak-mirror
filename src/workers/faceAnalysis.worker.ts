// faceAnalysis.worker.ts
/* eslint-disable no-restricted-globals */

let landmarker: any = null;

async function loadModel() {
  try {
    const moduleUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs";
    // Using importShim or Function import to fetch ES module from CDN in worker
    const vision = await new Function(`return import("${moduleUrl}")`)();
    const { FilesetResolver, FaceLandmarker } = vision;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
    );

    landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });

    self.postMessage({ type: "ready" });
  } catch (err) {
    console.error("Failed to load MediaPipe model in worker:", err);
    self.postMessage({ type: "error", error: String(err) });
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, imageData } = e.data;

  if (type === "init") {
    await loadModel();
    return;
  }

  if (type === "detect") {
    if (!landmarker) {
      self.postMessage({ type: "error", error: "Model not initialized" });
      return;
    }

    try {
      // Run face mesh detection on the transferred ImageData
      const results = landmarker.detect(imageData);
      self.postMessage({ type: "results", results });
    } catch (err) {
      console.error("FaceLandmarker detection error in worker:", err);
      self.postMessage({ type: "error", error: String(err) });
    }
  }
};

export {};
