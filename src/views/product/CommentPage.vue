<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>商品评论</span>
        <el-button type="primary" @click="loadData">刷新</el-button>
      </div>
    </template>
    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="spuId" label="SPU" width="100" />
      <el-table-column prop="scores" label="评分" width="100" />
      <el-table-column prop="content" label="内容" min-width="260" />
      <el-table-column label="可见" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.visible ? 'success' : 'info'">{{ scope.row.visible ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getCommentPage, type CommentResp } from '../../api/admin';

const loading = ref(false);
const items = ref<CommentResp[]>([]);

async function loadData() {
  loading.value = true;
  try {
    const page = await getCommentPage(1, 50, {});
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
