const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const ort = require('onnxruntime-node');
const sharp = require('sharp');

const MODEL_VERSION = 'yunet-2023mar+ccip-caformer24+sface-linked-families-v7';
const COMPATIBLE_MODEL_VERSIONS = new Set([
  'yunet-2023mar+ccip-caformer24+sface-consensus-v3',
  'yunet-2023mar+ccip-caformer24+sface-pose-consensus-v4',
  'yunet-2023mar+ccip-caformer24+sface-adaptive-pose-v5',
  'yunet-2023mar+ccip-caformer24+sface-family-sections-v6'
]);
const DETECTOR_SIZE = 640;
const DETECTION_THRESHOLD = 0.72;
const NMS_THRESHOLD = 0.3;
const MIN_FACE_SIZE = 42;
const CCIP_SIZE = 384;
const ULTRA_CHARACTER_DISTANCE = 0.025;
const CORE_CHARACTER_DISTANCE = 0.065;
const CORE_FACE_SIMILARITY = 0.46;
const POSE_CHARACTER_DISTANCE = 0.08;
const SUPPORT_CHARACTER_DISTANCE = 0.095;
const OUTLIER_CHARACTER_DISTANCE = 0.125;
const POSE_FACE_SIMILARITY = 0.62;
const SUPPORT_RATIO = 0.75;
const MAX_OUTLIER_RATIO = 0.18;
const AMBIGUITY_MARGIN = 0.012;
const FACE_SCORE_WEIGHT = 0.02;
const FAMILY_ULTRA_DISTANCE = 0.03;
const FAMILY_CLOSE_DISTANCE = 0.07;
const FAMILY_CLOSE_FACE_SIMILARITY = 0.4;
const FAMILY_WIDE_DISTANCE = 0.1;
const FAMILY_WIDE_FACE_SIMILARITY = 0.6;

let detectorSession;
let characterSession;
let distanceSession;
let faceSession;

function hashText(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalize(vector) {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const norm = Math.sqrt(sum) || 1;
  return Array.from(vector, value => value / norm);
}

function cosine(left, right) {
  let value = 0;
  for (let index = 0; index < left.length; index += 1) value += left[index] * right[index];
  return value;
}

function intersectionOverUnion(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const intersection = width * height;
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function nonMaximumSuppression(faces) {
  const sorted = [...faces].sort((a, b) => b.score - a.score);
  const kept = [];
  for (const candidate of sorted) {
    if (kept.every(face => intersectionOverUnion(face, candidate) < NMS_THRESHOLD)) {
      kept.push(candidate);
    }
  }
  return kept;
}

function imageToTensor(rgb, width, height, order = 'bgr') {
  const plane = width * height;
  const data = new Float32Array(plane * 3);
  for (let i = 0; i < plane; i += 1) {
    const source = i * 3;
    if (order === 'bgr') {
      data[i] = rgb[source + 2];
      data[plane + i] = rgb[source + 1];
      data[plane * 2 + i] = rgb[source];
    } else {
      data[i] = rgb[source];
      data[plane + i] = rgb[source + 1];
      data[plane * 2 + i] = rgb[source + 2];
    }
  }
  return new ort.Tensor('float32', data, [1, 3, height, width]);
}

function ccipImageToTensor(rgb) {
  const plane = CCIP_SIZE * CCIP_SIZE;
  const data = new Float32Array(plane * 3);
  const mean = [0.48145466, 0.4578275, 0.40821073];
  const standardDeviation = [0.26862954, 0.26130258, 0.27577711];
  for (let index = 0; index < plane; index += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      data[channel * plane + index] = (rgb[index * 3 + channel] / 255 - mean[channel]) / standardDeviation[channel];
    }
  }
  return new ort.Tensor('float32', data, [1, 3, CCIP_SIZE, CCIP_SIZE]);
}

function decodeYuNet(outputs, scale) {
  const detections = [];
  for (const stride of [8, 16, 32]) {
    const columns = DETECTOR_SIZE / stride;
    const rows = DETECTOR_SIZE / stride;
    const classes = outputs[`cls_${stride}`].data;
    const objects = outputs[`obj_${stride}`].data;
    const boxes = outputs[`bbox_${stride}`].data;
    const landmarks = outputs[`kps_${stride}`].data;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const classScore = clamp(classes[index], 0, 1);
        const objectScore = clamp(objects[index], 0, 1);
        const score = Math.sqrt(classScore * objectScore);
        if (score < DETECTION_THRESHOLD) continue;

        const centerX = (column + boxes[index * 4]) * stride;
        const centerY = (row + boxes[index * 4 + 1]) * stride;
        const width = Math.exp(boxes[index * 4 + 2]) * stride;
        const height = Math.exp(boxes[index * 4 + 3]) * stride;
        if (Math.min(width, height) < MIN_FACE_SIZE) continue;

        const points = [];
        for (let point = 0; point < 5; point += 1) {
          points.push({
            x: ((landmarks[index * 10 + point * 2] + column) * stride) / scale,
            y: ((landmarks[index * 10 + point * 2 + 1] + row) * stride) / scale
          });
        }

        detections.push({
          x: (centerX - width / 2) / scale,
          y: (centerY - height / 2) / scale,
          width: width / scale,
          height: height / scale,
          landmarks: points,
          score
        });
      }
    }
  }
  return nonMaximumSuppression(detections);
}

