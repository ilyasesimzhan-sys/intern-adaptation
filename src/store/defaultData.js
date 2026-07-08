function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function makeDefaultTrainers() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: uid(),
    name: i === 0 ? 'Тренер 1' : `Тренер ${i + 1}`,
    login: i === 0 ? 'trainer1' : `trainer${i + 1}`,
    password: i === 0 ? 'password1' : '',
  }))
}

export const DEFAULT_PROGRAM_RULES = `Правила адаптационной программы:

1. Программа рассчитана на стажёров, впервые устраивающихся в компанию.
2. Анкету заполняет руководитель стажёра до окончания срока сбора.
3. После закрытия сбора участники автоматически и равномерно делятся на учебные группы.
4. В течение обучения тренер отмечает посещаемость и статус домашних заданий по каждому занятию.
5. Программа завершается итоговым экзаменом.`

export const DEFAULT_EXAM_RULES = `Правила итогового экзамена:

- Экзамен состоит из 10 вопросов.
- Порог сдачи — 9 правильных ответов из 10 (90%).
- Результат вносится тренером по каждому стажёру отдельно.
- Статус "Сдан" присваивается автоматически при достижении порога.`

export function makeDefaultData() {
  return {
    settings: {
      programName: 'Адаптационная программа стажёров',
      collectionStart: '',
      collectionEnd: '',
      collectionOpen: false,
      groupsFormed: false,
      numGroups: 2,
      examOpen: false,
      programRules: DEFAULT_PROGRAM_RULES,
      examRules: DEFAULT_EXAM_RULES,
      lessons: [],
    },
    trainers: makeDefaultTrainers(),
    interns: [],
  }
}

export { uid }
