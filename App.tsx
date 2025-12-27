import React, { useState, useEffect } from 'react';
import { User, AppData, UserRole } from './types';
import { fetchAppData, sendAction } from './services/api';
import Login from './components/Login';
import Calendar from './components/Calendar';
import AdminPanel from './components/AdminPanel';
import PrintView from './components/PrintView';
import StatsSidebar from './components/StatsSidebar';
import { LogOut, Printer, RefreshCw, UserCheck, X, CloudUpload, AlertCircle, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showPrintView, setShowPrintView] = useState(false);

  // Batch Save State for Students
  const [unsavedActions, setUnsavedActions] = useState<{ date: string, userId: string }[]>([]);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');

  const [selectedAdminDate, setSelectedAdminDate] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const fetchedData = await fetchAppData();
    setData(fetchedData);
    setUnsavedActions([]); // Clear unsaved on reload
    setLoading(false);
  };

  const handleSync = async () => {
    if (unsavedActions.length > 0) {
      if (!confirm("您有未儲存的變更，同步將會遺失這些修改。確定要同步嗎？")) return;
    }
    setSyncing(true);
    const fetchedData = await fetchAppData();
    setData(fetchedData);
    setUnsavedActions([]);
    setSyncing(false);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setUnsavedActions([]); // Reset state on new login
  };

  const handleLogout = () => {
    if (unsavedActions.length > 0) {
      if (!confirm("您有未儲存的變更，登出將會遺失這些修改。確定要登出嗎？")) return;
    }
    setCurrentUser(null);
    setSelectedAdminDate(null);
    setUnsavedActions([]);
  };

  const handleDateClick = async (dateStr: string) => {
    if (!currentUser || !data) return;

    if (currentUser.role === UserRole.STUDENT) {
      const shift = data.shifts[dateStr];
      if (shift?.isClosed || shift?.confirmedUserId) return;

      const currentSignups = shift?.signups || [];
      const isSignedUp = currentSignups.includes(currentUser.id);

      const newSignups = isSignedUp
        ? currentSignups.filter(id => id !== currentUser.id)
        : [...currentSignups, currentUser.id];

      // Optimistic Update (Local Only)
      const newData = { ...data, shifts: { ...data.shifts, [dateStr]: { ...shift, date: dateStr, signups: newSignups } } };
      setData(newData);

      // Queue Action
      // Queue Action Logic:
      // If an action for this date already exists in unsavedActions, it means the user is toggling it BACK to the original state.
      // So instead of adding another action, we should REMOVE the existing pending action.
      setUnsavedActions(prev => {
        const existingActionIndex = prev.findIndex(a => a.date === dateStr && a.userId === currentUser.id);
        if (existingActionIndex >= 0) {
          // Remove the existing action (cancel out)
          const newActions = [...prev];
          newActions.splice(existingActionIndex, 1);
          return newActions;
        } else {
          // Add new action
          return [...prev, { date: dateStr, userId: currentUser.id }];
        }
      });

    } else if (currentUser.role === UserRole.ADMIN) {
      setSelectedAdminDate(dateStr);
    }
  };

  const handleSaveChanges = async () => {
    if (unsavedActions.length === 0) return;

    setIsSavingChanges(true);
    setSaveProgress('準備上傳...');

    let successCount = 0;
    let lastError = '';

    try {
      for (let i = 0; i < unsavedActions.length; i++) {
        setSaveProgress(`正在儲存 ${i + 1} / ${unsavedActions.length} 筆變更...`);
        const action = unsavedActions[i];

        try {
          const result = await sendAction({
            action: 'toggleSignup',
            payload: { date: action.date, userId: action.userId }
          });

          if (result) successCount++;
        } catch (e: any) {
          console.error(e);
          lastError = e.message || "未知錯誤";
        }
      }

      if (successCount === unsavedActions.length) {
        setSaveProgress('更新雲端資料...');
        // Fetch fresh data with cache busting handled in api.ts
        const finalData = await fetchAppData();
        setData(finalData);
        setUnsavedActions([]);
        alert("✅ 所有變更已成功儲存！");
      } else {
        alert(`⚠️ 儲存發生問題\n\n成功: ${successCount} 筆\n失敗: ${unsavedActions.length - successCount} 筆\n\n錯誤原因: ${lastError}\n\n請檢查網路連線或稍後再試。`);
        // Reload partial data
        const partialData = await fetchAppData();
        setData(partialData);
        setUnsavedActions([]); // Clear unsafe state
      }
    } catch (globalError: any) {
      alert("系統錯誤: " + globalError.message);
    } finally {
      setIsSavingChanges(false);
      setSaveProgress('');
    }
  };

  const handleAdminShiftAction = async (action: 'confirm' | 'close' | 'clear', targetUserId?: string) => {
    if (!selectedAdminDate || !data) return;

    const shift = data.shifts[selectedAdminDate] || { date: selectedAdminDate, signups: [] };
    let newShift = { ...shift };

    if (action === 'confirm' && targetUserId) {
      newShift.confirmedUserId = targetUserId;
      newShift.isClosed = false;
    } else if (action === 'close') {
      newShift.isClosed = !newShift.isClosed;
      newShift.confirmedUserId = undefined;
    } else if (action === 'clear') {
      newShift.confirmedUserId = undefined;
      newShift.isClosed = false;
    }

    // Optimistic Update
    const newData = { ...data, shifts: { ...data.shifts, [selectedAdminDate]: newShift } };
    setData(newData);
    setSelectedAdminDate(null);

    try {
      // FIX: Explicitly map payload to ensure 'undefined' confirmedUserId becomes empty string for GAS
      await sendAction({
        action: 'assignShift',
        payload: {
          date: selectedAdminDate,
          confirmedUserId: newShift.confirmedUserId || '',
          isClosed: !!newShift.isClosed
        }
      });
      // Optionally reload data to confirm sync
    } catch (e: any) {
      alert("後台操作失敗: " + e.message);
      // Revert on failure could be implemented here by reloading data
      loadData();
    }
  };

  const handleUserUpdate = async (action: 'add' | 'delete' | 'edit', user?: User) => {
    if (!data) return;
    let newUsers = [...data.users];

    if (action === 'add' && user) {
      newUsers.push(user);
    } else if (action === 'delete' && user) {
      newUsers = newUsers.filter(u => String(u.id) !== String(user.id));
    } else if (action === 'edit' && user) {
      newUsers = newUsers.map(u => String(u.id) === String(user.id) ? user : u);
    }

    setData({ ...data, users: newUsers });

    try {
      await sendAction({
        action: 'manageUser',
        payload: { type: action, user }
      });
    } catch (e: any) {
      alert("人員更新失敗: " + e.message);
      loadData();
    }
  };

  const handleSettingsUpdate = async (newSettings: AppData['settings']) => {
    if (!data) return;
    setData({ ...data, settings: newSettings });

    try {
      await sendAction({
        action: 'updateSettings',
        payload: newSettings
      });
    } catch (e: any) {
      alert("設定更新失敗: " + e.message);
    }
  };

  const handleInitializeCloud = async () => {
    if (!data) return;
    setSyncing(true);
    try {
      await sendAction({
        action: 'initialize',
        payload: data
      });
      alert("✅ 初始化成功！您的資料已安全上傳至 Google Sheet。");
      loadData(); // Reload to be sure
    } catch (e: any) {
      alert("❌ 上傳失敗: " + e.message);
    }
    setSyncing(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-pink-50">
        <div className="animate-bounce bg-white p-4 rounded-full shadow-lg mb-4">
          <UserCheck size={32} className="text-pink-500" />
        </div>
        <p className="text-gray-500 font-bold animate-pulse">正在為您準備班表...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login users={data?.users || []} adminPassword={data?.settings.adminPassword} onLogin={handleLogin} />;
  }

  if (showPrintView && data) {
    return <PrintView currentDate={currentDate} data={data} onClose={() => setShowPrintView(false)} />;
  }

  return (
    <div className="min-h-screen pb-24 transition-colors duration-500">
      {/* Top Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg ${currentUser.role === UserRole.ADMIN ? 'bg-gradient-to-br from-purple-500 to-indigo-500' : 'bg-gradient-to-br from-blue-400 to-cyan-400'}`}>
                <span className="font-bold text-lg">{currentUser.name[0]}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-800 text-lg leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  {currentUser.role === UserRole.ADMIN ? 'Administrator' : 'Student'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSync}
                disabled={syncing || isSavingChanges}
                className={`p-3 rounded-xl transition-all ${syncing ? 'animate-spin text-blue-400' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
                title="同步資料"
              >
                <RefreshCw size={20} />
              </button>
              <button
                onClick={() => setShowPrintView(true)}
                className="hidden md:flex items-center gap-2 bg-gray-100 hover:bg-gray-800 hover:text-white text-gray-600 px-4 py-2 rounded-xl font-bold transition-all"
              >
                <Printer size={18} /> 列印 / 匯出
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 px-4 py-2 rounded-xl font-bold transition-all"
              >
                <LogOut size={18} /> <span className="hidden sm:inline">登出</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Grid Layout for Desktop Side-by-Side */}

        {/* Today's Banner (Mobile & Desktop) */}
        {(() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayShift = data?.shifts[todayStr];

          // Determine status
          const isClosed = todayShift?.isClosed;
          const isHoliday = data?.settings.holidays.includes(todayStr);
          const confirmedId = todayShift?.confirmedUserId;
          const signups = todayShift?.signups || [];

          let statusText = "今日尚未安排";
          let statusColor = "bg-gray-100 text-gray-500 border-gray-200";
          let workerName = null;

          if (isClosed || isHoliday) {
            statusText = isHoliday ? "今日休假 🏖️" : "今日休診 🚫";
            statusColor = "bg-red-50 text-red-600 border-red-200";
          } else if (confirmedId) {
            const u = data?.users.find(u => u.id === confirmedId);
            if (u) {
              statusText = "今日值班";
              workerName = u.name;
              // Extract bg color from user color class (simplified logic)
              statusColor = u.color.includes('bg-') ? u.color.replace('text-', 'border-transparent text-') : "bg-blue-100 text-blue-800";
            }
          } else if (signups.length === 1) {
            const u = data?.users.find(u => u.id === signups[0]);
            if (u) {
              statusText = "今日預定 (自動)";
              workerName = u.name;
              statusColor = "bg-blue-50 text-blue-600 border-blue-200";
            }
          } else if (signups.length > 1) {
            statusText = `${signups.length} 人待命中`;
            statusColor = "bg-yellow-50 text-yellow-600 border-yellow-200";
          }

          return (
            <div className="mb-8 p-4 rounded-3xl bg-white shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">
              <div className="flex items-center gap-4 z-10">
                <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-200">
                  <span className="font-bold text-xs uppercase tracking-wider block text-blue-200">TODAY</span>
                  <span className="font-bold text-xl leading-none">{new Date().getDate()}</span>
                </div>
                <div>
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wide">Duty Status</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-gray-800 text-lg">{statusText}</span>
                    {workerName && (
                      <span className={`px-3 py-0.5 rounded-full text-sm font-bold shadow-sm ${statusColor}`}>
                        {workerName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Decorative background element */}
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Left Column: Calendar (Takes up 3/4 space on desktop) */}
          <div className="lg:col-span-3 space-y-10">
            <section>
              <Calendar
                currentDate={currentDate}
                data={data!}
                currentUser={currentUser}
                onMonthChange={(inc) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + inc, 1))}
                onDateClick={handleDateClick}
                pendingDates={new Set(unsavedActions.map(a => a.date))}
              />
            </section>

            {currentUser.role === UserRole.ADMIN && (
              <section>
                <div className="flex items-center gap-2 mb-6 ml-2">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-gray-800">後台管理中心</h2>
                </div>
                <AdminPanel
                  data={data!}
                  onUpdateUser={handleUserUpdate}
                  onUpdateSettings={handleSettingsUpdate}
                  onInitializeCloud={handleInitializeCloud}
                />
              </section>
            )}
          </div>

          {/* Right Column: Stats Sidebar (Takes up 1/4 space on desktop, sticky) */}
          <div className="lg:col-span-1">
            {data && (
              <StatsSidebar
                currentDate={currentDate}
                data={data}
              />
            )}
          </div>
        </div>
      </main>

      {/* Floating Save Action Bar for Students */}
      {unsavedActions.length > 0 && currentUser.role === UserRole.STUDENT && (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-6 max-w-lg w-full border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
                <AlertCircle size={24} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-lg leading-tight">未儲存變更</h4>
                <p className="text-gray-400 text-xs font-medium">
                  {isSavingChanges ? saveProgress : `您有 ${unsavedActions.length} 筆排班操作尚未上傳`}
                </p>
              </div>
            </div>
            <button
              onClick={handleSaveChanges}
              disabled={isSavingChanges}
              className="bg-orange-500 hover:bg-orange-400 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isSavingChanges ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> 上傳中...
                </>
              ) : (
                <>
                  <CloudUpload size={18} /> 儲存並上傳
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Admin Shift Management Modal */}
      {selectedAdminDate && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">排班模擬</h3>
                <p className="text-gray-300 text-sm opacity-80">{selectedAdminDate}</p>
              </div>
              <button onClick={() => setSelectedAdminDate(null)} className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">報名人員</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {(data.shifts[selectedAdminDate]?.signups || []).length === 0 && (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                      尚無人報名
                    </div>
                  )}

                  {(data.shifts[selectedAdminDate]?.signups || []).map(uid => {
                    const u = data.users.find(usr => usr.id === uid);
                    if (!u) return null;

                    const shift = data.shifts[selectedAdminDate];
                    const isConfirmed = shift?.confirmedUserId === uid;
                    // Logic: If NO ONE is explicitly confirmed, and this user is the ONLY signup, treat as Auto-Confirmed
                    const isAutoConfirmed = !shift?.confirmedUserId && shift?.signups.length === 1 && !shift?.isClosed;

                    return (
                      <button
                        key={uid}
                        onClick={() => handleAdminShiftAction('confirm', uid)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all group ${isConfirmed
                          ? 'border-green-500 bg-green-50 shadow-sm'
                          : isAutoConfirmed
                            ? 'border-blue-400 bg-blue-50 shadow-sm'
                            : 'border-transparent bg-gray-50 hover:bg-blue-50 hover:border-blue-200'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${u.color}`}>
                            {u.name[0]}
                          </span>
                          <span className="font-bold text-gray-700">{u.name}</span>
                        </div>
                        {isConfirmed ? (
                          <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">Formal</span>
                        ) : isAutoConfirmed ? (
                          <span className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-1 rounded-full">Auto</span>
                        ) : (
                          <span className="text-gray-300 group-hover:text-blue-400 text-xs font-bold">Assign</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleAdminShiftAction('close')}
                  className={`p-3 rounded-xl font-bold border-2 transition-all ${data.shifts[selectedAdminDate]?.isClosed
                    ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200'
                    : 'bg-white text-red-500 border-red-100 hover:border-red-300 hover:bg-red-50'
                    }`}
                >
                  {data.shifts[selectedAdminDate]?.isClosed ? '🔓 解除休診' : '🔒 設為休診'}
                </button>
                <button
                  onClick={() => handleAdminShiftAction('clear')}
                  className="p-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent"
                >
                  清除指定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;