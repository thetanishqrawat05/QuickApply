import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy } from "react";
import Home from "@/pages/home";
import EnhancedApply from "@/pages/enhanced-apply";
import AutoApply from "@/pages/auto-apply";
import NotFound from "@/pages/not-found";

const EnhancedAutoApply = lazy(() => import("@/pages/enhanced-auto-apply"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={EnhancedAutoApply} />
      <Route path="/basic-apply" component={Home} />
      <Route path="/enhanced-apply" component={EnhancedApply} />
      <Route path="/auto-apply" component={AutoApply} />
      <Route path="/enhanced-auto-apply" component={EnhancedAutoApply} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
