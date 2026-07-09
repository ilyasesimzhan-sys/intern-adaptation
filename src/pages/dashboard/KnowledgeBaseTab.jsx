import { useState } from 'react'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { useStore } from '../../store/StoreContext.jsx'
import { isTrainerAdmin } from '../../lib/roles'
import { getStorageInstance, hasFirebaseConfig } from '../../lib/firebase'
import { uid } from '../../store/defaultData'

function formatBytes(bytes) {
  if (!bytes) return '0 КБ'
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} КБ`
  return `${(kb / 1024).toFixed(1)} МБ`
}

export default function KnowledgeBaseTab() {
  const { data, update, currentTrainer } = useStore()
  const admin = isTrainerAdmin(currentTrainer)
  const folders = data.knowledgeFolders || []
  const [newFolderName, setNewFolderName] = useState('')
  const [uploadErrors, setUploadErrors] = useState({})
  const [uploadingFolderId, setUploadingFolderId] = useState(null)

  function patchFolders(next) {
    update((prev) => ({ ...prev, knowledgeFolders: next }))
  }

  function createFolder() {
    const name = newFolderName.trim()
    if (!name) return
    patchFolders([...folders, { id: uid(), name, createdAt: new Date().toISOString(), files: [] }])
    setNewFolderName('')
  }

  function deleteFolder(folder) {
    if (!confirm(`Удалить папку «${folder.name}» вместе со всеми файлами?`)) return
    const storage = getStorageInstance()
    Promise.all((folder.files || []).map((f) => deleteObject(storageRef(storage, f.path)).catch(() => {}))).finally(
      () => patchFolders(folders.filter((f) => f.id !== folder.id)),
    )
  }

  async function handleUpload(folderId, e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!hasFirebaseConfig) {
      setUploadErrors((prev) => ({ ...prev, [folderId]: 'Загрузка файлов доступна только при подключённом Firebase.' }))
      return
    }
    setUploadErrors((prev) => ({ ...prev, [folderId]: '' }))
    setUploadingFolderId(folderId)
    try {
      const storage = getStorageInstance()
      const path = `knowledge/${folderId}/${uid()}-${file.name}`
      const fileRef = storageRef(storage, path)
      // Storage SDK бесконечно ретраит сетевые ошибки — если бакет ещё не включён в консоли,
      // запрос будет висеть очень долго, поэтому обрываем сами и показываем понятную ошибку.
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000),
      )
      await Promise.race([uploadBytes(fileRef, file), timeout])
      const url = await Promise.race([getDownloadURL(fileRef), timeout])
      const fileMeta = {
        id: uid(),
        name: file.name,
        size: file.size,
        path,
        url,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentTrainer?.name || '',
      }
      patchFolders(
        folders.map((f) => (f.id === folderId ? { ...f, files: [...(f.files || []), fileMeta] } : f)),
      )
    } catch {
      setUploadErrors((prev) => ({
        ...prev,
        [folderId]:
          'Не удалось загрузить файл. Похоже, в Firebase-проекте ещё не включён Cloud Storage — включите его в консоли Firebase (Build → Storage → Get started) и настройте правила доступа (см. README).',
      }))
    } finally {
      setUploadingFolderId(null)
    }
  }

  function deleteFile(folder, file) {
    if (!confirm(`Удалить файл «${file.name}»?`)) return
    const storage = getStorageInstance()
    deleteObject(storageRef(storage, file.path))
      .catch(() => {})
      .finally(() =>
        patchFolders(
          folders.map((f) => (f.id === folder.id ? { ...f, files: f.files.filter((x) => x.id !== file.id) } : f)),
        ),
      )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">База знаний</h1>
      <p className="text-sm text-navy-500">
        {admin
          ? 'Создавайте папки и загружайте в них файлы (презентации, документы, изображения и другие материалы) — все тренеры смогут их скачать.'
          : 'Материалы от главного тренера, доступны для скачивания.'}
      </p>

      {admin && (
        <div className="card flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="field-label">Название папки</label>
            <input
              className="field-input"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Например, Презентации по продукту"
            />
          </div>
          <button onClick={createFolder} className="btn-primary shrink-0">
            Создать папку
          </button>
        </div>
      )}

      {folders.length === 0 ? (
        <p className="text-navy-400">Пока нет ни одной папки.</p>
      ) : (
        <div className="space-y-4">
          {folders.map((folder) => (
            <div key={folder.id} className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{folder.name}</h2>
                {admin && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="btn-secondary text-sm cursor-pointer">
                      {uploadingFolderId === folder.id ? 'Загрузка…' : 'Загрузить файл'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleUpload(folder.id, e)}
                        disabled={uploadingFolderId === folder.id}
                      />
                    </label>
                    <button
                      onClick={() => deleteFolder(folder)}
                      className="text-sm text-danger-500 hover:text-danger-600"
                    >
                      Удалить папку
                    </button>
                  </div>
                )}
              </div>
              {uploadErrors[folder.id] && <p className="text-xs text-danger-500">{uploadErrors[folder.id]}</p>}

              {(folder.files || []).length === 0 ? (
                <p className="text-navy-400 text-sm">В папке пока нет файлов.</p>
              ) : (
                <ul className="divide-y divide-navy-50 border border-navy-100 rounded-lg overflow-hidden">
                  {folder.files.map((file) => (
                    <li key={file.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{file.name}</div>
                        <div className="text-xs text-navy-400">
                          {formatBytes(file.size)} · {file.uploadedAt ? file.uploadedAt.slice(0, 10) : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          Скачать
                        </a>
                        {admin && (
                          <button
                            onClick={() => deleteFile(folder, file)}
                            className="text-danger-500 hover:text-danger-600 text-xs"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