function similarityTransform(source) {
  const destination = [
    { x: 38.2946, y: 51.6963 },
    { x: 73.5318, y: 51.5014 },
    { x: 56.0252, y: 71.7366 },
    { x: 41.5493, y: 92.3655 },
    { x: 70.7299, y: 92.2041 }
  ];
  const sourceMean = source.reduce((result, point) => ({ x: result.x + point.x / 5, y: result.y + point.y / 5 }), { x: 0, y: 0 });
  const destinationMean = destination.reduce((result, point) => ({ x: result.x + point.x / 5, y: result.y + point.y / 5 }), { x: 0, y: 0 });
  let denominator = 0;
  let real = 0;
  let imaginary = 0;
  for (let index = 0; index < 5; index += 1) {
    const sourceX = source[index].x - sourceMean.x;
    const sourceY = source[index].y - sourceMean.y;
    const destinationX = destination[index].x - destinationMean.x;
    const destinationY = destination[index].y - destinationMean.y;
    denominator += sourceX * sourceX + sourceY * sourceY;
    real += sourceX * destinationX + sourceY * destinationY;
    imaginary += sourceX * destinationY - sourceY * destinationX;
  }
  const a = real / denominator;
  const b = imaginary / denominator;
  return {
    a,
    b,
    tx: destinationMean.x - a * sourceMean.x + b * sourceMean.y,
    ty: destinationMean.y - b * sourceMean.x - a * sourceMean.y
  };
}

function alignFace(rgb, width, height, landmarks) {
  const transform = similarityTransform(landmarks);
  const determinant = transform.a * transform.a + transform.b * transform.b;
  const aligned = Buffer.alloc(112 * 112 * 3);
  for (let destinationY = 0; destinationY < 112; destinationY += 1) {
    for (let destinationX = 0; destinationX < 112; destinationX += 1) {
      const shiftedX = destinationX - transform.tx;
      const shiftedY = destinationY - transform.ty;
      const sourceX = (transform.a * shiftedX + transform.b * shiftedY) / determinant;
      const sourceY = (-transform.b * shiftedX + transform.a * shiftedY) / determinant;
      const x0 = Math.floor(sourceX);
      const y0 = Math.floor(sourceY);
      const weightX = sourceX - x0;
      const weightY = sourceY - y0;
      const destinationIndex = (destinationY * 112 + destinationX) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        const sample = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : rgb[(y * width + x) * 3 + channel]);
        const top = sample(x0, y0) * (1 - weightX) + sample(x0 + 1, y0) * weightX;
        const bottom = sample(x0, y0 + 1) * (1 - weightX) + sample(x0 + 1, y0 + 1) * weightX;
        aligned[destinationIndex + channel] = Math.round(top * (1 - weightY) + bottom * weightY);
      }
    }
  }
  return aligned;
}

