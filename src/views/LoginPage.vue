<template>
  <div class="login-root">
    <el-card class="login-card">
      <template #header>
        <div class="login-title">Admin Login</div>
      </template>
      <el-form :model="form" label-position="top" @submit.prevent="handleLogin">
        <el-form-item label="账号">
          <el-input v-model="form.username" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-button :loading="loading" type="primary" class="login-btn" @click="handleLogin">登录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { login } from '../api/admin';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

const loading = ref(false);
const form = reactive({
  username: 'admin',
  password: 'admin123'
});

async function handleLogin() {
  if (!form.username || !form.password) {
    ElMessage.error('请输入账号密码');
    return;
  }
  loading.value = true;
  try {
    const resp = await login({ ...form });
    auth.setToken(resp.accessToken, resp.refreshToken);
    ElMessage.success('登录成功');
    router.replace('/');
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 20% 20%, #dbeafe, #f8fafc 45%, #ecfeff);
}

.login-card {
  width: 420px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
}

.login-btn {
  width: 100%;
}
</style>
