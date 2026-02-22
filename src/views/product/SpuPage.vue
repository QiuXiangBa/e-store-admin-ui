<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span class="title">商品 SPU</span>
        <el-button type="primary" @click="goCreate">新增</el-button>
      </div>
    </template>

    <div class="tab-row">
      <el-space>
        <el-button :type="tabType === PRODUCT_SPU_TAB.FOR_SALE ? 'primary' : 'default'" @click="switchTab(PRODUCT_SPU_TAB.FOR_SALE)">
          出售中({{ counts?.enableCount ?? 0 }})
        </el-button>
        <el-button :type="tabType === PRODUCT_SPU_TAB.IN_WAREHOUSE ? 'primary' : 'default'" @click="switchTab(PRODUCT_SPU_TAB.IN_WAREHOUSE)">
          仓库中({{ counts?.disableCount ?? 0 }})
        </el-button>
        <el-button :type="tabType === PRODUCT_SPU_TAB.SOLD_OUT ? 'primary' : 'default'" @click="switchTab(PRODUCT_SPU_TAB.SOLD_OUT)">
          已售罄({{ counts?.soldOutCount ?? 0 }})
        </el-button>
        <el-button :type="tabType === PRODUCT_SPU_TAB.ALERT_STOCK ? 'primary' : 'default'" @click="switchTab(PRODUCT_SPU_TAB.ALERT_STOCK)">
          警戒库存({{ counts?.alertStockCount ?? 0 }})
        </el-button>
        <el-button :type="tabType === PRODUCT_SPU_TAB.RECYCLE_BIN ? 'primary' : 'default'" @click="switchTab(PRODUCT_SPU_TAB.RECYCLE_BIN)">
          回收站({{ counts?.recycleCount ?? 0 }})
        </el-button>
      </el-space>
    </div>

    <el-form :inline="true" class="filter-row">
      <el-form-item label="商品名称">
        <el-input v-model="name" clearable placeholder="输入商品名称" @keyup.enter="onSearch" />
      </el-form-item>
      <el-form-item label="分类">
        <el-select v-model="categoryId" clearable placeholder="全部分类" style="width: 180px">
          <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="品牌">
        <el-select v-model="brandId" clearable placeholder="全部品牌" style="width: 180px">
          <el-option v-for="item in brands" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="items" v-loading="loading" border>
      <el-table-column prop="id" label="ID" width="90" />
      <el-table-column label="商品" min-width="240">
        <template #default="scope">
          <div class="product-cell">
            <el-image :src="scope.row.picUrl" fit="cover" style="width: 40px; height: 40px; border-radius: 6px" />
            <span>{{ scope.row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="120">
        <template #default="scope">{{ categoryNameMap[scope.row.categoryId] || scope.row.categoryId }}</template>
      </el-table-column>
      <el-table-column label="品牌" width="120">
        <template #default="scope">{{ brandNameMap[scope.row.brandId] || scope.row.brandId }}</template>
      </el-table-column>
      <el-table-column label="价格" width="110">
        <template #default="scope">¥ {{ fenToYuan(scope.row.price) }}</template>
      </el-table-column>
      <el-table-column prop="salesCount" label="销量" width="90" />
      <el-table-column prop="stock" label="库存" width="90" />
      <el-table-column label="状态" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === PRODUCT_SPU_STATUS.ENABLE ? 'success' : scope.row.status === PRODUCT_SPU_STATUS.RECYCLE ? 'info' : 'warning'">
            {{ getProductSpuStatusLabel(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="scope">
          <el-space>
            <el-button link @click="goDetail(scope.row.id)">详情</el-button>
            <el-button link type="primary" @click="goEdit(scope.row.id)">修改</el-button>
            <el-button
              v-if="tabType === PRODUCT_SPU_TAB.RECYCLE_BIN"
              link
              @click="onSwitchStatus(scope.row.id, PRODUCT_SPU_STATUS.DISABLE)"
            >
              恢复
            </el-button>
            <el-button v-else link @click="onSwitchStatus(scope.row.id, PRODUCT_SPU_STATUS.RECYCLE)">回收</el-button>
            <el-button
              v-if="scope.row.status !== PRODUCT_SPU_STATUS.RECYCLE"
              link
              @click="onSwitchStatus(scope.row.id, scope.row.status === PRODUCT_SPU_STATUS.ENABLE ? PRODUCT_SPU_STATUS.DISABLE : PRODUCT_SPU_STATUS.ENABLE)"
            >
              {{ scope.row.status === PRODUCT_SPU_STATUS.ENABLE ? '下架' : '上架' }}
            </el-button>
            <el-button v-if="tabType === PRODUCT_SPU_TAB.RECYCLE_BIN" link type="danger" @click="onDelete(scope.row.id)">
              删除
            </el-button>
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
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  deleteSpu,
  getBrandSimpleList,
  getCategoryList,
  getSpuCount,
  getSpuPage,
  type BrandResp,
  type CategoryResp,
  type SpuCountResp,
  type SpuResp,
  updateSpuStatus
} from '../../api/admin';
import { PRODUCT_SPU_STATUS, PRODUCT_SPU_TAB, getProductSpuStatusLabel, fenToYuan } from '../../constants/productSpu';

const router = useRouter();
const route = useRoute();
const categoryIdFromQuery = Number(route.query.categoryId || 0) || undefined;

const loading = ref(false);
const brands = ref<BrandResp[]>([]);
const categories = ref<CategoryResp[]>([]);
const counts = ref<SpuCountResp>();

const items = ref<SpuResp[]>([]);
const total = ref(0);
const pageNum = ref(1);
const pageSize = ref(10);
const tabType = ref<number>(PRODUCT_SPU_TAB.FOR_SALE);
const name = ref('');
const categoryId = ref<number | undefined>(categoryIdFromQuery);
const brandId = ref<number | undefined>();

const categoryNameMap = computed<Record<number, string>>(() =>
  Object.fromEntries(categories.value.map((item) => [item.id, item.name]))
);
const brandNameMap = computed<Record<number, string>>(() =>
  Object.fromEntries(brands.value.map((item) => [item.id, item.name]))
);

function formatTime(value?: number) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

async function loadMeta() {
  const [brandList, categoryList, countResp] = await Promise.all([getBrandSimpleList(), getCategoryList(), getSpuCount()]);
  brands.value = brandList;
  categories.value = categoryList;
  counts.value = countResp;
}

async function loadData() {
  loading.value = true;
  try {
    const page = await getSpuPage(pageNum.value, pageSize.value, {
      name: name.value.trim() || undefined,
      tabType: tabType.value,
      categoryId: categoryId.value,
      brandId: brandId.value
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

function onReset() {
  name.value = '';
  categoryId.value = categoryIdFromQuery;
  brandId.value = undefined;
  pageNum.value = 1;
  void loadData();
}

function switchTab(nextTab: number) {
  tabType.value = nextTab;
  pageNum.value = 1;
  void loadData();
}

function onPageSizeChange() {
  pageNum.value = 1;
  void loadData();
}

function goCreate() {
  void router.push('/product/spu/create');
}

function goDetail(id: number) {
  void router.push(`/product/spu/${id}`);
}

function goEdit(id: number) {
  void router.push(`/product/spu/${id}/edit`);
}

async function onSwitchStatus(id: number, status: number) {
  try {
    await updateSpuStatus(id, status);
    ElMessage.success('状态已更新');
    await Promise.all([loadData(), loadMeta()]);
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
}

async function onDelete(id: number) {
  try {
    await ElMessageBox.confirm(`确认删除 SPU #${id} 吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deleteSpu(id);
    ElMessage.success('删除成功');
    await Promise.all([loadData(), loadMeta()]);
  } catch (_error) {
    // ignore cancel
  }
}

onMounted(async () => {
  try {
    await loadMeta();
    await loadData();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
});
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 22px;
  font-weight: 700;
}

.tab-row {
  margin-bottom: 12px;
}

.filter-row {
  margin-bottom: 12px;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pager-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
