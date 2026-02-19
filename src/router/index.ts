import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/login', component: () => import('../views/LoginPage.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../layout/AdminLayout.vue'),
    children: [
      { path: '', component: () => import('../views/DashboardPage.vue') },
      { path: 'product/brand', component: () => import('../views/product/BrandPage.vue') },
      { path: 'product/category', component: () => import('../views/product/CategoryPage.vue') },
      { path: 'product/category-property', component: () => import('../views/product/CategoryPropertyBindingPage.vue') },
      { path: 'product/property', component: () => import('../views/product/PropertyPage.vue') },
      { path: 'product/property-values', component: () => import('../views/product/PropertyValuePage.vue') },
      { path: 'product/spu', component: () => import('../views/product/SpuPage.vue') },
      { path: 'product/spu/create', component: () => import('../views/product/SpuFormPage.vue') },
      { path: 'product/spu/:id/edit', component: () => import('../views/product/SpuFormPage.vue') },
      { path: 'product/comment', component: () => import('../views/product/CommentPage.vue') }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.public) {
    return true;
  }
  if (!auth.isLoggedIn) {
    return '/login';
  }
  return true;
});

export default router;
