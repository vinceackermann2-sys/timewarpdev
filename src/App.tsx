import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import TimewarpOG from "./pages/TimewarpOG";
import Auth from "./pages/Auth";
import Database from "./pages/Database";
import AiCeo from "./pages/AiCeo";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfPurchase from "./pages/TermsOfPurchase";
import InviteAccept from "./pages/InviteAccept";
import PricingPage from "./pages/PricingPage";
import Support from "./pages/Support";

// Preload key images so they're cached before navigation
import authBg from "@/assets/auth-bg.png";
import startBusinessBg from "@/assets/start-business-bg.png";
import addBusinessBg from "@/assets/add-business-bg.png";

function usePreloadImages(srcs: string[]) {
  useEffect(() => {
    srcs.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);
}

const queryClient = new QueryClient();

const App = () => {
  usePreloadImages([authBg, startBusinessBg, addBusinessBg]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AiCeo />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/app" element={<Database />} />
              <Route path="/timewarp-og" element={<TimewarpOG />} />
              <Route path="/invite" element={<InviteAccept />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfPurchase />} />
              <Route path="/support" element={<Support />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
