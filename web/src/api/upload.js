import http from './http'
import { isMockEnabled } from '@/mock'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 上传图片。
 * 演示模式下直接读成 Data URL（无需后端），真实环境走 multipart 上传。
 */
export async function uploadImage(file, scene = 'PRODUCT') {
  if (isMockEnabled) {
    const url = await fileToDataUrl(file)
    return { url, width: 0, height: 0, size: file.size, mimeType: file.type }
  }
  const form = new FormData()
  form.append('file', file)
  form.append('scene', scene)
  return http.post('/files/images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
