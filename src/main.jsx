import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
// import from tanstack query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// create client that manage caching and request
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, //refresh cache 5min
      retry: 1,         //one retry on failure
    },
  },
}
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* provide full app */}
 <QueryClientProvider client={queryClient}>
  <App />
 </QueryClientProvider>
  </StrictMode>
);