
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse'); 
const mammoth = require('mammoth');

const extractTextFromDocument = async (filePath) => {
  const fileExtension = path.extname(filePath).toLowerCase();

  if (fileExtension === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
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

const extractJsonFromMarkdown = (markdownText) => {
  if (typeof markdownText !== 'string') {
    throw new TypeError('markdownText is not a string.');
  }

  const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = markdownText.match(codeBlockRegex);

  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      throw new Error('Failed to parse JSON from Gemini API response.');
    }
  }

  try {
    return JSON.parse(markdownText);
  } catch (error) {
    throw new Error('AI response does not contain valid JSON.');
  }
};

function splitTextIntoChunks(text, maxTokens = 4000) {
  const words = text.split(" ");
  const chunks = [];
  for (let i = 0; i < words.length; i += maxTokens) {
    chunks.push(words.slice(i, i + maxTokens).join(" "));
  }
  return chunks;
}

module.exports = { extractTextFromDocument, splitTextIntoChunks, extractJsonFromMarkdown };
