import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/StoreContext.jsx'
import { activeVisibleGroups, isTrainerAdmin } from '../../lib/roles'
import {
  EXAM_QUESTION_COUNT,
  emptyExamAnswers,
  getExamAnswers,
  getRetakeAnswers,
  getExamQuestions,
  getRetakeQuestions,
  getQuestionBank,
  drawExamQuestions,
  drawRetakeQuestions,
  examStarted,
  examCorrectCount,
  examPercent,
  getInternExamStatus,
  isInternResolved,
  getWeakTopics,
  hasExamNotice,
} from '../../lib/exam'
import { downloadGroupReport } from '../../lib/examReport'
import { filterInternsBySearch } from '../../lib/internSearch'
import ExamAnswerList from '../../components/ExamAnswerList.jsx'
import { readQuestionsFromFile } from '../../lib/questionBankFile'

function nextAnswerState(value) {
  if (value === null || value === undefined) return true
  if (value === true) return false
  return null
}

export default function ExamTab() {
  const { data, update, currentTrainer } = useStore()
  const { settings, interns: allInterns, trainers } = data
  const [endingId, setEndingId] = useState(null)
  const [endComment, setEndComment] = useState('')
  const [trainingId, setTrainingId] = useState(null)
  const [trainingComment, setTrainingComment] = useState('')
  const [searchByGroup, setSearchByGroup] = useState({})
  const [archivingId, setArchivingId] = useState(null)
  const admin = isTrainerAdmin(currentTrainer)
  const bank = getQuestionBank(settings)
  const [bankMessage, setBankMessage] = useState(null)
  const [showBank, setShowBank] = useState(false)

  async function uploadBank(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const questions = await readQuestionsFromFile(file)
      if (questions.length === 0) {
        setBankMessage({ error: true, text: 'В файле не найдено ни одного вопроса — вопросы должны быть в первом столбце.' })
        return
      }
      patchSettings({ examQuestionBank: questions })
      setBankMessage({ error: false, text: `Загружено вопросов: ${questions.length} (из файла «${file.name}»).` })
    } catch {
      setBankMessage({ error: true, text: 'Не удалось прочитать файл. Загрузите файл Excel (.xlsx).' })
    }
  }

  function assignQuestions(internId) {
    patchInternField(internId, 'examQuestions', drawExamQuestions(bank))
  }

  function patchRetakeQuestion(internId, questionIdx, text) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => {
        if (i.id !== internId) return i
        const nextQuestions = getRetakeQuestions(i).slice()
        nextQuestions[questionIdx] = text
        return { ...i, examRetakeQuestions: nextQuestions }
      }),
    }))
  }

  const myGroups = activeVisibleGroups(data.groups, currentTrainer).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )

  function patchSettings(patch) {
    update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  function patchInternField(internId, field, value) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => (i.id === internId ? { ...i, [field]: value } : i)),
    }))
  }

  function patchInternQuestion(internId, questionIdx, text) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => {
        if (i.id !== internId) return i
        const nextQuestions = getExamQuestions(i).slice()
        nextQuestions[questionIdx] = text
        return { ...i, examQuestions: nextQuestions }
      }),
    }))
  }

  function toggleAnswer(internId, field, questionIdx) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) => {
        if (i.id !== internId) return i
        const current = field === 'examAnswers' ? getExamAnswers(i) : i.examRetakeAnswers || emptyExamAnswers()
        const nextAnswers = current.slice()
        nextAnswers[questionIdx] = nextAnswerState(current[questionIdx])
        return { ...i, [field]: nextAnswers }
      }),
    }))
  }

  function sendToRetake(internId) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) =>
        i.id === internId
          ? {
              ...i,
              examRetakeAnswers: emptyExamAnswers(),
              examRetakeQuestions: drawRetakeQuestions(i, bank),
              examFinalOutcome: null,
            }
          : i,
      ),
    }))
  }

  function setFinalOutcome(internId, outcome, comment) {
    update((prev) => ({
      ...prev,
      interns: prev.interns.map((i) =>
        i.id === internId ? { ...i, examFinalOutcome: outcome, examFinalComment: comment ?? i.examFinalComment ?? '' } : i,
      ),
    }))
  }

  function startEnding(internId) {
    setEndingId(internId)
    setEndComment('')
  }

  function cancelEnding() {
    setEndingId(null)
    setEndComment('')
  }

  function confirmEnding(internId) {
    if (!endComment.trim()) return
    setFinalOutcome(internId, 'ended', endComment.trim())
    setEndingId(null)
    setEndComment('')
  }

  function startTraining(intern) {
    const weakTopics = getWeakTopics(intern)
    const suggestion = weakTopics.length > 0 ? `Повторить темы (неверные ответы на экзамене): ${weakTopics.join('; ')}` : ''
    setTrainingId(intern.id)
    setTrainingComment(suggestion)
  }

  function cancelTraining() {
    setTrainingId(null)
    setTrainingComment('')
  }

  function confirmTraining(internId) {
    if (!trainingComment.trim()) return
    setFinalOutcome(internId, 'training', trainingComment.trim())
    setTrainingId(null)
    setTrainingComment('')
  }

  function archiveGroup(groupId) {
    setArchivingId(null)
    update((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId ? { ...g, archived: true, archivedAt: new Date().toISOString().slice(0, 10) } : g,
      ),
    }), { label: `Группа «${data.groups.find((g) => g.id === groupId)?.name || '—'}» отправлена в архив` })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Итоговый экзамен</h1>
      <p className="text-sm text-navy-500 dark:text-navy-400">
        Загрузите файл с вопросами, затем у каждого стажёра нажмите «Выдать вопросы» — ему случайно достанутся{' '}
        {EXAM_QUESTION_COUNT} вопросов из банка. При пересдаче вопросы, на которые стажёр ответил неверно, повторяются, а
        верно отвеченные заменяются новыми. Текст вопроса можно поправить вручную прямо в списке.
      </p>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Банк вопросов</h2>
            <p className="text-sm text-navy-500 dark:text-navy-400">
              {bank.length > 0 ? `В банке ${bank.length} вопросов.` : 'Банк вопросов пока пуст.'} Файл Excel: один вопрос
              в строке, в первом столбце. Новый файл полностью заменяет прежний список.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {bank.length > 0 && (
              <button onClick={() => setShowBank((v) => !v)} className="btn-secondary text-sm">
                {showBank ? 'Скрыть вопросы' : 'Показать вопросы'}
              </button>
            )}
            <label className="btn-primary text-sm cursor-pointer">
              {bank.length > 0 ? 'Загрузить новый файл' : 'Загрузить файл'}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={uploadBank} />
            </label>
          </div>
        </div>
        {bankMessage && (
          <p className={'text-sm ' + (bankMessage.error ? 'text-danger-500' : 'text-success-600 dark:text-success-400')}>
            {bankMessage.text}
          </p>
        )}
        {bank.length > 0 && bank.length < EXAM_QUESTION_COUNT && (
          <p className="text-sm text-warning-600 dark:text-warning-500">
            Для выдачи нужно хотя бы {EXAM_QUESTION_COUNT} вопросов в банке.
          </p>
        )}
        {showBank && (
          <ol className="list-decimal pl-6 text-sm space-y-0.5 max-h-80 overflow-y-auto">
            {bank.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ol>
        )}
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">Правила экзамена</h2>
        {admin ? (
          <textarea
            className="field-input min-h-[160px] font-mono text-sm"
            value={settings.examRules}
            onChange={(e) => patchSettings({ examRules: e.target.value })}
          />
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap text-navy-700 dark:text-navy-200">{settings.examRules}</p>
            <p className="text-xs text-navy-400 dark:text-navy-500">Редактировать правила может только главный логин.</p>
          </>
        )}
      </div>

      {myGroups.length === 0 ? (
        <p className="text-navy-400 dark:text-navy-500">Сначала создайте группу во вкладке «Настройки сбора».</p>
      ) : (
        myGroups.map((group) => {
          const groupInterns = allInterns.filter((i) => i.groupId === group.id)
          const interns = groupInterns.filter((i) => !i.withdrawn)
          const statuses = interns.map((i) => getInternExamStatus(i))
          const passedCount = statuses.filter((s) => s.code === 'passed').length
          const droppedCount = statuses.filter((s) => s.code === 'ended' || s.code === 'training').length
          const allResolved = interns.length > 0 && statuses.every((s) => isInternResolved(s))
          const groupSearch = searchByGroup[group.id] || ''
          const visibleInterns = filterInternsBySearch(interns, groupSearch)

          return (
            <div key={group.id} className="card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{group.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadGroupReport(group, groupInterns, trainers)}
                    disabled={groupInterns.length === 0}
                    className="btn-secondary text-sm"
                  >
                    Выгрузить отчёт
                  </button>
                  <button
                    onClick={() => setArchivingId(group.id)}
                    disabled={!allResolved}
                    title={allResolved ? '' : 'Доступно, когда по каждому стажёру принято итоговое решение'}
                    className="btn-secondary text-sm"
                  >
                    Отправить в архив
                  </button>
                </div>
              </div>

              {archivingId === group.id && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">
                    Отправить группу в архив? Она пропадёт из активных, но данные сохранятся в разделе «Архив».
                  </span>
                  <button onClick={() => archiveGroup(group.id)} className="btn-primary text-sm">
                    Да, в архив
                  </button>
                  <button onClick={() => setArchivingId(null)} className="btn-secondary text-sm">
                    Отмена
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  Всего стажёров: <span className="font-semibold">{interns.length}</span>
                </div>
                <div>
                  Сдали: <span className="font-semibold text-success-600 dark:text-success-400">{passedCount}</span>
                </div>
                <div>
                  Не прошли программу:{' '}
                  <span className="font-semibold text-danger-500 dark:text-danger-400">{droppedCount}</span>
                </div>
                <div>
                  В процессе:{' '}
                  <span className="font-semibold text-navy-700 dark:text-navy-200">
                    {interns.length - passedCount - droppedCount}
                  </span>
                </div>
                {groupInterns.length - interns.length > 0 && (
                  <div>
                    Отказались:{' '}
                    <span className="font-semibold text-navy-400 dark:text-navy-500">
                      {groupInterns.length - interns.length}
                    </span>
                  </div>
                )}
              </div>
              {!allResolved && interns.length > 0 && (
                <p className="text-xs text-warning-600 dark:text-warning-500">
                  В архив можно отправить, только когда по каждому стажёру принято итоговое решение (сдал, экзамен
                  завершён или направлен на доп. обучение).
                </p>
              )}

              {interns.length === 0 ? (
                <p className="text-navy-400 dark:text-navy-500 text-sm">В группе пока нет стажёров.</p>
              ) : (
                <>
                  <input
                    className="field-input max-w-xs"
                    placeholder="Поиск по ФИО, email, телефону..."
                    value={groupSearch}
                    onChange={(e) => setSearchByGroup((prev) => ({ ...prev, [group.id]: e.target.value }))}
                  />
                  {visibleInterns.length === 0 && (
                    <p className="text-navy-400 dark:text-navy-500 text-sm">Совпадений не найдено.</p>
                  )}
                <div className="space-y-3">
                  {visibleInterns.map((i) => {
                    const status = getInternExamStatus(i)
                    const questions = getExamQuestions(i)
                    const first = getExamAnswers(i)
                    const retake = getRetakeAnswers(i)
                    const canEnd = status.code === 'failed' || status.code === 'retake_failed'

                    return (
                      <div
                        key={i.id}
                        className="border border-navy-100 dark:border-navy-700 rounded-xl p-3 sm:p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">
                            {i.lastName} {i.firstName}
                          </div>
                          <span className={'px-2 py-1 rounded-full text-xs font-semibold ' + status.cls}>
                            {status.label}
                          </span>
                        </div>

                        {hasExamNotice(status) && (
                          <Link to={`/certificate/${i.id}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs px-3 py-1.5 inline-flex">
                            {status.code === 'passed' ? '🎓 Уведомление о завершении' : '📄 Уведомление о результате'}
                          </Link>
                        )}

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                            <span>
                              Первая попытка · {examCorrectCount(first)}/{EXAM_QUESTION_COUNT} ({examPercent(first)}%)
                            </span>
                            <input
                              type="date"
                              className="field-input text-xs py-0.5 px-1.5 normal-case font-normal tracking-normal w-auto"
                              value={i.examDate || ''}
                              onChange={(e) => patchInternField(i.id, 'examDate', e.target.value)}
                            />
                            {!retake && !examStarted(first) && bank.length >= EXAM_QUESTION_COUNT && (
                              <button
                                onClick={() => assignQuestions(i.id)}
                                className="btn-primary text-xs px-3 py-1 normal-case tracking-normal"
                              >
                                {questions.some((q) => q.trim()) ? '🎲 Выдать другие вопросы' : '🎲 Выдать вопросы'}
                              </button>
                            )}
                          </div>
                          <ExamAnswerList
                            questions={questions}
                            answers={first}
                            onToggle={(qIdx) => toggleAnswer(i.id, 'examAnswers', qIdx)}
                            onQuestionChange={(qIdx, text) => patchInternQuestion(i.id, qIdx, text)}
                          />
                        </div>

                        {retake && (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                              <span>
                                Пересдача · {examCorrectCount(retake)}/{EXAM_QUESTION_COUNT} ({examPercent(retake)}%)
                              </span>
                              <input
                                type="date"
                                className="field-input text-xs py-0.5 px-1.5 normal-case font-normal tracking-normal w-auto"
                                value={i.examRetakeDate || ''}
                                onChange={(e) => patchInternField(i.id, 'examRetakeDate', e.target.value)}
                              />
                            </div>
                            <ExamAnswerList
                              questions={getRetakeQuestions(i)}
                              answers={retake}
                              onToggle={(qIdx) => toggleAnswer(i.id, 'examRetakeAnswers', qIdx)}
                              onQuestionChange={(qIdx, text) => patchRetakeQuestion(i.id, qIdx, text)}
                            />
                          </div>
                        )}

                        {i.examFinalComment && (status.code === 'ended' || status.code === 'training') && (
                          <div className="text-sm bg-navy-50 dark:bg-navy-800 rounded-lg p-3">
                            <span className="font-medium">
                              {status.code === 'training' ? 'Рекомендации к доп. обучению: ' : 'Комментарий завершения: '}
                            </span>
                            {i.examFinalComment}
                          </div>
                        )}

                        {status.code === 'failed' && (
                          <button onClick={() => sendToRetake(i.id)} className="btn-secondary text-sm">
                            Отправить на пересдачу
                          </button>
                        )}

                        {status.code === 'retake_failed' && trainingId !== i.id && (
                          <button onClick={() => startTraining(i)} className="btn-secondary text-sm">
                            Направить на доп. обучение
                          </button>
                        )}

                        {trainingId === i.id && (
                          <div className="space-y-2 border border-warning-500/30 bg-warning-50 dark:bg-warning-500/10 rounded-lg p-3">
                            <label className="field-label">
                              Рекомендации к доп. обучению (обязательно, будут видны стажёру в уведомлении) — какие
                              вопросы не сдал и на чём делать акцент при повторном обучении
                            </label>
                            <textarea
                              className="field-input min-h-[80px]"
                              value={trainingComment}
                              onChange={(e) => setTrainingComment(e.target.value)}
                              placeholder="Укажите, какие темы повторить и на что обратить внимание"
                              autoFocus
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => confirmTraining(i.id)}
                                disabled={!trainingComment.trim()}
                                className="btn-secondary text-sm"
                              >
                                Подтвердить направление
                              </button>
                              <button onClick={cancelTraining} className="btn-secondary text-sm">
                                Отмена
                              </button>
                            </div>
                          </div>
                        )}

                        {canEnd && endingId !== i.id && (
                          <button onClick={() => startEnding(i.id)} className="btn-danger text-sm">
                            Завершение экзамена
                          </button>
                        )}

                        {endingId === i.id && (
                          <div className="space-y-2 border border-danger-500/30 bg-danger-50 dark:bg-danger-500/10 rounded-lg p-3">
                            <label className="field-label">
                              Комментарий к завершению экзамена (обязательно, будет виден стажёру и всем в
                              прогрессе)
                            </label>
                            <textarea
                              className="field-input min-h-[80px]"
                              value={endComment}
                              onChange={(e) => setEndComment(e.target.value)}
                              placeholder="Укажите причину завершения экзамена"
                              autoFocus
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => confirmEnding(i.id)}
                                disabled={!endComment.trim()}
                                className="btn-danger text-sm"
                              >
                                Подтвердить завершение
                              </button>
                              <button onClick={cancelEnding} className="btn-secondary text-sm">
                                Отмена
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                </>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
