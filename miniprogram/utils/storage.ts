const KEYS = {
  ANSWERS: 'bn_answers',
  PERSONA_ID: 'bn_persona_id',
  COMPLETED: 'bn_completed',
};

export function saveAnswers(personaId: string, answers: Record<string, any>) {
  uni.setStorageSync(KEYS.PERSONA_ID, personaId);
  uni.setStorageSync(KEYS.ANSWERS, JSON.stringify(answers));
}

export function loadAnswers(): { personaId: string; answers: Record<string, any> } | null {
  const personaId = uni.getStorageSync(KEYS.PERSONA_ID);
  const raw = uni.getStorageSync(KEYS.ANSWERS);
  if (personaId && raw) {
    return { personaId, answers: JSON.parse(raw) };
  }
  return null;
}

export function clearAnswers() {
  uni.removeStorageSync(KEYS.PERSONA_ID);
  uni.removeStorageSync(KEYS.ANSWERS);
}

export function getCompletedSet(): Set<string> {
  const raw = uni.getStorageSync(KEYS.COMPLETED) || '[]';
  return new Set(JSON.parse(raw));
}

export function toggleCompleted(procedureId: string): boolean {
  const set = getCompletedSet();
  if (set.has(procedureId)) {
    set.delete(procedureId);
  } else {
    set.add(procedureId);
  }
  uni.setStorageSync(KEYS.COMPLETED, JSON.stringify([...set]));
  return set.has(procedureId);
}
