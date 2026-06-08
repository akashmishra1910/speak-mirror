"use client";

import { useEffect, useRef, useState } from "react";

export interface FaceAnalysisResult {
  eyeContactAvg: number;
  expressionScoreAvg: number;
}

export function useFaceAnalysis(videoRef: React.RefObject<HTMLVideoElement | null>, enabled: boolean = true) {
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [liveEyeContact, setLiveEyeContact] = useState<number>(100);
  const [liveExpression, setLiveExpression] = useState<number>(50);
  const [liveIsBlinking, setLiveIsBlinking] = useState(false);
  const [liveGazeWarning, setLiveGazeWarning] = useState(false);
  const [earBaseline, setEarBaseline] = useState<number>(0.22);
  const [blinkThreshold, setBlinkThreshold] = useState<number>(0.15);

  const faceLandmarkerRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  
  // Tracking state for session averages
  const isTrackingRef = useRef(false);
  const eyeContactScoresRef = useRef<number[]>([]);
  const expressionScoresRef = useRef<number[]>([]);
  
  // Throttling state updates to 150ms
  const lastStateUpdateRef = useRef<number>(0);

  // Debouncing & iris position averaging refs
  const nonCenterDurationRef = useRef<number>(0);
  const gazeHistoryRef = useRef<{ x: number; y: number }[]>([]);
  
  // Calibration refs
  const isCalibratingRef = useRef(false);
  const calibrationFramesRef = useRef<number[]>([]);
  const calibrationStartTimeRef = useRef<number>(0);

  // Load EAR baseline on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ear_baseline");
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 0) {
          setEarBaseline(val);
          setBlinkThreshold(Math.max(0.10, val - 0.05));
        }
      }
    }
  }, []);

  // Initialize and load the MediaPipe model
  useEffect(() => {
    if (!enabled) return;

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
  }, [enabled]);

  // Frame processing loop
  useEffect(() => {
    if (!enabled || !isModelReady || !videoRef.current) return;

    const video = videoRef.current;
    let isLoopActive = false;

    const loop = () => {
      if (!isPlayingRef.current) return;

      if (video && faceLandmarkerRef.current && video.readyState >= 2) {
        try {
          const now = performance.now();
          // detectForVideo expects HTMLVideoElement and a timestamp (ms)
          const results = faceLandmarkerRef.current.detectForVideo(video, now);

          if (results.faceBlendshapes && results.faceBlendshapes.length > 0 && results.faceLandmarks && results.faceLandmarks.length > 0) {
            const blendshapes = results.faceBlendshapes[0].categories;
            const landmarks = results.faceLandmarks[0];

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

            // Combine into expression score (scale out of 100)
            const rawEngagement = (smileAvg * 0.4) + (browUpAvg * 0.3) + (eyeWideAvg * 0.3);
            const expressionScoreVal = Math.min(100, Math.round(40 + (rawEngagement * 100)));

            // 2. EAR (Eye Aspect Ratio) Calculation for Blink Detection
            const getDistance = (p1: any, p2: any) => {
              if (!p1 || !p2) return 0;
              const dx = p1.x - p2.x;
              const dy = p1.y - p2.y;
              const dz = p1.z - p2.z;
              return Math.sqrt(dx * dx + dy * dy + dz * dz);
            };

            const leftEyeHeight = getDistance(landmarks[159], landmarks[145]);
            const leftEyeWidth = getDistance(landmarks[133], landmarks[33]);
            const leftEAR = leftEyeWidth > 0 ? leftEyeHeight / leftEyeWidth : 0.22;

            const rightEyeHeight = getDistance(landmarks[386], landmarks[374]);
            const rightEyeWidth = getDistance(landmarks[362], landmarks[263]);
            const rightEAR = rightEyeWidth > 0 ? rightEyeHeight / rightEyeWidth : 0.22;

            const ear = (leftEAR + rightEAR) / 2;

            // 3. First-use EAR Calibration
            if (isCalibratingRef.current) {
              if (now - calibrationStartTimeRef.current < 3000) {
                calibrationFramesRef.current.push(ear);
              } else {
                const avgBaseline = calibrationFramesRef.current.length > 0
                  ? calibrationFramesRef.current.reduce((a, b) => a + b, 0) / calibrationFramesRef.current.length
                  : 0.22;
                if (typeof window !== "undefined") {
                  localStorage.setItem("ear_baseline", avgBaseline.toString());
                }
                setEarBaseline(avgBaseline);
                setBlinkThreshold(Math.max(0.10, avgBaseline - 0.05));
                isCalibratingRef.current = false;
              }
            }

            const isBlink = ear < blinkThreshold;

            if (isBlink) {
              // Reset look-away timer on blink
              nonCenterDurationRef.current = 0;

              // Skip this frame for eye contact score (don't push to eyeContactScoresRef)
              if (isTrackingRef.current) {
                expressionScoresRef.current.push(expressionScoreVal);
              }

              if (now - lastStateUpdateRef.current > 150) {
                setLiveIsBlinking(true);
                setLiveGazeWarning(false);
                setLiveExpression(Math.round(expressionScoreVal));
                lastStateUpdateRef.current = now;
              }
            } else {
              // Evaluate gaze direction normally
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

              // Offset the vertical gaze slightly downwards (-0.08) to calibrate for looking at the screen relative to a top-mounted camera
              const gazeYAdjusted = gazeY - (-0.08);

              // Average iris position over 3 consecutive frames to reduce glasses/glare noise
              gazeHistoryRef.current.push({ x: gazeX, y: gazeYAdjusted });
              if (gazeHistoryRef.current.length > 3) {
                gazeHistoryRef.current.shift();
              }

              const avgGazeX = gazeHistoryRef.current.reduce((sum, g) => sum + g.x, 0) / gazeHistoryRef.current.length;
              const avgGazeY = gazeHistoryRef.current.reduce((sum, g) => sum + g.y, 0) / gazeHistoryRef.current.length;

              // Widen CENTER Gaze Zone thresholds (X threshold: 0.20, Y threshold: 0.25)
              const isCenter = Math.abs(avgGazeX) <= 0.20 && Math.abs(avgGazeY) <= 0.25;
              const eyeContactVal = isCenter ? 100 : 0;

              // Gaze Warning Debouncing: 500ms+ continuously non-CENTER
              if (isCenter) {
                nonCenterDurationRef.current = 0;
              } else {
                if (nonCenterDurationRef.current === 0) {
                  nonCenterDurationRef.current = now;
                }
              }

              const isDebouncedGazeWarning = !isCenter && nonCenterDurationRef.current > 0 && (now - nonCenterDurationRef.current >= 500);

              if (isTrackingRef.current) {
                eyeContactScoresRef.current.push(eyeContactVal);
                expressionScoresRef.current.push(expressionScoreVal);
              }

              if (now - lastStateUpdateRef.current > 150) {
                setLiveIsBlinking(false);
                setLiveEyeContact(Math.round(eyeContactVal));
                setLiveExpression(Math.round(expressionScoreVal));
                setLiveGazeWarning(isDebouncedGazeWarning);
                lastStateUpdateRef.current = now;
              }
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
  }, [enabled, isModelReady, videoRef]);

  // Start tracking scores for averages
  const startAnalysis = () => {
    if (!enabled) return;
    eyeContactScoresRef.current = [];
    expressionScoresRef.current = [];
    isTrackingRef.current = true;

    // Check if we need calibration (first use)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ear_baseline");
      if (!saved) {
        isCalibratingRef.current = true;
        calibrationFramesRef.current = [];
        calibrationStartTimeRef.current = performance.now();
      }
    }
  };

  // Stop tracking scores and calculate session averages
  const stopAnalysis = (): FaceAnalysisResult => {
    if (!enabled) {
      return { eyeContactAvg: 100, expressionScoreAvg: 50 };
    }
    
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
    liveIsBlinking,
    liveGazeWarning,
    startAnalysis,
    stopAnalysis,
  };
}