async function ensureSessions(modelsPath) {
  if (!detectorSession) {
    detectorSession = await ort.InferenceSession.create(
      path.join(modelsPath, 'face_detection_yunet_2023mar.onnx'),
      { graphOptimizationLevel: 'all', executionMode: 'sequential', intraOpNumThreads: Math.max(1, Math.min(4, os.cpus().length - 1)) }
    );
  }
  if (!characterSession) {
    characterSession = await ort.InferenceSession.create(
      path.join(modelsPath, 'ccip-caformer-24-randaug-pruned.onnx'),
      { graphOptimizationLevel: 'all', executionMode: 'sequential', intraOpNumThreads: Math.max(1, Math.min(4, os.cpus().length - 1)) }
    );
  }
  if (!distanceSession) {
    distanceSession = await ort.InferenceSession.create(
      path.join(modelsPath, 'ccip-distance.onnx'),
      { graphOptimizationLevel: 'all', executionMode: 'sequential', intraOpNumThreads: Math.max(1, Math.min(4, os.cpus().length - 1)) }
    );
  }
  if (!faceSession) {
    faceSession = await ort.InferenceSession.create(
      path.join(modelsPath, 'face_recognition_sface_2021dec.onnx'),
      { graphOptimizationLevel: 'all', executionMode: 'sequential', intraOpNumThreads: Math.max(1, Math.min(4, os.cpus().length - 1)) }
    );
  }
}

function characterCropBox(face, imageWidth, imageHeight) {
  const side = Math.min(Math.max(face.width, face.height) * 2.15, imageWidth, imageHeight);
  const centerX = face.x + face.width / 2;
  const centerY = face.y + face.height * 0.62;
  const left = clamp(Math.round(centerX - side / 2), 0, Math.max(0, Math.round(imageWidth - side)));
  const top = clamp(Math.round(centerY - side / 2), 0, Math.max(0, Math.round(imageHeight - side)));
  const size = Math.max(1, Math.round(Math.min(side, imageWidth - left, imageHeight - top)));
  return { left, top, width: size, height: size };
}

async function analyzeImage(filePath, modelsPath, thumbnailsPath) {
  await ensureSessions(modelsPath);
  const oriented = await sharp(filePath, { failOn: 'none' })
    .rotate()
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = oriented.info;
  const scale = Math.min(DETECTOR_SIZE / width, DETECTOR_SIZE / height);
  const detectorImage = await sharp(oriented.data, { raw: { width, height, channels: 3 } })
    .resize(DETECTOR_SIZE, DETECTOR_SIZE, {
      fit: 'contain',
      position: 'northwest',
      background: { r: 0, g: 0, b: 0 }
    })
    .raw()
    .toBuffer();
  const detectorInput = imageToTensor(detectorImage, DETECTOR_SIZE, DETECTOR_SIZE, 'bgr');
  const outputs = await detectorSession.run({ input: detectorInput });
  const detections = decodeYuNet(outputs, scale)
    .filter(face => face.x < width && face.y < height && face.x + face.width > 0 && face.y + face.height > 0)
    .slice(0, 24);

  const faces = [];
  for (let index = 0; index < detections.length; index += 1) {
    const detection = detections[index];
    const cropBox = characterCropBox(detection, width, height);
    const characterCrop = await sharp(oriented.data, { raw: { width, height, channels: 3 } })
      .extract(cropBox)
      .resize(CCIP_SIZE, CCIP_SIZE, { fit: 'fill' })
      .raw()
      .toBuffer();
    const recognitionOutput = await characterSession.run({ input: ccipImageToTensor(characterCrop) });
    const embedding = Array.from(recognitionOutput.output.data);
    const alignedFace = alignFace(oriented.data, width, height, detection.landmarks);
    const faceOutput = await faceSession.run({ data: imageToTensor(alignedFace, 112, 112, 'rgb') });
    const faceEmbedding = normalize(faceOutput.fc1.data);
    const faceId = hashText(`${filePath}:${index}:${detection.landmarks.map(point => `${Math.round(point.x)},${Math.round(point.y)}`).join(':')}`).slice(0, 20);
    const thumbnailPath = path.join(thumbnailsPath, `${faceId}.jpg`);
    if (!fs.existsSync(thumbnailPath)) {
      await sharp(characterCrop, { raw: { width: CCIP_SIZE, height: CCIP_SIZE, channels: 3 } })
        .resize(256, 256)
        .jpeg({ quality: 88 })
        .toFile(thumbnailPath);
    }
    const boundedBox = {
      x: clamp(detection.x, 0, width),
      y: clamp(detection.y, 0, height),
      width: clamp(detection.width, 0, width),
      height: clamp(detection.height, 0, height)
    };
    faces.push({
      id: faceId,
      imagePath: filePath,
      thumbnailPath,
      embedding,
      faceEmbedding,
      score: detection.score,
      box: boundedBox
    });
  }
  return faces;
}

