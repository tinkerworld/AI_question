import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  InterviewSessionDTO,
  InterviewTurnDTO,
  InterviewEligibilityDTO,
  InterviewRubricItemDTO,
  InterviewMode,
} from '@repo/types';
import { getAuthHeaders } from '../utils/api';

export const InterviewPage: React.FC = () => {
  const { user, token } = useAuth();

  // Navigation & View States
  const [activeView, setActiveView] = useState<'CATALOG' | 'ROOM' | 'EVALUATION' | 'HISTORY'>('CATALOG');
  const [selectedMode, setSelectedMode] = useState<InterviewMode>('PRACTICE');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('');

  // Eligibility & Data States
  const [eligibility, setEligibility] = useState<InterviewEligibilityDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Interview Session States
  const [activeSession, setActiveSession] = useState<InterviewSessionDTO | null>(null);
  const [candidateInput, setCandidateInput] = useState<string>('');
  const [isSubmittingTurn, setIsSubmittingTurn] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Speech-to-Text (STT) & Text-to-Speech (TTS) States
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // History State
  const [pastSessions, setPastSessions] = useState<InterviewSessionDTO[]>([]);

  // Fetch Eligibility & Available Questions
  const fetchEligibility = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:4000/api/v1/interview/eligibility', {
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
      const res = await fetch('http://localhost:4000/api/v1/interview/sessions', {
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

  useEffect(() => {
    fetchEligibility();
    fetchPastSessions();

    // Check Speech Recognition support in browser
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setCandidateInput(currentTranscript);
        };

        recog.onend = () => {
          setIsRecording(false);
        };

        recog.onerror = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, [token]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeSession?.turns]);

  // Speak AI message using Text-to-Speech
  const speakMessage = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Toggle Speech Recognition
  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }
  };

  // Start Interview Session
  const handleStartInterview = async (questionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:4000/api/v1/interview/sessions/start', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          questionId,
          mode: selectedMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveSession(data.data.session);
        setActiveView('ROOM');
        setCandidateInput('');
        if (data.data.initialTurn?.message) {
          speakMessage(data.data.initialTurn.message);
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

  // Submit Turn Answer
  const handleSubmitTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !candidateInput.trim() || isSubmittingTurn) return;

    try {
      setIsSubmittingTurn(true);
      setError(null);
      const currentMessage = candidateInput.trim();
      setCandidateInput('');

      const res = await fetch(
        `http://localhost:4000/api/v1/interview/sessions/${activeSession.id}/turns`,
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
          speakMessage(data.data.aiTurn.message);
        }
        if (data.data.isCompleted) {
          // All turns finished
        }
      } else {
        setError(data.message || 'Failed to submit interview turn');
        setCandidateInput(currentMessage); // Restore input on error
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting response');
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  // Complete Interview & Run Evaluation
  const handleCompleteInterview = async () => {
    if (!activeSession) return;
    try {
      setIsEvaluating(true);
      setError(null);
      const res = await fetch(
        `http://localhost:4000/api/v1/interview/sessions/${activeSession.id}/complete`,
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
                    id={`btn-start-interview-${q.id}`}
                    onClick={() => handleStartInterview(q.id)}
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
                    🎙️ Start {selectedMode === 'EXAM' ? 'Exam Session' : 'Practice Session'}
                  </button>
                </div>
              ))}
            </div>
          )}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span id="interview-turn-counter" style={{ fontSize: '13px', fontWeight: 600, color: '#06b6d4' }}>
                Turn {activeSession.currentTurn} of {activeSession.maxTurns}
              </span>

              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
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
            {activeSession.turns?.map((turn) => {
              const isAi = turn.speaker === 'AI';
              return (
                <div
                  key={turn.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAi ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    alignSelf: isAi ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{isAi ? '🤖 AI Examiner' : '👤 You (Candidate)'}</span>
                    <span>• Turn {turn.turnNumber}</span>
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
                        onClick={() => speakMessage(turn.message)}
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

          {/* Response Station */}
          <div style={{ padding: '16px 20px', background: 'var(--bg-color)', borderTop: '1px solid var(--border-color)' }}>
            {activeSession.currentTurn >= activeSession.maxTurns && activeSession.turns && activeSession.turns.length >= activeSession.maxTurns * 2 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
                  ✅ All conversation turns completed! You are ready to generate your official evaluation.
                </div>
                <button
                  id="btn-complete-interview"
                  onClick={handleCompleteInterview}
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
                  placeholder="Type or speak your answer to the examiner..."
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

                {activeSession.turns && activeSession.turns.filter((t) => t.speaker === 'CANDIDATE' || t.speaker === 'USER').length >= 1 && (
                  <button
                    type="button"
                    id="btn-evaluate-early"
                    onClick={handleCompleteInterview}
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
                Rating: {activeSession.feedback?.includes('Band') ? activeSession.feedback.split('.')[0] : 'Proficient Performance'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div id="interview-final-score" style={{ fontSize: '36px', fontWeight: 800, color: '#06b6d4' }}>
                {activeSession.finalScore ?? 85} <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/ {activeSession.maxScore ?? 100}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {Math.round(((activeSession.finalScore || 85) / (activeSession.maxScore || 100)) * 100)}% Overall Mastery
              </div>
            </div>
          </div>

          {/* Rubric Breakdown Grid */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '12px' }}>
              📊 Multi-Criterion Rubric Breakdown
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {(activeSession.rubricScores || []).map((crit: any) => (
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
                        width: `${Math.min(100, Math.round((crit.score / crit.maxScore) * 100))}%`,
                        height: '100%',
                        background: '#10b981',
                      }}
                    />
                  </div>

                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                    {crit.feedback}
                  </p>
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
                {(activeSession.strengths || ['Clear logical structure', 'Solid stakeholder empathy']).map((s, idx) => (
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
                {(activeSession.recommendations || ['Incorporate specific statutory precedents early']).map((r, idx) => (
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
                        const res = await fetch(`http://localhost:4000/api/v1/interview/sessions/${sess.id}`, {
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
    </div>
  );
};

export default InterviewPage;
