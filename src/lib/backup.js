import { msg } from '../i18n/msg.js'
import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { getDb, hasFirebaseConfig } from './firebase'
import { backupPayload, parsePayload } from './backupFile'

// Резервные копии лежат в app/ (правила Firestore разрешают только app/, groups/, interns/):
// app/backups — список копий, app/backup_<id>_<n> — части JSON. Поле времени называется createdAt,
// а не at, чтобы копии не попадали в выборку журнала действий (она сортирует по at).
const INDEX_ID = 'backups'
const PART_PREFIX = 'backup_'
// Документ Firestore — до 1 МБ; кириллица в UTF-8 — 2 байта на символ, поэтому части по 300 тыс. символов.
const PART_CHARS = 300000
const KEEP_DAILY = 30
const KEEP_OTHER = 20

export const BACKUP_KIND_LABELS = {
  auto: msg('Ежедневная'),
  manual: msg('Вручную'),
  'pre-restore': msg('Перед восстановлением'),
}

function localDay(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export async function listBackups() {
  const snap = await getDoc(doc(getDb(), 'app', INDEX_ID))
  const list = snap.exists() ? snap.data().list || [] : []
  // Два тренера могли одновременно сохранить одну и ту же ежедневную копию — оставляем последнюю запись.
  const byId = new Map()
  list.forEach((b) => {
    if (!byId.has(b.id) || (b.createdAt || '') > (byId.get(b.id).createdAt || '')) byId.set(b.id, b)
  })
  return [...byId.values()].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export async function saveBackup(data, kind, trainer) {
  const db = getDb()
  const payload = backupPayload(data)
  const id = kind === 'auto' ? `day-${localDay()}` : `${kind}-${Date.now().toString(36)}`
  const json = JSON.stringify(payload)
  const parts = Math.max(1, Math.ceil(json.length / PART_CHARS))
  for (let n = 0; n < parts; n++) {
    await setDoc(doc(db, 'app', `${PART_PREFIX}${id}_${n}`), {
      backupId: id,
      part: n,
      json: json.slice(n * PART_CHARS, (n + 1) * PART_CHARS),
    })
  }
  const meta = {
    id,
    kind,
    createdAt: payload.createdAt,
    parts,
    groups: data.groups.length,
    interns: data.interns.length,
    by: trainer?.name || '',
  }
  // Список копий обновляется только после того, как все части записаны: копия без частей в нём не появится.
  await setDoc(doc(db, 'app', INDEX_ID), { list: arrayUnion(meta) }, { merge: true })
  await pruneBackups().catch((err) => console.error('Backup prune failed', err))
  return meta
}

export async function loadBackup(meta) {
  const db = getDb()
  let json = ''
  for (let n = 0; n < meta.parts; n++) {
    const snap = await getDoc(doc(db, 'app', `${PART_PREFIX}${meta.id}_${n}`))
    if (!snap.exists()) throw new Error(msg('Часть резервной копии не найдена.'))
    json += snap.data().json
  }
  return parsePayload(json)
}

async function pruneBackups() {
  const list = await listBackups()
  const daily = list.filter((b) => b.kind === 'auto')
  const other = list.filter((b) => b.kind !== 'auto')
  const extra = [...daily.slice(KEEP_DAILY), ...other.slice(KEEP_OTHER)]
  if (extra.length === 0) return
  const db = getDb()
  const extraIds = new Set(extra.map((b) => b.id))
  await setDoc(doc(db, 'app', INDEX_ID), { list: list.filter((b) => !extraIds.has(b.id)) })
  for (const b of extra) {
    for (let n = 0; n < b.parts; n++) await deleteDoc(doc(db, 'app', `${PART_PREFIX}${b.id}_${n}`))
  }
}

let dailyChecked = false

// Ежедневная копия: первый вошедший за день тренер (любой) незаметно сохраняет снимок всех данных.
// Пустые данные не сохраняем — если всё вдруг пропало, такая «копия» только вытеснила бы настоящие.
export async function ensureDailyBackup(data, trainer) {
  if (dailyChecked || !hasFirebaseConfig || !trainer) return
  if (data.groups.length === 0 && data.interns.length === 0) return
  dailyChecked = true
  try {
    const list = await listBackups()
    if (list.some((b) => b.id === `day-${localDay()}`)) return
    // На сайте обычно загружены только стажёры текущих групп — для копии читаем всех, включая архив.
    const snap = await getDocs(collection(getDb(), 'interns'))
    await saveBackup({ ...data, interns: snap.docs.map((d) => d.data()) }, 'auto', trainer)
  } catch (err) {
    console.error('Daily backup failed', err)
  }
}
