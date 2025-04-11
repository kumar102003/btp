
const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  filename: { 
    type: String, 
    required: true 
  },
  faissIndex: { 
    type: Number, 
    required: true 
  },
  textSnippet: { 
    type: String 
  },
  uploadDate: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Document', DocumentSchema);
