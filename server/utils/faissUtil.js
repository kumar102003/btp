const faiss = require('faiss-node');
const fs = require('fs');
const path = require('path');

const DIMENSIONS = 768;
const EMBEDDINGS_FILE_PATH = path.join(__dirname, '../uploads/embeddings.json');

let faissIndex = null;

const initializeIndex = () => {
  if (!global.faissIndex) {
    global.faissIndex = new faiss.IndexFlatL2(DIMENSIONS);
  }
  faissIndex = global.faissIndex;

  // Load existing embeddings.json if it exists
  if (fs.existsSync(EMBEDDINGS_FILE_PATH)) {
    let storedData = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE_PATH));

    if (storedData.embeddings.length > 0) {
      let formattedEmbeddings = storedData.embeddings.map(vec =>
        Array.isArray(vec) ? vec : Array.from(vec)
      );

      // Filter out any vectors of the wrong size
      formattedEmbeddings = formattedEmbeddings.filter((vec, idx) => {
        if (vec.length !== DIMENSIONS) {
          console.warn(
            `[FAISS] Skipping vector at storage index ${idx} (length: ${vec.length} != ${DIMENSIONS})`
          );
          return false;
        }
        return true;
      });

      // Try adding vectors to the Faiss index
      try {
        const flatEmbeddings = formattedEmbeddings.flat();
        if (flatEmbeddings.length % DIMENSIONS !== 0) {
          throw new Error(`[FAISS] Flattened array length mismatch!`);
        }

        faissIndex.add(flatEmbeddings);
      } catch (error) {
        console.error(`[FAISS] Error while adding vectors:`, error);
      }
    }
  }

  // Print the number of vectors present in the index after initialization
  console.log(`[FAISS] Initialization complete. Current index size: ${faissIndex.ntotal()}`);
};

const addToIndex = (embeddings, metadata = {}) => {
  if (!faissIndex) throw new Error('[FAISS] Index not initialized!');

  let formattedEmbeddings;

  // Transform embeddings to an array of arrays
  if (embeddings instanceof Float32Array) {
    formattedEmbeddings = [Array.from(embeddings)];
  } else if (Array.isArray(embeddings)) {
    if (embeddings.length > 0 && !Array.isArray(embeddings[0])) {
      formattedEmbeddings = [Array.from(embeddings)];
    } else {
      formattedEmbeddings = embeddings.map(vec => (Array.isArray(vec) ? vec : Array.from(vec)));
    }
  } else {
    throw new Error('[FAISS] Invalid embedding format!');
  }

  // Validate each embedding's dimension
  formattedEmbeddings.forEach((vec, index) => {
    if (vec.length !== DIMENSIONS) {
      throw new Error(`[FAISS] Embedding at index ${index} has invalid dimension: ${vec.length}`);
    }
  });

  try {
    // Flatten for FAISS
    const flatEmbeddings = formattedEmbeddings.flat();
    if (flatEmbeddings.length % DIMENSIONS !== 0) {
      throw new Error(`[FAISS] Flattened array length mismatch!`);
    }

    // Log how many embeddings are about to be added
    console.log(`[FAISS] Adding ${formattedEmbeddings.length} new vector(s) to the index...`);
    // Add them to the Faiss index
    faissIndex.add(flatEmbeddings);

    // Show new total after addition
    console.log(`[FAISS] New index size after addition: ${faissIndex.ntotal()}`);
  } catch (error) {
    console.error('[FAISS] Error while adding vectors:', error);
  }

  // Update local JSON file
  const existingData = fs.existsSync(EMBEDDINGS_FILE_PATH)
    ? JSON.parse(fs.readFileSync(EMBEDDINGS_FILE_PATH))
    : { embeddings: [], metadata: [] };

  // For simplicity, just pushing the first item if there's only one
  existingData.embeddings.push(formattedEmbeddings[0]);
  existingData.metadata.push(metadata);

  fs.writeFileSync(EMBEDDINGS_FILE_PATH, JSON.stringify(existingData, null, 2));
};

const searchIndex = (queryVector, topK) => {
  if (!faissIndex) throw new Error('[FAISS] Index not initialized!');
  if (faissIndex.ntotal() === 0) {
    throw new Error('[FAISS] Faiss index is empty.');
  }

  if (!Array.isArray(queryVector) || !Array.isArray(queryVector[0]) || queryVector[0].length !== DIMENSIONS) {
    throw new Error(`[FAISS] Query vector must be a 2D array with inner arrays of length ${DIMENSIONS}`);
  }

  const queryFlat = queryVector.flat();
  if (queryFlat.length !== DIMENSIONS * queryVector.length) {
    throw new Error(`[FAISS] Flattened query vector length mismatch!`);
  }

  const result = faissIndex.search(queryFlat, topK);

  let distancesResult = result.distances;
  let indicesResult = result.labels;

  if (!Array.isArray(distancesResult[0])) distancesResult = [distancesResult];
  if (!Array.isArray(indicesResult[0])) indicesResult = [indicesResult];

  return {
    distances: distancesResult,
    indices: indicesResult,
  };
};

// Initialize index on load and log the total vectors
initializeIndex();

module.exports = { faissIndex, addToIndex, searchIndex };
