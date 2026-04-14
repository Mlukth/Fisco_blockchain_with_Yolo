<template>
  <div class="layout">
    <aside class="sidebar">
      <h3>家长端</h3>
      <nav>
        <router-link to="/parent/attendance">今日考勤</router-link>
        <router-link to="/parent/history">历史记录</router-link>
      </nav>
      <button @click="logout">退出</button>
    </aside>
    <main><router-view /></main>
  </div>
</template>