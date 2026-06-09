// Web Worker for speech transcript parsing and pacing calculations
const fillersDict = ["um", "uh", "like", "basically", "literally", "right", "so", "actually"];
const phrasesDict = ["you know"];

let wordHistory: { count: number; time: number }[] = [];

self.onmessage = (e: MessageEvent) => {
  const { text, startTime } = e.data;
  if (!text) return;

  const now = Date.now() - startTime;
  const cleanText = text.toLowerCase().trim();
  const words = cleanText.split(/\s+/).filter((w: string) => w.length > 0);

  const fillerLog: { word: string; timestamp: number }[] = [];

  // Count simple word fillers
  words.forEach((w: string) => {
    const cleaned = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    if (fillersDict.includes(cleaned)) {
      fillerLog.push({ word: cleaned, timestamp: now });
    }
  });

  // Count phrase fillers
  phrasesDict.forEach((phrase: string) => {
    let pos = cleanText.indexOf(phrase);
    while (pos !== -1) {
      fillerLog.push({ word: phrase, timestamp: now });
      pos = cleanText.indexOf(phrase, pos + phrase.length);
    }
  });

  // Sort filler log chronologically
  fillerLog.sort((a, b) => a.timestamp - b.timestamp);

  // Track word counts history for rolling WPM calculation
  wordHistory.push({ count: words.length, time: now });

  const tenSecondsAgo = now - 10000;
  // Keep history for the last 15 seconds
  wordHistory = wordHistory.filter((h: { count: number; time: number }) => h.time >= now - 15000);

  // Find historical count from 10 seconds ago
  const oldEntry = wordHistory.find((h: { count: number; time: number }) => h.time >= tenSecondsAgo);
  const wordsSpokenIn10s = oldEntry ? Math.max(0, words.length - oldEntry.count) : words.length;
  const rollingWpm = Math.round((wordsSpokenIn10s / 10) * 60);

  // Track pacing log duration
  const totalDurationMin = now / 60000;
  const avgWpm = totalDurationMin > 0.05 ? Math.round(words.length / totalDurationMin) : 130;

  self.postMessage({
    fillerCount: fillerLog.length,
    lastFiller: fillerLog[fillerLog.length - 1]?.word || null,
    fillerLog,
    rollingWpm,
    avgWpm,
    wordCount: words.length
  });
};

export {};
