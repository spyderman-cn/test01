/**
 * 生成 OpenAPI 3.0.3 规范文件，供 Apifox / Swagger UI / Postman 导入。
 *
 * 用法：node scripts/build-openapi.mjs
 * 产物：docs/openapi.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 引用组件 */
const S = (name) => ({ $ref: `#/components/schemas/${name}` });

/** JSON 内容体 */
const json = (schema, example) => ({
  'application/json': example === undefined ? { schema } : { schema, example },
});

/** 统一响应 data 包装 */
const wrap = (data) => ({
  allOf: [S('BaseResponse'), { type: 'object', properties: { data } }],
});

const OK_EXAMPLE = {
  code: 0,
  message: 'ok',
  data: null,
  requestId: 'e3b0c442-98fc-4c14-9d3a-1b2c3d4e5f60',
  timestamp: 1793604720000,
};

/** 示例响应包装：ex(data) -> 完整响应体 */
const ex = (data) => ({ ...OK_EXAMPLE, data });

/** 成功响应 */
const ok = (desc, data, example) => ({
  200: { description: desc, content: json(wrap(data), example) },
});

/** 成功响应（带完整示例） */
const okEx = (desc, data, exampleData) => ok(desc, data, ex(exampleData));

/** 成功响应（data 为 null） */
const okNull = (desc) => ok(desc, { type: 'object', nullable: true }, ex(null));

const ERR_DESC = {
  400: '参数校验失败（code=10001/10003）',
  401: '未登录或令牌失效（code=20001/20002）',
  403: '无权限或未认证（code=20004/20005/20006）',
  404: '资源不存在（code=10008）',
  409: '状态冲突或重复提交（code=10009/10010）',
  429: '请求过于频繁（code=10007）',
  500: '服务端错误（code=10011）',
};

/** 错误响应集合 */
const errs = (...codes) =>
  Object.fromEntries(
    codes.map((c) => [
      c,
      { description: ERR_DESC[c], content: json(S('ErrorResponse')) },
    ]),
  );

/** 查询参数 */
const q = (name, schema, description, extra = {}) => ({
  name,
  in: 'query',
  description,
  schema,
  ...extra,
});

/** 路径参数 */
const pathParam = (name, description, schema = { type: 'string' }) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema,
});

/** 请求体 */
const body = (schema, example, required = true) => ({
  required,
  content: json(schema, example),
});

const pageParams = [
  q('page', { type: 'integer', default: 1, minimum: 1 }, '页码，从 1 开始'),
  q('pageSize', { type: 'integer', default: 20, maximum: 100 }, '每页条数，最大 100'),
];

const pageOf = (item) => ({
  allOf: [
    S('PageBase'),
    { type: 'object', properties: { list: { type: 'array', items: S(item) } } },
  ],
});

const AUDIT_STATUS = { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] };

