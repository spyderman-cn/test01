/** 金额：接口统一用「分」，展示用「元」 */
export function money(cents) {
  if (cents === null || cents === undefined || Number.isNaN(Number(cents))) return '0.00'
  const n = Number(cents) / 100
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

export function yuan(cents) {
  return `¥${money(cents)}`
}

/** 时间展示 */
export function dateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function dateOnly(value) {
  if (!value) return '—'
  const d = new Date(value)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function fromNow(value) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  if (Number.isNaN(diff)) return ''
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day} 天前`
  return dateOnly(value)
}

export function maskPhone(phone) {
  if (!phone) return ''
  return String(phone).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

/**
 * 生成离线可用的占位图（SVG Data URI）。
 * 没有后端 CDN 时，商品图片用它兜底，避免外链失效。
 */
export function coverImage(text = '校园好物', hue = 160, w = 800, h = 600) {
  const from = `hsl(${hue} 62% 88%)`
  const to = `hsl(${(hue + 40) % 360} 58% 72%)`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w * 0.82}" cy="${h * 0.2}" r="${h * 0.28}" fill="rgba(255,255,255,0.35)"/>
  <circle cx="${w * 0.15}" cy="${h * 0.86}" r="${h * 0.22}" fill="rgba(255,255,255,0.25)"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="${Math.round(w / 14)}"
        fill="rgba(17,24,39,0.55)" font-weight="600">${text}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function debounce(fn, wait = 300) {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

/** 生成头像占位图（大字姓名首字），同样离线可用 */
export function avatarImage(char = '校', hue = 160, size = 200) {
  const from = `hsl(${hue} 58% 82%)`
  const to = `hsl(${(hue + 35) % 360} 62% 66%)`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
  </linearGradient></defs>
  <rect width="${size}" height="${size}" fill="url(#a)"/>
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
        font-family="PingFang SC, Microsoft YaHei, sans-serif" font-weight="600"
        font-size="${Math.round(size * 0.44)}" fill="rgba(17,24,39,0.72)">${char}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
