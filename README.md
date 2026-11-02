# test01

校园二手交易平台 —— 项目文档。

## 文档

- [接口文档（v1.0.0）](docs/校园二手交易平台接口文档.md) —— 人类阅读版，含业务流程、状态机、错误码与数据模型
- [OpenAPI 3.0 规范](docs/openapi.json) —— 机器可读，用于 Apifox / Swagger UI / Postman 导入

## 在 Apifox 中导入

1. Apifox → 项目设置 → 导入数据 → **OpenAPI / Swagger**。
2. 选择「文件导入」，选 `docs/openapi.json`；或选择「URL 导入」，填仓库的 raw 地址：
   `https://raw.githubusercontent.com/spyderman-cn/test01/main/docs/openapi.json`
3. 导入后按 tag 自动生成 14 个目录、75 个接口；环境变量取自 `servers`（生产 / 测试 / 开发）。

## 修改接口后重新生成

规范由脚本生成，避免手写 JSON 出错：

```bash
node scripts/build-openapi.mjs        # 生成 docs/openapi.json
node scripts/validate-openapi.mjs     # 校验 $ref、operationId、路径参数等
```