const spec = {
  openapi: '3.0.3',
  info: {
    title: '校园二手交易平台 API',
    version: '1.0.0',
    description: [
      '校园二手交易平台前后端接口契约。仅服务校内用户，以面交为主，支持自提与邮寄。',
      '',
      '**通用约定**',
      '- 金额统一为整数，单位「分」；ID 统一为字符串（雪花 ID）。',
      '- 成功时 `code=0`；失败时 `code` 见错误码表，HTTP 状态码同步表达语义。',
      '- 除登录/注册等公开接口外，均需 `Authorization: Bearer <accessToken>`。',
      '- 时间格式为 ISO 8601 带时区，如 `2026-11-02T09:12:00+08:00`。',
    ].join('\n'),
    contact: { name: '后端接口维护', email: 'api@campus-market.example.com' },
    license: { name: 'Proprietary' },
  },
  servers: [
    { url: 'https://api.campus-market.example.com/v1', description: '生产环境' },
    { url: 'https://staging-api.campus-market.example.com/v1', description: '测试环境' },
    { url: 'https://dev-api.campus-market.example.com/v1', description: '开发环境' },
  ],
  tags: [
    { name: '认证与账号', description: '注册、登录、令牌刷新、密码管理' },
    { name: '用户与学生认证', description: '个人资料、他人主页、学生认证' },
    { name: '文件上传', description: '图片上传，返回 CDN 地址' },
    { name: '分类与校区', description: '商品分类树、校区字典' },
    { name: '商品', description: '发布、检索、详情、编辑、上下架' },
    { name: '收藏与浏览历史', description: '收藏、取消收藏、浏览记录' },
    { name: '订单', description: '下单、发货、确认、取消、退款、状态日志' },
    { name: '支付与退款', description: '创建支付单、查询、关单、渠道回调' },
    { name: '站内聊天', description: '会话与消息，配套 WebSocket 推送' },
    { name: '评价', description: '订单评价、用户评价列表、信用分' },
    { name: '举报', description: '违规商品/用户/消息举报' },
    { name: '通知', description: '站内通知与未读数' },
    { name: '管理后台', description: '审核、封禁、举报处理、统计（管理员）' },
    { name: '系统', description: '客户端配置、健康检查' },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '学生端令牌，通过 POST /auth/login 获取，有效期 2 小时',
      },
      adminAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '后台令牌，通过 POST /admin/auth/login 获取（含 TOTP 二次校验）',
      },
    },
    schemas: {
      BaseResponse: {
        type: 'object',
        required: ['code', 'message', 'requestId', 'timestamp'],
        properties: {
          code: { type: 'integer', description: '0 表示成功', example: 0 },
          message: { type: 'string', description: '提示信息', example: 'ok' },
          requestId: {
            type: 'string',
            description: '请求追踪 ID',
            example: 'e3b0c442-98fc-4c14-9d3a-1b2c3d4e5f60',
          },
          timestamp: {
            type: 'integer',
            format: 'int64',
            description: '服务端毫秒时间戳',
            example: 1793604720000,
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['code', 'message', 'requestId', 'timestamp'],
        properties: {
          code: { type: 'integer', description: '业务错误码，见错误码总表', example: 50002 },
          message: { type: 'string', example: '商品已被他人预订' },
          data: {
            type: 'object',
            nullable: true,
            example: null,
            description: '参数错误时为 { errors: [{ field, message }] }',
          },
          requestId: { type: 'string', example: 'e3b0c442-98fc-4c14-9d3a-1b2c3d4e5f60' },
          timestamp: { type: 'integer', format: 'int64', example: 1793604720000 },
        },
      },
      PageBase: {
        type: 'object',
        required: ['list', 'total', 'page', 'pageSize', 'hasMore'],
        properties: {
          list: { type: 'array', items: { type: 'object' } },
          total: { type: 'integer', example: 137 },
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 20 },
          hasMore: { type: 'boolean', example: true },
        },
      },
      Campus: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: '东校区' },
          address: { type: 'string', example: '示例市大学路 1 号' },
          lat: { type: 'number', format: 'double', example: 39.9042 },
          lng: { type: 'number', format: 'double', example: 116.4074 },
        },
      },
      School: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: '示例大学' },
        },
      },
      UserStats: {
        type: 'object',
        properties: {
          onSale: { type: 'integer', example: 3 },
          sold: { type: 'integer', example: 12 },
          bought: { type: 'integer', example: 5 },
          favorites: { type: 'integer', example: 8 },
        },
      },
      Verification: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'],
            example: 'APPROVED',
          },
          realName: { type: 'string', description: '脱敏姓名', example: '张*' },
          studentNo: { type: 'string', description: '脱敏学号', example: '2023****01' },
          submittedAt: { type: 'string', format: 'date-time', nullable: true },
          reviewedAt: { type: 'string', format: 'date-time', nullable: true },
          rejectReason: { type: 'string', nullable: true, example: null },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000001' },
          nickname: { type: 'string', example: '图书馆常驻' },
          avatar: { type: 'string', nullable: true, example: 'https://cdn.campus-market.example.com/avatar/1.jpg' },
          bio: { type: 'string', example: '数码爱好者，常在东区活动' },
          gender: { type: 'integer', enum: [0, 1, 2], description: '0 保密 / 1 男 / 2 女', example: 0 },
          phone: { type: 'string', description: '脱敏手机号', example: '138****1234' },
          email: { type: 'string', nullable: true, example: null },
          school: S('School'),
          campus: S('Campus'),
          verified: { type: 'boolean', example: true },
          verification: S('Verification'),
          creditScore: { type: 'integer', example: 96 },
          stats: S('UserStats'),
          role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-09-01T09:58:00+08:00' },
        },
      },
      UserSummary: {
        type: 'object',
        description: '公开可见的用户摘要（不含手机号、学号、真实姓名）',
        properties: {
          id: { type: 'string', example: '1900000000000001' },
          nickname: { type: 'string', example: '图书馆常驻' },
          avatar: { type: 'string', nullable: true },
          creditScore: { type: 'integer', example: 96 },
          verified: { type: 'boolean', example: true },
          soldCount: { type: 'integer', example: 12 },
        },
      },
      LoginResult: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy' },
          refreshToken: { type: 'string', example: 'rt_9f2c7b1e4a5d4c8e9f0a1b2c3d4e5f60' },
          expiresIn: { type: 'integer', description: 'access token 有效期（秒）', example: 7200 },
          user: S('User'),
        },
      },
      TokenPair: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'integer', example: 7200 },
        },
      },
      SmsCodeResult: {
        type: 'object',
        properties: {
          expiresIn: { type: 'integer', description: '验证码有效期（秒）', example: 300 },
          cooldown: { type: 'integer', description: '重发冷却（秒）', example: 60 },
        },
      },
      UploadResult: {
        type: 'object',
        properties: {
          url: { type: 'string', example: 'https://cdn.campus-market.example.com/product/20261102/abc123.jpg' },
          width: { type: 'integer', example: 1200 },
          height: { type: 'integer', example: 900 },
          size: { type: 'integer', description: '字节', example: 245678 },
          mimeType: { type: 'string', example: 'image/jpeg' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: '数码电子' },
          icon: { type: 'string', example: 'https://cdn.campus-market.example.com/cat/digital.png' },
          children: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 11 },
                name: { type: 'string', example: '手机' },
                productCount: { type: 'integer', example: 128 },
              },
            },
          },
        },
      },
      Condition: {
        type: 'integer',
        enum: [1, 2, 3, 4, 5],
        description: '1 全新 / 2 几乎全新 / 3 轻微使用痕迹 / 4 明显使用痕迹 / 5 功能正常外观破损',
        example: 2,
      },
      TradeType: {
        type: 'string',
        enum: ['MEET', 'SELF_PICKUP', 'EXPRESS'],
        description: 'MEET 校内面交 / SELF_PICKUP 自提 / EXPRESS 快递',
        example: 'MEET',
      },
      ProductStatus: {
        type: 'string',
        enum: ['DRAFT', 'PENDING', 'REJECTED', 'ON_SALE', 'RESERVED', 'SOLD', 'OFF_SHELF'],
        example: 'ON_SALE',
      },
      AuditStatus: AUDIT_STATUS,
      ProductSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000101' },
          title: { type: 'string', example: '九成新 Kindle Paperwhite 4 8G' },
          cover: { type: 'string', example: 'https://cdn.campus-market.example.com/product/a.jpg' },
          price: { type: 'integer', description: '单位分', example: 38000 },
          originalPrice: { type: 'integer', nullable: true, example: 99800 },
          condition: S('Condition'),
          status: S('ProductStatus'),
          tradeTypes: { type: 'array', items: S('TradeType') },
          campus: S('Campus'),
          seller: S('UserSummary'),
          stats: {
            type: 'object',
            properties: {
              views: { type: 'integer', example: 128 },
              favorites: { type: 'integer', example: 9 },
            },
          },
          createdAt: { type: 'string', format: 'date-time', example: '2026-11-02T10:12:00+08:00' },
        },
      },
      ProductDetail: {
        allOf: [
          S('ProductSummary'),
          {
            type: 'object',
            properties: {
              description: { type: 'string', example: '自用一年，屏幕无划痕，含原装保护套，可当面验货。' },
              categoryId: { type: 'integer', example: 13 },
              categoryPath: { type: 'array', items: { type: 'string' }, example: ['数码电子', '耳机音响'] },
              images: { type: 'array', items: { type: 'string' } },
              tags: { type: 'array', items: { type: 'string' }, example: ['可小刀', '含保护套'] },
              negotiable: { type: 'boolean', example: true },
              shippingFee: { type: 'integer', description: '单位分', example: 800 },
              meetPlace: { type: 'string', example: '图书馆南门' },
              stats: {
                type: 'object',
                properties: {
                  views: { type: 'integer', example: 129 },
                  favorites: { type: 'integer', example: 9 },
                  chats: { type: 'integer', example: 4 },
                },
              },
              favorited: { type: 'boolean', example: false },
              canBuy: { type: 'boolean', description: '是否允许当前用户下单', example: true },
              updatedAt: { type: 'string', format: 'date-time', example: '2026-11-02T10:12:00+08:00' },
            },
          },
        ],
      },
      ProductMutationResult: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000101' },
          status: S('ProductStatus'),
          auditStatus: S('AuditStatus'),
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      FavoriteResult: {
        type: 'object',
        properties: {
          favorited: { type: 'boolean', example: true },
          favoriteCount: { type: 'integer', example: 10 },
        },
      },
      OrderStatus: {
        type: 'string',
        enum: [
          'PENDING_PAYMENT',
          'PAID',
          'DELIVERING',
          'COMPLETED',
          'CANCELLED',
          'REFUNDING',
          'REFUNDED',
        ],
        example: 'PAID',
      },
      PayChannel: {
        type: 'string',
        enum: ['WECHAT', 'ALIPAY', 'CAMPUS_BALANCE'],
        example: 'WECHAT',
      },
      PayStatus: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED', 'CLOSED'], example: 'SUCCESS' },
      RefundStatus: { type: 'string', enum: ['PENDING', 'AGREED', 'REJECTED', 'SUCCESS'], example: 'PENDING' },
      OrderAmount: {
        type: 'object',
        properties: {
          goodsAmount: { type: 'integer', description: '商品金额（分）', example: 38000 },
          shippingFee: { type: 'integer', description: '运费（分）', example: 0 },
          discount: { type: 'integer', description: '优惠（分）', example: 0 },
          payAmount: { type: 'integer', description: '应付（分）', example: 38000 },
        },
      },
      MeetInfo: {
        type: 'object',
        properties: {
          campus: S('Campus'),
          place: { type: 'string', example: '图书馆南门' },
          expectTime: { type: 'string', format: 'date-time', nullable: true, example: '2026-11-03T18:00:00+08:00' },
        },
      },
      ExpressInfo: {
        type: 'object',
        nullable: true,
        properties: {
          company: { type: 'string', example: '顺丰' },
          trackingNo: { type: 'string', example: 'SF1234567890' },
          shippedAt: { type: 'string', format: 'date-time' },
        },
      },
      AddressInfo: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string', example: '1900000000000801' },
          receiver: { type: 'string', example: '张三' },
          phone: { type: 'string', example: '138****1234' },
          detail: { type: 'string', example: '东校区 3 号宿舍楼 401' },
        },
      },
      PaymentInfo: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000301' },
          channel: S('PayChannel'),
          status: S('PayStatus'),
          paidAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      OrderSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000201' },
          orderNo: { type: 'string', example: '20261102120000000001' },
          status: S('OrderStatus'),
          tradeType: S('TradeType'),
          product: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '1900000000000101' },
              title: { type: 'string', example: '九成新 Kindle Paperwhite 4 8G' },
              cover: { type: 'string' },
              price: { type: 'integer', example: 38000 },
            },
          },
          amount: S('OrderAmount'),
          counterparty: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '1900000000000002' },
              nickname: { type: 'string', example: '买家小李' },
              avatar: { type: 'string', nullable: true },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      OrderDetail: {
        allOf: [
          S('OrderSummary'),
          {
            type: 'object',
            properties: {
              buyer: S('UserSummary'),
              seller: S('UserSummary'),
              meetInfo: S('MeetInfo'),
              address: S('AddressInfo'),
              express: S('ExpressInfo'),
              remark: { type: 'string', nullable: true, example: '能带保护套一起给我吗' },
              payment: S('PaymentInfo'),
              timeline: {
                type: 'object',
                properties: {
                  createdAt: { type: 'string', format: 'date-time' },
                  paidAt: { type: 'string', format: 'date-time', nullable: true },
                  shippedAt: { type: 'string', format: 'date-time', nullable: true },
                  completedAt: { type: 'string', format: 'date-time', nullable: true },
                  cancelledAt: { type: 'string', format: 'date-time', nullable: true },
                  refundedAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
              reviewed: {
                type: 'object',
                properties: {
                  buyer: { type: 'boolean', example: false },
                  seller: { type: 'boolean', example: false },
                },
              },
              expireAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        ],
      },
      OrderLog: {
        type: 'object',
        properties: {
          from: { type: 'string', nullable: true, example: null },
          to: S('OrderStatus'),
          operator: { type: 'string', enum: ['BUYER', 'SELLER', 'SYSTEM', 'ADMIN'], example: 'BUYER' },
          remark: { type: 'string', example: '创建订单' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Refund: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000901' },
          orderId: { type: 'string', example: '1900000000000201' },
          amount: { type: 'integer', description: '单位分', example: 38000 },
          reason: { type: 'string', example: '屏幕有划痕，与描述不符' },
          images: { type: 'array', items: { type: 'string' } },
          status: S('RefundStatus'),
          rejectReason: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          handledAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      PaymentResult: {
        type: 'object',
        properties: {
          paymentId: { type: 'string', example: '1900000000000301' },
          payStatus: S('PayStatus'),
          channel: S('PayChannel'),
          expireAt: { type: 'string', format: 'date-time' },
          payParams: {
            type: 'object',
            description: '渠道调起参数。微信 JSAPI 为 appId/timeStamp/nonceStr/package/signType/paySign；支付宝为 orderString',
            example: {
              appId: 'wx1234567890abcdef',
              timeStamp: '1793604000',
              nonceStr: '5K8264ILTKCH16CQ2502SI8ZNMTM67VS',
              package: 'prepay_id=wx20261102120000abcdef',
              signType: 'RSA',
              paySign: 'oR9d8PuhnIc+YZ8cBHFCwfgpaK9gd7vaRvkYD7rthRAZ...',
            },
          },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000301' },
          orderId: { type: 'string', example: '1900000000000201' },
          channel: S('PayChannel'),
          status: S('PayStatus'),
          amount: { type: 'integer', example: 38000 },
          transactionId: { type: 'string', nullable: true, example: '4200001234202611021234567890' },
          paidAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cv_1900000000000501' },
          targetUser: S('UserSummary'),
          product: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', example: '1900000000000101' },
              title: { type: 'string', example: '九成新 Kindle' },
              cover: { type: 'string' },
              price: { type: 'integer', example: 38000 },
              status: S('ProductStatus'),
            },
          },
          lastMessage: {
            type: 'object',
            nullable: true,
            properties: {
              type: { type: 'string', enum: ['TEXT', 'IMAGE', 'PRODUCT_CARD', 'ORDER_CARD', 'SYSTEM'] },
              content: { type: 'string', example: '还在吗？' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          unreadCount: { type: 'integer', example: 2 },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'msg_1001' },
          senderId: { type: 'string', example: '1900000000000002' },
          type: { type: 'string', enum: ['TEXT', 'IMAGE', 'PRODUCT_CARD', 'ORDER_CARD', 'SYSTEM'] },
          content: { type: 'string', example: '还在吗？' },
          status: { type: 'string', enum: ['SENT', 'READ'], example: 'READ' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000401' },
          orderId: { type: 'string', example: '1900000000000201' },
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          tags: { type: 'array', items: { type: 'string' }, example: ['描述相符', '态度友好'] },
          content: { type: 'string', example: '东西和描述一致，卖家很守时。' },
          fromUser: S('UserSummary'),
          role: { type: 'string', enum: ['SELLER_TO_BUYER', 'BUYER_TO_SELLER'], example: 'SELLER_TO_BUYER' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ReviewSummary: {
        type: 'object',
        properties: {
          averageRating: { type: 'number', format: 'float', example: 4.8 },
          count: { type: 'integer', example: 25 },
          goodRate: { type: 'number', format: 'float', description: '好评率（%）', example: 96.0 },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000701' },
          type: {
            type: 'string',
            enum: ['ORDER', 'PAYMENT', 'PRODUCT', 'REVIEW', 'REPORT', 'SYSTEM'],
            example: 'ORDER',
          },
          title: { type: 'string', example: '买家已付款' },
          content: { type: 'string', example: '订单 20261102120000000001 已支付，请尽快安排面交或发货。' },
          payload: {
            type: 'object',
            description: '跳转参数，结构随 type 变化',
            example: { orderId: '1900000000000201' },
          },
          read: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Report: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000601' },
          targetType: { type: 'string', enum: ['PRODUCT', 'USER', 'ORDER', 'MESSAGE'], example: 'PRODUCT' },
          targetId: { type: 'string', example: '1900000000000101' },
          type: {
            type: 'string',
            enum: ['FAKE', 'PROHIBITED', 'FRAUD', 'ABUSE', 'SPAM', 'OTHER'],
            example: 'PROHIBITED',
          },
          description: { type: 'string', example: '商品图片中出现电动车电池，属于违规物品。' },
          images: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['PENDING', 'VALID', 'INVALID'], example: 'PENDING' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      StatsOverview: {
        type: 'object',
        properties: {
          users: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 12034 },
              new: { type: 'integer', example: 312 },
              verified: { type: 'integer', example: 9876 },
            },
          },
          products: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 8421 },
              onSale: { type: 'integer', example: 3120 },
              pendingAudit: { type: 'integer', example: 46 },
              sold: { type: 'integer', example: 4100 },
            },
          },
          orders: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 5120 },
              completed: { type: 'integer', example: 4380 },
              refunding: { type: 'integer', example: 12 },
              gmv: { type: 'integer', description: '单位分', example: 128640000 },
            },
          },
          reports: {
            type: 'object',
            properties: {
              pending: { type: 'integer', example: 8 },
              resolved: { type: 'integer', example: 96 },
            },
          },
          trend: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string', format: 'date', example: '2026-10-27' },
                orders: { type: 'integer', example: 120 },
                gmv: { type: 'integer', example: 3120000 },
              },
            },
          },
        },
      },
      SystemConfig: {
        type: 'object',
        properties: {
          appVersion: {
            type: 'object',
            properties: {
              min: { type: 'string', example: '1.0.0' },
              latest: { type: 'string', example: '1.3.2' },
              downloadUrl: { type: 'string' },
            },
          },
          upload: {
            type: 'object',
            properties: {
              maxSizeMB: { type: 'integer', example: 5 },
              maxImages: { type: 'integer', example: 9 },
              accept: { type: 'array', items: { type: 'string' }, example: ['jpg', 'png', 'webp'] },
            },
          },
          payment: {
            type: 'object',
            properties: {
              channels: { type: 'array', items: S('PayChannel') },
              campusBalanceLimit: { type: 'integer', description: '校园余额单笔上限（分）', example: 20000 },
            },
          },
          order: {
            type: 'object',
            properties: {
              paymentTimeoutMinutes: { type: 'integer', example: 15 },
              autoConfirmDays: { type: 'integer', example: 10 },
              refundWindowDays: { type: 'integer', example: 7 },
            },
          },
          features: {
            type: 'object',
            properties: {
              chat: { type: 'boolean', example: true },
              express: { type: 'boolean', example: true },
              recommend: { type: 'boolean', example: true },
            },
          },
          customerService: {
            type: 'object',
            properties: {
              qq: { type: 'string', example: '123456789' },
              workTime: { type: 'string', example: '09:00-21:00' },
            },
          },
        },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'UP' },
          components: {
            type: 'object',
            properties: {
              db: { type: 'string', example: 'UP' },
              redis: { type: 'string', example: 'UP' },
              mq: { type: 'string', example: 'UP' },
            },
          },
        },
      },
    },
  },
  paths: {},
};