async function characterDistanceMatrix(faces) {
  if (faces.length === 0) return [];
  const dimensions = faces[0].embedding.length;
  const data = new Float32Array(faces.length * dimensions);
  faces.forEach((face, faceIndex) => data.set(face.embedding, faceIndex * dimensions));
  const output = await distanceSession.run({ input: new ort.Tensor('float32', data, [faces.length, dimensions]) });
  return output.output.data;
}

async function clusterFaces(faces) {
  const sorted = [...faces].sort((a, b) => b.score - a.score);
  const distanceData = await characterDistanceMatrix(sorted);
  const faceIndex = new Map(sorted.map((face, index) => [face.id, index]));
  const distance = (left, right) => distanceData[faceIndex.get(left.id) * sorted.length + faceIndex.get(right.id)];
  const faceSimilarity = (left, right) => cosine(left.faceEmbedding, right.faceEmbedding);
  const clusters = [];

  const updateMedoid = cluster => {
    if (cluster.members.length < 3) return;
    cluster.medoid = cluster.members.reduce((best, candidate) => {
      const average = cluster.members.reduce((sum, member) => sum + distance(candidate, member), 0) / cluster.members.length;
      return !best || average < best.average ? { member: candidate, average } : best;
    }, null).member;
  };

  const evidence = (leftMembers, rightMembers, leftMedoid, rightMedoid) => {
    const medoidDistance = distance(leftMedoid, rightMedoid);
    const medoidFaceSimilarity = faceSimilarity(leftMedoid, rightMedoid);
    const representativeMatches = medoidDistance <= ULTRA_CHARACTER_DISTANCE
      || (medoidDistance <= CORE_CHARACTER_DISTANCE && medoidFaceSimilarity >= CORE_FACE_SIMILARITY)
      || (medoidDistance <= POSE_CHARACTER_DISTANCE && medoidFaceSimilarity >= POSE_FACE_SIMILARITY);
    if (!representativeMatches) return null;
    const distances = leftMembers.flatMap(left => rightMembers.map(right => distance(left, right)));
    const support = distances.filter(value => value <= SUPPORT_CHARACTER_DISTANCE).length / distances.length;
    const outliers = distances.filter(value => value > OUTLIER_CHARACTER_DISTANCE).length / distances.length;
    if (support < SUPPORT_RATIO || outliers > MAX_OUTLIER_RATIO) return null;
    return {
      medoidDistance,
      score: medoidDistance - Math.max(0, medoidFaceSimilarity - POSE_FACE_SIMILARITY) * FACE_SCORE_WEIGHT
    };
  };

  for (const face of sorted) {
    const candidates = [];
    for (const cluster of clusters) {
      const match = evidence([face], cluster.members, face, cluster.medoid);
      if (match) candidates.push({ cluster, ...match });
    }

    candidates.sort((left, right) => left.score - right.score);
    const best = candidates[0];
    const second = candidates[1];
    if (best && (!second || best.medoidDistance <= ULTRA_CHARACTER_DISTANCE || second.score - best.score >= AMBIGUITY_MARGIN)) {
      best.cluster.members.push(face);
      updateMedoid(best.cluster);
      continue;
    }
    clusters.push({ members: [face], medoid: face });
  }

  let didMerge = true;
  while (didMerge) {
    didMerge = false;
    let bestPair = null;
    for (let leftIndex = 0; leftIndex < clusters.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < clusters.length; rightIndex += 1) {
        const left = clusters[leftIndex];
        const right = clusters[rightIndex];
        const match = evidence(left.members, right.members, left.medoid, right.medoid);
        if (match && (!bestPair || match.score < bestPair.score)) {
          bestPair = { leftIndex, rightIndex, score: match.score };
        }
      }
    }
    if (bestPair) {
      const left = clusters[bestPair.leftIndex];
      left.members.push(...clusters[bestPair.rightIndex].members);
      updateMedoid(left);
      clusters.splice(bestPair.rightIndex, 1);
      didMerge = true;
    }
  }

  const groupsWithMedoids = clusters
    .map(cluster => {
      const photoPaths = [...new Set(cluster.members.map(member => member.imagePath))];
      return {
        id: `character-${cluster.medoid.id}`,
        coverThumbnailPath: cluster.medoid.thumbnailPath,
        faceIds: cluster.members.map(member => member.id),
        thumbnailPaths: cluster.members.map(member => member.thumbnailPath),
        photoPaths,
        faceCount: cluster.members.length,
        medoid: cluster.medoid,
        confidence: cluster.members.length > 1
          ? Math.min(...cluster.members.flatMap((left, leftIndex) => cluster.members.slice(leftIndex + 1).map(right => (
            Math.min(1 - distance(left, right), faceSimilarity(left, right))
          ))))
          : null
      };
    })
    .sort((a, b) => b.photoPaths.length - a.photoPaths.length || b.faceCount - a.faceCount);

  const familyParents = groupsWithMedoids.map((_group, index) => index);
  const findFamily = index => {
    if (familyParents[index] !== index) familyParents[index] = findFamily(familyParents[index]);
    return familyParents[index];
  };
  const joinFamilies = (leftIndex, rightIndex) => {
    const leftRoot = findFamily(leftIndex);
    const rightRoot = findFamily(rightIndex);
    if (leftRoot !== rightRoot) familyParents[rightRoot] = leftRoot;
  };
  for (let leftIndex = 0; leftIndex < groupsWithMedoids.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < groupsWithMedoids.length; rightIndex += 1) {
      const left = groupsWithMedoids[leftIndex];
      const right = groupsWithMedoids[rightIndex];
      const characterDistance = distance(left.medoid, right.medoid);
      const facialSimilarity = faceSimilarity(left.medoid, right.medoid);
      const matches = characterDistance <= FAMILY_ULTRA_DISTANCE
        || (characterDistance <= FAMILY_CLOSE_DISTANCE && facialSimilarity >= FAMILY_CLOSE_FACE_SIMILARITY)
        || (characterDistance <= FAMILY_WIDE_DISTANCE && facialSimilarity >= FAMILY_WIDE_FACE_SIMILARITY);
      if (matches) joinFamilies(leftIndex, rightIndex);
    }
  }

  const sectionByRoot = new Map();
  groupsWithMedoids.forEach((group, index) => {
    const root = findFamily(index);
    if (!sectionByRoot.has(root)) sectionByRoot.set(root, []);
    sectionByRoot.get(root).push(group);
  });

  const sections = [...sectionByRoot.values()]
    .map(sectionGroupsInput => {
      const sectionGroups = [...sectionGroupsInput].sort((left, right) => right.photoPaths.length - left.photoPaths.length);
      const photoPaths = [...new Set(sectionGroups.flatMap(group => group.photoPaths))];
      return {
        id: `family-${sectionGroups[0].id}`,
        groupIds: sectionGroups.map(group => group.id),
        photoPaths,
        photoCount: photoPaths.length,
        faceCount: sectionGroups.reduce((count, group) => count + group.faceCount, 0),
        variantCount: sectionGroups.length
      };
    })
    .sort((left, right) => right.photoCount - left.photoCount || right.variantCount - left.variantCount);

  const groups = groupsWithMedoids.map(({ medoid, ...group }) => group);
  return { groups, sections };
}

