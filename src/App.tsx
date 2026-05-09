import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ActionGateProvider } from "@/hooks/useActionGate";
import { AuthProvider } from "@/hooks/useAuth";

import TimewarpOG from "./pages/TimewarpOG";
import Auth from "./pages/Auth";
import AiCeo from "./pages/AiCeo";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfPurchase from "./pages/TermsOfPurchase";
import InviteAccept from "./pages/InviteAccept";
import PricingPage from "./pages/PricingPage";
import Support from "./pages/Support";
import DataDeletion from "./pages/DataDeletion";
import SuperchargeDna from "./pages/SuperchargeDna";

// New /app/* nested-route shell + pages (replaces the old monolithic
// Database.tsx state-machine page).
import AppShell from "./pages/app/AppShell";
import AssistantPage from "./pages/app/AssistantPage";
import DashboardPage from "./pages/app/DashboardPage";
import DnaPage from "./pages/app/DnaPage";
import DnaDetailPage from "./pages/app/DnaDetailPage";
import WorkforcePage from "./pages/app/WorkforcePage";
import ConnectionsPage from "./pages/app/ConnectionsPage";
import { RouteErrorBoundary } from "./components/error/RouteErrorBoundary";
import WorkspacesPage from "./pages/app/WorkspacesPage";
import SettingsPage from "./pages/app/SettingsPage";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ActionGateProvider>
                <Routes>
                  <Route path="/" element={<AiCeo />} />
                  <Route path="/auth" element={<Auth />} />

                  {/* /app/* — nested routes under AppShell (auth guard,
                       BusinessDNAProvider, sidebar, OAuth/purchase/referral
                       handlers all live in AppShell). */}
                  <Route path="/app" element={<AppShell />}>
                    <Route index element={<Navigate to="assistant" replace />} />
                    <Route path="assistant" element={<RouteErrorBoundary label="Assistant"><AssistantPage /></RouteErrorBoundary>} />
                    <Route path="dashboard" element={<RouteErrorBoundary label="Dashboard"><DashboardPage /></RouteErrorBoundary>} />
                    <Route path="dna" element={<RouteErrorBoundary label="Business DNA"><DnaPage /></RouteErrorBoundary>} />
                    <Route path="dna/:brandId" element={<RouteErrorBoundary label="Business DNA"><DnaDetailPage /></RouteErrorBoundary>} />
                    <Route path="dna/:brandId/:pillar" element={<RouteErrorBoundary label="Business DNA"><DnaDetailPage /></RouteErrorBoundary>} />
                    <Route path="employees" element={<Navigate to="/app/workforce?tab=employees" replace />} />
                    <Route path="agents" element={<Navigate to="/app/workforce?tab=agents" replace />} />
                    <Route path="workforce" element={<RouteErrorBoundary label="Workforce"><WorkforcePage /></RouteErrorBoundary>} />
                    <Route path="connections" element={<RouteErrorBoundary label="Connections"><ConnectionsPage /></RouteErrorBoundary>} />
                    <Route path="workspaces" element={<WorkspacesPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    {/* Anything else under /app falls back to assistant. */}
                    <Route path="*" element={<Navigate to="assistant" replace />} />
                  </Route>

                  <Route path="/supercharge-dna" element={<SuperchargeDna />} />
                  <Route path="/timewarp-og" element={<TimewarpOG />} />
                  <Route path="/invite" element={<InviteAccept />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfPurchase />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/data-deletion" element={<DataDeletion />} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ActionGateProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
