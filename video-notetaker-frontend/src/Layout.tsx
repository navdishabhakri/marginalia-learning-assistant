import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'

function Layout() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // This grabs the current ?id=123&quiz=mixed part of the URL so we don't lose it!
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

  const isActive = (path: string) => {
    return location.pathname.startsWith(path) ? "nav-item active" : "nav-item";
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="logo">Margin<span>alia</span></div>
        
        <Link to={`/upload${queryString}`} className={location.pathname === '/upload' || location.pathname === '/' ? "nav-item active" : "nav-item"}>
          <span className="nav-num">1</span>Upload
        </Link>
        <Link to={`/processing${queryString}`} className={isActive('/processing')}>
          <span className="nav-num">2</span>Processing
        </Link>
        <Link to={`/notes${queryString}`} className={isActive('/notes')}>
          <span className="nav-num">3</span>Review notes
        </Link>
        <Link to={`/player${queryString}`} className={isActive('/player')}>
          <span className="nav-num">4</span>Watch and sync
        </Link>
        <Link to={`/chat${queryString}`} className={isActive('/chat')}>
          <span className="nav-num">5</span>Ask questions
        </Link>
        <Link to={`/quiz${queryString}`} className={isActive('/quiz')}>
          <span className="nav-num">6</span>Take the quiz
        </Link>
      </div>
      
      <div className="main">
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout;