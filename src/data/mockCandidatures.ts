import type { Candidature } from '@/types/candidature'

function daysAgo(n: number, h = 10, m = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  return d
}

export const MOCK_CANDIDATURES: Candidature[] = [
  {
    id: 'cand-001', role: 'assisteur', status: 'en_attente',
    submittedAt: daysAgo(1, 14, 22),
    companyName: 'Assurances Méditerranée', siret: '45678901200043',
    address: '12 rue de la République', city: 'Marseille', postalCode: '13001',
    website: 'https://assurances-med.fr',
    contactFirstName: 'Laurent', contactLastName: 'FAVRE', contactTitle: 'Directeur sinistres',
    email: 'l.favre@assurances-med.fr', phone: '04 91 23 45 67',
    monthlyVolume: 200,
    message: 'Nous gérons environ 150 dossiers véhicule de remplacement par mois sur la région PACA. Nous sommes prêts à démarrer rapidement.',
  },
  {
    id: 'cand-002', role: 'loueur', status: 'en_attente',
    submittedAt: daysAgo(0, 9, 5),
    companyName: 'Flotte Express Lyon', siret: '78912345600028',
    address: '8 avenue Berthelot', city: 'Lyon', postalCode: '69007',
    contactFirstName: 'Sophie', contactLastName: 'RENARD', contactTitle: 'Responsable commercial',
    email: 's.renard@flotteexpress.fr', phone: '04 72 33 44 55',
    agencyCount: 3, fleetSize: 85,
    vehicleTypes: ['citadine', 'berline', 'suv', 'petit_utilitaire'],
    message: 'Nous disposons de 3 agences à Lyon (Part-Dieu, Confluence, Bron) et souhaitons développer notre activité B2B.',
  },
  {
    id: 'cand-003', role: 'assisteur', status: 'acceptee',
    submittedAt: daysAgo(8, 11, 30), reviewedAt: daysAgo(6, 9, 15),
    reviewNote: 'Dossier complet, volume cohérent. Bienvenue sur Drives On !',
    companyName: 'Groupe Protexia Nord', siret: '31245678900017',
    address: '45 boulevard de la Liberté', city: 'Lille', postalCode: '59000',
    contactFirstName: 'Éric', contactLastName: 'VASSEUR', contactTitle: 'Chef de projet digital',
    email: 'e.vasseur@protexia-nord.fr', phone: '03 20 12 34 56',
    monthlyVolume: 50,
  },
  {
    id: 'cand-004', role: 'loueur', status: 'refusee',
    submittedAt: daysAgo(5, 16, 40), reviewedAt: daysAgo(3, 14, 0),
    reviewNote: 'Flotte insuffisante (< 10 véhicules) pour garantir un service continu. Invitation à redéposer dossier si la flotte s\'agrandit.',
    companyName: 'AutoKlub Bordeaux', siret: '92345678100034',
    address: '3 rue des Faures', city: 'Bordeaux', postalCode: '33000',
    contactFirstName: 'Julien', contactLastName: 'MARTIN', contactTitle: 'Gérant',
    email: 'contact@autoklub33.fr', phone: '05 56 78 90 12',
    agencyCount: 1, fleetSize: 8,
    vehicleTypes: ['citadine', 'berline'],
  },
  {
    id: 'cand-005', role: 'loueur', status: 'en_attente',
    submittedAt: daysAgo(2, 8, 50),
    companyName: 'CarServ Toulouse', siret: '56789012300041',
    address: '22 allée Charles de Fitte', city: 'Toulouse', postalCode: '31300',
    website: 'https://carserv31.com',
    contactFirstName: 'Marie', contactLastName: 'DUPONT', contactTitle: 'Directrice',
    email: 'm.dupont@carserv31.com', phone: '05 61 22 33 44',
    agencyCount: 2, fleetSize: 45,
    vehicleTypes: ['citadine', 'compacte', 'berline', 'suv', '7_places'],
    message: 'Agences au centre-ville et à l\'aéroport Blagnac. Disponibilité 7j/7.',
  },
]
