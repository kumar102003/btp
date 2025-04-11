const { extractTextFromDocument, splitTextIntoChunks } = require('../utils/extractTextUtil');
const { fetchWithRetry } = require('../utils/fetchWithRetry');
//const { getPineconeIndex } = require('../utils/pineconeClient');
const { generateEmbedding } = require('../utils/embeddingUtil');
const { addToIndex, searchIndex, faissIndex } = require('../utils/faissUtil');
const OpenAI = require("openai");
const pdfParse = require('pdf-parse');

const fs = require('fs');
const axios = require('axios');
require('dotenv').config(); 
const Document = require('../models/Document');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const compareDocuments = async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'Please upload two documents.' });
    }

    const filePaths = req.files.map((file) => file.path);
    const texts = await Promise.all(filePaths.map((filePath) => extractTextFromDocument(filePath)));

    if (!texts[0] || !texts[1]) {
      return res.status(400).json({ error: 'Both documents must contain text.' });
    }

    const contents = [
      { role: "user", parts: [{ text: "Please compare the following documents. Focus on the key points, differences, and key insights." }] },
      { role: "user", parts: [{ text: `Document 1:\n${texts[0]}` }] },
      { role: "user", parts: [{ text: `Document 2:\n${texts[1]}` }] },
    ];

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const inference = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No inference generated';
    res.status(200).json({ inference, document1Text: texts[0], document2Text: texts[1] });

    // cleanup uploaded files
    filePaths.forEach((path) => fs.unlinkSync(path));
  } catch (error) {
    console.error('Error comparing documents:', error);
    res.status(500).json({ error: error.message || 'Failed to process documents' });
  }
};

const summarizeDocument = async (req, res) => {
  try {
    if (!req.files || req.files.length < 1) {
      return res.status(400).json({ error: "Please upload a document." });
    }

    const filePath = req.files[0].path;
    const text = await extractTextFromDocument(filePath);

    if (!text) {
      return res.status(400).json({ error: "Document must contain text." });
    }

    const contents = [
      {
        role: "user",
        parts: [{ text: "Summarize the following court notice, categorize it, and provide detailed steps to follow." }],
      },
      { role: "user", parts: [{ text: `Document: ${text}` }] },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      throw new Error(`Gemini API call failed with status ${response.status}: ${response.statusText}\nResponse: ${errorResponse}`);
    }

    const data = await response.json();
    const inference = data.candidates?.[0]?.content?.parts?.[0]?.text || "No inference generated";

    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      inference,
      documentText: text,
    });

  } catch (error) {
    console.error("Error summarizing document:", error);
    return res.status(500).json({ error: error.message || "Failed to process document" });
  }
};

