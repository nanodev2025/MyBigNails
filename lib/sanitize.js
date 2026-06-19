export function sanitizeText(s){
  if(!s && s !== 0) return ''
  return String(s).replace(/<[^>]*>?/gm, '').trim()
}
