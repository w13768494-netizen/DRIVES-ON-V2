import type { AssistanceRequest } from '@/types/request'

function daysAgo(n: number, hour = 9, min = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, min, 0, 0)
  return d
}

function daysFromNow(n: number, hour = 9): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, 0, 0, 0)
  return d
}

let _evtId = 0
function evtId() { return `evt-${++_evtId}` }

// ─────────────────────────────────────────────────────────────────────────────
// Distribution des agences :
//   lc-001 AutoLoc Paris Centre   (9 demandes)
//   lc-003 AutoLoc Val-de-Marne   (5 demandes)
//   lc-004 ProDrive Sud / lc-008 Azur Cars  (2 demandes — agences partenaires)
//
// Attribution utilisateurs :
//   Sophie Marchand (u-001, admin)          : req-001, req-005, req-010
//   Pierre Dubois   (u-002, superviseur)    : req-006, req-008, req-011
//   Marie Leconte   (u-003, charge_assist.) : req-013, req-014, req-015, req-016, req-017
//   Jean Martin     (u-004, charge_assist.) : req-002, req-003, req-004, req-007, req-009
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_REQUESTS: AssistanceRequest[] = [

  // ══════════════════════════ lc-001 — AutoLoc Paris Centre ═════════════════

  // req-001 ─ MARTIN Sophie ─ acceptée (en attente validation prix) ─ SUV ─ aujourd'hui (Sophie Marchand)
  {
    id: 'req-001',
    requestType: 'planifiee',
    dossierNumber: 'DOS-2025-04821',
    referenceNumber: 'REF-001',
    coverage: { creditType: 'full' },
    sinistre: { lastName: 'MARTIN', firstName: 'Sophie', phone: '06 12 34 56 78', email: 'sophie.martin@gmail.com', licenseNumber: '250412A0012' },
    location: { address: '14 rue de la Paix, Paris 75002', latitude: 48.8697, longitude: 2.3309 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'suv',
    dateNeeded: daysFromNow(1),
    durationDays: 7,
    maxExtensionDays: 14,
    status: 'acceptee',
    targetPricePerDay:   70,
    assignedAgencyId:    'lc-001',
    confirmedAgencyId:   'lc-001',
    confirmedAgencyName: 'AutoLoc Paris Centre',
    confirmedAt:         daysAgo(0, 10, 15),
    loueurResponse: {
      agencyId: 'lc-001', agencyName: 'AutoLoc Paris Centre',
      pricePerDay: 85, vehicleModel: 'Peugeot 3008 2024',
      message: 'Livraison possible sur Paris.',
      respondedAt: daysAgo(0, 10, 15),
    },
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation',     at: daysAgo(0, 9, 30),  byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',        at: daysAgo(0, 9, 31),  byRole: 'assisteur', agencyId: 'lc-001' },
      { id: evtId(), type: 'reception',    at: daysAgo(0, 10, 0),  byRole: 'loueur',    agencyId: 'lc-001' },
      { id: evtId(), type: 'confirmation', at: daysAgo(0, 10, 15), byRole: 'loueur',    agencyId: 'lc-001', message: '85' },
    ],
    createdAt: daysAgo(0, 9, 30),
    createdByUserId: 'u-001',
    createdByName:   'Sophie Marchand',
  },

  // req-005 ─ LEROY Camille ─ confirmée ─ berline ─ hier (Sophie Marchand)
  {
    id: 'req-005',
    requestType: 'planifiee',
    dossierNumber: 'DOS-2025-04825',
    coverage: { creditType: 'full' },
    sinistre: { lastName: 'LEROY', firstName: 'Camille', phone: '06 11 22 33 44', licenseNumber: '198503B0034' },
    location: { address: '22 rue du Faubourg Saint-Antoine, Paris 75011', latitude: 48.8530, longitude: 2.3724 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'berline',
    dateNeeded: daysFromNow(1),
    durationDays: 10,
    maxExtensionDays: 21,
    status: 'confirmee',
    assignedAgencyId: 'lc-001',
    loueurResponse: {
      agencyId: 'lc-001', agencyName: 'AutoLoc Paris Centre',
      pricePerDay: 68, vehicleModel: 'Volkswagen Passat 2023',
      message: 'Livraison à Paris 11e possible dès demain matin.',
      respondedAt: daysAgo(1, 12, 10),
    },
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation',     at: daysAgo(1, 11, 50), byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',        at: daysAgo(1, 11, 51), byRole: 'assisteur', agencyId: 'lc-001' },
      { id: evtId(), type: 'reception',    at: daysAgo(1, 12, 0),  byRole: 'loueur',    agencyId: 'lc-001' },
      { id: evtId(), type: 'confirmation', at: daysAgo(1, 12, 10), byRole: 'loueur',    agencyId: 'lc-001' },
    ],
    createdAt: daysAgo(1, 11, 50),
    createdByUserId: 'u-001',
    createdByName:   'Sophie Marchand',
  },

  // req-006 ─ MOREAU Antoine ─ envoyée ─ SUV ─ aujourd'hui immédiate (Pierre Dubois)
  {
    id: 'req-006',
    requestType: 'immediate',
    dossierNumber: 'DOS-2025-04826',
    coverage: { creditType: 'partial' },
    sinistre: { lastName: 'MOREAU', firstName: 'Antoine', phone: '07 66 55 44 33' },
    location: { address: 'Boulevard Périphérique porte de la Chapelle, Paris 75018', latitude: 48.8954, longitude: 2.3585 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'suv',
    dateNeeded: daysFromNow(0),
    durationDays: 6,
    maxExtensionDays: 10,
    status: 'envoyee',
    assignedAgencyId: 'lc-001',
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation', at: daysAgo(0, 13, 20), byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',    at: daysAgo(0, 13, 21), byRole: 'assisteur', agencyId: 'lc-001' },
    ],
    createdAt: daysAgo(0, 13, 20),
    createdByUserId: 'u-002',
    createdByName:   'Pierre Dubois',
  },

  // req-008 ─ GARCIA Marco ─ honorée ─ citadine ─ hier (Pierre Dubois)
  {
    id: 'req-008',
    requestType: 'immediate',
    dossierNumber: 'DOS-2025-04811',
    coverage: { creditType: 'full' },
    sinistre: { lastName: 'GARCIA', firstName: 'Marco', phone: '06 33 22 11 00' },
    location: { address: '5 avenue Gambetta, Paris 75020', latitude: 48.8637, longitude: 2.3970 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'citadine',
    dateNeeded: daysAgo(0),
    durationDays: 3,
    status: 'cloturee',
    assignedAgencyId:    'lc-001',
    confirmedAgencyId:   'lc-001',
    confirmedAgencyName: 'AutoLoc Paris Centre',
    confirmedAt:         daysAgo(1, 10, 30),
    returnedAt:          daysAgo(0, 9, 15),
    loueurResponse: {
      agencyId: 'lc-001', agencyName: 'AutoLoc Paris Centre',
      pricePerDay: 42, vehicleModel: 'Toyota Yaris 2023',
      respondedAt: daysAgo(1, 10, 30),
    },
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation',        at: daysAgo(1, 10, 0),  byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',           at: daysAgo(1, 10, 1),  byRole: 'assisteur', agencyId: 'lc-001' },
      { id: evtId(), type: 'confirmation',    at: daysAgo(1, 10, 30), byRole: 'loueur',    agencyId: 'lc-001', message: '42' },
      { id: evtId(), type: 'attribution',     at: daysAgo(1, 10, 31), byRole: 'assisteur', message: 'AutoLoc Paris Centre' },
      { id: evtId(), type: 'retour_confirme', at: daysAgo(0, 9, 15),  byRole: 'loueur',    message: daysAgo(0, 9, 15).toISOString() },
    ],
    createdAt: daysAgo(1, 10, 0),
    createdByUserId: 'u-002',
    createdByName:   'Pierre Dubois',
  },

  // req-011 ─ MERCIER Nathalie ─ honorée ─ SUV ─ il y a 5 jours (Pierre Dubois)
  {
    id: 'req-011',
    requestType: 'planifiee',
    dossierNumber: 'DOS-2025-04795',
    referenceNumber: 'REF-020',
    coverage: { creditType: 'full' },
    sinistre: { lastName: 'MERCIER', firstName: 'Nathalie', phone: '06 50 60 70 80', email: 'n.mercier@pro.fr' },
    location: { address: '18 avenue Victor Hugo, Paris 75016', latitude: 48.8660, longitude: 2.2858 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'suv',
    dateNeeded: daysAgo(5),
    durationDays: 3,
    status: 'cloturee',
    assignedAgencyId:    'lc-001',
    confirmedAgencyId:   'lc-001',
    confirmedAgencyName: 'AutoLoc Paris Centre',
    confirmedAt:         daysAgo(5, 11, 0),
    returnedAt:          daysAgo(2, 17, 45),
    loueurResponse: {
      agencyId: 'lc-001', agencyName: 'AutoLoc Paris Centre',
      pricePerDay: 88, vehicleModel: 'Renault Austral 2024',
      respondedAt: daysAgo(5, 11, 0),
    },
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation',        at: daysAgo(6, 9, 0),   byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',           at: daysAgo(6, 9, 1),   byRole: 'assisteur', agencyId: 'lc-001' },
      { id: evtId(), type: 'confirmation',    at: daysAgo(5, 11, 0),  byRole: 'loueur',    agencyId: 'lc-001', message: '88' },
      { id: evtId(), type: 'attribution',     at: daysAgo(5, 11, 1),  byRole: 'assisteur', message: 'AutoLoc Paris Centre' },
      { id: evtId(), type: 'retour_confirme', at: daysAgo(2, 17, 45), byRole: 'loueur',    message: daysAgo(2, 17, 45).toISOString() },
    ],
    createdAt: daysAgo(6, 9, 0),
    createdByUserId: 'u-002',
    createdByName:   'Pierre Dubois',
  },

  // req-013 ─ PELLERIN Thomas ─ envoyée ─ berline ─ aujourd'hui (Marie Leconte)
  {
    id: 'req-013',
    requestType: 'planifiee',
    dossierNumber: 'DOS-2025-04830',
    coverage: { creditType: 'full' },
    sinistre: { lastName: 'PELLERIN', firstName: 'Thomas', phone: '06 22 33 44 55' },
    location: { address: '12 avenue Jean-Baptiste Clément, Boulogne-Billancourt 92100', latitude: 48.8349, longitude: 2.2419 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'berline',
    dateNeeded: daysFromNow(1),
    durationDays: 5,
    maxExtensionDays: 10,
    status: 'envoyee',
    assignedAgencyId: 'lc-001',
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation', at: daysAgo(0, 8, 15), byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',    at: daysAgo(0, 8, 16), byRole: 'assisteur', agencyId: 'lc-001' },
    ],
    createdAt: daysAgo(0, 8, 15),
    createdByUserId: 'u-003',
    createdByName:   'Marie Leconte',
  },

  // req-014 ─ VIDAL Lucie ─ envoyée ─ citadine ─ aujourd'hui immédiate (Marie Leconte)
  {
    id: 'req-014',
    requestType: 'immediate',
    dossierNumber: 'DOS-2025-04831',
    referenceNumber: 'REF-031',
    coverage: { creditType: 'partial' },
    sinistre: { lastName: 'VIDAL', firstName: 'Lucie', phone: '07 11 22 33 44', email: 'l.vidal@email.fr' },
    location: { address: '3 rue Daguerre, Paris 75014', latitude: 48.8340, longitude: 2.3248 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'citadine',
    dateNeeded: daysFromNow(0),
    durationDays: 3,
    status: 'envoyee',
    assignedAgencyId: 'lc-001',
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation', at: daysAgo(0, 9, 45), byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',    at: daysAgo(0, 9, 46), byRole: 'assisteur', agencyId: 'lc-001' },
    ],
    createdAt: daysAgo(0, 9, 45),
    createdByUserId: 'u-003',
    createdByName:   'Marie Leconte',
  },

  // req-016 ─ ROUSSEAU Nicolas ─ transfert_propose ─ SUV ─ aujourd'hui (Marie Leconte)
  {
    id: 'req-016',
    requestType: 'planifiee',
    dossierNumber: 'DOS-2025-04833',
    coverage: { creditType: 'partial' },
    sinistre: { lastName: 'ROUSSEAU', firstName: 'Nicolas', phone: '06 55 44 33 22' },
    location: { address: '45 boulevard Haussmann, Paris 75008', latitude: 48.8742, longitude: 2.3308 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'suv',
    dateNeeded: daysFromNow(2),
    durationDays: 6,
    status: 'transfert_propose',
    assignedAgencyId: 'lc-001',
    transfers: [
      {
        id: 'tr-001',
        requestId: 'req-016',
        fromAgencyId:   'lc-001',
        fromAgencyName: 'AutoLoc Paris Centre',
        toAgencyId:     'lc-003',
        toAgencyName:   'AutoLoc Val-de-Marne',
        reason:         'Flotte SUV indisponible sur Paris ce week-end. AutoLoc Val-de-Marne dispose du véhicule.',
        proposedAt:     daysAgo(0, 14, 30),
        status:         'en_attente',
      },
    ],
    timeline: [
      { id: evtId(), type: 'creation',          at: daysAgo(0, 13, 0),  byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',             at: daysAgo(0, 13, 1),  byRole: 'assisteur', agencyId: 'lc-001' },
      { id: evtId(), type: 'reception',         at: daysAgo(0, 14, 0),  byRole: 'loueur',    agencyId: 'lc-001' },
      { id: evtId(), type: 'transfert_propose', at: daysAgo(0, 14, 30), byRole: 'loueur',    agencyId: 'lc-001', message: 'Flotte SUV indisponible ce week-end.' },
    ],
    createdAt: daysAgo(0, 13, 0),
    createdByUserId: 'u-003',
    createdByName:   'Marie Leconte',
  },

  // req-017 ─ LAMBERT Claire ─ confirmée ─ berline ─ hier (Marie Leconte)
  {
    id: 'req-017',
    requestType: 'planifiee',
    dossierNumber: 'DOS-2025-04820',
    coverage: { creditType: 'full' },
    sinistre: { lastName: 'LAMBERT', firstName: 'Claire', phone: '06 99 11 22 33', email: 'c.lambert@pro.fr' },
    location: { address: '8 rue de la Paroisse, Versailles 78000', latitude: 48.8014, longitude: 2.1301 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'berline',
    dateNeeded: daysAgo(1),
    durationDays: 4,
    status: 'confirmee',
    assignedAgencyId: 'lc-001',
    loueurResponse: {
      agencyId: 'lc-001', agencyName: 'AutoLoc Paris Centre',
      pricePerDay: 68, vehicleModel: 'Peugeot 508 2024',
      respondedAt: daysAgo(1, 15, 0),
    },
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation',     at: daysAgo(1, 14, 30), byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',        at: daysAgo(1, 14, 31), byRole: 'assisteur', agencyId: 'lc-001' },
      { id: evtId(), type: 'reception',    at: daysAgo(1, 14, 50), byRole: 'loueur',    agencyId: 'lc-001' },
      { id: evtId(), type: 'confirmation', at: daysAgo(1, 15, 0),  byRole: 'loueur',    agencyId: 'lc-001' },
    ],
    createdAt: daysAgo(1, 14, 30),
    createdByUserId: 'u-003',
    createdByName:   'Marie Leconte',
  },

  // ══════════════════════════ lc-003 — AutoLoc Val-de-Marne ════════════════

  // req-002 ─ BERNARD Lucas ─ envoyée ─ berline ─ aujourd'hui immédiate (Jean Martin)
  {
    id: 'req-002',
    requestType: 'immediate',
    dossierNumber: 'DOS-2025-04822',
    coverage: { creditType: 'partial' },
    sinistre: { lastName: 'BERNARD', firstName: 'Lucas', phone: '07 88 23 45 67' },
    location: { address: '34 avenue du Maréchal Joffre, Maisons-Alfort 94700', latitude: 48.8074, longitude: 2.4365 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'berline',
    dateNeeded: daysFromNow(0),
    durationDays: 4,
    maxExtensionDays: 7,
    status: 'envoyee',
    assignedAgencyId: 'lc-003',
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation', at: daysAgo(0, 10, 5), byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',    at: daysAgo(0, 10, 6), byRole: 'assisteur', agencyId: 'lc-003' },
    ],
    createdAt: daysAgo(0, 10, 5),
    createdByUserId: 'u-004',
    createdByName:   'Jean Martin',
  },

  // req-004 ─ THOMAS Paul ─ refusée ─ petit_utilitaire ─ aujourd'hui (Jean Martin)
  {
    id: 'req-004',
    requestType: 'immediate',
    dossierNumber: 'DOS-2025-04824',
    coverage: { creditType: 'partial' },
    sinistre: { lastName: 'THOMAS', firstName: 'Paul', phone: '06 99 88 77 66' },
    location: { address: '5 avenue de Paris, Villeneuve-Saint-Georges 94190', latitude: 48.7340, longitude: 2.4479 },
    vehicleGroup: 'utilitaire',
    vehicleCategory: 'petit_utilitaire',
    dateNeeded: daysFromNow(2),
    durationDays: 5,
    status: 'refusee',
    assignedAgencyId: 'lc-003',
    loueurResponse: {
      agencyId: 'lc-003', agencyName: 'AutoLoc Val-de-Marne',
      message: 'Aucun utilitaire disponible cette semaine.',
      respondedAt: daysAgo(0, 11, 30),
    },
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation', at: daysAgo(0, 11, 0),  byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',    at: daysAgo(0, 11, 1),  byRole: 'assisteur', agencyId: 'lc-003' },
      { id: evtId(), type: 'reception',at: daysAgo(0, 11, 20), byRole: 'loueur',    agencyId: 'lc-003' },
      { id: evtId(), type: 'refus',    at: daysAgo(0, 11, 30), byRole: 'loueur',    agencyId: 'lc-003', message: 'Aucun utilitaire disponible cette semaine.' },
    ],
    createdAt: daysAgo(0, 11, 0),
    createdByUserId: 'u-004',
    createdByName:   'Jean Martin',
  },

  // req-007 ─ SIMON Julie ─ confirmée ─ 7_places ─ hier (Jean Martin)
  {
    id: 'req-007',
    requestType: 'planifiee',
    dossierNumber: 'DOS-2025-04810',
    referenceNumber: 'REF-010',
    coverage: { creditType: 'full' },
    sinistre: { lastName: 'SIMON', firstName: 'Julie', phone: '06 44 55 66 77', email: 'j.simon@email.fr' },
    location: { address: '10 boulevard de Stalingrad, Ivry-sur-Seine 94200', latitude: 48.8148, longitude: 2.3779 },
    vehicleGroup: 'tourisme',
    vehicleCategory: '7_places',
    dateNeeded: daysFromNow(0),
    durationDays: 14,
    maxExtensionDays: 30,
    status: 'confirmee',
    assignedAgencyId: 'lc-003',
    loueurResponse: {
      agencyId: 'lc-003', agencyName: 'AutoLoc Val-de-Marne',
      pricePerDay: 75, vehicleModel: 'Citroën C4 SpaceTourer 2022',
      respondedAt: daysAgo(1, 14, 0),
    },
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation',     at: daysAgo(1, 9, 10),  byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',        at: daysAgo(1, 9, 11),  byRole: 'assisteur', agencyId: 'lc-003' },
      { id: evtId(), type: 'reception',    at: daysAgo(1, 13, 0),  byRole: 'loueur',    agencyId: 'lc-003' },
      { id: evtId(), type: 'confirmation', at: daysAgo(1, 14, 0),  byRole: 'loueur',    agencyId: 'lc-003' },
    ],
    createdAt: daysAgo(1, 9, 10),
    createdByUserId: 'u-004',
    createdByName:   'Jean Martin',
  },

  // req-009 ─ ROUX Isabelle ─ honorée ─ berline ─ il y a 2 jours (Jean Martin)
  {
    id: 'req-009',
    requestType: 'planifiee',
    dossierNumber: 'DOS-2025-04812',
    coverage: { creditType: 'partial' },
    sinistre: { lastName: 'ROUX', firstName: 'Isabelle', phone: '06 77 66 55 44', licenseNumber: '197812C0078' },
    location: { address: '22 avenue du Général de Gaulle, Vitry-sur-Seine 94400', latitude: 48.7900, longitude: 2.3900 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'berline',
    dateNeeded: daysAgo(1),
    durationDays: 5,
    status: 'cloturee',
    assignedAgencyId:    'lc-003',
    confirmedAgencyId:   'lc-003',
    confirmedAgencyName: 'AutoLoc Val-de-Marne',
    confirmedAt:         daysAgo(2, 9, 0),
    returnedAt:          daysAgo(0, 14, 20),
    loueurResponse: {
      agencyId: 'lc-003', agencyName: 'AutoLoc Val-de-Marne',
      pricePerDay: 63, vehicleModel: 'BMW Série 3 2022',
      respondedAt: daysAgo(2, 9, 0),
    },
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation',        at: daysAgo(2, 8, 30), byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',           at: daysAgo(2, 8, 31), byRole: 'assisteur', agencyId: 'lc-003' },
      { id: evtId(), type: 'confirmation',    at: daysAgo(2, 9, 0),  byRole: 'loueur',    agencyId: 'lc-003', message: '63' },
      { id: evtId(), type: 'attribution',     at: daysAgo(2, 9, 1),  byRole: 'assisteur', message: 'AutoLoc Val-de-Marne' },
      { id: evtId(), type: 'retour_confirme', at: daysAgo(0, 14, 20), byRole: 'loueur',   message: daysAgo(0, 14, 20).toISOString() },
    ],
    createdAt: daysAgo(2, 8, 30),
    createdByUserId: 'u-004',
    createdByName:   'Jean Martin',
  },

  // req-015 ─ BONNET Sylvie ─ envoyée ─ petit_utilitaire ─ aujourd'hui immédiate (Jean Martin)
  {
    id: 'req-015',
    requestType: 'immediate',
    dossierNumber: 'DOS-2025-04832',
    coverage: { creditType: 'full' },
    sinistre: { lastName: 'BONNET', firstName: 'Sylvie', phone: '06 88 77 66 55', licenseNumber: '197209D0023' },
    location: { address: 'Avenue du Général Leclerc, Ivry-sur-Seine 94200', latitude: 48.8140, longitude: 2.3826 },
    vehicleGroup: 'utilitaire',
    vehicleCategory: 'petit_utilitaire',
    dateNeeded: daysFromNow(0),
    durationDays: 7,
    maxExtensionDays: 14,
    status: 'envoyee',
    assignedAgencyId: 'lc-003',
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation', at: daysAgo(0, 11, 10), byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',    at: daysAgo(0, 11, 11), byRole: 'assisteur', agencyId: 'lc-003' },
    ],
    createdAt: daysAgo(0, 11, 10),
    createdByUserId: 'u-004',
    createdByName:   'Jean Martin',
  },

  // ══════════════════════════ Agences partenaires (visibles assisteur uniquement) ═══

  // req-003 ─ DUBOIS Marie ─ confirmée ─ citadine ─ ProDrive Sud Marseille (Jean Martin)
  {
    id: 'req-003',
    requestType: 'planifiee',
    dossierNumber: 'DOS-2025-04823',
    referenceNumber: 'REF-003',
    coverage: { creditType: 'full' },
    sinistre: { lastName: 'DUBOIS', firstName: 'Marie', phone: '06 55 44 33 22', email: 'marie.dubois@outlook.fr' },
    location: { address: '88 boulevard Michelet, Marseille 13008', latitude: 43.2540, longitude: 5.3945 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'citadine',
    dateNeeded: daysFromNow(1),
    durationDays: 3,
    status: 'confirmee',
    assignedAgencyId: 'lc-004',
    loueurResponse: {
      agencyId: 'lc-004', agencyName: 'ProDrive Sud',
      pricePerDay: 42, vehicleModel: 'Renault Clio 2023',
      respondedAt: daysAgo(0, 11, 0),
    },
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation',     at: daysAgo(0, 10, 45), byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',        at: daysAgo(0, 10, 46), byRole: 'assisteur', agencyId: 'lc-004' },
      { id: evtId(), type: 'confirmation', at: daysAgo(0, 11, 0),  byRole: 'loueur',    agencyId: 'lc-004' },
    ],
    createdAt: daysAgo(0, 10, 45),
    createdByUserId: 'u-004',
    createdByName:   'Jean Martin',
  },

  // req-010 ─ FOURNIER Éric ─ clôturée ─ premium ─ Azur Cars Nice (Sophie Marchand)
  {
    id: 'req-010',
    requestType: 'immediate',
    dossierNumber: 'DOS-2025-04800',
    coverage: { creditType: 'partial' },
    sinistre: { lastName: 'FOURNIER', firstName: 'Éric', phone: '06 10 20 30 40' },
    location: { address: 'Promenade des Anglais, Nice 06000', latitude: 43.6955, longitude: 7.2660 },
    vehicleGroup: 'tourisme',
    vehicleCategory: 'premium',
    dateNeeded: daysAgo(2),
    durationDays: 2,
    status: 'cloturee',
    assignedAgencyId: 'lc-008',
    transfers: [],
    timeline: [
      { id: evtId(), type: 'creation', at: daysAgo(3, 16, 0),  byRole: 'assisteur' },
      { id: evtId(), type: 'envoi',    at: daysAgo(3, 16, 1),  byRole: 'assisteur', agencyId: 'lc-008' },
      { id: evtId(), type: 'cloture',  at: daysAgo(2, 10, 0),  byRole: 'assisteur', message: 'Sinistré a finalement utilisé un autre service.' },
    ],
    createdAt: daysAgo(3, 16, 0),
    createdByUserId: 'u-001',
    createdByName:   'Sophie Marchand',
  },
]
