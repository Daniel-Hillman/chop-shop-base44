import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/ui/Layout';
import ChopperPage from './pages/ChopperPage';
import MySessionsPage from './pages/MySessions';
import { AuthProvider } from './context/AuthContext';
import FeatureTourDialog from './components/ui/FeatureTourDialog';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout>
          <Routes>
            <Route path="/" element={<ChopperPage />} />
            <Route path="/my-sessions" element={<MySessionsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <FeatureTourDialog />
    </AuthProvider>
  );
}

export default App;
