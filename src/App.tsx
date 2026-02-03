import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Agents from "./pages/Agents";
import AgentHistory from "./pages/AgentHistory";
import AgentGraph from "./pages/AgentGraph";
import TaskNavigation from "./pages/TaskNavigation";
import WidgetDocs from "./pages/WidgetDocs";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import Demo from "./pages/Demo";
import AdminPanel from "./pages/AdminPanel";
import Spec from "./pages/Spec";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider delayDuration={0}>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/graph" element={<AgentGraph />} />
            <Route path="/agents/:id/history" element={<AgentHistory />} />
            <Route path="/tasks" element={<TaskNavigation />} />
            <Route path="/widget-docs" element={<WidgetDocs />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/spec" element={<Spec />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
