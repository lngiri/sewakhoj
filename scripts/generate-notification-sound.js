// Generate a notification beep WAV file
const fs = require("fs");
const path = require("path");

const sampleRate = 22050;
const duration = 0.5;
const numSamples = Math.floor(sampleRate * duration);

// Generate PCM data: rising two-tone beep
// E5 (659Hz) for first 150ms, then A5 (880Hz) for remaining
const samples = new Int16Array(numSamples);
const switchSample = Math.floor(sampleRate * 0.15); // 150ms switch point

for (let i = 0; i < numSamples; i++) {
  let freq, amp;
  if (i < switchSample) {
    // E5 tone with fade-in
    freq = 659.25;
    amp = Math.min(1.0, i / (sampleRate * 0.01)); // 10ms fade-in
  } else {
    // A5 tone with slight overlap fade
    freq = 880;
    const overlapStart = switchSample;
    const overlapEnd = switchSample + Math.floor(sampleRate * 0.04);
    if (i < overlapEnd) {
      // Crossfade
      const t = (i - overlapStart) / (overlapEnd - overlapStart);
      const e5Amp = 1.0 - t;
      const a5Amp = t;
      const e5Val = Math.sin((2 * Math.PI * 659.25 * i) / sampleRate) * e5Amp;
      const a5Val = Math.sin((2 * Math.PI * 880 * i) / sampleRate) * a5Amp;
      const val = ((e5Val + a5Val) / 2) * 0.6 * (1.0 - Math.max(0, (i - numSamples + sampleRate * 0.05) / (sampleRate * 0.05)));
      samples[i] = Math.round(val * 32767);
      continue;
    }
    // fade-out last 50ms
    amp = Math.min(1.0, Math.max(0, (numSamples - i) / (sampleRate * 0.05)));
  }
  const val = Math.sin((2 * Math.PI * freq * i) / sampleRate) * amp * 0.6;
  samples[i] = Math.round(val * 32767);
}

// Write WAV file
const numChannels = 1;
const bitsPerSample = 16;
const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
const blockAlign = numChannels * (bitsPerSample / 8);
const dataSize = numSamples * blockAlign;

const buffer = Buffer.alloc(44 + dataSize);

// RIFF header
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);

// fmt chunk
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16); // chunk size
buffer.writeUInt16LE(1, 20);  // PCM format
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(bitsPerSample, 34);

// data chunk
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

// Write PCM samples
let offset = 44;
for (let i = 0; i < numSamples; i++) {
  buffer.writeInt16LE(samples[i], offset);
  offset += 2;
}

const outPath = path.join(__dirname, "..", "public", "notification-sound.wav");
fs.writeFileSync(outPath, buffer);
console.log(`Created notification sound: ${outPath} (${buffer.length} bytes)`);
