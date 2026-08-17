export enum ActivityStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  // spec-033: trabajo hecho, pendiente de verificar. Entre IN_PROGRESS y
  // COMPLETED — sin campos asociados, sin ciclo de vida propio en el
  // servicio, es solo un valor más del enum.
  TESTING = 'testing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
  // spec-032: coexiste con ON_HOLD, no lo reemplaza. on_hold = "lo pausé
  // yo"; waiting = bloqueado por un tercero (ver waitingFor/waitingSince).
  WAITING = 'waiting',
}
