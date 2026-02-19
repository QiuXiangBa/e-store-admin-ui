<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>商品属性</span>
        <el-button type="primary" @click="loadData">刷新</el-button>
      </div>
    </template>
    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column prop="propertyType" label="类型" width="100" />
      <el-table-column prop="inputType" label="录入" width="100" />
      <el-table-column prop="remark" label="备注" min-width="180" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getPropertyPage, type PropertyResp } from '../../api/admin';

const loading = ref(false);
const items = ref<PropertyResp[]>([]);

async function loadData() {
  loading.value = true;
  try {
    const page = await getPropertyPage(1, 100, {});
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
