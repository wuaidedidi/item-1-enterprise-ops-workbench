<template>
  <div class="page-grid">
    <PageBlock title="个人资料" desc="维护当前登录账号的基础信息">
      <el-form ref="profileRef" :model="profile" :rules="profileRules" label-position="top" class="profile-form">
        <div class="form-grid">
          <el-form-item label="用户名">
            <el-input v-model="profile.userName" disabled />
          </el-form-item>
          <el-form-item label="角色">
            <el-input :model-value="profile.role?.name || '-'" disabled />
          </el-form-item>
          <el-form-item label="姓名" prop="realName">
            <el-input v-model="profile.realName" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="profile.phone" placeholder="选填，填写则需正确格式" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email" class="span-full">
            <el-input v-model="profile.email" placeholder="选填，填写则需正确格式" />
          </el-form-item>
        </div>
        <el-button type="primary" :loading="savingProfile" @click="saveProfile">保存资料</el-button>
      </el-form>
    </PageBlock>

    <PageBlock title="修改密码" desc="修改成功后下次登录需使用新密码">
      <el-form ref="passwordRef" :model="passwordForm" :rules="passwordRules" label-position="top" class="password-form">
        <div class="form-grid">
          <el-form-item label="原密码" prop="oldPassword">
            <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="至少6位" />
          </el-form-item>
          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
          </el-form-item>
        </div>
        <el-button type="primary" :loading="savingPassword" @click="savePassword">修改密码</el-button>
      </el-form>
    </PageBlock>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { type FormInstance, type FormRules } from 'element-plus';
import PageBlock from '@/components/PageBlock.vue';
import { profileApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { showSuccess } from '@/utils/message';

const auth = useAuthStore();
const profileRef = ref<FormInstance>();
const passwordRef = ref<FormInstance>();
const savingProfile = ref(false);
const savingPassword = ref(false);
const profile = reactive<any>({ userName: '', realName: '', phone: '', email: '', role: null });
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' });

const profileRules: FormRules = {
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ validator: (_, value, cb) => (!value || /^1[3-9]\d{9}$/.test(value) ? cb() : cb(new Error('手机号格式不正确'))), trigger: 'blur' }],
  email: [{ validator: (_, value, cb) => (!value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? cb() : cb(new Error('邮箱格式不正确'))), trigger: 'blur' }]
};

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [{ required: true, min: 6, message: '新密码至少6位', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: (_, value, cb) => (value === passwordForm.newPassword ? cb() : cb(new Error('两次输入的新密码不一致'))), trigger: 'blur' }
  ]
};

async function load() {
  const res = await profileApi.me();
  Object.assign(profile, res.data);
}

async function saveProfile() {
  await profileRef.value?.validate();
  savingProfile.value = true;
  try {
    const res = await profileApi.update({ realName: profile.realName, phone: profile.phone || '', email: profile.email || '' });
    Object.assign(profile, res.data);
    auth.user = res.data;
    localStorage.setItem('eow-user', JSON.stringify(res.data));
    showSuccess('资料更新成功');
  } finally {
    savingProfile.value = false;
  }
}

async function savePassword() {
  await passwordRef.value?.validate();
  savingPassword.value = true;
  try {
    await profileApi.password(passwordForm);
    Object.assign(passwordForm, { oldPassword: '', newPassword: '', confirmPassword: '' });
    showSuccess('密码修改成功');
  } finally {
    savingPassword.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.password-form {
  max-width: 820px;
}

.password-form .el-input {
  max-width: 420px;
}
</style>
