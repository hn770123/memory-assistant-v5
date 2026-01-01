import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ChatWindow } from './components/chat/ChatWindow';
import MemoryList from './components/memory/MemoryList';
import MemorySearch from './components/memory/MemorySearch';

type View = 'chat' | 'memories' | 'search';

function App() {
  const { user, loading, logout } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [currentView, setCurrentView] = useState<View>('chat');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        {showRegister ? (
          <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <LoginForm onSwitchToRegister={() => setShowRegister(true)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">
            Memory Assistant v5
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user.display_name || user.email}
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* ナビゲーション */}
        <nav className="px-6 py-2 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('chat')}
              className={`px-4 py-2 rounded-md transition-colors ${
                currentView === 'chat'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              チャット
            </button>
            <button
              onClick={() => setCurrentView('memories')}
              className={`px-4 py-2 rounded-md transition-colors ${
                currentView === 'memories'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              メモリ管理
            </button>
            <button
              onClick={() => setCurrentView('search')}
              className={`px-4 py-2 rounded-md transition-colors ${
                currentView === 'search'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              メモリ検索
            </button>
          </div>
        </nav>
      </header>

      <main className="flex-1 overflow-auto">
        {currentView === 'chat' && <ChatWindow />}
        {currentView === 'memories' && <MemoryList />}
        {currentView === 'search' && <MemorySearch />}
      </main>
    </div>
  );
}

export default App;
