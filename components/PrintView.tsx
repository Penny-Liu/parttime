import React from 'react';
import { AppData, User } from '../types';
import { DEFAULT_WORKER_NAME, WEEKDAYS } from '../constants';
import { X, Printer, FileDown } from 'lucide-react';

interface PrintViewProps {
  currentDate: Date;
  data: AppData;
  onClose: () => void;
}

const PrintView: React.FC<PrintViewProps> = ({ currentDate, data, onClose }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const weeks = [];
  let currentWeek = new Array(7).fill(null);
  for (let i = 0; i < firstDayOfMonth; i++) currentWeek[i] = null;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month, d).getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const shift = data.shifts[dateStr];

    // Time Logic
    const isHoliday = data.settings.holidays.includes(dateStr);
    const isSunday = dayOfWeek === 0;

    let timeString = '10:00-18:00';
    if (isSunday || isHoliday) {
      timeString = '10:00-17:00';
    }

    let content: React.ReactNode = DEFAULT_WORKER_NAME;
    let isSpecial = false;
    let cellStyle = "text-gray-400"; // default for no worker
    let isClosed = false;

    if (shift?.isClosed) {
      content = "休診";
      isSpecial = true;
      isClosed = true;
      cellStyle = "text-gray-400 opacity-50";
    } else {
      // Logic: Confirmed OR Single Signup
      const activeUserId = shift?.confirmedUserId || (shift?.signups?.length === 1 ? shift.signups[0] : null);

      if (activeUserId) {
        const u = data.users.find(user => user.id === activeUserId);
        if (u) {
          content = u.name;
          // Visualize lighter background for print, but keep text dark
          // Robust regex extract
          const colorMatch = u.color.match(/bg-([a-z]+)-\d+/);
          const baseColor = colorMatch ? colorMatch[1] : 'gray';
          cellStyle = `bg-${baseColor}-50 text-black border-2 border-${baseColor}-200`;
        }
      } else if (shift?.signups && shift.signups.length > 1) {
        content = "待定";
        cellStyle = "bg-yellow-50 text-black border-2 border-yellow-200";
      }
    }

    currentWeek[dayOfWeek] = { day: d, content, isSpecial, cellStyle, timeString, isClosed, isSunday, isHoliday };

    if (dayOfWeek === 6 || d === daysInMonth) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 overflow-auto flex items-center justify-center">
      <div className="bg-white w-full max-w-5xl min-h-screen md:min-h-0 md:h-auto md:max-h-[95vh] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Toolbar */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center no-print shrink-0">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Printer size={20} className="text-blue-300" /> 列印預覽 / 匯出
          </h1>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
              title="系統將開啟列印視窗，請選擇「另存為 PDF」"
            >
              <FileDown size={18} /> 匯出 PDF
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
            >
              <Printer size={18} /> 列印
            </button>
            <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-0 md:p-8 overflow-auto bg-white flex-1 flex flex-col items-center">
          <div className="print-container w-full h-full">
            {/* Print Header */}
            <div className="text-center mb-4">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-1">{year} 年 {month + 1} 月 燒錄光碟班表</h2>
            </div>

            <table className="w-full border-collapse border border-gray-400 shadow-sm rounded-lg overflow-hidden table-fixed">
              <thead>
                <tr className="bg-gray-100 h-10">
                  {WEEKDAYS.map((d, i) => (
                    <th key={d} className={`border border-gray-900 p-1 text-center font-bold text-xl ${i === 0 ? 'text-red-600' : i === 6 ? 'text-green-700' : 'text-gray-900'
                      }`}>
                      週{d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, idx) => (
                  <tr key={idx} className="h-32">
                    {week.map((cell: any, cIdx: number) => {
                      if (!cell) return <td key={cIdx} className="border border-gray-400 p-2 bg-gray-50/20"></td>;

                      const isWeekend = cIdx === 0 || cIdx === 6;

                      return (
                        <td key={cIdx} className={`border border-gray-900 p-1 align-top relative ${isWeekend ? 'bg-gray-50/50' : ''}`}>
                          {/* Date Number */}
                          <div className="flex justify-between items-start px-2">
                            <span className={`font-bold text-2xl block ${cIdx === 0 ? 'text-red-600' : cIdx === 6 ? 'text-green-700' : 'text-gray-900'}`}>
                              {cell.day}
                            </span>
                            {/* Holiday Badge for Print */}
                            {cell.isHoliday && (
                              <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200 font-bold">假</span>
                            )}
                          </div>

                          {/* Time Display */}
                          {!cell.isClosed && (
                            <div className={`text-sm text-center font-bold mb-1 tracking-tight ${cell.isSunday || cell.isHoliday ? 'text-red-600' : 'text-gray-500'}`}>
                              {cell.timeString}
                            </div>
                          )}

                          <div className="flex justify-center items-center h-full pb-8">
                            {cell.isClosed ? (
                              <div className="flex flex-col items-center">
                                <span className="text-gray-300 font-bold text-2xl border-4 border-gray-200 rounded-xl px-4 py-1 -rotate-12 opacity-80">休診</span>
                              </div>
                            ) : (
                              <div className={`w-[98%] py-1 rounded-lg text-center font-extrabold text-3xl shadow-none ${cell.cellStyle} flex items-center justify-center leading-none h-16`}>
                                {cell.content}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-between text-xs text-gray-400 px-2">
              <span>製表日期：{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media print {
            @page {
                size: landscape;
                margin: 5mm;
            }
            body {
                margin: 0;
                padding: 0;
                background: white;
                visibility: hidden; /* Use visibility instead of display:none */
            }
            
            /* The modal container - Force it to be visible and overlay everything */
            .fixed.inset-0 {
                visibility: visible !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: white !important;
                z-index: 9999;
                display: block !important;
            }

            /* Ensure everything inside the modal is visible */
            .fixed.inset-0 * {
                visibility: visible !important;
            }

            /* Hiding the toolbar inside the modal explicitly */
            .no-print {
                display: none !important;
            }

            .print-container {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                display: block !important;
                transform: none; /* Removed scaling to fill page */
            }

            .overflow-auto {
                overflow: visible !important;
            }

            /* Force Colors */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }

            /* Style Tweaks for Print */
            .shadow-sm, .shadow-2xl, .shadow-lg {
                box-shadow: none !important;
            }
            .border-gray-900, .border-gray-400 {
                border-color: #000 !important;
                border-width: 1px !important;
            }
            table {
                page-break-inside: avoid;
            }
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
        }
      `}</style>
    </div>
  );
};

export default PrintView;