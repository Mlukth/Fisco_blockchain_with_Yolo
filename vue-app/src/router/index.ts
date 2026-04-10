import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { layout: AuthLayout, requiresAuth: false }
    },
    {
      path: '/',
      component: DefaultLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '控制台' }
        },
        {
          path: 'upload',
          name: 'upload',
          component: () => import('@/views/Upload.vue'),
          meta: { title: '考勤采集' }
        },
        {
          path: 'verify',
          name: 'verify',
          component: () => import('@/views/Verify.vue'),
          meta: { title: '考勤验真' }
        },
        {
          path: 'batch-verify',
          name: 'batch-verify',
          component: () => import('@/views/BatchVerify.vue'),
          meta: { title: '批量验真' }
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('@/views/History.vue'),
          meta: { title: '历史记录' }
        },
        {
          path: 'debug',
          name: 'debug',
          component: () => import('@/views/Debug.vue'),
          meta: { title: '调试工具' }
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
