import { forwardRef } from 'react'
import KtLogoMark from './KtLogoMark.jsx'

// Лист A4 альбомной ориентации в CSS-пикселях (297×210 мм при 96 dpi; высота на 2px меньше, чтобы PDF
// гарантированно уложился в одну страницу).
export const CERT_W = 1123
export const CERT_H = 792

export const CERT_COLORS = {
  navy: '#12243d',
  sky: '#1689ae',
  muted: '#637b94',
  line: '#dde6ec',
  watermark: '#eaf3f7',
  paper: '#fcfdfe',
}
const C = CERT_COLORS

const FONT = "'Nunito', 'Inter', system-ui, sans-serif"

const TONES = {
  passed: { bg: '#e7f4f1', label: '#47766d', value: '#207c65' },
  training: { bg: '#fdf3df', label: '#8a6a2a', value: '#b07a0b' },
}

// Сам лист уведомления о завершении АП (или о направлении на доп. обучение) — его же html2pdf снимает в PDF.
const CertificateSheet = forwardRef(function CertificateSheet(
  { kind, fullName, details, groupName, result, footer, recommendation },
  ref,
) {
  const isPassed = kind === 'passed'
  const tone = TONES[kind]
  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: CERT_W,
        height: CERT_H,
        overflow: 'hidden',
        background: C.paper,
        color: C.navy,
        fontFamily: FONT,
      }}
    >
      <KtLogoMark color={C.watermark} style={{ position: 'absolute', left: 656, top: 192, width: 400, height: 420 }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, background: C.navy }} />
      <div style={{ position: 'absolute', left: 24, top: 0, bottom: 0, width: 7, background: C.sky }} />
      <div
        style={{ position: 'absolute', left: 48, top: 40, width: 1035, height: 712, border: `1px solid ${C.line}` }}
      />

      {/* Шапка: знак университета и название */}
      <div style={{ position: 'absolute', left: 83, top: 92, display: 'flex', alignItems: 'center', gap: 18 }}>
        <KtLogoMark color={C.sky} style={{ width: 76, height: 80 }} />
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1.2 }}>KAZAKHTELECOM</div>
          <div style={{ fontSize: 13, color: C.muted, letterSpacing: '0.04em', marginTop: 4 }}>CORPORATE UNIVERSITY</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 84, top: 207, width: 954, height: 1, background: C.line }} />

      {/* Основной текст */}
      {/* У уведомления больше текста (рекомендации), поэтому оно плотнее и шире — так всё помещается над подвалом. */}
      <div style={{ position: 'absolute', left: 85, top: 236, width: isPassed ? 640 : 900 }}>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '0.32em', lineHeight: 1.2 }}>
          УВЕДОМЛЕНИЕ
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.sky, letterSpacing: '0.04em', marginTop: 6 }}>
          {isPassed ? 'о завершении адаптационной программы' : 'о результате адаптационной программы'}
        </div>
        <div style={{ width: 73, height: 4, background: C.sky, borderRadius: 2, marginTop: 14 }} />
        <div style={{ fontSize: isPassed ? 44 : 34, fontWeight: 800, lineHeight: 1.15, marginTop: isPassed ? 18 : 10 }}>
          {fullName}
        </div>
        <div style={{ fontSize: 17, color: C.muted, marginTop: 6 }}>{details}</div>
        <div style={{ fontSize: isPassed ? 19 : 17, lineHeight: isPassed ? 1.6 : 1.5, marginTop: isPassed ? 20 : 8 }}>
          {isPassed ? (
            <>
              успешно прошёл(-ла) адаптационную программу
              <br />
              {groupName ? `в группе «${groupName}» ` : ''}и сдал(-а) итоговый экзамен
            </>
          ) : (
            <>
              прошёл(-ла) адаптационную программу{groupName ? ` в группе «${groupName}»` : ''}, но по итогам экзамена не
              набрал(а) проходной балл и направлен(а) на дополнительное обучение
            </>
          )}
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 28,
            marginTop: isPassed ? 20 : 10,
            padding: isPassed ? '12px 22px' : '8px 18px',
            borderRadius: 6,
            background: tone.bg,
          }}
        >
          <span style={{ fontSize: 15, color: tone.label }}>Результат</span>
          <span style={{ fontSize: 26, fontWeight: 800, color: tone.value }}>{result}</span>
        </div>
        {!isPassed && recommendation && (
          <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 10, maxHeight: 14 * 1.45 * 3, overflow: 'hidden' }}>
            <span style={{ fontWeight: 700 }}>Рекомендации: </span>
            {recommendation}
          </div>
        )}
      </div>

      {/* Подвал */}
      <div style={{ position: 'absolute', left: 85, top: 614, width: 952, height: 1, background: C.line }} />
      {footer.map(([label, value], idx) => (
        <div key={label} style={{ position: 'absolute', left: 85 + idx * 241.5, top: 640, width: 225 }}>
          <div style={{ fontSize: 13, color: C.muted }}>{label}</div>
          <div style={{ fontSize: 19, fontWeight: 700, marginTop: 8 }}>{value}</div>
        </div>
      ))}
    </div>
  )
})

export default CertificateSheet
