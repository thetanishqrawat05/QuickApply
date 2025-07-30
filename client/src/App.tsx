import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";

const LandingPage = lazy(() => import("@/pages/landing"));
const AutoApply = lazy(() => import("@/pages/auto-apply"));
const SecureLoginDemo = lazy(() => import("@/pages/secure-login-demo"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/apply">
        <ProtectedRoute>
          <AutoApply />
        </ProtectedRoute>
      </Route>
      <Route path="/secure-login-demo" component={SecureLoginDemo} />
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
