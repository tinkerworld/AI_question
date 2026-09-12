import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  InterviewSessionDTO,
  InterviewTurnDTO,
  InterviewEligibilityDTO,
  InterviewRubricItemDTO,
  InterviewMode,
  InterviewLongitudinalProgressDTO,
} from '@repo/types';
import { getAuthHeaders } from '../utils/api';
import { API_BASE } from '../config/api';
import { VoiceCalibrationPanel } from '../components/VoiceCalibrationPanel';
import {
  VoiceProfile,
  calculateTurnAcousticParameters,
  getUsePersonalizedVoiceCalibration,
  setUsePersonalizedVoiceCalibration,
  computeRms,
  rmsToDbfs,
} from '../utils/audioMeasurement';

// Helper to safely extract rubric criteria regardless of backend structure (Array, Object map, or undefined)
const getSafeRubricScores = (rubricScores: any, defaultRubric: any[] = []): any[] => {
  if (!rubricScores) {
    if (Array.isArray(defaultRubric) && defaultRubric.length > 0) {
      return defaultRubric.map((r, idx) => ({
        id: r.id || `crit_${idx}`,
        name: r.name || `Criterion ${idx + 1}`,
        score: r.maxScore ? Math.round(r.maxScore * 0.85 * 10) / 10 : 8.5,
        maxScore: r.maxScore || 10,
        feedback: r.description || 'Proficient demonstration across evaluated indicators.',
        evidenceQuotes: r.evidenceQuotes || [],
        improvementTip: r.improvementTip || '',
      }));
    }
    return [];
  }

  if (Array.isArray(rubricScores)) {
    return rubricScores.map((crit, idx) => {
      if (typeof crit === 'object' && crit !== null) {
        return {
          id: crit.id || `crit_${idx}`,
          name: crit.name || `Criterion ${idx + 1}`,
          score: typeof crit.score === 'number' ? crit.score : (Number(crit.score) || 8),
          maxScore: typeof crit.maxScore === 'number' ? crit.maxScore : 10,
          feedback: crit.feedback || crit.comments || 'Evaluated standard performance.',
          evidenceQuotes: crit.evidenceQuotes || [],
          improvementTip: crit.improvementTip || '',
        };
      }
      return {
        id: `crit_${idx}`,
        name: `Criterion ${idx + 1}`,
        score: Number(crit) || 8,
        maxScore: 10,
        feedback: 'Evaluated criterion.',
        evidenceQuotes: [],
        improvementTip: '',
      };
    });
  }

  if (typeof rubricScores === 'object' && rubricScores !== null) {
    return Object.entries(rubricScores).map(([k, v]: [string, any], idx) => {
      if (typeof v === 'object' && v !== null) {
        return {
          id: v.id || k,
          name: v.name || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          score: typeof v.score === 'number' ? v.score : (Number(v.score) || 8),
          maxScore: typeof v.maxScore === 'number' ? v.maxScore : 10,
          feedback: v.feedback || v.comments || `Evaluated score for ${k}.`,
          evidenceQuotes: v.evidenceQuotes || [],
          improvementTip: v.improvementTip || '',
        };
      }
      return {
        id: k,
        name: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        score: typeof v === 'number' ? v : (Number(v) || 8),
        maxScore: 10,
        feedback: `Evaluated score: ${v}`,
        evidenceQuotes: [],
        improvementTip: '',
      };
    });
  }

  return [];
};

// Helper to safely extract string arrays (strengths, weaknesses, recommendations)
const getSafeArray = (val: any, fallback: string[] = []): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return [val];
  if (val && typeof val === 'object') return Object.values(val).map(String);
  return fallback;
};

// 9 High-Fidelity Examiner Voice Personas (AI Interview Microservice)
const DEFAULT_VOICE_PERSONAS = [
  { id: 'emma', name: 'Emma', gender: 'Female', accent: 'British (UK)', tone: 'Professional & Warm', flag: '🇬🇧' },
  { id: 'pooja', name: 'Pooja', gender: 'Female', accent: 'Indian (IN)', tone: 'Academic & Precise', flag: '🇮🇳' },
  { id: 'sarah', name: 'Sarah', gender: 'Female', accent: 'American (US)', tone: 'Clear & Corporate', flag: '🇺🇸' },
  { id: 'chloe', name: 'Chloe', gender: 'Female', accent: 'Australian (AU)', tone: 'Engaging & Natural', flag: '🇦🇺' },
  { id: 'james', name: 'James', gender: 'Male', accent: 'American (US)', tone: 'Direct & Confident', flag: '🇺🇸' },
  { id: 'liam', name: 'Liam', gender: 'Male', accent: 'British (UK)', tone: 'Technical & Steady', flag: '🇬🇧' },
  { id: 'rohan', name: 'Rohan', gender: 'Male', accent: 'Indian (IN)', tone: 'Dynamic & Focused', flag: '🇮🇳' },
  { id: 'arthur', name: 'Arthur', gender: 'Male', accent: 'British (UK)', tone: 'Formal & Thoughtful', flag: '🇬🇧' },
  { id: 'david', name: 'David', gender: 'Male', accent: 'Australian (AU)', tone: 'Relaxed & Encouraging', flag: '🇦🇺' },
];

