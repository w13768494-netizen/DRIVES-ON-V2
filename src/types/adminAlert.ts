export type AlertCode =
  | 'sans_loueur'
  | 'sans_reponse_immediate'
  | 'sans_reponse_planifiee'
  | 'pc_manquante'
  | 'docs_loueur_manquants'
  | 'tarif_manquant'
  | 'flag_litigieux'
  | 'flag_anomalie'
  | 'flag_prioritaire'
  | 'transfert_bloque'
  | 'confirmation_sans_agence'
  | 'honore_sans_retour'
  | 'agence_sans_coords'   // système uniquement — dashboard global
  | 'non_retour_signale'

export type AlertSeverity = 'rouge' | 'orange' | 'jaune'

export interface AdminAlert {
  code:     AlertCode
  severity: AlertSeverity
  label:    string
  detail?:  string
}

export const ALERT_SEVERITY_ORDER: Record<AlertSeverity, number> = {
  rouge: 0, orange: 1, jaune: 2,
}
