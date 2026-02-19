<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>商品品牌</span>
        <el-button type="primary" @click="loadData">刷新</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-row">
      <el-form-item label="品牌名称">
        <el-input v-model="name" placeholder="输入品牌名" clearable @keyup.enter="loadData" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column label="图片" width="100">
        <template #default="scope">
          <el-image :src="scope.row.picUrl" fit="cover" style="width: 40px; height: 40px; border-radius: 6px" />
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="100" />
      <el-table-column label="状态" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : 'info'">{{ scope.row.status === 0 ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getBrandPage, type BrandResp } from '../../api/admin';

const loading = ref(false);
const name = ref('');
const items = ref<BrandResp[]>([]);

async function loadData() {
  loading.value = true;
  try {
    const page = await getBrandPage(1, 50, { name: name.value || undefined });
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
.filter-row { margin-bottom: 12px; }
</style>
