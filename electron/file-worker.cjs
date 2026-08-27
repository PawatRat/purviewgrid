const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif', '.heic', '.heif', '.tiff', '.tif', '.ico'
]);

function isSupportedImage(filePath) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isPathInsideRoot(filePath, rootPath) {
  const relativePath = path.relative(rootPath, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getFileContentHash(filePath, knownStat) {
  try {
    const stat = knownStat || await fs.promises.stat(filePath);
    if (!stat.isFile()) return null;

    const hash = crypto.createHash('sha256');
    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    return `${stat.size}_${hash.digest('hex')}`;
  } catch {
    return null;
  }
}

function getCreationTime(stat) {
  if (stat.birthtimeMs && stat.birthtimeMs > 0 && stat.birthtimeMs < Date.now() + 86400000) {
    return Math.floor(stat.birthtimeMs);
  }
  if (stat.mtimeMs && stat.mtimeMs > 0) return Math.floor(stat.mtimeMs);
  if (stat.ctimeMs && stat.ctimeMs > 0) return Math.floor(stat.ctimeMs);
  return Date.now();
}

async function scanPathRecursively(targetPath, results, hashToItemMap, options = {}) {
  try {
    const stat = await fs.promises.stat(targetPath);
    if (stat.isDirectory()) {
      const entries = await fs.promises.readdir(targetPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        await scanPathRecursively(path.join(targetPath, entry.name), results, hashToItemMap, options);
      }
      return;
    }

    if (!stat.isFile() || !isSupportedImage(targetPath) || results.has(targetPath)) {
      return;
    }

    const modifiedAt = Math.floor(stat.mtimeMs || 0);
    const existingItem = options.existingByPath?.get(targetPath);
    const canReuseHash = existingItem?.hash
      && existingItem.size === stat.size
      && existingItem.modifiedAt === modifiedAt;
    const hash = canReuseHash ? existingItem.hash : await getFileContentHash(targetPath, stat);
    if (!options.includeDuplicateItems && hash && hashToItemMap.has(hash)) {
      const primaryItem = hashToItemMap.get(hash);
      if (!primaryItem.duplicatePaths.includes(targetPath)) primaryItem.duplicatePaths.push(targetPath);
      return;
    }

    const item = {
      path: targetPath,
      createdAt: getCreationTime(stat),
      modifiedAt,
      size: stat.size,
      deviceId: stat.dev,
      inode: stat.ino,
      hash,
      duplicatePaths: [targetPath]
    };
    if (hash) hashToItemMap.set(hash, item);
    results.set(targetPath, item);
  } catch {
    // Files can disappear or become unreadable during a long scan; skip them.
  }
}

async function resolveImageFiles(inputPaths, existingItems = [], includeDuplicateItems = false) {
  const imageMap = new Map();
  const hashToItemMap = new Map();
  const existingByPath = new Map((Array.isArray(existingItems) ? existingItems : [])
    .filter(item => item && typeof item.path === 'string')
    .map(item => [item.path, item]));
  const paths = Array.isArray(inputPaths) ? inputPaths : [inputPaths];
  for (const inputPath of paths) {
    if (typeof inputPath === 'string' && inputPath.trim()) {
      await scanPathRecursively(inputPath, imageMap, hashToItemMap, { existingByPath, includeDuplicateItems });
    }
  }
  return Array.from(imageMap.values());
}

async function importPaths(inputPaths) {
  const paths = Array.isArray(inputPaths) ? inputPaths : [inputPaths];
  const sourceFolders = [];
  const sourceFiles = [];
  for (const inputPath of paths) {
    if (typeof inputPath !== 'string' || !inputPath.trim()) continue;
    try {
      const stat = await fs.promises.stat(inputPath);
      if (stat.isDirectory()) sourceFolders.push(path.resolve(inputPath));
      else if (stat.isFile() && isSupportedImage(inputPath)) {
        sourceFiles.push({
          id: crypto.randomUUID(),
          path: path.resolve(inputPath),
          root: path.dirname(path.resolve(inputPath)),
          deviceId: stat.dev,
          inode: stat.ino
        });
      }
    } catch {
      // Ignore paths that disappear before the import begins.
    }
  }
  return {
    images: await resolveImageFiles(paths),
    sourceFolders: [...new Set(sourceFolders)],
    sourceFiles
  };
}

async function findFileByIdentity(rootPath, sourceFile) {
  try {
    const entries = await fs.promises.readdir(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const entryPath = path.join(rootPath, entry.name);
      if (entry.isDirectory()) {
        const nestedMatch = await findFileByIdentity(entryPath, sourceFile);
        if (nestedMatch) return nestedMatch;
      } else if (entry.isFile() && isSupportedImage(entryPath)) {
        try {
          const stat = await fs.promises.stat(entryPath);
          if (stat.dev === sourceFile.deviceId && stat.ino === sourceFile.inode) return entryPath;
        } catch {
          // Continue when a candidate disappears during traversal.
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveTrackedSourceFile(sourceFile, existingItems) {
  const previousPath = sourceFile.path;
  let resolvedPath = sourceFile.path;
  try {
    const stat = await fs.promises.stat(resolvedPath);
    if (!stat.isFile() || !isSupportedImage(resolvedPath)) resolvedPath = null;
  } catch {
    resolvedPath = null;
  }

  if (!resolvedPath && sourceFile.root && await fileExists(sourceFile.root)) {
    resolvedPath = await findFileByIdentity(sourceFile.root, sourceFile);
  }
  if (!resolvedPath) return { sourceFile, image: null, previousPath };

  const images = await resolveImageFiles([resolvedPath], existingItems, true);
  const image = images[0] || null;
  return {
    sourceFile: image ? {
      ...sourceFile,
      path: resolvedPath,
      deviceId: image.deviceId,
      inode: image.inode
    } : sourceFile,
    image,
    previousPath
  };
}

async function syncSourceFolders(sourceFolders, existingItems, sourceFiles = []) {
  const folderPaths = [...new Set((Array.isArray(sourceFolders) ? sourceFolders : []).filter(Boolean).map(folder => path.resolve(folder)))];
  const folderImages = await resolveImageFiles(folderPaths, existingItems, true);
  const trackedResults = [];
  for (const sourceFile of Array.isArray(sourceFiles) ? sourceFiles : []) {
    if (!sourceFile || typeof sourceFile.path !== 'string') continue;
    trackedResults.push(await resolveTrackedSourceFile(sourceFile, existingItems));
  }

  const imageByPath = new Map(folderImages.map(image => [image.path, image]));
  trackedResults.forEach(result => {
    if (result.image) imageByPath.set(result.image.path, result.image);
  });
  const scannedPaths = new Set(imageByPath.keys());
  const missingPaths = new Set(trackedResults
    .filter(result => !result.image || result.sourceFile.path !== result.previousPath)
    .map(result => result.previousPath));
  for (const item of Array.isArray(existingItems) ? existingItems : []) {
    if (!item?.path || scannedPaths.has(item.path)) continue;
    if (folderPaths.some(folder => isPathInsideRoot(item.path, folder))) missingPaths.add(item.path);
  }

  return {
    images: [...imageByPath.values()],
    missingPaths: [...missingPaths],
    sourceFiles: trackedResults.map(result => result.sourceFile)
  };
}

async function getFileStats(paths) {
  const statsMap = {};
  if (!Array.isArray(paths)) return statsMap;

  for (const filePath of paths) {
    if (typeof filePath !== 'string') continue;
    try {
      const stat = await fs.promises.stat(filePath);
      statsMap[filePath] = {
        createdAt: getCreationTime(stat),
        modifiedAt: Math.floor(stat.mtimeMs || 0),
        size: stat.size,
        deviceId: stat.dev,
        inode: stat.ino,
        hash: await getFileContentHash(filePath, stat)
      };
    } catch {
      statsMap[filePath] = { createdAt: Date.now(), modifiedAt: null, size: null, deviceId: null, inode: null, hash: null };
    }
  }
  return statsMap;
}

async function runTask(request) {
  if (request?.type === 'scan-paths') return resolveImageFiles(request.paths);
  if (request?.type === 'import-paths') return importPaths(request.paths);
  if (request?.type === 'sync-source-folders') return syncSourceFolders(request.paths, request.items, request.sourceFiles);
  if (request?.type === 'get-file-stats') return getFileStats(request.paths);
  throw new Error(`Unsupported file task: ${request?.type || 'unknown'}`);
}

if (process.parentPort) {
  process.parentPort.on('message', async event => {
    try {
      const result = await runTask(event.data);
      process.parentPort.postMessage({ type: 'complete', result });
    } catch (error) {
      process.parentPort.postMessage({ type: 'error', error: error.message });
    }
  });
}

module.exports = { getFileStats, importPaths, resolveImageFiles, runTask, syncSourceFolders };
