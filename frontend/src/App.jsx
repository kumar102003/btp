import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from './components/Navbar';
import CompareDocuments from './pages/CompareDocuments';
import SummarizeDocuments from './pages/SummarizeDocuments';
import SearchDocuments from './pages/SearchDocuments';
import ClassifyDocument from './pages/ClassifyDocument';

function App() {
  return (
    <Router>
      <div className="min-vh-100 bg-light">
        <Navbar />
        <main className="container-fluid px-4 py-4">
          <div className="row justify-content-center">
            <div className="col-12">
              <Routes>
                <Route path="/" element={<CompareDocuments />} />
                <Route path="/summarize" element={<SummarizeDocuments />} />
                <Route path="/search" element={<SearchDocuments />} />
                <Route path="/classify" element={<ClassifyDocument />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
