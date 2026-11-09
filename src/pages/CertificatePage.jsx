import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import html2pdf from 'html2pdf.js'
import { useStore } from '../store/StoreContext.jsx'
import {
  getActiveAnswers,
  examCorrectCount,
  examPercent,
  getInternExamStatus,
  getActiveExamDate,
  getWeakTopics,
  hasExamNotice,
  EXAM_QUESTION_COUNT,
} from '../lib/exam'
import { formatDate, trainingPeriod } from '../lib/date'
import ThemeToggle from '../components/ThemeToggle.jsx'
import CertificateSheet, { CERT_W, CERT_H, CERT_COLORS } from '../components/CertificateSheet.jsx'
import { canManageGroup } from '../lib/roles'

export default function CertificatePage() {
  const { internId } = useParams()
  const { data, currentTrainer, archiveLoaded, requestArchive } = useStore()
  const intern = data.interns.find((i) => i.id === internId)
  const group = intern ? data.groups.find((g) => g.id === intern.groupId) : null
  const trainer = group ? data.trainers.find((t) => t.id === group.ownerId) : null
  const certRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [scale, setScale] = useState(1)
  const observerRef = useRef(null)
  const frameRef = useCallback((node) => {
    observerRef.current?.disconnect()
    if (!node) return
    observerRef.current = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / CERT_W)))
    observerRef.current.observe(node)
  }, [])

  // Стажёр мог уже уйти в архив — тогда его данные подгружаются отдельно.
  useEffect(() => {
    if (!intern) requestArchive()
  }, [intern, requestArchive])

  if (!intern && !archiveLoaded) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-navy-400">Загрузка...</div>
  }

  if (!intern) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Стажёр не найден</h1>
          <Link to="/" className="btn-secondary">
            На главную
          </Link>
        </div>
      </div>
    )
  }

  if (!canManageGroup(group, currentTrainer)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Документ недоступен</h1>
          <p className="text-navy-500 dark:text-navy-400 mb-4">
            Скачать уведомление о завершении АП может только тренер группы стажёра или администратор — войдите в кабинет тренера.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/login" className="btn-primary">
              Вход для тренеров
            </Link>
            <Link to={`/progress/${intern.id}`} className="btn-secondary">
              К прогрессу стажёра
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const status = getInternExamStatus(intern)
  const isPassed = status.code === 'passed'
  const isTraining = status.code === 'training'

  if (!hasExamNotice(status)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Документ недоступен</h1>
          <p className="text-navy-500 dark:text-navy-400 mb-4">
            Уведомление о завершении АП или о результате появляется здесь только после того, как итоговый экзамен
            оценён.
          </p>
          <Link to={`/progress/${intern.id}`} className="btn-secondary">
            К прогрессу стажёра
          </Link>
        </div>
      </div>
    )
  }

  const activeAnswers = getActiveAnswers(intern)
  const correct = examCorrectCount(activeAnswers)
  const percent = examPercent(activeAnswers)
  const examDate = getActiveExamDate(intern)
  const period = trainingPeriod(group?.lessons)
  const issueDate = group?.endDate ? formatDate(group.endDate) : formatDate(new Date().toISOString())
  const weakTopics = isPassed ? [] : getWeakTopics(intern)
  // Комментарий тренера, если это не автоподсказка «Повторить темы…» (темы и так перечислены на листе).
  const comment = (intern.examFinalComment || '').trim()
  const trainerComment = weakTopics.length && comment.startsWith('Повторить темы') ? '' : comment

  async function downloadPdf() {
    if (!certRef.current || downloading) return
    setDownloading(true)
    try {
      // Без загруженного Nunito html2canvas нарисовал бы текст запасным шрифтом.
      await document.fonts?.ready
      await html2pdf()
        .set({
          margin: 0,
          filename: `${isPassed ? 'Уведомление о завершении АП' : 'Уведомление о результате АП'} — ${intern.lastName} ${intern.firstName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: CERT_COLORS.paper,
            width: CERT_W,
            height: CERT_H,
            windowWidth: CERT_W,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: 'avoid-all' },
        })
        .from(certRef.current)
        .save()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-[1123px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to={`/progress/${intern.id}`}
            className="text-sm text-navy-500 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-200"
          >
            ← К прогрессу стажёра
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={downloadPdf} disabled={downloading} className="btn-primary">
              {downloading ? 'Формируем PDF…' : 'Скачать PDF'}
            </button>
          </div>
        </div>

        {/* На экране лист целиком уменьшается под ширину окна; в PDF уходит в исходном размере. */}
        <div ref={frameRef} className="w-full" style={{ height: CERT_H * scale }}>
          <div
            className="shadow-lg overflow-hidden"
            style={{ width: CERT_W, height: CERT_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <CertificateSheet
              ref={certRef}
              kind={isPassed ? 'passed' : isTraining ? 'training' : 'failed'}
              topics={weakTopics}
              fullName={`${intern.lastName} ${intern.firstName}`}
              details={[intern.department, intern.position, intern.city].filter(Boolean).join(' · ')}
              groupName={group?.name}
              result={`${correct}/${EXAM_QUESTION_COUNT} (${percent}%)`}
              recommendation={trainerComment}
              footer={[
                ['Обучение', period || '—'],
                ['Дата экзамена', examDate ? formatDate(examDate) : '—'],
                ['Бизнес-тренер', trainer?.name || '—'],
                ['Дата выдачи', issueDate],
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
