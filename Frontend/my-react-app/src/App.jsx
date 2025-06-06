import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Welcome from './components/Welcome';
import Login from './components/Login';
import Register from './components/Register';
import CreateGroup from './components/CreateGroup';
import Group from './components/Group';
import Dashboard from './components/Dashboard';

function App() {




  return (
        <Router>
          <Routes>
            <Route path='/' element={<Welcome/>}/>
            <Route path='/Login' element={<Login/>} />
            <Route path='/Register' element={<Register/>}/>
            <Route path='/CreateGroup' element={<CreateGroup/>}/>
            <Route path="/groups/:id" element={<Group />}/>
            <Route path="/Dashboard" element={<Dashboard />} />
          </Routes>
        </Router>
  )
}

export default App
