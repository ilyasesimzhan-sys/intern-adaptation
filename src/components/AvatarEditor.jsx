import { useRef, useState } from 'react'
import { fileToResizedDataUrl } from '../lib/image'
import Avatar from './Avatar.jsx'

const CENTER = { x: 50, y: 50 }

function clamp(v) {
  return Math.max(0, Math.min(100, v))
}

// Аватар с загрузкой фото и перетаскиванием внутри круга, чтобы выбрать видимый центр
// (photoPosition хранится в процентах и применяется как CSS object-position).
export default function AvatarEditor({ photo, position, name, onPhotoChange, onPositionChange, onRemove, size = 128 }) {
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef(null)

  const pos = position || CENTER

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Выберите файл изображения.')
      return
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file, 480)
      onPhotoChange(dataUrl)
      onPositionChange(CENTER)
      setError('')
    } catch {
      setError('Не удалось загрузить фото, попробуйте другой файл.')
    }
  }

  function handlePointerDown(e) {
    if (!photo) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer capture unsupported for this pointer — dragging still works via window listeners */
    }
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPos: pos }
    setDragging(true)
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return
    const { startX, startY, startPos } = dragRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const sensitivity = 130 / size
    onPositionChange({
      x: clamp(startPos.x - dx * sensitivity),
      y: clamp(startPos.y - dy * sensitivity),
    })
  }

  function handlePointerUp(e) {
    dragRef.current = null
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div
        className={'rounded-full overflow-hidden select-none ring-1 ring-navy-100 ' + (photo ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : '')}
        style={{ width: size, height: size, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Avatar src={photo} name={name} size={size} position={pos} />
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <label className="btn-secondary text-sm cursor-pointer">
            Загрузить фото
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          {photo && (
            <>
              <button type="button" onClick={() => onPositionChange(CENTER)} className="btn-secondary text-sm">
                Центрировать
              </button>
              <button type="button" onClick={onRemove} className="text-sm text-danger-500 hover:text-danger-600">
                Удалить фото
              </button>
            </>
          )}
        </div>
        {photo && <p className="text-xs text-navy-400">Перетащите фото внутри круга, чтобы выбрать центр.</p>}
        {error && <p className="text-xs text-danger-500">{error}</p>}
      </div>
    </div>
  )
}
