<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>商品分类</span>
        <el-button type="primary" @click="loadData">刷新</el-button>
      </div>
    </template>
    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column label="图片" width="100">
        <template #default="scope">
          <el-image :src="scope.row.picUrl" fit="cover" style="width: 40px; height: 40px; border-radius: 6px" />
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="100" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getCategoryList, type CategoryResp } from '../../api/admin';

const loading = ref(false);
const items = ref<CategoryResp[]>([]);

async function loadData() {
  loading.value = true;
  try {
    items.value = await getCategoryList();
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
