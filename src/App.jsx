import React, { useState, useRef, useEffect } from 'react';
import './App.css'; // We will replace this

// --- Configuration ---
const DIVERSE_SENTENCES = [
  "My zealous puppy quickly vexed the judge", "How jumping frogs can level six piqued gymnasts",
  "A wizard's job is to vex chumps quickly in fog", "Pack my box with five dozen liquor jugs",
  "The five boxing wizards jump quickly"
];
const DIVERSE_SAMPLES_REQUIRED = DIVERSE_SENTENCES.length;
const FREE_SAMPLES_REQUIRED = 5;
const API_BASE_URL = "https://typeai.onrender.com";

// --- Helper Functions (normalize, getAccuracy, useKeystrokeCapture) (Unchanged) ---
const normalize = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, "").replace(/\s+/g, ' ').trim();
};
const getAccuracy = (s1, s2) => {
  const normS1 = normalize(s1); const normS2 = normalize(s2);
  const len1 = normS1.length; const len2 = normS2.length;
  if (len1 === 0) return len2 === 0 ? 1 : 0; if (len2 === 0) return 0;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = normS1[i - 1] === normS2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  const distance = matrix[len1][len2];
  return Math.max(0, (len2 - distance) / len2);
};
const useKeystrokeCapture = () => {
  const sessionEvents = useRef([]); const keyPressTimes = useRef(new Map());
  const startTime = useRef(null);
  const startCapture = () => {
    sessionEvents.current = []; keyPressTimes.current.clear(); startTime.current = null;
  };
  const handleKeyDown = (e) => {
    if (startTime.current === null) startTime.current = performance.now();
    const current_time = performance.now();
    const relative_time_ms = current_time - startTime.current;
    const key_char = e.key;
    sessionEvents.current.push({ event: "press", key: key_char, time_ms: relative_time_ms });
    if (!keyPressTimes.current.has(key_char)) keyPressTimes.current.set(key_char, current_time);
  };
  const handleKeyUp = (e) => {
    if (startTime.current === null) return null;
    const current_time = performance.now();
    const relative_time_ms = current_time - startTime.current;
    const key_char = e.key;
    let hold_time_ms = null;
    if (keyPressTimes.current.has(key_char)) {
      hold_time_ms = current_time - keyPressTimes.current.get(key_char);
      keyPressTimes.current.delete(key_char);
    }
    sessionEvents.current.push({ event: "release", key: key_char, time_ms: relative_time_ms, hold_time_ms: hold_time_ms });
    if (key_char === 'Enter') return sessionEvents.current;
    return null;
  };
  return { startCapture, handleKeyDown, handleKeyUp, getEvents: () => sessionEvents.current };
};

