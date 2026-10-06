import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Sparkles, Film, Calendar, Clock, CheckCircle2, Lock, 
  Trash2, RefreshCw, LogOut, Shield, ChevronRight, AlertCircle, Popcorn, MapPin, Eye, EyeOff 
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, getDocs, onSnapshot, serverTimestamp, query, orderBy, deleteDoc, doc 
} from 'firebase/firestore';
import { 
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously 
} from 'firebase/auth';

// Safe environment variable detection that works seamlessly across ES2015+ targets, Vite, and global contexts
const getFirebaseConfig = () => {
  let globalConfig = {};
  if (typeof __firebase_config !== 'undefined') {
    try {
      globalConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
    } catch (e) {
      console.warn("Error parsing global __firebase_config", e);
    }
  }

  const getEnv = (viteKey, configKey) => {
    if (globalConfig && globalConfig[configKey]) {
      return globalConfig[configKey];
    }
    if (typeof process !== 'undefined' && process.env && process.env[viteKey]) {
      return process.env[viteKey];
    }
    if (typeof window !== 'undefined' && window[viteKey]) {
      return window[viteKey];
    }
    return "";
  };

  return {
    apiKey: getEnv('VITE_FIREBASE_API_KEY', 'apiKey'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'authDomain'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID', 'projectId') || "default-app",
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'storageBucket'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'),
    appId: getEnv('VITE_FIREBASE_APP_ID', 'appId')
  };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase App safely
let app, db, auth;
const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.projectId !== "default-app");

try {
  if (isFirebaseConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
  }
} catch (err) {
  console.warn("Firebase initialization skipped or failed. Fallback mode enabled.", err);
}

const MOVIES = [
  {
    id: 'movie1',
    title: 'Сүүлчийн Шилдэг Эрс',
    genre: 'Action / Drama',
    duration: '2h 15m',
    rating: '4.9',
    poster: '/movies/movie1.jpg',
    color: 'from-amber-600/30 to-red-900/30',
    description: 'An emotional Mongolian cinematic masterpiece detailing honor, brotherhood, and devotion.'
  },
  {
    id: 'hope',
    title: 'HOPE',
    genre: 'Drama / Thriller',
    duration: '2h 04m',
    rating: '4.8',
    poster: '/movies/hope.jpg',
    color: 'from-blue-600/30 to-indigo-900/30',
    description: 'A deeply moving story filled with resilience, heart, and unforgettable twists.'
  },
  {
    id: 'heart-of-the-beast',
    title: 'Heart of the Beast',
    genre: 'Fantasy / Romance',
    duration: '1h 55m',
    rating: '4.7',
    poster: '/movies/heart-of-the-beast.jpg',
    color: 'from-purple-600/30 to-rose-900/30',
    description: 'A spellbinding tale of passion and mystery in a breathtaking fantasy world.'
  },
  {
    id: 'resident-evil',
    title: 'Resident Evil',
    genre: 'Action / Horror',
    duration: '1h 48m',
    rating: '4.6',
    poster: '/movies/resident-evil.jpg',
    color: 'from-emerald-600/30 to-teal-900/30',
    description: 'Thrilling non-stop action with pulse-pounding tension to keep you close.'
  },
  {
    id: 'endgame',
    title: 'Endgame',
    genre: 'Sci-Fi / Action',
    duration: '3h 02m',
    rating: '5.0',
    poster: '/movies/endgame.jpg',
    color: 'from-amber-500/30 to-purple-900/30',
    description: 'The epic spectacle where heroes unite for an unforgettable cinematic experience.'
  },
  {
    id: 'movie6',
    title: 'The Odyssey',
    genre: 'Adventure / Mystery',
    duration: '2h 20m',
    rating: '4.9',
    poster: '/movies/movie6.jpg',
    color: 'from-cyan-600/30 to-blue-900/30',
    description: 'An enchanting voyage across uncharted waters and cosmic wonders.'
  }
];

const CINEMAS = ['Shangri-La IMAX', 'Hunnu Cinema', 'Tengis Cinema', 'Urgoo Cinema VIP'];
const AVAILABLE_TIMES = ['16:00', '18:30', '19:45', '20:15', '21:30'];

const SmartImage = ({ src, alt, className, fallbackTitle }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-rose-950/60 to-purple-950/80 p-4 border border-rose-500/20 text-center ${className}`}>
        <Film className="w-10 h-10 text-rose-400/70 mb-2 animate-pulse" />
        <span className="text-xs text-rose-200/80 font-medium px-2">{fallbackTitle || alt}</span>
        <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Poster Preview</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

export default function App() {
  const [page, setPage] = useState('invite'); // 'invite' | 'select' | 'datetime' | 'success' | 'admin'
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('19:45');
  const [selectedCinema, setSelectedCinema] = useState('Shangri-La IMAX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // Admin State
  const [adminUser, setAdminUser] = useState(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [responses, setResponses] = useState([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Runaway NO Button logic
  const [noButtonPos, setNoButtonPos] = useState({ x: 0, y: 0, isPosRelative: true });
  const noBtnRef = useRef(null);

  // Sync URL Hash route for direct access to /admin or #admin
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
        setPage('admin');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Firebase Auth Listener
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
      if (user && page === 'admin') {
        fetchAdminResponses();
      }
    });
    return () => unsubscribe();
  }, [page]);

  // Handle Runaway No Button on Mouse Near / Hover / Touch
  const handleNoHover = (e) => {
    const btn = noBtnRef.current;
    if (!btn) return;

    const btnRect = btn.getBoundingClientRect();
    const padding = 100;

    // Viewport bound calculations
    const maxX = window.innerWidth - btnRect.width - 40;
    const maxY = window.innerHeight - btnRect.height - 40;

    // Generate random new coordinates within safe margins
    const randomX = Math.max(20, Math.min(maxX, Math.floor(Math.random() * maxX)));
    const randomY = Math.max(20, Math.min(maxY, Math.floor(Math.random() * maxY)));

    setNoButtonPos({
      x: randomX,
      y: randomY,
      isPosRelative: false
    });
  };

  const handleConfirmBooking = async () => {
    if (!selectedMovie || !selectedDate || !selectedTime) {
      setSubmitError('Please select movie, date, and time to continue ❤️');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const payload = {
      response: 'YES',
      movieId: selectedMovie.id,
      movieTitle: selectedMovie.title,
      cinema: selectedCinema,
      date: selectedDate,
      time: selectedTime,
      createdAt: new Date().toISOString(),
      timestamp: isFirebaseConfigured ? serverTimestamp() : new Date().getTime()
    };

    try {
      let savedToCloud = false;
      if (isFirebaseConfigured && db) {
        // Authenticate anonymously if not logged in to pass security rules
        if (auth && !auth.currentUser) {
          try { 
            await signInAnonymously(auth); 
          } catch (e) { 
            console.warn("Anonymous authentication skipped or disabled in Firebase Console:", e);
          }
        }
        try {
          await addDoc(collection(db, 'responses'), payload);
          savedToCloud = true;
        } catch (dbErr) {
          console.warn("Firestore save failed due to security rules or offline mode. Saved locally as fallback.", dbErr);
        }
      }

      // Always save locally so the choice is never lost regardless of cloud rules
      const existing = JSON.parse(localStorage.getItem('enrellee_responses') || '[]');
      existing.unshift({ ...payload, id: 'local_' + Date.now(), isCloud: savedToCloud });
      localStorage.setItem('enrellee_responses', JSON.stringify(existing));

      setPage('success');
    } catch (err) {
      console.warn('Submission error fallback:', err);
      const existing = JSON.parse(localStorage.getItem('enrellee_responses') || '[]');
      existing.unshift({ ...payload, id: 'local_' + Date.now() });
      localStorage.setItem('enrellee_responses', JSON.stringify(existing));
      setPage('success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');

    if (!isFirebaseConfigured) {
      // Mock local admin login if Firebase isn't configured in test mode
      if (adminPassword === 'admin123' || adminPassword === 'enrellee') {
        setAdminUser({ email: adminEmail || 'admin@enrellee.app', uid: 'demo-admin' });
        fetchAdminResponses();
      } else {
        setAdminError('Incorrect demo password. Try "admin123" or configure Firebase!');
      }
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      fetchAdminResponses();
    } catch (err) {
      setAdminError(err.message || 'Failed to authenticate. Please check your credentials.');
    }
  };

  const fetchAdminResponses = async () => {
    setLoadingAdminData(true);
    let cloudResponses = [];

    try {
      if (isFirebaseConfigured && db) {
        try {
          const q = query(collection(db, 'responses'), orderBy('timestamp', 'desc'));
          const querySnapshot = await getDocs(q);
          cloudResponses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (err) {
          // Fallback query if ordering or permissions fail
          const snap = await getDocs(collection(db, 'responses'));
          cloudResponses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      }
    } catch (err) {
      console.warn('Could not fetch from Firestore:', err);
    }

    const localResponses = JSON.parse(localStorage.getItem('enrellee_responses') || '[]');
    
    // Combine cloud and local data seamlessly
    const allResponses = [...cloudResponses];
    localResponses.forEach(item => {
      if (!allResponses.some(r => r.id === item.id || (r.createdAt === item.createdAt && r.movieId === item.movieId))) {
        allResponses.push(item);
      }
    });

    setResponses(allResponses);
    setLoadingAdminData(false);
  };

  const handleDeleteResponse = async (id) => {
    try {
      if (isFirebaseConfigured && db && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'responses', id));
      }
      setResponses(prev => prev.filter(r => r.id !== id));
      const local = JSON.parse(localStorage.getItem('enrellee_responses') || '[]');
      localStorage.setItem('enrellee_responses', JSON.stringify(local.filter(r => r.id !== id)));
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Dynamic Romantic Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-2/3 right-1/4 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[90px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Top Floating Navigation / Route Indicator */}
      <header className="relative z-10 max-w-5xl mx-auto px-4 py-6 flex justify-between items-center">
        <div 
          onClick={() => { setPage('invite'); window.location.hash = ''; }}
          className="flex items-center space-x-2 cursor-pointer group"
        >
          <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-wide bg-gradient-to-r from-rose-200 via-pink-100 to-purple-200 bg-clip-text text-transparent">
            Cinema Night
          </span>
        </div>

        <button
          onClick={() => {
            if (page === 'admin') {
              setPage('invite');
              window.location.hash = '';
            } else {
              setPage('admin');
              window.location.hash = 'admin';
            }
          }}
          className="px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-rose-500/40 transition-all flex items-center gap-1.5 backdrop-blur-md"
        >
          <Shield className="w-3.5 h-3.5 text-rose-400" />
          {page === 'admin' ? 'Back to App' : 'Admin Area'}
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 pb-16 pt-4">

        {}
        {page === 'invite' && (
          <div className="flex flex-col items-center justify-center text-center space-y-8 min-h-[75vh] my-auto">
            
            {/* Enrellee Photo Frame */}
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt" />
              <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 flex items-center justify-center">
                <SmartImage
                  src="/enrellee.jpg"
                  alt="Enrellee"
                  fallbackTitle="Enrellee ❤️"
                  className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-700"
                />
              </div>
              <div className="absolute -bottom-2 right-2 bg-rose-600 text-white p-2.5 rounded-full shadow-lg border border-white/20 animate-bounce">
                <Heart className="w-5 h-5 fill-white" />
              </div>
            </div>

            {/* Title Invitation Banner */}
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium tracking-wide">
                <Sparkles className="w-3.5 h-3.5" /> A Special Invitation For You
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                ENRELLEE, will you watch a movie with me?
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
                Pick your favorite film, choose a night, and let me handle the popcorn & tickets. 🍿✨
              </p>
            </div>

            {/* Interactive Yes / Runaway No Buttons */}
            <div className="relative w-full max-w-md h-28 flex items-center justify-center gap-6 mt-6">
              {/* YES Button */}
              <button
                onClick={() => setPage('select')}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-lg shadow-xl shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 border border-rose-400/30 z-20"
              >
                YES <Heart className="w-5 h-5 fill-white animate-pulse" />
              </button>

              {/* NO Button (Flees from hover) */}
              <button
                ref={noBtnRef}
                onMouseEnter={handleNoHover}
                onTouchStart={handleNoHover}
                onClick={handleNoHover}
                style={
                  noButtonPos.isPosRelative
                    ? {}
                    : {
                        position: 'fixed',
                        left: `${noButtonPos.x}px`,
                        top: `${noButtonPos.y}px`,
                        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        zIndex: 50
                      }
                }
                className="px-6 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-base border border-slate-700 backdrop-blur-md shadow-lg select-none cursor-pointer"
              >
                NO 😢
              </button>
            </div>
          </div>
        )}

        {}
        {page === 'select' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-rose-400 text-xs font-semibold uppercase tracking-widest">Step 1 of 2</span>
              <h2 className="text-3xl font-bold text-white">Select a Movie</h2>
              <p className="text-slate-400 text-sm">Which one catches your eye, Enrellee?</p>
            </div>

            {/* Movie Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {MOVIES.map((movie) => {
                const isSelected = selectedMovie?.id === movie.id;
                return (
                  <div
                    key={movie.id}
                    onClick={() => setSelectedMovie(movie)}
                    className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                      isSelected
                        ? 'border-rose-500 bg-slate-900/90 ring-2 ring-rose-500/50 shadow-2xl shadow-rose-500/20 scale-[1.02]'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 z-20 bg-rose-500 text-white p-1.5 rounded-full shadow-lg">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}

                    {/* Poster Image Container */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
                      <SmartImage
                        src={movie.poster}
                        alt={movie.title}
                        fallbackTitle={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
                      
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-slate-900/80 text-rose-300 backdrop-blur-md border border-slate-700">
                          ⭐ {movie.rating}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-1 rounded-md bg-slate-900/80 text-slate-300 backdrop-blur-md border border-slate-700">
                          {movie.duration}
                        </span>
                      </div>
                    </div>

                    {/* Movie Details */}
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] text-rose-400 font-medium">{movie.genre}</span>
                        <h3 className="text-lg font-bold text-white group-hover:text-rose-200 transition-colors">
                          {movie.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {movie.description}
                        </p>
                      </div>

                      <button
                        className={`w-full mt-4 py-2.5 rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-2 ${
                          isSelected
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                            : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? 'Selected ❤️' : 'Choose Movie'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => setPage('invite')}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                ← Back
              </button>

              <button
                disabled={!selectedMovie}
                onClick={() => {
                  if (selectedMovie) setPage('datetime');
                }}
                className={`px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${
                  selectedMovie
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-500/25 hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                }`}
              >
                Continue to Date & Time <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {}
        {page === 'datetime' && (
          <div className="max-w-xl mx-auto space-y-8 animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-rose-400 text-xs font-semibold uppercase tracking-widest">Step 2 of 2</span>
              <h2 className="text-3xl font-bold text-white">When should we watch it?</h2>
              <p className="text-slate-400 text-sm">Select your preferred date, time & location.</p>
            </div>

            {/* Selected Movie Summary Bar */}
            {selectedMovie && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-4 shadow-xl">
                <div className="w-14 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-slate-950">
                  <SmartImage
                    src={selectedMovie.poster}
                    alt={selectedMovie.title}
                    fallbackTitle={selectedMovie.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Selected Film</span>
                  <h4 className="text-lg font-bold text-white truncate">{selectedMovie.title}</h4>
                  <p className="text-xs text-slate-400">{selectedMovie.genre} • {selectedMovie.duration}</p>
                </div>
                <button
                  onClick={() => setPage('select')}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium underline px-2"
                >
                  Change
                </button>
              </div>
            )}

            {/* Selection Form */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 backdrop-blur-md">
              
              {/* Date Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-400" /> Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-400" /> Select Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_TIMES.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`py-2.5 rounded-xl text-xs font-medium border transition-all ${
                        selectedTime === time
                          ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cinema Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-400" /> Preferred Cinema
                </label>
                <select
                  value={selectedCinema}
                  onChange={(e) => setSelectedCinema(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500 transition-colors"
                >
                  {CINEMAS.map(cinema => (
                    <option key={cinema} value={cinema}>{cinema}</option>
                  ))}
                </select>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {submitError}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setPage('select')}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                ← Back
              </button>

              <button
                disabled={isSubmitting || !selectedDate || !selectedTime}
                onClick={handleConfirmBooking}
                className={`px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all flex items-center gap-2 ${
                  selectedDate && selectedTime && !isSubmitting
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-500/30 hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    CONFIRM INVITATION ❤️
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {}
        {page === 'success' && (
          <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fadeIn">
            <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-2xl shadow-rose-500/30 animate-bounce">
              <Popcorn className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-white">Perfect! 🎬❤️</h2>
              <p className="text-rose-300 font-medium text-sm">Your movie choice has been saved!</p>
            </div>

            {/* Selected Booking Receipt */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-4 shadow-2xl backdrop-blur-md">
              <div className="pb-3 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400 uppercase font-semibold">Invitation Summary</span>
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Movie:</span>
                  <span className="text-white font-semibold text-right">{selectedMovie?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="text-white font-medium">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time:</span>
                  <span className="text-white font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cinema:</span>
                  <span className="text-white font-medium">{selectedCinema}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic">
              Can't wait for our movie night! I will arrange everything. ✨
            </p>

            <button
              onClick={() => setPage('invite')}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
            >
              Back to Start
            </button>
          </div>
        )}

        {}
        {page === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-rose-500" /> Admin Dashboard
                </h2>
                <p className="text-xs text-slate-400">View Enrellee's submitted invitations & responses.</p>
              </div>

              {adminUser && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{adminUser.email}</span>
                  <button
                    onClick={() => {
                      if (auth) signOut(auth);
                      setAdminUser(null);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Admin Authentication Login Form */}
            {!adminUser ? (
              <div className="max-w-md mx-auto p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Admin Authentication</h3>
                  <p className="text-xs text-slate-400">Sign in to view responses</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@example.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {adminError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                      {adminError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold text-sm shadow-lg shadow-rose-500/25 hover:opacity-90 transition-all"
                  >
                    Log In as Admin
                  </button>
                </form>

                {!isFirebaseConfigured && (
                  <p className="text-[11px] text-amber-400/80 text-center italic mt-2">
                    💡 Test Mode Active: Type password <strong>admin123</strong> to view sample responses.
                  </p>
                )}
              </div>
            ) : (
              /* Responses Table / List */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">
                    Total Responses: <strong className="text-white">{responses.length}</strong>
                  </span>
                  <button
                    onClick={fetchAdminResponses}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminData ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>

                {responses.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
                    <Film className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-slate-300 font-medium text-sm">No responses yet</p>
                    <p className="text-slate-500 text-xs">When Enrellee confirms her choice, it will appear here!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {responses.map((res) => (
                      <div
                        key={res.id}
                        className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-xl backdrop-blur-md relative group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                              Response: {res.response || 'YES'} ❤️
                            </span>
                            <h4 className="text-lg font-bold text-white mt-0.5">{res.movieTitle}</h4>
                          </div>

                          <button
                            onClick={() => handleDeleteResponse(res.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
                          <div>
                            <span className="text-slate-500 block">Date</span>
                            <span className="text-slate-200 font-medium">{res.date}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Time</span>
                            <span className="text-slate-200 font-medium">{res.time}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Cinema</span>
                            <span className="text-slate-200 font-medium">{res.cinema || ' Shangri-La'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Submitted At</span>
                            <span className="text-slate-400 text-[11px]">
                              {res.createdAt ? new Date(res.createdAt).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}