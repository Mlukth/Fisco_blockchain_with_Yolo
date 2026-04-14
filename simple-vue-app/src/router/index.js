import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', component: () => import('@/views/admin/Dashboard.vue') },
      { path: 'devices', component: () => import('@/views/admin/Devices.vue') },
      { path: 'users', component: () => import('@/views/admin/Users.vue') }
    ]
  },
  {
    path: '/teacher',
    component: () => import('@/layouts/TeacherLayout.vue'),
    meta: { requiresAuth: true, role: 'teacher' },
    children: [
      { path: '', redirect: '/teacher/attendance' },
      { path: 'attendance', component: () => import('@/views/teacher/Attendance.vue') },
      { path: 'history', component: () => import('@/views/teacher/History.vue') },
      { path: 'exceptions', component: () => import('@/views/teacher/Exceptions.vue') }
    ]
  },
  {
    path: '/parent',
    component: () => import('@/layouts/ParentLayout.vue'),
    meta: { requiresAuth: true, role: 'parent' },
    children: [
      { path: '', redirect: '/parent/attendance' },
      { path: 'attendance', component: () => import('@/views/parent/Attendance.vue') },
      { path: 'history', component: () => import('@/views/parent/History.vue') }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.role && user?.role !== to.meta.role && user?.role !== 'admin') {
    next('/login')
  } else {
    next()
  }
})

export default router