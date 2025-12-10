import React, { useState, useEffect, useRef } from 'react';
import { SessionConfig } from '../types';
import { VirtualAudience } from './VirtualAudience';
import { Mic, Square, Video, VideoOff, Loader2, Plus, SkipForward, X } from 'lucide-react';

interface Props {
  config: SessionConfig;
  onFinish: (blob: Blob, duration: number) => void;
  onBack: () => void;
}

export const Stage: React.FC<Props> = ({ config, onFinish, onBack }) => {
  // Prep Phase State
  const [isPrep, setIsPrep] = useState(config.prepTimeSeconds > 0);
  const [prepTimeLeft, setPrepTimeLeft] = useState(config.prepTimeSeconds);

  // Recording Phase State
  const [timeLeft, setTimeLeft] = useState(config.durationSeconds);
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [volume, setVolume] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // --- Prep Timer ---
  useEffect(() => {
    let interval: any;
    if (isPrep && prepTimeLeft > 0) {
      interval = setInterval(() => {
        setPrepTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPrep && prepTimeLeft === 0) {
      setIsPrep(false); // Prep finished, start stage
    }
    return () => clearInterval(interval);
  }, [isPrep, prepTimeLeft]);

  const skipPrep = () => setIsPrep(false);

  // --- Recording Timer ---
  useEffect(() => {
    let interval: any;
    // Only count down if NOT in prep mode and IS recording
    if (!isPrep && isRecording && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, timeLeft, isPrep]);

  // Auto-stop logic
  useEffect(() => {
    if (!isPrep && timeLeft === 0 && isRecording) {
      stopRecording();
    }
  }, [timeLeft, isRecording, isPrep]);


  // --- Media Setup ---
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      ''
    ];
    for (const type of types) {
      if (type === '' || MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  useEffect(() => {
    let isMounted = true;

    const setupStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        
        // --- Setup Audio Analysis for Volume Meter & Gain ---
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        
        // Gain Node to boost volume
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 3.0; // Boost by 300%
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        // Destination for recorder
        const destination = audioContext.createMediaStreamDestination();

        // Connect graph: Source -> Gain -> Analyser -> Destination
        source.connect(gainNode);
        gainNode.connect(analyser);
        gainNode.connect(destination);

        const updateVolume = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for(let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setVolume(Math.min(100, average * 2.5)); 
          
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();

        // --- Setup Recorder with Boosted Audio ---
        // Combine video track from original stream with boosted audio track
        const combinedTracks = [
            ...destination.stream.getAudioTracks()
        ];
        
        const audioStream = new MediaStream(combinedTracks);
        const mimeType = getSupportedMimeType();
        const options = mimeType ? { mimeType } : undefined;
        
        const recorder = new MediaRecorder(audioStream, options);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onerror = (e) => {
          console.error("MediaRecorder error:", e);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
          const duration = (Date.now() - startTimeRef.current) / 1000;
          const finalDuration = duration > 0 ? duration : config.durationSeconds - timeLeft;
          
          // Force stop all tracks to ensure camera light goes off
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }

          onFinish(blob, finalDuration);
        };

        mediaRecorderRef.current = recorder;
        setIsReady(true);

      } catch (err) {
        console.error("Error accessing media devices:", err);
        if (isMounted) {
          alert("Microphone and Camera permissions are required.");
        }
      }
    };

    setupStream();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure video element gets the stream when it's ready or when phase changes
  useEffect(() => {
    if (videoRef.current && streamRef.current && streamRef.current.active) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isReady, isPrep]);

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraOn;
        setCameraOn(!cameraOn);
      }
    }
  };

  const startRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "inactive") return;
    
    chunksRef.current = [];
    startTimeRef.current = Date.now();
    
    try {
      mediaRecorderRef.current.start(1000); 
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Could not start recording. Please refresh and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const addTime = () => {
    setTimeLeft((prev) => prev + 15);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 10) return 'text-red-500 animate-pulse';
    if (timeLeft <= 30) return 'text-yellow-400';
    return 'text-green-400';
  };

  // --- Render Prep Overlay ---
  if (isPrep) {
    return (
      <div className="flex flex-col h-screen w-full bg-slate-900 items-center justify-center relative overflow-hidden">
        {/* Background Blur of audience */}
        <div className="absolute inset-0 opacity-20 blur-md pointer-events-none">
           <VirtualAudience />
        </div>
        
        <div className="z-10 bg-slate-800/80 backdrop-blur-xl p-10 rounded-3xl border border-slate-700 shadow-2xl flex flex-col items-center max-w-2xl text-center relative">
          <button 
            onClick={onBack}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
            title="Cancel Session"
          >
            <X size={24} />
          </button>

          <h2 className="text-3xl font-bold text-white mb-6">Preparation Time</h2>
          
          <div className="text-8xl font-mono font-bold text-blue-400 mb-8">
            {formatTime(prepTimeLeft)}
          </div>

          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 w-full mb-8">
            <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-2">Topic</p>
            <p className="text-xl md:text-2xl text-white font-medium">"{config.topic}"</p>
          </div>

          <button 
            onClick={skipPrep}
            className="px-8 py-4 bg-white text-slate-900 font-bold rounded-full text-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            I'm Ready <SkipForward size={20} />
          </button>
        </div>
      </div>
    );
  }

  // --- Render Main Stage ---
  return (
    <div className="flex flex-col h-screen w-full bg-black relative overflow-hidden">
      
      {/* Top Bar */}
      <div className="w-full bg-slate-900/80 border-b border-slate-700 p-4 flex justify-between items-center z-20 backdrop-blur-md">
        <div className="flex items-center gap-4 flex-1">
           <div className="bg-black/40 px-4 py-2 rounded-lg border border-white/10 max-w-[70%]">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Topic</p>
              <p className="text-white text-sm font-medium leading-relaxed">{config.topic}</p>
           </div>
        </div>
        <div className={`text-3xl font-mono font-bold ${getTimerColor()} bg-black/60 px-4 py-1 rounded-lg border border-white/10`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 overflow-hidden p-2 md:p-4 bg-slate-900">
         <VirtualAudience 
           userVideo={
             <div className="relative w-full h-full bg-slate-800 flex items-center justify-center overflow-hidden">
                {!isReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                )}
                
                {/* User Video Element */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className={`min-w-full min-h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${!cameraOn ? 'opacity-0' : 'opacity-100'}`}
                />
                
                {!cameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500 bg-slate-900">
                    <VideoOff size={32} />
                  </div>
                )}

                {/* Microphone / Volume Indicator Overlay */}
                <div className="absolute bottom-2 right-2 flex items-center justify-center">
                    <div 
                      className={`p-2 rounded-full bg-blue-600/80 text-white backdrop-blur transition-all duration-75`}
                      style={{ 
                        transform: `scale(${1 + (volume / 200)})`,
                        opacity: 0.5 + (volume / 200)
                      }}
                    >
                      <Mic size={16} />
                    </div>
                </div>

                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] md:text-xs px-2 py-1 rounded flex items-center gap-2 z-20">
                  <span className="font-medium">You (Speaker)</span>
                </div>
             </div>
           } 
         />
      </div>

      {/* Bottom Controls */}
      <div className="w-full bg-slate-900/90 backdrop-blur-md p-6 border-t border-slate-700 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-4 md:gap-10">
           {/* Camera Toggle */}
           <button 
             onClick={toggleCamera}
             className="p-4 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-600"
             title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
           >
             {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
           </button>

           {/* Record / Stop Button */}
           {!isRecording ? (
             <button
               onClick={startRecording}
               disabled={!isReady}
               className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 border-4 shadow-xl ${
                 isReady 
                 ? 'bg-red-600 hover:bg-red-500 border-slate-800 ring-4 ring-red-900/30 hover:scale-105 cursor-pointer' 
                 : 'bg-slate-700 border-slate-600 cursor-not-allowed opacity-50'
               }`}
             >
               {isReady ? <Mic size={32} className="text-white" /> : <Loader2 size={32} className="text-slate-400 animate-spin" />}
             </button>
           ) : (
             <button
               onClick={stopRecording}
               className="w-20 h-20 rounded-full bg-slate-800 hover:bg-slate-700 border-4 border-red-500/50 flex items-center justify-center transition-all hover:scale-105 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]"
               title="Finish & Analyze"
             >
               <Square size={32} className="text-red-500 fill-current" />
             </button>
           )}

           {/* Add Time Button */}
           <button
             onClick={addTime}
             disabled={!isRecording}
             className={`p-4 rounded-full border flex items-center justify-center gap-1 font-bold transition-all ${
               isRecording
                 ? 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white shadow-lg hover:shadow-blue-500/30 active:scale-95'
                 : 'bg-slate-800 border-slate-700 text-slate-500 opacity-50 cursor-not-allowed'
             }`}
             title="Add 15 seconds"
           >
              <Plus size={18} />
              <span className="text-sm">15s</span>
           </button>
        </div>
        
        <div className="text-center mt-4">
             <div className="text-sm text-slate-400 font-medium">
               {!isReady ? "Initializing Studio..." : isRecording ? "On Air - Recording..." : "Ready to Start"}
             </div>
        </div>
      </div>
    </div>
  );
};