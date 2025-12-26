import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserCircle, ShieldCheck, ChevronRight, Sparkles, ShieldAlert } from 'lucide-react';

interface LoginProps {
  users: User[];
  adminPassword?: string;
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, adminPassword, onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const students = users.filter(u => u.role === UserRole.STUDENT);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === UserRole.ADMIN) {
      const targetPass = adminPassword || 'admin';
      if (password === targetPass) {
        onLogin({
          id: 'admin',
          name: '系統管理員',
          color: 'bg-purple-100 text-purple-800',
          role: UserRole.ADMIN
        });
      } else {
        setError('管理員密碼錯誤 (｡•́︿•̀｡)');
      }
    } else {
      const user = students.find(u => u.id === selectedUserId);
      if (!user) {
        setError('請選擇姓名 (｡•́︿•̀｡)');
        return;
      }
      if (user.password && user.password !== password) {
        setError('密碼錯誤 (｡•́︿•̀｡)');
        return;
      }
      onLogin(user);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/50 relative">
        
        {/* Decorative Circles */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-200 rounded-full blur-3xl opacity-50"></div>

        <div className="relative p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-blue-400 to-purple-400 text-white rounded-2xl shadow-lg mb-4 transform -rotate-6">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1 tracking-tight">燒錄光碟排班系統</h1>
          <p className="text-gray-500 text-sm">CDShift • 輕鬆管理你的班表</p>
        </div>

        <div className="px-8 pb-10">
          <div className="flex bg-gray-100/50 p-1.5 rounded-2xl mb-8 border border-gray-200">
            <button
              onClick={() => { setRole(UserRole.STUDENT); setError(''); setPassword(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                role === UserRole.STUDENT 
                  ? 'bg-white shadow-md text-blue-600 scale-100' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <UserCircle size={18} /> 工讀生
            </button>
            <button
              onClick={() => { setRole(UserRole.ADMIN); setError(''); setPassword(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                role === UserRole.ADMIN 
                  ? 'bg-white shadow-md text-purple-600 scale-100' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ShieldCheck size={18} /> 管理員
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {role === UserRole.STUDENT && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 ml-1 uppercase">Who are you?</label>
                <div className="relative">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none bg-white transition-all appearance-none text-gray-700 font-medium"
                    required
                  >
                    <option value="" disabled>請選擇您的名字</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" size={18}/>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 ml-1 uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-gray-700 font-medium placeholder:text-gray-300"
                placeholder="請輸入密碼"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 text-sm font-bold p-4 rounded-2xl flex items-center animate-pulse">
                <ShieldAlert className="mr-2" size={18} /> {error}
              </div>
            )}
            
            <button
              type="submit"
              className={`w-full py-4 rounded-2xl font-bold text-lg text-white shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 group ${
                role === UserRole.ADMIN 
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500' 
                : 'bg-gradient-to-r from-blue-400 to-cyan-400'
              }`}
            >
              登入系統 <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;