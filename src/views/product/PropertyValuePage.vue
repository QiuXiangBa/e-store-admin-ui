<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>属性值</span>
        <el-button type="primary" @click="loadData">刷新</el-button>
      </div>
    </template>
    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="propertyId" label="属性ID" width="100" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column label="图片" width="100">
        <template #default="scope">
          <el-image v-if="scope.row.picUrl" :src="scope.row.picUrl" fit="cover" style="width: 32px; height: 32px; border-radius: 4px" />
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getPropertyValuePage, type PropertyValueResp } from '../../api/admin';

const loading = ref(false);
const items = ref<PropertyValueResp[]>([]);

async function loadData() {
  loading.value = true;
  try {
    const page = await getPropertyValuePage(1, 100, {});
    items.value = page.list;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; }
</style>
