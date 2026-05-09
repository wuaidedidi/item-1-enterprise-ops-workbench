<template>
  <div class="auth-page">
    <div class="auth-shell">
      <section class="auth-hero">
        <div class="hero-badge">企业运营工作台与权限中心</div>
        <h1>让组织、权限、公告和审计在同一个工作台里流转</h1>
        <p>适用于中小企业的内部运营后台，集中管理账号、组织、角色、菜单、公告与审计留痕，减少分散配置带来的协作摩擦。</p>
        <div class="hero-metrics">
          <div class="hero-metric">
            <strong>4</strong>
            <span>角色体系</span>
          </div>
          <div class="hero-metric">
            <strong>8</strong>
            <span>业务模块</span>
          </div>
          <div class="hero-metric">
            <strong>100%</strong>
            <span>数据库驱动</span>
          </div>
        </div>
        <div class="hero-features">
          <div v-for="item in features" :key="item.title" class="hero-feature">
            <el-icon><component :is="item.icon" /></el-icon>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </section>
      <section class="auth-panel">
        <div class="auth-panel__header">
          <h2>登录系统</h2>
          <p>请输入账号信息后进入运营工作台</p>
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" class="auth-form" label-position="top">
          <el-form-item label="用户名" prop="userName">
            <el-input v-model="form.userName" size="large" placeholder="请输入用户名" autocomplete="username" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" size="large" type="password" placeholder="请输入密码" autocomplete="current-password" show-password />
          </el-form-item>
          <div class="auth-actions">
            <el-button type="primary" size="large" :loading="loading" @click="submit">登录</el-button>
            <el-button size="large" @click="registerVisible = true">注册账号</el-button>
          </div>
        </el-form>
        <div class="auth-foot">
          <span>首次登录后可在个人中心修改资料和密码</span>
        </div>
      </section>
    </div>

    <el-dialog v-model="registerVisible" title="注册新账号" width="560px" align-center destroy-on-close>
      <el-form ref="registerRef" :model="registerForm" :rules="registerRules" label-position="top">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户名" prop="userName">
              <el-input v-model="registerForm.userName" placeholder="请输入用户名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="realName">
              <el-input v-model="registerForm.realName" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="registerForm.password" type="password" show-password placeholder="请输入密码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="registerForm.phone" placeholder="选填，填写则需正确格式" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="registerForm.email" placeholder="选填，填写则需正确格式" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="registerVisible = false">取消</el-button>
        <el-button type="primary" :loading="registering" @click="submitRegister">注册</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Lock, Bell, Document, UserFilled } from '@element-plus/icons-vue';
import { authApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { showSuccess } from '@/utils/message';

const router = useRouter();
const auth = useAuthStore();
const formRef = ref<FormInstance>();
const registerRef = ref<FormInstance>();
const loading = ref(false);
const registering = ref(false);
const registerVisible = ref(false);

const form = reactive({ userName: '', password: '' });
const registerForm = reactive({ userName: '', realName: '', password: '', phone: '', email: '' });

const rules: FormRules = {
  userName: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const registerRules: FormRules = {
  userName: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  phone: [{ validator: (_, value, cb) => (!value || /^1[3-9]\d{9}$/.test(value) ? cb() : cb(new Error('手机号格式不正确'))), trigger: 'blur' }],
  email: [{ validator: (_, value, cb) => (!value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? cb() : cb(new Error('邮箱格式不正确'))), trigger: 'blur' }]
};

const features = [
  { title: '统一权限', desc: '按角色展示菜单与按钮权限，减少越权风险。', icon: Lock },
  { title: '公告协同', desc: '发布、阅读、处理状态全程留痕。', icon: Bell },
  { title: '审计追踪', desc: '操作日志与权限变更可追溯。', icon: Document },
  { title: '账号管理', desc: '组织、角色、状态与个人资料统一维护。', icon: UserFilled }
];

async function submit() {
  await formRef.value?.validate();
  loading.value = true;
  try {
    const res = await authApi.login(form);
    auth.setSession(res.data.token, res.data.user);
    showSuccess('登录成功');
    await router.replace('/dashboard');
  } finally {
    loading.value = false;
  }
}

async function submitRegister() {
  await registerRef.value?.validate();
  registering.value = true;
  try {
    await authApi.register(registerForm);
    registerVisible.value = false;
    ElMessage.success({ message: '注册成功，请使用新账号登录', grouping: true });
    Object.assign(registerForm, { userName: '', realName: '', password: '', phone: '', email: '' });
  } finally {
    registering.value = false;
  }
}
</script>
