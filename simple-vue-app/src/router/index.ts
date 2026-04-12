import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const layouts = {
  admin: () => import('@/layouts/AdminLayout.vue'),
  teacher: () => import('@/layouts/TeacherLayout.vue'),
  parent: () => import('@/layouts/ParentLayout.vue'),
  auth: () => import('@/layouts/AuthLayout.vue')
}

const pages = {
  login: () => import('@/views/Login.vue'),
  'admin-dashboard': () => import('@/views/admin/Dashboard.vue'),
  'admin-users': () => import('@/views/admin/Users.vue'),
  'teacher-class': () => import('@/views/teacher/ClassAttendance.vue'),
  'teacher-history': () => import('@/views/teacher/History.vue'),
  'parent-attendance': () => import('@/views/parent/Attendance.vue'),
  'parent-history': () => import('@/views/parent/History.vue'),
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: pages.login, meta: { layout: 'auth' } },
    {
      path: '/admin',
      component: layouts.admin,
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        { path: '', redirect: '/admin/dashboard' },
        { path: 'dashboard', component: pages['admin-dashboard'] },
        { path: 'users', component: pages['admin-users'] },
      ]
    },
    {
      path: '/teacher',
      component: layouts.teacher,
      meta: { requiresAuth: true, role: 'teacher' },
      children: [
        { path: '', redirect: '/teacher/class' },
        { path: 'class', component: pages['teacher-class'] },
        { path: 'history', component: pages['teacher-history'] },
      ]
    },
    {
      path: '/parent',
      component: layouts.parent,
      meta: { requiresAuth: true, role: 'parent' },
      children: [
        { path: '', redirect: '/parent/attendance' },
        { path: 'attendance', component: pages['parent-attendance'] },
        { path: 'history', component: pages['parent-history'] },
      ]
    },
    {
      path: '/',
      redirect: () => {
        const auth = useAuthStore()
        if (!auth.isAuthenticated) return '/login'
        const role = auth.user?.role
        if (role === 'admin') return '/admin/dashboard'
        if (role === 'teacher') return '/teacher/class'
        if (role === 'parent') return '/parent/attendance'
        return '/login'
      }
    },
    { path: '/:pathMatch(.*)*', redirect: '/login' }
  ]
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const requiresAuth = to.meta.requiresAuth
  const requiredRole = to.meta.role as string

  console.log(`🚦路由守卫: ${from.path} -> ${to.path}, 认证:${auth.isAuthenticated}, 角色:${auth.user?.role}`)

  if (requiresAuth && !auth.isAuthenticated) {
    console.log('🔒 未登录，跳转登录页')
    return next('/login')
  }

  if (to.path === '/login' && auth.isAuthenticated) {
    const role = auth.user?.role
    console.log('✅ 已登录，重定向到首页，角色:', role)
    if (role === 'admin') return next('/admin')
    if (role === 'teacher') return next('/teacher')
    if (role === 'parent') return next('/parent')
    return next('/')
  }

  if (requiredRole && auth.user?.role !== 'admin' && auth.user?.role !== requiredRole) {
    console.warn(`⛔ 角色不匹配: 需要 ${requiredRole}, 当前 ${auth.user?.role}`)
    const fallback = auth.user?.role === 'teacher' ? '/teacher' : auth.user?.role === 'parent' ? '/parent' : '/login'
    return next(fallback)
  }

  next()
})

export default router