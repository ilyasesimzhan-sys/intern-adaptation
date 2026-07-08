// Тренеры, заведённые до появления ролей, не имеют поля isAdmin — считаем
// администратором аккаунт trainer1, пока кто-то явно не переназначит роль.
export function isTrainerAdmin(trainer) {
  if (!trainer) return false
  if (trainer.isAdmin === true) return true
  if (trainer.isAdmin === undefined && trainer.login === 'trainer1') return true
  return false
}

export function ownedGroupIds(groups, trainerId) {
  return new Set(groups.filter((g) => g.ownerId === trainerId).map((g) => g.id))
}

export function visibleGroups(groups, currentTrainer) {
  if (isTrainerAdmin(currentTrainer)) return groups
  return groups.filter((g) => g.ownerId === currentTrainer?.id)
}
