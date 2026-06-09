import React from "react";
import Login from "./pages/login";
import Rapports from "./pages/Rapports";
import Detail from "./pages/Detail";
import Historique from "./pages/Historique";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./Components/nav";
// import Chatbot from "./pages/chatbot";

function Priv({ c }) { const { user } = useAuth(); return user ? c : <Navigate to="/login" replace />; }
function Pub({ c }) { const { user } = useAuth(); return user ? <Navigate to="/" replace /> : c; }

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center"
          toastOptions={{ style: { fontFamily: "'Tajawal',sans-serif", direction: "rtl", fontSize: 13 } }} />
        <Routes>
          <Route path="/login" element={<Pub c={<Login />} />} />
          <Route path="/" element={<Priv c={<Layout />} />}>
            <Route index element={<Dashboard />} />
            <Route path="rapports" element={<Rapports />} />
            <Route path="rapports/:id" element={<Detail />} />
            <Route path="historique" element={<Historique />} />
            {/* <Route path="chatbot"     element={<Chatbot/>}/> */}

          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
