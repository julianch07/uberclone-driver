// AI-assisted: see docs/AI_LOG.md #10

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const APPROVAL_STATUS_INFO = {
  [APPROVAL_STATUS.PENDING]: {
    label: 'Pendiente de aprobación',
    message:
      'Tu registro fue recibido y está pendiente de aprobación. No podrás conectarte para recibir viajes hasta que sea aprobado.',
  },
  [APPROVAL_STATUS.APPROVED]: {
    label: 'Aprobado',
    message: 'Tu cuenta de conductor fue aprobada.',
  },
  [APPROVAL_STATUS.REJECTED]: {
    label: 'Rechazado',
    message:
      'Tu registro no fue aprobado. No podrás conectarte para recibir viajes.',
  },
};

// Un registro sin campo de estado (por ejemplo, guardado antes de este
// módulo) se considera pendiente.
export function getApprovalStatus(registration) {
  const status = registration && registration.approvalStatus;

  return Object.values(APPROVAL_STATUS).includes(status)
    ? status
    : APPROVAL_STATUS.PENDING;
}

export function canDriverGoOnline(registration) {
  return getApprovalStatus(registration) === APPROVAL_STATUS.APPROVED;
}
