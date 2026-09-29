// 檔案路徑: src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import Select from "react-select";
import HistoryPage from "./pages/HistoryPage";
import BuilderPage from "./pages/BuilderPage";

// 自動判斷目前是「本地開發」還是「正式上線」
export const API_BASE_URL =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:5000"
    : "https://baseball-web-game.onrender.com";

export const selectStyles = {
  menu: (provided) => ({ ...provided, zIndex: 9999 }),
  control: (provided) => ({ ...provided, borderRadius: "6px" }),
};

function App() {
  const [pitchers, setPitchers] = useState({});
  const [selectedPitcherId, setSelectedPitcherId] = useState("808967"); // 預設山本由伸
  const [isLoading, setIsLoading] = useState(true);

  // 網頁初次載入時，去後端拿全聯盟投手名單
  useEffect(() => {
    async function fetchPitchers() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/pitchers`);
        const data = await response.json();
        setPitchers(data);
        setIsLoading(false);
      } catch (error) {
        console.error("無法載入投手清單", error);
        setIsLoading(false);
      }
    }
    fetchPitchers();
  }, []);

  // 🌟 2. 將投手資料轉換成 react-select 吃得懂的 { value, label } 陣列格式
  const pitcherOptions = Object.keys(pitchers)
    .sort((a, b) => (a === "808967" ? -1 : 1))
    .map((pId) => ({ value: pId, label: pitchers[pId].name }));

  return (
    <Router>
      <div className="container">
        <div className="controls">
          <strong style={{ fontSize: "18px" }}>對戰組合：</strong>

          {/* 🌟 3. 換成強大的 React Select */}
          <div style={{ flex: 1, minWidth: "250px" }}>
            <Select
              value={
                pitcherOptions.find((opt) => opt.value === selectedPitcherId) ||
                null
              }
              onChange={(selectedOption) =>
                setSelectedPitcherId(selectedOption.value)
              }
              options={pitcherOptions}
              isLoading={isLoading}
              isSearchable={true}
              placeholder="請輸入英文搜尋投手..."
              styles={selectStyles}
            />
          </div>
        </div>

        <div className="tab-navigation">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "tab-btn active" : "tab-btn"
            }
          >
            📊 實戰打席分析
          </NavLink>
          <NavLink
            to="/builder"
            className={({ isActive }) =>
              isActive ? "tab-btn active" : "tab-btn"
            }
          >
            🎯 自由配球實驗室
          </NavLink>
        </div>

        <div className="dashboard">
          <Routes>
            <Route
              path="/"
              element={
                <HistoryPage
                  pitcherId={selectedPitcherId}
                  pitcherData={pitchers[selectedPitcherId]}
                />
              }
            />
            <Route
              path="/builder"
              element={
                <BuilderPage
                  pitcherId={selectedPitcherId}
                  pitcherData={pitchers[selectedPitcherId]}
                />
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
