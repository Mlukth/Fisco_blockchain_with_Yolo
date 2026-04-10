<template>
  <div class="min-h-screen flex flex-col">
    <main class="flex-grow container mx-auto px-4 py-8">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">考勤存证仪表盘</h1>
          <p class="text-white/80">监控考勤数据上链与验证情况</p>
        </div>
        <div class="flex items-center space-x-2 mt-4 md:mt-0">
          <i class="fa fa-calendar text-white/60"></i>
          <select 
            v-model="timeRange"
            class="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
            <option value="all">全部时间</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center items-center h-96">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>

      <template v-else>
        <div class="mb-10">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center">
            <i class="fa fa-database mr-2 text-primary"></i> 核心指标
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard title="总上链记录" :value="stats.totalHashes" description="累计存证数" icon="fa-database" color="bg-blue-500" />
            <StatCard title="日均上链" :value="stats.dailySubmissionRate" description="平均每日上链" icon="fa-chart-line" color="bg-green-500" />
            <StatCard title="验证成功率" :value="`${(stats.successRate * 100).toFixed(1)}%`" description="链上验证通过率" icon="fa-check" color="bg-teal-500" />
            <StatCard title="平均Gas费" :value="`${stats.averageCost} ETH`" description="每次上链成本" icon="fa-chart-line" color="bg-purple-500" />
          </div>
        </div>

        <!-- 操作卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <ActionCard icon="fa-cloud-upload-alt" title="考勤采集" description="上传考勤数据并生成默克尔根上链" @click="navigate('/upload')" color="bg-purple-500" />
          <ActionCard icon="fa-check" title="考勤验真" description="验证默克尔根是否已存证" @click="navigate('/verify')" color="bg-teal-500" />
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StatCard from '@/components/StatCard.vue'
import ActionCard from '@/components/ActionCard.vue'

const router = useRouter()
const timeRange = ref('7d')
const loading = ref(true)
const stats = ref<any>({})

const generateMockData = () => ({
  totalHashes: 128,
  dailySubmissionRate: 8,
  successRate: 0.96,
  averageCost: 0.0012,
})

const fetchStats = async () => {
  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 500))
  stats.value = generateMockData()
  loading.value = false
}

const navigate = (path: string) => router.push(path)

watch(timeRange, fetchStats)
onMounted(fetchStats)
</script>