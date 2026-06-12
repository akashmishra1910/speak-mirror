"use client";

import { useEffect, useRef, useState } from "react";

export interface FaceAnalysisResult {
  eyeContactAvg: number;
  expressionScoreAvg: number;
}

export function useFaceAnalysis(
  videoRef: React.RefObject<HTMLVideoElement | null>, 
  enabled: boolean = true,
  onTelemetryUpdate?: (metrics: { eyeContact: number; expression: number; isBlinking: boolean; gazeWarning: boolean }) => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [earBaseline, setEarBaseline] = useState<number>(0.22);
  const [blinkThreshold, setBlinkThreshold] = useState<number>(0.15);

  const lastEyeContactRef = useRef<number>(100);

  const workerRef = useRef<Worker | null>(null);
  const isPlayingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const lastProcessedTimeRef = useRef(0);
  const triggerNextFrameRef = useRef<(() => void) | null>(null);
  
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

  // Initialize and load the Web Worker
  useEffect(() => {
    if (!enabled) {
      setIsModelReady(false);
      setIsLoading(false);
      return;
    }

    if (typeof window === "undefined") return;
    setIsLoading(true);
    setIsModelReady(false);

    // Spawn Web Worker using module type to allow next.js compilation
    const worker = new Worker(
      new URL("../workers/faceAnalysis.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { type, results, error } = e.data;

      if (type === "ready") {
        setIsModelReady(true);
        setIsLoading(false);
      } else if (type === "error") {
        console.error("Worker error:", error);
        setIsLoading(false);
        isProcessingRef.current = false;
        triggerNextFrameRef.current?.();
      } else if (type === "results") {
        isProcessingRef.current = false;
        triggerNextFrameRef.current?.();

        if (!results) return;
        const now = performance.now();
        
        if (
          results.faceBlendshapes &&
          results.faceBlendshapes.length > 0 &&
          results.faceLandmarks &&
          results.faceLandmarks.length > 0
        ) {
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
              if (onTelemetryUpdate) {
                onTelemetryUpdate({
                  eyeContact: lastEyeContactRef.current,
                  expression: Math.round(expressionScoreVal),
                  isBlinking: true,
                  gazeWarning: false
                });
              }
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

            const roundedEyeContact = Math.round(eyeContactVal);
            lastEyeContactRef.current = roundedEyeContact;
            
            if (now - lastStateUpdateRef.current > 150) {
              if (onTelemetryUpdate) {
                onTelemetryUpdate({
                  eyeContact: roundedEyeContact,
                  expression: Math.round(expressionScoreVal),
                  isBlinking: false,
                  gazeWarning: isDebouncedGazeWarning
                });
              }
              lastStateUpdateRef.current = now;
            }
          }
        }
      }
    };

    worker.postMessage({ type: "init" });

    return () => {
      worker.terminate();
      workerRef.current = null;
      setIsModelReady(false);
      setIsLoading(false);
    };
  }, [enabled]);

  // Frame processing loop
  useEffect(() => {
    if (!enabled || !isModelReady || !videoRef.current) return;

    const video = videoRef.current;
    let rVFCId: number | null = null;
    let rAFId: number | null = null;

    const processFrame = async () => {
      if (!isPlayingRef.current || !workerRef.current || isProcessingRef.current) return;

      if (video && video.readyState >= 2) {
        const now = performance.now();
        // Enforce the 150ms throttle so we don't spam the worker/device
        if (now - lastProcessedTimeRef.current < 150) {
          queueNextFrame();
          return;
        }

        try {
          isProcessingRef.current = true;
          lastProcessedTimeRef.current = now;

          // Zero-copy GPU-accelerated ImageBitmap extraction with resizing
          const imageBitmap = await createImageBitmap(video, {
            resizeWidth: 640,
            resizeHeight: 360,
            resizeQuality: "low"
          });
          
          // Transfer ownership of ImageBitmap to the Web Worker and pass timestampMs
          workerRef.current.postMessage(
            { type: "detect", imageBitmap, timestampMs: now },
            [imageBitmap]
          );
        } catch (err) {
          console.error("Error sending ImageBitmap to MediaPipe worker:", err);
          isProcessingRef.current = false;
          queueNextFrame();
        }
      } else {
        // Video not ready, try again on next frame
        queueNextFrame();
      }
    };

    const queueNextFrame = () => {
      if (!isPlayingRef.current) return;

      if ("requestVideoFrameCallback" in video) {
        rVFCId = (video as any).requestVideoFrameCallback(processFrame);
      } else {
        rAFId = requestAnimationFrame(processFrame);
      }
    };

    const startLoop = () => {
      if (isPlayingRef.current) return;
      isPlayingRef.current = true;
      isProcessingRef.current = false;
      processFrame();
    };

    const stopLoop = () => {
      isPlayingRef.current = false;
      isProcessingRef.current = false;
      if (rVFCId !== null && "cancelVideoFrameCallback" in video) {
        (video as any).cancelVideoFrameCallback(rVFCId);
        rVFCId = null;
      }
      if (rAFId !== null) {
        cancelAnimationFrame(rAFId);
        rAFId = null;
      }
    };

    // Assign the trigger function so the worker can signal that it's done
    triggerNextFrameRef.current = () => {
      if (isPlayingRef.current && !isProcessingRef.current) {
        queueNextFrame();
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
      triggerNextFrameRef.current = null;
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
    startAnalysis,
    stopAnalysis,
  };
}
