import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Check and apply dark mode on strict boot
try {
  const isDark = JSON.parse(localStorage.getItem('vigilo_dark_mode'));
  if (isDark) document.documentElement.classList.add("dark");
} catch (e) {}

createRoot(document.getElementById("root")).render(<App />);
