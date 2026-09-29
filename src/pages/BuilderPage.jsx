import React, { useState, useEffect } from "react";
import Select from "react-select"; // 🌟 1. 匯入
import { API_BASE_URL, selectStyles } from "../App";
import StrikeZone, {
  ZONE_COORDINATES,
  ZONE_EN,
} from "../components/StrikeZone";

export default function BuilderPage({ pitcherId, pitcherData }) {
  const [batters, setBatters] = useState([]);
  const [selectedBatterId, setSelectedBatterId] = useState("");
  const [selectedStand, setSelectedStand] = useState("R"); // 🌟 新增：目前打擊區站位
  const [isLoading, setIsLoading] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // 配球序列狀態
  const [seqLength, setSeqLength] = useState(5);
  const [pitches, setPitches] = useState([]); // 儲存 [{ type, zone }] 的陣列

  // 運算結果狀態
  const [simResults, setSimResults] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // 1. 組件掛載時：抓取全聯盟打者 (去呼叫我們剛才在 app.py 加的新 API)
  useEffect(() => {
    async function fetchBatters() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/batters`);
        const data = await res.json();
        setBatters(data);
        if (data.length > 0) {
          setSelectedBatterId(data[0].batter_id.toString());
          setSelectedStand(data[0].stand); // 🌟 連動設定第一位打者的站位
        }
      } catch (e) {
        console.error("無法載入打者清單", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBatters();
  }, []);

  // 2. 當「球數長度」或「更換投手」時：重新初始化預設的配球陣列
  useEffect(() => {
    const defaultType = pitcherData?.arsenal?.[0]?.value || "FF";
    setPitches(
      Array.from({ length: seqLength }).map(() => ({
        type: defaultType,
        zone: "正中",
      }))
    );
    setSimResults([]); // 清空先前的運算結果
  }, [seqLength, pitcherData]);

  // 更新序列中某一球的設定 (球種或進壘點)
  const updatePitch = (index, field, value) => {
    const newPitches = [...pitches];
    newPitches[index][field] = value;
    setPitches(newPitches);
    setIsModified(true); // 🌟 標記設定已經被更動
    // setSimResults([]);
  };

  // 3. 點擊執行：將整組配球傳送給後端神經網路
  const runSequence = async () => {
    setIsSimulating(true);
    setIsModified(false); // 🌟 開始運算，解除半透明狀態
    const batter = batters.find(
      (b) => b.batter_id.toString() === selectedBatterId
    );
    // const batterOptions = batters.map((b) => ({
    //   value: b.batter_id.toString(),
    //   label: b.label,
    // }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/simulate_sequence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitcher_id: pitcherId,
          stand: selectedStand,
          adv_stats: batter?.adv_stats || {}, // 帶入這名真實打者的 20 維特徵
          pitches: pitches,
        }),
      });
      if (!res.ok) throw new Error("API 運算錯誤");
      const data = await res.json();
      setSimResults(data.results);
    } catch (e) {
      console.error(e);
      alert("序列運算發生錯誤！");
    } finally {
      setIsSimulating(false);
    }
  };

  // 將運算結果打包成 <StrikeZone /> 吃得懂的格式來畫圖
  const renderPitches =
    simResults.length > 0
      ? simResults.map((r, idx) => {
          const coords = ZONE_COORDINATES[r.zone] || { x: 50, y: 50 };
          const isLast = idx === simResults.length - 1;
          return {
            x: coords.x,
            y: coords.y,
            num: r.pitch_num,
            isStrike: true,
            isModified: isLast, // 讓最後一顆球亮起橘色
            opacity: isLast ? 1 : 0.5, // 歷史軌跡半透明
          };
        })
      : [];
  const batterOptions = batters.map((b) => ({
    value: b.batter_id.toString(),
    label: b.label,
  }));
  return (
    <>
      {/* 🌟 3. 升級自由選擇打者與站位列 */}
      <div
        className="controls"
        style={{ marginBottom: "20px", display: "flex", gap: "15px" }}
      >
        <div
          style={{
            flex: 2,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <strong
            style={{ fontSize: "16px", color: "#555", whiteSpace: "nowrap" }}
          >
            對戰打者 (Batter)：
          </strong>
          <div style={{ flex: 1 }}>
            <Select
              value={
                batterOptions.find((opt) => opt.value === selectedBatterId) ||
                null
              }
              onChange={(selectedOption) => {
                const bId = selectedOption.value;
                setSelectedBatterId(bId);
                const batter = batters.find(
                  (b) => b.batter_id.toString() === bId
                );
                if (batter) setSelectedStand(batter.stand);
                setSimResults([]);
              }}
              options={batterOptions}
              isLoading={isLoading}
              isSearchable={true}
              placeholder="搜尋打者 (Search Batter)..."
              styles={selectStyles}
            />
          </div>
        </div>

        {/* 站位選擇保持原樣就好，因為只有 R 和 L 兩個選項，不需要搜尋 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <strong
            style={{ fontSize: "16px", color: "#555", whiteSpace: "nowrap" }}
          >
            站位 (Stand)：
          </strong>
          <select
            value={selectedStand}
            onChange={(e) => {
              setSelectedStand(e.target.value);
              setSimResults([]);
            }}
            style={{ width: "100%", padding: "9px", borderRadius: "6px" }}
          >
            <option value="R">右打 (R)</option>
            <option value="L">左打 (L)</option>
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header" style={{ color: "#e67e22" }}>
          連續配球腳本 (Sequence Builder) - 動態多球對決
        </div>

        <div className="at-bat-view">
          {/* 共用的九宮格元件 */}
          <StrikeZone pitches={renderPitches} />

          <div style={{ flex: 1 }}>
            {/* 配球長度與執行按鈕 */}
            <div className="lab-controls" style={{ marginBottom: "10px" }}>
              <div className="control-group">
                <label style={{ color: "#e67e22", fontWeight: "bold" }}>
                  配球數 (Pitches)
                </label>
                <input
                  type="number"
                  value={seqLength}
                  onChange={(e) =>
                    setSeqLength(
                      Math.max(1, Math.min(7, parseInt(e.target.value) || 1))
                    )
                  }
                  min="1"
                  max="7"
                  style={{
                    width: "60px",
                    padding: "5px",
                    textAlign: "center",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
              <button
                className="btn-simulate"
                onClick={runSequence}
                disabled={isSimulating}
                style={{ backgroundColor: "#e67e22" }}
              >
                {isSimulating
                  ? "運算中 (Simulating)..."
                  : "執行序列 (Run Sequence)"}
              </button>
            </div>

            {/* 動態渲染 N 顆球的下拉選單 (利用 React 的 Map) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {pitches.map((p, idx) => (
                <div
                  key={idx}
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <div
                    style={{
                      width: "25px",
                      height: "25px",
                      background: "#e67e22",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "12px",
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* 球種選擇 */}
                  <select
                    style={{ flex: 1 }}
                    value={p.type}
                    onChange={(e) => updatePitch(idx, "type", e.target.value)}
                  >
                    {pitcherData?.arsenal?.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {pt.label}
                      </option>
                    ))}
                  </select>

                  {/* 座標選擇 */}
                  <select
                    style={{ flex: 1 }}
                    value={p.zone}
                    onChange={(e) => updatePitch(idx, "zone", e.target.value)}
                  >
                    {Object.keys(ZONE_COORDINATES).map((zone) => (
                      <option key={zone} value={zone}>
                        {zone.replace("壞_", "壞_ ")} ({ZONE_EN[zone]})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* 逐球顯示 5 類別期望值結果 */}
            <div
              className="pitch-list"
              style={{
                opacity: isModified ? 0.5 : 1,
                transition: "opacity 0.3s",
              }}
            >
              {simResults.length === 0 ? (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    paddingLeft: "10px",
                  }}
                >
                  ℹ️ 請設定球數並選擇球種。系統將計算每顆球在「歷史殘影
                  Delta」影響下的逐球期望值。
                  <br />
                  (Set pitch types and locations. The model calculates expected
                  outcomes influenced by the historical sequence delta.)
                </div>
              ) : (
                simResults.map((r, idx) => (
                  <div
                    key={idx}
                    className="pitch-item modified"
                    style={{ borderColor: "#e67e22" }}
                  >
                    <div
                      className="pitch-number"
                      style={{ background: "#e67e22" }}
                    >
                      {r.pitch_num}
                    </div>
                    <div className="pitch-info" style={{ flex: 1 }}>
                      <div
                        className="pitch-result"
                        style={{ color: "#e67e22", marginBottom: "8px" }}
                      >
                        <strong>{r.type}</strong> ({r.zone})
                      </div>
                      <div className="badge-container">
                        <span className="badge badge-take">
                          👀 不揮棒 (Take) {r.probs.take}%
                        </span>
                        <span className="badge badge-whiff">
                          💨 揮空 (Whiff) {r.probs.whiff}%
                        </span>
                        <span className="badge badge-foul">
                          🛑 界外 (Foul) {r.probs.foul}%
                        </span>
                        <span className="badge badge-weak">
                          🏏 弱擊 (Weak) {r.probs.weak_contact}%
                        </span>
                        <span className="badge badge-hard">
                          🚀 強擊 (Hard Hit) {r.probs.hard_contact}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
