
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Camera, History, Power, AlertTriangle, CloudDownload, RefreshCw, Download, FileDown } from 'lucide-react';
import { detectFaceInFrame } from './services/geminiService';
import { updateAlarmStatus, logThreatToFirebase, getThreatsFromFirebase } from './services/firebaseService';
import { downloadImageWithTimestamp } from './services/imageUtils';
import { buzzer } from './components/Buzzer';
import { CapturedThreat } from './types';

const App: React.FC = () => {
  const [isSecurityOn, setIsSecurityOn] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [threats, setThreats] = useState<CapturedThreat[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize Camera
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };

    startWebcam();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Handle Alarm Side Effects
  useEffect(() => {
    if (isAlarmActive) {
      buzzer.start();
      updateAlarmStatus(true);
    } else {
      buzzer.stop();
      updateAlarmStatus(false);
    }
  }, [isAlarmActive]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.6); 
  }, []);

  // Sync from Firebase
  const syncFromFirebase = async () => {
    setIsSyncing(true);
    const cloudThreats = await getThreatsFromFirebase();
    setThreats(cloudThreats);
    setIsSyncing(false);
  };

  const handleDownloadAll = async () => {
    for (const threat of threats) {
      await downloadImageWithTimestamp(threat.image, threat.timestamp, `sentinel_threat_${threat.id}`);
      // Small delay between downloads to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  // Detection Loop
  useEffect(() => {
    let intervalId: number;

    if (isSecurityOn && !isAlarmActive) {
      intervalId = window.setInterval(async () => {
        const now = Date.now();
        if (now - lastCheckTime > 3000) {
          setIsProcessing(true);
          const frame = captureFrame();
          if (frame) {
            const faceDetected = await detectFaceInFrame(frame);
            if (faceDetected) {
              setIsAlarmActive(true);
              const newThreat: CapturedThreat = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toLocaleTimeString(),
                image: frame,
              };
              setThreats(prev => [newThreat, ...prev]);
              await logThreatToFirebase(frame);
            }
          }
          setIsProcessing(false);
          setLastCheckTime(now);
        }
      }, 1000);
    }

    return () => clearInterval(intervalId);
  }, [isSecurityOn, isAlarmActive, lastCheckTime, captureFrame]);

  const toggleSecurity = () => {
    setIsSecurityOn(!isSecurityOn);
    if (isSecurityOn) {
      setIsAlarmActive(false);
    }
  };

  const resetAlarm = () => {
    setIsAlarmActive(false);
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-500 ${isAlarmActive ? 'alarm-active' : ''}`}>
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Shield size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sentinel AI</h1>
            <p className="text-slate-400 text-sm">Cloud-Linked Security Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isSecurityOn ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            {isSecurityOn ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            <span className="font-medium text-sm">{isSecurityOn ? 'SYSTEM ARMED' : 'SYSTEM DISARMED'}</span>
          </div>
          
          <button 
            onClick={toggleSecurity}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all shadow-lg ${isSecurityOn ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}
          >
            <Power size={18} />
            {isSecurityOn ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl group">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover grayscale-[0.3] brightness-[0.8]"
            />
            
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-md border border-white/10 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isSecurityOn ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                  <span className="text-xs font-mono uppercase tracking-widest">Live Feed</span>
                </div>
                <div className="text-xs font-mono text-white/50">
                   Cam ID: #RT-992
                </div>
              </div>
              
              <div className="flex justify-center">
                {isProcessing && (
                  <div className="bg-indigo-600/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-xl border border-indigo-400/30">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-sm font-medium">AI Analyzing...</span>
                  </div>
                )}
                {isAlarmActive && (
                  <div className="bg-rose-600 px-6 py-3 rounded-xl flex flex-col items-center gap-2 shadow-2xl animate-bounce pointer-events-auto">
                    <AlertTriangle size={32} className="text-white" />
                    <span className="text-lg font-black uppercase tracking-tighter">Intruder Detected!</span>
                    <button 
                      onClick={resetAlarm}
                      className="mt-2 bg-white text-rose-600 px-4 py-1 rounded-md text-xs font-bold hover:bg-slate-100"
                    >
                      SILENCE ALARM
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/20" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/20" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/20" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/20" />
          </div>

          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <History size={20} className="text-indigo-400" />
              System Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Database Connection</p>
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> 
                  Connected to Realtime DB
                </p>
              </div>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">AI Model</p>
                <p className="text-sm text-indigo-400 flex items-center gap-2">
                  Gemini Flash Vision 3.0
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Gallery */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 h-full max-h-[calc(100vh-200px)] flex flex-col">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-900 pb-2 z-10">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Camera size={20} className="text-indigo-400" />
                Capture Log
              </h3>
              <div className="flex gap-2">
                {threats.length > 0 && (
                  <button 
                    onClick={handleDownloadAll}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition-colors"
                    title="Download All Local"
                  >
                    <FileDown size={18} />
                  </button>
                )}
                <button 
                  onClick={syncFromFirebase}
                  disabled={isSyncing}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors disabled:opacity-50"
                  title="Sync from Cloud"
                >
                  {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <CloudDownload size={18} />}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {threats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                  <Shield size={48} className="opacity-10 mb-4" />
                  <p className="text-sm italic">No data synced.<br/>Click the cloud icon to load logs.</p>
                </div>
              ) : (
                threats.map((threat) => (
                  <div key={threat.id} className="group relative rounded-2xl overflow-hidden border border-slate-800 hover:border-rose-500/50 transition-all">
                    <img src={threat.image} alt="Intruder" className="w-full aspect-square object-cover" />
                    
                    {/* Hover Overlay for Download */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <button 
                        onClick={() => downloadImageWithTimestamp(threat.image, threat.timestamp, `threat_${threat.id}`)}
                        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white pointer-events-auto hover:bg-white/40 transition-colors"
                        title="Download with timestamp"
                      >
                        <Download size={24} />
                      </button>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 p-3 bg-black/70 backdrop-blur-md flex justify-between items-center transform translate-y-1 group-hover:translate-y-0 transition-transform">
                      <span className="text-[10px] font-mono font-bold tracking-tighter text-rose-400">ALERT LOGGED</span>
                      <span className="text-[10px] font-mono text-white/70">{threat.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <canvas ref={canvasRef} className="hidden" />

      <footer className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-900 flex justify-between items-center text-slate-500 text-xs uppercase tracking-widest">
        <span>Sentinel v2.6.0</span>
        <span className="flex items-center gap-2">
           Cloud: <span className="text-emerald-500">Live</span>
        </span>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
};

export default App;