const P = spec.paths;

/* ------------------------------------------------------------------ */
/* 认证与账号                                                          */
/* ------------------------------------------------------------------ */

P['/auth/sms-code'] = {
  post: {
    tags: ['认证与账号'],
    summary: '发送短信验证码',
    description: '验证码 5 分钟有效、6 位数字，同一验证码最多校验 5 次；同一手机号 1 次/分钟、5 次/天。',
    operationId: 'sendSmsCode',
    security: [],
    requestBody: body(
      {
        type: 'object',
        required: ['phone', 'scene'],
        properties: {
          phone: { type: 'string', description: '11 位手机号', example: '13800001234' },
          scene: {
            type: 'string',
            enum: ['REGISTER', 'LOGIN', 'RESET_PASSWORD'],
            example: 'REGISTER',
          },
        },
      },
      { phone: '13800001234', scene: 'REGISTER' },
    ),
    responses: {
      ...okEx('发送成功', S('SmsCodeResult'), { expiresIn: 300, cooldown: 60 }),
      ...errs(400, 429),
    },
  },
};

P['/auth/register'] = {
  post: {
    tags: ['认证与账号'],
    summary: '手机号注册',
    description: '注册成功直接返回令牌，避免二次登录。注册后需完成学生认证才能发布商品与下单。',
    operationId: 'register',
    security: [],
    requestBody: body(
      {
        type: 'object',
        required: ['phone', 'code', 'password', 'nickname', 'agreeTerms'],
        properties: {
          phone: { type: 'string', example: '13800001234' },
          code: { type: 'string', description: '短信验证码', example: '123456' },
          password: {
            type: 'string',
            description: '8-20 位，需含字母与数字',
            example: 'P@ssw0rd123',
          },
          nickname: { type: 'string', description: '2-20 字符', example: '图书馆常驻' },
          agreeTerms: { type: 'boolean', description: '必须为 true', example: true },
        },
      },
      {
        phone: '13800001234',
        code: '123456',
        password: 'P@ssw0rd123',
        nickname: '图书馆常驻',
        agreeTerms: true,
      },
    ),
    responses: {
      ...okEx('注册成功', S('LoginResult'), {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy',
        refreshToken: 'rt_9f2c7b1e4a5d4c8e9f0a1b2c3d4e5f60',
        expiresIn: 7200,
        user: {
          id: '1900000000000001',
          nickname: '图书馆常驻',
          avatar: null,
          creditScore: 80,
          verified: false,
          role: 'USER',
        },
      }),
      ...errs(400, 409, 429),
    },
  },
};

P['/auth/login'] = {
  post: {
    tags: ['认证与账号'],
    summary: '账号密码登录',
    description: '连续失败 3 次后需要图形验证码；5 分钟内失败 5 次锁定 15 分钟。',
    operationId: 'login',
    security: [],
    requestBody: body(
      {
        type: 'object',
        required: ['account', 'password'],
        properties: {
          account: { type: 'string', description: '手机号 / 邮箱 / 学号', example: '13800001234' },
          password: { type: 'string', example: 'P@ssw0rd123' },
          captcha: { type: 'string', description: '图形验证码，连续失败后必填', example: '8F2C' },
        },
      },
      { account: '13800001234', password: 'P@ssw0rd123' },
    ),
    responses: {
      ...okEx('登录成功', S('LoginResult'), {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy',
        refreshToken: 'rt_9f2c7b1e4a5d4c8e9f0a1b2c3d4e5f60',
        expiresIn: 7200,
        user: {
          id: '1900000000000001',
          nickname: '图书馆常驻',
          creditScore: 96,
          verified: true,
          role: 'USER',
        },
      }),
      ...errs(400, 403, 429),
    },
  },
};

P['/auth/login/sms'] = {
  post: {
    tags: ['认证与账号'],
    summary: '验证码登录',
    operationId: 'loginBySms',
    security: [],
    requestBody: body(
      {
        type: 'object',
        required: ['phone', 'code'],
        properties: {
          phone: { type: 'string', example: '13800001234' },
          code: { type: 'string', example: '123456' },
        },
      },
      { phone: '13800001234', code: '123456' },
    ),
    responses: {
      ...okEx('登录成功', S('LoginResult'), {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.yyy',
        refreshToken: 'rt_9f2c7b1e4a5d4c8e9f0a1b2c3d4e5f60',
        expiresIn: 7200,
        user: { id: '1900000000000001', nickname: '图书馆常驻', role: 'USER' },
      }),
      ...errs(400, 403, 429),
    },
  },
};

P['/auth/token/refresh'] = {
  post: {
    tags: ['认证与账号'],
    summary: '刷新令牌',
    description: '刷新令牌一次性轮换：返回新的 refreshToken，旧 token 立即失效。',
    operationId: 'refreshToken',
    security: [],
    requestBody: body(
      {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: 'rt_9f2c7b1e4a5d4c8e9f0a1b2c3d4e5f60' },
        },
      },
      { refreshToken: 'rt_9f2c7b1e4a5d4c8e9f0a1b2c3d4e5f60' },
    ),
    responses: {
      ...okEx('刷新成功', S('TokenPair'), {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx.zzz',
        refreshToken: 'rt_new_7c1e4a5d4c8e9f0a1b2c3d4e5f60a1b2',
        expiresIn: 7200,
      }),
      ...errs(400, 401),
    },
  },
};

P['/auth/logout'] = {
  post: {
    tags: ['认证与账号'],
    summary: '退出登录',
    description: '使当前 refreshToken 失效；accessToken 因短时效自然过期。',
    operationId: 'logout',
    responses: { ...okNull('退出成功'), ...errs(401) },
  },
};

P['/auth/password/reset'] = {
  post: {
    tags: ['认证与账号'],
    summary: '忘记密码重置',
    operationId: 'resetPassword',
    security: [],
    requestBody: body(
      {
        type: 'object',
        required: ['phone', 'code', 'newPassword'],
        properties: {
          phone: { type: 'string', example: '13800001234' },
          code: { type: 'string', description: 'scene=RESET_PASSWORD 的验证码', example: '123456' },
          newPassword: { type: 'string', example: 'N3wP@ssw0rd' },
        },
      },
      { phone: '13800001234', code: '123456', newPassword: 'N3wP@ssw0rd' },
    ),
    responses: { ...okNull('重置成功'), ...errs(400, 404) },
  },
};

P['/auth/password/change'] = {
  post: {
    tags: ['认证与账号'],
    summary: '修改密码',
    description: '修改成功后该用户全部 refreshToken 失效，客户端需重新登录。',
    operationId: 'changePassword',
    requestBody: body(
      {
        type: 'object',
        required: ['oldPassword', 'newPassword'],
        properties: {
          oldPassword: { type: 'string', example: 'P@ssw0rd123' },
          newPassword: { type: 'string', example: 'N3wP@ssw0rd' },
        },
      },
      { oldPassword: 'P@ssw0rd123', newPassword: 'N3wP@ssw0rd' },
    ),
    responses: { ...okNull('修改成功'), ...errs(400, 401) },
  },
};

/* ------------------------------------------------------------------ */
/* 用户与学生认证                                                      */
/* ------------------------------------------------------------------ */

P['/users/me'] = {
  get: {
    tags: ['用户与学生认证'],
    summary: '获取当前用户信息',
    operationId: 'getMe',
    responses: {
      ...okEx('当前用户', S('User'), {
        id: '1900000000000001',
        nickname: '图书馆常驻',
        avatar: 'https://cdn.campus-market.example.com/avatar/1.jpg',
        bio: '数码爱好者，常在东区活动',
        gender: 0,
        phone: '138****1234',
        school: { id: 1, name: '示例大学' },
        campus: { id: 1, name: '东校区' },
        verified: true,
        verification: {
          status: 'APPROVED',
          realName: '张*',
          studentNo: '2023****01',
          submittedAt: '2026-09-01T10:00:00+08:00',
          reviewedAt: '2026-09-01T15:20:00+08:00',
          rejectReason: null,
        },
        creditScore: 96,
        stats: { onSale: 3, sold: 12, bought: 5, favorites: 8 },
        role: 'USER',
        createdAt: '2026-09-01T09:58:00+08:00',
      }),
      ...errs(401),
    },
  },
  patch: {
    tags: ['用户与学生认证'],
    summary: '更新个人资料',
    description: '只更新传入字段，未传字段保持不变。contactWechat 仅在交易对交易对手可见。',
    operationId: 'updateMe',
    requestBody: body(
      {
        type: 'object',
        properties: {
          nickname: { type: 'string', description: '2-20 字符', example: '图书馆常驻' },
          avatar: { type: 'string', description: '先经上传接口获得的 URL', example: 'https://cdn.campus-market.example.com/avatar/1.jpg' },
          bio: { type: 'string', description: '≤ 100 字符', example: '数码爱好者，常在东区活动' },
          gender: { type: 'integer', enum: [0, 1, 2], example: 0 },
          campusId: { type: 'integer', example: 1 },
          contactWechat: { type: 'string', example: 'wx_abc123' },
        },
      },
      { nickname: '图书馆常驻', bio: '数码爱好者，常在东区活动', campusId: 1 },
    ),
    responses: { ...ok('更新成功，返回完整用户对象', S('User')), ...errs(400, 401, 404) },
  },
};

