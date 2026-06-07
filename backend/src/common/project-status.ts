export type ProjectStatus = 'material_pending' | 'script_pending' | 'video_pending' | 'finished';

const STATUS_ORDER: ProjectStatus[] = ['material_pending', 'script_pending', 'video_pending', 'finished'];

export function promoteProjectStatus(currentStatus: string | undefined, nextStatus: ProjectStatus): ProjectStatus {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus as ProjectStatus);
  const nextIndex = STATUS_ORDER.indexOf(nextStatus);

  if (currentIndex === -1) return nextStatus;
  return currentIndex >= nextIndex ? (currentStatus as ProjectStatus) : nextStatus;
}