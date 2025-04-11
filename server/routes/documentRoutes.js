
const express = require('express');
const multer = require('../middleware/multerConfig');
const upload = require('../middleware/multerConfig');
const {
  compareDocuments,
  summarizeDocument,
  summarizeMultipleDocuments,
//   uploadEmbeddings,
//   queryEmbeddings,
  mostRelevent,
  mostReleventusingText,
  searchDocuments,
  addDocument,
  addDocuments,
  generateReply,
    generateAffidavit,
    generateApplication,
    classifyDocument
} = require('../controllers/documentController');
const { extractTextFromDocument ,extractJsonFromMarkdown  } = require('../utils/extractTextUtil');
const { fetchWithRetry } = require('../utils/fetchWithRetry');
const fs = require('fs');

const router = express.Router();

router.post('/compare', multer.array('document', 2), compareDocuments);
router.post('/summarize', multer.array('document', 1), summarizeDocument);
router.post('/summarize-multiple', multer.array('document', 10), summarizeMultipleDocuments);
// router.post('/upload-embeddings', multer.single('file'), uploadEmbeddings);
// router.post('/query-embeddings', queryEmbeddings);
router.post('/mostrelevent', multer.single('file'), mostRelevent);
router.post('/mostReleventusingText', mostReleventusingText);
router.post('/add', multer.single('file'), addDocument);
router.post('/search', multer.single('file'), searchDocuments);
router.post('/addDocuments', multer.array('files', 10), addDocuments);
router.post('/generateReply', generateReply);
// Route: Generate an affidavit draft
router.post('/generateAffidavit', generateAffidavit);
// Route: Generate a legal application draft
router.post('/generateApplication', generateApplication);
// Route: Classify a legal document (with file upload)
router.post('/classifyDocument', multer.single('file'), classifyDocument);


module.exports = router;
