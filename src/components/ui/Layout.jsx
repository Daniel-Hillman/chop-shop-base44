import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, HardDrive, LogIn, LogOut, Zap } from 'lucide-react';
import { Button } from './button';
import LoginModal from './LoginModal';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { name: 'Chopper', href: '/', icon: Music },
  { name: 'My Sessions', href: '/my-sessions', icon: HardDrive },
  { name: 'Latency Test', href: '/latency-test', icon: Zap },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white font-sans">
      <div className="relative min-h-screen w-full backdrop-blur-sm">
        <header className="fixed top-0 left-0 right-0 z-50 p-4">
          <div className="container mx-auto flex justify-between items-center p-3 bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg">
            <Link to='/' className="flex items-center gap-3">
              <Music className="w-8 h-8 text-cyan-400" />
              <h1 className="text-2xl font-bold tracking-tighter">The Chop Shop</h1>
            </Link>
            <nav className="flex items-center gap-2 p-1 bg-white/10 rounded-full border border-white/10">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                    ${location.pathname === item.href
                      ? 'bg-cyan-400 text-black shadow-md'
                      : 'text-gray-300 hover:bg-white/10'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
              {user ? (
                <Button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 bg-red-500 hover:bg-red-600 text-white"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              ) : (
                <Button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 bg-green-500 hover:bg-green-600 text-white"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Button>
              )}
            </nav>
          </div>
        </header>

        <main className="pt-28 pb-10">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
        
        <footer className="fixed bottom-0 left-0 right-0 p-4">
             <div className="container mx-auto text-center text-xs text-white/40">
                <p>For educational and auditioning purposes only. Please support artists by purchasing their music.</p>
             </div>
        </footer>
      </div>
      <LoginModal isOpen={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
    </div>
  );
}
