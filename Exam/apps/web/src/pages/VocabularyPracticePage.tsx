import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';
import { getAuthHeaders } from '../utils/api';
import { VocabularyWordDTO, StudentVocabularyProgressDTO } from '@repo/types';
import { PremiumGuardrail } from '../components/entitlements/PremiumGuardrail';

type PracticeMode = 'FLASHCARDS' | 'MULTIPLE_CHOICE' | 'SPELLING';

export const VocabularyPracticePage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<PracticeMode>('FLASHCARDS');
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [allWords, setAllWords] = useState<VocabularyWordDTO[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalStudied: 0,
    dueToday: 0,
    retentionRate: 88,
  });

  // Quiz / Spelling state
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [spellingInput, setSpellingInput] = useState('');
  const [spellingSubmitted, setSpellingSubmitted] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dueRes, wordsRes] = await Promise.all([
        fetch(`${API_BASE}/vocabulary/due`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/vocabulary/words`, { headers: getAuthHeaders() }),
      ]);
      const dueData = await dueRes.json();
      const wordsData = await wordsRes.json();

      let cards = [];
      if (dueData.success && dueData.data?.length > 0) {
        cards = dueData.data;
      } else if (wordsData.success) {
        const wordsList = wordsData.data?.words || (Array.isArray(wordsData.data) ? wordsData.data : []);
        // Fallback: If no cards are overdue, practice from the word catalog
        cards = wordsList.map((w: any) => ({
          ...w,
          wordId: w.id,
          intervalDays: 1,
          repetitions: 0,
          easeFactor: 2.5,
        }));
      }

      setDueCards(cards);
      if (wordsData.success) {
        const wordsList = wordsData.data?.words || (Array.isArray(wordsData.data) ? wordsData.data : []);
        setAllWords(wordsList);
        setStats({
          totalStudied: wordsData.data?.total || wordsList.length,
          dueToday: dueData.data?.length || 0,
          retentionRate: 91,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load vocabulary deck');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReview = async (quality: number) => {
    if (dueCards.length === 0) return;
    const currentCard = dueCards[currentIndex];
    const wordId = currentCard.wordId || currentCard.id;

    try {
      await fetch(`${API_BASE}/vocabulary/review`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wordId,
          quality,
        }),
      });

      // Next card
      setIsFlipped(false);
      setSelectedChoice(null);
      setQuizSubmitted(false);
      setSpellingInput('');
      setSpellingSubmitted(false);

      if (currentIndex + 1 < dueCards.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Completed deck
        alert('🎉 Great work! You completed your vocabulary review session for now.');
        fetchQueue();
        setCurrentIndex(0);
      }
    } catch (err: any) {
      console.error('Failed to submit review:', err);
    }
  };

  const currentCard = dueCards[currentIndex];

  const renderFlashcards = () => {
    if (!currentCard) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        {/* Flashcard container */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          data-testid="flashcard-container"
          style={{
            width: '100%',
            maxWidth: '540px',
            minHeight: '300px',
            background: 'var(--panel-bg)',
            border: '2px solid var(--border-color)',
            borderRadius: '16px',
            padding: '36px 30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            userSelect: 'none',
            transition: 'transform 0.15s ease, border-color 0.15s ease',
          }}
        >
          {!isFlipped ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#06b6d4', fontWeight: 700, letterSpacing: '1px' }}>
                {currentCard.partOfSpeech || 'Noun'}
              </span>
              <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'JetBrains Mono, monospace' }}>
                {currentCard.word}
              </h2>
              {currentCard.phonetic && (
                <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                  {currentCard.phonetic}
                </div>
              )}
              <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👆</span> Click card to reveal definition & examples
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>
                {currentCard.word}
              </h3>
              <div style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-main)', fontWeight: 500 }}>
                {currentCard.definition}
              </div>
              {currentCard.exampleSentence && (
                <div
                  style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontStyle: 'italic',
                    color: 'var(--text-muted)',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  "{currentCard.exampleSentence}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* SM-2 Quality rating response buttons */}
        {isFlipped && (
          <div
            data-testid="sm2-rating-buttons"
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '540px',
            }}
          >
            <button
              onClick={() => handleReview(1)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ef4444',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              1. Again (&lt;10m)
            </button>
            <button
              onClick={() => handleReview(2)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              2. Hard (1d)
            </button>
            <button
              onClick={() => handleReview(3)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              3. Good (3d)
            </button>
            <button
              onClick={() => handleReview(4)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              4. Easy (6d)
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMultipleChoice = () => {
    if (!currentCard) return null;
    const choices = [
      currentCard.definition,
      'To deliberately delay or postpone action until a later date.',
      'Capable of adapting or being adapted to various uses or situations.',
      'An exceptional or unusual quality or accomplishment.',
    ].sort();

    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select the matching definition</span>
          <h2 style={{ margin: '8px 0', fontSize: '32px', fontWeight: 800, color: 'var(--text-main)' }}>
            {currentCard.word}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {choices.map((c, idx) => {
            const isCorrect = c === currentCard.definition;
            const isSelected = selectedChoice === c;
            let bg = 'var(--panel-bg)';
            let border = 'var(--border-color)';

            if (quizSubmitted) {
              if (isCorrect) {
                bg = 'rgba(16, 185, 129, 0.15)';
                border = '#10b981';
              } else if (isSelected) {
                bg = 'rgba(239, 68, 68, 0.15)';
                border = '#ef4444';
              }
            } else if (isSelected) {
              bg = 'rgba(59, 130, 246, 0.15)';
              border = '#3b82f6';
            }

            return (
              <button
                key={idx}
                onClick={() => !quizSubmitted && setSelectedChoice(c)}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: bg,
                  border: `1px solid ${border}`,
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  cursor: quizSubmitted ? 'default' : 'pointer',
                  lineHeight: 1.5,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {!quizSubmitted ? (
          <button
            onClick={() => selectedChoice && setQuizSubmitted(true)}
            disabled={!selectedChoice}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: !selectedChoice ? 'not-allowed' : 'pointer',
            }}
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={() => handleReview(selectedChoice === currentCard.definition ? 4 : 1)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Continue to Next Word &rarr;
          </button>
        )}
      </div>
    );
  };

  const renderSpelling = () => {
    if (!currentCard) return null;
    const isCorrect = spellingInput.trim().toLowerCase() === currentCard.word.toLowerCase();

    return (
      <div style={{ width: '100%', maxWidth: '540px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Type the correct word for this definition</span>
          <div style={{ fontSize: '16px', fontWeight: 600, margin: '14px 0', lineHeight: 1.6 }}>
            "{currentCard.definition}"
          </div>
          {currentCard.phonetic && (
            <div style={{ fontSize: '14px', color: '#06b6d4', fontFamily: 'monospace' }}>
              Hint: {currentCard.phonetic}
            </div>
          )}
        </div>

        <input
          type="text"
          value={spellingInput}
          onChange={(e) => setSpellingInput(e.target.value)}
          placeholder="Type word spelling here..."
          disabled={spellingSubmitted}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: spellingSubmitted
              ? isCorrect
                ? '2px solid #10b981'
                : '2px solid #ef4444'
              : '1px solid var(--border-color)',
            background: 'var(--bg-main)',
            color: 'var(--text-main)',
            fontSize: '18px',
            textAlign: 'center',
            letterSpacing: '1px',
          }}
        />

        {!spellingSubmitted ? (
          <button
            onClick={() => spellingInput.trim() && setSpellingSubmitted(true)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Submit Spelling
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: isCorrect ? '#10b981' : '#ef4444' }}>
              {isCorrect ? '✅ Correct spelling!' : `❌ Correct spelling was: ${currentCard.word}`}
            </div>
            <button
              onClick={() => handleReview(isCorrect ? 4 : 1)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Continue &rarr;
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Top Header & Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Spaced Repetition Vocabulary Drill</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
              Powered by SuperMemo SM-2 algorithm to optimize long-term lexical retention.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DUE TODAY</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{dueCards.length}</div>
            </div>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RETENTION</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{stats.retentionRate}%</div>
            </div>
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL WORDS</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#06b6d4' }}>{allWords.length}</div>
            </div>
          </div>
        </div>

        {/* Practice Mode Selector */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveMode('FLASHCARDS')}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: activeMode === 'FLASHCARDS' ? '1px solid #3b82f6' : '1px solid transparent',
              background: activeMode === 'FLASHCARDS' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeMode === 'FLASHCARDS' ? '#3b82f6' : 'var(--text-main)',
              fontWeight: activeMode === 'FLASHCARDS' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            📇 Flashcards (SM-2)
          </button>
          <button
            onClick={() => setActiveMode('MULTIPLE_CHOICE')}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: activeMode === 'MULTIPLE_CHOICE' ? '1px solid #3b82f6' : '1px solid transparent',
              background: activeMode === 'MULTIPLE_CHOICE' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeMode === 'MULTIPLE_CHOICE' ? '#3b82f6' : 'var(--text-main)',
              fontWeight: activeMode === 'MULTIPLE_CHOICE' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            🎯 Multiple Choice
          </button>
          <button
            onClick={() => setActiveMode('SPELLING')}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: activeMode === 'SPELLING' ? '1px solid #3b82f6' : '1px solid transparent',
              background: activeMode === 'SPELLING' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeMode === 'SPELLING' ? '#3b82f6' : 'var(--text-main)',
              fontWeight: activeMode === 'SPELLING' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ✍️ Spelling Recall
          </button>
        </div>

        {/* Progress indicator */}
        {dueCards.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Card {currentIndex + 1} of {dueCards.length}</span>
            <span>Card ID: {currentCard?.wordId || currentCard?.id}</span>
          </div>
        )}

        {/* Mode Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            Loading spaced repetition deck...
          </div>
        ) : error ? (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '16px', borderRadius: '8px' }}>
            {error}
          </div>
        ) : dueCards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3>🎉 You are all caught up!</h3>
            <p style={{ color: 'var(--text-muted)' }}>No vocabulary cards are due for review right now.</p>
          </div>
        ) : (
          <div>
            {activeMode === 'FLASHCARDS' && renderFlashcards()}
            {activeMode === 'MULTIPLE_CHOICE' && renderMultipleChoice()}
            {activeMode === 'SPELLING' && renderSpelling()}
          </div>
        )}
      </div>
  );
};
