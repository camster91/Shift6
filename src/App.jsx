import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import LogPage from './pages/LogPage';
import GoalsPage from './pages/GoalsPage';
import ProgressPage from './pages/ProgressPage';

const tabs = [
  { id: 'dashboard', label: 'Home', icon: '◉' },
  { id: 'log', label: 'Log', icon: '+' },
  { id: 'goals', label: 'Goals', icon: '★' },
  { id: 'progress', label: 'Progress', icon: '📈' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <main className="flex-1 overflow-y-auto pb-16">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'log' && <LogPage />}
        {activeTab === 'goals' && <GoalsPage />}
        {activeTab === 'progress' && <ProgressPage />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-around">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-2 px-4 ${
                activeTab === tab.id ? 'text-blue-400' : 'text-gray-500'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
