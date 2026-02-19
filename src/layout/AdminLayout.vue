<template>
  <el-container class="layout-root">
    <el-aside width="220px" class="layout-aside">
      <div class="brand">Mall Admin</div>
      <el-menu :default-active="activePath" router>
        <el-menu-item index="/">概览</el-menu-item>
        <el-menu-item index="/product/brand">商品品牌</el-menu-item>
        <el-menu-item index="/product/category">商品分类</el-menu-item>
        <el-menu-item index="/product/category-property">类目属性绑定</el-menu-item>
        <el-menu-item index="/product/property">商品属性</el-menu-item>
        <el-menu-item index="/product/property-values">属性值</el-menu-item>
        <el-menu-item index="/product/spu">商品 SPU</el-menu-item>
        <el-menu-item index="/product/comment">商品评论</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <el-page-header content="管理后台" title="" />
        <el-button type="primary" plain @click="handleLogout">退出登录</el-button>
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { logout } from '../api/admin';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const activePath = computed(() => route.path);

async function handleLogout() {
  try {
    await logout();
  } catch (_error) {
    // Ignore logout errors.
  }
  auth.clearToken();
  ElMessage.success('已退出登录');
  router.replace('/login');
}
</script>

<style scoped>
.layout-root {
  min-height: 100vh;
}

.layout-aside {
  background: linear-gradient(180deg, #0b1f44 0%, #0f4a4c 100%);
  color: #fff;
}

.brand {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
}

.layout-aside :deep(.el-menu) {
  border-right: none;
  background: transparent;
}

.layout-aside :deep(.el-menu-item) {
  color: #eef2ff;
}

.layout-aside :deep(.el-menu-item.is-active) {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.16);
}

.layout-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.layout-main {
  min-width: 0;
  overflow-x: hidden;
}
</style>
