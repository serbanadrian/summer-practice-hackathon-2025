import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const [groupsRes, memberRes] = await Promise.all([
          axios.get('http://localhost:3000/groups', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://localhost:3000/user/groups', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setGroups(groupsRes.data);
        setMemberships(memberRes.data); // expected: [{ group_id, status }]
      } catch (err) {
        console.error(err);
        setError('Could not fetch group data.');
      }
    };

    fetchGroups();
  }, [token]);

  const handleRequestJoin = async (groupId) => {
    try {
      await axios.post(`http://localhost:3000/groups/${groupId}/request`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Request sent!');
      // Optionally: refresh memberships
    } catch (err) {
      alert(err.response?.data?.error || 'Could not send request.');
    }
  };

  const isMember = (groupId) =>
    memberships.some((m) => m.group_id === groupId && m.status === 'active');

  const hasPending = (groupId) =>
    memberships.some((m) => m.group_id === groupId && m.status === 'pending');

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      <p>Welcome! Here are the existing project groups:</p>

      <button onClick={() => navigate('/CreateGroup')}>
        Create New Group
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul className="group-list">
        {groups.map((group) => (
          <li key={group.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{group.name}</span>
              {isMember(group.id) ? (
                <button onClick={() => navigate(`/groups/${group.id}`)}>Enter</button>
              ) : hasPending(group.id) ? (
                <span style={{ fontStyle: 'italic', color: '#777' }}>Pending...</span>
              ) : (
                <button onClick={() => handleRequestJoin(group.id)}>Request to Join</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
