import { useState } from 'react';
import axios from 'axios';

function CompareDocuments() {
  const [files, setFiles] = useState({ doc1: null, doc2: null });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e, docNumber) => {
    setFiles(prev => ({ ...prev, [docNumber]: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.doc1 || !files.doc2) {
      alert('Please select both documents');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('document', files.doc1);
    formData.append('document', files.doc2);

    try {
      const response = await axios.post('http://localhost:5001/api/documents/compare', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error comparing documents:', error);
      alert('Error comparing documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <h2 className="mb-4">Compare Documents</h2>
      <form onSubmit={handleSubmit}>
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="doc1" className="form-label">First Document</label>
              <input
                type="file"
                className="form-control"
                id="doc1"
                onChange={(e) => handleFileChange(e, 'doc1')}
                accept=".pdf,.doc,.docx"
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="doc2" className="form-label">Second Document</label>
              <input
                type="file"
                className="form-control"
                id="doc2"
                onChange={(e) => handleFileChange(e, 'doc2')}
                accept=".pdf,.doc,.docx"
              />
            </div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Comparing...' : 'Compare Documents'}
        </button>
      </form>

      {result && result.inference && (
        <div className="mt-4">
          <h3>Comparison Analysis</h3>
          <div className="card">
            <div className="card-body">
              <div 
                className="comparison-text"
                style={{ 
                  whiteSpace: 'pre-line',
                  lineHeight: '1.6'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: result.inference
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n\n/g, '<br/><br/>')
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompareDocuments; 