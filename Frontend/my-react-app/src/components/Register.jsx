import axios from "axios";
import React, {useState} from "react";
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const Register = () =>{
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) =>{
        e.preventDefault();
        try{ 
            await axios.post('http://localhost:3000/register', {
                userName,
                password,
                confirmPassword,
            },{
                headers: {'Content-Type':'application/json'}
            });
            navigate('/Login');
        }catch(err){
            const errorMessage = err.response?.data?.error;
            console.log(errorMessage);
        }
    }

    return(
        <div className="auth-container">
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <input
                type="text"
                placeholder="Username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                />
                <input 
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                />
                <input 
                type="password" 
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button type="submit">Register</button>
            </form>
        </div>
    );

}
export default Register