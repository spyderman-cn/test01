<template>
  <div class="page login-page">
    <div class="container">
      <div class="auth-card card">
        <aside class="auth-side">
          <span class="logo">校</span>
          <h1>校集</h1>
          <p class="slogan">同校认证 · 当面交易<br />把闲置交给懂它的人</p>
          <ul class="bullets">
            <li><el-icon><CircleCheckFilled /></el-icon>学号 + 学生证认证，只和真同学交易</li>
            <li><el-icon><LocationFilled /></el-icon>校内面交，看到实物再付钱</li>
            <li><el-icon><ChatDotRound /></el-icon>站内聊天，记录可追溯</li>
          </ul>
          <p class="demo-tip">演示账号：13800001234 / 任意密码</p>
        </aside>

        <section class="auth-form">
          <div class="tabs">
            <button :class="{ active: mode === 'login' }" @click="switchMode('login')">登录</button>
            <button :class="{ active: mode === 'register' }" @click="switchMode('register')">注册</button>
          </div>

          <el-form v-if="mode === 'login'" ref="loginRef" :model="loginForm" :rules="loginRules" label-position="top" @submit.prevent>
            <el-form-item label="账号" prop="account">
              <el-input v-model="loginForm.account" size="large" placeholder="手机号 / 昵称" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="loginForm.password" type="password" size="large" show-password placeholder="演示环境任意密码" @keyup.enter="submitLogin" />
            </el-form-item>
            <el-button type="primary" size="large" class="submit" :loading="submitting" @click="submitLogin">
              登录
            </el-button>
            <div class="extra">
              <el-button text size="small" @click="quickLogin">一键体验登录</el-button>
              <el-button text size="small" @click="ElMessage.info('演示环境暂不支持找回密码')">忘记密码？</el-button>
            </div>
          </el-form>

          <el-form v-else ref="registerRef" :model="registerForm" :rules="registerRules" label-position="top" @submit.prevent>
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="registerForm.phone" size="large" maxlength="11" placeholder="11 位手机号" />
            </el-form-item>
            <el-form-item label="验证码" prop="code">
              <div class="code-row">
                <el-input v-model="registerForm.code" size="large" maxlength="6" placeholder="6 位验证码" />
                <el-button size="large" :disabled="countdown > 0" @click="sendCode">
                  {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="registerForm.nickname" size="large" maxlength="20" placeholder="2-20 个字符" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="registerForm.password" type="password" size="large" show-password placeholder="8-20 位，含字母与数字" />
            </el-form-item>
            <el-checkbox v-model="registerForm.agree">我已阅读并同意《用户协议》《隐私政策》</el-checkbox>
            <el-button type="primary" size="large" class="submit" :loading="submitting" @click="submitRegister">
              注册并登录
            </el-button>
          </el-form>

          <p class="foot-tip">演示数据保存在本机浏览器，不会上传任何服务器</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { sendSmsCode } from '@/api/auth'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const mode = ref('login')
const submitting = ref(false)
const countdown = ref(0)
const loginRef = ref(null)
const registerRef = ref(null)

const loginForm = reactive({ account: '13800001234', password: '12345678' })
const registerForm = reactive({ phone: '', code: '', nickname: '', password: '', agree: true })

const loginRules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const registerRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 2, max: 20, message: '昵称长度 2-20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, max: 20, message: '密码长度 8-20 位', trigger: 'blur' },
  ],
}

const redirectTarget = () => route.query.redirect || '/'

const switchMode = (next) => {
  mode.value = next
}

async function submitLogin() {
  try {
    await loginRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    await user.login({ account: loginForm.account, password: loginForm.password })
    ElMessage.success('欢迎回来')
    router.replace(redirectTarget())
  } catch {
    /* 拦截器已提示 */
  } finally {
    submitting.value = false
  }
}

async function quickLogin() {
  loginForm.account = '13800001234'
  loginForm.password = '12345678'
  await submitLogin()
}

let timer = null

async function sendCode() {
  if (!/^1\d{10}$/.test(registerForm.phone)) {
    ElMessage.warning('请先填写正确的手机号')
    return
  }
  await sendSmsCode({ phone: registerForm.phone, scene: 'REGISTER' })
  ElMessage.success('验证码已发送（演示环境任意 6 位数字均可）')
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function submitRegister() {
  try {
    await registerRef.value.validate()
  } catch {
    return
  }
  if (!registerForm.agree) {
    ElMessage.warning('请先同意用户协议')
    return
  }
  submitting.value = true
  try {
    await user.register({
      phone: registerForm.phone,
      code: registerForm.code,
      password: registerForm.password,
      nickname: registerForm.nickname,
      agreeTerms: true,
    })
    ElMessage.success('注册成功，记得完成学生认证')
    router.replace(redirectTarget())
  } catch {
    /* 拦截器已提示 */
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  padding-top: 40px;
}

.auth-card {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  overflow: hidden;
  max-width: 940px;
  margin: 0 auto;
  min-height: 520px;
}

.auth-side {
  padding: 40px 36px;
  background:
    radial-gradient(500px 220px at 20% 0%, rgba(255, 255, 255, 0.55), transparent 60%),
    linear-gradient(160deg, #0e9f6e, #0a6f50 70%);
  color: #fff;
  display: flex;
  flex-direction: column;
  position: relative;
}

.auth-side::after {
  content: '';
  position: absolute;
  right: -60px;
  bottom: -60px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.auth-side .logo {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.16);
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 22px;
}

.auth-side h1 {
  font-size: 30px;
  letter-spacing: 2px;
  margin-bottom: 10px;
}

.slogan {
  font-size: 14px;
  line-height: 1.8;
  opacity: 0.9;
  margin-bottom: 26px;
}

.bullets {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
}

.bullets li {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.95;
}

.demo-tip {
  margin-top: auto;
  font-size: 12px;
  opacity: 0.75;
}

.auth-form {
  padding: 38px 40px;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  gap: 22px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--line);
}

.tabs button {
  border: none;
  background: none;
  padding: 0 0 10px;
  font-size: 17px;
  color: var(--ink-400);
  cursor: pointer;
  position: relative;
  font-weight: 600;
}

.tabs button.active {
  color: var(--ink-900);
}

.tabs button.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: var(--brand);
  border-radius: 2px;
}

.submit {
  width: 100%;
  margin-top: 8px;
}

.extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.code-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.foot-tip {
  margin-top: auto;
  padding-top: 18px;
  font-size: 11px;
  color: var(--ink-400);
  text-align: center;
}

@media (max-width: 860px) {
  .auth-card {
    grid-template-columns: 1fr;
  }
  .auth-side {
    padding: 28px;
  }
  .bullets,
  .demo-tip {
    display: none;
  }
  .auth-form {
    padding: 26px 22px;
  }
}
</style>
