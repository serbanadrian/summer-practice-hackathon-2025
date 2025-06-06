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
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [isMember, setIsMember] = useState(false);

  const token = localStorage.getItem('token');
  const decoded = jwtDecode(token);
  const currentUserId = decoded.userId;

    
  const fetchMessages = async () => {
  try {
    const res = await axios.get(`http://localhost:3000/groups/${id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(res.data);
  } catch (err) {
    console.error('Failed to load messages:', err);
  }
};
const fetchFiles = async () => {
  try {
    const res = await axios.get(`http://localhost:3000/groups/${id}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setFiles(res.data);
  } catch (err) {
    console.error('Could not fetch files:', err);
  }
};


    const fetchGroup = async () => {
  try {
    const res = await axios.get(`http://localhost:3000/groups/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setGroup(res.data);

    const members = res.data.members;

    const isAdminUser = members.find(
      m => m.id === currentUserId && m.role === 'admin' && m.status === 'active'
    );
    setIsAdmin(!!isAdminUser);

    const isUserMember = members.some(
      m => m.id === currentUserId && m.status === 'active'
    );
    setIsMember(isUserMember);

    const pendingMembers = members.filter(m => m.status === 'pending');
    setPending(pendingMembers);

  } catch (err) {
    console.error(err);
    setError('Could not fetch group details.');
  }
};

  useEffect(() => {

    fetchGroup();
    fetchMessages();
    fetchFiles();
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

 const handleSendMessage = async (e) => {
  e.preventDefault();
  if (!newMessage.trim()) return;

  try {
    await axios.post(
      `http://localhost:3000/groups/${id}/messages`,
      { content: newMessage },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setNewMessage('');
    fetchMessages();
  } catch (err) {
    console.error('Failed to send message:', err);
  }
};

const handleUploadFile = async (e) => {
  e.preventDefault();
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    await axios.post(`http://localhost:3000/groups/${id}/files`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    setFile(null);
    fetchFiles(); // reîncarcă fișierele
  } catch (err) {
    console.error('Failed to upload file:', err);
  }
};

  return (
    <div className="group-page">
      <div className="group-header">
        <h2>{group.name}</h2>
        <p>{group.description || 'No description provided.'}</p>
      </div>

      <div className="group-body">
        <div className="group-main-content">
          <div className="group-chat">
            <div className="messages">
                {messages.map((msg) => (
                <div key={msg.id} className="message">
                <strong>{msg.username}:</strong> {msg.content}
                <div className="timestamp">{new Date(msg.created_at).toLocaleString()}</div>
            </div>
    ))}
  </div>

  <form onSubmit={handleSendMessage} className="chat-form">
    <input
      type="text"
      value={newMessage}
      onChange={(e) => setNewMessage(e.target.value)}
      placeholder="Type a message..."
    />
    <button type="submit">Send</button>
  </form>
</div>
        </div>
        
        <div className="group-files">
            <h3>Shared Files</h3>

                {isMember && (
                    <form onSubmit={handleUploadFile} className="upload-form">
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                    <button type="submit">Upload</button>
                    </form>
                )}

        <ul className="file-list">
            {files.map((f) => (
            <li key={f.id}>
                <a href={`http://localhost:3000/uploads/${f.filename}`} target="_blank" rel="noreferrer">
                {f.original_name}
                </a>{' '}
             <span className="uploaded-by">by {f.username}</span>
            </li>
         ))}
        </ul>
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
