import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreateGroup = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!name.trim()) {
      setMessage('Group name is required.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await axios.post('http://localhost:3000/groups', {
        name,
        description,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      setMessage(`Group "${res.data.group.name}" created successfully!`);
      setName('');
      setDescription('');
      navigate('/Dashboard')
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to create group.';
      setMessage(errorMsg);
    }
  };

  return (
    <div className="auth-container">
      <h2>Create a New Group</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
        <button type="submit">Create Group</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default CreateGroup;
