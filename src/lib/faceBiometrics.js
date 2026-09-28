import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelLoadingPromise = null;

/**
 * Load face-api models from /models static folder, with CDN fallback.
 */
export async function loadFaceModels() {
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const modelPath = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
      ]);
      modelsLoaded = true;
      return true;
    } catch (err) {
      console.warn('Gagal memuat model lokal /models, mencoba fallback CDN...', err);
      try {
        const cdnPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(cdnPath),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(cdnPath),
          faceapi.nets.faceRecognitionNet.loadFromUri(cdnPath),
        ]);
        modelsLoaded = true;
        return true;
      } catch (cdnErr) {
        console.error('Face recognition models could not be loaded:', cdnErr);
        modelsLoaded = false;
        return false;
      }
    } finally {
      modelLoadingPromise = null;
    }
  })();

  return modelLoadingPromise;
}

/**
 * Detect a single face in an image/video/canvas element and extract 128-D descriptor.
 */
export async function detectFace(inputElement) {
  const ready = await loadFaceModels();
  if (!ready) return null;

  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    const result = await faceapi
      .detectSingleFace(inputElement, options)
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    return result || null;
  } catch (err) {
    console.error('Face detection error:', err);
    return null;
  }
}

/**
 * Euclidean distance between two 128-D face descriptors.
 */
export function computeFaceDistance(desc1, desc2) {
  if (!desc1 || !desc2) return Infinity;
  const d1 = desc1 instanceof Float32Array ? desc1 : new Float32Array(desc1);
  const d2 = desc2 instanceof Float32Array ? desc2 : new Float32Array(desc2);
  return faceapi.euclideanDistance(d1, d2);
}

/**
 * Parse descriptor from string or array into Float32Array.
 */
export function parseDescriptor(raw) {
  if (!raw) return null;
  if (raw instanceof Float32Array) return raw;
  if (Array.isArray(raw)) return new Float32Array(raw);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Float32Array(parsed);
    } catch (_) {}
  }
  return null;
}

/**
 * Match a live face descriptor against a list of employees.
 * Returns the matching employee if distance <= threshold, or null.
 *
 * @param {Float32Array} liveDescriptor - 128-D vector of face in camera
 * @param {Array} employees - list of employee objects
 * @param {number} threshold - maximum distance (0.50 - 0.54 is standard)
 * @returns {object|null} { employee, distance, confidence }
 */
export function matchEmployeeFace(liveDescriptor, employees = [], threshold = 0.52) {
  if (!liveDescriptor || !employees.length) return null;

  let bestMatch = null;
  let minDistance = Infinity;

  for (const emp of employees) {
    const desc = emp._descriptor || parseDescriptor(emp.face_descriptor);
    if (!desc) continue;

    const dist = computeFaceDistance(liveDescriptor, desc);
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = emp;
    }
  }

  if (bestMatch && minDistance <= threshold) {
    const confidence = Math.max(50, Math.min(99, Math.round((1 - (minDistance / 0.7)) * 100)));
    return {
      employee: bestMatch,
      distance: minDistance,
      confidence,
    };
  }

  return null;
}

/**
 * Extract descriptor from an image URL or base64 string.
 */
export async function extractDescriptorFromPhoto(photoSrc) {
  if (!photoSrc) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const detection = await detectFace(img);
        resolve(detection ? Array.from(detection.descriptor) : null);
      } catch (err) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = photoSrc;
  });
}
