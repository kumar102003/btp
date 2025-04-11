import { useState } from 'react';
import axios from 'axios';

function SummarizeDocuments() {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 10) {
      alert('Maximum 10 documents allowed');
      return;
    }
    setFiles(selectedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      alert('Please select at least one document');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('document', file);
    });

    try {
      const response = await axios.post('http://localhost:5001/api/documents/summarize-multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error summarizing documents:', error);
      alert('Error summarizing documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <h2 className="mb-4">Summarize Documents</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="documents" className="form-label">Select Documents (1-10)</label>
          <input
            type="file"
            className="form-control"
            id="documents"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx"
            multiple
          />
          <div className="form-text">You can select up to 10 documents</div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Summarizing...' : 'Summarize Documents'}
        </button>
      </form>

      {result && result.results && (
        <div className="mt-4">
          <h3>Summary Results</h3>
          {result.results.map((doc, index) => (
            <div key={index} className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">{doc.filename}</h5>
                <small className="text-muted">Category: {doc.category}</small>
              </div>
              <div className="card-body">
                {doc.summaries.map((summary, summaryIndex) => (
                  <div key={summaryIndex} className="mb-3">
                    <div dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SummarizeDocuments; 