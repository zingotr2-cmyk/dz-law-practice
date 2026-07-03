import React, { useState } from "react";
import { 
  CalendarClock, 
  Plus, 
  MapPin, 
  Clock, 
  User, 
  CalendarDays, 
  FileText, 
  X,
  Languages,
  ArrowLeftRight
} from "lucide-react";
import { Appointment } from "../types";

interface AgendaViewProps {
  appointments: Appointment[];
  onAddAppointment: (newAppt: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
}

export default function AgendaView({ 
  appointments, 
  onAddAppointment, 
  onDeleteAppointment 
}: AgendaViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [calendarType, setCalendarType] = useState<"gregorian" | "hijri">("gregorian");

  // Form states
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [notes, setNotes] = useState("");
  const [courtLocation, setCourtLocation] = useState("");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim() || !dateTime) {
      alert("الرجاء تعبئة حقول العنوان، الموكل، والوقت.");
      return;
    }

    const newAppt: Appointment = {
      id: "appt-" + Date.now(),
      title,
      clientName,
      dateTime,
      notes: notes || undefined,
      courtLocation: courtLocation || undefined,
    };

    onAddAppointment(newAppt);
    setShowAddModal(false);

    // Reset
    setTitle("");
    setClientName("");
    setDateTime("");
    setNotes("");
    setCourtLocation("");
  };

  // Convert Date to Hijri roughly for presentation
  const getHijriDateString = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "غير محدد";
      
      // Simple custom approximation of Hijri date or using Intl.DateTimeFormat
      const formatter = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      return formatter.format(date);
    } catch (e) {
      return "١٤٤٧ هـ (تقريبي)";
    }
  };

  const getGregorianDateString = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "غير محدد";
      return date.toLocaleDateString("ar-DZ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }) + " - " + date.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="agenda-view-root">
      
      {/* Header with Switch for Calendar System */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A2232]">الأجندة والمواعيد القضائية</h1>
          <p className="text-xs text-slate-500 mt-1">تتبع المواعيد اليومية، الاستشارات، وجلسات المرافعة</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Calendar Type Selector */}
          <button
            onClick={() => setCalendarType(prev => prev === "gregorian" ? "hijri" : "gregorian")}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-3 rounded-xl border border-slate-200 shadow-sm transition-all"
            id="toggle-calendar-system"
            title="التحويل بين التقويم الهجري والميلادي"
          >
            <ArrowLeftRight size={14} className="text-[#E28743]" />
            <span>نظام التقويم: {calendarType === "gregorian" ? "ميلادي" : "هجري"}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-[#1A2232] hover:bg-[#25324a] text-white font-bold text-xs px-5 py-3.5 rounded-xl shadow-lg transition-all duration-200"
            id="add-appt-btn"
          >
            <Plus size={16} />
            <span>جدولة موعد جديد</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Column (Monthly View Showcase), Right Column (Upcoming Agenda Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Right/Main Column on Desktop - Upcoming Agenda Timeline */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100/80">
            <h3 className="font-bold text-slate-800 text-base mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
              <CalendarClock size={18} className="text-[#E28743]" />
              <span>قائمة المواعيد المجدولة</span>
            </h3>

            {appointments.length > 0 ? (
              <div className="space-y-6">
                {appointments.map((appt) => (
                  <div 
                    key={appt.id}
                    className="relative pl-4 pr-6 py-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all duration-200 group flex flex-col md:flex-row md:items-center justify-between gap-4"
                    id={`appt-item-${appt.id}`}
                  >
                    {/* Vertical marker line */}
                    <span className="absolute right-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-[#E28743] to-amber-500 rounded-r-xl" />

                    <div className="space-y-2">
                      <h4 className="font-extrabold text-[#1A2232] text-sm group-hover:text-[#E28743] transition-colors">
                        {appt.title}
                      </h4>
                      
                      {/* Date display based on user preference */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-[#E28743]" />
                          <span>
                            {calendarType === "gregorian" 
                              ? getGregorianDateString(appt.dateTime) 
                              : getHijriDateString(appt.dateTime)
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>الموكل: {appt.clientName}</span>
                        </div>
                      </div>

                      {appt.notes && (
                        <p className="text-xs text-slate-400 font-medium leading-relaxed bg-white border border-slate-100/60 p-2.5 rounded-lg">
                          {appt.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                      {appt.courtLocation && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <MapPin size={12} className="text-rose-500" />
                          <span>{appt.courtLocation}</span>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          if (confirm("هل تريد إلغاء أو حذف هذا الموعد؟")) {
                            onDeleteAppointment(appt.id);
                          }
                        }}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                      >
                        إلغاء الموعد
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                <CalendarClock size={40} className="mx-auto text-slate-300 mb-2" />
                <h4 className="font-bold text-slate-700 text-sm">الأجندة فارغة اليوم</h4>
                <p className="text-xs text-slate-400">لا توجد مواعيد مضافة حالياً. انقر زر الجدولة لإضافة موعد.</p>
              </div>
            )}
          </div>
        </div>

        {/* Left/Sidebar Column on Desktop - Decorative Calendar Showcase & Rules */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100/80">
            <h3 className="font-bold text-slate-800 text-sm mb-4">تقويم الشهر الحزيراني (جوان)</h3>
            
            {/* Elegant Calendar Grid Mock */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600 border-b border-slate-100 pb-2">
                <span>جوان 2026</span>
                <span className="text-amber-600 font-serif">١٤٤٧ هـ</span>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                <span>ح</span><span>ن</span><span>ث</span><span>ر</span><span>خ</span><span>ج</span><span>س</span>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-700">
                <span className="text-slate-300">26</span>
                <span className="text-slate-300">27</span>
                <span className="text-slate-300">28</span>
                <span className="text-slate-300">29</span>
                <span className="text-slate-300">30</span>
                <span className="text-slate-300">31</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>7</span>
                <span>8</span>
                <span>9</span>
                <span>10</span>
                <span>11</span>
                <span>12</span>
                <span>13</span>
                <span>14</span>
                <span>15</span>
                <span>16</span>
                <span>17</span>
                <span>18</span>
                <span>19</span>
                <span>20</span>
                <span>21</span>
                <span>22</span>
                <span>23</span>
                <span>24</span>
                <span>25</span>
                {/* Active marker day */}
                <span className="relative flex items-center justify-center bg-[#E28743] text-white font-bold h-6 w-6 rounded-full mx-auto shadow-sm">
                  26
                  <span className="absolute bottom-0 h-1 w-1 bg-white rounded-full" />
                </span>
                <span>27</span>
                <span>28</span>
                <span>29</span>
                <span>30</span>
              </div>

              <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100/50 text-[11px] text-amber-800 font-semibold leading-relaxed">
                📢 **تنبيه إجرائي:** يرجى الانتباه أن الآجال القانونية في قانون الإجراءات المدنية الجزائري تُحسب بالأيام الكاملة (مثال: الاستئناف خلال 30 يوماً).
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" id="add-appt-modal">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up border border-slate-100">
            {/* Modal Header */}
            <div className="bg-[#1A2232] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={18} className="text-[#E28743]" />
                <h3 className="font-bold text-sm">جدولة موعد قضائي جديد</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-white/70 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">عنوان الموعد / الغرض <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#E28743]"
                  placeholder="مثال: مراجعة عريضة الدفع بعدم الاختصاص"
                />
              </div>

              {/* Client Name & Time Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">الموكل المعني <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#E28743]"
                    placeholder="اسم الموكل"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">التاريخ والوقت <span className="text-rose-500">*</span></label>
                  <input
                    type="datetime-local"
                    required
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#E28743]"
                  />
                </div>
              </div>

              {/* Court Location */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">المكان / المحكمة (اختياري)</label>
                <input
                  type="text"
                  value={courtLocation}
                  onChange={(e) => setCourtLocation(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#E28743]"
                  placeholder="مثال: مجلس قضاء الجزائر أو مكتب المحاماة"
                />
              </div>

              {/* Description / Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">ملاحظات وتفاصيل إضافية (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#E28743] resize-none"
                  placeholder="ملاحظات حول الملفات المطلوبة لإحضارها..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-3 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-[#E28743] hover:bg-[#d07532] text-[#1A2232] font-bold text-xs px-5 py-3 rounded-xl transition-colors shadow-md"
                >
                  حفظ الموعد بالأجندة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
