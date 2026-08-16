export enum ActivityStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
  // spec-032: coexiste con ON_HOLD, no lo reemplaza. on_hold = "lo pausé
  // yo"; waiting = bloqueado por un tercero (ver waitingFor/waitingSince).
  WAITING = 'waiting',
}