const summarizeMultipleDocuments = async (req, res) => {
  try {
    if (!req.files || req.files.length < 1) {
      return res.status(400).json({ error: 'Please upload at least one document.' });
    }

    const responseData = [];

    for (const file of req.files) {
      const { path: filePath, mimetype, originalname } = file;

      try {
        const text = await extractTextFromDocument(filePath, mimetype);

        if (!text.trim()) {
          responseData.push({
            filename: originalname,
            category: 'Unknown',
            summaries: ['The document contains no text to analyze.'],
          });
          continue;
        }

        const contents = [
          {
            parts: [
              {
                text: "Analyze the following document and provide two sections: 'Categorie' and 'Summaries'. Each section should be clearly labeled, with 'Categorie' containing a single category summarizing the document and 'Summaries' providing concise and easy explanations (3–4 lines each).",
              },
            ],
            role: 'user',
          },
          { parts: [{ text: `Document: ${text}` }], role: 'user' },
        ];

        const geminiResponse = await fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents }),
          }
        );

        const etext = geminiResponse.candidates[0]?.content?.parts[0]?.text;

        let category = '';
        const summaries = [];
        const lines = etext.split('\n').map((line) => line.trim()).filter((line) => line);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes('**categorie**')) {
            category = lines[i + 1]?.trim() || '';
            i++;
          } else if (line.toLowerCase().includes('**summaries**')) {
            for (let j = i + 1; j < lines.length; j++) {
              summaries.push(lines[j]);
            }
            break;
          }
        }

        const trimmedSummaries = summaries.slice(0, 4);

        responseData.push({
          filename: originalname,
          category,
          summaries: trimmedSummaries,
        });
      } catch (error) {
        responseData.push({
          filename: originalname,
          category: 'Error',
          summaries: [error.message || 'Failed to process the document.'],
        });
      } finally {
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Error deleting file ${filePath}:`, err.message);
        });
      }
    }

    res.status(200).json({ results: responseData });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to process documents.' });
  }
};

async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error fetching embedding from OpenAI:", error);
    return null;
  }
}

// const uploadEmbeddings = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "Please upload a document." });
//     }

//     const filePath = req.file.path;
//     const text = await extractTextFromDocument(filePath);

//     if (!text) {
//       return res.status(400).json({ error: "Document must contain text." });
//     }

//     const textChunks = splitTextIntoChunks(text);
//     const vectors = [];
//     for (let i = 0; i < textChunks.length; i++) {
//       const embedding = await getEmbedding(textChunks[i]);
//       if (embedding) {
//         vectors.push({
//           id: `chunk-${Date.now()}-${i}`,
//           values: embedding,
//           metadata: {
//             chunkIndex: i,
//             filename: req.file.originalname,
//           },
//         });
//       }
//     }

//     if (vectors.length === 0) {
//       return res.status(400).json({ error: "No embeddings were generated." });
//     }

//     const index = await getPineconeIndex();
//     await index.upsert(vectors);

//     res.status(200).json({ message: "Judgment uploaded successfully!" });
//     fs.unlinkSync(filePath);
//   } catch (error) {
//     console.error("Error uploading judgment:", error);
//     res.status(500).json({ error: "Failed to upload judgment." });
//   }
// };

// const queryEmbeddings = async (req, res) => {
//   try {
//     const { queryText } = req.body;

//     if (!queryText) {
//       return res.status(400).json({ error: 'Please provide a query text.' });
//     }

//     const queryEmbedding = await getEmbedding(queryText);
//     if (!queryEmbedding) {
//       return res.status(500).json({ error: 'Failed to generate query embedding.' });
//     }

//     const index = await getPineconeIndex();
//     const results = await index.query({
//       vector: queryEmbedding,
//       topK: 5,
//       includeMetadata: true,
//     });

//     const aggregatedResults = {};
//     results.matches.forEach((match) => {
//       const filename = match.metadata.filename;
//       if (!aggregatedResults[filename]) {
//         aggregatedResults[filename] = { score: 0, count: 0 };
//       }
//       aggregatedResults[filename].score += match.score;
//       aggregatedResults[filename].count += 1;
//     });

//     const finalResults = Object.entries(aggregatedResults)
//       .map(([filename, data]) => ({
//         filename,
//         averageScore: data.score / data.count,
//       }))
//       .sort((a, b) => b.averageScore - a.averageScore);

//     res.status(200).json({ matches: finalResults.slice(0, 5) });
//   } catch (error) {
//     console.error('Error querying embeddings:', error);
//     res.status(500).json({ error: error.message || 'Failed to query embeddings.' });
//   }
// };

const mostRelevent = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a document.' });
    }

    const filePath = req.file.path;
    const text = await extractTextFromDocument(filePath);

    if (!text) {
      return res.status(400).json({ error: 'Document must contain text.' });
    }

    const contents = [
      { parts: [{ text: "categorize the court document and find the most relevant  atleast 2-5 past court judgment related to it." }], role: "user" },
      { parts: [{ text: `Document: ${text}` }], role: "user" },
    ];

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Summarize the court document and find the most relevant past Supreme Court judgment for it. Document: ${text}` }], role: "user" }] })
      }
    );

    const inference = response.candidates[0]?.content || 'No inference generated';
    res.status(200).json({ inference, documentText: text });

    fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ error: error.message || 'Failed to process document' });
  }
};

const mostReleventusingText = async (req, res) => {
  try {
    const { queryText } = req.body;

    if (!queryText) {
      return res.status(400).json({ error: 'Please provide a valid court document text in JSON format.' });
    }

    const prompt = `
      Find the most relevant 2-5 past court judgments related to the following court document:
      Court Document:
      ${queryText}

      Provide the related judgments in the following format:
      1. Case Title: [Title of Case]
         Court: [Court Name]
         Date of Judgment: [Date]
         Summary: [Brief Summary]
    `;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a legal assistant AI providing case law analysis." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const inference = aiResponse.choices[0]?.message?.content || 'No relevant judgments found.';
    res.status(200).json({ inference, queryText });
  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ error: error.message || 'Failed to process document' });
  }
};

