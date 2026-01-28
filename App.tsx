
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Registration, DayType, TimeSlot } from './types';
import { 
  generateTimeSlots, 
  getStoredRegistrations, 
  saveRegistrationLocal, 
  overwriteLocalRegistrations,
  saveToGoogleSheets,
  getGoogleSheetsUrl,
  setGoogleSheetsUrl,
  fetchRegistrationsFromGoogleSheets,
  subscribeToRegistrations,
  normalizeDate,
  normalizeTime
} from './utils';
import { GoogleGenAI } from '@google/genai';

const Navbar = ({ isConnected, isLoading }: { isConnected: boolean, isLoading: boolean }) => (
  <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
            <i className="fas fa-camera-retro text-xl"></i>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">時段預約系統</span>
        </div>
        <div className="flex text-sm font-medium items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-400 animate-ping' : isConnected ? 'bg-green-500' : 'bg-gray-300'}`}></span>
          <span className={isConnected ? 'text-green-600' : 'text-gray-400'}>
            {isLoading ? '同步中...' : isConnected ? '雲端連線正常' : '未連接'}
          </span>
        </div>
      </div>
    </div>
  </nav>
);

const SuccessModal = ({ reg, onClose }: { reg: Registration, onClose: () => void }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in">
    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"></div>
    <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up transform transition-all">
      <div className="bg-blue-600 p-8 text-center text-white relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <i className="fas fa-camera text-8xl"></i>
        </div>
        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">
          <i className="fas fa-check text-2xl"></i>
        </div>
        <h2 className="text-2xl font-bold">拍攝預約成功</h2>
        <p className="opacity-80 text-sm mt-1">期待您的到來，為您記錄幸福瞬間</p>
      </div>
      
      <div className="p-8">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="bg-gray-50 w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 flex-shrink-0">
              <i className="fas fa-user"></i>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">預約人姓名</p>
              <p className="text-lg font-bold text-gray-800">{reg.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-gray-50 w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 flex-shrink-0">
                <i className="fas fa-calendar"></i>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">拍攝日期</p>
                <p className="text-lg font-bold text-gray-800">{reg.date}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-gray-50 w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 flex-shrink-0">
                <i className="fas fa-clock"></i>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">具體時段</p>
                <p className="text-lg font-bold text-gray-800">{reg.timeSlot}</p>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all active:scale-95 shadow-lg"
        >
          完成並關閉
        </button>
      </div>
    </div>
  </div>);

const StatsModal = ({ registrations, onClose }: { registrations: Registration[], onClose: () => void }) => {
  const days = ['2025-01-22', '2025-01-23'] as DayType[];
  const slots = generateTimeSlots(8, 0, 12, 0, 10, []).concat(generateTimeSlots(13, 30, 17, 30, 10, []));

  const getRegistrationForSlot = (date: string, startTime: string) => {
    return registrations.find(r => normalizeDate(r.date) === date && normalizeTime(r.timeSlot) === startTime);
  };

  const downloadCSV = () => {
    const headers = ['日期', '時段', '姓名', '單位', '分機'];
    const rows = registrations
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        return dateCompare !== 0 ? dateCompare : a.timeSlot.localeCompare(b.timeSlot);
      })
      .map(r => [r.date, r.timeSlot, r.name, r.department, r.extension]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
    element.setAttribute('download', `預約統計_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold">預約統計表</h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-8">
          {/* 統計表格 */}
          <div className="mb-8 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="border border-gray-300 p-3 text-left font-bold">時段</th>
                  {days.map(day => (
                    <th key={day} className="border border-gray-300 p-3 text-center font-bold">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.startTime} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 p-3 font-bold text-gray-700 whitespace-nowrap">
                      {slot.label}
                    </td>
                    {days.map(day => {
                      const reg = getRegistrationForSlot(day, normalizeTime(slot.startTime));
                      return (
                        <td key={`${day}-${slot.startTime}`} className="border border-gray-300 p-3 text-center">
                          {reg ? (
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                              <div className="text-xs font-bold text-red-600">已預約</div>
                              <div className="text-xs text-gray-700 mt-1">{reg.name}</div>
                              <div className="text-xs text-gray-600">{reg.department}</div>
                            </div>
                          ) : (
                            <div className="text-green-600 font-bold">✓ 可預約</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 詳細預約列表 */}
          <div className="mt-8 border-t-2 border-gray-300 pt-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">詳細預約清單</h3>
            {registrations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">目前沒有預約</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="border border-gray-300 p-3 text-left">日期</th>
                      <th className="border border-gray-300 p-3 text-left">時段</th>
                      <th className="border border-gray-300 p-3 text-left">姓名</th>
                      <th className="border border-gray-300 p-3 text-left">單位</th>
                      <th className="border border-gray-300 p-3 text-left">分機</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations
                      .sort((a, b) => {
                        const dateCompare = a.date.localeCompare(b.date);
                        return dateCompare !== 0 ? dateCompare : a.timeSlot.localeCompare(b.timeSlot);
                      })
                      .map((reg) => (
                        <tr key={reg.id} className="hover:bg-gray-50 border-b border-gray-200">
                          <td className="border border-gray-300 p-3">{reg.date}</td>
                          <td className="border border-gray-300 p-3">{reg.timeSlot}</td>
                          <td className="border border-gray-300 p-3 font-bold">{reg.name}</td>
                          <td className="border border-gray-300 p-3">{reg.department}</td>
                          <td className="border border-gray-300 p-3">{reg.extension}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 下載按鈕 */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={downloadCSV}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-download"></i>
              下載為 CSV
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-400 transition-all active:scale-95"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<DayType>('2025-01-22');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [formData, setFormData] = useState({ name: '', department: '', extension: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastReg, setLastReg] = useState<Registration | null>(null);
  const [aiGreeting, setAiGreeting] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [gsUrl, setGsUrl] = useState(getGoogleSheetsUrl());

  const syncWithCloud = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    
    const cloudData = await fetchRegistrationsFromGoogleSheets();
    
    if (cloudData !== null) {
      setRegistrations(cloudData);
      overwriteLocalRegistrations(cloudData);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setRegistrations(getStoredRegistrations());
    
    // 訂閱 Firebase Firestore 的實時更新
    const unsubscribe = subscribeToRegistrations((updatedRegs) => {
      setRegistrations(updatedRegs);
      overwriteLocalRegistrations(updatedRegs);
    });
    
    // 初始同步一次
    syncWithCloud();
    
    const fetchAi = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const resp = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: '請寫一段親切的拍攝登記歡迎語，關於幸福與攝影，不超過25字。',
        });
        setAiGreeting(resp.text || '歡迎預約拍攝時段！');
      } catch {
        setAiGreeting('歡迎預約您的幸福拍攝時段。');
      }
    };
    fetchAi();

    // 清理：取消監聽
    return () => {
      unsubscribe();
    };
  }, [syncWithCloud]);

  // 強化比對邏輯：將當前選擇的日期也進行標準化後再比對
  const bookedTimes = useMemo(() => {
    const targetDate = normalizeDate(selectedDate);
    return registrations
      .filter((r) => normalizeDate(r.date) === targetDate)
      .map((r) => normalizeTime(r.timeSlot));
  }, [registrations, selectedDate]);

  const morningSlots = useMemo(() => 
    generateTimeSlots(8, 0, 12, 0, 10, bookedTimes), 
  [bookedTimes]);

  const afternoonSlots = useMemo(() => 
    generateTimeSlots(13, 30, 17, 30, 10, bookedTimes), 
  [bookedTimes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setIsSubmitting(true);
    
    const newReg: Registration = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      date: normalizeDate(selectedDate),
      timeSlot: normalizeTime(selectedSlot),
      createdAt: Date.now(),
    };

    // 提交到 Firebase（不再需要本地保存，Firebase 會自動推送更新）
    const success = await saveToGoogleSheets('', newReg);
    
    if (success) {
      setLastReg(newReg); 
      setFormData({ name: '', department: '', extension: '' });
      setSelectedSlot(null);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar isConnected={true} isLoading={isLoading} />
      
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-8">
        <div className="mb-8 text-center sm:text-left animate-fade-in flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
              守護四十.幸福顯影「拍」對
            </h1>
            <p className="text-gray-600 flex items-center justify-center sm:justify-start gap-2">
              <i className="fas fa-sparkles text-blue-500"></i>
              {aiGreeting}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => syncWithCloud()}
              disabled={isLoading}
              className="text-xs bg-white border border-gray-200 px-4 py-2 rounded-full font-bold text-gray-500 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap disabled:opacity-50"
            >
              <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
              重新整理時段
            </button>
            <button 
              onClick={() => setShowStats(true)}
              className="text-xs bg-blue-600 text-white px-4 py-2 rounded-full font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              <i className="fas fa-chart-table"></i>
              預約統計
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 w-7 h-7 flex items-center justify-center rounded-full text-sm">1</span>
                日期
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(['2025-01-22', '2025-01-23'] as DayType[]).map(d => (
                  <button
                    key={d}
                    onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedDate === d 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold' 
                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    <div className="text-lg">{d.split('-').slice(1).join('/')}</div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-2 lg:row-span-2 relative">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px] h-full">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 w-7 h-7 flex items-center justify-center rounded-full text-sm">2</span>
                時段 (10分鐘/人)
              </h2>

              <div className="space-y-8">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <i className="fas fa-sun text-yellow-500"></i>
                    上午 08:00 - 12:00
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {morningSlots.map((slot) => (
                      <SlotButton
                        key={slot.startTime}
                        slot={slot}
                        isSelected={selectedSlot === slot.startTime}
                        onClick={() => !slot.isBooked && setSelectedSlot(slot.startTime)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <i className="fas fa-cloud-sun text-orange-400"></i>
                    下午 13:30 - 17:30
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {afternoonSlots.map((slot) => (
                      <SlotButton
                        key={slot.startTime}
                        slot={slot}
                        isSelected={selectedSlot === slot.startTime}
                        onClick={() => !slot.isBooked && setSelectedSlot(slot.startTime)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            <section className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 h-full ${!selectedSlot ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100 shadow-md ring-2 ring-blue-50'}`}>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 w-7 h-7 flex items-center justify-center rounded-full text-sm">3</span>
                報名資料
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-100 outline-none"
                  placeholder="姓名"
                />
                <input
                  required
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData(f => ({ ...f, department: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-100 outline-none"
                  placeholder="單位"
                />
                <input
                  required
                  type="text"
                  value={formData.extension}
                  onChange={(e) => setFormData(f => ({ ...f, extension: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-100 outline-none"
                  placeholder="分機"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transform transition-active active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-400"
                >
                  {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                  確認報名
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>

      {lastReg && (
        <SuccessModal 
          reg={lastReg} 
          onClose={() => {
            setLastReg(null);
            syncWithCloud(); 
          }} 
        />
      )}

      {showConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-6">同步網址設定</h2>
            <input
              type="url"
              value={gsUrl}
              onChange={(e) => setGsUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border mb-6"
              placeholder="https://..."
            />
            <div className="flex gap-3">
              <button onClick={() => setShowConfig(false)} className="flex-1 py-3 font-bold">取消</button>
              <button onClick={() => { setGoogleSheetsUrl(gsUrl); syncWithCloud(); setShowConfig(false); }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">儲存</button>
            </div>
          </div>
        </div>
      )}

      {showStats && (
        <StatsModal 
          registrations={registrations}
          onClose={() => setShowStats(false)}
        />
      )}

      <footer className="py-10 text-center">
        <button onClick={() => setShowConfig(true)} className="text-gray-300 hover:text-blue-500">
          <i className="fas fa-cog"></i>
        </button>
      </footer>

      <style>{`
        @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

const SlotButton: React.FC<{ slot: TimeSlot, isSelected: boolean, onClick: () => void }> = ({ slot, isSelected, onClick }) => {
  if (slot.isBooked) {
    return (
      <button disabled className="px-3 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-300 text-xs font-medium cursor-not-allowed flex items-center justify-center gap-1">
        <span>{slot.startTime}</span>
        <span className="text-[8px] px-1 bg-gray-200 rounded text-gray-400">FULL</span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`px-3 py-3 rounded-xl border transition-all text-xs font-bold flex items-center justify-center gap-2 ${
        isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-green-100 text-green-700 hover:bg-green-50'
      }`}
    >
      {slot.startTime}
    </button>
  );
};

export default App;
