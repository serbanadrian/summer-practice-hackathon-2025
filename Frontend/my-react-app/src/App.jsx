import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './components/Welcome';
import Login from './components/Login';
import Register from './components/Register';

function App() {




  return (
        <Router>
          <Routes>
            <Route path='/' element={<Welcome/>}/>
            <Route path='/Login' element={<Login/>} />
            <Route path='/Register' element={<Register/>}/>
          </Routes>
        </Router>
  )
}

export default App
