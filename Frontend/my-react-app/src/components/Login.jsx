import axios from 'axios';
import React, {useState} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const Login = () =>{
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try{
            const response = await axios.post('http://localhost:3000/login',{
                userName,
                password,
            },{
                headers: {'Content-Type':'application/json'},
            }
        );
        localStorage.setItem('token',response.data.token);
        navigate('/Dashboard')
        }catch(err){
            const errorMessage = err.response?.data?.error;
            console.log(errorMessage);
        }
    }

    return(
        <div className="auth-container">
            <h1>Login</h1>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text"
                    placeholder="UserName"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                />
                <input
                    type="password"
                    placeholder='Password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type='submit'>Login</button>
            </form>
            <p>Don't have an account? <Link to="/Register">Register</Link></p>
        </div>
    );
}
export default Login