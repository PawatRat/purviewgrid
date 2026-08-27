const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const readExif = require('exif-reader');

const CACHE_VERSION = 2;
const MAX_NEW_SIGNATURES_PER_REQUEST = 240;
const MAX_RELATED_RESULTS = 12;

function isLocalPath(filePath) {
  return typeof filePath === 'string' && path.isAbsolute(filePath);
}

function serializeMetadataValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return undefined;
  if (Array.isArray(value)) {
    const serialized = value.map(serializeMetadataValue).filter(item => item !== undefined);
    return serialized.length > 0 ? serialized : undefined;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return undefined;
}

function flattenExif(metadata) {
  if (!metadata?.exif) return {};
  try {
    const decoded = readExif(metadata.exif);
    const result = {};
    for (const sectionName of ['Image', 'Photo', 'GPSInfo', 'Iop']) {
      const section = decoded?.[sectionName];
      if (!section || typeof section !== 'object') continue;
      for (const [key, value] of Object.entries(section)) {
        if (key.endsWith('Tag') || key === 'MakerNote' || key === 'UserComment') continue;
        const serialized = serializeMetadataValue(value);
        if (serialized !== undefined) result[`${sectionName}.${key}`] = serialized;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function loadCache(cachePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (parsed.version === CACHE_VERSION && parsed.entries && typeof parsed.entries === 'object') return parsed;
  } catch {
    // A missing or invalid cache is rebuilt incrementally.
  }
  return { version: CACHE_VERSION, entries: {} };
}

function saveCache(cachePath, cache) {
  if (!cachePath) return;
  const directory = path.dirname(cachePath);
  const temporaryPath = `${cachePath}.tmp`;
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(temporaryPath, JSON.stringify(cache), 'utf8');
  fs.renameSync(temporaryPath, cachePath);
}

function cacheEntryMatches(entry, statLike) {
  return entry
    && entry.size === statLike.size
    && entry.modifiedAt === statLike.modifiedAt
    && Array.isArray(entry.vector);
}

async function getStatLike(filePath, item = {}) {
  if (Number.isFinite(item.size) && Number.isFinite(item.modifiedAt)) {
    return { size: item.size, modifiedAt: item.modifiedAt };
  }
  const stat = await fs.promises.stat(filePath);
  return { size: stat.size, modifiedAt: Math.floor(stat.mtimeMs || 0) };
}

async function createVisualSignature(filePath, statLike) {
  const metadata = await sharp(filePath, { animated: false }).metadata();
  const displayWidth = metadata.autoOrient?.width || metadata.width || null;
  const displayHeight = metadata.autoOrient?.height || metadata.height || null;
  const { data, info } = await sharp(filePath, { animated: false })
    .rotate()
    .resize(8, 8, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const vector = Array.from(data);
  const channelCount = info.channels || 3;
  const sums = [0, 0, 0];
  for (let offset = 0; offset < vector.length; offset += channelCount) {
    sums[0] += vector[offset] || 0;
    sums[1] += vector[offset + 1] ?? vector[offset] ?? 0;
    sums[2] += vector[offset + 2] ?? vector[offset] ?? 0;
  }
  const pixelCount = Math.max(1, vector.length / channelCount);
  const dominantColor = `#${sums.map(sum => Math.round(sum / pixelCount).toString(16).padStart(2, '0')).join('')}`;
  return {
    size: statLike.size,
    modifiedAt: statLike.modifiedAt,
    vector,
    dominantColor,
    aspectRatio: displayWidth && displayHeight ? displayWidth / displayHeight : 1
  };
}

async function getSignature(filePath, item, cache, allowCreate) {
  const statLike = await getStatLike(filePath, item);
  const cached = cache.entries[filePath];
  if (cacheEntryMatches(cached, statLike)) return { entry: cached, created: false };
  if (!allowCreate) return { entry: null, created: false };
  const entry = await createVisualSignature(filePath, statLike);
  cache.entries[filePath] = entry;
  return { entry, created: true };
}

function similarityScore(source, candidate, sourceAspect, candidateAspect) {
  if (!source?.vector || !candidate?.vector || source.vector.length !== candidate.vector.length) return 0;
  let absoluteDifference = 0;
  for (let index = 0; index < source.vector.length; index += 1) {
    absoluteDifference += Math.abs(source.vector[index] - candidate.vector[index]);
  }
  const visualDistance = absoluteDifference / (source.vector.length * 255);
  const safeSourceAspect = sourceAspect > 0 ? sourceAspect : 1;
  const safeCandidateAspect = candidateAspect > 0 ? candidateAspect : 1;
  const aspectDistance = Math.min(1, Math.abs(Math.log(safeSourceAspect / safeCandidateAspect)) / 1.4);
  return Math.max(0, Math.min(1, 1 - (visualDistance * 0.82 + aspectDistance * 0.18)));
}

async function inspectImage(request) {
  const item = request?.item;
  if (!item || !isLocalPath(item.path)) {
    return { status: 'remote', metadata: null, exif: {}, related: [], indexedCount: 0, candidateCount: 0 };
  }

  const cache = loadCache(request.cachePath);
  const stat = await fs.promises.stat(item.path);
  const metadata = await sharp(item.path, { animated: false }).metadata();
  const statLike = { size: stat.size, modifiedAt: Math.floor(stat.mtimeMs || 0) };
  const sourceSignature = (await getSignature(item.path, statLike, cache, true)).entry;
  const displayWidth = metadata.autoOrient?.width || metadata.width || null;
  const displayHeight = metadata.autoOrient?.height || metadata.height || null;
  const sourceAspect = displayWidth && displayHeight ? displayWidth / displayHeight : 1;

  const candidates = (Array.isArray(request.candidates) ? request.candidates : [])
    .filter(candidate => candidate?.id !== item.id && candidate?.path !== item.path && isLocalPath(candidate?.path));
  const related = [];
  let createdCount = 0;
  let indexedCount = 0;

  for (const candidate of candidates) {
    try {
      const allowCreate = createdCount < MAX_NEW_SIGNATURES_PER_REQUEST;
      const signatureResult = await getSignature(candidate.path, candidate, cache, allowCreate);
      if (!signatureResult.entry) continue;
      if (signatureResult.created) createdCount += 1;
      indexedCount += 1;
      const candidateAspect = candidate.aspectRatio > 0 ? candidate.aspectRatio : signatureResult.entry.aspectRatio;
      related.push({
        id: candidate.id,
        path: candidate.path,
        score: similarityScore(sourceSignature, signatureResult.entry, sourceAspect, candidateAspect),
        dominantColor: signatureResult.entry.dominantColor
      });
    } catch {
      // Unreadable and disappearing candidates are omitted without failing the inspector.
    }
  }

  saveCache(request.cachePath, cache);
  related.sort((a, b) => b.score - a.score);

  return {
    status: 'ready',
    metadata: {
      fileName: path.basename(item.path),
      folder: path.dirname(item.path),
      extension: path.extname(item.path).slice(1).toUpperCase(),
      size: stat.size,
      createdAt: Math.floor(stat.birthtimeMs || stat.ctimeMs || 0),
      modifiedAt: statLike.modifiedAt,
      format: metadata.format || null,
      mediaType: metadata.mediaType || null,
      width: displayWidth,
      height: displayHeight,
      sourceWidth: metadata.width || null,
      sourceHeight: metadata.height || null,
      orientation: metadata.orientation || null,
      space: metadata.space || null,
      channels: metadata.channels || null,
      depth: metadata.depth || null,
      density: metadata.density || null,
      bitsPerSample: metadata.bitsPerSample || null,
      chromaSubsampling: metadata.chromaSubsampling || null,
      compression: metadata.compression || null,
      isProgressive: Boolean(metadata.isProgressive),
      isPalette: Boolean(metadata.isPalette),
      hasProfile: Boolean(metadata.hasProfile),
      hasAlpha: Boolean(metadata.hasAlpha),
      pages: metadata.pages || null,
      pageHeight: metadata.pageHeight || null,
      loop: metadata.loop ?? null,
      delay: Array.isArray(metadata.delay) ? metadata.delay : null,
      dominantColor: sourceSignature.dominantColor
    },
    exif: flattenExif(metadata),
    related: related.slice(0, MAX_RELATED_RESULTS),
    indexedCount,
    candidateCount: candidates.length,
    isPartial: indexedCount < candidates.length
  };
}

if (process.parentPort) {
  process.parentPort.on('message', async event => {
    try {
      const result = await inspectImage(event.data);
      process.parentPort.postMessage({ type: 'complete', result });
    } catch (error) {
      process.parentPort.postMessage({ type: 'error', error: error.message });
    }
  });
}

module.exports = { inspectImage, similarityScore };
