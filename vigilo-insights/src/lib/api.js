const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Central fetch wrapper that:
 * - Prepends API_URL to all paths
 * - Adds Authorization header if token exists in localStorage
 * - Handles 401 by clearing token and redirecting to /login
 * - Parses JSON responses automatically
 * - Throws structured errors for UI consumption
 */
async function request(path, options = {}) {
  const token = localStorage.getItem("vigilo_token");

  const headers = { ...options.headers };

  // Only set Content-Type to JSON if body is not FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    throw {
      status: 0,
      message: "Cannot connect to server. Is the backend running?",
      detail: err.message,
    };
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  // Handle blob responses (PDF download etc.)
  if (options.responseType === "blob") {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { status: response.status, message: errorData.detail || response.statusText, detail: errorData };
    }
    return response.blob();
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    // 401 — token expired or invalid
    if (response.status === 401) {
      localStorage.removeItem("vigilo_token");
      localStorage.removeItem("vigilo_user");
      // Only redirect if we're not already on login/register/landing
      const currentPath = window.location.pathname;
      if (!["/", "/login", "/register"].includes(currentPath)) {
        window.location.href = "/login";
      }
    }

    // Build a user-friendly error message
    let message = "An error occurred";
    if (data?.detail) {
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        // 422 validation errors
        message = data.detail.map((e) => e.msg || e.message || JSON.stringify(e)).join(", ");
      } else {
        message = JSON.stringify(data.detail);
      }
    } else if (response.status === 403) {
      message = "Access denied";
    } else if (response.status === 404) {
      message = "Resource not found";
    }

    throw { status: response.status, message, detail: data };
  }

  return data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const authAPI = {
  login: (email, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request("/api/auth/me"),

  updateProfile: (data) =>
    request("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  changePassword: (data) =>
    request("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resetPassword: (data) =>
    request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  uploadImage: (formData) =>
    request("/api/auth/profile/upload", {
      method: "POST",
      body: formData,
    }),

  exportData: async () => {
    const blob = await request("/api/auth/export", { responseType: "blob" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "vigilo_data_export.json";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  deleteAccount: (data) =>
    request("/api/auth/account", {
      method: "DELETE",
      body: JSON.stringify(data),
    }),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRIMES / MAP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const crimesAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "" && val !== "all") {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    return request(`/api/crimes${qs ? `?${qs}` : ""}`);
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFETY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const safetyAPI = {
  score: (lat, lng, radius = 1000, hour = undefined) => {
    const params = new URLSearchParams({ lat, lng, radius });
    if (hour !== undefined) params.append("hour", hour);
    return request(`/api/safety/score?${params}`);
  },

  hourlyRisk: () => request("/api/safety/hourly-risk"),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const reportsAPI = {
  create: (formData) =>
    request("/api/reports/", {
      method: "POST",
      body: formData, // FormData — no Content-Type header (browser sets it with boundary)
    }),

  myReports: () => request("/api/reports/my"),
  recentSavedLocations: () => request("/api/reports/recent-saved-location-alerts"),
  get: (id) => request(`/api/reports/${id}`),
  update: (id, data) =>
    request(`/api/reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  confirm: (id) =>
    request(`/api/reports/${id}/confirm`, {
      method: "POST",
    }),
  unconfirm: (id) =>
    request(`/api/reports/${id}/confirm`, {
      method: "DELETE",
    }),

  downloadPdf: async (id) => {
    try {
      const blob = await request(`/api/reports/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `Vigilo_Report_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download PDF. Please try again.");
    }
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NAVIGATION / ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const navigationAPI = {
  getRoute: (start_lat, start_lng, end_lat, end_lng, time_of_day = undefined) => {
    const params = new URLSearchParams({ start_lat, start_lng, end_lat, end_lng });
    if (time_of_day) params.append("time_of_day", time_of_day);
    return request(`/api/navigation/route?${params}`);
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const sosAPI = {
  trigger: (latitude = null, longitude = null) =>
    request("/api/sos/trigger", {
      method: "POST",
      body: JSON.stringify({ latitude, longitude }),
    }),

  resolve: (alert_id) =>
    request("/api/sos/resolve", {
      method: "POST",
      body: JSON.stringify({ alert_id }),
    }),

  history: () => request("/api/sos/history"),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMERGENCY CONTACTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const contactsAPI = {
  list: () => request("/api/profile/emergency-contacts"),

  create: (data) =>
    request("/api/profile/emergency-contacts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  remove: (id) =>
    request(`/api/profile/emergency-contacts/${id}`, {
      method: "DELETE",
    }),
};

export const savedLocationsAPI = {
  list: () => request("/api/profile/saved-locations"),

  upsert: (data) =>
    request("/api/profile/saved-locations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  remove: (id) =>
    request(`/api/profile/saved-locations/${id}`, {
      method: "DELETE",
    }),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const adminAPI = {
  analytics: () => request("/api/admin/analytics"),

  pendingReports: () => request("/api/admin/reports/pending"),

  allReports: () => request("/api/admin/reports/all"),

  verifyReport: (id, data) =>
    request(`/api/admin/reports/${id}/verify`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resolveReport: (id) =>
    request(`/api/admin/reports/${id}/resolve`, {
      method: "POST",
    }),

  downloadPdf: async (id) => {
    try {
      const blob = await request(`/api/admin/reports/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `Vigilo_Report_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download PDF. Please try again.");
    }
  },

  deleteReport: (id) =>
    request(`/api/admin/reports/${id}`, {
      method: "DELETE",
    }),

  escalateReport: (id) =>
    request(`/api/admin/reports/${id}/escalate`, {
      method: "POST",
    }),

  users: () => request("/api/admin/users"),

  deleteUser: (id) =>
    request(`/api/admin/users/${id}`, {
      method: "DELETE",
    }),

  updateUser: (id, data) =>
    request(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC (no auth required)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const publicAPI = {
  stats: () => request("/api/public/stats"),
  userProfile: (id) => request(`/api/users/public/${id}`),
};
