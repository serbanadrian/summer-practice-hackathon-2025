import { Link } from 'react-router-dom';
import '../styles/Auth.css';

const Welcome = () => {
  return (
    <div className="auth-container">
      <h1>Welcome to CodeShare</h1>
      <p>Share your code. Get feedback. Improve.</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
        <Link to="/login"><button>Login</button></Link>
        <Link to="/register"><button>Register</button></Link>
      </div>
    </div>
  );
};

export default Welcome;
