/**
 * Fonctions utilitaires partagées entre le front public et le dashboard admin
 * Principe DRY : Éviter la duplication de code
 */

/**
 * Formate une date en chaîne lisible
 * @param {Date|string} date - Date à formater
 * @param {Object} options - Options de formatage
 * @returns {string} Date formatée
 */
export function formatDate(date, options = {}) {
  if (!date) return '—'
  try {
    const d = new Date(date)
    return d.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    })
  } catch {
    return '—'
  }
}

/**
 * Formate une date pour input datetime-local
 * @param {Date|string} date - Date à formater
 * @returns {string} Date au format YYYY-MM-DDTHH:MM
 */
export function formatDateForInput(date) {
  if (!date) return ''
  try {
    const d = new Date(date)
    const tzOffset = d.getTimezoneOffset() * 60000
    const local = new Date(d - tzOffset)
    return local.toISOString().slice(0, 16)
  } catch {
    return ''
  }
}

/**
 * Convertit une chaîne datetime-local en ISO
 * @param {string} localStr - Chaîne au format YYYY-MM-DDTHH:MM
 * @returns {string|null} Date au format ISO
 */
export function toISO(localStr) {
  if (!localStr) return null
  try {
    const d = new Date(localStr)
    const tzOffset = d.getTimezoneOffset() * 60000
    const iso = new Date(d.getTime() + tzOffset).toISOString()
    return iso
  } catch {
    return null
  }
}

/**
 * Vérifie si une date est dans le futur
 * @param {Date|string} date - Date à vérifier
 * @returns {boolean}
 */
export function isFutureDate(date) {
  if (!date) return false
  try {
    return new Date(date) > new Date()
  } catch {
    return false
  }
}

/**
 * Vérifie si une chaîne est un email valide
 * @param {string} email - Email à vérifier
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || !email.trim()) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Vérifie si une chaîne est un numéro de téléphone français valide (10 chiffres)
 * @param {string} phone - Numéro de téléphone
 * @returns {boolean}
 */
export function isValidFrenchPhone(phone) {
  if (!phone || !phone.trim()) return false
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10
}

/**
 * Formate un prix en euros
 * @param {number} price - Prix à formater
 * @returns {string}
 */
export function formatPrice(price) {
  if (price === undefined || price === null) return '0 €'
  return `${price} €`
}

/**
 * Formate une durée en minutes
 * @param {number} minutes - Durée en minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (minutes === undefined || minutes === null) return '? min'
  return `${minutes} min`
}

/**
 * Trouve un service par ID dans une liste
 * @param {Array} services - Liste des services
 * @param {string} serviceId - ID du service à trouver
 * @returns {Object|null} Service trouvé ou null
 */
export function findServiceById(services, serviceId) {
  if (!services || !serviceId) return null
  return services.find(s => s.id === serviceId || s.id === serviceId.toString())
}

/**
 * Génère un ID unique
 * @returns {string}
 */
export function generateId() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/**
 * Debounce une fonction
 * @param {Function} func - Fonction à debouncer
 * @param {number} wait - Temps d'attente en ms
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Normalise un objet booking pour uniformiser les champs (camelCase/snake_case)
 * @param {Object} booking - Booking à normaliser
 * @returns {Object} Booking normalisé
 */
export function normalizeBooking(booking) {
  if (!booking) return null
  return {
    id: booking.id || booking.uuid || booking.ID,
    serviceId: booking.serviceId || booking.service_id,
    serviceTitle: booking.serviceTitle || booking.service_title,
    price: booking.price || 0,
    duration: booking.duration || 0,
    date: booking.date || booking.date,
    firstName: booking.firstName || booking.first_name || '',
    lastName: booking.lastName || booking.last_name || '',
    phone: booking.phone || booking.phone || '',
    email: booking.email || booking.email || '',
    status: booking.status || booking.status || 'pending'
  }
}

/**
 * Enrichit une liste de bookings avec les données des services
 * @param {Array} bookings - Liste des bookings
 * @param {Array} services - Liste des services
 * @returns {Array} Liste de bookings enrichis
 */
export function enrichBookings(bookings, services) {
  if (!bookings || !bookings.length) return []
  return bookings.map(b => {
    const normalized = normalizeBooking(b)
    const service = services.find(s => s.id === normalized.serviceId)
    return {
      ...normalized,
      duration: normalized.duration || service?.duration || 0,
      price: normalized.price || service?.price || 0,
      serviceTitle: normalized.serviceTitle || service?.title || '—'
    }
  })
}

/**
 * Génère des créneaux horaires pour une journée donnée
 * @param {Date} day - Jour pour lequel générer les créneaux
 * @param {Object} settings - Paramètres (openHour, closeHour, slotInterval)
 * @returns {Array<Date>} Liste des créneaux (Date objects)
 */
export function generateSlots(day, settings = {}) {
  const open = settings.openHour ?? 9
  const close = settings.closeHour ?? 18
  const interval = settings.slotInterval ?? 60
  const slots = []
  const cur = new Date(day)
  cur.setHours(open, 0, 0, 0)
  while (cur.getHours() < close) {
    slots.push(new Date(cur))
    cur.setMinutes(cur.getMinutes() + interval)
  }
  return slots
}
