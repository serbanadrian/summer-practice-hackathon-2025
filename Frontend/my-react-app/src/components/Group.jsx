import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import '../styles/Group.css';

const Group = () => {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const token = localStorage.getItem('token');
  const decoded = jwtDecode(token);
  const currentUserId = decoded.userId;

    const fetchGroup = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/groups/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setGroup(res.data);

        const member = res.data.members.find(
          m => m.id === currentUserId && m.role === 'admin' && m.status === 'active'
        );
        setIsAdmin(!!member);

        const pendingMembers = res.data.members.filter(m => m.status === 'pending');
        setPending(pendingMembers);
      } catch (err) {
        console.error(err);
        setError('Could not fetch group details.');
      }
    };

  useEffect(() => {

    fetchGroup();
  }, [id, token, currentUserId]);

  const handleApprove = async (userId) => {
    try {
      await axios.patch(
        `http://localhost:3000/groups/${id}/approve/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPending(prev => prev.filter(u => u.id !== userId));
      fetchGroup();
    } catch (err) {
      console.error(err);
      alert('Failed to approve user.');
    }
  };

  if (error) return <p>{error}</p>;
  if (!group) return <p>Loading...</p>;

  const admins = group.members.filter(m => m.role === 'admin' && m.status === 'active');
  const members = group.members.filter(m => m.role === 'member' && m.status === 'active');

  return (
    <div className="group-page">
      <div className="group-header">
        <h2>{group.name}</h2>
        <p>{group.description || 'No description provided.'}</p>
      </div>

      <div className="group-body">
        <div className="group-main-content">
          <p>This space is reserved for future content like project lists, discussions, etc.</p>
        </div>

        <div className="group-members">
          <h3>Admins</h3>
          <ul>
            {admins.map(user => (
              <li key={user.id}>{user.username}</li>
            ))}
          </ul>

          <h3>Members</h3>
          <ul>
            {members.map(user => (
              <li key={user.id}>{user.username}</li>
            ))}
          </ul>

          {isAdmin && (
            <div className="admin-panel">
              <h3>Pending Join Requests</h3>
              {pending.length === 0 ? (
                <p>No pending requests</p>
              ) : (
                <ul>
                  {pending.map(user => (
                    <li key={user.id}>
                      {user.username}
                      <button onClick={() => handleApprove(user.id)}>Accept</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Group;