const generateMetadata = (file, text) => ({
  filename: file ? file.originalname : 'text-input.txt',
  uploadDate: new Date().toISOString(),
  textSnippet: text.substring(0, 200) + '...',
  size: file ? file.size : text.length,
  mimeType: file ? file.mimetype : 'text/plain'
});

const addDocument = async (req, res) => {
  try {
    let text;
    let filename;

    if (req.file) {
      filename = req.file.originalname;
      text = await extractTextFromDocument(req.file.path);
      fs.unlinkSync(req.file.path);
    } else if (req.body.text) {
      filename = 'text-input.txt';
      text = req.body.text;
    } else {
      throw new Error('No file or text provided. Please upload a PDF or provide text input.');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Extracted text is empty. Ensure the PDF contains text.');
    }

    const embedding = await generateEmbedding(text);
    if (!(embedding instanceof Float32Array)) {
      throw new Error('Generated embedding is not a Float32Array. Check `generateEmbedding` function.');
    }

    const formattedEmbedding = [Array.from(embedding)];
    addToIndex(formattedEmbedding, { 
      filename,
      textSnippet: text.substring(0, 200),
      uploadDate: new Date()
    });

    const newFaissIndex = faissIndex.ntotal() - 1;

    const newDoc = await Document.create({
      filename,
      faissIndex: newFaissIndex,
      textSnippet: text.substring(0, 200)
    });

    res.json({ message: 'Document added successfully!', document: newDoc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const searchDocuments = async (req, res) => {
  try {
    let queryText;

    if (req.file) {
      queryText = await extractTextFromDocument(req.file.path);
      fs.unlinkSync(req.file.path);
    } else if (req.body.query) {
      queryText = req.body.query;
    } else {
      throw new Error('No file or query text provided.');
    }

    if (faissIndex.ntotal() === 0) {
      throw new Error('FAISS index is empty. Add documents before performing a search.');
    }

    const embedding = await generateEmbedding(queryText);
    const queryVector = Array.from(embedding);
    const query2D = [queryVector];

    const { distances, indices } = searchIndex(query2D, 4);

    if (!indices || indices.length === 0 || !indices[0] || indices[0].length === 0) {
      throw new Error('No results found from FAISS.');
    }

    const faissIndices = indices[0];
    const faissDistances = distances[0];

    const results = await Promise.all(
      faissIndices.map(async (faissIdx, i) => {
        const doc = await Document.findOne({ faissIndex: faissIdx });
        return {
          document: doc,
          distance: faissDistances[i]
        };
      })
    );

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const addDocuments = async (req, res) => {
  try {
    // Check that files were uploaded
    if (!req.files || req.files.length === 0) {
      throw new Error('No files provided. Please upload 1–10 documents.');
    }
    
    // Ensure no more than 10 files are processed at once
    if (req.files.length > 10) {
      throw new Error('You can only upload up to 10 documents at a time.');
    }

    const processedDocs = [];

    // Process each file in the request
    for (const file of req.files) {
      const filename = file.originalname;

      // Extract text from the file and clean up temporary file
      const text = await extractTextFromDocument(file.path);
      fs.unlinkSync(file.path);

      if (!text || text.trim().length === 0) {
        throw new Error(`Extracted text is empty in file "${filename}". Ensure the PDF contains text or is not corrupted.`);
      }

      // Generate embedding
      const embedding = await generateEmbedding(text);
      if (!(embedding instanceof Float32Array)) {
        throw new Error(
          `Generated embedding is not a Float32Array for "${filename}". Check generateEmbedding function.`
        );
      }

      // Format embedding for indexing
      const formattedEmbedding = [Array.from(embedding)];

      // Add embedding + metadata to your index
      addToIndex(formattedEmbedding, {
        filename,
        textSnippet: text.substring(0, 200),
        uploadDate: new Date(),
      });

      // The new Faiss index is last index item
      const newFaissIndex = faissIndex.ntotal() - 1;

      // Persist metadata in the database
      const newDoc = await Document.create({
        filename,
        faissIndex: newFaissIndex,
        textSnippet: text.substring(0, 200),
      });

      // Collect the document details for the response
      processedDocs.push(newDoc);
    }

    // Return all processed documents
    res.json({
      message: 'Documents added successfully!',
      documents: processedDocs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const classifyDocument = async (req, res) => {
  try {
    // Since we're using upload.single('file'), the file is stored in req.file
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a document." });
    }

    const filePath = req.file.path;
    const text = await extractTextFromDocument(filePath);

    if (!text) {
      return res.status(400).json({ error: "Document must contain text." });
    }

    // Prepare the structured prompt using the 'contents' format.
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: 
    `You are a legal document classifier. 
    Your task is to analyze the given legal document and determine:
    - Whether any legal action is required.
    - If yes, what kind of legal action (choose one: reply, affidavit, application).
    - Provide a brief explanation.
    
    Strictly output your response in **this JSON format only**:
    
    {
      "requiresAction": true/false,
      "actionType": "reply | affidavit | application | none",
      "briefReason": "brief explanation why this action is needed or not"
    }
    
    Document:
    ${text}
    `
          }
        ]
      }
    ];
    
    // Define the Gemini API URL using your API key from environment variables.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    console.log("\nSending request to Gemini API...");
    console.log("API URL:", url);
    console.log("Request Body:", JSON.stringify({ contents }, null, 2));

    // Make the API request.
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    });

    console.log("Received response from Gemini API...");
    console.log("Response Status:", response.status);
    console.log("Response Status Text:", response.statusText);

    if (!response.ok) {
      const errorResponse = await response.text();
      console.error("API ERROR RESPONSE:", errorResponse);
      throw new Error(
        `Gemini API call failed with status ${response.status}: ${response.statusText}\nResponse: ${errorResponse}`
      );
    }

    const data = await response.json();
    console.log("Gemini API Response Data:", JSON.stringify(data, null, 2));

    // Extract the classification inference from the response.
    const inference =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No inference generated";

    // Delete the uploaded file after processing.
    fs.unlinkSync(filePath);

    // Return the classification result.
    return res.status(200).json({
      success: true,
      classification: inference,
      documentText: text
    });
  } catch (error) {
    console.error("Error classifying document:", error);
    return res.status(500).json({ error: error.message || "Failed to process document" });
  }
};

const callGeminiAPI = async (prompt) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: prompt }] }
      ]
    })
  });

  if (!response.ok) {
    const errorResponse = await response.text();
    throw new Error(`Gemini API call failed with status ${response.status}: ${response.statusText}\nResponse: ${errorResponse}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No draft generated";
};

const generateReply = async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }

    const prompt = `Based on the following legal document, draft a professional legal reply. Use formal legal language and include all relevant details.\n\nDocument:\n${documentText}`;
    const draft = await callGeminiAPI(prompt);
    
    return res.status(200).json({ success: true, draft });
  } catch (error) {
    console.error("Error generating reply draft:", error);
    return res.status(500).json({ error: error.message });
  }
};

const generateAffidavit = async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }

    const prompt = `Based on the following legal document, draft a professional affidavit. Ensure the draft is formatted as a sworn statement, includes a clear statement of facts, and uses formal language.\n\nDocument:\n${documentText}`;
    const draft = await callGeminiAPI(prompt);
    
    return res.status(200).json({ success: true, draft });
  } catch (error) {
    console.error("Error generating affidavit draft:", error);
    return res.status(500).json({ error: error.message });
  }
};

const generateApplication = async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }

    const prompt = `Based on the following legal document, draft a professional legal application. Include all necessary details, use formal language, and ensure the draft is properly formatted for a legal application submission.\n\nDocument:\n${documentText}`;
    const draft = await callGeminiAPI(prompt);
    
    return res.status(200).json({ success: true, draft });
  } catch (error) {
    console.error("Error generating application draft:", error);
    return res.status(500).json({ error: error.message });
  }
};
module.exports = {
  compareDocuments,
  summarizeDocument,
  summarizeMultipleDocuments,
  // uploadEmbeddings,
  // queryEmbeddings,
  mostRelevent,
  mostReleventusingText,
  searchDocuments,
  addDocument,
  addDocuments,
  generateReply,
  generateAffidavit,
  generateApplication,
  classifyDocument
};
