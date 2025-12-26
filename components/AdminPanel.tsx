import React, { useState, useEffect } from 'react';
import { AppData, User, UserRole } from '../types';
import { TAILWIND_COLORS, TAIWAN_HOLIDAYS_2026_2027, DEFAULT_DB_URL } from '../constants';
import { Plus, Trash2, Save, Calendar, ShieldAlert, RotateCw, Users, Settings, Lock, ExternalLink, Database, Link as LinkIcon, CloudUpload, Pencil, X } from 'lucide-react';

interface AdminPanelProps {
  data: AppData;
  onUpdateUser: (action: 'add' | 'delete' | 'edit', user?: User) => void;
  onUpdateSettings: (newSettings: AppData['settings']) => void;
  onInitializeCloud: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ data, onUpdateUser, onUpdateSettings, onInitializeCloud }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings'>('users');
  
  // User Form State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newColor, setNewColor] = useState(TAILWIND_COLORS[0].value);
  
  // Settings State
  const [holidayInput, setHolidayInput] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [dbUrlInput, setDbUrlInput] = useState('');

  useEffect(() => {
    if (data.settings) {
      setHolidayInput(data.settings.holidays ? data.settings.holidays.join('\n') : '');
      setAdminPassInput(data.settings.adminPassword || '');
      setDbUrlInput(data.settings.googleSheetUrl || DEFAULT_DB_URL);
    }
  }, [data.settings]);

  const handleEditClick = (user: User) => {
      setEditingUser(user);
      setNewName(user.name);
      setNewPassword(user.password || '');
      setNewColor(user.color);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingUser(null);
      setNewName('');
      setNewPassword('');
      setNewColor(TAILWIND_COLORS[0].value);
  };

  const handleUserSubmit = () => {
    if (!newName || !newPassword) return alert("請輸入姓名與密碼");
    
    if (editingUser) {
        const updatedUser: User = {
            ...editingUser,
            name: newName,
            password: newPassword,
            color: newColor,
        };
        onUpdateUser('edit', updatedUser);
        handleCancelEdit();
        alert(`✅ 已更新 ${updatedUser.name} 的資料`);
    } else {
        const newUser: User = {
          id: `u_${Date.now()}`,
          name: newName,
          password: newPassword,
          color: newColor,
          role: UserRole.STUDENT
        };
        onUpdateUser('add', newUser);
        setNewName('');
        setNewPassword('');
    }
  };

  const handleDeleteUser = (user: User) => {
    // Standard confirm, removed unnecessary timeout to prevent event loss
    if (window.confirm(`⚠️ 確定要刪除「${user.name}」嗎？\n此操作會將該人員從名單中移除，但保留歷史排班紀錄。`)) {
       onUpdateUser('delete', user);
    }
  };

  const handleSaveSettings = () => {
    const holidays = holidayInput
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.match(/^\d{4}-\d{2}-\d{2}$/));
    
    onUpdateSettings({ 
      adminPassword: adminPassInput, 
      holidays: holidays,
      googleSheetUrl: dbUrlInput
    });
    alert("系統設定已儲存並同步至雲端！");
  };
  
  const handleInitialize = () => {
    if (confirm("⚠️ 注意\n這將會把目前網頁上的所有資料強制上傳覆蓋到 Google Sheet。\n\n通常只在第一次設定或救援資料時使用。\n\n確定要執行嗎？")) {
        onInitializeCloud();
    }
  };

  const loadDefaultHolidays = () => {
    if (confirm("確定要載入 2026-2027 台灣國定假日嗎？目前的輸入將被覆蓋。")) {
      setHolidayInput(TAIWAN_HOLIDAYS_2026_2027.join('\n'));
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="flex p-2 bg-gray-50 gap-2">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 px-6 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'users' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users size={20} /> 人員管理
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 px-6 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'settings' ? 'bg-white text-purple-600 shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Settings size={20} /> 系統設定
        </button>
      </div>

      <div className="p-8">
        {activeTab === 'users' && (
          <div className="space-y-8">
            <div className={`p-6 rounded-3xl border transition-all duration-300 ${editingUser ? 'bg-orange-50 border-orange-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${editingUser ? 'text-orange-800' : 'text-blue-800'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${editingUser ? 'bg-orange-200 text-orange-600' : 'bg-blue-200 text-blue-600'}`}>
                   {editingUser ? <Pencil size={16}/> : <Plus size={16}/>}
                </div>
                {editingUser ? '編輯工讀生資料' : '新增工讀生'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold opacity-60 uppercase ml-1 mb-1">姓名</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    className="w-full p-3 border-none bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-blue-300 outline-none" placeholder="輸入姓名" />
                </div>
                <div>
                  <label className="block text-xs font-bold opacity-60 uppercase ml-1 mb-1">密碼</label>
                  <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="w-full p-3 border-none bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-blue-300 outline-none" placeholder="設定密碼" />
                </div>
                <div>
                  <label className="block text-xs font-bold opacity-60 uppercase ml-1 mb-1">顏色</label>
                  <select value={newColor} onChange={e => setNewColor(e.target.value)}
                    className="w-full p-3 border-none bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-blue-300 outline-none appearance-none cursor-pointer">
                    {TAILWIND_COLORS.map(c => <option key={c.name} value={c.value}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                    {editingUser && (
                        <button onClick={handleCancelEdit}
                        className="bg-white text-gray-500 p-3 rounded-xl font-bold hover:bg-gray-100 shadow-sm border border-gray-200 transition-all flex items-center justify-center">
                        <X size={20} />
                        </button>
                    )}
                    <button onClick={handleUserSubmit}
                        className={`flex-1 text-white p-3 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 ${editingUser ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {editingUser ? <><Save size={20}/> 更新</> : <><Plus size={20}/> 新增</>}
                    </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 ml-2">現有人員列表</h3>
              <div className="overflow-hidden rounded-3xl border border-gray-100 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                      <th className="py-4 px-6 font-bold">姓名</th>
                      <th className="py-4 px-6 font-bold">密碼</th>
                      <th className="py-4 px-6 font-bold">樣式預覽</th>
                      <th className="py-4 px-6 text-right font-bold">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50 text-sm">
                    {data.users.filter(u => u.role === UserRole.STUDENT).map(user => (
                      <tr key={user.id} className={`transition-colors ${editingUser?.id === user.id ? 'bg-orange-50' : 'hover:bg-gray-50/50'}`}>
                        <td className="py-4 px-6 font-bold text-gray-700">{user.name}</td>
                        <td className="py-4 px-6 font-mono text-gray-400">{user.password}</td>
                        <td className="py-4 px-6">
                           <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${user.color}`}>
                             {user.name}
                           </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => handleEditClick(user)}
                                className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-xl transition-all"
                                title="編輯"
                            >
                                <Pencil size={18} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all"
                                title="刪除"
                            >
                                <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.users.filter(u => u.role === UserRole.STUDENT).length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-gray-400">尚無人員資料</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
               <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                  <h3 className="text-lg font-bold text-green-800 mb-2 flex items-center gap-2">
                    <Database size={20} /> 資料庫連結 (Google Sheet)
                  </h3>
                  <div className="mb-4">
                     <label className="text-xs font-bold text-green-600 ml-1 mb-1 block uppercase">Web App / Sheet URL</label>
                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            value={dbUrlInput} 
                            onChange={e => setDbUrlInput(e.target.value)}
                            className="flex-1 p-3 rounded-xl border border-green-200 text-sm font-mono text-gray-700 focus:ring-2 focus:ring-green-400 outline-none"
                            placeholder="請輸入 Google Sheet 或 Script URL"
                         />
                     </div>
                  </div>
                  <div className="flex justify-between items-center">
                      <button 
                        onClick={handleInitialize}
                        className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-xl font-bold shadow-sm hover:shadow-md hover:bg-yellow-300 transition-all text-sm"
                        title="將目前網頁上的資料上傳至 Google Sheet (覆蓋)"
                      >
                         <CloudUpload size={16} /> 初始化/上傳當前資料
                      </button>
                      <a 
                        href={dbUrlInput} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-xl font-bold shadow-sm hover:shadow-md hover:bg-green-600 hover:text-white transition-all border border-green-200 text-sm"
                      >
                        <ExternalLink size={16} /> 開啟連結
                      </a>
                  </div>
               </div>

               <div className="flex justify-between items-end pt-4 border-t border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Calendar size={20} className="text-pink-500" /> 國定假日設定
                  </h3>
                  <button onClick={loadDefaultHolidays} className="text-xs bg-pink-50 hover:bg-pink-100 text-pink-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors">
                    <RotateCw size={12} /> 載入預設
                  </button>
               </div>
               <div className="relative">
                 <textarea 
                    value={holidayInput} 
                    onChange={e => setHolidayInput(e.target.value)}
                    className="w-full h-64 p-4 border-2 border-gray-200 rounded-3xl font-mono text-base font-medium text-gray-900 focus:ring-4 focus:ring-pink-100 focus:border-pink-300 outline-none resize-none bg-white" 
                 />
                 <div className="absolute bottom-4 right-4 text-xs font-bold text-gray-400 bg-white/80 px-2 rounded-md">YYYY-MM-DD</div>
               </div>
            </div>

            <div className="space-y-6">
              <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                 <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                   <Lock size={20} /> 管理員密碼
                 </h3>
                 <input type="text" value={adminPassInput} onChange={e => setAdminPassInput(e.target.value)}
                  className="w-full p-4 border-none bg-white rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-300 outline-none text-gray-700 font-bold tracking-wider" />
                 <p className="mt-3 text-xs text-purple-600/70 flex items-start gap-1">
                   <ShieldAlert size={14} className="mt-0.5 shrink-0" /> 修改後請務必記住新密碼。
                 </p>
              </div>
              <button onClick={handleSaveSettings}
                className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold hover:bg-black shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                <Save size={20} /> 儲存並同步設定
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;