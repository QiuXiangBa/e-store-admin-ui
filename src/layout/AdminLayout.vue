<template>
  <el-container class="layout-root">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="layout-aside">
      <div class="brand">
        <span class="brand-icon">M</span>
        <span v-show="!isCollapse" class="brand-text">Mall Admin</span>
      </div>
      <el-scrollbar>
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :collapse-transition="false"
          :router="true"
          background-color="transparent"
          text-color="#e5e7eb"
          active-text-color="#ffffff"
        >
          <el-menu-item v-for="item in navItems" :key="item.path" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.label }}</template>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <el-button text @click="toggleCollapse">
            <el-icon><component :is="isCollapse ? Expand : Fold" /></el-icon>
          </el-button>
          <el-page-header content="管理后台" title="" />
        </div>
        <el-button type="primary" plain @click="handleLogout">退出登录</el-button>
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  CollectionTag,
  DataAnalysis,
  Expand,
  Files,
  Fold,
  Goods,
  Link,
  Message,
  Menu as MenuIcon,
  PriceTag
} from '@element-plus/icons-vue';
import { logout } from '../api/admin';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const isCollapse = ref(localStorage.getItem('admin_sidebar_collapsed') === '1');

const navItems = [
  { path: '/', label: '概览', icon: DataAnalysis },
  { path: '/product/brand', label: '商品品牌', icon: CollectionTag },
  { path: '/product/category', label: '商品分类', icon: MenuIcon },
  { path: '/product/category-property', label: '类目属性绑定', icon: Link },
  { path: '/product/property', label: '商品属性', icon: PriceTag },
  { path: '/product/property-values', label: '属性值', icon: Files },
  { path: '/product/spu', label: '商品 SPU', icon: Goods },
  { path: '/product/comment', label: '商品评论', icon: Message }
];

const activeMenu = computed(() => {
  if (route.path.startsWith('/product/spu/')) {
    return '/product/spu';
  }
  return route.path;
});

watch(isCollapse, (value) => {
  localStorage.setItem('admin_sidebar_collapsed', value ? '1' : '0');
});

function toggleCollapse() {
  isCollapse.value = !isCollapse.value;
}

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
  transition: width 180ms ease;
  overflow: hidden;
}

.brand {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 700;
}

.brand-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.brand-text {
  font-size: 18px;
  color: #fff;
}

.layout-aside :deep(.el-menu) {
  border-right: none;
  background-color: transparent !important;
}

.layout-aside :deep(.el-menu-item) {
  margin: 4px 8px;
  border-radius: 10px;
}

.layout-aside :deep(.el-menu--collapse .el-menu-item) {
  margin: 4px 6px;
  border-radius: 10px;
}

.layout-aside :deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.16);
}

.layout-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layout-main {
  min-width: 0;
  overflow-x: hidden;
}
</style>