function loadIndex(indexPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const hasCompatibleEmbeddings = Object.values(parsed.images || {}).every(entry => (
      (entry.faces || []).every(face => Array.isArray(face.embedding) && Array.isArray(face.faceEmbedding))
    ));
    if (
      parsed.images
      && (parsed.modelVersion === MODEL_VERSION || COMPATIBLE_MODEL_VERSIONS.has(parsed.modelVersion))
      && hasCompatibleEmbeddings
    ) return parsed;
  } catch {
    // A missing or stale cache is rebuilt safely.
  }
  return { version: 1, modelVersion: MODEL_VERSION, images: {} };
}

async function fileFingerprint(filePath) {
  const stat = await fs.promises.stat(filePath);
  return `${stat.size}:${Math.floor(stat.mtimeMs)}`;
}

async function runScan(request, reportProgress = () => {}) {
  const { items, modelsPath, indexPath, thumbnailsPath } = request;
  await fs.promises.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.promises.mkdir(thumbnailsPath, { recursive: true });
  const index = loadIndex(indexPath);
  const localItems = items.filter(item => typeof item.path === 'string' && path.isAbsolute(item.path) && fs.existsSync(item.path));
  const nextImages = {};

  reportProgress({ phase: 'preparing', current: 0, total: localItems.length });
  for (let current = 0; current < localItems.length; current += 1) {
    const item = localItems[current];
    const fingerprint = await fileFingerprint(item.path);
    const cached = index.images[item.path];
    if (cached?.fingerprint === fingerprint) {
      nextImages[item.path] = cached;
    } else {
      try {
        nextImages[item.path] = {
          fingerprint,
          faces: await analyzeImage(item.path, modelsPath, thumbnailsPath)
        };
      } catch (error) {
        nextImages[item.path] = { fingerprint, faces: [], error: error.message };
      }
    }
    reportProgress({ phase: 'analyzing', current: current + 1, total: localItems.length, filePath: item.path });
  }

  const allFaces = Object.values(nextImages).flatMap(entry => entry.faces || []);
  reportProgress({ phase: 'grouping', current: allFaces.length, total: allFaces.length });
  if (allFaces.length > 0) await ensureSessions(modelsPath);
  const { groups, sections } = await clusterFaces(allFaces);
  const nextIndex = {
    version: 1,
    modelVersion: MODEL_VERSION,
    updatedAt: Date.now(),
    images: nextImages,
    groups,
    sections
  };
  await fs.promises.writeFile(indexPath, JSON.stringify(nextIndex), 'utf8');
  return {
    status: 'ready',
    updatedAt: nextIndex.updatedAt,
    scannedImageCount: localItems.length,
    detectedFaceCount: allFaces.length,
    groups,
    sections
  };
}

async function handleRequest(request, send) {
  try {
    const result = await runScan(request, progress => send({ type: 'progress', progress }));
    send({ type: 'complete', result });
  } catch (error) {
    send({ type: 'error', error: error.message });
  }
}

if (process.parentPort) {
  process.parentPort.on('message', event => {
    handleRequest(event.data, message => process.parentPort.postMessage(message));
  });
}

module.exports = { runScan, clusterFaces };
