const DIMENSIONS = 768;

let pipeline;
const loadPipeline = async () => {
  if (!pipeline) {
    const { pipeline: pl } = await import('@xenova/transformers');
    pipeline = pl;
  }
  return pipeline;
};

const generateEmbedding = async (text) => {
  try {
    console.log('[Embedding] Starting embedding generation for text of length:', text.length);

    const pipe = await loadPipeline();
    const model = await pipe('feature-extraction', 'Xenova/all-mpnet-base-v2');

    const output = await model(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Slice the first 768 elements
    const embedding = Array.from(output.data.slice(0, DIMENSIONS));

    if (embedding.length !== DIMENSIONS) {
      throw new Error(`Embedding dimension mismatch: ${embedding.length}`);
    }

    console.log('[Embedding] Embedding generated successfully. Dimensions:', embedding.length);

    return new Float32Array(embedding);
  } catch (error) {
    console.error('[Embedding] Embedding generation failed:', error);
    throw error;
  }
};

module.exports = {
  generateEmbedding,
};
