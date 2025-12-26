import React, { useMemo } from 'react';
import { AppData, User, UserRole } from '../types';
import { BarChart3, Trophy } from 'lucide-react';

interface StatsSidebarProps {
  currentDate: Date;
  data: AppData;
}

const StatsSidebar: React.FC<StatsSidebarProps> = ({ currentDate, data }) => {
  const students = data.users.filter(u => u.role === UserRole.STUDENT);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate stats for the current month
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    // Initialize 0
    students.forEach(s => counts[s.id] = 0);

    // Count shifts
    Object.values(data.shifts).forEach(shift => {
      // 1. Filter by current month
      if (!shift.date.startsWith(currentMonthPrefix)) return;
      
      // 2. If closed, no one works
      if (shift.isClosed) return;

      // 3. Determine the active worker
      // Priority: Confirmed User > Single Signup (Auto-assign)
      let workerId = shift.confirmedUserId;

      if (!workerId && shift.signups && shift.signups.length === 1) {
        workerId = shift.signups[0];
      }

      // 4. Increment count if a worker exists
      if (workerId) {
        counts[workerId] = (counts[workerId] || 0) + 1;
      }
    });

    // Sort by count descending
    return students
      .map(s => ({ user: s, count: counts[s.id] || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [data.shifts, students, year, month]);

  const totalShifts = stats.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sticky top-24">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="p-2.5 bg-orange-100 text-orange-500 rounded-xl">
          <BarChart3 size={20} />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{month + 1}月 排班統計</h3>
          <p className="text-xs text-gray-400 font-bold">Total: {totalShifts} 班</p>
        </div>
      </div>

      <div className="space-y-3">
        {stats.map((item, index) => (
          <div key={item.user.id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm text-gray-700 ${item.user.color.replace('bg-', 'bg-opacity-50 bg-')}`}>
                  {item.user.name[0]}
                </span>
                {index === 0 && item.count > 0 && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
                    <Trophy size={10} />
                  </div>
                )}
              </div>
              <span className="font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
                {item.user.name}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="h-2 w-16 bg-gray-100 rounded-full overflow-hidden hidden xl:block">
                <div 
                  className={`h-full rounded-full ${item.user.color.split(' ')[0]}`} 
                  style={{ width: `${totalShifts > 0 ? (item.count / totalShifts) * 100 : 0}%` }}
                ></div>
              </div>
              <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${item.count > 0 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {item.count}
              </span>
            </div>
          </div>
        ))}

        {students.length === 0 && (
          <div className="text-center text-gray-400 py-4 text-sm">
            無工讀生資料
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsSidebar;