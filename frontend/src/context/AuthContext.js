import { createContext, useContext, useState, useEffect } from "react";
import { apiCall } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restaurer la session au chargement
    const savedUser = localStorage.getItem("cspj_user");
    const savedToken = localStorage.getItem("cspj_token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const data = await apiCall("/login", "POST", { username, password });

    const userData = {
      username: data.username,
      role: data.role,
      nom: data.nom,
      token: data.token
    };

    localStorage.setItem("cspj_token", data.token);
    localStorage.setItem("cspj_user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("cspj_token");
    localStorage.removeItem("cspj_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
