import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/Dashboard.css'

const Dashboard = () => {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:3000/groups', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGroups(res.data);
      } catch (err) {
        console.error(err);
        setError('Could not fetch groups.');
      }
    };

    fetchGroups();
  }, []);

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      <p>Welcome! Here are the existing project groups:</p>

      <button onClick={() => navigate('/CreateGroup')}>
        Create New Group
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul style={{ marginTop: '1rem' }}>
        {groups.map((group) => (
          <li key={group.id}>
            <Link to={`/groups/${group.id}`}>{group.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
