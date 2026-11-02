/**
 * 校验 docs/openapi.json 的结构完整性：
 * $ref 是否可解析、operationId 是否唯一、路径参数是否与占位符一致、
 * 响应是否有 description、安全方案与 tag 是否已声明。
 *
 * 用法：node scripts/validate-openapi.mjs
 */
import { readFileSync } from 'node:fs';
const spec = JSON.parse(readFileSync('docs/openapi.json','utf8'));
const errs = [];
const refs = new Set();
const walk = (o, path) => {
  if (!o || typeof o !== 'object') return;
  if (Array.isArray(o)) return o.forEach((v,i)=>walk(v, `${path}[${i}]`));
  if (o.$ref) refs.add(o.$ref);
  for (const [k,v] of Object.entries(o)) walk(v, `${path}.${k}`);
};
walk(spec, '#');
const okRef = (r) => {
  const m = r.match(/^#\/components\/schemas\/(.+)$/);
  return m && spec.components.schemas[m[1]];
};
for (const r of refs) if (!okRef(r)) errs.push(`未解析的 $ref: ${r}`);
const methods = ['get','post','put','patch','delete','head','options'];
const ids = new Set();
let opCount = 0;
for (const [p, item] of Object.entries(spec.paths)) {
  if (!p.startsWith('/')) errs.push(`路径非法: ${p}`);
  const tpl = [...p.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]);
  for (const m of methods) {
    const op = item[m];
    if (!op) continue;
    opCount++;
    const where = `${m.toUpperCase()} ${p}`;
    if (!op.operationId) errs.push(`${where} 缺少 operationId`);
    else if (ids.has(op.operationId)) errs.push(`operationId 重复: ${op.operationId}`);
    else ids.add(op.operationId);
    if (!op.tags?.length) errs.push(`${where} 缺少 tags`);
    if (!op.summary) errs.push(`${where} 缺少 summary`);
    if (!op.responses || !Object.keys(op.responses).length) errs.push(`${where} 缺少 responses`);
    for (const [code, resp] of Object.entries(op.responses||{})) {
      if (!resp.description) errs.push(`${where} ${code} 缺少 description`);
    }
    const declared = (op.parameters||[]).filter(x=>x.in==='path').map(x=>x.name).sort();
    const missing = tpl.filter(t=>!declared.includes(t));
    if (missing.length) errs.push(`${where} 未声明路径参数: ${missing.join(',')}`);
    const extra = declared.filter(d=>!tpl.includes(d));
    if (extra.length) errs.push(`${where} 多余路径参数: ${extra.join(',')}`);
    const bodyParam = (op.parameters||[]).filter(x=>x.in==='body');
    if (bodyParam.length) errs.push(`${where} OpenAPI 3 不应使用 in:body`);
    for (const sec of op.security||[]) for (const k of Object.keys(sec)) if (!spec.components.securitySchemes[k]) errs.push(`${where} 未定义的安全方案: ${k}`);
  }
}
// 标签一致性
const tagNames = new Set(spec.tags.map(t=>t.name));
for (const [, item] of Object.entries(spec.paths)) for (const m of methods) {
  const op = item[m]; if (!op) continue;
  for (const t of op.tags||[]) if (!tagNames.has(t)) errs.push(`未在顶层声明 tag: ${t} (${m} ${op.operationId})`);
}
console.log(`paths=${Object.keys(spec.paths).length} operations=${opCount} schemas=${Object.keys(spec.components.schemas).length} refs=${refs.size}`);
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'VALID');
