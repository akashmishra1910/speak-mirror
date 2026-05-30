"use client";

import { useEffect, useRef, useState } from "react";

export interface FaceAnalysisResult {
  eyeContactAvg: number;
  expressionScoreAvg: number;
}

export function useFaceAnalysis(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [liveEyeContact, setLiveEyeContact] = useState<number>(100);
  const [liveExpression, setLiveExpression] = useState<number>(50);

  const faceLandmarkerRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  
  // Tracking state for session averages
  const isTrackingRef = useRef(false);
  const eyeContactScoresRef = useRef<number[]>([]);
  const expressionScoresRef = useRef<number[]>([]);
  
  // Throttling state updates to 150ms
  const lastStateUpdateRef = useRef<number>(0);

  // Initialize and load the MediaPipe model
  useEffect(() => {
    const loadModel = async () => {
      if (typeof window === "undefined") return;
      setIsLoading(true);
      try {
        // Dynamically import Tasks Vision ESM from CDN using dynamic import + eval
        // to bypass build-time static bundling issues in Next.js
        const moduleUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs";
        const vision = await new Function(`return import("${moduleUrl}")`)();
        
        const { FilesetResolver, FaceLandmarker } = vision;

        // Fetch local WebAssembly resource paths
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );

        // Provision the face landmarker utilizing GPU acceleration if available
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        });

        faceLandmarkerRef.current = landmarker;
        setIsModelReady(true);
      } catch (err) {
        console.error("Failed to dynamically load MediaPipe FaceLandmarker:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();

    return () => {
      // Free up memory resources on teardown
      if (faceLandmarkerRef.current) {
        try {
          faceLandmarkerRef.current.close();
        } catch (err) {
          console.warn("Failed to close FaceLandmarker:", err);
        }
      }
    };
  }, []);

  // Frame processing loop
  useEffect(() => {
    if (!isModelReady || !videoRef.current) return;

    const video = videoRef.current;
    let isLoopActive = false;

    const loop = () => {
      if (!isPlayingRef.current) return;

      if (video && faceLandmarkerRef.current && video.readyState >= 2) {
        try {
          const now = performance.now();
          // detectForVideo expects HTMLVideoElement and a timestamp (ms)
          const results = faceLandmarkerRef.current.detectForVideo(video, now);

          if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            const blendshapes = results.faceBlendshapes[0].categories;

            // 1. Expression Score: Based on positive facial activation (smile, brow raised, eye widening)
            const mouthSmileLeft = blendshapes.find((b: any) => b.categoryName === "mouthSmileLeft")?.score || 0;
            const mouthSmileRight = blendshapes.find((b: any) => b.categoryName === "mouthSmileRight")?.score || 0;
            const smileAvg = (mouthSmileLeft + mouthSmileRight) / 2;

            const browInnerUp = blendshapes.find((b: any) => b.categoryName === "browInnerUp")?.score || 0;
            const browOuterUpLeft = blendshapes.find((b: any) => b.categoryName === "browOuterUpLeft")?.score || 0;
            const browOuterUpRight = blendshapes.find((b: any) => b.categoryName === "browOuterUpRight")?.score || 0;
            const browUpAvg = (browInnerUp + browOuterUpLeft + browOuterUpRight) / 3;

            const eyeWideLeft = blendshapes.find((b: any) => b.categoryName === "eyeWideLeft")?.score || 0;
            const eyeWideRight = blendshapes.find((b: any) => b.categoryName === "eyeWideRight")?.score || 0;
            const eyeWideAvg = (eyeWideLeft + eyeWideRight) / 2;

            // Combine into expression score (scale out of 100).
            // A base score of 40 represents a relaxed, natural face.
            // Animated expressions (smiling, raising brows, widening eyes) scale it up.
            const rawEngagement = (smileAvg * 0.4) + (browUpAvg * 0.3) + (eyeWideAvg * 0.3);
            const expressionScoreVal = Math.min(100, Math.round(40 + (rawEngagement * 100)));

            // 2. Eye Contact Score: Horizontal/Vertical deviation math with dead-zone linear drop
            const eyeLookOutLeft = blendshapes.find((b: any) => b.categoryName === "eyeLookOutLeft")?.score || 0;
            const eyeLookInLeft = blendshapes.find((b: any) => b.categoryName === "eyeLookInLeft")?.score || 0;
            const eyeLookOutRight = blendshapes.find((b: any) => b.categoryName === "eyeLookOutRight")?.score || 0;
            const eyeLookInRight = blendshapes.find((b: any) => b.categoryName === "eyeLookInRight")?.score || 0;

            const eyeLookUpLeft = blendshapes.find((b: any) => b.categoryName === "eyeLookUpLeft")?.score || 0;
            const eyeLookDownLeft = blendshapes.find((b: any) => b.categoryName === "eyeLookDownLeft")?.score || 0;
            const eyeLookUpRight = blendshapes.find((b: any) => b.categoryName === "eyeLookUpRight")?.score || 0;
            const eyeLookDownRight = blendshapes.find((b: any) => b.categoryName === "eyeLookDownRight")?.score || 0;

            // Gaze calculation: inward looks vs outward looks
            const gazeX = ((eyeLookInLeft - eyeLookOutLeft) + (eyeLookOutRight - eyeLookInRight)) / 2;
            const gazeY = ((eyeLookUpLeft - eyeLookDownLeft) + (eyeLookUpRight - eyeLookDownRight)) / 2;

            const deviation = Math.sqrt(gazeX * gazeX + gazeY * gazeY);

            // Natural dead-zone limits (0.08 is straight looking, 0.28 is extreme tilt/looking away)
            let eyeContactVal = 100;
            if (deviation <= 0.08) {
              eyeContactVal = 100;
            } else if (deviation >= 0.28) {
              eyeContactVal = 0;
            } else {
              eyeContactVal = 100 * (1 - (deviation - 0.08) / (0.28 - 0.08));
            }

            // Aggregate metrics if tracking is active
            if (isTrackingRef.current) {
              eyeContactScoresRef.current.push(eyeContactVal);
              expressionScoresRef.current.push(expressionScoreVal);
            }

            // Throttling state updates to every 150ms to maintain optimal DOM FPS
            if (now - lastStateUpdateRef.current > 150) {
              setLiveEyeContact(Math.round(eyeContactVal));
              setLiveExpression(Math.round(expressionScoreVal));
              lastStateUpdateRef.current = now;
            }
          }
        } catch (err) {
          console.error("Error running FaceLandmarker detectForVideo:", err);
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (isLoopActive) return;
      isLoopActive = true;
      isPlayingRef.current = true;
      loop();
    };

    const stopLoop = () => {
      isLoopActive = false;
      isPlayingRef.current = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };

    video.addEventListener("play", startLoop);
    video.addEventListener("pause", stopLoop);
    video.addEventListener("ended", stopLoop);

    // Bootstrap loop if video is already running
    if (!video.paused && video.readyState >= 2) {
      startLoop();
    }

    return () => {
      video.removeEventListener("play", startLoop);
      video.removeEventListener("pause", stopLoop);
      video.removeEventListener("ended", stopLoop);
      stopLoop();
    };
  }, [isModelReady, videoRef]);

  // Start tracking scores for averages
  const startAnalysis = () => {
    eyeContactScoresRef.current = [];
    expressionScoresRef.current = [];
    isTrackingRef.current = true;
  };

  // Stop tracking scores and calculate session averages
  const stopAnalysis = (): FaceAnalysisResult => {
    isTrackingRef.current = false;
    
    const eyeContactAvg = eyeContactScoresRef.current.length > 0
      ? Math.round(eyeContactScoresRef.current.reduce((a, b) => a + b, 0) / eyeContactScoresRef.current.length)
      : 100;
      
    const expressionScoreAvg = expressionScoresRef.current.length > 0
      ? Math.round(expressionScoresRef.current.reduce((a, b) => a + b, 0) / expressionScoresRef.current.length)
      : 50;

    return {
      eyeContactAvg,
      expressionScoreAvg,
    };
  };

  return {
    isLoading,
    isModelReady,
    liveEyeContact,
    liveExpression,
    startAnalysis,
    stopAnalysis,
  };
}