P['/users/me/avatar'] = {
  put: {
    tags: ['用户与学生认证'],
    summary: '更新头像',
    operationId: 'updateAvatar',
    requestBody: body(
      {
        type: 'object',
        required: ['url'],
        properties: { url: { type: 'string', example: 'https://cdn.campus-market.example.com/avatar/1.jpg' } },
      },
      { url: 'https://cdn.campus-market.example.com/avatar/1.jpg' },
    ),
    responses: { ...okNull('更新成功'), ...errs(400, 401) },
  },
};

P['/users/me/verification'] = {
  post: {
    tags: ['用户与学生认证'],
    summary: '提交学生认证',
    description: '审核 SLA 24 小时；通过后 verified=true，解锁发布与下单。',
    operationId: 'submitVerification',
    requestBody: body(
      {
        type: 'object',
        required: ['realName', 'studentNo', 'schoolId', 'studentCardImages'],
        properties: {
          realName: { type: 'string', description: '2-20 字', example: '张三' },
          studentNo: { type: 'string', description: '4-20 位字母数字', example: '2023010101' },
          schoolId: { type: 'integer', example: 1 },
          idCardNo: { type: 'string', description: '身份证号（部分学校要求）', example: '' },
          enrollmentYear: { type: 'integer', example: 2023 },
          studentCardImages: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: { type: 'string' },
            example: ['https://cdn.campus-market.example.com/verify/1.jpg'],
          },
        },
      },
      {
        realName: '张三',
        studentNo: '2023010101',
        schoolId: 1,
        enrollmentYear: 2023,
        studentCardImages: ['https://cdn.campus-market.example.com/verify/1.jpg'],
      },
    ),
    responses: {
      ...okEx('提交成功，待审核', S('Verification'), {
        status: 'PENDING',
        submittedAt: '2026-11-02T10:00:00+08:00',
      }),
      ...errs(400, 401, 409),
    },
  },
  get: {
    tags: ['用户与学生认证'],
    summary: '查询学生认证状态',
    operationId: 'getVerification',
    responses: { ...ok('认证状态', S('Verification')), ...errs(401) },
  },
};

P['/users/me/push-token'] = {
  post: {
    tags: ['用户与学生认证'],
    summary: '上报推送 token',
    description: '客户端启动或 token 变化时上报，用于离线推送。',
    operationId: 'reportPushToken',
    requestBody: body(
      {
        type: 'object',
        required: ['token', 'platform'],
        properties: {
          token: { type: 'string', example: 'fcm_or_apns_token' },
          platform: { type: 'string', enum: ['IOS', 'ANDROID', 'WEB'], example: 'IOS' },
        },
      },
      { token: 'fcm_or_apns_token', platform: 'IOS' },
    ),
    responses: { ...okNull('上报成功'), ...errs(401) },
  },
};

P['/users/{userId}'] = {
  get: {
    tags: ['用户与学生认证'],
    summary: '他人主页',
    description: '返回脱敏信息，不含手机号、学号、真实姓名。',
    operationId: 'getUser',
    security: [],
    parameters: [pathParam('userId', '用户 ID')],
    responses: {
      ...okEx('用户主页', S('User'), {
        id: '1900000000000001',
        nickname: '图书馆常驻',
        avatar: 'https://cdn.campus-market.example.com/avatar/1.jpg',
        bio: '数码爱好者，常在东区活动',
        campus: { id: 1, name: '东校区' },
        verified: true,
        creditScore: 96,
        stats: { onSale: 3, sold: 12, bought: 5, favorites: 8 },
        createdAt: '2026-09-01T09:58:00+08:00',
      }),
      ...errs(404),
    },
  },
};

P['/users/{userId}/products'] = {
  get: {
    tags: ['用户与学生认证'],
    summary: '他人在售商品',
    operationId: 'getUserProducts',
    security: [],
    parameters: [
      pathParam('userId', '用户 ID'),
      q('status', S('ProductStatus'), '商品状态，默认 ON_SALE'),
      ...pageParams,
    ],
    responses: {
      ...ok('商品分页', pageOf('ProductSummary')),
      ...errs(404),
    },
  },
};

P['/users/{userId}/reviews'] = {
  get: {
    tags: ['用户与学生认证'],
    summary: '用户收到的评价',
    operationId: 'getUserReviews',
    security: [],
    parameters: [pathParam('userId', '用户 ID'), ...pageParams],
    responses: {
      ...okEx(
        '评价分页',
        {
          allOf: [
            S('PageBase'),
            {
              type: 'object',
              properties: {
                list: { type: 'array', items: S('Review') },
                summary: S('ReviewSummary'),
              },
            },
          ],
        },
        {
          list: [
            {
              id: '1900000000000401',
              orderId: '1900000000000201',
              rating: 5,
              tags: ['描述相符', '态度友好'],
              content: '东西和描述一致，卖家很守时。',
              fromUser: { id: '1900000000000002', nickname: '买家小李', avatar: null },
              role: 'SELLER_TO_BUYER',
              createdAt: '2026-11-02T19:00:00+08:00',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
          hasMore: false,
          summary: { averageRating: 4.8, count: 25, goodRate: 96.0 },
        },
      ),
      ...errs(404),
    },
  },
};

/* ------------------------------------------------------------------ */
/* 文件上传                                                            */
/* ------------------------------------------------------------------ */

P['/files/images'] = {
  post: {
    tags: ['文件上传'],
    summary: '上传图片',
    description: '单张 ≤ 5MB，支持 jpg/png/webp；服务端压缩长边至 2048 并异步审核。',
    operationId: 'uploadImage',
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file', 'scene'],
            properties: {
              file: { type: 'string', format: 'binary', description: '图片文件' },
              scene: {
                type: 'string',
                enum: ['PRODUCT', 'AVATAR', 'CHAT', 'VERIFICATION', 'REPORT'],
                example: 'PRODUCT',
              },
            },
          },
        },
      },
    },
    responses: {
      ...okEx('上传成功', S('UploadResult'), {
        url: 'https://cdn.campus-market.example.com/product/20261102/abc123.jpg',
        width: 1200,
        height: 900,
        size: 245678,
        mimeType: 'image/jpeg',
      }),
      ...errs(400),
    },
  },
};

/* ------------------------------------------------------------------ */
/* 分类与校区                                                          */
/* ------------------------------------------------------------------ */

P['/categories'] = {
  get: {
    tags: ['分类与校区'],
    summary: '分类树',
    description: '两级分类，客户端可缓存 5 分钟。',
    operationId: 'getCategories',
    security: [],
    responses: {
      ...okEx('分类树', { type: 'array', items: S('Category') }, [
        {
          id: 1,
          name: '数码电子',
          icon: 'https://cdn.campus-market.example.com/cat/digital.png',
          children: [
            { id: 11, name: '手机', productCount: 128 },
            { id: 12, name: '电脑', productCount: 96 },
            { id: 13, name: '耳机音响', productCount: 74 },
          ],
        },
        {
          id: 2,
          name: '图书教材',
          children: [
            { id: 21, name: '教材教辅', productCount: 210 },
            { id: 22, name: '考研资料', productCount: 156 },
          ],
        },
      ]),
    },
  },
};

P['/campuses'] = {
  get: {
    tags: ['分类与校区'],
    summary: '校区列表',
    operationId: 'getCampuses',
    security: [],
    responses: {
      ...okEx('校区列表', { type: 'array', items: S('Campus') }, [
        { id: 1, name: '东校区', address: '示例市大学路 1 号', lat: 39.9042, lng: 116.4074 },
        { id: 2, name: '西校区', address: '示例市学院路 2 号', lat: 39.91, lng: 116.39 },
      ]),
    },
  },
};

/* ------------------------------------------------------------------ */
/* 商品                                                                */
/* ------------------------------------------------------------------ */

const productInput = {
  type: 'object',
  required: ['title', 'description', 'categoryId', 'price', 'condition', 'tradeTypes', 'images'],
  properties: {
    title: { type: 'string', description: '5-40 字符', example: '九成新 Kindle Paperwhite 4 8G' },
    description: {
      type: 'string',
      description: '10-2000 字符',
      example: '自用一年，屏幕无划痕，含原装保护套，可当面验货。',
    },
    categoryId: { type: 'integer', description: '叶子分类 ID', example: 13 },
    price: { type: 'integer', description: '单位分，1-99999999', example: 38000 },
    originalPrice: { type: 'integer', description: '单位分，用于展示折扣', example: 99800 },
    condition: S('Condition'),
    tradeTypes: { type: 'array', minItems: 1, items: S('TradeType'), example: ['MEET', 'EXPRESS'] },
    images: {
      type: 'array',
      minItems: 1,
      maxItems: 9,
      items: { type: 'string' },
      example: ['https://cdn.campus-market.example.com/product/a.jpg'],
    },
    campusId: { type: 'integer', description: 'MEET/SELF_PICKUP 时必填', example: 1 },
    meetPlace: { type: 'string', description: '面交地点，≤ 50 字符', example: '图书馆南门' },
    shippingFee: { type: 'integer', description: 'EXPRESS 必填，0 表示包邮', example: 800 },
    tags: { type: 'array', maxItems: 5, items: { type: 'string' }, example: ['可小刀', '含保护套'] },
    negotiable: { type: 'boolean', description: '是否接受砍价', example: true },
    draft: { type: 'boolean', description: 'true 保存草稿，不提交审核', example: false },
  },
};