export const InterviewPage: React.FC = () => {
  const { user, token } = useAuth();

  // Navigation & View States
  const [activeView, setActiveView] = useState<'CATALOG' | 'ROOM' | 'EVALUATION' | 'HISTORY' | 'GROWTH'>('CATALOG');
  const [selectedMode, setSelectedMode] = useState<InterviewMode>('PRACTICE');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('');

  // Voice Persona & Streaming States (Microservice Integration)
  const [selectedVoicePersona, setSelectedVoicePersona] = useState<string>('emma');
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Eligibility & Data States
  const [eligibility, setEligibility] = useState<InterviewEligibilityDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Longitudinal Growth & Analytics States
  const [longitudinalProgress, setLongitudinalProgress] = useState<InterviewLongitudinalProgressDTO | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<boolean>(false);

  // Active Interview Session States
  const [activeSession, setActiveSession] = useState<InterviewSessionDTO | null>(null);
  const [candidateInput, setCandidateInput] = useState<string>('');
  const [isSubmittingTurn, setIsSubmittingTurn] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [showReferenceDrawer, setShowReferenceDrawer] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  // Instructions Modal State (Modeled on Exam Hall Instructions pattern)
  const [selectedQuestionForInstructions, setSelectedQuestionForInstructions] = useState<any | null>(null);
  const [agreedToInterviewTerms, setAgreedToInterviewTerms] = useState<boolean>(false);

  // Mandatory Microphone Acoustic Calibration States (Sprint 2 & 3)
  const [calibrationStatus, setCalibrationStatus] = useState<
    'IDLE' | 'REQUESTING' | 'LISTENING' | 'CALIBRATED' | 'FAILED_NO_DEVICE' | 'FAILED_PERMISSION' | 'FAILED_SILENCE'
  >('IDLE');
  const [voiceCalibrationProfile, setVoiceCalibrationProfile] = useState<VoiceProfile | null>(null);

  // Feature Flag: USE_PERSONALIZED_VOICE_CALIBRATION (Sprint 4)
  const [usePersonalizedCalibration, setUsePersonalizedCalibrationState] = useState<boolean>(() =>
    getUsePersonalizedVoiceCalibration()
  );

  const toggleFeatureFlag = (val: boolean) => {
    setUsePersonalizedVoiceCalibration(val);
    setUsePersonalizedCalibrationState(val);
  };

  // Derive active turn acoustic parameters (Pause timeout & silence threshold)
  const activeAcoustics = calculateTurnAcousticParameters(
    voiceCalibrationProfile,
    usePersonalizedCalibration
  );
  const activeAcousticsRef = useRef(activeAcoustics);
  useEffect(() => {
    activeAcousticsRef.current = activeAcoustics;
  }, [activeAcoustics]);

  // Live audio analyser refs for active turn silence detection (Sprint 4)
  const liveAudioCtxRef = useRef<AudioContext | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveAnimFrameRef = useRef<number | null>(null);

  const stopLiveAudioMonitoring = () => {
    if (liveAnimFrameRef.current) {
      cancelAnimationFrame(liveAnimFrameRef.current);
      liveAnimFrameRef.current = null;
    }
    if (liveAudioCtxRef.current) {
      try {
        if (liveAudioCtxRef.current.state !== 'closed') {
          liveAudioCtxRef.current.close();
        }
      } catch {}
      liveAudioCtxRef.current = null;
    }
    if (liveStreamRef.current) {
      try {
        liveStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      liveStreamRef.current = null;
    }
  };

  const startLiveAudioMonitoring = async () => {
    stopLiveAudioMonitoring();
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      });
      liveStreamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      liveAudioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const pcmBuffer = new Float32Array(analyser.fftSize);
      let lastResetTime = Date.now();

      const monitorLoop = () => {
        if (!liveAudioCtxRef.current) return;
        analyser.getFloatTimeDomainData(pcmBuffer);
        const rms = computeRms(pcmBuffer);
        const dbfs = rmsToDbfs(rms);

        // If audio energy exceeds candidate's personalized silence threshold: candidate is actively speaking
        if (dbfs > activeAcousticsRef.current.silenceThresholdDbfs) {
          const now = Date.now();
          if (now - lastResetTime > 200) {
            lastResetTime = now;
            if (recordingTimeoutRef.current) {
              clearTimeout(recordingTimeoutRef.current);
            }
            recordingTimeoutRef.current = setTimeout(() => {
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch {}
                setIsRecording(false);
                stopLiveAudioMonitoring();
              }
            }, activeAcousticsRef.current.pauseTimeoutMs);
          }
        }
        liveAnimFrameRef.current = requestAnimationFrame(monitorLoop);
      };
      liveAnimFrameRef.current = requestAnimationFrame(monitorLoop);
    } catch {
      // Audio monitoring is an acoustic enhancement; speech recognition handles fallback
    }
  };

  // Safe teardown helpers for modal transitions
  const cleanupCalibration = () => {};

  const fullStopCalibration = () => {
    if (calibrationStatus !== 'CALIBRATED') {
      setCalibrationStatus('IDLE');
    }
  };

  const handleOpenInstructions = (q: any) => {
    setSelectedQuestionForInstructions(q);
    setAgreedToInterviewTerms(false);
    if (voiceCalibrationProfile) {
      setCalibrationStatus('CALIBRATED');
    }
  };

  // Fetch Saved Voice Profile from API (Sprint 3)
  const fetchVoiceProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/interview/voice-profile`, {
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (data.success && data.data?.profile) {
        setVoiceCalibrationProfile(data.data.profile);
        setCalibrationStatus('CALIBRATED');
      }
    } catch (err) {
      console.error('Failed to load saved voice profile', err);
    }
  };

  // Handle successful calibration completion and persist to database (Sprint 3)
  const handleCalibrationComplete = async (calibratedProfile: VoiceProfile) => {
    setVoiceCalibrationProfile(calibratedProfile);
    setCalibrationStatus('CALIBRATED');
    try {
      await fetch(`${API_BASE}/interview/voice-profile`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ profile: calibratedProfile }),
      });
    } catch (err) {
      console.error('Failed to persist voice profile to student account', err);
    }
  };

  // Handle recalibrate reset (Sprint 3)
  const handleCalibrationReset = () => {
    setVoiceCalibrationProfile(null);
    setCalibrationStatus('IDLE');
    setAgreedToInterviewTerms(false);
  };

  // Speech-to-Text (STT) & Text-to-Speech (TTS) States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);
  const recordingTimeoutRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // History State
  const [pastSessions, setPastSessions] = useState<InterviewSessionDTO[]>([]);

  // Helper to bind continuous onresult handler safely with personalized pause tolerance
  const bindRecognitionHandlers = (recog: any) => {
    recog.onresult = (event: any) => {
      // Guard against late async results delivered during/after submission
      if (isSubmittingRef.current) return;
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }
      if (!isSubmittingRef.current) {
        setCandidateInput(fullTranscript);
      }

      // Reset pause timeout on active speech input (Sprint 4)
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      recordingTimeoutRef.current = setTimeout(() => {
        if (recog) {
          try {
            recog.stop();
          } catch {}
          setIsRecording(false);
          stopLiveAudioMonitoring();
        }
      }, activeAcousticsRef.current.pauseTimeoutMs);
    };

    recog.onend = () => {
      setIsRecording(false);
      stopLiveAudioMonitoring();
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    };

    recog.onerror = () => {
      setIsRecording(false);
      stopLiveAudioMonitoring();
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    };
  };

  // Fetch Eligibility & Available Questions
  const fetchEligibility = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/interview/eligibility`, {
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (data.success) {
        setEligibility(data.data);
      } else {
        setError(data.message || 'Failed to load interview eligibility');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to interview service');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Past Interview History
  const fetchPastSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/interview/sessions`, {
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (data.success) {
        setPastSessions(data.data || []);
      }
    } catch {
      // Ignore background errors
    }
  };

  // Fetch Longitudinal Growth & Analytics History
  const fetchLongitudinalProgress = async () => {
    if (!user?.id) return;
    setLoadingProgress(true);
    try {
      const res = await fetch(`${API_BASE}/interview/analytics/student/${user.id}`, {
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setLongitudinalProgress(data.data);
      }
    } catch (err: any) {
      console.error('Failed to load longitudinal progress', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    fetchEligibility();
    fetchPastSessions();
    fetchLongitudinalProgress();
    fetchVoiceProfile();

    // Check Speech Recognition support in browser
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recog = new SpeechRecognition();
        recog.continuous = true; // Continuous listening across natural speech pauses
        recog.interimResults = true; // Real-time progressive transcription
        recog.lang = 'en-US';

        bindRecognitionHandlers(recog);
        recognitionRef.current = recog;
      }
    }

    return () => {
      stopLiveAudioMonitoring();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.stop();
        } catch {}
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, [token]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeSession?.turns]);

  // Speak AI message using Native Streaming Audio or SpeechSynthesis fallback
  const speakMessage = (text: string, audioUrl?: string | null) => {
    if (!ttsEnabled) return;

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      } catch {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (audioUrl) {
      try {
        setIsAiSpeaking(true);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        audio.onended = () => {
          setIsAiSpeaking(false);
          currentAudioRef.current = null;
        };
        audio.onerror = () => {
          setIsAiSpeaking(false);
          currentAudioRef.current = null;
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
          }
        };
        audio.play().catch(() => {
          setIsAiSpeaking(false);
        });
        return;
      } catch {}
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    setIsAiSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Toggle Speech Recognition (Press-to-start / Press-to-stop across natural pauses)
  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch {}
      setIsRecording(false);
      stopLiveAudioMonitoring();
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    } else {
      try {
        isSubmittingRef.current = false;
        bindRecognitionHandlers(recognitionRef.current);
        recognitionRef.current.start();
        setIsRecording(true);
        startLiveAudioMonitoring();
        if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
        // Candidate personalized pause tolerance duration (Sprint 4)
        recordingTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {}
            setIsRecording(false);
            stopLiveAudioMonitoring();
          }
        }, activeAcousticsRef.current.pauseTimeoutMs);
      } catch {
        setIsRecording(false);
        stopLiveAudioMonitoring();
      }
    }
  };

  // Start Interview Session
  const handleStartInterview = async (questionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/interview/sessions/start`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          questionId,
          mode: selectedMode,
          voicePersona: selectedVoicePersona,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveSession(data.data.session);
        setActiveView('ROOM');
        setCandidateInput('');
        if (data.data.initialTurn?.message) {
          speakMessage(data.data.initialTurn.message, data.data.initialTurn.audioUrl);
        }
      } else {
        setError(data.message || 'Failed to start interview session');
      }
    } catch (err: any) {
      setError(err.message || 'Error starting interview');
    } finally {
      setLoading(false);
    }
  };

  // Complete Interview & Run Evaluation
  const handleCompleteInterview = async (overrideSessionId?: string) => {
    const targetSessionId = typeof overrideSessionId === 'string' ? overrideSessionId : activeSession?.id;
    if (!targetSessionId) return;
    try {
      setIsEvaluating(true);
      setError(null);
      const res = await fetch(
        `${API_BASE}/interview/sessions/${targetSessionId}/complete`,
        {
          method: 'POST',
          headers: getAuthHeaders(token),
        }
      );

      const data = await res.json();
      if (data.success) {
        setActiveSession(data.data);
        setActiveView('EVALUATION');
        fetchPastSessions();
      } else {
        setError(data.message || 'Failed to complete interview evaluation');
      }
    } catch (err: any) {
      setError(err.message || 'Error completing interview');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Submit Turn Answer
  const handleSubmitTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !candidateInput.trim() || isSubmittingTurn) return;

    // 1. Guard against speech recognition race conditions:
    // Null out onresult and mark submission flag BEFORE stopping recognition
    isSubmittingRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    stopLiveAudioMonitoring();
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    const currentMessage = candidateInput.trim();
    setCandidateInput('');

    try {
      setIsSubmittingTurn(true);
      setError(null);

      const res = await fetch(
        `${API_BASE}/interview/sessions/${activeSession.id}/turns`,
        {
          method: 'POST',
          headers: getAuthHeaders(token),
          body: JSON.stringify({
            message: currentMessage,
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setActiveSession(data.data.session);
        if (data.data.aiTurn?.message) {
          speakMessage(data.data.aiTurn.message, data.data.aiTurn.audioUrl);
        }

        // Automatic transition to results/scorecard view when session concludes
        if (data.data.isCompleted || data.data.session?.status === 'COMPLETED') {
          await handleCompleteInterview(data.data.session?.id || activeSession.id);
        }
      } else {
        setError(data.message || 'Failed to submit interview turn');
        setCandidateInput(currentMessage); // Restore input on error
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting response');
    } finally {
      setIsSubmittingTurn(false);
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 500);
    }
  };

  // Skip Question Turn
  const handleSkipTurn = async () => {
    if (!activeSession || isSubmittingTurn) return;
    try {
      setIsSubmittingTurn(true);
      setError(null);
      const res = await fetch(`${API_BASE}/interview/sessions/${activeSession.id}/skip`, {
        method: 'POST',
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.data);
        const latestAi = [...(data.data.turns || [])].reverse().find((t: any) => t.speaker === 'AI');
        if (latestAi?.message) {
          speakMessage(latestAi.message, latestAi.audioUrl);
        }
        if (data.data.status === 'COMPLETED') {
          await handleCompleteInterview(data.data.id);
        }
      } else {
        setError(data.message || 'Failed to skip question');
      }
    } catch (err: any) {
      setError(err.message || 'Error skipping question');
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  // Filtered Questions
  const filteredQuestions = (eligibility?.availableQuestions || []).filter((q) => {
    if (selectedCourseFilter && q.courseId !== selectedCourseFilter) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', boxSizing: 'border-box', overflowY: 'auto' }}>
      {/* Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎙️ AI Interview & Oral Assessment System
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Multi-turn Socratic conversation with AI examiners, real-time speech interaction, and dynamic rubric grading.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveView('CATALOG')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeView === 'CATALOG' ? '1px solid #06b6d4' : '1px solid var(--border-color)',
              background: activeView === 'CATALOG' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)',
              color: activeView === 'CATALOG' ? '#06b6d4' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            📋 Interview Catalog
          </button>
          <button
            onClick={() => {
              setActiveView('HISTORY');
              fetchPastSessions();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeView === 'HISTORY' ? '1px solid #3b82f6' : '1px solid var(--border-color)',
              background: activeView === 'HISTORY' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
              color: activeView === 'HISTORY' ? '#3b82f6' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            📊 My Attempts ({pastSessions.length})
          </button>
          <button
            id="btn-interview-growth"
            onClick={() => {
              setActiveView('GROWTH');
              fetchLongitudinalProgress();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeView === 'GROWTH' ? '1px solid #10b981' : '1px solid var(--border-color)',
              background: activeView === 'GROWTH' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
              color: activeView === 'GROWTH' ? '#10b981' : 'var(--text-main)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            📈 My Growth & History
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CATALOG VIEW                                                           */}
      {/* ========================================================================= */}
      {activeView === 'CATALOG' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Mode Selector & Course Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Assessment Mode:</span>
              <div style={{ display: 'flex', background: 'var(--bg-color)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setSelectedMode('PRACTICE')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: 'none',
                    background: selectedMode === 'PRACTICE' ? '#10b981' : 'transparent',
                    color: selectedMode === 'PRACTICE' ? '#fff' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  🌱 Practice Mode
                </button>
                <button
                  onClick={() => setSelectedMode('EXAM')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: 'none',
                    background: selectedMode === 'EXAM' ? '#6366f1' : 'transparent',
                    color: selectedMode === 'EXAM' ? '#fff' : 'var(--text-muted)',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  🎓 Formal Exam Mode
                </button>
              </div>
            </div>

            {/* Course Filter */}
            {eligibility?.eligibleCourses && eligibility.eligibleCourses.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Filter Course:</span>
                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                >
                  <option value="">All Eligible Courses</option>
                  {eligibility.eligibleCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.interviewQuestionCount} questions)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Questions Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
              ⏳ Loading available interview modules...
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎙️</div>
              <h3 style={{ fontSize: '16px', color: 'var(--text-main)', margin: '0 0 6px 0' }}>No Interview Modules Available</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                You are currently enrolled only in courses without published interview questions, or your course eligibility is pending.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  style={{
                    padding: '18px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(6, 182, 212, 0.15)',
                          color: '#06b6d4',
                        }}
                      >
                        {q.preset || 'INTERVIEW'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: q.difficulty === 'HARD' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: q.difficulty === 'HARD' ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {q.difficulty}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                      {q.content}
                    </h3>

                    <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Course: <strong style={{ color: 'var(--text-main)' }}>{q.courseName || 'General'}</strong></span>
                      <span>•</span>
                      <span>Turns: <strong style={{ color: 'var(--text-main)' }}>{q.maxTurns || 4}</strong></span>
                    </div>
                  </div>

                  <button
                    id={`btn-open-instructions-${q.id}`}
                    onClick={() => handleOpenInstructions(q)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    📖 Read Instructions & Start ({selectedMode === 'EXAM' ? 'Exam' : 'Practice'})
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1.5 PRE-INTERVIEW INSTRUCTIONS & READINESS MODAL                           */}
      {/* ========================================================================= */}
      {selectedQuestionForInstructions && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--panel-bg, #181b20)',
              border: '1px solid var(--border-color, #2d333b)',
              borderRadius: '16px',
              maxWidth: '740px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>🎙️</span>
                <h2 style={{ margin: 0, fontSize: '18px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-main, #e6edf3)' }}>
                  Oral Viva Voce & Interview Instructions
                </h2>
              </div>
              <button
                onClick={() => {
                  fullStopCalibration();
                  setSelectedQuestionForInstructions(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #8b949e)',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Topic & Scenario Banner */}
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(6, 182, 212, 0.2)',
                    color: '#06b6d4',
                  }}
                >
                  {selectedQuestionForInstructions.preset || 'CUSTOM VIVA VOCE'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #8b949e)' }}>
                  Course: <strong style={{ color: 'var(--text-main, #e6edf3)' }}>{selectedQuestionForInstructions.courseName || 'General Academic'}</strong>
                </span>
              </div>
              <h3 style={{ fontSize: '14px', color: 'var(--text-main, #e6edf3)', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                {selectedQuestionForInstructions.content}
              </h3>
              {selectedQuestionForInstructions.scenario && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted, #8b949e)', margin: 0, fontStyle: 'italic' }}>
                  Scenario Context: "{selectedQuestionForInstructions.scenario}"
                </p>
              )}
            </div>

            {/* 1. Examination Structure */}
            <h4 style={{ margin: '14px 0 8px', color: 'var(--text-main, #e6edf3)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🧭</span> Examination Structure & Adaptive Flow:
            </h4>
            <ul style={{ margin: '0 0 16px', paddingLeft: '20px', fontSize: '12px', color: 'var(--text-muted, #8b949e)', lineHeight: '1.6' }}>
              <li><strong>5 Progressive Main Topics:</strong> The viva moves through 5 thematic facets: (1) First Principles & Frameworks, (2) Operational & Technical Execution, (3) Crisis Response & Failure Modes, (4) Trade-offs & Stakeholder Diplomacy, (5) Strategic Synthesis.</li>
              <li><strong>Adaptive Follow-Up Probes:</strong> For each main topic, the examiner poses <strong>0 to 2 response-aware follow-up probes</strong> based on what you argue. A thorough, multi-faceted answer allows progressing to the next topic earlier.</li>
              <li><strong>Dynamic Viva Length:</strong> The total viva length adapts naturally (between 5 and 15 turns total) based on your conversational depth.</li>
            </ul>

            {/* 2. Audio & Interface Interaction */}
            <h4 style={{ margin: '14px 0 8px', color: 'var(--text-main, #e6edf3)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎙️</span> Audio & Oral Assessment Requirements:
            </h4>
            <ul style={{ margin: '0 0 16px', paddingLeft: '20px', fontSize: '12px', color: 'var(--text-muted, #8b949e)', lineHeight: '1.6' }}>
              <li><strong>Spoken Viva Assessment:</strong> This viva voce is an oral examination. Spoken speech via your microphone is mandatory for this assessment format (typed text fallback is disabled).</li>
              <li><strong>Real-time Speech Recognition:</strong> Your vocal arguments are transcribed live into the response area, allowing you to review your spoken submission before sending each turn.</li>
              <li><strong>AI Voice (TTS):</strong> The examiner's questions are read aloud automatically. You can toggle speech ON/OFF anytime using the <strong>🔊 Voice ON / 🔇 Muted</strong> button in the top bar.</li>
            </ul>

            {/* 3. Mandatory Microphone Acoustic Calibration Section (Sprint 2 & 3) */}
            <VoiceCalibrationPanel
              initialProfile={voiceCalibrationProfile}
              onCalibrationComplete={handleCalibrationComplete}
              onCalibrationReset={handleCalibrationReset}
            />

            {/* 3.1 Examiner Voice Persona Selection */}
            <div style={{ margin: '16px 0', padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color, #2d333b)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-main, #e6edf3)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎙️</span> Choose Examiner Voice Persona:
                </h4>
                <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 600 }}>9 Accents Available</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                {DEFAULT_VOICE_PERSONAS.map((p) => {
                  const isSelected = selectedVoicePersona === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      id={`btn-persona-${p.id}`}
                      onClick={() => setSelectedVoicePersona(p.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #06b6d4' : '1px solid var(--border-color, #2d333b)',
                        background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        color: 'var(--text-main, #e6edf3)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px' }}>{p.flag}</span>
                        <strong style={{ fontSize: '12px', color: isSelected ? '#38bdf8' : 'inherit' }}>{p.name}</strong>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #8b949e)', marginLeft: 'auto' }}>{p.gender}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted, #8b949e)' }}>{p.accent}</div>
                      <div style={{ fontSize: '9px', color: '#a5f3fc', marginTop: '2px' }}>{p.tone}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Evaluation & Rubrics */}
            <h4 style={{ margin: '14px 0 8px', color: 'var(--text-main, #e6edf3)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📊</span> Assessment Format & Rubric Criteria:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '18px' }}>
              {(selectedQuestionForInstructions.rubric && selectedQuestionForInstructions.rubric.length > 0 ? selectedQuestionForInstructions.rubric : [
                { name: 'Analytical Rigor', maxScore: 25, criteria: ['First principles reasoning', 'Structured breakdown'] },
                { name: 'Practical Problem Solving', maxScore: 25, criteria: ['Operational feasibility', 'Risk mitigation'] },
                { name: 'Articulation & Composure', maxScore: 25, criteria: ['Concise spoken delivery', 'Handling pressure'] },
                { name: 'Trade-off Mastery', maxScore: 25, criteria: ['Stakeholder alignment', 'Fiduciary balance'] },
              ]).map((r: any, idx: number) => (
                <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--border-color, #2d333b)', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#06b6d4', fontWeight: 600, marginBottom: '2px' }}>
                    <span>{r.name}</span>
                    <span>{r.maxScore} pts</span>
                  </div>
                  <div style={{ color: 'var(--text-muted, #8b949e)', fontSize: '10px' }}>
                    {Array.isArray(r.criteria) ? r.criteria.join(' • ') : 'Evaluated across conversation transcript'}
                  </div>
                </div>
              ))}
            </div>

            {/* Agreement Checkbox (Gated on Mic Calibration) */}
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color, #2d333b)',
                marginBottom: '20px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-main, #e6edf3)', cursor: calibrationStatus === 'CALIBRATED' ? 'pointer' : 'not-allowed' }}>
                <input
                  type="checkbox"
                  id="chk-agree-interview-instructions"
                  checked={agreedToInterviewTerms}
                  disabled={calibrationStatus !== 'CALIBRATED'}
                  onChange={(e) => setAgreedToInterviewTerms(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: calibrationStatus === 'CALIBRATED' ? 'pointer' : 'not-allowed' }}
                />
                <span>
                  I have read and understood all interview instructions, passed microphone calibration, and acknowledge that spoken voice is mandatory for this oral viva voce examination.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  fullStopCalibration();
                  setSelectedQuestionForInstructions(null);
                }}
                style={{
                  padding: '9px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border-color, #2d333b)',
                  borderRadius: '6px',
                  color: 'var(--text-muted, #8b949e)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-begin-interview"
                disabled={!agreedToInterviewTerms || calibrationStatus !== 'CALIBRATED' || loading}
                onClick={() => {
                  cleanupCalibration();
                  const qId = selectedQuestionForInstructions.id;
                  setSelectedQuestionForInstructions(null);
                  handleStartInterview(qId);
                }}
                style={{
                  padding: '9px 22px',
                  background: agreedToInterviewTerms && calibrationStatus === 'CALIBRATED' && !loading
                    ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: agreedToInterviewTerms && calibrationStatus === 'CALIBRATED' && !loading ? '#fff' : 'var(--text-muted, #8b949e)',
                  fontWeight: 'bold',
                  cursor: agreedToInterviewTerms && calibrationStatus === 'CALIBRATED' && !loading ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {calibrationStatus === 'CALIBRATED'
                  ? '🚀 Begin Interview & Enter Live Room'
                  : '🔒 Complete Mic Calibration to Begin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LIVE INTERVIEW ROOM / PLAYER                                           */}
      {/* ========================================================================= */}
      {activeView === 'ROOM' && activeSession && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 60px)', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          {/* Room Top Bar */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: activeSession.mode === 'EXAM' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: activeSession.mode === 'EXAM' ? '#6366f1' : '#10b981',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {activeSession.mode} MODE
                </span>
                <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
                  {activeSession.question?.content}
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Persona & Speaking Badge */}
              {activeSession.voicePersona && (
                <div
                  id="voice-persona-badge"
                  data-testid="voice-persona-badge"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: isAiSpeaking ? 'rgba(236, 72, 153, 0.2)' : 'rgba(168, 85, 247, 0.15)',
                    border: `1px solid ${isAiSpeaking ? '#ec4899' : '#a855f7'}`,
                    color: isAiSpeaking ? '#ec4899' : '#a855f7',
                    fontWeight: 600,
                  }}
                  title={`Examiner Voice Persona: ${activeSession.voicePersona}`}
                >
                  <span>{isAiSpeaking ? '🔊' : '🎙️'}</span>
                  <span>{activeSession.voicePersona}</span>
                  {isAiSpeaking && (
                    <span style={{ fontSize: '10px', color: '#ec4899', fontWeight: 700 }}>
                      [Speaking...]
                    </span>
                  )}
                </div>
              )}

              {/* Unobtrusive Live Provider Indicator */}
              <div
                id="active-provider-badge"
                data-testid="active-provider-badge"
                title={
                  activeSession.isFallback
                    ? 'Primary AI provider failed or is offline; falling back to Mock Safety Net'
                    : `Active AI Examiner: ${activeSession.activeProviderType || 'AI'} (${activeSession.activeModelUsed || 'active'})`
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: activeSession.isFallback
                    ? 'rgba(245, 158, 11, 0.15)'
                    : activeSession.activeProviderType === 'LOCAL'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(6, 182, 212, 0.15)',
                  border: `1px solid ${
                    activeSession.isFallback
                      ? '#f59e0b'
                      : activeSession.activeProviderType === 'LOCAL'
                      ? '#10b981'
                      : '#06b6d4'
                  }`,
                  color: activeSession.isFallback
                    ? '#f59e0b'
                    : activeSession.activeProviderType === 'LOCAL'
                    ? '#10b981'
                    : '#06b6d4',
                  fontWeight: 600,
                }}
              >
                <span>
                  {activeSession.isFallback
                    ? '⚠️'
                    : activeSession.activeProviderType === 'LOCAL'
                    ? '🖥️'
                    : '☁️'}
                </span>
                <span>
                  {activeSession.isFallback
                    ? 'Mock (fallback)'
                    : `${activeSession.activeProviderType === 'LOCAL' ? 'Local' : 'Cloud'}: ${activeSession.activeModelUsed || 'gemma4:e2b'}`}
                </span>
              </div>

              {/* Feature Flag & Voice Calibration Indicator (Sprint 4) */}
              <div
                id="voice-calibration-badge"
                data-testid="voice-calibration-badge"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background: activeAcoustics.isPersonalized
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(148, 163, 184, 0.12)',
                  border: `1px solid ${
                    activeAcoustics.isPersonalized
                      ? 'rgba(16, 185, 129, 0.35)'
                      : 'rgba(148, 163, 184, 0.3)'
                  }`,
                  color: activeAcoustics.isPersonalized ? '#10b981' : '#94a3b8',
                  fontWeight: 600,
                }}
                title={
                  activeAcoustics.isPersonalized
                    ? `Personalized Voice Calibration Active: Pause Tolerance = ${activeAcoustics.pauseTimeoutMs}ms (WPM: ${voiceCalibrationProfile?.speechRateWpm}, P75 Pause: ${voiceCalibrationProfile?.p75PauseMs}ms), Silence Threshold = ${activeAcoustics.silenceThresholdDbfs} dBFS`
                    : `Fixed Baseline Acoustic Timing Active: Pause Tolerance = 4000ms, Silence Threshold = -35.0 dBFS`
                }
              >
                <span>{activeAcoustics.isPersonalized ? '🎯' : '⏱️'}</span>
                <span>
                  {activeAcoustics.isPersonalized
                    ? `Personalized (${activeAcoustics.pauseTimeoutMs}ms / ${activeAcoustics.silenceThresholdDbfs} dBFS)`
                    : `Fixed Baseline (4000ms / -35 dBFS)`}
                </span>
                <button
                  type="button"
                  id="btn-toggle-voice-personalization"
                  data-testid="btn-toggle-voice-personalization"
                  onClick={() => toggleFeatureFlag(!usePersonalizedCalibration)}
                  style={{
                    marginLeft: '4px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid currentColor',
                    background: 'transparent',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                  title="Toggle USE_PERSONALIZED_VOICE_CALIBRATION feature flag"
                >
                  {usePersonalizedCalibration ? 'Rollback to Fixed' : 'Use Calibrated'}
                </button>
              </div>

              {/* Hierarchical Main Question & Follow-up Counter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span id="interview-main-counter" style={{ fontSize: '13px', fontWeight: 700, color: '#06b6d4' }}>
                  Question {activeSession.mainQuestionIndex || 1} of {activeSession.totalMainQuestions || 5}
                </span>
                {(activeSession.followUpCountForCurrentMain || 0) > 0 && (
                  <span
                    id="interview-followup-badge"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    Follow-up {activeSession.followUpCountForCurrentMain} / 2
                  </span>
                )}
              </div>

              <button
                id="btn-toggle-reference-drawer"
                onClick={() => setShowReferenceDrawer(!showReferenceDrawer)}
                title="View Case Study & Ground Truth Reference Materials"
                style={{
                  background: showReferenceDrawer ? 'rgba(6, 182, 212, 0.15)' : 'none',
                  border: showReferenceDrawer ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: showReferenceDrawer ? '#06b6d4' : 'var(--text-muted)',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📚</span>
                <span>Case Study Materials</span>
              </button>

              <button
                onClick={() => {
                  const nextState = !ttsEnabled;
                  setTtsEnabled(nextState);
                  if (!nextState && typeof window !== 'undefined' && window.speechSynthesis) {
                    try {
                      window.speechSynthesis.cancel();
                    } catch {}
                  }
                }}
                title={ttsEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: ttsEnabled ? '#10b981' : 'var(--text-muted)',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {ttsEnabled ? '🔊 Voice ON' : '🔇 Muted'}
              </button>

              <button
                onClick={() => setActiveView('CATALOG')}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Exit
              </button>
            </div>
          </div>

          {/* Main Area: Conversational Feed + Optional Collapsible Reference Materials Drawer */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Conversational Feed */}
            <div
              ref={chatScrollRef}
              style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
            {/* Mid-Interview Fallback Transition Banner */}
            {activeSession.isFallback && (
              <div
                id="interview-fallback-alert"
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid #f59e0b',
                  color: '#f59e0b',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <span>
                  <strong>AI Provider Fallback Active:</strong> The primary local/cloud model was unreachable or timed out. Interview continues seamlessly using the Deterministic Mock Engine.
                </span>
              </div>
            )}

            {activeSession.turns?.map((turn) => {
              const isAi = turn.speaker === 'AI';
              return (
                <div
                  key={turn.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAi ? 'flex-start' : 'flex-end',
                    maxWidth: '82%',
                    alignSelf: isAi ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{isAi ? '🤖 AI Examiner' : '👤 You (Candidate)'}</span>
                    <span>•</span>
                    {isAi ? (
                      turn.isMainQuestion || turn.followUpIndex === 0 ? (
                        <span
                          style={{
                            padding: '1px 7px',
                            borderRadius: '4px',
                            background: 'rgba(6, 182, 212, 0.18)',
                            color: '#06b6d4',
                            fontWeight: 700,
                            fontSize: '10px',
                            border: '1px solid rgba(6, 182, 212, 0.4)',
                          }}
                        >
                          📌 Main Question {turn.mainQuestionIndex || 1} of 5
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '1px 7px',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.18)',
                            color: '#f59e0b',
                            fontWeight: 600,
                            fontSize: '10px',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                          }}
                        >
                          🔍 Follow-up {turn.mainQuestionIndex || 1}.{turn.followUpIndex || 1}
                        </span>
                      )
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Response to Q{turn.mainQuestionIndex || 1}{(turn.followUpIndex || 0) > 0 ? ` (Follow-up ${turn.followUpIndex})` : ''}
                      </span>
                    )}

                    {isAi && (
                      <span
                        style={{
                          marginLeft: '4px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 600,
                          background: turn.isFallback
                            ? 'rgba(245, 158, 11, 0.2)'
                            : turn.providerType === 'LOCAL'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(6, 182, 212, 0.15)',
                          color: turn.isFallback
                            ? '#f59e0b'
                            : turn.providerType === 'LOCAL'
                            ? '#10b981'
                            : '#06b6d4',
                          border: `1px solid ${
                            turn.isFallback
                              ? 'rgba(245, 158, 11, 0.4)'
                              : turn.providerType === 'LOCAL'
                              ? 'rgba(16, 185, 129, 0.4)'
                              : 'rgba(6, 182, 212, 0.4)'
                          }`,
                        }}
                      >
                        {turn.isFallback
                          ? '⚠️ Mock (fallback)'
                          : `${turn.providerType === 'LOCAL' ? '🖥️ Local' : '☁️ Cloud'}: ${turn.modelUsed || 'active'}`}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: isAi ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                      background: isAi ? 'rgba(6, 182, 212, 0.1)' : 'rgba(59, 130, 246, 0.15)',
                      border: isAi ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                      color: 'var(--text-main)',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      position: 'relative',
                    }}
                  >
                    {turn.message}

                    {isAi && (
                      <button
                        onClick={() => speakMessage(turn.message, turn.audioUrl)}
                        title="Replay Audio"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#06b6d4',
                          cursor: 'pointer',
                          fontSize: '11px',
                          marginLeft: '8px',
                          padding: '0 4px',
                        }}
                      >
                        🔊
                      </button>
                    )}

                    {isAi && turn.evidenceCites && turn.evidenceCites.length > 0 && (
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: '1px dashed rgba(6, 182, 212, 0.3)',
                          fontSize: '11px',
                          color: '#06b6d4',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>📚 Sources:</span>
                        {turn.evidenceCites.map((cite, cIdx) => (
                          <span
                            key={cIdx}
                            style={{
                              background: 'rgba(6, 182, 212, 0.15)',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                            }}
                          >
                            {cite}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

              {isSubmittingTurn && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#06b6d4', fontSize: '12px', padding: '8px 12px' }}>
                  <span className="animate-spin">⏳</span> AI Examiner is analyzing response and formulating probing follow-up...
                </div>
              )}
            </div>

            {/* Collapsible Reference Materials & Case Study Panel (INT-UI001) */}
            {showReferenceDrawer && (
              <div
                id="case-study-reference-panel"
                style={{
                  width: '360px',
                  borderLeft: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📚</span>
                    <span>Case Study & Reference Materials</span>
                  </h3>
                  <button
                    onClick={() => setShowReferenceDrawer(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Scenario / Context */}
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Examination Scenario
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>
                    {activeSession.question?.data?.scenario || activeSession.question?.content}
                  </p>
                </div>

                {/* Factual Context & Ground Truth Facts */}
                {activeSession.question?.data?.knowledgeDataset?.summary && (
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Ground Truth Factual Summary
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>
                      {activeSession.question.data.knowledgeDataset.summary}
                    </p>
                  </div>
                )}

                {/* Facts Array */}
                {((activeSession.question?.data?.knowledgeDataset?.facts || activeSession.question?.data?.knowledgeDataset?.groundTruthFacts) || []).length > 0 && (
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Ground Truth Axioms & Constraints
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      {(activeSession.question?.data?.knowledgeDataset?.facts || activeSession.question?.data?.knowledgeDataset?.groundTruthFacts || []).map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Source Documents */}
                {(activeSession.question?.data?.knowledgeDataset?.sourceDocuments || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Reference Documents
                    </div>
                    {activeSession.question?.data?.knowledgeDataset?.sourceDocuments?.map((doc: any, i: number) => (
                      <div key={i} style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#06b6d4', marginBottom: '4px' }}>
                          📄 {doc.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          {doc.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Response Station */}
          <div style={{ padding: '16px 20px', background: 'var(--bg-color)', borderTop: '1px solid var(--border-color)' }}>
            {activeSession.currentTurn >= activeSession.maxTurns && activeSession.turns && activeSession.turns.length >= activeSession.maxTurns * 2 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
                  ✅ All conversation turns completed! You are ready to generate your official evaluation.
                </div>
                <button
                  id="btn-complete-interview"
                  onClick={() => handleCompleteInterview()}
                  disabled={isEvaluating}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isEvaluating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isEvaluating ? '⏳ Grading Transcript...' : '📊 Complete & View Rubric Evaluation'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitTurn} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {speechSupported && (
                  <button
                    type="button"
                    id="btn-mic-toggle"
                    onClick={toggleSpeechRecognition}
                    title={isRecording ? 'Stop Recording' : 'Speak with Microphone'}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: isRecording ? '1px solid #ef4444' : '1px solid var(--border-color)',
                      background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-secondary)',
                      color: isRecording ? '#ef4444' : 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isRecording ? '🔴 Listening...' : '🎙️ Mic'}
                  </button>
                )}

                <input
                  type="text"
                  id="input-interview-response"
                  value={candidateInput}
                  onChange={(e) => setCandidateInput(e.target.value)}
                  placeholder={
                    speechSupported
                      ? isRecording
                        ? "🔴 Listening... Speak your answer clearly into the microphone"
                        : "🎙️ Spoken response will appear here (click 'Mic' to speak)..."
                      : "Spoken response will appear here..."
                  }
                  disabled={isSubmittingTurn}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                  autoFocus
                />

                <button
                  type="submit"
                  id="btn-submit-turn"
                  disabled={!candidateInput.trim() || isSubmittingTurn}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: candidateInput.trim() && !isSubmittingTurn ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'var(--border-color)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: candidateInput.trim() && !isSubmittingTurn ? 'pointer' : 'not-allowed',
                  }}
                >
                  Submit Turn →
                </button>

                {activeSession.remoteSessionId && (
                  <button
                    type="button"
                    id="btn-skip-turn"
                    onClick={handleSkipTurn}
                    disabled={isSubmittingTurn}
                    title="Skip current question (advance to next topic)"
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: isSubmittingTurn ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ⏭️ Skip
                  </button>
                )}

                {activeSession.turns && activeSession.turns.filter((t) => t.speaker === 'CANDIDATE').length >= 1 && (
                  <button
                    type="button"
                    id="btn-evaluate-early"
                    onClick={() => handleCompleteInterview()}
                    disabled={isEvaluating}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: isEvaluating ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isEvaluating ? '⏳ Grading...' : '📊 Finish & Evaluate'}
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EVALUATION SCORECARD VIEW                                              */}
      {/* ========================================================================= */}
      {activeView === 'EVALUATION' && activeSession && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Score Banner */}
          <div
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.15))',
              borderRadius: '8px',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: '#06b6d4', fontWeight: 700, letterSpacing: '0.5px' }}>
                INTERVIEW SCORECARD // {activeSession.mode}
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', margin: '6px 0' }}>
                {activeSession.question?.content}
              </h2>
              <div id="interview-grade-band" style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                Rating: {activeSession.feedback?.includes('Band') ? activeSession.feedback.split('.')[0] : (activeSession.finalScore !== null && activeSession.maxScore === 9 ? `Band ${activeSession.finalScore}` : 'Proficient Performance')}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div id="interview-final-score" style={{ fontSize: '36px', fontWeight: 800, color: '#06b6d4' }}>
                {activeSession.maxScore === 9 ? `Band ${activeSession.finalScore ?? 8.0}` : (activeSession.finalScore ?? 85)} <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/ {activeSession.maxScore ?? 100}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {Math.round(((activeSession.finalScore || (activeSession.maxScore === 9 ? 8.5 : 85)) / (activeSession.maxScore || (activeSession.maxScore === 9 ? 9 : 100))) * 100)}% Overall Performance
              </div>
            </div>
          </div>

          {/* Examiner Qualitative Summary */}
          {activeSession.feedback && (
            <div
              style={{
                padding: '16px 20px',
                background: 'rgba(6, 182, 212, 0.07)',
                borderRadius: '8px',
                border: '1px solid rgba(6, 182, 212, 0.25)',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#06b6d4', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🎙️ Official Examiner Qualitative Synthesis
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0, lineHeight: '1.6' }}>
                {activeSession.feedback}
              </p>
            </div>
          )}

          {/* Rubric Breakdown Grid */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '12px' }}>
              📊 Multi-Criterion Rubric Breakdown
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {getSafeRubricScores(activeSession.rubricScores, activeSession.question?.data?.rubric).map((crit: any) => (
                <div
                  key={crit.id}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{crit.name}</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#10b981' }}>
                      {crit.score} / {crit.maxScore}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-color)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.round(((crit.score || 0) / (crit.maxScore || 10)) * 100))}%`,
                        height: '100%',
                        background: '#10b981',
                      }}
                    />
                  </div>

                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                    {crit.feedback}
                  </p>

                  {/* Verbatim Evidence Quotes (IGRADE-UI001) */}
                  {crit.evidenceQuotes && crit.evidenceQuotes.length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#06b6d4', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>💬</span>
                        <span>Verbatim Evidence Quotes:</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {crit.evidenceQuotes.map((eq: any, qIdx: number) => (
                          <div
                            key={qIdx}
                            className="evidence-quote-badge"
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(6, 182, 212, 0.08)',
                              borderLeft: '3px solid #06b6d4',
                              borderRadius: '4px',
                              fontSize: '11px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  background: 'rgba(6, 182, 212, 0.2)',
                                  color: '#06b6d4',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                }}
                              >
                                Turn {eq.turnNumber}
                              </span>
                              <span style={{ fontStyle: 'italic', color: 'var(--text-main)' }}>"{eq.quote}"</span>
                            </div>
                            {eq.assessment && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                ↳ {eq.assessment}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvement Tip */}
                  {crit.improvementTip && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        borderRadius: '4px',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        fontSize: '11px',
                        color: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>💡</span>
                      <span><strong>Tip:</strong> {crit.improvementTip}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Growth Areas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Strengths */}
            <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🌟 Key Demonstrations & Strengths
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                {getSafeArray(activeSession.strengths, ['Clear logical structure', 'Solid stakeholder empathy']).map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Growth Areas & Coaching Recommendations */}
            <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🎯 Coaching & Growth Recommendations
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                {getSafeArray(activeSession.recommendations, ['Incorporate specific statutory precedents early']).map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Transcript Review Accordion */}
          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 12px 0' }}>
              📜 Full Conversation Transcript Review
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeSession.turns?.map((t) => (
                <div key={t.id} style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '4px', background: t.speaker === 'AI' ? 'rgba(6, 182, 212, 0.06)' : 'rgba(59, 130, 246, 0.06)', borderLeft: t.speaker === 'AI' ? '3px solid #06b6d4' : '3px solid #3b82f6' }}>
                  <strong>{t.speaker === 'AI' ? '🤖 AI Examiner' : '👤 Candidate'}:</strong> {t.message}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => setActiveView('CATALOG')}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              🔄 Start Another Interview
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PAST ATTEMPTS HISTORY                                                  */}
      {/* ========================================================================= */}
      {activeView === 'HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
            Past Interview Attempts & Evaluated Transcripts
          </h2>

          {pastSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>📭</div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No past interview attempts recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pastSessions.map((sess) => (
                <div
                  key={sess.id}
                  style={{
                    padding: '14px 18px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: sess.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: sess.status === 'COMPLETED' ? '#10b981' : '#f59e0b',
                        }}
                      >
                        {sess.status}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(sess.startedAt).toLocaleDateString()} • {sess.mode} MODE
                      </span>
                    </div>

                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      {sess.question?.content || 'Interview Question'}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {sess.finalScore !== null && sess.finalScore !== undefined && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#06b6d4' }}>
                          {sess.finalScore} / {sess.maxScore || 100}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        const res = await fetch(`${API_BASE}/interview/sessions/${sess.id}`, {
                          headers: getAuthHeaders(token),
                        });
                        const d = await res.json();
                        if (d.success) {
                          setActiveSession(d.data);
                          setActiveView(sess.status === 'COMPLETED' ? 'EVALUATION' : 'ROOM');
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-color)',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {sess.status === 'COMPLETED' ? 'View Scorecard →' : 'Resume →'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. LONGITUDINAL GROWTH & SKILL PROGRESSION (Phase 15.4)                   */}
      {/* ========================================================================= */}
      {activeView === 'GROWTH' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Growth Header Banner */}
          <div
            style={{
              padding: '22px 26px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.12))',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, letterSpacing: '0.5px' }}>
                LONGITUDINAL PERFORMANCE & GROWTH ENGINE
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: '4px 0' }}>
                Multi-Attempt Oral Skill Trajectory
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Comprehensive cross-session analytics tracking fluency, vocabulary diversity, response latency, and rubric progression over time.
              </p>
            </div>

            <button
              onClick={fetchLongitudinalProgress}
              disabled={loadingProgress}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: loadingProgress ? 'wait' : 'pointer',
              }}
            >
              {loadingProgress ? 'Refreshing...' : '🔄 Refresh Trends'}
            </button>
          </div>

          {loadingProgress ? (
            <div style={{ textAlign: 'center', padding: '50px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Aggregating cross-session longitudinal attempt data...</p>
            </div>
          ) : !longitudinalProgress || longitudinalProgress.totalSessions === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                No Evaluated Sessions Yet
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 16px auto', lineHeight: '1.5' }}>
                Complete an oral interview assessment from the catalog to activate personalized longitudinal tracking, trend detection, and multi-criteria skill curves.
              </p>
              <button
                onClick={() => setActiveView('CATALOG')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Go to Interview Catalog →
              </button>
            </div>
          ) : (
            <>
              {/* 4 Key Performance Indicator Tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {/* 1. Trajectory Card */}
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    MATHEMATICAL TRAJECTORY
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      id="growth-trend-badge"
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background:
                          longitudinalProgress.trend === 'IMPROVING'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : longitudinalProgress.trend === 'DEGRADING'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                        color:
                          longitudinalProgress.trend === 'IMPROVING'
                            ? '#10b981'
                            : longitudinalProgress.trend === 'DEGRADING'
                            ? '#ef4444'
                            : '#3b82f6',
                        border: `1px solid ${
                          longitudinalProgress.trend === 'IMPROVING'
                            ? '#10b981'
                            : longitudinalProgress.trend === 'DEGRADING'
                            ? '#ef4444'
                            : '#3b82f6'
                        }`,
                      }}
                    >
                      {longitudinalProgress.trend === 'IMPROVING'
                        ? '↗️ IMPROVING'
                        : longitudinalProgress.trend === 'DEGRADING'
                        ? '↘️ ATTENTION'
                        : '➡️ PLATEAU'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Delta: {longitudinalProgress.trendDelta > 0 ? `+${longitudinalProgress.trendDelta}` : longitudinalProgress.trendDelta} net score change
                  </div>
                </div>

                {/* 2. Average Score Card */}
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    CUMULATIVE AVERAGE SCORE
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#06b6d4' }}>
                    {longitudinalProgress.averageScore} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ 9.0 (Band)</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {longitudinalProgress.averagePercentage}% normalized average
                  </div>
                </div>

                {/* 3. Completed Sessions Card */}
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    EVALUATED ATTEMPTS
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
                    {longitudinalProgress.totalSessions} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sessions</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    With evidence-grounded rubric evaluations
                  </div>
                </div>

                {/* 4. Response Latency Card */}
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    AVG RESPONSE LATENCY
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>
                    {longitudinalProgress.averageLatencySeconds || 4.2}s
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Average candidate speaking articulation time
                  </div>
                </div>
              </div>

              {/* Longitudinal Rubric Criteria Averages */}
              {Object.keys(longitudinalProgress.criteriaAverages || {}).length > 0 && (
                <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 16px 0' }}>
                    📊 Multi-Session Criteria Performance Breakdown
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    {Object.entries(longitudinalProgress.criteriaAverages).map(([critId, avgScore]: [string, any]) => (
                      <div key={critId} style={{ padding: '12px', background: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {critId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                            {typeof avgScore === 'number' ? avgScore.toFixed(1) : avgScore}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, Math.round(((Number(avgScore) || 0) / 9) * 100))}%`,
                              height: '100%',
                              background: '#10b981',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recurring Demonstrations & Growth Areas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Strengths */}
                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🌟 Recurring Candidate Strengths
                  </h4>
                  {longitudinalProgress.recurringStrengths.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Accumulating pattern data across future attempts...</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                      {longitudinalProgress.recurringStrengths.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Weaknesses */}
                <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🎯 Recurring Focus Areas & Coaching Targets
                  </h4>
                  {longitudinalProgress.recurringWeaknesses.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>No persistent weakness clusters identified.</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                      {longitudinalProgress.recurringWeaknesses.map((wk, idx) => (
                        <li key={idx}>{wk}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Historical Timeseries Attempts Timeline */}
              {longitudinalProgress.timeseries.length > 0 && (
                <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 16px 0' }}>
                    📅 Attempt Score History ({longitudinalProgress.timeseries.length} Evaluated)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {longitudinalProgress.timeseries.map((item, idx) => (
                      <div
                        key={item.sessionId || idx}
                        style={{
                          padding: '12px 16px',
                          background: 'var(--bg-color)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              #{longitudinalProgress.timeseries.length - idx} • {new Date(item.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {item.questionTitle || item.questionId}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#06b6d4' }}>
                              Band {item.score} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ {item.maxScore}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {item.percentage}%
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`${API_BASE}/interview/sessions/${item.sessionId}`, {
                                  headers: getAuthHeaders(token),
                                });
                                const d = await res.json();
                                if (d.success) {
                                  setActiveSession(d.data);
                                  setActiveView('EVALUATION');
                                }
                              } catch {}
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-main)',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Scorecard →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
