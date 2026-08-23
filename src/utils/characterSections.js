function sectionFromGroups(id, groupIds, groupById, manualBucketId = null) {
  const sectionGroups = groupIds
    .map(groupId => groupById.get(groupId))
    .filter(Boolean)
    .sort((left, right) => right.photoPaths.length - left.photoPaths.length);
  const photoPaths = [...new Set(sectionGroups.flatMap(group => group.photoPaths))];

  return {
    id,
    groupIds: sectionGroups.map(group => group.id),
    photoPaths,
    photoCount: photoPaths.length,
    faceCount: sectionGroups.reduce((count, group) => count + group.faceCount, 0),
    variantCount: sectionGroups.length,
    manualBucketId
  };
}

export function buildCharacterSections(groups = [], automaticSections = [], manualBuckets = []) {
  const groupById = new Map(groups.map(group => [group.id, group]));
  const usableBuckets = manualBuckets.filter(bucket => Array.isArray(bucket.faceIds) && bucket.faceIds.length > 0);
  const assignmentByGroupId = new Map();

  groups.forEach(group => {
    const groupFaceIds = new Set(group.faceIds || []);
    let bestBucket = null;
    let bestOverlap = 0;

    usableBuckets.forEach(bucket => {
      const overlap = bucket.faceIds.reduce((count, faceId) => count + (groupFaceIds.has(faceId) ? 1 : 0), 0);
      if (overlap > bestOverlap) {
        bestBucket = bucket;
        bestOverlap = overlap;
      }
    });

    if (bestBucket) assignmentByGroupId.set(group.id, bestBucket.id);
  });

  const sourceSections = automaticSections.length > 0
    ? automaticSections
    : groups.map(group => ({ id: `family-${group.id}`, groupIds: [group.id] }));
  const adjustedAutomaticSections = sourceSections
    .map(section => sectionFromGroups(
      section.id,
      section.groupIds.filter(groupId => !assignmentByGroupId.has(groupId)),
      groupById
    ))
    .filter(section => section.groupIds.length > 0);
  const manualSections = usableBuckets
    .map(bucket => sectionFromGroups(
      bucket.id,
      groups.filter(group => assignmentByGroupId.get(group.id) === bucket.id).map(group => group.id),
      groupById,
      bucket.id
    ))
    .filter(section => section.groupIds.length > 0);

  return [...adjustedAutomaticSections, ...manualSections].sort((left, right) => (
    right.photoCount - left.photoCount
    || right.variantCount - left.variantCount
    || String(left.id).localeCompare(String(right.id))
  ));
}

export function collectFaceIds(groupIds, groups = []) {
  const selectedIds = new Set(groupIds);
  return [...new Set(groups
    .filter(group => selectedIds.has(group.id))
    .flatMap(group => group.faceIds || []))];
}
