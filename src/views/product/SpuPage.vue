<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>商品 SPU</span>
        <el-button type="primary" @click="loadData">刷新</el-button>
      </div>
    </template>
    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="商品名称" min-width="220" />
      <el-table-column prop="categoryId" label="分类ID" width="100" />
      <el-table-column prop="brandId" label="品牌ID" width="100" />
      <el-table-column prop="stock" label="库存" width="100" />
      <el-table-column prop="salesCount" label="销量" width="100" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="goEdit(scope.row.id)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getSpuPage, type SpuResp } from '../../api/admin';

const router = useRouter();
const loading = ref(false);
const items = ref<SpuResp[]>([]);

async function loadData() {
  loading.value = true;
  try {
    const page = await getSpuPage(1, 50, {});
    items.value = page.list;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

function goEdit(id: number) {
  router.push(`/product/spu/${id}/edit`);
}

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; }
</style>
