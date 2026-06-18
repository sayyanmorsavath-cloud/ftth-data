import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import PublicReport from "@/pages/PublicReport";
import InstallPrompt from "@/components/InstallPrompt";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Customers = lazy(() => import("@/pages/Customers"));
const CustomerDetail = lazy(() => import("@/pages/CustomerDetail"));
const AddCustomer = lazy(() => import("@/pages/AddCustomer"));
const ImportData = lazy(() => import("@/pages/ImportData"));
const ExportData = lazy(() => import("@/pages/ExportData"));
const Tracking = lazy(() => import("@/pages/Tracking"));
const ReportProblem = lazy(() => import("@/pages/ReportProblem"));
const Reports = lazy(() => import("@/pages/Reports"));
const StaffManagement = lazy(() => import("@/pages/StaffManagement"));
const HelpManual = lazy(() => import("@/pages/HelpManual"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Revenue = lazy(() => import("@/pages/Revenue"));
const CustomerImportBatches = lazy(() => import("@/pages/CustomerImportBatches"));
const StaffStats   = lazy(() => import("@/pages/StaffStats"));
const CustomerMap  = lazy(() => import("@/pages/CustomerMap"));
const Portal       = lazy(() => import("@/pages/Portal"));
const AuditLog          = lazy(() => import("@/pages/AuditLog"));
const ExpiryCalculator  = lazy(() => import("@/pages/ExpiryCalculator"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,
      gcTime: 15 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

// ── strip query-string from hash path before route matching ──────
// wouter treats "/tracking?highlight=1" as a different path from
// "/tracking", causing 404. This hook strips the "?" part so all
// routes match correctly regardless of query params in the hash.
function useHashLocationStripped() {
  const [location, navigate] = useHashLocation();
  return [location.split("?")[0] || "/", navigate];
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-[hsl(0,66%,42%)] border-t-transparent rounded-full animate-spin" />
        ກຳລັງໂຫລດ...
      </div>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">🔒</div>
      <p className="font-semibold text-slate-500">ທ່ານບໍ່ມີສິດທິ໌ເຂົ້າໃຊ້ໜ້ານີ້</p>
    </div>
  );
}

function GuardedRoute({ permKey, component: Comp }) {
  const { canAccess } = useAuth();
  if (!canAccess(permKey)) return <Forbidden />;
  return <Comp />;
}

function Router() {
  const { user, canAccess } = useAuth();
  const [location] = useLocation();

  if (location === "/report") return <PublicReport />;

  if (!user) return <Login />;

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/customers">
            {canAccess("customers") ? <Customers /> : <Forbidden />}
          </Route>
          <Route path="/customers/:id">
            {canAccess("customers") ? <CustomerDetail /> : <Forbidden />}
          </Route>
          <Route path="/add-customer">
            {canAccess("add_customer") ? <AddCustomer /> : <Forbidden />}
          </Route>
          <Route path="/import">
            {canAccess("import") ? <ImportData /> : <Forbidden />}
          </Route>
          <Route path="/export">
            {canAccess("export") ? <ExportData /> : <Forbidden />}
          </Route>
          <Route path="/tracking">
            {canAccess("tracking") ? <Tracking /> : <Forbidden />}
          </Route>
          <Route path="/report-problem">
            {canAccess("report_problem") ? <ReportProblem /> : <Forbidden />}
          </Route>
          <Route path="/reports">
            {canAccess("reports") ? <Reports /> : <Forbidden />}
          </Route>
          <Route path="/revenue">
            {canAccess("revenue") ? <Revenue /> : <Forbidden />}
          </Route>
          <Route path="/help">
            {canAccess("help") ? <HelpManual /> : <Forbidden />}
          </Route>
          <Route path="/pricing">
            {canAccess("pricing") ? <Pricing /> : <Forbidden />}
          </Route>
          <Route path="/customer-import-batches">
            {canAccess("import") ? <CustomerImportBatches /> : <Forbidden />}
          </Route>
          {user.role === "admin" && <Route path="/staff" component={StaffManagement} />}
          <Route path="/staff-stats">
            {canAccess("staff_stats") ? <StaffStats /> : <Forbidden />}
          </Route>
          <Route path="/map">
            {canAccess("map") ? <CustomerMap /> : <Forbidden />}
          </Route>
          <Route path="/audit">
            {canAccess("audit") ? <AuditLog /> : <Forbidden />}
          </Route>
          <Route path="/expiry-calculator">
            {canAccess("expiry_calculator") ? <ExpiryCalculator /> : <Forbidden />}
          </Route>
          <Route path="/portal" component={Portal} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter hook={useHashLocationStripped}>
          <Router />
        </WouterRouter>
        <InstallPrompt />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
