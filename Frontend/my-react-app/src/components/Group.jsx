import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/Group.css';

const Group = () => {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:3000/groups/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGroup(res.data);
      } catch (err) {
        console.error(err);
        setError('Could not fetch group details.');
      }
    };

    fetchGroup();
  }, [id]);

  if (error) return <p>{error}</p>;
  if (!group) return <p>Loading...</p>;

  const admins = group.members.filter(m => m.role === 'admin');
  const members = group.members.filter(m => m.role === 'member');

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
        </div>
      </div>
    </div>
  );
};

export default Group;
