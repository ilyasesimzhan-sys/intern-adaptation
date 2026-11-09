import { useCallback, useEffect, useState } from 'react'
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
import { msg, useI18n } from '../../i18n/I18nContext.jsx'

function nextAnswerState(value) {
  if (value === null || value === undefined) return true
  if (value === true) return false
  return null
}

export default function ExamTab() {
  const { t } = useI18n()
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
  const [showRules, setShowRules] = useState(false)
  // Открытая карточка стажёра и порядок списка, из которого её открыли (для ← →).
  const [opened, setOpened] = useState({ id: null, list: [] })
  const openedIntern = opened.id ? allInterns.find((i) => i.id === opened.id) : null
  const openedList = opened.list
  const openedIdx = openedList.indexOf(opened.id)

  function openIntern(id, list) {
    setOpened({ id, list })
  }

  const closeIntern = useCallback(() => {
    setOpened({ id: null, list: [] })
    setEndingId(null)
    setTrainingId(null)
  }, [])

  const stepIntern = useCallback((dir) => {
    setOpened((o) => {
      const idx = o.list.indexOf(o.id) + dir
      if (idx < 0 || idx >= o.list.length) return o
      return { ...o, id: o.list[idx] }
    })
    setEndingId(null)
    setTrainingId(null)
  }, [])

  async function uploadBank(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const questions = await readQuestionsFromFile(file)
      if (questions.length === 0) {
        setBankMessage({ error: true, text: msg('В файле не найдено ни одного вопроса — вопросы должны быть в первом столбце.') })
        return
      }
      patchSettings({ examQuestionBank: questions })
      setBankMessage({
        error: false,
        text: msg('Загружено вопросов: {n} (из файла «{file}»).'),
        params: { n: questions.length, file: file.name },
      })
    } catch {
      setBankMessage({ error: true, text: msg('Не удалось прочитать файл. Загрузите файл Excel (.xlsx).') })
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
      <h1 className="text-xl font-bold">{t('Итоговый экзамен')}</h1>
      <p className="text-sm text-navy-500 dark:text-navy-400">
        {t(
          'Загрузите файл с вопросами, затем у каждого стажёра нажмите «Выдать вопросы» — ему случайно достанутся {n} вопросов из банка. При пересдаче вопросы, на которые стажёр ответил неверно, повторяются, а верно отвеченные заменяются новыми. Текст вопроса можно поправить вручную прямо в списке.',
          { n: EXAM_QUESTION_COUNT },
        )}
      </p>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{t('Банк вопросов')}</h2>
            <p className="text-sm text-navy-500 dark:text-navy-400">
              {bank.length > 0 ? t('В банке {n} вопросов.', { n: bank.length }) : t('Банк вопросов пока пуст.')}{' '}
              {t('Файл Excel: один вопрос в строке, в первом столбце. Новый файл полностью заменяет прежний список.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {bank.length > 0 && (
              <button onClick={() => setShowBank((v) => !v)} className="btn-secondary text-sm">
                {showBank ? t('Скрыть вопросы') : t('Показать вопросы')}
              </button>
            )}
            <label className="btn-primary text-sm cursor-pointer">
              {bank.length > 0 ? t('Загрузить новый файл') : t('Загрузить файл')}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={uploadBank} />
            </label>
          </div>
        </div>
        {bankMessage && (
          <p className={'text-sm ' + (bankMessage.error ? 'text-danger-500' : 'text-success-600 dark:text-success-400')}>
            {t(bankMessage.text, bankMessage.params)}
          </p>
        )}
        {bank.length > 0 && bank.length < EXAM_QUESTION_COUNT && (
          <p className="text-sm text-warning-600 dark:text-warning-500">
            {t('Для выдачи нужно хотя бы {n} вопросов в банке.', { n: EXAM_QUESTION_COUNT })}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t('Правила экзамена')}</h2>
          <button onClick={() => setShowRules((v) => !v)} className="btn-secondary text-sm">
            {showRules ? t('Скрыть правила') : t('Показать правила')}
          </button>
        </div>
        {!showRules ? null : admin ? (
          <textarea
            className="field-input min-h-[160px] font-mono text-sm"
            value={settings.examRules}
            onChange={(e) => patchSettings({ examRules: e.target.value })}
          />
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap text-navy-700 dark:text-navy-200">{settings.examRules}</p>
            <p className="text-xs text-navy-400 dark:text-navy-500">{t('Редактировать правила может только главный логин.')}</p>
          </>
        )}
      </div>

      {myGroups.length === 0 ? (
        <p className="text-navy-400 dark:text-navy-500">{t('Сначала создайте группу во вкладке «Настройки сбора».')}</p>
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
                    {t('Выгрузить отчёт')}
                  </button>
                  <button
                    onClick={() => setArchivingId(group.id)}
                    disabled={!allResolved}
                    title={allResolved ? '' : t('Доступно, когда по каждому стажёру принято итоговое решение')}
                    className="btn-secondary text-sm"
                  >
                    {t('Отправить в архив')}
                  </button>
                </div>
              </div>

              {archivingId === group.id && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">
                    {t('Отправить группу в архив? Она пропадёт из активных, но данные сохранятся в разделе «Архив».')}
                  </span>
                  <button onClick={() => archiveGroup(group.id)} className="btn-primary text-sm">
                    {t('Да, в архив')}
                  </button>
                  <button onClick={() => setArchivingId(null)} className="btn-secondary text-sm">
                    {t('Отмена')}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  {t('Всего стажёров:')} <span className="font-semibold">{interns.length}</span>
                </div>
                <div>
                  {t('Сдали:')} <span className="font-semibold text-success-600 dark:text-success-400">{passedCount}</span>
                </div>
                <div>
                  {t('Не прошли программу:')}{' '}
                  <span className="font-semibold text-danger-500 dark:text-danger-400">{droppedCount}</span>
                </div>
                <div>
                  {t('В процессе:')}{' '}
                  <span className="font-semibold text-navy-700 dark:text-navy-200">
                    {interns.length - passedCount - droppedCount}
                  </span>
                </div>
                {groupInterns.length - interns.length > 0 && (
                  <div>
                    {t('Отказались:')}{' '}
                    <span className="font-semibold text-navy-400 dark:text-navy-500">
                      {groupInterns.length - interns.length}
                    </span>
                  </div>
                )}
              </div>
              {!allResolved && interns.length > 0 && (
                <p className="text-xs text-warning-600 dark:text-warning-500">
                  {t('В архив можно отправить, только когда по каждому стажёру принято итоговое решение (сдал, экзамен завершён или направлен на доп. обучение).')}
                </p>
              )}

              {interns.length === 0 ? (
                <p className="text-navy-400 dark:text-navy-500 text-sm">{t('В группе пока нет стажёров.')}</p>
              ) : (
                <>
                  <input
                    className="field-input max-w-xs"
                    placeholder={t('Поиск по ФИО, email, телефону...')}
                    value={groupSearch}
                    onChange={(e) => setSearchByGroup((prev) => ({ ...prev, [group.id]: e.target.value }))}
                  />
                  {visibleInterns.length === 0 && (
                    <p className="text-navy-400 dark:text-navy-500 text-sm">{t('Совпадений не найдено.')}</p>
                  )}
                  {visibleInterns.length > 0 && (
                    <div className="rounded-xl border border-navy-100 dark:border-navy-700 overflow-hidden divide-y divide-navy-50 dark:divide-navy-800">
                      <div className="hidden sm:grid grid-cols-[2rem_1fr_6.5rem_6.5rem_11rem_1rem] gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500 bg-navy-50 dark:bg-navy-800/60">
                        <span>#</span>
                        <span>{t('Стажёр')}</span>
                        <span className="text-center">{t('Попытка 1')}</span>
                        <span className="text-center">{t('Пересдача')}</span>
                        <span>{t('Статус')}</span>
                        <span />
                      </div>
                      {visibleInterns.map((i, n) => {
                        const status = getInternExamStatus(i)
                        const first = getExamAnswers(i)
                        const retake = getRetakeAnswers(i)
                        const noQuestions = !getExamQuestions(i).some((q) => q.trim())
                        return (
                          <button
                            key={i.id}
                            type="button"
                            onClick={() => openIntern(i.id, visibleInterns.map((x) => x.id))}
                            className="w-full text-left grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_6.5rem_6.5rem_11rem_1rem] gap-3 items-center px-4 py-2.5 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors group"
                          >
                            <span className="text-sm text-navy-400">{n + 1}</span>
                            <span className="min-w-0">
                              <span className="block font-semibold truncate group-hover:text-sky-600 dark:group-hover:text-sky-400">
                                {i.lastName} {i.firstName}
                              </span>
                              <span className="block text-xs text-navy-400 dark:text-navy-500 truncate">
                                {[i.department, i.city].filter(Boolean).join(' · ')}
                                {noQuestions && (
                                  <span className="text-warning-600 dark:text-warning-500"> · {t('вопросы не выданы')}</span>
                                )}
                              </span>
                            </span>
                            <ScoreCell answers={first} />
                            <ScoreCell answers={retake} />
                            <span className="hidden sm:block">
                              <span className={'inline-block px-2 py-1 rounded-full text-xs font-semibold ' + status.cls}>
                                {t(status.label)}
                              </span>
                            </span>
                            <span className="sm:hidden">
                              <span className={'inline-block px-2 py-1 rounded-full text-[11px] font-semibold ' + status.cls}>
                                {t(status.label)}
                              </span>
                            </span>
                            <span className="hidden sm:block text-navy-300 group-hover:text-sky-500 text-lg leading-none">›</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })
      )}

      {openedIntern && (
        <InternModal
          intern={openedIntern}
          group={data.groups.find((g) => g.id === openedIntern.groupId)}
          trainers={trainers}
          position={openedIdx}
          total={openedList.length}
          onPrev={() => stepIntern(-1)}
          onNext={() => stepIntern(1)}
          onClose={closeIntern}
        >
          {(() => {
                    const i = openedIntern
                    const status = getInternExamStatus(i)
                    const questions = getExamQuestions(i)
                    const first = getExamAnswers(i)
                    const retake = getRetakeAnswers(i)
                    const canEnd = status.code === 'failed' || status.code === 'retake_failed'

                    return (
                      <div className="space-y-4">

                        {hasExamNotice(status) && (
                          <Link to={`/certificate/${i.id}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs px-3 py-1.5 inline-flex">
                            {status.code === 'passed' ? t('🎓 Уведомление о завершении') : t('📄 Уведомление о результате')}
                          </Link>
                        )}

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">
                            <span>
                              {t('Первая попытка')} · {examCorrectCount(first)}/{EXAM_QUESTION_COUNT} ({examPercent(first)}%)
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
                                {questions.some((q) => q.trim()) ? t('🎲 Выдать другие вопросы') : t('🎲 Выдать вопросы')}
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
                                {t('Пересдача')} · {examCorrectCount(retake)}/{EXAM_QUESTION_COUNT} ({examPercent(retake)}%)
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
                              {status.code === 'training' ? t('Рекомендации к доп. обучению:') : t('Комментарий завершения:')}{' '}
                            </span>
                            {i.examFinalComment}
                          </div>
                        )}

                        {status.code === 'failed' && (
                          <button onClick={() => sendToRetake(i.id)} className="btn-secondary text-sm">
                            {t('Отправить на пересдачу')}
                          </button>
                        )}

                        {status.code === 'retake_failed' && trainingId !== i.id && (
                          <button onClick={() => startTraining(i)} className="btn-secondary text-sm">
                            {t('Направить на доп. обучение')}
                          </button>
                        )}

                        {trainingId === i.id && (
                          <div className="space-y-2 border border-warning-500/30 bg-warning-50 dark:bg-warning-500/10 rounded-lg p-3">
                            <label className="field-label">
                              {t('Рекомендации к доп. обучению (обязательно, будут видны стажёру в уведомлении) — какие вопросы не сдал и на чём делать акцент при повторном обучении')}
                            </label>
                            <textarea
                              className="field-input min-h-[80px]"
                              value={trainingComment}
                              onChange={(e) => setTrainingComment(e.target.value)}
                              placeholder={t('Укажите, какие темы повторить и на что обратить внимание')}
                              autoFocus
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => confirmTraining(i.id)}
                                disabled={!trainingComment.trim()}
                                className="btn-secondary text-sm"
                              >
                                {t('Подтвердить направление')}
                              </button>
                              <button onClick={cancelTraining} className="btn-secondary text-sm">
                                {t('Отмена')}
                              </button>
                            </div>
                          </div>
                        )}

                        {canEnd && endingId !== i.id && (
                          <button onClick={() => startEnding(i.id)} className="btn-danger text-sm">
                            {t('Завершение экзамена')}
                          </button>
                        )}

                        {endingId === i.id && (
                          <div className="space-y-2 border border-danger-500/30 bg-danger-50 dark:bg-danger-500/10 rounded-lg p-3">
                            <label className="field-label">
                              {t('Комментарий к завершению экзамена (обязательно, будет виден стажёру и всем в прогрессе)')}
                            </label>
                            <textarea
                              className="field-input min-h-[80px]"
                              value={endComment}
                              onChange={(e) => setEndComment(e.target.value)}
                              placeholder={t('Укажите причину завершения экзамена')}
                              autoFocus
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => confirmEnding(i.id)}
                                disabled={!endComment.trim()}
                                className="btn-danger text-sm"
                              >
                                {t('Подтвердить завершение')}
                              </button>
                              <button onClick={cancelEnding} className="btn-secondary text-sm">
                                {t('Отмена')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
          })()}
        </InternModal>
      )}
    </div>
  )
}

function ScoreCell({ answers }) {
  if (!answers || !examStarted(answers)) {
    return <span className="hidden sm:block text-center text-navy-300 dark:text-navy-600">—</span>
  }
  const pct = examPercent(answers)
  const cls =
    pct >= 90
      ? 'text-success-600 dark:text-success-400'
      : 'text-danger-500 dark:text-danger-400'
  return (
    <span className={'hidden sm:block text-center font-semibold ' + cls}>
      {examCorrectCount(answers)}/{EXAM_QUESTION_COUNT}
    </span>
  )
}

// Карточка стажёра поверх страницы: данные, вопросы экзамена и решения. Листается ← →, закрывается Esc.
function InternModal({ intern, group, trainers, position, total, onPrev, onNext, onClose, children }) {
  const { t } = useI18n()
  const status = getInternExamStatus(intern)
  const trainer = trainers.find((x) => x.id === group?.ownerId)

  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName
      if (e.key === 'Escape') onClose()
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, onPrev, onNext])

  const facts = [
    [t('Подразделение'), intern.department],
    [t('Должность'), intern.position],
    [t('Регион'), intern.region],
    [t('Город/район'), intern.city],
    [t('Телефон'), intern.phone],
    [t('Почта'), intern.email],
    [t('Руководитель'), [intern.managerName, intern.managerContact].filter(Boolean).join(' · ')],
    [t('Тренер группы'), trainer?.name],
  ].filter(([, v]) => v)

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-fadein" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col bg-white dark:bg-navy-900 sm:rounded-2xl shadow-2xl overflow-hidden animate-fadein">
        {/* Шапка карточки */}
        <div className="relative bg-gradient-to-br from-navy-700 via-navy-600 to-sky-500 text-white px-5 sm:px-6 pt-5 pb-4 shrink-0">
          <div className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-white/10" aria-hidden />
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center font-display text-2xl font-extrabold">
              {(intern.lastName || '?').charAt(0)}
              {(intern.firstName || '').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/70">{group?.name}</div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold leading-tight">
                {intern.lastName} {intern.firstName}
              </h2>
              <span className={'inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ' + status.cls}>
                {t(status.label)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-xl leading-none"
              title={t('Закрыть')}
              aria-label={t('Закрыть')}
            >
              ×
            </button>
          </div>
          <div className="relative flex items-center justify-between mt-4 text-sm">
            <button onClick={onPrev} disabled={position <= 0} className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40">
              ← {t('Предыдущий')}
            </button>
            <span className="text-white/80">
              {position + 1} / {total}
            </span>
            <button onClick={onNext} disabled={position >= total - 1} className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40">
              {t('Следующий')} →
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {facts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {facts.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 dark:text-navy-500">{label}</div>
                  <div className="text-sm font-medium break-words">{value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-navy-100 dark:border-navy-800 pt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