// --- NEW: Header Component with Dropdown ---
const Header = ({ loggedInUser, onShowUserList, onShowLeaderboard, onShowMyProfile }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="Header-nav">
      <div className="Header-logo">
        TypeAI
      </div>
      <div className="Header-right">
        {loggedInUser && (
          <div className="dropdown" onMouseLeave={() => setDropdownOpen(false)}>
            <button 
              className="dropdown-toggle" 
              onMouseEnter={() => setDropdownOpen(true)}
            >
              Menu
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <a href="#" className="dropdown-item" onClick={onShowMyProfile}>My Profile & Stats</a>
                <a href="#" className="dropdown-item" onClick={onShowUserList}>All User Stats</a>
                <a href="#" className="dropdown-item" onClick={onShowLeaderboard}>Accuracy Leaderboard</a>
              </div>
            )}
          </div>
        )}
        {!loggedInUser && (
          <div className="dropdown" onMouseLeave={() => setDropdownOpen(false)}>
            <button 
              className="dropdown-toggle" 
              onMouseEnter={() => setDropdownOpen(true)}
            >
              Stats
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <a href="#" className="dropdown-item" onClick={onShowUserList}>All User Stats</a>
                <a href="#" className="dropdown-item" onClick={onShowLeaderboard}>Accuracy Leaderboard</a>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

// --- Footer Component (Unchanged) ---
const Footer = () => (
  <footer className="Footer-bar">
    <p>&copy; 2025 K.Lentas.</p>
  </footer>
);

// --- NEW: Explanation Component ---
const Explanation = () => (
  <div className="explanation-box">
    <h3>How does this work?</h3>
    <p>
      This application identifies users based on their unique **keystroke dynamics**—the rhythm and manner in which you type.
      It doesn't care *what* you type, but *how* you type it.
    </p>
    <p>
      When you train a profile, the server measures 6 key biometrics (like your average key-hold time, the time *between* your key presses, your typing speed, and your accuracy).
      It then trains a **Random Forest AI model** to recognize this unique 6-number "fingerprint."
      When you type in the prediction box, it calculates the same fingerprint and asks the AI to find the closest match in its database.
    </p>
  </div>
);


// --- Main App Component ---
function App() {
  const [appState, setAppState] = useState('AUTH');
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loggedInUser, setLoggedInUser] = useState(localStorage.getItem('user') || null);
  const [diverseSampleCount, setDiverseSampleCount] = useState(0);
  const [freeSampleCount, setFreeSampleCount] = useState(0);
  const [message, setMessage] = useState('Please log in or sign up.');
  const [prediction, setPrediction] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [typedText, setTypedText] = useState('');
  const [freeText, setFreeText] = useState('');
  const isSubmitting = useRef(false);
  const { startCapture, handleKeyDown, handleKeyUp, getEvents } = useKeystrokeCapture();

  const [showModal, setShowModal] = useState(false);
  const [modalView, setModalView] = useState('list');
  const [modalData, setModalData] = useState([]);
  const [modalDetail, setModalDetail] = useState(null);

  // --- All functions (useEffect, handleAuthSubmit, handleLogout, etc.) are UNCHANGED ---
  
  useEffect(() => {
    const checkServerStatus = async () => {
      if (token) {
        try {
          const statsRes = await fetch(`${API_BASE_URL}/users`);
          const stats = await statsRes.json();
          const userStats = stats.find(u => u.username === loggedInUser);
          if (userStats && userStats.samples >= (DIVERSE_SAMPLES_REQUIRED + FREE_SAMPLES_REQUIRED)) {
            setAppState('PREDICTING');
            setMessage(`Welcome back, ${loggedInUser}! Model is ready.`);
          } else {
            setAppState('TRAIN_DIVERSE');
            setMessage(`Welcome back, ${loggedInUser}! Let's finish training your profile.`);
            const userSampleCount = userStats ? userStats.samples : 0;
            if (userSampleCount < DIVERSE_SAMPLES_REQUIRED) {
              setDiverseSampleCount(userSampleCount); setFreeSampleCount(0);
            } else {
              setDiverseSampleCount(DIVERSE_SAMPLES_REQUIRED);
              setFreeSampleCount(userSampleCount - DIVERSE_SAMPLES_REQUIRED);
            }
          }
          startCapture();
        } catch (e) { setMessage("Server error. Logging out."); handleLogout(); }
      } else { setAppState('AUTH'); setMessage('Please log in or sign up.'); }
    };
    checkServerStatus();
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setMessage("Username and password are required."); return; }
    const endpoint = authMode === 'login' ? '/login' : '/signup';
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');
      if (authMode === 'signup') {
        setMessage('Sign up successful! Please log in.'); setAuthMode('login'); setPassword('');
      } else {
        setToken(data.access_token); setLoggedInUser(username);
        localStorage.setItem('token', data.access_token); localStorage.setItem('user', username);
        const statsRes = await fetch(`${API_BASE_URL}/users`);
        const stats = await statsRes.json();
        const userStats = stats.find(u => u.username === username);
        const userSampleCount = userStats ? userStats.samples : 0;
        setDiverseSampleCount(0); setFreeSampleCount(0);
        if (userStats && userSampleCount >= (DIVERSE_SAMPLES_REQUIRED + FREE_SAMPLES_REQUIRED)) {
          setAppState('PREDICTING'); setMessage(`Welcome back, ${username}! Model is ready.`);
        } else {
          if (userSampleCount < DIVERSE_SAMPLES_REQUIRED) {
            setAppState('TRAIN_DIVERSE'); setDiverseSampleCount(userSampleCount);
            setMessage(`Welcome, ${username}! Let's continue your diverse sentence training.`);
          } else {
            setAppState('TRAIN_FREE'); setDiverseSampleCount(DIVERSE_SAMPLES_REQUIRED);
            setFreeSampleCount(userSampleCount - DIVERSE_SAMPLES_REQUIRED);
            setMessage(`Welcome, ${username}! Let's continue your free-text training.`);
          }
        }
        startCapture();
      }
    } catch (error) { setMessage(error.message); }
  };

  const handleLogout = () => {
    setToken(null); setLoggedInUser(null);
    localStorage.removeItem('token'); localStorage.removeItem('user');
    setAppState('AUTH'); setMessage('You have been logged out.');
    setPrediction(''); setConfidence(null);
  };

  const submitTrainingSample = async (targetText, isFreeText = false) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    const events = getEvents();
    if (events.length < 10) { isSubmitting.current = false; return; }
    const sample_type = isFreeText ? 'free' : 'diverse';
    const accuracy = isFreeText ? null : getAccuracy(typedText, targetText);
    setMessage('Saving sample...');
    try {
      const response = await fetch(`${API_BASE_URL}/add_sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ events, accuracy, sample_type }),
      });
      if (!response.ok) throw new Error('Failed to save sample');
      if (isFreeText) {
        const newCount = freeSampleCount + 1; setFreeSampleCount(newCount);
        if (newCount >= FREE_SAMPLES_REQUIRED) setMessage('All 5 free samples collected! Click "Train Model".');
        else setMessage(`Free sample ${newCount}/${FREE_SAMPLES_REQUIRED} saved.`);
      } else {
        const newCount = diverseSampleCount + 1; setDiverseSampleCount(newCount);
        if (newCount >= DIVERSE_SAMPLES_REQUIRED) {
          setAppState('TRAIN_FREE'); setMessage(`Great! Now type ${FREE_SAMPLES_REQUIRED} free-text sentences.`); setFreeSampleCount(0);
        } else setMessage(`Sample ${newCount}/${DIVERSE_SAMPLES_REQUIRED} saved. Next sentence!`);
      }
      setTypedText(''); startCapture();
    } catch (error) { setMessage(`Error: ${error.message}. Is the server running?`); }
    isSubmitting.current = false;
  };

  const currentTarget = DIVERSE_SENTENCES[diverseSampleCount];
  const handleDiverseChange = (e) => {
    const newText = e.target.value; setTypedText(newText);
    if (normalize(newText) === normalize(currentTarget)) submitTrainingSample(currentTarget, false);
  };
  const handleDiverseKeyUp = (e) => {
    handleKeyUp(e); if (e.key === 'Enter') submitTrainingSample(currentTarget, false);
  };
  const handleFreeTrainingKeyUp = (e) => {
    handleKeyUp(e); if (e.key === 'Enter') submitTrainingSample(null, true);
  };

  const handleTrainModel = async () => {
    setMessage('Training model... This may take a moment.');
    try {
      const response = await fetch(`${API_BASE_URL}/train`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setAppState('PREDICTING'); setMessage(`Model trained! Now, type anything to predict.`); startCapture();
      } else setMessage(`Training failed: ${data.error}`);
    } catch (error) { setMessage('Server error. Is the Python server running?'); }
  };

  const handlePredictionKeyDown = (e) => {
    if (getEvents().length === 0) startCapture(); handleKeyDown(e);
  };
  const handlePredictionKeyUp = (e) => {
    const events = handleKeyUp(e);
    if (events) { e.preventDefault(); predictFreeText(events); setFreeText(''); startCapture(); }
  };
  const predictFreeText = async (events) => {
    if (events.length < 15) { setPrediction('Sample too short'); setConfidence(null); return; }
    setPrediction('...'); setConfidence(null);
    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
      const data = await response.json();
      if (response.ok) {
        setPrediction(data.predicted_user);
        setConfidence(data.confidence);
      } else setPrediction('Error');
    } catch (error) { setPrediction('Server Error'); }
  };
  
  const handleShowUserList = (e) => {
    e.preventDefault();
    setMessage('Fetching user list...');
    try {
      fetch(`${API_BASE_URL}/users`).then(res => res.json()).then(data => {
        setModalData(data); setModalView('list'); setShowModal(true); setMessage('');
      });
    } catch (e) { setMessage("Could not fetch stats. Server offline?"); }
  };
  const handleShowLeaderboard = (e) => {
    e.preventDefault();
    setMessage('Fetching leaderboard...');
    try {
      fetch(`${API_BASE_URL}/accuracy_leaderboard`).then(res => res.json()).then(data => {
        setModalData(data); setModalView('leaderboard'); setShowModal(true); setMessage('');
      });
    } catch (e) { setMessage("Could not fetch stats. Server offline?"); }
  };
  const handleShowUserStats = async (username) => {
    setMessage('Fetching user stats...');
    try {
      const response = await fetch(`${API_BASE_URL}/user_stats/${username}`);
      const data = await response.json();
      setModalDetail(data); setModalView('detail');
    } catch (e) { setMessage("Could not fetch user detail."); }
  };
  
  // --- NEW: My Profile Handler ---
  const handleShowMyProfile = (e) => {
    e.preventDefault();
    if (loggedInUser) {
      handleShowUserStats(loggedInUser);
    }
  };

  const renderAppModal = () => {
    if (!showModal) return null;
    let content;
    if (modalView === 'list') {
      content = ( <>
          <h2>User List</h2> <p className="subtitle">Click a user to see their detailed stats.</p>
          <table><thead><tr><th>Username</th><th>Samples Submitted</th></tr></thead>
            <tbody>
              {modalData.length > 0 ? (
                modalData.map(user => (
                  <tr key={user.username} onClick={() => handleShowUserStats(user.username)} className="clickable-row">
                    <td>{user.username}</td> <td>{user.samples}</td>
                  </tr>
                ))
              ) : ( <tr><td colSpan="2">No users have been trained yet.</td></tr> )}
            </tbody>
          </table>
      </> );
    } else if (modalView === 'leaderboard') {
      content = ( <>
          <h2>Accuracy Leaderboard</h2> <p className="subtitle">Based on average score from diverse sentence training.</p>
          <table><thead><tr><th>Rank</th><th>Username</th><th>Avg. Accuracy</th></tr></thead>
            <tbody>
              {modalData.length > 0 ? (
                modalData.map((user, index) => (
                  <tr key={user.username}>
                    <td>{index + 1}</td> <td>{user.username}</td> <td>{(user.avg_accuracy * 100).toFixed(2)}%</td>
                  </tr>
                ))
              ) : ( <tr><td colSpan="3">No accuracy data available.</td></tr> )}
            </tbody>
          </table>
      </> );
    } else if (modalView === 'detail' && modalDetail) {
      content = ( <>
          <button onClick={() => setModalView('list')} className="back-button">← Back to List</button>
          <h2>Stats for: {modalDetail.username}</h2>
          <div className="stats-grid">
            <div className="stat-item"><span className="stat-label">Total Samples</span><span className="stat-value">{modalDetail.total_samples}</span></div>
            <div className="stat-item"><span className="stat-label">Average WPM</span><span className="stat-value">{modalDetail.avg_wpm.toFixed(1)}</span></div>
            <div className="stat-item"><span className="stat-label">Avg. Accuracy</span><span className="stat-value">{modalDetail.avg_accuracy ? (modalDetail.avg_accuracy * 100).toFixed(2) + '%' : 'N/A'}</span></div>
            <div className="stat-item"><span className="stat-label">Avg. Hold Time</span><span className="stat-value">{modalDetail.avg_hold_time_ms.toFixed(0)} ms</span></div>
            <div className="stat-item"><span className="stat-label">Avg. Hold Deviation</span><span className="stat-value">{modalDetail.avg_hold_std_ms.toFixed(0)} ms</span></div>
            <div className="stat-item"><span className="stat-label">Avg. Latency</span><span className="stat-value">{modalDetail.avg_latency_ms.toFixed(0)} ms</span></div>
          </div>
          {/* --- NEW: Add More Samples Button --- */}
          {loggedInUser === modalDetail.username && (
            <button onClick={() => {
              setShowModal(false);
              setAppState('TRAIN_FREE');
              setFreeSampleCount(0); // Reset counter
              setMessage(`Let's add 5 more free-text samples.`);
              startCapture();
            }} className="action-button train-button">
              Add More Samples
            </button>
          )}
      </> );
    }
    return (
      <div className="modal-backdrop" onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {content}
          <button onClick={() => setShowModal(false)} className="reset-button">Close</button>
        </div>
      </div>
    );
  };
  

  let pageContent;
  if (appState === 'LOADING') {
    pageContent = (
      <>
        <h2>Loading...</h2>
        <p className="message">{message}</p>
      </>
    );
  } else if (appState === 'AUTH') {
    pageContent = (
      <>
        <h2>{authMode === 'login' ? 'Log In' : 'Sign Up'}</h2>
        <p className="message">{message}</p>
        <form className="auth-form" onSubmit={handleAuthSubmit}>
          <input type="text" className="username-input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="password" className="username-input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className="action-button">
            {authMode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>
        <button
          onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setMessage(authMode === 'login' ? 'Create a new account.' : 'Log in to an existing account.'); setPassword(''); }}
          className="reset-button"
        >
          {authMode === 'login' ? 'Need an account? Sign Up' : 'Have an account? Log In'}
        </button>
        {/* User list and leaderboard buttons are now in the header */}
      </>
    );
  } else if (appState === 'TRAIN_DIVERSE') {
    const sentenceIndex = Math.min(diverseSampleCount, DIVERSE_SENTENCES.length - 1);
    const currentSentence = DIVERSE_SENTENCES[sentenceIndex];
    pageContent = (
      <>
        <h2>Phase 1: Diverse Sentences ({loggedInUser})</h2>
        <p className="message">{message}</p>
        <p className="target-phrase">{currentSentence}</p>
        <textarea
          className="typing-area"
          value={typedText}
          onChange={handleDiverseChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleDiverseKeyUp}
          placeholder="Type the sentence... (auto-submits on perfect match)"
          disabled={diverseSampleCount >= DIVERSE_SAMPLES_REQUIRED}
        />
        <p className="subtitle">Or press Enter to submit a misspelled try</p>
        <h3>Progress: {diverseSampleCount} / {DIVERSE_SAMPLES_REQUIRED}</h3>
        <button onClick={handleLogout} className="reset-button">Log Out</button>
      </>
    );
  } else if (appState === 'TRAIN_FREE') {
    pageContent = (
      <>
        <h2>Phase 2: Free Text ({loggedInUser})</h2>
        <p className="message">{message}</p>
        <textarea
          className="typing-area"
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleFreeTrainingKeyUp}
          placeholder="Type any sentence of your own (10+ chars) and press Enter..."
          disabled={freeSampleCount >= FREE_SAMPLES_REQUIRED}
        />
        <h3>Progress: {freeSampleCount} / {FREE_SAMPLES_REQUIRED}</h3>
        {freeSampleCount >= FREE_SAMPLES_REQUIRED && (
          <button onClick={handleTrainModel} className="action-button train-button">
            Re-Train Model
          </button>
        )}
        <button onClick={handleLogout} className="reset-button">Log Out</button>
      </>
    );
  } else if (appState === 'PREDICTING') {
    pageContent = (
      <>
        <h2>Real-Time Prediction Mode (Logged in as: {loggedInUser})</h2>
        <p className="message">{message}</p>
        <textarea
          className="typing-area free-text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={handlePredictionKeyDown}
          onKeyUp={handlePredictionKeyUp}
          placeholder="Type anything here and press Enter to predict..."
        />
        <div className="prediction-box">
          Prediction: <span>{prediction || 'Waiting...'}</span>
          {confidence !== null && (
            <span className="confidence-score">
              ({(confidence * 100).toFixed(0)}% Confident)
            </span>
          )}
        </div>
        {/* Log Out is the only main button here now */}
        <button onClick={handleLogout} className="reset-button">
          Log Out
        </button>
      </>
    );
  }

  // --- Main return for the new layout ---
  return (
    <div className="App-container">
      {renderAppModal()}
      <Header 
        loggedInUser={loggedInUser}
        onShowUserList={handleShowUserList}
        onShowLeaderboard={handleShowLeaderboard}
        onShowMyProfile={handleShowMyProfile}
      />
      <main className="App-content">
        <div className="page-content">
          {pageContent}
        </div>
        {/* NEW: Add explanation box, but only on the main pages */}
        {(appState === 'AUTH' || appState === 'PREDICTING') && <Explanation />}
      </main>
      <Footer />
    </div>
  );
}

export default App;