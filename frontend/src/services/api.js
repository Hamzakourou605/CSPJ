import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:5000",
});

API.interceptors.request.use(config => {
    const token = localStorage.getItem("cspj_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

API.interceptors.response.use(
    r => r,
    e => {
        if (e.response?.status === 401 || e.response?.status === 422) {
            localStorage.clear();
            window.location.href = "/login";
        }
        return Promise.reject(e);
    }
);

export const api = {
    login: (u, p) => API.post("/api/login", { username: u, password: p }),
    rapports: (a = 2024) => API.get(`/api/rapports?annee=${a}`),
    rapport: (id) => API.get(`/api/rapports/${id}`),
    stats: (a = 2024) => API.get(`/api/stats?annee=${a}`),
    analyser: (body) => API.post("/api/analyser", body),
    historique: () => API.get("/api/historique"),
    juges: () => API.get("/api/juges"),
    feedback: (id, v) => API.post(`/api/rapports/${id}/feedback`, { verdict: v }),
    train: () => API.post("/api/train"),
};

export const apiCall = async (endpoint, method = "GET", body = null) => {
    const res = await API({
        url: `/api${endpoint}`,
        method,
        data: body
    });
    return res.data;
};
