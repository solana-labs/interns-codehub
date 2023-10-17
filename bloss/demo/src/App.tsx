import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { CardList } from './pages/CardList';
import { CardSign } from './pages/CardSign';

function App() {
  return (
    <div className="w-popup-max bg-stone-800">
      <Router>
        <Header />
        <Routes>
          <Route path='/' element={<CardList />} />
          <Route path='/sign' element={<CardSign />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