P['/products'] = {
  post: {
    tags: ['商品'],
    summary: '发布商品',
    description: [
      '提交后进入机审（敏感词 + 图片），通过即 ON_SALE，疑似命中转人工（最长 2 小时）。',
      '需已完成学生认证。同一用户 24 小时内重复提交相同标题与图片会提示疑似重复发布。',
    ].join('\n'),
    operationId: 'createProduct',
    requestBody: body(productInput, {
      title: '九成新 Kindle Paperwhite 4 8G',
      description: '自用一年，屏幕无划痕，含原装保护套，可当面验货。',
      categoryId: 13,
      price: 38000,
      originalPrice: 99800,
      condition: 2,
      tradeTypes: ['MEET', 'EXPRESS'],
      images: [
        'https://cdn.campus-market.example.com/product/a.jpg',
        'https://cdn.campus-market.example.com/product/b.jpg',
      ],
      campusId: 1,
      meetPlace: '图书馆南门',
      shippingFee: 800,
      tags: ['可小刀', '含保护套'],
      negotiable: true,
      draft: false,
    }),
    responses: {
      ...okEx('发布成功', S('ProductMutationResult'), {
        id: '1900000000000101',
        status: 'PENDING',
        auditStatus: 'PENDING',
        createdAt: '2026-11-02T10:12:00+08:00',
      }),
      ...errs(400, 403, 404),
    },
  },
  get: {
    tags: ['商品'],
    summary: '商品列表 / 搜索',
    description: '多条件筛选，默认按最新发布排序；不返回待审核、驳回、下架、已售商品。',
    operationId: 'listProducts',
    security: [],
    parameters: [
      q('keyword', { type: 'string', maxLength: 50 }, '标题/描述模糊搜索'),
      q('categoryId', { type: 'integer' }, '分类 ID，传父分类则包含全部子分类'),
      q('campusId', { type: 'integer' }, '校区筛选'),
      q('minPrice', { type: 'integer', minimum: 0 }, '价格下限（分）'),
      q('maxPrice', { type: 'integer', minimum: 0 }, '价格上限（分）'),
      q(
        'condition',
        { type: 'array', items: { type: 'integer', minimum: 1, maximum: 5 } },
        '成色多选，如 condition=1&condition=2',
        { style: 'form', explode: true },
      ),
      q('tradeType', S('TradeType'), '交易方式'),
      q('sellerId', { type: 'string' }, '指定卖家'),
      q('sort', { type: 'string', enum: ['latest', 'price_asc', 'price_desc', 'hot', 'distance'] }, '排序，默认 latest'),
      q('lat', { type: 'number', format: 'double' }, 'sort=distance 时必填'),
      q('lng', { type: 'number', format: 'double' }, 'sort=distance 时必填'),
      ...pageParams,
    ],
    responses: {
      ...okEx('商品分页', pageOf('ProductSummary'), {
        list: [
          {
            id: '1900000000000101',
            title: '九成新 Kindle Paperwhite 4 8G',
            cover: 'https://cdn.campus-market.example.com/product/a.jpg',
            price: 38000,
            originalPrice: 99800,
            condition: 2,
            status: 'ON_SALE',
            tradeTypes: ['MEET', 'EXPRESS'],
            campus: { id: 1, name: '东校区' },
            seller: {
              id: '1900000000000001',
              nickname: '图书馆常驻',
              avatar: null,
              creditScore: 96,
              verified: true,
            },
            stats: { views: 128, favorites: 9 },
            createdAt: '2026-11-02T10:12:00+08:00',
          },
        ],
        total: 137,
        page: 1,
        pageSize: 20,
        hasMore: true,
      }),
      ...errs(400),
    },
  },
};

P['/products/{id}'] = {
  get: {
    tags: ['商品'],
    summary: '商品详情',
    description: '公开接口；下架/删除商品仅发布者本人可见。',
    operationId: 'getProduct',
    security: [],
    parameters: [pathParam('id', '商品 ID')],
    responses: {
      ...okEx('商品详情', S('ProductDetail'), {
        id: '1900000000000101',
        title: '九成新 Kindle Paperwhite 4 8G',
        description: '自用一年，屏幕无划痕，含原装保护套，可当面验货。',
        categoryId: 13,
        categoryPath: ['数码电子', '耳机音响'],
        price: 38000,
        originalPrice: 99800,
        condition: 2,
        tradeTypes: ['MEET', 'EXPRESS'],
        images: [
          'https://cdn.campus-market.example.com/product/a.jpg',
          'https://cdn.campus-market.example.com/product/b.jpg',
        ],
        tags: ['可小刀', '含保护套'],
        negotiable: true,
        shippingFee: 800,
        campus: { id: 1, name: '东校区' },
        meetPlace: '图书馆南门',
        status: 'ON_SALE',
        seller: {
          id: '1900000000000001',
          nickname: '图书馆常驻',
          creditScore: 96,
          verified: true,
          soldCount: 12,
        },
        stats: { views: 129, favorites: 9, chats: 4 },
        favorited: false,
        canBuy: true,
        createdAt: '2026-11-02T10:12:00+08:00',
        updatedAt: '2026-11-02T10:12:00+08:00',
      }),
      ...errs(404),
    },
  },
  patch: {
    tags: ['商品'],
    summary: '编辑商品',
    description: [
      '只更新传入字段，null 表示清空可选字段。',
      'ON_SALE 可改价格/描述/图片，改标题/分类/图片会触发重新审核（回 PENDING）；',
      'RESERVED 仅允许改描述与补充图片；PENDING 不可编辑；SOLD 仅允许追加描述。',
    ].join('\n'),
    operationId: 'updateProduct',
    parameters: [pathParam('id', '商品 ID')],
    requestBody: body({ ...productInput, required: [] }, { price: 36000, negotiable: true }),
    responses: { ...ok('更新成功', S('ProductDetail')), ...errs(400, 403, 404, 409) },
  },
  delete: {
    tags: ['商品'],
    summary: '删除商品',
    description: '软删除，7 天内可联系客服恢复；存在进行中订单时不允许删除。',
    operationId: 'deleteProduct',
    parameters: [pathParam('id', '商品 ID')],
    responses: { ...okNull('删除成功'), ...errs(403, 404, 409) },
  },
};

P['/products/{id}/status'] = {
  post: {
    tags: ['商品'],
    summary: '变更商品状态',
    description: 'ON_SALE 可下架或标记售出；OFF_SHELF 可重新上架（需重新审核）；RESERVED 不允许操作。',
    operationId: 'changeProductStatus',
    parameters: [pathParam('id', '商品 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['OFF_SHELF', 'ON_SALE', 'SOLD'], example: 'OFF_SHELF' },
          reason: { type: 'string', maxLength: 100, example: '不卖了' },
        },
      },
      { action: 'OFF_SHELF', reason: '不卖了' },
    ),
    responses: { ...ok('变更成功', S('ProductDetail')), ...errs(400, 403, 404, 409) },
  },
};

