<template>
  <div class="page publish-page">
    <div class="container">
      <div class="page-head">
        <div>
          <h1>发布闲置</h1>
          <p class="muted">把用不上的东西，交给需要的同学。发布后通过机审即可展示。</p>
        </div>
        <el-button text @click="router.back()">返回</el-button>
      </div>

      <el-alert
        v-if="!user.isVerified"
        type="warning"
        show-icon
        :closable="false"
        class="verify-alert"
      >
        <template #title>
          你还没有完成学生认证，认证后才能发布商品。
          <el-button text type="primary" @click="router.push({ name: 'profile' })">去认证 →</el-button>
        </template>
      </el-alert>

      <div class="publish-grid">
        <section class="form-card card">
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <el-form-item label="标题" prop="title">
              <el-input v-model="form.title" maxlength="40" show-word-limit placeholder="例如：九成新 Kindle Paperwhite 4 8G" />
            </el-form-item>

            <el-form-item label="描述" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="5"
                maxlength="2000"
                show-word-limit
                placeholder="写清购入时间、使用情况、瑕疵和配件，越具体越容易成交"
              />
            </el-form-item>

            <div class="form-row">
              <el-form-item label="分类" prop="categoryId" class="flex-1">
                <el-select v-model="form.categoryId" placeholder="选择分类" filterable>
                  <el-option-group v-for="cat in catalog.categories" :key="cat.id" :label="cat.name">
                    <el-option
                      v-for="child in cat.children"
                      :key="child.id"
                      :label="`${cat.name} / ${child.name}`"
                      :value="child.id"
                    />
                  </el-option-group>
                </el-select>
              </el-form-item>
              <el-form-item label="成色" prop="condition" class="flex-1">
                <el-select v-model="form.condition" placeholder="选择成色">
                  <el-option v-for="c in CONDITIONS" :key="c.value" :label="c.label" :value="c.value" />
                </el-select>
              </el-form-item>
            </div>

            <div class="form-row">
              <el-form-item label="售价（元）" prop="price" class="flex-1">
                <el-input-number v-model="form.price" :min="0.01" :precision="2" :step="10" controls-position="right" style="width: 100%" />
              </el-form-item>
              <el-form-item label="原价（元，选填）" class="flex-1">
                <el-input-number v-model="form.originalPrice" :min="0" :precision="2" :step="10" controls-position="right" style="width: 100%" />
              </el-form-item>
            </div>

            <el-form-item label="交易方式" prop="tradeTypes">
              <el-checkbox-group v-model="form.tradeTypes">
                <el-checkbox-button v-for="t in TRADE_TYPES" :key="t.value" :value="t.value">
                  {{ t.label }}
                </el-checkbox-button>
              </el-checkbox-group>
            </el-form-item>

            <div class="form-row">
              <el-form-item label="校区" prop="campusId" class="flex-1">
                <el-select v-model="form.campusId" placeholder="选择校区">
                  <el-option v-for="c in catalog.campuses" :key="c.id" :label="c.name" :value="c.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="面交地点" prop="meetPlace" class="flex-1">
                <el-input v-model="form.meetPlace" maxlength="50" placeholder="例如：图书馆南门" />
              </el-form-item>
            </div>

            <el-form-item v-if="form.tradeTypes.includes('EXPRESS')" label="邮寄运费（元，0 表示包邮）">
              <el-input-number v-model="form.shippingFee" :min="0" :precision="2" :step="2" controls-position="right" />
            </el-form-item>

            <el-form-item label="图片" prop="images">
              <div class="uploader">
                <div v-for="(image, index) in form.images" :key="index" class="tile">
                  <img :src="image" :alt="`图片 ${index + 1}`" />
                  <button type="button" class="del" @click="removeImage(index)">×</button>
                </div>
                <button
                  v-if="form.images.length < 9"
                  type="button"
                  class="tile add"
                  :disabled="uploading"
                  @click="pickFiles"
                >
                  <el-icon :size="22"><Plus /></el-icon>
                  <span>{{ uploading ? '上传中' : '添加图片' }}</span>
                </button>
                <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFiles" />
              </div>
              <p class="hint">最多 9 张，支持 jpg / png / webp，单张不超过 5MB。第一张作为封面。</p>
            </el-form-item>

            <el-form-item label="标签（可自定义）">
              <el-select
                v-model="form.tags"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="例如：可小刀、含配件，回车创建"
                style="width: 100%"
              >
                <el-option v-for="tag in tagPresets" :key="tag" :label="tag" :value="tag" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-checkbox v-model="form.negotiable">接受砍价</el-checkbox>
            </el-form-item>

            <div class="submit-row">
              <el-button @click="router.back()">取消</el-button>
              <el-button type="primary" size="large" :loading="submitting" @click="submit">立即发布</el-button>
            </div>
          </el-form>
        </section>

        <aside class="tips">
          <div class="card tip-card">
            <h3>发布小贴士</h3>
            <ul>
              <li>标题写清「品牌 + 型号 + 容量 / 尺寸」，更容易被搜到。</li>
              <li>如实描述瑕疵，能减少一半的沟通成本。</li>
              <li>面交地点建议选人流密集处：图书馆门口、食堂广场。</li>
              <li>不要留微信 / QQ，站内聊天同样方便且可追溯。</li>
            </ul>
          </div>
          <div class="card tip-card">
            <h3>审核规则</h3>
            <p>发布后会经过敏感词与图片审核，通常几秒内完成；命中疑似违规会转人工，最长 2 小时。</p>
            <p>违禁品（管制刀具、电动车电池等）会被直接驳回。</p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createProduct } from '@/api/product'
