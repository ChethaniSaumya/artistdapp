import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "./pages/Home";
// RainbowKit and Wagmi imports
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { config } from './wagmi.config';
import '@rainbow-me/rainbowkit/styles.css';
import ProjectsApp from "./components/projects/ProjectsApp";
import { BrowserRouter, Routes, Route } from "react-router-dom";


const queryClient = new QueryClient();

const App = () => {
  // Don't render React Router for API routes - let Vite handle them
  if (window.location.pathname.startsWith('/api/')) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="min-h-screen flex flex-col">
                <main className="flex-1">
                  <Routes>
                    <Route path='/' element={<Home />} />
                    <Route path="/projects" element={<ProjectsApp />} />
                    <Route path="/projects/:artistName/:projectName" element={<ProjectsApp />} />
                  </Routes>
                </main>
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;