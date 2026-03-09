import React, { useState } from 'react';
import { CloudRain, Sun, Cloud, AlertTriangle, CheckCircle, Save, Calendar, ThermometerSun, RefreshCw } from 'lucide-react';
import './index.css';

// Mock Data for Demo
const MOCK_CATEGORIES = ['おむすび', '弁当', 'サンドイッチ', 'パン', '冷し麺'];
const MOCK_DATA = [
  { id: 1, date: '2026/03/06', day: '金', weather: '晴れ', pop: 10, temp: 16, event: '', baseRec: 120, order: '', sales: '', isCompleted: false },
  { id: 2, date: '2026/03/07', day: '土', weather: '雨', pop: 80, temp: 14, event: '近隣行事', baseRec: 95, order: '', sales: '', isCompleted: false },
  { id: 3, date: '2026/03/08', day: '日', weather: '曇り', pop: 30, temp: 18, event: '', baseRec: 140, order: '135', sales: '', isCompleted: true },
];

// Web App API URL (デプロイ時に取得したもの)
const API_URL = 'https://script.google.com/macros/s/AKfycbz9C1TWfq25PEQUASXWfPPLUXuxryYqk3y3D2PLP0f0eDT-PIbsg56vS0v_vJWELByTZA/exec';

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('hattyu_api_key') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginInput, setLoginInput] = useState('');

  const [activeTab, setActiveTab] = useState(MOCK_CATEGORIES[0]);
  const [allData, setAllData] = useState({}); // カテゴリ名をキーにした全データ格納
  const [items, setItems] = useState([]);     // 現在表示中のデータ
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [hybridEvent, setHybridEvent] = useState({ auto: '', manual: '' });

  // 初期データ読み込み (ログイン後1回だけ)
  React.useEffect(() => {
    if (isLoggedIn && Object.keys(allData).length === 0) {
      fetchData();
    }
  }, [isLoggedIn]);

  // タブ切り替え時の処理（キャッシュから表示）
  React.useEffect(() => {
    if (allData[activeTab]) {
      setItems(allData[activeTab]);
    } else {
      setItems([]);
    }
  }, [activeTab, allData]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginInput.trim() === 'mbs2026') { // GAS側のAPI_KEYと一致させる
      localStorage.setItem('hattyu_api_key', loginInput.trim());
      setApiKey(loginInput.trim());
      setIsLoggedIn(true);
    } else {
      alert("パスワードが違います");
    }
  };

  // 既にローカルストレージにキーがあれば自動ログイン状態にする
  React.useEffect(() => {
    if (apiKey === 'mbs2026') {
      setIsLoggedIn(true);
    }
  }, [apiKey]);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      // doGetリクエスト (全カテゴリのデータを一度に取得)
      const res = await fetch(`${API_URL}?key=${apiKey}`);
      const data = await res.json();

      if (res.status === 401 || data.error === 'Unauthorized access') {
        setErrorMsg("認証エラー: パスワードが無効です。");
        setIsLoggedIn(false);
        localStorage.removeItem('hattyu_api_key');
        return;
      }

      if (data.status === 'success' && data.data) {
        setAllData(data.data);
        if (data.hybridEvent) {
          setHybridEvent(data.hybridEvent);
        } else {
          setHybridEvent({ auto: '', manual: '' });
        }
        const now = new Date();
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        setLastUpdated(`${now.getMonth() + 1}月${now.getDate()}日 (${days[now.getDay()]}) ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 更新`);
      } else {
        setErrorMsg("データの読み込みに失敗しました。");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = (id, field, value) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setItems(updatedItems);
    // 元の全データも更新
    setAllData({
      ...allData,
      [activeTab]: updatedItems
    });
  };

  const handleSave = async (id) => {
    const targetItem = items.find(i => i.id === id);
    if (!targetItem) return;

    // UI上では即座に完了状態にする（オプティミスティックUI）
    const optimisticallyUpdated = items.map(item =>
      item.id === id ? { ...item, isCompleted: true } : item
    );
    setItems(optimisticallyUpdated);
    setAllData({ ...allData, [activeTab]: optimisticallyUpdated });

    try {
      // doPostリクエスト
      await fetch(API_URL, {
        method: 'POST',
        // GASでPOSTを受け取るためのContent-Type
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          key: apiKey,
          category: activeTab,
          id: targetItem.id,
          order: targetItem.order,
          sales: targetItem.sales,
          weather: targetItem.weather,
          pop: targetItem.pop,
          temp: targetItem.temp
        })
      });
    } catch (error) {
      console.error(error);
      // エラー時はロールバック
      alert("保存に失敗しました。通信環境を確認してください。");
      const rolledBack = items.map(item =>
        item.id === id ? { ...item, isCompleted: false } : item
      );
      setItems(rolledBack);
      setAllData({ ...allData, [activeTab]: rolledBack });
    }
  };

  const uncompletedCount = items.filter(i => !i.isCompleted).length;

  if (!isLoggedIn) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--primary)', padding: '1rem' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Calendar size={48} color="var(--primary)" style={{ margin: '0 auto' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1rem', color: 'var(--text-main)' }}>発注予測サポート</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>店舗スタッフ用システム</p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>アクセスパスワード</label>
              <input
                type="password"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="パスワードを入力"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                autoFocus
              />
            </div>
            <button type="submit" className="action-btn">
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="header-title" style={{ margin: 0 }}>
          <Calendar size={24} />
          <span>発注予測サポート</span>
        </h1>
        <button
          onClick={fetchData}
          disabled={isLoading}
          style={{
            background: 'none', border: 'none', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: isLoading ? 0.5 : 1
          }}
        >
          <RefreshCw size={20} className={isLoading ? "spinning" : ""} />
          <span style={{ fontSize: '0.875rem' }}>更新</span>
        </button>
      </header>

      {/* Hybrid Event Banner */}
      {(hybridEvent.auto || hybridEvent.manual) && (
        <div style={{
          backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem', padding: '1rem',
          margin: '0 1rem 1rem 1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ color: '#b45309', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🚨 明日の特記事項・イベント情報
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            {hybridEvent.auto && (
              <div style={{ color: '#0369a1', backgroundColor: '#e0f2fe', padding: '0.5rem', borderRadius: '0.5rem' }}>
                {hybridEvent.auto}
              </div>
            )}
            {hybridEvent.manual && (
              <div style={{ color: '#15803d', backgroundColor: '#dcfce7', padding: '0.5rem', borderRadius: '0.5rem' }}>
                💡 手動メモ: {hybridEvent.manual}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Summary */}
      <div className="summary-card">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>本日の発注業務</h2>
          <p style={{ opacity: 0.9, marginTop: '0.25rem', fontSize: '0.875rem' }}>
            {lastUpdated || "データ取得中..."}
          </p>
        </div>
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">未完了タスク</span>
            <span className="stat-value" style={{ color: uncompletedCount > 0 ? '#fca5a5' : 'white' }}>
              {uncompletedCount}件
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">対象カテゴリ</span>
            <span className="stat-value">{activeTab}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-container">
        {MOCK_CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`tab-btn ${activeTab === cat ? 'active' : ''}`}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="list-container">
        {errorMsg && (
          <div style={{ color: 'var(--danger)', padding: '1rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>データを読み込み中...</p>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>本日の発注データはありません。</p>
          </div>
        ) : items.map(item => {
          return (
            <div key={item.id} className={`item-card ${!item.isCompleted ? 'uncompleted' : ''}`}>

              <div className="item-header">
                <div className="item-date">
                  {item.date} ({item.day})
                </div>
                {item.isCompleted ? (
                  <span className="item-badge" style={{ background: '#d1fae5', color: '#065f46', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> 発注済
                  </span>
                ) : (
                  <span className="item-badge alert" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={14} /> 未発注
                  </span>
                )}
              </div>

              <div className="item-weather">
                <div className="weather-info" style={{ flex: 1 }}>
                  {item.weather.includes('雨') ? <CloudRain size={16} color="#3b82f6" /> : item.weather.includes('晴') ? <Sun size={16} color="#f59e0b" /> : <Cloud size={16} />}
                  <input
                    type="text"
                    value={item.weather}
                    onChange={(e) => handleUpdateItem(item.id, 'weather', e.target.value)}
                    placeholder="天気"
                    style={{ border: 'none', background: 'transparent', width: '60px', color: 'inherit', outline: 'none', borderBottom: !item.weather ? '1px dashed var(--danger)' : 'none' }}
                  />
                </div>
                <div className="weather-info" style={{ flex: 1 }}>
                  降水:
                  <input
                    type="number"
                    value={item.pop}
                    onChange={(e) => handleUpdateItem(item.id, 'pop', e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '40px', color: 'inherit', outline: 'none' }}
                  />%
                </div>
                <div className="weather-info" style={{ flex: 1 }}>
                  <ThermometerSun size={16} color="#ef4444" />
                  <input
                    type="number"
                    value={item.temp === '--' ? '' : item.temp}
                    onChange={(e) => handleUpdateItem(item.id, 'temp', e.target.value)}
                    placeholder="気温"
                    style={{ border: 'none', background: 'transparent', width: '40px', color: 'inherit', outline: 'none', borderBottom: item.temp === '--' ? '1px dashed var(--danger)' : 'none' }}
                  />℃
                </div>
              </div>

              {item.event && (
                <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#b45309', background: '#fef3c7', padding: '0.5rem', borderRadius: '0.5rem' }}>
                  ★ 特記事項: {item.event} (発注数ブースト適用)
                </div>
              )}

              <div className="input-grid">
                <div className="input-group">
                  <span className="input-label" style={{ color: 'var(--primary)' }}>システム推奨</span>
                  <div className="num-input highlight" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.baseRec === 0 && !item.weather ? "手入力待ち" : item.baseRec}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: 1, minWidth: '140px' }}>
                  <span className="input-label" style={{ color: !item.isCompleted ? 'var(--danger)' : 'var(--text-muted)' }}>確定発注数</span>
                  <input
                    type="number"
                    className={`num-input ${!item.isCompleted && !item.order ? 'highlight' : ''}`}
                    style={{ borderColor: !item.isCompleted && !item.order ? 'var(--danger)' : '' }}
                    placeholder="確定数を入力"
                    value={item.order}
                    onChange={(e) => handleUpdateItem(item.id, 'order', e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ flex: 1, minWidth: '140px' }}>
                  <span className="input-label" style={{ color: '#166534' }}>📈 販売実績</span>
                  <input
                    type="number"
                    className="num-input"
                    style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
                    placeholder="実績を入力"
                    value={item.sales || ''}
                    onChange={(e) => handleUpdateItem(item.id, 'sales', e.target.value)}
                  />
                </div>
              </div>

              <button
                className={`action-btn ${item.isCompleted ? 'success' : ''}`}
                onClick={() => handleSave(item.id)}
                disabled={!item.order}
                style={{ opacity: !item.order ? 0.5 : 1 }}
              >
                {item.isCompleted ? <><CheckCircle size={20} /> 保存完了</> : <><Save size={20} /> この数量で発注確定する</>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  );
}

export default App;
