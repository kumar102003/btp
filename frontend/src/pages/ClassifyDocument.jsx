import { useState } from 'react';
import axios from 'axios';

function ClassifyDocument() {
  const [file, setFile] = useState(null);
  const [classification, setClassification] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleClassify = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a document');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5001/api/documents/classifyDocument', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Extract the classification data from the response
      const classificationText = response.data.classification;
      const requiresAction = classificationText.includes('"requiresAction": true');
      const actionTypeMatch = classificationText.match(/"actionType": "([^"]+)"/);
      const briefReasonMatch = classificationText.match(/"briefReason": "([^"]+)"/);
      
      setClassification({
        requiresAction,
        actionType: actionTypeMatch ? actionTypeMatch[1] : 'none',
        briefReason: briefReasonMatch ? briefReasonMatch[1] : 'No reason provided'
      });
    } catch (error) {
      console.error('Error classifying document:', error);
      alert('Error classifying document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType) => {
    // Here you would implement the specific action based on the actionType
    alert(`Action ${actionType} would be performed here`);
  };

  return (
    <div className="container-fluid">
      <h2 className="mb-4">Classify Document</h2>
      <form onSubmit={handleClassify}>
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
          {loading ? 'Classifying...' : 'Classify Document'}
        </button>
      </form>

      {classification && (
        <div className="mt-4">
          <h3>Classification Result</h3>
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">Document Classification</h5>
              <p className="card-text">
                <strong>Requires Action:</strong> {classification.requiresAction ? 'Yes' : 'No'}<br />
                <strong>Action Type:</strong> {classification.actionType}<br />
                <strong>Reason:</strong> {classification.briefReason}
              </p>
            </div>
          </div>

          {classification.requiresAction && classification.actionType !== 'none' && (
            <div className="d-grid gap-2">
              <button
                className="btn btn-success"
                onClick={() => handleAction(classification.actionType)}
              >
                Perform {classification.actionType}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ClassifyDocument; 