P['/products/mine'] = {
  get: {
    tags: ['商品'],
    summary: '我发布的商品',
    description: '返回全部非删除状态，含审核信息字段 audit。',
    operationId: 'listMyProducts',
    parameters: [
      q('status', { type: 'string' }, '状态多选，逗号分隔，如 PENDING,ON_SALE'),
      ...pageParams,
    ],
    responses: {
      ...okEx(
        '我的商品分页',
        {
          allOf: [
            S('PageBase'),
            {
              type: 'object',
              properties: {
                list: {
                  type: 'array',
                  items: {
                    allOf: [
                      S('ProductSummary'),
                      {
                        type: 'object',
                        properties: {
                          audit: {
                            type: 'object',
                            properties: {
                              status: S('AuditStatus'),
                              reason: { type: 'string', nullable: true },
                              reviewedAt: { type: 'string', format: 'date-time', nullable: true },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
        {
          list: [
            {
              id: '1900000000000101',
              title: '九成新 Kindle Paperwhite 4 8G',
              cover: 'https://cdn.campus-market.example.com/product/a.jpg',
              price: 38000,
              status: 'REJECTED',
              audit: {
                status: 'REJECTED',
                reason: '描述包含联系方式，请使用站内聊天',
                reviewedAt: '2026-11-02T11:00:00+08:00',
              },
              stats: { views: 0, favorites: 0 },
              createdAt: '2026-11-02T10:12:00+08:00',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
          hasMore: false,
        },
      ),
      ...errs(401),
    },
  },
};

P['/products/recommended'] = {
  get: {
    tags: ['商品'],
    summary: '猜你喜欢',
    description: '基于浏览/收藏/成交的推荐；冷启动回退为同校区热门商品。',
    operationId: 'getRecommendedProducts',
    security: [],
    parameters: [
      q('campusId', { type: 'integer' }, '校区 ID'),
      q('limit', { type: 'integer', default: 10, maximum: 30 }, '返回数量'),
    ],
    responses: {
      ...ok('推荐商品', { type: 'array', items: S('ProductSummary') }),
      ...errs(400),
    },
  },
};

/* ------------------------------------------------------------------ */
/* 收藏与浏览历史                                                      */
/* ------------------------------------------------------------------ */

P['/products/{id}/favorite'] = {
  post: {
    tags: ['收藏与浏览历史'],
    summary: '收藏商品',
    description: '重复收藏幂等返回成功。',
    operationId: 'favoriteProduct',
    parameters: [pathParam('id', '商品 ID')],
    responses: {
      ...okEx('收藏成功', S('FavoriteResult'), { favorited: true, favoriteCount: 10 }),
      ...errs(401, 404),
    },
  },
  delete: {
    tags: ['收藏与浏览历史'],
    summary: '取消收藏',
    operationId: 'unfavoriteProduct',
    parameters: [pathParam('id', '商品 ID')],
    responses: {
      ...okEx('已取消收藏', S('FavoriteResult'), { favorited: false, favoriteCount: 9 }),
      ...errs(401, 404),
    },
  },
};

P['/users/me/favorites'] = {
  get: {
    tags: ['收藏与浏览历史'],
    summary: '收藏列表',
    operationId: 'listFavorites',
    parameters: [...pageParams],
    responses: {
      ...ok('收藏商品分页（含 favoritedAt）', pageOf('ProductSummary')),
      ...errs(401),
    },
  },
};

P['/users/me/history'] = {
  get: {
    tags: ['收藏与浏览历史'],
    summary: '浏览历史',
    description: '同一商品仅保留最近一次，最多 200 条。',
    operationId: 'listHistory',
    parameters: [...pageParams],
    responses: {
      ...ok('浏览历史分页（含 viewedAt）', pageOf('ProductSummary')),
      ...errs(401),
    },
  },
  delete: {
    tags: ['收藏与浏览历史'],
    summary: '清空浏览历史',
    operationId: 'clearHistory',
    responses: { ...okNull('已清空'), ...errs(401) },
  },
};

/* ------------------------------------------------------------------ */
/* 订单                                                                */
/* ------------------------------------------------------------------ */

const idempotencyKey = (example) => ({
  name: 'Idempotency-Key',
  in: 'header',
  required: true,
  description: '幂等键（UUID），24 小时内相同 key 返回首次结果',
  schema: { type: 'string', format: 'uuid' },
  example,
});

P['/orders'] = {
  post: {
    tags: ['订单'],
    summary: '创建订单',
    description: [
      '下单即把商品置为 RESERVED 并锁定 15 分钟，超时或取消自动回滚 ON_SALE。',
      '同一买家对同一商品仅允许一个进行中订单；不能购买自己的商品；需完成学生认证。',
    ].join('\n'),
    operationId: 'createOrder',
    parameters: [idempotencyKey('6f1c2a9e-0b7d-4c1e-9a52-3d8f7e6b1c40')],
    requestBody: body(
      {
        type: 'object',
        required: ['productId', 'tradeType'],
        properties: {
          productId: { type: 'string', example: '1900000000000101' },
          tradeType: S('TradeType'),
          meetInfo: {
            type: 'object',
            description: 'MEET 时必填',
            required: ['campusId', 'place'],
            properties: {
              campusId: { type: 'integer', example: 1 },
              place: { type: 'string', maxLength: 50, example: '图书馆南门' },
              expectTime: { type: 'string', format: 'date-time', example: '2026-11-03T18:00:00+08:00' },
            },
          },
          addressId: { type: 'string', description: 'EXPRESS 时必填', example: '1900000000000801' },
          remark: { type: 'string', maxLength: 200, example: '能带保护套一起给我吗' },
          expectTime: { type: 'string', format: 'date-time' },
        },
      },
      {
        productId: '1900000000000101',
        tradeType: 'MEET',
        meetInfo: {
          campusId: 1,
          place: '图书馆南门',
          expectTime: '2026-11-03T18:00:00+08:00',
        },
        remark: '能带保护套一起给我吗',
      },
    ),
    responses: {
      ...okEx('下单成功', {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000201' },
          orderNo: { type: 'string', example: '20261102120000000001' },
          status: S('OrderStatus'),
          payAmount: { type: 'integer', description: '单位分', example: 38000 },
          expireAt: { type: 'string', format: 'date-time', example: '2026-11-02T12:15:00+08:00' },
        },
      }, {
        id: '1900000000000201',
        orderNo: '20261102120000000001',
        status: 'PENDING_PAYMENT',
        payAmount: 38000,
        expireAt: '2026-11-02T12:15:00+08:00',
      }),
      ...errs(400, 401, 403, 404, 409),
    },
  },
  get: {
    tags: ['订单'],
    summary: '我的订单',
    operationId: 'listOrders',
    parameters: [
      q('role', { type: 'string', enum: ['buyer', 'seller'], default: 'buyer' }, '角色'),
      q('status', { type: 'string' }, '状态多选，逗号分隔，如 PAID,DELIVERING'),
      ...pageParams,
    ],
    responses: {
      ...okEx('订单分页', pageOf('OrderSummary'), {
        list: [
          {
            id: '1900000000000201',
            orderNo: '20261102120000000001',
            status: 'PAID',
            tradeType: 'MEET',
            product: {
              id: '1900000000000101',
              title: '九成新 Kindle Paperwhite 4 8G',
              cover: 'https://cdn.campus-market.example.com/product/a.jpg',
              price: 38000,
            },
            amount: { goodsAmount: 38000, shippingFee: 0, discount: 0, payAmount: 38000 },
            counterparty: { id: '1900000000000002', nickname: '买家小李', avatar: null },
            createdAt: '2026-11-02T12:00:00+08:00',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      }),
      ...errs(400, 401),
    },
  },
};

P['/orders/{id}'] = {
  get: {
    tags: ['订单'],
    summary: '订单详情',
    description: '仅买卖双方可访问。',
    operationId: 'getOrder',
    parameters: [pathParam('id', '订单 ID')],
    responses: {
      ...okEx('订单详情', S('OrderDetail'), {
        id: '1900000000000201',
        orderNo: '20261102120000000001',
        status: 'PAID',
        tradeType: 'MEET',
        product: {
          id: '1900000000000101',
          title: '九成新 Kindle Paperwhite 4 8G',
          cover: 'https://cdn.campus-market.example.com/product/a.jpg',
          price: 38000,
        },
        buyer: { id: '1900000000000002', nickname: '买家小李', avatar: null, creditScore: 88 },
        seller: { id: '1900000000000001', nickname: '图书馆常驻', avatar: null, creditScore: 96 },
        amount: { goodsAmount: 38000, shippingFee: 0, discount: 0, payAmount: 38000 },
        meetInfo: {
          campus: { id: 1, name: '东校区' },
          place: '图书馆南门',
          expectTime: '2026-11-03T18:00:00+08:00',
        },
        address: null,
        express: null,
        remark: '能带保护套一起给我吗',
        payment: { id: '1900000000000301', channel: 'WECHAT', status: 'SUCCESS', paidAt: '2026-11-02T12:01:30+08:00' },
        timeline: {
          createdAt: '2026-11-02T12:00:00+08:00',
          paidAt: '2026-11-02T12:01:30+08:00',
          shippedAt: null,
          completedAt: null,
          cancelledAt: null,
          refundedAt: null,
        },
        reviewed: { buyer: false, seller: false },
        expireAt: null,
      }),
      ...errs(401, 403, 404),
    },
  },
};

P['/orders/{id}/cancel'] = {
  post: {
    tags: ['订单'],
    summary: '取消订单',
    description: 'PENDING_PAYMENT 直接取消并回滚商品；已付款订单需走退款流程。',
    operationId: 'cancelOrder',
    parameters: [pathParam('id', '订单 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['reason'],
        properties: { reason: { type: 'string', maxLength: 100, example: '临时不需要了' } },
      },
      { reason: '临时不需要了' },
    ),
    responses: { ...okNull('取消成功'), ...errs(400, 401, 403, 404, 409) },
  },
};

P['/orders/{id}/ship'] = {
  post: {
    tags: ['订单'],
    summary: '卖家发货',
    description: '仅 tradeType=EXPRESS 且 status=PAID 时可用。',
    operationId: 'shipOrder',
    parameters: [pathParam('id', '订单 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['company', 'trackingNo'],
        properties: {
          company: { type: 'string', example: '顺丰' },
          trackingNo: { type: 'string', description: '6-32 位', example: 'SF1234567890' },
        },
      },
      { company: '顺丰', trackingNo: 'SF1234567890' },
    ),
    responses: { ...ok('发货成功', S('OrderDetail')), ...errs(400, 401, 403, 404, 409) },
  },
};

P['/orders/{id}/confirm'] = {
  post: {
    tags: ['订单'],
    summary: '确认收货 / 面交完成',
    description: '面交与自提可直接确认；邮寄订单需先发货。',
    operationId: 'confirmOrder',
    parameters: [pathParam('id', '订单 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['confirm'],
        properties: { confirm: { type: 'boolean', description: '固定 true，防误触', example: true } },
      },
      { confirm: true },
    ),
    responses: {
      ...okEx('交易完成', {
        type: 'object',
        properties: {
          status: S('OrderStatus'),
          productStatus: S('ProductStatus'),
          creditDelta: { type: 'integer', example: 0 },
          completedAt: { type: 'string', format: 'date-time' },
        },
      }, {
        status: 'COMPLETED',
        productStatus: 'SOLD',
        creditDelta: 0,
        completedAt: '2026-11-02T18:20:00+08:00',
      }),
      ...errs(400, 401, 403, 404, 409),
    },
  },
};

P['/orders/{id}/refunds'] = {
  post: {
    tags: ['订单'],
    summary: '申请退款',
    description: 'PAID / DELIVERING 或 COMPLETED 后 7 天内可申请；同一订单同时仅一个进行中退款单。',
    operationId: 'applyRefund',
    parameters: [pathParam('id', '订单 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['amount', 'reason'],
        properties: {
          amount: { type: 'integer', description: '≤ 实付金额（分）', example: 38000 },
          reason: { type: 'string', maxLength: 300, example: '屏幕有划痕，与描述不符' },
          images: { type: 'array', maxItems: 6, items: { type: 'string' } },
        },
      },
      {
        amount: 38000,
        reason: '屏幕有划痕，与描述不符',
        images: ['https://cdn.campus-market.example.com/refund/1.jpg'],
      },
    ),
    responses: { ...ok('已提交，等待卖家处理', S('Refund')), ...errs(400, 401, 403, 404, 409) },
  },
};

P['/refunds/{id}/handle'] = {
  post: {
    tags: ['订单'],
    summary: '处理退款申请',
    description: '卖家同意则原路退款并回滚商品；48 小时未处理自动同意。',
    operationId: 'handleRefund',
    parameters: [pathParam('id', '退款单 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['AGREE', 'REJECT'], example: 'AGREE' },
          rejectReason: { type: 'string', maxLength: 200, description: 'REJECT 时必填' },
        },
      },
      { action: 'AGREE' },
    ),
    responses: { ...ok('处理完成', S('Refund')), ...errs(400, 401, 403, 404, 409) },
  },
};

P['/orders/{id}/logs'] = {
  get: {
    tags: ['订单'],
    summary: '订单状态流转日志',
    operationId: 'getOrderLogs',
    parameters: [pathParam('id', '订单 ID')],
    responses: {
      ...okEx('流转日志', { type: 'array', items: S('OrderLog') }, [
        { from: null, to: 'PENDING_PAYMENT', operator: 'BUYER', remark: '创建订单', createdAt: '2026-11-02T12:00:00+08:00' },
        { from: 'PENDING_PAYMENT', to: 'PAID', operator: 'SYSTEM', remark: '微信支付成功', createdAt: '2026-11-02T12:01:30+08:00' },
      ]),
      ...errs(401, 403, 404),
    },
  },
};

/* ------------------------------------------------------------------ */
/* 支付与退款                                                          */
/* ------------------------------------------------------------------ */

P['/payments'] = {
  post: {
    tags: ['支付与退款'],
    summary: '创建支付单',
    description: '返回渠道调起参数；校园余额直接返回 SUCCESS。客户端支付后应轮询 GET /payments/{id} 确认结果。',
    operationId: 'createPayment',
    parameters: [idempotencyKey('8a2b5c31-4d6e-4f70-8a91-b2c3d4e5f601')],
    requestBody: body(
      {
        type: 'object',
        required: ['orderId', 'channel'],
        properties: {
          orderId: { type: 'string', example: '1900000000000201' },
          channel: S('PayChannel'),
          returnUrl: { type: 'string', format: 'uri', description: 'H5 支付回跳地址' },
        },
      },
      {
        orderId: '1900000000000201',
        channel: 'WECHAT',
        returnUrl: 'https://m.campus-market.example.com/pay/result',
      },
    ),
    responses: {
      ...okEx('支付单已创建', S('PaymentResult'), {
        paymentId: '1900000000000301',
        payStatus: 'PENDING',
        channel: 'WECHAT',
        expireAt: '2026-11-02T12:15:00+08:00',
        payParams: {
          appId: 'wx1234567890abcdef',
          timeStamp: '1793604000',
          nonceStr: '5K8264ILTKCH16CQ2502SI8ZNMTM67VS',
          package: 'prepay_id=wx20261102120000abcdef',
          signType: 'RSA',
          paySign: 'oR9d8PuhnIc+YZ8cBHFCwfgpaK9gd7vaRvkYD7rthRAZ...',
        },
      }),
      ...errs(400, 401, 403, 404, 409),
    },
  },
};

P['/payments/{id}'] = {
  get: {
    tags: ['支付与退款'],
    summary: '查询支付状态',
    operationId: 'getPayment',
    parameters: [pathParam('id', '支付单 ID')],
    responses: {
      ...okEx('支付单', S('Payment'), {
        id: '1900000000000301',
        orderId: '1900000000000201',
        channel: 'WECHAT',
        status: 'SUCCESS',
        amount: 38000,
        transactionId: '4200001234202611021234567890',
        paidAt: '2026-11-02T12:01:30+08:00',
        createdAt: '2026-11-02T12:00:10+08:00',
      }),
      ...errs(401, 403, 404),
    },
  },
};

P['/payments/{id}/close'] = {
  post: {
    tags: ['支付与退款'],
    summary: '关闭支付单',
    description: '关闭未支付的支付单，同时取消订单并回滚商品。',
    operationId: 'closePayment',
    parameters: [pathParam('id', '支付单 ID')],
    responses: { ...okNull('已关闭'), ...errs(401, 403, 404, 409) },
  },
};

P['/payments/callback/{channel}'] = {
  post: {
    tags: ['支付与退款'],
    summary: '支付异步回调',
    description: [
      '渠道服务端回调，不做 JWT 鉴权，改为验签 + IP 白名单 + 金额校验。',
      '按 transactionId 去重，重复回调直接返回成功。',
    ].join('\n'),
    operationId: 'paymentCallback',
    security: [],
    parameters: [
      pathParam('channel', '渠道', { type: 'string', enum: ['wechat', 'alipay'] }),
    ],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
    },
    responses: {
      200: {
        description: '处理成功，按渠道要求返回',
        content: { 'text/plain': { schema: { type: 'string', example: 'SUCCESS' } } },
      },
      ...errs(400, 500),
    },
  },
};

P['/payments/callback/{channel}/refund'] = {
  post: {
    tags: ['支付与退款'],
    summary: '退款异步回调',
    operationId: 'refundCallback',
    security: [],
    parameters: [pathParam('channel', '渠道', { type: 'string', enum: ['wechat', 'alipay'] })],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
    },
    responses: {
      200: {
        description: '处理成功',
        content: { 'text/plain': { schema: { type: 'string', example: 'SUCCESS' } } },
      },
      ...errs(400, 500),
    },
  },
};

/* ------------------------------------------------------------------ */
/* 站内聊天                                                            */
/* ------------------------------------------------------------------ */

P['/conversations'] = {
  get: {
    tags: ['站内聊天'],
    summary: '会话列表',
    operationId: 'listConversations',
    parameters: [...pageParams],
    responses: {
      ...okEx('会话分页', pageOf('Conversation'), {
        list: [
          {
            id: 'cv_1900000000000501',
            targetUser: { id: '1900000000000001', nickname: '图书馆常驻', avatar: null },
            product: {
              id: '1900000000000101',
              title: '九成新 Kindle',
              cover: 'https://cdn.campus-market.example.com/product/a.jpg',
              price: 38000,
              status: 'ON_SALE',
            },
            lastMessage: { type: 'TEXT', content: '还在吗？', createdAt: '2026-11-02T12:10:00+08:00' },
            unreadCount: 2,
            updatedAt: '2026-11-02T12:10:00+08:00',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      }),
      ...errs(401),
    },
  },
  post: {
    tags: ['站内聊天'],
    summary: '打开 / 创建会话',
    description: '同一对用户 + 同一商品复用同一会话；不允许对自己发起会话。',
    operationId: 'createConversation',
    requestBody: body(
      {
        type: 'object',
        required: ['targetUserId'],
        properties: {
          targetUserId: { type: 'string', example: '1900000000000001' },
          productId: { type: 'string', description: '关联商品，便于上下文展示', example: '1900000000000101' },
        },
      },
      { targetUserId: '1900000000000001', productId: '1900000000000101' },
    ),
    responses: {
      ...okEx('会话', S('Conversation'), {
        id: 'cv_1900000000000501',
        targetUser: { id: '1900000000000001', nickname: '图书馆常驻', avatar: null },
        product: {
          id: '1900000000000101',
          title: '九成新 Kindle',
          cover: 'https://cdn.campus-market.example.com/product/a.jpg',
          price: 38000,
          status: 'ON_SALE',
        },
        unreadCount: 0,
        updatedAt: '2026-11-02T12:09:00+08:00',
      }),
      ...errs(400, 401, 404),
    },
  },
};

P['/conversations/{id}/messages'] = {
  get: {
    tags: ['站内聊天'],
    summary: '消息列表（游标分页）',
    description: '按时间正序返回；beforeId 用于上滑加载更早消息。',
    operationId: 'listMessages',
    parameters: [
      pathParam('id', '会话 ID'),
      q('beforeId', { type: 'string' }, '拉取该消息之前的历史'),
      q('limit', { type: 'integer', default: 20, maximum: 50 }, '每页条数'),
    ],
    responses: {
      ...okEx('消息列表', {
        type: 'object',
        properties: {
          list: { type: 'array', items: S('Message') },
          hasMore: { type: 'boolean', example: true },
        },
      }, {
        list: [
          {
            id: 'msg_1001',
            senderId: '1900000000000002',
            type: 'TEXT',
            content: '还在吗？',
            status: 'READ',
            createdAt: '2026-11-02T12:10:00+08:00',
          },
          {
            id: 'msg_1002',
            senderId: '1900000000000001',
            type: 'PRODUCT_CARD',
            content: '{"productId":"1900000000000101","title":"九成新 Kindle","price":38000}',
            status: 'SENT',
            createdAt: '2026-11-02T12:11:00+08:00',
          },
        ],
        hasMore: true,
      }),
      ...errs(401, 403, 404),
    },
  },
  post: {
    tags: ['站内聊天'],
    summary: '发送消息',
    description: 'TEXT 内容 ≤ 500 字符；IMAGE 传图片 URL；卡片类传 JSON 字符串。单用户 1 分钟超过 20 条触发限流。',
    operationId: 'sendMessage',
    parameters: [pathParam('id', '会话 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['type', 'content'],
        properties: {
          type: { type: 'string', enum: ['TEXT', 'IMAGE', 'PRODUCT_CARD', 'ORDER_CARD'], example: 'TEXT' },
          content: { type: 'string', example: '还在的，今晚 7 点图书馆南门？' },
        },
      },
      { type: 'TEXT', content: '还在的，今晚 7 点图书馆南门？' },
    ),
    responses: {
      ...okEx('已发送', S('Message'), {
        id: 'msg_1003',
        senderId: '1900000000000001',
        type: 'TEXT',
        content: '还在的，今晚 7 点图书馆南门？',
        status: 'SENT',
        createdAt: '2026-11-02T12:12:00+08:00',
      }),
      ...errs(400, 401, 403, 404, 429),
    },
  },
};

P['/conversations/{id}/read'] = {
  post: {
    tags: ['站内聊天'],
    summary: '标记已读',
    operationId: 'readConversation',
    parameters: [pathParam('id', '会话 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['lastMessageId'],
        properties: { lastMessageId: { type: 'string', example: 'msg_1003' } },
      },
      { lastMessageId: 'msg_1003' },
    ),
    responses: { ...okNull('已标记'), ...errs(401, 403, 404) },
  },
};

/* ------------------------------------------------------------------ */
/* 评价                                                                */
/* ------------------------------------------------------------------ */

P['/orders/{id}/reviews'] = {
  post: {
    tags: ['评价'],
    summary: '发表评价',
    description: [
      '仅 COMPLETED 订单可评价，每方仅一次；7 天内可修改一次。',
      '双方评价后才互相可见，超时 7 天自动展示单方评价。',
    ].join('\n'),
    operationId: 'createReview',
    parameters: [pathParam('id', '订单 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['rating'],
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          tags: { type: 'array', maxItems: 3, items: { type: 'string' }, example: ['描述相符', '态度友好'] },
          content: { type: 'string', maxLength: 300, example: '东西和描述一致，卖家很守时。' },
          anonymous: { type: 'boolean', default: false, example: false },
        },
      },
      { rating: 5, tags: ['描述相符', '态度友好'], content: '东西和描述一致，卖家很守时。', anonymous: false },
    ),
    responses: {
      ...okEx('评价成功', {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1900000000000401' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      }, { id: '1900000000000401', createdAt: '2026-11-02T19:00:00+08:00' }),
      ...errs(400, 401, 403, 404, 409),
    },
  },
};

P['/products/{id}/reviews'] = {
  get: {
    tags: ['评价'],
    summary: '商品相关评价',
    operationId: 'listProductReviews',
    security: [],
    parameters: [pathParam('id', '商品 ID'), ...pageParams],
    responses: {
      ...ok('评价分页', pageOf('Review')),
      ...errs(404),
    },
  },
};

/* ------------------------------------------------------------------ */
/* 举报                                                                */
/* ------------------------------------------------------------------ */

P['/reports'] = {
  post: {
    tags: ['举报'],
    summary: '提交举报',
    description: '处理 SLA 48 小时；核实成立时商品下架 / 用户封禁并通知举报人。',
    operationId: 'createReport',
    requestBody: body(
      {
        type: 'object',
        required: ['targetType', 'targetId', 'type', 'description'],
        properties: {
          targetType: { type: 'string', enum: ['PRODUCT', 'USER', 'ORDER', 'MESSAGE'], example: 'PRODUCT' },
          targetId: { type: 'string', example: '1900000000000101' },
          type: {
            type: 'string',
            enum: ['FAKE', 'PROHIBITED', 'FRAUD', 'ABUSE', 'SPAM', 'OTHER'],
            example: 'PROHIBITED',
          },
          description: { type: 'string', minLength: 10, maxLength: 500, example: '商品图片中出现电动车电池，属于违规物品。' },
          images: { type: 'array', maxItems: 6, items: { type: 'string' } },
        },
      },
      {
        targetType: 'PRODUCT',
        targetId: '1900000000000101',
        type: 'PROHIBITED',
        description: '商品图片中出现电动车电池，属于违规物品。',
        images: ['https://cdn.campus-market.example.com/report/1.jpg'],
      },
    ),
    responses: {
      ...okEx('已提交', S('Report'), {
        id: '1900000000000601',
        targetType: 'PRODUCT',
        targetId: '1900000000000101',
        type: 'PROHIBITED',
        description: '商品图片中出现电动车电池，属于违规物品。',
        images: [],
        status: 'PENDING',
        createdAt: '2026-11-02T13:00:00+08:00',
      }),
      ...errs(400, 401, 404, 409),
    },
  },
};

P['/users/me/reports'] = {
  get: {
    tags: ['举报'],
    summary: '我的举报记录',
    operationId: 'listMyReports',
    parameters: [...pageParams],
    responses: { ...ok('举报分页', pageOf('Report')), ...errs(401) },
  },
};

/* ------------------------------------------------------------------ */
/* 通知                                                                */
/* ------------------------------------------------------------------ */

P['/notifications'] = {
  get: {
    tags: ['通知'],
    summary: '通知列表',
    operationId: 'listNotifications',
    parameters: [
      q('type', { type: 'string', enum: ['ORDER', 'PAYMENT', 'PRODUCT', 'REVIEW', 'REPORT', 'SYSTEM'] }, '通知类型'),
      q('unreadOnly', { type: 'boolean', default: false }, '只看未读'),
      ...pageParams,
    ],
    responses: {
      ...okEx('通知分页', pageOf('Notification'), {
        list: [
          {
            id: '1900000000000701',
            type: 'ORDER',
            title: '买家已付款',
            content: '订单 20261102120000000001 已支付，请尽快安排面交或发货。',
            payload: { orderId: '1900000000000201' },
            read: false,
            createdAt: '2026-11-02T12:01:31+08:00',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      }),
      ...errs(401),
    },
  },
};

P['/notifications/unread-count'] = {
  get: {
    tags: ['通知'],
    summary: '未读数量',
    operationId: 'getUnreadCount',
    responses: {
      ...okEx('未读数', {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 3 },
          byType: {
            type: 'object',
            additionalProperties: { type: 'integer' },
            example: { ORDER: 2, SYSTEM: 1 },
          },
        },
      }, { total: 3, byType: { ORDER: 2, SYSTEM: 1 } }),
      ...errs(401),
    },
  },
};

P['/notifications/read'] = {
  post: {
    tags: ['通知'],
    summary: '标记已读',
    description: '传 ids 则标记指定通知；不传 ids 则全部已读，可配合 type 只清某类。',
    operationId: 'readNotifications',
    requestBody: body(
      {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' } },
          type: { type: 'string', enum: ['ORDER', 'PAYMENT', 'PRODUCT', 'REVIEW', 'REPORT', 'SYSTEM'] },
        },
      },
      { ids: ['1900000000000701'] },
      false,
    ),
    responses: { ...okNull('已标记'), ...errs(401) },
  },
};

/* ------------------------------------------------------------------ */
/* 管理后台                                                            */
/* ------------------------------------------------------------------ */

const adminSecurity = [{ adminAuth: [] }];

P['/admin/auth/login'] = {
  post: {
    tags: ['管理后台'],
    summary: '后台登录',
    description: '账号 + 密码 + TOTP 二次校验；后台 token 与学生端 token 不通用。',
    operationId: 'adminLogin',
    security: [],
    requestBody: body(
      {
        type: 'object',
        required: ['account', 'password', 'totp'],
        properties: {
          account: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'Adm1n@2026' },
          totp: { type: 'string', description: '6 位动态口令', example: '123456' },
        },
      },
      { account: 'admin', password: 'Adm1n@2026', totp: '123456' },
    ),
    responses: {
      ...okEx('登录成功', S('LoginResult'), {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin',
        refreshToken: 'rt_admin_9f2c7b1e4a5d',
        expiresIn: 7200,
        user: { id: '1900000000000009', nickname: '运营小王', role: 'ADMIN' },
      }),
      ...errs(400, 401, 403, 429),
    },
  },
};

P['/admin/products'] = {
  get: {
    tags: ['管理后台'],
    summary: '商品检索（全状态）',
    operationId: 'adminListProducts',
    security: adminSecurity,
    parameters: [
      q('keyword', { type: 'string' }, '标题/描述搜索'),
      q('status', S('ProductStatus'), '商品状态'),
      q('auditStatus', S('AuditStatus'), '审核状态'),
      ...pageParams,
    ],
    responses: { ...ok('商品分页', pageOf('ProductSummary')), ...errs(401, 403) },
  },
};

P['/admin/products/pending'] = {
  get: {
    tags: ['管理后台'],
    summary: '待审核商品列表',
    operationId: 'adminListPendingProducts',
    security: adminSecurity,
    parameters: [...pageParams],
    responses: { ...ok('待审核分页', pageOf('ProductSummary')), ...errs(401, 403) },
  },
};

P['/admin/products/{id}/audit'] = {
  post: {
    tags: ['管理后台'],
    summary: '审核商品',
    description: '通过则 ON_SALE 并通知卖家；驳回则 REJECTED，卖家可修改后重提。',
    operationId: 'adminAuditProduct',
    security: adminSecurity,
    parameters: [pathParam('id', '商品 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['APPROVE', 'REJECT'], example: 'REJECT' },
          reason: { type: 'string', maxLength: 200, description: 'REJECT 时必填' },
          violationType: {
            type: 'string',
            enum: ['PROHIBITED', 'CONTACT', 'MISLEADING', 'OTHER'],
            example: 'CONTACT',
          },
        },
      },
      { action: 'REJECT', reason: '描述包含微信号，请使用站内聊天联系买家', violationType: 'CONTACT' },
    ),
    responses: { ...okNull('审核完成'), ...errs(400, 401, 403, 404) },
  },
};

P['/admin/users/{id}/ban'] = {
  post: {
    tags: ['管理后台'],
    summary: '封禁 / 解封用户',
    description: '封禁后该用户所有 token 立即失效，在售商品全部下架。',
    operationId: 'adminBanUser',
    security: adminSecurity,
    parameters: [pathParam('id', '用户 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['action', 'reason'],
        properties: {
          action: { type: 'string', enum: ['BAN', 'UNBAN'], example: 'BAN' },
          reason: { type: 'string', maxLength: 200, example: '发布违禁品，屡次提醒不改' },
          durationDays: { type: 'integer', minimum: 0, maximum: 3650, description: '0 表示永久，BAN 时必填', example: 30 },
        },
      },
      { action: 'BAN', reason: '发布违禁品，屡次提醒不改', durationDays: 30 },
    ),
    responses: { ...okNull('操作成功'), ...errs(400, 401, 403, 404) },
  },
};

P['/admin/reports'] = {
  get: {
    tags: ['管理后台'],
    summary: '举报列表',
    operationId: 'adminListReports',
    security: adminSecurity,
    parameters: [
      q('status', { type: 'string', enum: ['PENDING', 'VALID', 'INVALID'] }, '处理状态'),
      q('type', { type: 'string', enum: ['FAKE', 'PROHIBITED', 'FRAUD', 'ABUSE', 'SPAM', 'OTHER'] }, '举报类型'),
      ...pageParams,
    ],
    responses: { ...ok('举报分页', pageOf('Report')), ...errs(401, 403) },
  },
};

P['/admin/reports/{id}/handle'] = {
  post: {
    tags: ['管理后台'],
    summary: '处理举报',
    operationId: 'adminHandleReport',
    security: adminSecurity,
    parameters: [pathParam('id', '举报 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['result'],
        properties: {
          result: { type: 'string', enum: ['VALID', 'INVALID'], example: 'VALID' },
          action: { type: 'string', enum: ['NONE', 'OFF_SHELF', 'BAN_USER'], example: 'OFF_SHELF' },
          remark: { type: 'string', maxLength: 200 },
        },
      },
      { result: 'VALID', action: 'OFF_SHELF', remark: '图片确含违规电池，已下架' },
    ),
    responses: { ...okNull('处理完成'), ...errs(400, 401, 403, 404) },
  },
};

P['/admin/categories'] = {
  get: {
    tags: ['管理后台'],
    summary: '分类列表（含停用项）',
    operationId: 'adminListCategories',
    security: adminSecurity,
    responses: { ...ok('分类树', { type: 'array', items: S('Category') }), ...errs(401, 403) },
  },
  post: {
    tags: ['管理后台'],
    summary: '新增分类',
    operationId: 'adminCreateCategory',
    security: adminSecurity,
    requestBody: body(
      {
        type: 'object',
        required: ['name', 'parentId'],
        properties: {
          name: { type: 'string', maxLength: 20, example: '乐器' },
          parentId: { type: 'integer', description: '0 表示一级分类', example: 0 },
          icon: { type: 'string' },
          sort: { type: 'integer', description: '排序值，越小越靠前', example: 10 },
        },
      },
      { name: '乐器', parentId: 0, sort: 10 },
    ),
    responses: { ...ok('创建成功', S('Category')), ...errs(400, 401, 403, 409) },
  },
};

P['/admin/categories/{id}'] = {
  patch: {
    tags: ['管理后台'],
    summary: '修改分类',
    operationId: 'adminUpdateCategory',
    security: adminSecurity,
    parameters: [pathParam('id', '分类 ID', { type: 'integer' })],
    requestBody: body(
      {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 20 },
          icon: { type: 'string' },
          sort: { type: 'integer' },
          enabled: { type: 'boolean', description: 'false 表示停用，前端不再展示', example: true },
        },
      },
      { name: '乐器音响', sort: 5 },
    ),
    responses: { ...ok('更新成功', S('Category')), ...errs(400, 401, 403, 404) },
  },
  delete: {
    tags: ['管理后台'],
    summary: '删除分类',
    description: '分类下存在商品时不允许删除。',
    operationId: 'adminDeleteCategory',
    security: adminSecurity,
    parameters: [pathParam('id', '分类 ID', { type: 'integer' })],
    responses: { ...okNull('删除成功'), ...errs(401, 403, 404, 409) },
  },
};

P['/admin/orders'] = {
  get: {
    tags: ['管理后台'],
    summary: '订单检索',
    operationId: 'adminListOrders',
    security: adminSecurity,
    parameters: [
      q('keyword', { type: 'string' }, '订单号 / 商品标题'),
      q('status', S('OrderStatus'), '订单状态'),
      ...pageParams,
    ],
    responses: { ...ok('订单分页', pageOf('OrderSummary')), ...errs(401, 403) },
  },
};

P['/admin/orders/{id}/refund'] = {
  post: {
    tags: ['管理后台'],
    summary: '强制退款',
    description: '平台介入时使用，绕过卖家确认。',
    operationId: 'adminRefundOrder',
    security: adminSecurity,
    parameters: [pathParam('id', '订单 ID')],
    requestBody: body(
      {
        type: 'object',
        required: ['amount', 'reason'],
        properties: {
          amount: { type: 'integer', description: '单位分', example: 38000 },
          reason: { type: 'string', maxLength: 300, example: '平台介入：商品与描述严重不符' },
        },
      },
      { amount: 38000, reason: '平台介入：商品与描述严重不符' },
    ),
    responses: { ...ok('退款已发起', S('Refund')), ...errs(400, 401, 403, 404, 409) },
  },
};

P['/admin/stats/overview'] = {
  get: {
    tags: ['管理后台'],
    summary: '概览统计',
    operationId: 'adminStatsOverview',
    security: adminSecurity,
    parameters: [
      q('from', { type: 'string', format: 'date' }, '开始日期，默认近 7 天', { example: '2026-10-27' }),
      q('to', { type: 'string', format: 'date' }, '结束日期', { example: '2026-11-02' }),
    ],
    responses: {
      ...okEx('统计概览', S('StatsOverview'), {
        users: { total: 12034, new: 312, verified: 9876 },
        products: { total: 8421, onSale: 3120, pendingAudit: 46, sold: 4100 },
        orders: { total: 5120, completed: 4380, refunding: 12, gmv: 128640000 },
        reports: { pending: 8, resolved: 96 },
        trend: [
          { date: '2026-10-27', orders: 120, gmv: 3120000 },
          { date: '2026-10-28', orders: 138, gmv: 3550000 },
        ],
      }),
      ...errs(400, 401, 403),
    },
  },
};

/* ------------------------------------------------------------------ */
/* 系统                                                                */
/* ------------------------------------------------------------------ */

P['/system/config'] = {
  get: {
    tags: ['系统'],
    summary: '客户端配置',
    description: '启动时拉取并缓存 30 分钟；appVersion.min 以下强制升级。',
    operationId: 'getSystemConfig',
    security: [],
    responses: {
      ...okEx('配置', S('SystemConfig'), {
        appVersion: { min: '1.0.0', latest: '1.3.2', downloadUrl: 'https://cdn.campus-market.example.com/app/latest.apk' },
        upload: { maxSizeMB: 5, maxImages: 9, accept: ['jpg', 'png', 'webp'] },
        payment: { channels: ['WECHAT', 'ALIPAY'], campusBalanceLimit: 20000 },
        order: { paymentTimeoutMinutes: 15, autoConfirmDays: 10, refundWindowDays: 7 },
        features: { chat: true, express: true, recommend: true },
        customerService: { qq: '123456789', workTime: '09:00-21:00' },
      }),
    },
  },
};

P['/system/health'] = {
  get: {
    tags: ['系统'],
    summary: '健康检查',
    operationId: 'health',
    security: [],
    responses: {
      ...okEx('服务状态', S('Health'), {
        status: 'UP',
        components: { db: 'UP', redis: 'UP', mq: 'UP' },
      }),
    },
  },
};

// __END__

writeFileSync(join(ROOT, 'docs', 'openapi.json'), JSON.stringify(spec, null, 2) + '\n', 'utf8');
console.log('docs/openapi.json written, paths =', Object.keys(P).length);
