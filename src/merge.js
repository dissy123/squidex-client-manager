/**
 * Create a new object containing the difference
 * @param old
 * @param nnew
 * @returns {*}
 * @constructor
 */
function MergeRecords(old, nnew) {
  const oldKeys = Object.keys(old);
  const newKeys = Object.keys(nnew);
  const merged = old;
  // Allow the user to prevent overwriting custom fields
  const customPrefix = process.env.SQUIDEX_CLIENT_MERGE_CUSTOM_PREFIX;
  const shouldBeUntouched = (k) => {
    if (!customPrefix) { return false; }
    return k.startsWith(customPrefix);
  }

  newKeys.forEach((k) => {
    if (!shouldBeUntouched(k) && oldKeys.includes(k) && old[k] !== nnew[k]) {
      merged[k] = nnew[k];
    } else if (!shouldBeUntouched(k)){
      // The key was not present in the old
      merged[k] = nnew[k];
    }
  });

  return merged;
}

module.exports.MergeRecords = MergeRecords;
