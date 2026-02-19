import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('admin_token') || '');
  const refreshToken = ref(localStorage.getItem('admin_refresh_token') || '');

  const isLoggedIn = computed(() => Boolean(accessToken.value));

  function setToken(nextAccessToken: string, nextRefreshToken: string) {
    accessToken.value = nextAccessToken;
    refreshToken.value = nextRefreshToken;
    localStorage.setItem('admin_token', nextAccessToken);
    localStorage.setItem('admin_refresh_token', nextRefreshToken);
  }

  function clearToken() {
    accessToken.value = '';
    refreshToken.value = '';
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
  }

  return {
    accessToken,
    refreshToken,
    isLoggedIn,
    setToken,
    clearToken
  };
});
