import axios from "axios";

axios.interceptors.response.use(r => r, e => {
    if (e.response?.status === 401) { localStorage.clear(); window.location.href = "/login"; }
    return Promise.reject(e);
});
export const api = {
    login: (u, p) => axios.post("/api/login", { username: u, password: p }),

    rapports: (a = 2024) => axios.get(`/api/rapports?annee=${a}`),
    rapport: (id) => axios.get(`/api/rapports/${id}`),

    stats: (a = 2024) => axios.get(`/api/stats?annee=${a}`),

    analyser: (body) => axios.post("/api/analyser", body),

    historique: () => axios.get("/api/historique"),
    juges: () => axios.get("/api/juges"),

    feedback: (id, v) => axios.post(`/api/rapports/${id}/feedback`, { verdict: v }),

    train: () => axios.post("/api/train"),
};