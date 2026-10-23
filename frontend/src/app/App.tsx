import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useItems } from '../hooks/useItems';
import { useVisitorTracker } from '../hooks/useVisitorTracker';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { Dashboard } from '../features/dashboard/Dashboard';
import { ItemList } from '../features/items/ItemList';
import { ReportItemForm } from '../features/items/ReportItemForm';
import { ClaimsList } from '../features/claims/ClaimsList';
import { NotificationList } from '../features/notifications/NotificationList';
import { AnalyticsDashboard } from '../features/analytics/AnalyticsDashboard';
import { AdminHub } from '../features/admin/AdminHub';
import { CampusMap } from '../features/map/CampusMap';
import { UserSettings } from '../features/settings/UserSettings';
import { ItemModal } from '../features/items/ItemModal';
import { LandingPage } from '../features/landing/LandingPage';
import { AuthModal, AuthMode } from '../features/auth/AuthModal';
import { ToastProvider, useToast } from '../context/ToastContext';
import { Item } from '../types';

function AppContent() {
  const toast = useToast();
  const { user, loading: authLoading, login, register, verifyEmail, logout, updateUser } = useAuth();
  const { items, loading: itemsLoading, addItem, fetchItems } = useItems();
  
  // Default to landing page when unauthenticated, or dashboard when already logged in
  const [activeTab, setActiveTab] = useState<string>(() => {
    const token = localStorage.getItem('token');
    return token ? 'dashboard' : 'landing';
  });

  // Privacy-friendly passive visitor session & activity telemetry
  useVisitorTracker({ user, currentPath: `/${activeTab}` });

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Auth modal management for seamless landing page interaction
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [authModalEmail, setAuthModalEmail] = useState('');
  const [authResetToken, setAuthResetToken] = useState('');
  const [postAuthAction, setPostAuthAction] = useState<string | null>(null);

  // Check URL parameters on mount for email confirmation and password reset callbacks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verifyToken = urlParams.get('verify_token');
    const email = urlParams.get('email');
    const verified = urlParams.get('verified');
    const resetToken = urlParams.get('reset_token');
    const verificationError = urlParams.get('verification_error');

    if (verifyToken && email) {
      verifyEmail(verifyToken, email)
        .then((res) => {
          toast.success(res.message || 'Email verified successfully! You may now sign in.', 'Email Confirmed');
          setAuthModalEmail(email);
          setAuthModalMode('login');
          setAuthModalOpen(true);
        })
        .catch((err: unknown) => {
          const msg = (err as Error)?.message || 'The verification link is invalid or has expired.';
          toast.error(msg, 'Verification Notice');
          setAuthModalEmail(email);
          setAuthModalMode('verify-notice');
          setAuthModalOpen(true);
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (verified === 'true') {
      toast.success('Your university email address is confirmed! Please sign in.', 'Email Confirmed');
      setAuthModalMode('login');
      setAuthModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (resetToken && email) {
      setAuthModalEmail(email);
      setAuthResetToken(resetToken);
      setAuthModalMode('reset-password');
      setAuthModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (verificationError) {
      toast.error('The verification link was invalid or expired. Please request a new verification email.', 'Verification Error');
      setAuthModalMode('login');
      setAuthModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, verifyEmail]);

  const handleOpenAuth = (mode: AuthMode = 'login', postAction?: string, email?: string) => {
    setAuthModalMode(mode);
    setPostAuthAction(postAction || null);
    if (email) setAuthModalEmail(email);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (targetAction?: string | null) => {
    setAuthModalOpen(false);
    if (targetAction === 'report-lost' || targetAction === 'report-found') {
      setActiveTab(targetAction);
    } else if (targetAction && targetAction !== 'landing') {
      setActiveTab(targetAction);
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    setActiveTab('landing');
    toast.info('You have been signed out.');
  };

  const protectedTabs = [
    'dashboard',
    'report-lost',
    'report-found',
    'my-items',
    'claims',
    'analytics',
    'admin',
    'notifications',
    'settings',
  ];

  const handleNavigateTab = (tab: string) => {
    if (!user && protectedTabs.includes(tab)) {
      handleOpenAuth('login', tab);
      return;
    }
    setActiveTab(tab);
  };

  const handleReportItem = async (newItem: Parameters<typeof addItem>[0]) => {
    try {
      await addItem(newItem);
      setActiveTab('my-items');
    } catch (error) {
      console.error('Failed to add item:', error);
      const apiError = error as { response?: { data?: { message?: string; errors?: Array<{ msg: string }> } } };
      const validationMsg = apiError.response?.data?.errors?.[0]?.msg;
      const generalMsg = apiError.response?.data?.message;
      const message = validationMsg || generalMsg || (error instanceof Error ? error.message : 'Failed to report item. Please try again.');
      toast.error(message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-2xl mx-auto flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">RE<span className="text-blue-500">claim</span></h2>
            <p className="text-xs text-slate-400 font-medium mt-1">Graphic Era University • Authenticating Session...</p>
          </div>
        </div>
      </div>
    );
  }

  // 1. PUBLIC LANDING PAGE (DEFAULT FOR UNAUTHENTICATED OR WHEN LANDING TAB IS EXPLICITLY CHOSEN)
  if (activeTab === 'landing') {
    return (
      <>
        <LandingPage
          user={user}
          items={items}
          onOpenAuth={(mode, postAction) => handleOpenAuth(mode as AuthMode, postAction)}
          onNavigateTab={handleNavigateTab}
          onSelectItem={setSelectedItem}
          onSearch={(query) => {
            setSearchQuery(query);
            setActiveTab('search');
          }}
          onLogout={handleLogout}
        />

        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          initialEmail={authModalEmail}
          resetToken={authResetToken}
          onClose={() => setAuthModalOpen(false)}
          onLogin={async (email, password) => {
            await login(email, password);
          }}
          onRegister={async (userData) => {
            return await register(userData);
          }}
          loading={authLoading}
          postAuthAction={postAuthAction}
          onSuccess={handleAuthSuccess}
        />

        {selectedItem && (
          <ItemModal
            item={selectedItem}
            user={user}
            onClose={() => setSelectedItem(null)}
            onOpenAuth={(mode, postAction) => handleOpenAuth(mode as AuthMode, postAction)}
            onClaimSuccess={() => {
              fetchItems();
            }}
          />
        )}
      </>
    );
  }

  // 2. PUBLIC SEARCH VIEW (FOR GUESTS BROWSING THE DIRECTORY)
  if (!user && (activeTab === 'search' || activeTab === 'map')) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        <header className="bg-slate-950 text-white border-b border-slate-800/80 sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
            <div 
              onClick={() => setActiveTab('landing')}
              className="flex items-center gap-3.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <div className="w-4 h-4 text-blue-400 font-black text-xs flex items-center justify-center">RE</div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-white">
                    RE<span className="text-blue-500">claim</span>
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                    GEU Directory
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold tracking-wide">
                  Graphic Era University • Dehradun
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('landing')}
                className="text-xs font-bold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl border border-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
              >
                ← Back to Campus Home
              </button>
              <button
                onClick={() => handleOpenAuth('login')}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
          {activeTab === 'search' ? (
            <ItemList
              items={items}
              title="Graphic Era Campus Directory"
              emptyMessage="No items match your criteria. Try adjusting your filters or search keywords."
              initialSearchTerm={searchQuery}
            />
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <CampusMap items={items} onSelectItem={setSelectedItem} />
            </div>
          )}
        </main>

        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          initialEmail={authModalEmail}
          resetToken={authResetToken}
          onClose={() => setAuthModalOpen(false)}
          onLogin={async (email, password) => {
            await login(email, password);
          }}
          onRegister={async (userData) => {
            return await register(userData);
          }}
          loading={authLoading}
          postAuthAction={postAuthAction}
          onSuccess={handleAuthSuccess}
        />

        {selectedItem && (
          <ItemModal
            item={selectedItem}
            user={null}
            onClose={() => setSelectedItem(null)}
            onOpenAuth={(mode, postAction) => handleOpenAuth(mode as AuthMode, postAction)}
            onClaimSuccess={() => fetchItems()}
          />
        )}
      </div>
    );
  }

  // 3. UNAUTHENTICATED USERS TRYING TO ACCESS PROTECTED ROUTES -> REDIRECT TO LANDING WITH MODAL
  if (!user) {
    return (
      <>
        <LandingPage
          user={null}
          items={items}
          onOpenAuth={(mode, postAction) => handleOpenAuth(mode as AuthMode, postAction)}
          onNavigateTab={handleNavigateTab}
          onSelectItem={setSelectedItem}
          onSearch={(query) => {
            setSearchQuery(query);
            setActiveTab('search');
          }}
          onLogout={handleLogout}
        />
        <AuthModal
          isOpen={true}
          initialMode="login"
          initialEmail={authModalEmail}
          resetToken={authResetToken}
          onClose={() => setActiveTab('landing')}
          onLogin={async (email, password) => {
            await login(email, password);
          }}
          onRegister={async (userData) => {
            return await register(userData);
          }}
          loading={authLoading}
          postAuthAction={activeTab}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // 4. AUTHENTICATED USER PORTAL WORKSPACE
  const renderContent = () => {
    if (itemsLoading && items.length === 0) {
      return (
        <div className="flex-1 min-h-[60vh] flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-500 text-xs font-bold">Synchronizing Campus Directory...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            items={items} 
            onNavigate={handleNavigateTab}
            onSelectItem={setSelectedItem}
          />
        );
      
      case 'search':
        return (
          <ItemList
            items={items}
            title="Campus Search Directory"
            emptyMessage="No items match your criteria. Try adjusting your filters or search keywords."
            initialSearchTerm={searchQuery}
          />
        );
      
      case 'report-lost':
        return (
          <ReportItemForm
            type="lost"
            onSubmit={handleReportItem}
            onCancel={() => setActiveTab('dashboard')}
          />
        );
      
      case 'report-found':
        return (
          <ReportItemForm
            type="found"
            onSubmit={handleReportItem}
            onCancel={() => setActiveTab('dashboard')}
          />
        );
      
      case 'my-items': {
        const userItems = items.filter(item => String(item.reportedBy) === String(user.id));
        return (
          <ItemList
            items={userItems}
            title="My Reported Items"
            emptyMessage="You haven't reported any items yet. Start by reporting a lost or found item."
          />
        );
      }
      
      case 'claims':
        return (
          <ClaimsList 
            user={user} 
            onViewItem={(id) => {
              const found = items.find(i => String(i.id) === String(id));
              if (found) setSelectedItem(found);
            }} 
          />
        );
      
      case 'map':
        return <CampusMap items={items} onSelectItem={setSelectedItem} />;
      
      case 'analytics':
        return <AnalyticsDashboard />;

      case 'admin':
        return (
          <AdminHub 
            currentUser={user} 
            onNavigateItem={(id) => {
              const match = items.find(i => String(i.id) === String(id));
              if (match) setSelectedItem(match);
            }} 
          />
        );
      
      case 'notifications':
        return (
          <NotificationList 
            onSelectNotification={(notif) => {
              if (notif.related_item_id || notif.relatedItemId) {
                const id = notif.related_item_id || notif.relatedItemId;
                const match = items.find(i => String(i.id) === String(id));
                if (match) setSelectedItem(match);
              }
            }} 
          />
        );
      
      case 'settings':
        return <UserSettings user={user} onProfileUpdated={updateUser} />;
      
      default:
        return (
          <Dashboard 
            user={user} 
            items={items} 
            onNavigate={handleNavigateTab}
            onSelectItem={setSelectedItem}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <Header 
        user={user} 
        onLogout={handleLogout} 
        onNavigateTab={handleNavigateTab}
        onSearch={(query) => {
          setSearchQuery(query);
          setActiveTab('search');
        }}
        onUnreadCountChange={setUnreadNotifs}
      />
      <div className="flex flex-1">
        <Sidebar 
          user={user} 
          activeTab={activeTab} 
          onTabChange={handleNavigateTab}
          items={items}
          unreadNotifsCount={unreadNotifs}
        />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Global Item Details Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          user={user}
          onClose={() => setSelectedItem(null)}
          onOpenAuth={(mode, postAction) => handleOpenAuth(mode as AuthMode, postAction)}
          onClaimSuccess={() => {
            fetchItems();
            setActiveTab('claims');
          }}
        />
      )}

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        initialEmail={authModalEmail}
        resetToken={authResetToken}
        onClose={() => setAuthModalOpen(false)}
        onLogin={async (email, password) => {
          await login(email, password);
        }}
        onRegister={async (userData) => {
          return await register(userData);
        }}
        loading={authLoading}
        postAuthAction={postAuthAction}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
