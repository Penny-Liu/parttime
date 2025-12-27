import React from 'react';
import { AppData, User, ShiftDay, UserRole } from '../types';
import { DEFAULT_WORKER_NAME, WEEKDAYS } from '../constants';
import { Check, Lock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CloudOff } from 'lucide-react';

interface CalendarProps {
  currentDate: Date;
  data: AppData;
  currentUser: User | null;
  onMonthChange: (increment: number) => void;
  onDateClick: (dateStr: string) => void;
  pendingDates?: Set<string>; // New prop to track unsaved dates
}

const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  data,
  currentUser,
  onMonthChange,
  onDateClick,
  pendingDates = new Set()
}) => {

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const formatDate = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const getDayDetails = (day: number) => {
    const dateStr = formatDate(year, month, day);
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();

    const isHoliday = data.settings.holidays.includes(dateStr);
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;

    // Check if isToday
    const today = new Date();
    const isToday = dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear();

    let dateStyle = 'text-gray-600 bg-white border-gray-100';
    let badge = null;

    if (isSunday || isHoliday) {
      dateStyle = 'text-red-600 bg-red-50/50 border-red-100';
      badge = isHoliday ? <span className="absolute -top-2 -right-2 bg-red-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">假</span> : null;
    } else if (isSaturday) {
      dateStyle = 'text-green-600 bg-green-50/50 border-green-100';
    }

    const shift: ShiftDay | undefined = data.shifts[dateStr];
    const signups = shift?.signups || [];
    const confirmedId = shift?.confirmedUserId;
    const isClosed = shift?.isClosed;
    const isPending = pendingDates.has(dateStr);

    return { dateStr, day, dayOfWeek, isHoliday, isSunday, isSaturday, isToday, dateStyle, badge, signups, confirmedId, isClosed, isPending };
  };

  const renderCellContent = (details: ReturnType<typeof getDayDetails>) => {
    const { signups, confirmedId, isClosed, isSunday, isHoliday, isSaturday } = details;

    if (isClosed) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 opacity-50">
          <Lock size={16} className="text-gray-400 mb-1" />
          <span className="text-gray-400 font-bold text-sm tracking-widest">休診</span>
        </div>
      );
    }

    // Time Display
    let timeText = '10:00-18:00';
    if (isSunday || isHoliday) timeText = '10:00-17:00';

    // Responsive Font Size for Time
    const TimeBadge = () => (
      <div className={`hidden md:block text-[10px] mb-1 font-medium text-center ${isSunday || isHoliday ? 'text-red-500' : isSaturday ? 'text-green-600' : 'text-gray-400'}`}>
        {timeText}
      </div>
    );

    // Logic: Confirmed user OR Single Signup (Auto-confirmed visually)
    const activeUserId = confirmedId || (signups.length === 1 ? signups[0] : null);

    if (activeUserId) {
      const user = data.users.find(u => u.id === activeUserId);
      if (user) {
        return (
          <div className="flex flex-col h-full justify-between pb-1">
            <TimeBadge />
            <div className={`py-1 md:py-3 px-1 rounded-xl text-xs md:text-base font-bold w-full text-center shadow-sm border border-white/50 ${user.color} flex flex-col items-center justify-center`}>
              <span className="truncate w-full leading-none scale-90 md:scale-100 origin-center">{user.name}</span>
            </div>
          </div>
        );
      }
    } else if (signups.length === 0) {
      return (
        <div className="flex flex-col h-full justify-between pb-1">
          <TimeBadge />
          <div className="py-2 px-1 rounded-xl text-xs md:text-sm font-medium w-full text-center bg-gray-100 text-gray-400 border border-gray-200 border-dashed">
            {DEFAULT_WORKER_NAME}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col h-full justify-between pb-1">
          <TimeBadge />
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-1 text-center">
            <div className="text-xs text-yellow-600 font-bold mb-1">{signups.length} 人報名</div>
            <div className="flex flex-wrap gap-1 justify-center h-5 overflow-hidden">
              {signups.map(uid => {
                const u = data.users.find(usr => usr.id === uid);
                return u ? <div key={uid} className={`w-1.5 h-1.5 rounded-full ${u.color.split(' ')[0]}`} /> : null;
              })}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const calendarCells = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="min-h-[140px]" />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const details = getDayDetails(d);
    const isInteractable = currentUser?.role === UserRole.STUDENT && !details.isClosed && !details.confirmedId;
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isSignedUp = details.signups.includes(currentUser?.id || '');

    calendarCells.push(
      <div
        key={details.dateStr}
        onClick={() => {
          if (isAdmin || isInteractable) onDateClick(details.dateStr);
        }}
        className={`
          relative min-h-[140px] p-2 rounded-2xl border transition-all duration-300 group
          flex flex-col
          ${details.dateStyle}
          ${isInteractable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : ''}
          ${isAdmin ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''}
          ${isSignedUp && !isAdmin ? 'ring-2 ring-blue-300 bg-blue-50/80' : ''}
          ${!isInteractable && !isAdmin ? 'opacity-90' : ''}
          ${details.isPending ? 'ring-2 ring-orange-400 border-orange-300 bg-orange-50' : ''} 
        `}
      >
        {details.badge}
        {details.isPending && (
          <div className="absolute -top-2 -left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 flex items-center gap-1 animate-pulse">
            <CloudOff size={10} /> 未儲存
          </div>
        )}

        <div className="flex justify-between items-center mb-1">
          <span className={`text-lg md:text-xl font-bold font-quicksand ${details.isToday ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-md' : ''}`}>
            {d}
          </span>
          {isSignedUp && !isAdmin && <Check size={16} className="text-blue-500" strokeWidth={3} />}
          {isAdmin && details.signups.length > 0 && !details.confirmedId && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          )}
        </div>

        {renderCellContent(details)}

        {/* Hover Action hint for Student */}
        {isInteractable && (
          <div className="absolute inset-0 bg-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-blue-600 font-bold text-xs bg-white/80 px-2 py-1 rounded-full shadow-sm">
              {isSignedUp ? '取消報名' : '點擊報名'}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800 tracking-tight font-quicksand">
              {year} <span className="text-gray-300">/</span> {String(month + 1).padStart(2, '0')}
            </h2>
            <p className="text-gray-400 text-sm font-medium">Monthly Schedule</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl">
          <button onClick={() => onMonthChange(-1)} className="p-3 hover:bg-white hover:shadow-md rounded-xl transition-all text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <button onClick={() => onMonthChange(1)} className="p-3 hover:bg-white hover:shadow-md rounded-xl transition-all text-gray-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-4 md:p-6">
        <div className="grid grid-cols-7 mb-4">
          {WEEKDAYS.map((day, idx) => (
            <div key={day} className={`text-center font-bold text-sm pb-2 border-b-2 border-transparent ${idx === 0 ? 'text-red-400' : idx === 6 ? 'text-green-500' : 'text-gray-400'
              }`}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {calendarCells}
        </div>
      </div>
    </div>
  );
};

export default Calendar;