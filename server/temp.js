const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fetch = require('node-fetch'); // Ensure node-fetch is installed
require('dotenv').config();

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Provided extractTextFromDocument function, now using "file" as input.
const extractTextFromDocument = async (filePath) => {
  const fileExtension = path.extname(filePath).toLowerCase();

  if (fileExtension === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } else if (fileExtension === '.docx') {
    const buffer = fs.readFileSync(filePath);
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  } else if (fileExtension === '.txt' || fileExtension === '.cpp') {
    return fs.readFileSync(filePath, 'utf8');
  } else {
    throw new Error('Unsupported file type');
  }
};

// Main API controller function to classify the document.
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
              "Analyze the following legal document and determine if it requires any legal action. " +
              "Output in this exact JSON format: { \"requiresAction\": true/false, \"actionType\": \"reply | affidavit | application | none\", \"briefReason\": \"brief explanation why this action is needed or not\" }"
          }
        ]
      },
      { role: "user", parts: [{ text: `Document: ${text}` }] }
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

// Set up the API route using the 'file' field name.
router.post('/classifyDocument', upload.single('file'), classifyDocument);

module.exports = router;
const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const router = express.Router();

// -------------------
// Generate Reply Draft
// -------------------
router.post('/generateReply', async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }

    const prompt = `Based on the following legal document, draft a professional legal reply. Use formal legal language and include all relevant details.\n\nDocument:\n${documentText}`;
    
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
    const draft = data.candidates?.[0]?.content?.parts?.[0]?.text || "No draft generated";

    return res.status(200).json({ success: true, draft });
  } catch (error) {
    console.error("Error generating reply draft:", error);
    return res.status(500).json({ error: error.message });
  }
});

// -------------------
// Generate Affidavit Draft
// -------------------
router.post('/generateAffidavit', async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }

    const prompt = `Based on the following legal document, draft a professional affidavit. Ensure the draft is formatted as a sworn statement, includes a clear statement of facts, and uses formal language.\n\nDocument:\n${documentText}`;

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
    const draft = data.candidates?.[0]?.content?.parts?.[0]?.text || "No draft generated";

    return res.status(200).json({ success: true, draft });
  } catch (error) {
    console.error("Error generating affidavit draft:", error);
    return res.status(500).json({ error: error.message });
  }
});

// -------------------
// Generate Application Draft
// -------------------
router.post('/generateApplication', async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }

    const prompt = `Based on the following legal document, draft a professional legal application. Include all necessary details, use formal language, and ensure the draft is properly formatted for a legal application submission.\n\nDocument:\n${documentText}`;

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
    const draft = data.candidates?.[0]?.content?.parts?.[0]?.text || "No draft generated";

    return res.status(200).json({ success: true, draft });
  } catch (error) {
    console.error("Error generating application draft:", error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
