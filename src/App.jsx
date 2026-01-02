import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { 
  Calendar, MapPin, Search, ChevronRight, Activity, TrendingUp, Info, 
  ExternalLink, ArrowUpRight, Filter, X, Hash, Trophy, Star, Target, Flag, RefreshCw, Link as LinkIcon, Settings,
  Zap, Sparkles, ChevronDown, ChevronUp, Wind, Coffee, Route, Clock, Mountain, LogOut, Lock, Mail, Key, UserPlus, Fingerprint
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  setPersistence,
  browserLocalPersistence 
} from 'firebase/auth';

/**
 * FIREBASE CONFIGURATION
 */
const firebaseConfig = {
  apiKey: "AIzaSyARpTn2oVboddJ32vLHqSaBSQGjZCVg2NA",
  authDomain: "rvijgdrive-152618.firebaseapp.com",
  projectId: "rvijgdrive-152618",
  storageBucket: "rvijgdrive-152618.firebasestorage.app",
  messagingSenderId: "366295091706",
  appId: "1:366295091706:web:4695a1a43466d62cfcfc43",
  measurementId: "G-92G67DLXZ8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Ensure persistence is set globally immediately
setPersistence(auth, browserLocalPersistence);

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRg1rSihcL1ivA8OZMcRuJ__LoU46zaIm8CHfUyZmdAI42mRl_3zijL1jpWYWsd7KjtCQCD2x8FMwIe/pub?gid=0&single=true&output=csv"; 

const App = () => {
  // --- Auth State ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginProcess, setLoginProcess] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showReset, setShowReset] = useState(false);
  
  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);

  // --- Data & UI State ---
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [showSettings, setShowSettings] = useState(false);
  
  const [showAllDemanding, setShowAllDemanding] = useState(false);
  const [showAllBeautiful, setShowAllBeautiful] = useState(false);
  const [showAllWindy, setShowAllWindy] = useState(false);
  const [showAllBreakfast, setShowAllBreakfast] = useState(false);

  // --- Unified Authentication Logic ---
  useEffect(() => {
    let isMounted = true;

    const performAuthInit = async () => {
      // 1. First, check if we are currently expecting a redirect result
      // This sessionStorage flag helps prevent the loop on iOS Safari
      const isRedirecting = window.sessionStorage.getItem('pending_auth_redirect') === 'true';
      
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          if (isMounted) setUser(result.user);
          window.sessionStorage.removeItem('pending_auth_redirect');
        }
      } catch (err) {
        console.error("Redirect Error:", err);
        window.sessionStorage.removeItem('pending_auth_redirect');
      }

      // 2. Listen for state changes (this also recovers sessions)
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (!isMounted) return;
        setUser(currentUser);
        
        // Only stop the loading spinner if we aren't still waiting for a mobile redirect
        if (!window.sessionStorage.getItem('pending_auth_redirect')) {
          setAuthLoading(false);
          setLoginProcess(false);
        }
      });

      // 3. Safety Timeout: If nothing happens in 6 seconds, show login screen anyway
      setTimeout(() => {
        if (isMounted) {
          setAuthLoading(false);
          window.sessionStorage.removeItem('pending_auth_redirect');
        }
      }, 6000);

      return unsubscribe;
    };

    const authTask = performAuthInit();
    return () => {
      isMounted = false;
      authTask.then(unsub => unsub && unsub());
    };
  }, []);

  const handleGoogleLogin = async () => {
    if (loginProcess) return;
    setLoginProcess(true);
    setAuthError(null);
    
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      if (isMobile) {
        // Set flag before redirecting so the app knows to wait on reload
        window.sessionStorage.setItem('pending_auth_redirect', 'true');
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      console.error("Login Error:", err);
      setLoginProcess(false);
      setAuthLoading(false);
      window.sessionStorage.removeItem('pending_auth_redirect');
      setAuthError("Google Login is blocked by your browser settings. Use Email instead.");
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginProcess(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError("Account not found or invalid password.");
      setLoginProcess(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoginProcess(true);
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(err.message.includes('email-already-in-use') ? "Email already exists." : "Sign up failed.");
      setLoginProcess(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoginProcess(true);
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setAuthSuccess("Check your inbox for reset instructions.");
      setLoginProcess(false);
      setTimeout(() => { setShowReset(false); setAuthSuccess(null); }, 4000);
    } catch (err) {
      setAuthError("Email not found.");
      setLoginProcess(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      window.sessionStorage.clear();
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    const userEmail = user.email.toLowerCase();
    return (
      userEmail.endsWith('@gmail.com') || 
      userEmail === 'mv11015@husd.k12.ca.us' || 
      userEmail === 'rajeev.vij@gmail.com'
    );
  }, [user]);

  // --- Data Parsing Logic ---
  const cleanNum = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const sanitized = val.toString().replace(/,/g, '').trim();
    const match = sanitized.match(/^-?\d*\.?\d+/);
    return match ? parseFloat(match[0]) : 0;
  };

  const parseCSV = (csvText) => {
    const lines = [];
    let currentLine = [];
    let currentField = "";
    let inQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];
      if (char === '"' && inQuotes && nextChar === '"') {
        currentField += '"'; i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentField.trim());
        currentField = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        currentLine.push(currentField.trim());
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = []; currentField = "";
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        currentField += char;
      }
    }
    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      lines.push(currentLine);
    }
    if (lines.length < 2) return [];
    const header = lines[0].map(h => h.toLowerCase().trim());
    const milesIdx = header.findIndex(h => h.includes('mile'));
    const elevIdx = header.findIndex(h => h.includes('elevation') || h.includes('gain'));
    const finalMilesIdx = milesIdx !== -1 ? milesIdx : lines[0].length - 2;
    const finalElevIdx = elevIdx !== -1 ? elevIdx : lines[0].length - 1;

    return lines.slice(1) 
      .map(parts => {
        const rawHikeNum = parts[0];
        const id = rawHikeNum && rawHikeNum.trim() !== "" ? parseInt(rawHikeNum) : null;
        let year = 'Unknown';
        const dateParts = parts[1]?.split('/');
        if (dateParts && dateParts.length === 3) {
          let rawYear = dateParts[2].trim();
          if (rawYear.length === 2) rawYear = "20" + rawYear;
          if (rawYear.length > 4) rawYear = rawYear.slice(-4);
          if (rawYear.length === 4) year = rawYear;
        }
        return { id: id, date: parts[1] || '', year: year, comments: parts[2] || '', direction: parts[3] || '', location: parts[4] || 'Unknown', miles: cleanNum(parts[finalMilesIdx]), elevation: cleanNum(parts[finalElevIdx]) };
      })
      .filter(h => h.id !== null && !isNaN(h.id) && h.id > 0)
      .sort((a, b) => b.id - a.id);
  };

  const fetchData = useCallback(async (url) => {
    if (!url || !isAuthorized) return;
    setIsRefreshing(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network error');
      const csvText = await response.text();
      setData(parseCSV(csvText));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthorized]);

  useEffect(() => { if (isAuthorized) fetchData(sheetUrl); }, [sheetUrl, fetchData, isAuthorized]);

  const milestones = useMemo(() => {
    const targets = [350, 300, 250, 200, 150, 100, 50, 25, 1];
    return data.filter(h => targets.includes(h.id)).sort((a, b) => b.id - a.id);
  }, [data]);

  const yearStats = useMemo(() => {
    const stats = {};
    data.forEach(hike => { if (hike.year && hike.year !== 'Unknown') stats[hike.year] = (stats[hike.year] || 0) + 1; });
    return Object.keys(stats).sort().map(year => ({ year, count: stats[year] }));
  }, [data]);

  const aggregateStats = useMemo(() => {
    let startYear = null;
    const yearSet = new Set();
    let totalMiles = 0;
    let totalElevation = 0;
    data.forEach(hike => {
      const y = parseInt(hike.year);
      if (!isNaN(y)) { if (!startYear || y < startYear) startYear = y; yearSet.add(y); }
      totalMiles += hike.miles;
      totalElevation += hike.elevation;
    });
    const mostActive = [...yearStats].sort((a, b) => b.count - a.count)[0];
    return { hikeCount: data.length, since: startYear, activeYear: mostActive?.year || 'N/A', activeCount: mostActive?.count || 0, averageHikesPerYear: (data.length / (yearSet.size || 1)).toFixed(1), totalMiles: totalMiles.toLocaleString(undefined, { maximumFractionDigits: 1 }), totalElevation: totalElevation.toLocaleString() };
  }, [data, yearStats]);

  const demandingHikes = useMemo(() => {
    const priorityNames = ['white mountain', 'everest', 'nepal', 'mount dana', 'shiva murugan', 'ohlone wilderness', 'del valle', 'sunol peak', 'taylor ranch', 'mission peak'];
    return data.map(h => {
      const loc = h.location.toLowerCase();
      const comm = h.comments.toLowerCase();
      let score = (h.miles * 500) + (h.elevation);
      if (priorityNames.some(name => loc.includes(name) || comm.includes(name))) score += 8000;
      if (comm.includes('strenuous') || comm.includes('tough') || comm.includes('challenging')) score += 1000;
      return { ...h, score };
    }).sort((a, b) => b.score - a.score).slice(0, 15);
  }, [data]);

  const beautifulHikes = useMemo(() => {
    const keywords = ['beautiful', 'stunning', 'gorgeous', 'picturesque', 'sunrise', 'scenic', 'serene', 'view', 'lush', 'amazing'];
    return data.filter(h => keywords.some(k => h.comments.toLowerCase().includes(k))).slice(0, 15);
  }, [data]);

  const windyRainyHikes = useMemo(() => {
    const keywords = ['windy', 'rainy', 'rain', 'storm', 'wind', 'wet', 'soaked', 'chilly', 'cold', 'weather'];
    return data.filter(h => keywords.some(k => h.comments.toLowerCase().includes(k))).slice(0, 15);
  }, [data]);

  const breakfastHikes = useMemo(() => {
    const keywords = ['breakfast', 'pancakes', 'eggs', 'coffee', 'diner', 'eating', 'meal', 'food', 'brunch', 'bakery'];
    return data.filter(h => keywords.some(k => h.comments.toLowerCase().includes(k))).slice(0, 15);
  }, [data]);

  const filteredData = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return data.filter(hike => {
      const matchesYear = selectedYear === 'All' || hike.year === selectedYear;
      if (!matchesYear) return false;
      return !s || hike.location.toLowerCase().includes(s) || hike.comments.toLowerCase().includes(s) || hike.id.toString().includes(s);
    });
  }, [data, searchTerm, selectedYear]);

  const years = ['All', ...new Set(data.map(h => h.year).filter(y => y && y !== 'Unknown'))].sort((a, b) => b - a);

  const HikeListCard = ({ title, icon: Icon, hikes, colorClass, showAll, onToggle }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2"><Icon className={`h-4 w-4 ${colorClass}`} /> {title}</h3>
        <button onClick={onToggle} className="text-gray-300 hover:text-emerald-600">{showAll ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button>
      </div>
      <div className="space-y-4 flex-grow">
        {(showAll ? hikes : hikes.slice(0, 4)).map((hike) => (
          <div key={hike.id} className="flex items-center gap-3">
            <span className="text-[10px] font-black bg-gray-50 text-gray-400 w-8 h-8 flex items-center justify-center rounded-xl font-mono">#{hike.id}</span>
            <div className="flex-grow overflow-hidden text-xs">
              <div className="font-black truncate uppercase tracking-tighter">{hike.location}</div>
              <div className="text-[9px] text-gray-400 font-bold font-mono">{hike.date} • {hike.miles}mi {hike.elevation > 0 && `• ${hike.elevation.toLocaleString()}ft`}</div>
            </div>
          </div>
        ))}
      </div>
      {hikes.length > 4 && (
        <button onClick={onToggle} className="mt-6 pt-4 border-t border-gray-50 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-800 flex items-center justify-center gap-2">
          {showAll ? "Show Less" : `View All ${hikes.length} Peaks`}
        </button>
      )}
    </div>
  );

  if (authLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 gap-6">
      <div className="relative">
        <RefreshCw className="h-12 w-12 animate-spin text-emerald-500" />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></div>
        </div>
      </div>
      <div className="text-center">
        <span className="text-emerald-500 font-black uppercase tracking-[0.3em] text-[10px] block mb-1">Secure Handshake</span>
        <span className="text-gray-500 text-xs font-medium italic">Please wait while we verify your session...</span>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 relative font-sans overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px]"></div>
        </div>
        <div className="z-10 text-center max-w-sm w-full px-4">
            <div className="bg-emerald-600 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3"><Mountain className="text-white h-10 w-10" /></div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Challenger</h1>
            <p className="text-gray-500 mb-10 text-[10px] font-black tracking-[0.4em] uppercase">Expedition Portal</p>
            
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              
              {!showReset ? (
                <>
                  {/* Google Login - Always prominent */}
                  <button 
                    onClick={handleGoogleLogin} 
                    disabled={loginProcess} 
                    className="w-full py-5 bg-white text-gray-900 rounded-[1.5rem] font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                  >
                    {loginProcess && !showSignup ? <RefreshCw className="h-5 w-5 animate-spin text-gray-900" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />}
                    Sign in with Google
                  </button>

                  <div className="flex items-center gap-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    <div className="h-px bg-white/10 flex-grow"></div>
                    <span>Or Member Login</span>
                    <div className="h-px bg-white/10 flex-grow"></div>
                  </div>

                  {/* Unified Email/Pass form */}
                  <form onSubmit={showSignup ? handleSignUp : handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                        <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 text-sm transition-all" />
                      </div>
                      <div className="relative group">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 text-sm transition-all" />
                      </div>
                    </div>
                    {authError && <div className="text-red-400 text-[10px] font-black uppercase tracking-widest leading-relaxed px-2">{authError}</div>}
                    <button type="submit" disabled={loginProcess} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 active:scale-95">
                      {loginProcess && showSignup ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                      {showSignup ? 'Create Member Account' : 'Sign in as Member'}
                    </button>
                    
                    <div className="flex justify-between px-2 pt-2">
                      <button type="button" onClick={() => setShowSignup(!showSignup)} className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-white underline transition-colors">
                        {showSignup ? 'Back to Sign In' : 'Sign Up Instead'}
                      </button>
                      <button type="button" onClick={() => setShowReset(true)} className="text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-white underline transition-colors">Forgot Password?</button>
                    </div>
                  </form>
                </>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-6 py-4">
                  <div className="text-left space-y-2">
                    <h2 className="text-lg font-black uppercase tracking-tighter">Reset Password</h2>
                    <p className="text-gray-500 text-xs">We'll send a recovery link to your inbox.</p>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input type="email" placeholder="Enter account email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500 text-sm" />
                  </div>
                  {authError && <div className="text-red-400 text-[10px] font-black uppercase tracking-widest">{authError}</div>}
                  {authSuccess && <div className="text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-bounce">{authSuccess}</div>}
                  <button type="submit" disabled={loginProcess} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-500 transition-all active:scale-95">Send Recovery Link</button>
                  <button type="button" onClick={() => setShowReset(false)} className="text-gray-500 text-[10px] font-black uppercase tracking-widest hover:underline block mx-auto">Cancel</button>
                </form>
              )}
            </div>
            <p className="mt-12 text-[9px] text-gray-600 uppercase tracking-widest font-black tracking-[0.4em]">Authorized Group Access Only</p>
        </div>
      </div>
    );
  }

  if (user && !isAuthorized) {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-red-900 p-6 font-sans text-center">
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md border border-red-100">
                <Lock className="h-16 w-16 mx-auto mb-6 text-red-600" />
                <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter">Access Denied</h2>
                <p className="text-red-700/70 text-sm mb-8 leading-relaxed font-medium">Your account (<span className="font-bold text-red-900">{user.email}</span>) is not on the whitelist.</p>
                <button onClick={handleLogout} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg">Sign Out & Try Again</button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 selection:bg-emerald-100 selection:text-emerald-900">
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black uppercase tracking-tighter">Sheet Config</h2><button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="h-6 w-6" /></button></div>
            <div className="space-y-6">
              <input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-mono text-xs focus:border-emerald-500" />
              <button onClick={() => { setShowSettings(false); fetchData(sheetUrl); }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl">Update & Reload</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="bg-emerald-600 p-2.5 rounded-2xl text-white rotate-3 shadow-lg shadow-emerald-200"><Mountain className="h-6 w-6" /></div><h1 className="text-2xl font-black tracking-tighter uppercase text-gray-900 leading-none mt-1">Challenger Hiking</h1></div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 mr-4 pl-4 border-l border-gray-100">
                <div className="hidden sm:block text-right"><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Authenticated</div><div className="text-[11px] font-bold text-gray-700 leading-none">{user?.displayName || user?.email.split('@')[0]}</div></div>
                {user?.photoURL ? <img src={user.photoURL} className="w-9 h-9 rounded-full border-2 border-emerald-500 p-0.5" alt="user" /> : <div className="w-9 h-9 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-emerald-50 text-emerald-600 font-black text-xs uppercase">{user?.email[0]}</div>}
                <button onClick={handleLogout} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-all" title="Logout"><LogOut className="h-5 w-5" /></button>
            </div>
            <button onClick={() => fetchData(sheetUrl)} className={`p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw className="h-5 w-5" /></button>
            <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"><Settings className="h-5 w-5" /></button>
            <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200 ml-2">
              <Filter className="h-4 w-4 ml-2 text-gray-400" />
              <select className="bg-transparent border-none rounded-xl text-xs font-black uppercase pr-8 py-0 focus:ring-0 cursor-pointer" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>{years.map(y => <option key={y} value={y}>{y === 'All' ? 'ALL YEARS' : y}</option>)}</select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="mb-12 relative flex items-center group">
          <input type="text" placeholder="Search peaks, details, or dates..." className="w-full pl-8 pr-24 py-7 text-2xl bg-white border border-gray-200 rounded-[2.5rem] shadow-sm focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none font-medium placeholder:text-gray-300 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="absolute inset-y-0 right-10 flex items-center gap-4">{searchTerm && <button onClick={() => setSearchTerm('')} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X className="h-6 w-6" /></button>}<Search className={`h-10 w-10 transition-colors ${searchTerm ? 'text-emerald-500' : 'text-gray-200'}`} /></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all"><div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Total Summits</span><div className="text-5xl font-black text-gray-900 mb-1 tracking-tighter">{aggregateStats.hikeCount}</div><span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-widest font-mono">Since {aggregateStats.since}</span></div><Trophy className="h-12 w-12 text-emerald-600 opacity-10 group-hover:opacity-30 transition-opacity" /></div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all"><div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Miles Logged</span><div className="text-5xl font-black text-gray-900 mb-1 tracking-tighter">{aggregateStats.totalMiles}</div><span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-widest font-mono">Mi</span></div><Route className="h-12 w-12 text-blue-600 opacity-10 group-hover:opacity-30 transition-opacity" /></div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all"><div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Vertical Gain</span><div className="text-5xl font-black text-gray-900 mb-1 tracking-tighter">{aggregateStats.totalElevation}</div><span className="text-[10px] font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-lg uppercase tracking-widest font-mono">Ft</span></div><Activity className="h-12 w-12 text-red-600 opacity-10 group-hover:opacity-30 transition-opacity" /></div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all"><div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Avg Summits</span><div className="text-5xl font-black text-gray-900 mb-1 tracking-tighter">{aggregateStats.averageHikesPerYear}</div><span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">/ Year</span></div><Star className="h-12 w-12 text-orange-600 opacity-10 group-hover:opacity-30 transition-opacity" /></div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all"><div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Most Active</span><div className="text-5xl font-black text-gray-900 mb-1 tracking-tighter">{aggregateStats.activeYear}</div><span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">{aggregateStats.activeCount} Peaks</span></div><Clock className="h-12 w-12 text-purple-600 opacity-10 group-hover:opacity-30 transition-opacity" /></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-10 items-start">
            <div className="lg:col-span-1 hidden lg:block">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm sticky top-28">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-10 flex items-center gap-3"><Flag className="h-5 w-5 text-emerald-600" /> Milestone Tracking</h3>
                <div className="relative border-l-2 border-dashed border-gray-100 ml-4 space-y-12 pb-4">
                  {milestones.map((hike) => (
                    <div key={hike.id} className="relative pl-10 group">
                      <div className="absolute -left-[13px] top-1.5 w-6 h-6 bg-white border-4 border-emerald-500 rounded-full shadow-lg group-hover:scale-125 transition-transform z-10"></div>
                      <div className="bg-emerald-50 inline-block px-3 py-1 rounded-xl text-[10px] font-black text-emerald-700 mb-2 font-mono">#{hike.id} SUMMIT</div>
                      <div className="text-sm font-black uppercase tracking-tighter leading-tight mb-1">{hike.location}</div>
                      <div className="text-[10px] text-gray-400 font-bold font-mono uppercase">{hike.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 xl:col-span-3 space-y-10">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                        <div className="flex items-center gap-4"><Activity className="h-6 w-6 text-emerald-600" /><h3 className="font-black text-xl uppercase tracking-tighter">{searchTerm ? 'Search Results' : 'Complete Expedition Log'}</h3></div>
                        <span className="text-[11px] font-black text-gray-400 bg-white px-4 py-1.5 rounded-full border border-gray-200 shadow-sm uppercase tracking-widest">{filteredData.length} entries</span>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[1400px] overflow-y-auto custom-scrollbar">
                        {filteredData.length > 0 ? (
                        filteredData.map((hike) => (
                            <div key={hike.id} className="p-10 hover:bg-emerald-50/10 transition-colors group">
                                <div className="flex justify-between items-start gap-6">
                                    <div className="flex-grow">
                                        <div className="flex flex-wrap items-center gap-3 mb-4">
                                            <span className="text-[11px] font-black bg-gray-900 text-white px-4 py-1.5 rounded-full group-hover:bg-emerald-600 transition-all font-mono shadow-md">#{hike.id}</span>
                                            <span className="text-xs font-black text-gray-300 font-mono tracking-widest uppercase">{hike.date}</span>
                                            <div className="flex gap-4 font-mono">
                                                {hike.miles > 0 && <span className="text-[11px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">{hike.miles} miles</span>}
                                                {hike.elevation > 0 && <span className="text-[11px] text-red-600 font-black uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-md">{hike.elevation.toLocaleString()} ft gain</span>}
                                            </div>
                                        </div>
                                        <h4 className="text-3xl font-black mb-4 group-hover:text-emerald-700 transition-colors uppercase tracking-tighter leading-none">{hike.location}</h4>
                                        <p className="text-gray-500 text-lg leading-relaxed italic font-medium">"{hike.comments}"</p>
                                    </div>
                                    {hike.direction && (<a href={hike.direction} target="_blank" rel="noreferrer" className="p-4 bg-gray-50 text-gray-300 rounded-[1.5rem] hover:bg-emerald-600 hover:text-white hover:rotate-12 transition-all shadow-sm"><ArrowUpRight className="h-6 w-6" /></a>)}
                                </div>
                            </div>
                        ))
                        ) : (
                        <div className="p-32 text-center text-gray-400 flex flex-col items-center gap-6"><Search className="h-12 w-12 opacity-20" /><p className="font-bold uppercase tracking-widest text-lg">No treks found matching "{searchTerm}"</p><button onClick={() => setSearchTerm('')} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all">Clear Search Filters</button></div>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-10">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-10 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-500" /> Yearly Momentum</h3>
                    <div className="h-56 font-mono"><ResponsiveContainer width="100%" height="100%"><BarChart data={yearStats}><Bar dataKey="count" radius={[6, 6, 0, 0]}>{yearStats.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.year === selectedYear ? '#064e3b' : '#059669'} />))}<LabelList dataKey="count" position="top" offset={10} style={{ fill: '#9ca3af', fontSize: 10, fontWeight: 900 }} /></Bar><XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#9ca3af'}} /><Tooltip cursor={{fill: '#f0fdf4'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: '900', fontSize: '12px'}} /></BarChart></ResponsiveContainer></div>
                </div>
                <HikeListCard title="Demanding Peaks" icon={Zap} hikes={demandingHikes} colorClass="text-red-500" showAll={showAllDemanding} onToggle={() => setShowAllDemanding(!showAllDemanding)} />
                <HikeListCard title="Stunning Views" icon={Sparkles} hikes={beautifulHikes} colorClass="text-blue-500" showAll={showAllBeautiful} onToggle={() => setShowAllBeautiful(!showAllBeautiful)} />
                <HikeListCard title="Rough Weather" icon={Wind} hikes={windyRainyHikes} colorClass="text-cyan-500" showAll={showAllWindy} onToggle={() => setShowAllWindy(!showAllWindy)} />
                <HikeListCard title="The Breakfast Club" icon={Coffee} hikes={breakfastHikes} colorClass="text-orange-500" showAll={showAllBreakfast} onToggle={() => setShowAllBreakfast(!showAllBreakfast)} />
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;