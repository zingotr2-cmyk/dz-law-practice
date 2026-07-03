import React, { useState } from "react";
import { Menu, Scale, ShieldAlert, LogOut, Info } from "lucide-react";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import CasesView from "./components/CasesView";
import AgendaView from "./components/AgendaView";
import AiHubView from "./components/AiHubView";
import ContractsView from "./components/ContractsView";
import LoginView from "./components/LoginView";
import SubscriptionManagementView from "./components/SubscriptionManagementView";
import PlanSelectionView from "./components/PlanSelectionView";
import SuperAdminDashboard from "./components/SuperAdminDashboard";

import { 
  defaultCases, 
  defaultAppointments, 
  defaultTimelineAlerts 
} from "./data/defaultData";
import { Case, Appointment, Lawyer } from "./types";

export default function App() {
  // Global lawyers state for simulated database sync
  const [lawyers, setLawyers] = useState<Lawyer[]>([
    {
      id: "lawyer-1",
      name: "أحمد بن علي",
      email: "ahmed@law.dz",
      phone: "0550123456",
      region: "الجزائر العاصمة",
      registrationDate: "2026-06-25 09:30",
      status: "نشط",
      plan: "annual",
    },
    {
      id: "lawyer-2",
      name: "مريم قايدي",
      email: "mariem@law.dz",
      phone: "0661987654",
      region: "باتنة",
      registrationDate: "2026-06-26 14:15",
      status: "معلق",
      plan: "monthly",
      receiptUrl: "ccp_receipt_mariem.png"
    },
    {
      id: "lawyer-3",
      name: "مراد تواتي",
      email: "mourad@law.dz",
      phone: "0770123789",
      region: "وهران",
      registrationDate: "2026-06-27 11:00",
      status: "غير مؤكد الإيميل",
      plan: "trial",
    },
    {
      id: "lawyer-4",
      name: "إبراهيم منصوري",
      email: "ibrahim@law.dz",
      phone: "0772456789",
      region: "باتنة",
      registrationDate: "2026-01-01 08:00",
      status: "نشط",
      plan: "annual",
    }
  ]);

  // Authentication & Subscription states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [currentLawyerName, setCurrentLawyerName] = useState<string>("");
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState<boolean>(false);
  const [hasSelectedPlan, setHasSelectedPlan] = useState<boolean>(false);

  // Simulated Reviewer Admin Mode Switch
  const [isAdminView, setIsAdminView] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Core Application States (Enabling real interactivity)
  const [cases, setCases] = useState<Case[]>(defaultCases);
  const [appointments, setAppointments] = useState<Appointment[]>(defaultAppointments);
  const [timelineAlerts, setTimelineAlerts] = useState(defaultTimelineAlerts);

  // Dynamic lookup of currently logged-in lawyer
  const currentLawyerObj = lawyers.find(
    (l) => l.email.toLowerCase() === currentUserEmail.toLowerCase()
  );

  // State handlers
  const handleAddCase = (newCase: Case) => {
    setCases(prev => [newCase, ...prev]);
    
    // Dynamically insert timeline alert if next hearing exists
    if (newCase.hearingDate) {
      setTimelineAlerts(prev => [
        {
          id: "alert-" + Date.now(),
          caseTitle: newCase.title,
          courtName: newCase.court || "المحكمة المختصة",
          chamberNumber: newCase.chamber || "الغرفة العامة",
          hearingDate: newCase.hearingDate!,
          daysRemaining: newCase.appealDaysLeft,
          type: "hearing"
        },
        ...prev
      ]);
    }
  };

  const handleUpdateCaseStatus = (id: string, status: "active" | "closed") => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleDeleteCase = (id: string) => {
    setCases(prev => prev.filter(c => c.id !== id));
  };

  const handleAddAppointment = (newAppt: Appointment) => {
    setAppointments(prev => [newAppt, ...prev]);
  };

  const handleDeleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  // Live updates to lawyer records from Admin Dashboard Actions
  const handleUpdateLawyerStatus = (id: string, status: Lawyer["status"]) => {
    setLawyers(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const handleRegisterLawyer = (newLawyer: Lawyer) => {
    setLawyers(prev => [...prev, newLawyer]);
  };

  const handlePaymentProofSubmit = (plan: "monthly" | "annual", receiptName: string) => {
    setLawyers(prev => prev.map(l => l.email.toLowerCase() === currentUserEmail.toLowerCase() ? {
      ...l,
      status: "معلق",
      plan: plan,
      receiptUrl: receiptName
    } : l));
  };

  const handleLoginSuccess = (email: string, lawyerName: string, isExpired: boolean) => {
    setCurrentUserEmail(email);
    setCurrentLawyerName(lawyerName);
    setIsSubscriptionExpired(isExpired);
    setIsLoggedIn(true);

    // Look up this lawyer to see if they've already completed plan selection
    const found = lawyers.find(l => l.email.toLowerCase() === email.toLowerCase());
    if (found && (found.plan === "trial" || found.plan === "monthly" || found.plan === "annual")) {
      setHasSelectedPlan(true);
    } else {
      setHasSelectedPlan(false); // Force onboarding plan selection screen
    }
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUserEmail("");
    setCurrentLawyerName("");
    setIsSubscriptionExpired(false);
    setHasSelectedPlan(false);
  };

  // Check if lawyer has suspended status
  const isSuspended = currentLawyerObj?.status === "موقوف" || isSubscriptionExpired;

  // Dynamic View Renderer based on activeTab
  const renderContent = () => {
    // If subscription is expired or account is suspended, restrict access
    if (isSuspended && activeTab !== "subscriptions") {
      return (
        <div className="text-center py-16 bg-white rounded-3xl border border-red-100 p-8 max-w-xl mx-auto space-y-4 shadow-sm" dir="rtl">
          <div className="mx-auto h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-lg font-extrabold text-[#1A2232]">تم تجميد لوحة التحكم مؤقتاً</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            انتهت فترة اشتراكك في منصة المكتب القضائي أو تم تعليق رخصة الممارس من قبل الإدارة. يرجى تفعيل اشتراكك لتتمكن من الوصول لملفات القضايا، وجلسات الأجندة، ومعالجات الذكاء الاصطناعي.
          </p>
          <button
            onClick={() => setActiveTab("subscriptions")}
            className="bg-[#D4A843] hover:bg-[#c39735] text-[#1A2232] font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md inline-block"
          >
            الانتقال لصفحة تجديد الاشتراك
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardView 
            cases={cases}
            appointments={appointments}
            timelineAlerts={timelineAlerts}
            onNavigate={(tab) => setActiveTab(tab)}
            onAddCase={handleAddCase}
          />
        );
      case "cases":
        return (
          <CasesView 
            cases={cases}
            onAddCase={handleAddCase}
            onUpdateCaseStatus={handleUpdateCaseStatus}
            onDeleteCase={handleDeleteCase}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case "agenda":
        return (
          <AgendaView 
            appointments={appointments}
            onAddAppointment={handleAddAppointment}
            onDeleteAppointment={handleDeleteAppointment}
          />
        );
      case "ai-hub":
        return (
          <AiHubView 
            casesCount={cases.length} 
            onNavigate={(tab) => setActiveTab(tab)} 
          />
        );
      case "contracts":
        return <ContractsView />;
      case "subscriptions":
        return <SubscriptionManagementView />;
      default:
        return <div className="text-center py-12">الصفحة قيد الإنشاء...</div>;
    }
  };

  // Get localized header title for current active state
  const getHeaderTitle = () => {
    switch (activeTab) {
      case "dashboard": return "اللوحة الرئيسية";
      case "cases": return "الملفات والقضايا";
      case "agenda": return "الأجندة والمواعيد";
      case "ai-hub": return "معالجة الذكاء الاصطناعي";
      case "contracts": return "المستندات والتحليلات";
      case "subscriptions": return "إدارة تراخيص واشتراكات المحامين";
      default: return "الرئيسية";
    }
  };

  // =========================================================================
  // VIEW RENDER LOGIC FLOWS
  // =========================================================================

  // 1. Render Super Admin Dashboard immediately if Admin View is toggled
  if (isAdminView) {
    return (
      <div className="min-h-screen bg-[#1A2232]">
        {/* Glowing Admin Switcher Bar at the top */}
        <div className="bg-gradient-to-r from-amber-500 via-[#E28743] to-amber-600 text-[#1A2232] px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-2 z-50 relative shadow-md text-right text-xs font-black">
          <div className="flex items-center gap-2">
            <span className="bg-[#1A2232] text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">بيئة المراجعة والمطابقة المباشرة</span>
            <span>بصفتك مراجعاً، يمكنك تفعيل طلب الدفع للمحامين المعلقين وملاحظة التحديث المباشر فوراً!</span>
          </div>
          <button
            onClick={() => setIsAdminView(false)}
            className="bg-[#1A2232] hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl border border-white/10 shadow-sm transition-all text-[11px] font-bold"
          >
            🔄 التبديل إلى حساب المحامي (مساحة العمل لـ أحمد)
          </button>
        </div>
        
        <SuperAdminDashboard 
          lawyers={lawyers}
          onUpdateLawyerStatus={handleUpdateLawyerStatus}
          onCloseAdminView={() => setIsAdminView(false)}
        />
      </div>
    );
  }

  // 2. If not logged in, render the beautiful secure Lawyer Login & Registration Flow
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#1A2232]">
        {/* Floating Switcher Bar at the top of Auth pages */}
        <div className="bg-gradient-to-r from-amber-500 via-[#E28743] to-amber-600 text-[#1A2232] px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 z-50 relative shadow-sm text-right text-xs font-black">
          <div className="flex items-center gap-1.5">
            <span className="bg-[#1A2232] text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">المحاكاة</span>
            <span>تريد تجربة لوحة تحكم المشرف العام الأستاذ إبراهيم دون تسجيل الدخول؟</span>
          </div>
          <button
            onClick={() => setIsAdminView(true)}
            className="bg-[#1A2232] hover:bg-slate-800 text-[#D4A843] hover:text-white px-4 py-1.5 rounded-xl border border-[#D4A843]/20 shadow-sm transition-all text-[11px] font-bold"
          >
            👑 الدخول المباشر إلى لوحة المشرف
          </button>
        </div>
        
        <LoginView 
          onLoginSuccess={handleLoginSuccess} 
          lawyers={lawyers}
          onRegisterLawyer={handleRegisterLawyer}
        />
      </div>
    );
  }

  // 3. Render premium Subscription Plan Selection Screen after logging in
  // Check if current lawyer has a pending payment proof or hasn't selected a plan
  const planIsNone = currentLawyerObj?.plan === "none";
  const statusIsPending = currentLawyerObj?.status === "معلق";

  if (!hasSelectedPlan || planIsNone || statusIsPending) {
    return (
      <div className="min-h-screen bg-[#1A2232]">
        {/* Floating Switcher Bar inside Onboarding pages */}
        <div className="bg-gradient-to-r from-amber-500 via-[#E28743] to-amber-600 text-[#1A2232] px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-2 z-50 relative shadow-md text-right text-xs font-black">
          <div className="flex items-center gap-2">
            <span className="bg-[#1A2232] text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">محاكي التدفق</span>
            <span>بعد تقديم وصل الدفع، اضغط على زر المشرف العام بالأعلى لتفعيل الاشتراك فوراً وملاحظة النتيجة!</span>
          </div>
          <button
            onClick={() => setIsAdminView(true)}
            className="bg-[#1A2232] hover:bg-slate-800 text-[#D4A843] hover:text-white px-4 py-1.5 rounded-xl border border-[#D4A843]/20 shadow-sm transition-all text-[11px] font-bold"
          >
            👑 التبديل للوحة المشرف العام لتفعيل الحساب
          </button>
        </div>

        <PlanSelectionView 
          lawyerName={currentLawyerName}
          lawyerEmail={currentUserEmail}
          lawyers={lawyers}
          onSubmitPaymentProof={handlePaymentProofSubmit}
          onSelectFreeTrial={() => {
            setHasSelectedPlan(true);
            setIsSubscriptionExpired(false); // Enable account immediately upon selecting trial
            
            // Sync with global state list
            setLawyers(prev => prev.map(l => l.email.toLowerCase() === currentUserEmail.toLowerCase() ? {
              ...l,
              status: "نشط",
              plan: "trial"
            } : l));
          }}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#1A2232] flex flex-col" id="app-wrapper">
      
      {/* Dynamic Reviewer Switcher Strip inside workspace */}
      <div className="bg-gradient-to-r from-amber-500 via-[#E28743] to-amber-600 text-[#1A2232] px-10 py-2.5 flex flex-col md:flex-row items-center justify-between gap-2 z-30 shadow-md text-right text-xs font-black shrink-0">
        <div className="flex items-center gap-2">
          <span className="bg-[#1A2232] text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">بوابة محاكاة الرخص</span>
          <span>يمكنك التبديل إلى لوحة الإدارة لمشاهدة دليل التسجيل الكامل وتجميد أو تعديل حالة التراخيص!</span>
        </div>
        <button
          onClick={() => setIsAdminView(true)}
          className="bg-[#1A2232] hover:bg-slate-800 text-[#D4A843] hover:text-white px-4 py-1.5 rounded-xl border border-[#D4A843]/20 shadow-sm transition-all text-[11px] font-bold"
        >
          👑 التبديل إلى لوحة المشرف العام (الأستاذ إبراهيم)
        </button>
      </div>

      <div className="flex flex-row-reverse flex-1 min-h-0" id="app-body-container">
        
        {/* 1. Permanent Right-aligned Sidebar on Desktop, Collapsible drawer on Mobile */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          lawyerName={currentLawyerName}
          lawyerEmail={currentUserEmail}
          isSubscriptionExpired={isSuspended}
          onLogout={handleLogout}
          casesCount={cases.length}
        />

        {/* 2. Main Workspace Layout */}
        <div className="flex-1 min-w-0 xl:mr-80 flex flex-col min-h-screen" id="main-workspace">
          
          {/* Top Sticky Header for Mobile Layout Viewports */}
          <header 
            id="app-mobile-header"
            className="xl:hidden bg-[#1A2232] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md border-b border-white/5"
          >
            {/* Hamburger and Logout Menu */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/95 transition-colors"
                id="mobile-hamburger-btn"
              >
                <Menu size={24} />
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 font-bold text-xs px-3 py-1.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/30 transition-all"
                id="mobile-logout-btn"
                title="تسجيل الخروج من الجلسة"
              >
                <LogOut size={14} className="rotate-180" />
                <span>خروج</span>
              </button>
            </div>

            {/* Title right-centered */}
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide">{getHeaderTitle()}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E28743] text-[#1A2232]">
                <Scale size={16} />
              </div>
            </div>
          </header>

          {/* Desktop Sticky Header Title Bar */}
          <header 
            className="hidden xl:flex items-center justify-between px-10 py-5 bg-white border-b border-slate-100/80 sticky top-0 z-10 shadow-[0_2px_15px_rgba(0,0,0,0.01)]"
            id="app-desktop-header"
          >
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[#E28743] animate-pulse" />
              <span className="font-extrabold text-base text-[#1A2232]">{getHeaderTitle()}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                توقيت مكة المكرمة / الجزائر: 2026-06-27
              </span>
              
              {/* Added prominent Logout Button in desktop header */}
              <button
                onClick={handleLogout}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 font-extrabold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm"
                id="desktop-header-logout-btn"
              >
                <LogOut size={14} className="rotate-180 text-rose-500" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </header>

          {/* Dynamic Expired Alert Banner inside main workspace if account is expired/suspended */}
          {isSuspended && (
            <div className="mx-6 mt-6 md:mx-10 md:mt-8 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm" id="workspace-expired-banner">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600 shrink-0 font-bold">⚠️</span>
                <span className="font-bold">تنبيه: تم تعليق رخصة الاستخدام أو تجميد اشتراكك من قبل الإدارة. يرجى المتابعة مع الإدارة.</span>
              </div>
              <button 
                onClick={() => setActiveTab("subscriptions")}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2 rounded-xl text-[11px] transition-colors shrink-0"
              >
                تجديد الاشتراك الآن
              </button>
            </div>
          )}

          {/* Dynamic Rejected Payment Proof Alert Banner if status is "مرفوض" */}
          {currentLawyerObj?.status === "مرفوض" && !isSuspended && (
            <div className="mx-6 mt-6 md:mx-10 md:mt-8 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm" id="workspace-rejected-banner">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shrink-0 font-bold">❌</span>
                <div className="text-right">
                  <span className="font-extrabold block">تم رفض وصل دفع الاشتراك من قبل الإدارة!</span>
                  <span className="text-slate-500 text-[11px]">يرجى إعادة رفع صورة الوصل الصحيحة لتمكين تفعيل رخصتك السحابية.</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  // Reset status back to unverified so they can select a plan and re-submit proof
                  setLawyers(prev => prev.map(l => l.email.toLowerCase() === currentUserEmail.toLowerCase() ? {
                    ...l,
                    status: "غير مؤكد الإيميل",
                    plan: "none",
                    receiptUrl: undefined
                  } : l));
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-[11px] transition-colors shrink-0"
              >
                إعادة المحاولة ورفع وصل جديد
              </button>
            </div>
          )}

          {/* Workspace Scrollable Canvas with ample negative space */}
          <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8 max-w-7xl w-full mx-auto" id="workspace-main-content">
            {renderContent()}
          </main>
        </div>

      </div>

    </div>
  );
}
