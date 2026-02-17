import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Home from "./pages/Home";
import PodcastCreator from "./pages/PodcastCreator";
import AdGenerator from "./pages/AdGenerator";
import TavusAdGenerator from "./pages/TavusAdGenerator";
import Studio from "./pages/Studio";
import VideoPodcast from "./pages/VideoPodcast";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Get basename for GitHub Pages deployment
const basename = import.meta.env.BASE_URL;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={basename}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/podcast" element={<PodcastCreator />} />
            <Route path="/video-podcast" element={<VideoPodcast />} />
            <Route path="/ads" element={<AdGenerator />} />
            <Route path="/tavus-ads" element={<TavusAdGenerator />} />
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
