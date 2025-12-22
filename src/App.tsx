import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { OnlineUsers } from './pages/OnlineUsers';
import { Users } from './pages/Users';
import { Rooms } from './pages/Rooms';
import { Recordings } from './pages/Recordings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Home />} />
          <Route path="/online" element={<OnlineUsers />} />
          <Route path="/users" element={<Users />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/recordings" element={<Recordings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