import { uploadImage } from '@/api/upload'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import { CONDITIONS, TRADE_TYPES } from '@/utils/constants'

const router = useRouter()
const catalog = useCatalogStore()
const user = useUserStore()

const formRef = ref(null)
const fileInput = ref(null)
const uploading = ref(false)
const submitting = ref(false)

const tagPresets = ['可小刀', '含配件', '全新未拆', '有轻微瑕疵', '支持验货', '毕业清仓']

const form = reactive({
  title: '',
  description: '',
  categoryId: null,
  condition: 3,
  price: 0,
  originalPrice: 0,
  tradeTypes: ['MEET'],
  campusId: 1,
  meetPlace: '',
  shippingFee: 0,
  images: [],
  tags: [],
  negotiable: true,
})

const rules = {
  title: [
    { required: true, message: '请填写标题', trigger: 'blur' },
    { min: 5, max: 40, message: '标题长度 5-40 个字符', trigger: 'blur' },
  ],
  description: [
    { required: true, message: '请填写描述', trigger: 'blur' },
    { min: 10, message: '描述至少 10 个字符', trigger: 'blur' },
  ],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  condition: [{ required: true, message: '请选择成色', trigger: 'change' }],
  price: [
    {
      required: true,
      validator: (rule, value, callback) => {
        if (!value || Number(value) <= 0) callback(new Error('请填写售价'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
  tradeTypes: [
    {
      required: true,
      validator: (rule, value, callback) => {
        if (!value?.length) callback(new Error('至少选择一种交易方式'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  images: [
    {
      validator: (rule, value, callback) => {
        if (!value?.length) callback(new Error('至少上传 1 张图片'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  meetPlace: [
    {
      validator: (rule, value, callback) => {
        if (form.tradeTypes.includes('MEET') && !value) callback(new Error('面交需要填写地点'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

const pickFiles = () => fileInput.value?.click()

async function onFiles(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return
  uploading.value = true
  try {
    for (const file of files) {
      if (form.images.length >= 9) {
        ElMessage.warning('最多上传 9 张图片')
        break
      }
      if (file.size > 5 * 1024 * 1024) {
        ElMessage.warning(`${file.name} 超过 5MB，已跳过`)
        continue
      }
      const result = await uploadImage(file, 'PRODUCT')
      form.images.push(result.url)
    }
  } finally {
    uploading.value = false
  }
}

const removeImage = (index) => form.images.splice(index, 1)

async function submit() {
  if (!user.isVerified) {
    ElMessage.warning('请先完成学生认证')
    router.push({ name: 'profile' })
    return
  }
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const result = await createProduct({
      title: form.title,
      description: form.description,
      categoryId: form.categoryId,
      condition: form.condition,
      price: Math.round(form.price * 100),
      originalPrice: form.originalPrice ? Math.round(form.originalPrice * 100) : undefined,
      tradeTypes: form.tradeTypes,
      campusId: form.campusId,
      meetPlace: form.meetPlace,
      shippingFee: Math.round(form.shippingFee * 100),
      images: form.images,
      tags: form.tags,
      negotiable: form.negotiable,
    })
    ElMessage.success('发布成功')
    router.push({ name: 'product-detail', params: { id: result.id } })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  catalog.load()
  user.fetchProfile()
})
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}

.page-head h1 {
  font-size: 26px;
  margin-bottom: 6px;
}

.verify-alert {
  margin-bottom: 16px;
  border-radius: var(--radius);
}

.publish-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 22px;
  align-items: start;
}

.form-card {
  padding: 26px;
}

.form-row {
  display: flex;
  gap: 18px;
}

.flex-1 {
  flex: 1;
  min-width: 0;
}

.uploader {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tile {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #f7faf9;
}

.tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tile .del {
  position: absolute;
  right: 4px;
  top: 4px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(17, 24, 39, 0.6);
  color: #fff;
  cursor: pointer;
  line-height: 1;
}

.tile.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--ink-400);
  font-size: 12px;
  cursor: pointer;
  border-style: dashed;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.tile.add:hover {
  border-color: var(--brand);
  color: var(--brand);
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ink-400);
}

.submit-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.tips {
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: sticky;
  top: 88px;
}

.tip-card {
  padding: 18px 20px;
}

.tip-card h3 {
  font-size: 15px;
  margin-bottom: 10px;
}

.tip-card ul {
  margin: 0;
  padding-left: 18px;
  color: var(--ink-500);
  font-size: 13px;
  line-height: 1.9;
}

.tip-card p {
  color: var(--ink-500);
  font-size: 13px;
  line-height: 1.8;
}

.tip-card p + p {
  margin-top: 8px;
}

@media (max-width: 960px) {
  .publish-grid {
    grid-template-columns: 1fr;
  }
  .tips {
    position: static;
  }
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
