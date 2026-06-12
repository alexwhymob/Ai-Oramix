import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Landing from './pages/Landing';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CustomerRegister from './pages/CustomerRegister';
import Quiz from './pages/Quiz';
import AssessmentComplete from './pages/AssessmentComplete';
import AssessmentLanding from './pages/AssessmentLanding';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCustomers from './pages/admin/Customers';
import AdminAssessmentDetail from './pages/admin/AssessmentDetail';
import AdminReportEditor from './pages/admin/ReportEditor';
import AdminConfiguration from './pages/admin/Configuration';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminAssessmentTemplates from './pages/admin/AssessmentTemplates';
import SubQuiz from './pages/SubQuiz';
import SubAssessmentComplete from './pages/SubAssessmentComplete';

const AuthenticatedApp = () => {
  const { authError } = useAuth();

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Always render routes — AdminLayout handles its own auth protection
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/register" element={<CustomerRegister />} />
      <Route path="/:slug" element={<AssessmentLanding />} />
      <Route path="/quiz/:token" element={<Quiz />} />
      <Route path="/complete/:assessmentId" element={<AssessmentComplete />} />
      <Route path="/sub-quiz/:assessmentId" element={<SubQuiz />} />
      <Route path="/sub-complete/:assessmentId" element={<SubAssessmentComplete />} />
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/customers" element={<AdminCustomers />} />
        <Route path="/admin/assessment/:id" element={<AdminAssessmentDetail />} />
        <Route path="/admin/report/:id" element={<AdminReportEditor />} />
        <Route path="/admin/configuration" element={<AdminConfiguration />} />
        <Route path="/admin/assessment-templates" element={<AdminAssessmentTemplates />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
