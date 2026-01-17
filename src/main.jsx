import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { UserPlus, CheckCircle, Loader2, Thermometer, Fingerprint } from 'lucide-react';

/**
 * FIXED: Consolidating App logic into main.jsx to resolve path resolution errors 
 * in the current environment while maintaining all functionality.
 */

// Use the global environment configuration for Firebase
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'homeo-shared-v1';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [formData, setFormData] = useState({ name: '', dob: '', gender: '', symptoms: '' });

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const generateLoginId = (name, dob) => {
    if (!name || !dob) return '';
    const prefix = name.trim().substring(0, 3).toUpperCase();
    const dateParts = dob.split('-'); 
    return `${prefix}${dateParts[2]}${dateParts[1]}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const submissionTime = new Date().toISOString();
    const loginId = generateLoginId(formData.name, formData.dob);
    
    try {
      const patientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'patients');
      await addDoc(patientsRef, {
        ...formData,
        loginId,
        caseNo: submissionTime,
        status: 'pending',
        timestamp: submissionTime
      });
      setSubmitted({ loginId, caseNo: submissionTime });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-emerald-100">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Registration Complete</h2>
          <div className="my-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-left">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Login ID</p>
              <p className="text-xl font-mono font-bold text-emerald-700">{submitted.loginId}</p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Case Number</p>
              <p className="text-[10px] font-mono text-slate-500 break-all">{submitted.caseNo}</p>
            </div>
          </div>
          <button onClick={() => setSubmitted(null)} className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">New Report</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 sm:p-8 font-sans">
      <header className="mb-8 text-center">
        <div className="bg-emerald-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Thermometer className="text-white w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Homeo Intake</h1>
      </header>

      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <input required placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
            <div className="grid grid-cols-2 gap-4">
              <input type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
              <select required value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            {formData.name.length >= 3 && formData.dob && (
              <div className="bg-emerald-50 p-3 rounded-xl flex items-center gap-3">
                <Fingerprint className="text-emerald-600 w-5 h-5" />
                <span className="text-sm font-mono font-bold text-emerald-800">{generateLoginId(formData.name, formData.dob)}</span>
              </div>
            )}
            <textarea rows="4" required value={formData.symptoms} onChange={e => setFormData({...formData, symptoms: e.target.value})} placeholder="Describe symptoms..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
          </div>
          <button disabled={loading || !user} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <UserPlus className="w-5 h-5" />} Submit Case
          </button>
        </form>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
