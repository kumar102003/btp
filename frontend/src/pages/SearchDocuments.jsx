import { useState } from 'react';
import axios from 'axios';

function SearchDocuments() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a document');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('files', file);

    try {
      const response = await axios.post('http://localhost:5001/api/documents/search', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error searching documents:', error);
      alert('Error searching documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchPercentage = (distance) => {
    // Convert distance to percentage (higher distance = lower match)
    // Ensure the percentage is between 0 and 100
    const percentage = Math.max(0, Math.min(100, (1 - distance) * 100));
    return Math.round(percentage);
  };

  return (
    <div className="container-fluid">
      <h2 className="mb-4">Search Related Court Judgments</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="document" className="form-label">Select Document</label>
          <input
            type="file"
            className="form-control"
            id="document"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search Related Judgments'}
        </button>
      </form>

      {result && result.results && (
        <div className="mt-4">
          <h3>Search Results</h3>
          {result.results.map((item, index) => {
            const matchPercentage = calculateMatchPercentage(item.distance);
            return (
              <div key={index} className="card mb-3">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">{item.document.filename}</h5>
                  <span className="badge bg-primary">
                    Match: {matchPercentage}%
                  </span>
                </div>
                <div className="card-body">
                  <div className="mb-2">
                    <small className="text-muted">FAISS Index: {item.document.faissIndex}</small>
                  </div>
                  <div className="text-snippet">
                    <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
                      {item.document.textSnippet}
                    </p>
                  </div>
                </div>
                <div className="card-footer text-muted">
                  <small>Uploaded: {new Date(item.document.uploadDate).toLocaleDateString()}</small>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SearchDocuments; 