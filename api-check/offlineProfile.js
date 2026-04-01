/**
 * When Academia HTML cannot be parsed, still return a valid profile so the UI can load.
 * Set in api-check/.env (see env.example).
 */
export function offlineProfileFromEnv() {
  const regNumber =
    process.env.SRM_BOOTSTRAP_REG?.trim() ||
    process.env.SRM_OFFLINE_REG?.trim()
  const name =
    process.env.SRM_BOOTSTRAP_NAME?.trim() ||
    process.env.SRM_OFFLINE_NAME?.trim()
  if (!regNumber || !name) return null

  return {
    regNumber,
    name,
    mobile: process.env.SRM_BOOTSTRAP_MOBILE?.trim() || '',
    section: process.env.SRM_BOOTSTRAP_SECTION?.trim() || '',
    program: process.env.SRM_BOOTSTRAP_PROGRAM?.trim() || '',
    department: process.env.SRM_BOOTSTRAP_DEPARTMENT?.trim() || '—',
    semester: process.env.SRM_BOOTSTRAP_SEMESTER?.trim() || '',
    batch: process.env.SRM_BOOTSTRAP_BATCH?.trim() || '',
    srmId:
      process.env.SRM_BOOTSTRAP_EMAIL?.trim() ||
      process.env.SRM_NETID?.trim() ||
      undefined,
  }
}
