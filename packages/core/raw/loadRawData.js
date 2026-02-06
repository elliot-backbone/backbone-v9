/**
 * raw/loadRawData.js — Reassemble raw dataset from chunks
 *
 * The monolithic sample.json was split into chunks/ for git friendliness.
 * This loader reads the manifest and reassembles the full dataset object
 * that engine.js and qa_gate.js expect.
 *
 * Shape: { companies: [...], people: [...], firms: [...], rounds: [...],
 *          deals: [...], goals: [...], relationships: [...], meta: {...} }
 *
 * Works in Node.js (fs-based). For browser/UI, data is passed via rawData prop.
 *
 * @module raw/loadRawData
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CHUNKS_DIR = join(__dirname, 'chunks');

/**
 * Load and reassemble raw data from chunks.
 * @returns {Object} Full raw dataset
 */
export function loadRawData() {
  const manifestPath = join(CHUNKS_DIR, 'sample_manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Raw data manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const data = {};

  for (const chunk of manifest.chunks) {
    const chunkPath = join(CHUNKS_DIR, chunk.file);
    if (!existsSync(chunkPath)) {
      throw new Error(`Chunk file missing: ${chunkPath}`);
    }
    const chunkData = JSON.parse(readFileSync(chunkPath, 'utf8'));

    // Chunks are arrays — append to the key (supports multi-part chunks)
    if (!data[chunk.key]) {
      data[chunk.key] = chunkData;
    } else {
      data[chunk.key] = data[chunk.key].concat(chunkData);
    }
  }

  // Attach meta from manifest
  if (manifest.meta) {
    data.meta = manifest.meta;
  }

  return data;
}

export default loadRawData;
