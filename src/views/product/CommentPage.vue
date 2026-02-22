<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span class="title">商品评论</span>
        <el-button type="primary" @click="openCreateDialog">新增评论</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-row">
      <el-form-item label="SPU ID">
        <el-input-number v-model="spuId" :min="1" controls-position="right" placeholder="全部" />
      </el-form-item>
      <el-form-item label="用户 ID">
        <el-input-number v-model="userId" :min="1" controls-position="right" placeholder="全部" />
      </el-form-item>
      <el-form-item label="可见性">
        <el-select v-model="visible" style="width: 120px">
          <el-option value="all" label="全部" />
          <el-option value="true" label="可见" />
          <el-option value="false" label="隐藏" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="90" />
      <el-table-column label="用户" width="150">
        <template #default="scope">
          <div>{{ scope.row.userId }}</div>
          <div class="sub-text">{{ scope.row.userNickname || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="SPU/SKU" width="130">
        <template #default="scope">{{ scope.row.spuId }}/{{ scope.row.skuId }}</template>
      </el-table-column>
      <el-table-column prop="scores" label="评分" width="80" />
      <el-table-column prop="content" label="内容" min-width="280" show-overflow-tooltip />
      <el-table-column label="可见" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.visible ? 'success' : 'info'">{{ scope.row.visible ? '可见' : '隐藏' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="replyContent" label="回复" min-width="200" show-overflow-tooltip>
        <template #default="scope">{{ scope.row.replyContent || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="scope">
          <el-space>
            <el-button link type="primary" @click="openReplyDialog(scope.row.id)">回复</el-button>
            <el-button link @click="onToggleVisible(scope.row)">{{ scope.row.visible ? '隐藏' : '显示' }}</el-button>
          </el-space>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager-row">
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :page-sizes="[10, 20, 50]"
        @current-change="loadData"
        @size-change="onPageSizeChange"
      />
    </div>
  </el-card>

  <el-dialog v-model="createOpen" title="新增评论" width="860px" destroy-on-close>
    <el-alert v-if="formErrorMessage" :title="formErrorMessage" type="error" show-icon :closable="false" style="margin-bottom: 12px" />
    <el-form label-width="100px">
      <el-row :gutter="12">
        <el-col :span="8"><el-form-item label="用户ID" required><el-input-number v-model="form.userId" :min="1" style="width: 100%" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="SPUID" required><el-input-number v-model="form.spuId" :min="1" style="width: 100%" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="SKUID" required><el-input-number v-model="form.skuId" :min="1" style="width: 100%" /></el-form-item></el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="8"><el-form-item label="昵称"><el-input v-model="form.userNickname" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="综合评分"><el-input-number v-model="form.scores" :min="1" :max="5" style="width: 100%" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="可见性"><el-select v-model="form.visible" style="width: 100%"><el-option :value="true" label="可见" /><el-option :value="false" label="隐藏" /></el-select></el-form-item></el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12"><el-form-item label="描述评分"><el-input-number v-model="form.descriptionScores" :min="1" :max="5" style="width: 100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="服务评分"><el-input-number v-model="form.benefitScores" :min="1" :max="5" style="width: 100%" /></el-form-item></el-col>
      </el-row>
      <el-form-item label="图片URL"><el-input v-model="form.picUrls" placeholder="多个用逗号分隔" /></el-form-item>
      <el-form-item label="评论内容"><el-input v-model="form.content" type="textarea" :rows="4" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeCreateDialog">取消</el-button>
      <el-button type="primary" @click="submitCreate">新增评论</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="replyOpen" title="回复评论" width="560px" destroy-on-close>
    <el-input v-model="replyContent" type="textarea" :rows="4" placeholder="请输入回复内容" />
    <template #footer>
      <el-button @click="closeReplyDialog">取消</el-button>
      <el-button type="primary" @click="submitReply">提交回复</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createComment, getCommentPage, replyComment, type CommentResp, updateCommentVisible } from '../../api/admin';

interface CommentForm {
  userId: number;
  spuId: number;
  skuId: number;
  userNickname: string;
  scores: number;
  descriptionScores: number;
  benefitScores: number;
  content: string;
  picUrls: string;
  visible: boolean;
}

const DEFAULT_FORM: CommentForm = {
  userId: 0,
  spuId: 0,
  skuId: 0,
  userNickname: '',
  scores: 5,
  descriptionScores: 5,
  benefitScores: 5,
  content: '',
  picUrls: '',
  visible: true
};

const loading = ref(false);
const items = ref<CommentResp[]>([]);
const total = ref(0);
const pageNum = ref(1);
const pageSize = ref(10);

const spuId = ref<number | undefined>();
const userId = ref<number | undefined>();
const visible = ref<'all' | 'true' | 'false'>('all');

const createOpen = ref(false);
const form = ref<CommentForm>({ ...DEFAULT_FORM });
const formErrorMessage = ref('');

const replyOpen = ref(false);
const replyTargetId = ref<number | null>(null);
const replyContent = ref('');

async function loadData() {
  loading.value = true;
  try {
    const page = await getCommentPage(pageNum.value, pageSize.value, {
      spuId: spuId.value,
      userId: userId.value,
      visible: visible.value === 'all' ? undefined : visible.value === 'true'
    });
    items.value = page.list || [];
    total.value = page.total || 0;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  pageNum.value = 1;
  void loadData();
}

function onPageSizeChange() {
  pageNum.value = 1;
  void loadData();
}

function openCreateDialog() {
  form.value = { ...DEFAULT_FORM };
  formErrorMessage.value = '';
  createOpen.value = true;
}

function closeCreateDialog() {
  createOpen.value = false;
  formErrorMessage.value = '';
}

async function submitCreate() {
  if (!form.value.userId || !form.value.spuId || !form.value.skuId) {
    formErrorMessage.value = 'userId/spuId/skuId 不能为空';
    return;
  }
  try {
    await createComment({ ...form.value });
    ElMessage.success('评论已新增');
    createOpen.value = false;
    await loadData();
  } catch (error) {
    formErrorMessage.value = (error as Error).message;
  }
}

function openReplyDialog(commentId: number) {
  replyTargetId.value = commentId;
  replyContent.value = '';
  replyOpen.value = true;
}

function closeReplyDialog() {
  replyOpen.value = false;
  replyTargetId.value = null;
  replyContent.value = '';
}

async function submitReply() {
  if (!replyTargetId.value) {
    return;
  }
  if (!replyContent.value.trim()) {
    ElMessage.warning('回复内容不能为空');
    return;
  }
  try {
    await replyComment(replyTargetId.value, replyContent.value.trim());
    ElMessage.success('回复成功');
    closeReplyDialog();
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

async function onToggleVisible(item: CommentResp) {
  try {
    await updateCommentVisible(item.id, !item.visible);
    ElMessage.success('可见性已更新');
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 22px;
  font-weight: 700;
}

.filter-row {
  margin-bottom: 12px;
}

.sub-text {
  color: #64748b;
  font-size: 12px;
}

.pager-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
