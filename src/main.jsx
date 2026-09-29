import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "./styles/global.css"; // 🌟 引入您的專屬棒球樣式

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
