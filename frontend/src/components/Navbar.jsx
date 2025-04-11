import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand" to="/">Document Processor</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav">
            <li className="nav-item">
              <Link className="nav-link" to="/">Compare Documents</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/summarize">Summarize Documents</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/search">Search Documents</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/classify">Classify Document</Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 