class DictationStateMachine {
  constructor(lessonData, onStateChangeCallback) {
    this.lesson = lessonData;
    this.items = lessonData.items;
    this.onStateChange = onStateChangeCallback || (() => {});
    this.currentIndex = 0;            
    this.attemptsThisSentence = 0;    
    this.firstAttemptCorrectCount = 0; 
    this.totalAttemptsCount = 0;      
    this.currentStreak = 0;           
    this.maxStreak = 0;               
    this.isCurrentCorrect = false;    
    this.feedbackTier = 0; 
    this.currentInputValue = "";
    this.mistakeBatch = [];
    this.audioReplaysCount = 1;       
  }

  sanitizeText(rawString) {
    return rawString.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").replace(/\s+/g, " ");
  }

  registerAudioPlay() {
    this.audioReplaysCount += 1;
    this.onStateChange(this.getStateSnapshot());
  }

  submitAttempt(rawUserInput) {
    if (this.isCurrentCorrect || !rawUserInput) {
      return { isCorrect: false, error: "Empty or completed item" };
    }

    const currentItem = this.items[this.currentIndex];
    this.currentInputValue = rawUserInput.trim();
    this.attemptsThisSentence += 1;
    this.totalAttemptsCount += 1;

    const sanitizedUser = this.sanitizeText(this.currentInputValue);
    const sanitizedTarget = this.sanitizeText(currentItem.gapText);

    if (sanitizedUser === sanitizedTarget) {
      this.isCurrentCorrect = true;
      if (this.attemptsThisSentence === 1) {
        this.firstAttemptCorrectCount += 1;
        this.currentStreak += 1;
        if (this.currentStreak > this.maxStreak) this.maxStreak = this.currentStreak;
      } else {
        this.currentStreak = 0;
      }

      if (this.attemptsThisSentence > 1) {
        const mistakeEntry = this.mistakeBatch.find(m => m.sentenceId === currentItem.id);
        if (mistakeEntry) {
          mistakeEntry.resolved = true;
          mistakeEntry.userAttempts.push(this.currentInputValue);
        }
      }
      this.onStateChange(this.getStateSnapshot());
      return { isCorrect: true, feedbackTier: this.feedbackTier };
    } else {
      this.isCurrentCorrect = false;
      this.currentStreak = 0; 
      this.feedbackTier = Math.min(this.feedbackTier + 1, 4);

      let mistakeEntry = this.mistakeBatch.find(m => m.sentenceId === currentItem.id);
      if (!mistakeEntry) {
        mistakeEntry = {
          sentenceId: currentItem.id,
          originalSentence: currentItem.sentence,
          targetGap: currentItem.gapText,
          userAttempts: [this.currentInputValue],
          hintsNeeded: this.feedbackTier,
          resolved: false
        };
        this.mistakeBatch.push(mistakeEntry);
      } else {
        mistakeEntry.userAttempts.push(this.currentInputValue);
        mistakeEntry.hintsNeeded = Math.max(mistakeEntry.hintsNeeded, this.feedbackTier);
      }
      this.onStateChange(this.getStateSnapshot());
      return { isCorrect: false, feedbackTier: this.feedbackTier };
    }
  }

  nextExercise() {
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex += 1;
      this.attemptsThisSentence = 0;
      this.isCurrentCorrect = false;
      this.feedbackTier = 0;
      this.currentInputValue = "";
      this.onStateChange(this.getStateSnapshot());
      return true;
    }
    this.onStateChange(this.getStateSnapshot());
    return false;
  }

  getStateSnapshot() {
    const totalSentencesCount = this.items.length;
    const computedPercentage = totalSentencesCount > 0 ? Math.round((this.firstAttemptCorrectCount / totalSentencesCount) * 100) : 0;
    return {
      lessonId: this.lesson.id,
      lessonTitle: this.lesson.title,
      difficulty: this.lesson.difficulty,
      currentIndex: this.currentIndex,
      attemptsThisSentence: this.attemptsThisSentence,
      feedbackTier: this.feedbackTier,
      isCurrentCorrect: this.isCurrentCorrect,
      audioReplaysCount: this.audioReplaysCount,
      statsBatch: {
        totalSentences: totalSentencesCount,
        correctFirstTry: this.firstAttemptCorrectCount,
        totalAttemptsCount: this.totalAttemptsCount,
        accuracyScore: computedPercentage + "%",
        longestStreak: this.maxStreak,
        mistakeLogs: this.mistakeBatch
      }
    };
  }
}

// THAY LINK URL WEB APP CỦA BẠN VÀO ĐÂY:
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwiYcaPrvUeAb0-IIc79x3q8kBTtvELx-2BiWE2VKjPMlUOmNaJbc58KPTNm7-73zyY/exec';

// Danh sách tài khoản giả lập trên hệ thống (Cung cấp cho học sinh & admin)
const userDatabase = [
    { email: "admin@dictation.edu.vn", name: "Teacher Admin", role: "Teacher" },
    { email: "student01@sample.edu.vn", name: "Nguyễn Văn A", role: "Student" },
    { email: "student02@sample.edu.vn", name: "Trần Thị B", role: "Student" }
];

// Kho lưu trữ bài học (Sẽ tăng lên khi Admin dùng tính năng upload)
let globalLessons = [
    {
        id: "lesson-1",
        title: "Essential Workplace Communication",
        difficulty: "Easy",
        items: [
            { id: "item-1-1", sentence: "It is crucial to reply to emails promptly.", gapText: "reply", vietnameseMeaning: "trả lời", tooltip: "To 'reply' means to write back. We say 'reply to'." },
            { id: "item-1-2", sentence: "We need to schedule a meeting for tomorrow.", gapText: "schedule", vietnameseMeaning: "lên lịch", tooltip: "Schedule can be a noun or a verb." }
        ]
    }
];

let appState;
let currentUser = null;