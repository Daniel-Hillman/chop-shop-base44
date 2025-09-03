import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/ui/Layout';
import ChopperPage from './pages/ChopperPage';
import MySessionsPage from './pages/MySessions';
import SequencerPage from './pages/SequencerPage';
import SampleDiscoveryPage from './pages/SampleDiscoveryPage';
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
            <Route path="/sequencer" element={<SequencerPage />} />
            <Route path="/sample-discovery" element={<SampleDiscoveryPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <FeatureTourDialog />
    </AuthProvider>
  );
}

export default App;
