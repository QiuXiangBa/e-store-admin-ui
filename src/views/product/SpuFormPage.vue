<template>
  <div class="spu-form-page">
    <div class="header-row page-header">
      <span class="title">{{ pageTitle }}</span>
      <el-button @click="goBack">返回列表</el-button>
    </div>

    <el-affix :offset="0" target=".layout-main">
      <div class="section-nav">
        <el-space>
          <el-button
            v-for="section in FORM_SECTION_NAV"
            :key="section.key"
            :type="activeSection === section.key ? 'primary' : 'default'"
            size="small"
            @click="scrollToSection(section.key)"
          >
            {{ section.label }}
          </el-button>
        </el-space>
      </div>
    </el-affix>

    <el-card>
      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin-bottom: 12px" />

      <div ref="infoRef" class="section-block">
        <h3>基础信息</h3>
        <el-form label-width="120px">
          <el-row :gutter="12">
            <el-col :span="8"><el-form-item label="商品名称" required><el-input v-model="form.name" :disabled="readonly" /></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="分类" required>
              <el-select v-model="form.categoryId" :disabled="readonly" style="width: 100%" @change="onCategoryChange">
                <el-option :value="0" label="请选择分类" />
                <el-option
                  v-for="item in categories"
                  :key="item.id"
                  :label="getCategoryOptionLabel(item)"
                  :value="item.id"
                  :disabled="!isLeafCategory(item)"
                />
              </el-select>
            </el-form-item></el-col>
            <el-col :span="8"><el-form-item label="品牌" required>
              <el-select v-model="form.brandId" :disabled="readonly" style="width: 100%">
                <el-option :value="0" label="请选择品牌" />
                <el-option v-for="item in brands" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item></el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="8"><el-form-item label="关键字" required><el-input v-model="form.keyword" :disabled="readonly" /></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="封面图 URL" required><el-input v-model="form.picUrl" :disabled="readonly" /></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="排序"><el-input-number v-model="form.sort" :disabled="readonly" :min="0" style="width: 100%" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="商品简介" required><el-input v-model="form.introduction" :disabled="readonly" type="textarea" :rows="2" /></el-form-item>

          <el-divider content-position="left">展示属性</el-divider>
          <el-row :gutter="12">
            <el-col v-for="item in displayPropertyOptions" :key="item.propertyId" :span="8">
              <el-form-item :label="`${item.propertyName}${item.required ? '*' : ''}`">
                <el-input
                  :model-value="getDisplayPropertyValue(item.propertyId)"
                  :disabled="readonly"
                  @input="(value: string | number) => patchDisplayProperty(item.propertyId, item.propertyName, String(value), item.sort)"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <div ref="skuRef" class="section-block">
        <h3>销售信息</h3>

        <div class="spec-switch-row">
          <el-checkbox v-model="form.subCommissionType" :disabled="readonly">分销类型：单独设置</el-checkbox>
          <el-checkbox v-model="form.specType" :disabled="readonly" @change="onSpecTypeChange">商品规格：多规格</el-checkbox>
        </div>

        <template v-if="form.specType">
          <div class="sales-header-row">
            <span>销售属性</span>
            <el-tag type="info">先选属性值，再生成销售规格</el-tag>
          </div>

          <el-alert v-if="salesPropertyOptions.length === 0" type="warning" :closable="false" show-icon title="当前分类未配置销售属性，请先到类目属性绑定配置" />

          <div v-else class="sales-property-panel">
            <div v-for="property in salesPropertyOptions" :key="property.propertyId" class="sales-property-block">
              <div class="sales-property-title">
                <span>{{ property.propertyName }}（{{ (salesValueSlots[property.propertyId] || []).length }}）</span>
                <span class="sales-property-tags">
                  <span v-if="property.required" class="required">*</span>
                  <el-tag size="small" type="warning" v-if="property.required">必填</el-tag>
                </span>
              </div>

              <div class="sales-value-grid">
                <div
                  v-for="(slot, slotIndex) in salesValueSlots[property.propertyId] || []"
                  :key="`${property.propertyId}-${slotIndex}`"
                  class="sales-value-item"
                >
                  <button
                    v-if="property.supportValueImage"
                    class="slot-img-btn"
                    :disabled="readonly"
                    @click="triggerSalesSlotImageUpload(property.propertyId, slotIndex)"
                    type="button"
                  >
                    <el-image
                      v-if="resolvePreviewUrl(slot.picUrl)"
                      :src="resolvePreviewUrl(slot.picUrl)"
                      fit="cover"
                      style="width: 32px; height: 32px; border-radius: 6px"
                    />
                    <span v-else>图</span>
                  </button>

                  <el-select
                    :model-value="slot.valueId"
                    :disabled="readonly"
                    clearable
                    placeholder="请选择"
                    class="slot-select"
                    @change="(value: string | number | boolean) => patchSalesValueBySlot(property.propertyId, slotIndex, value ? Number(value) : null)"
                  >
                    <el-option
                      v-for="option in propertyValueOptions[property.propertyId] || []"
                      :key="option.id"
                      :label="option.name"
                      :value="option.id"
                    />
                  </el-select>

                  <el-button
                    v-if="!readonly"
                    class="slot-remove"
                    link
                    type="danger"
                    @click="removeSalesValueSlot(property.propertyId, slotIndex)"
                  >删除</el-button>
                </div>

                <div v-if="!readonly" class="sales-value-item">
                  <el-button class="slot-plus" @click="addSalesValueSlot(property.propertyId)">+</el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="sales-header-row" style="margin-top: 16px">
            <span>销售规格</span>
            <el-tag>SKU {{ form.skus.length }} 条</el-tag>
          </div>

          <div v-if="!readonly && form.skus.length > 0" class="batch-panel">
            <el-space wrap>
              <el-input-number v-model="batchSku.price" :min="0" :step="0.01" controls-position="right" placeholder="价格(元)" />
              <el-input-number v-model="batchSku.stock" :min="0" controls-position="right" placeholder="数量(库存)" />
              <el-text type="info">已选 {{ selectedSkuIndexes.length }} 条 SKU</el-text>
              <el-button type="primary" @click="applyBatchSku">批量应用</el-button>
            </el-space>
          </div>

          <el-alert
            v-if="form.specType && propertyList.length === 0"
            type="info"
            :closable="false"
            show-icon
            title="请先在上方选择销售属性值，再自动生成销售规格（SKU）"
          />

          <div v-else class="sku-table-wrap">
            <el-table :data="orderedSkuRows" border :row-key="getSkuRowKey" style="width: 100%" class="sku-table">
              <el-table-column v-if="!readonly" label="选择" width="70" fixed="left">
                <template #header>
                  <el-checkbox
                    :model-value="isAllSkuSelected"
                    :indeterminate="isSkuSelectionIndeterminate"
                    @change="(value: string | number | boolean) => toggleSelectAllSku(Boolean(value))"
                  />
                </template>
                <template #default="scope">
                  <el-checkbox
                    :model-value="selectedSkuIndexes.includes(scope.row.sourceIndex)"
                    @change="(value: string | number | boolean) => toggleSelectSku(scope.row.sourceIndex, Boolean(value))"
                  />
                </template>
              </el-table-column>
              <el-table-column label="SKU搜索主图" width="140">
                <template #default="scope">
                  <el-input
                    :model-value="scope.row.sku.picUrl"
                    :disabled="readonly"
                    size="small"
                    placeholder="可选，留空回退"
                    @input="(value: string | number) => patchSku(scope.row.sourceIndex, 'picUrl', String(value))"
                  />
                </template>
              </el-table-column>

              <el-table-column
                v-for="property in propertyList"
                :key="property.id"
                :label="property.name"
                :min-width="property.id === colorPropertyId || property.name.includes('色') ? 180 : 140"
              >
                <template #default="scope">
                  <div class="sku-prop-cell">
                    <el-image
                      v-if="(property.id === colorPropertyId || property.name.includes('色')) && getSkuPropertyPic(scope.row.sku, property.id)"
                      :src="resolvePreviewUrl(getSkuPropertyPic(scope.row.sku, property.id))"
                      fit="cover"
                      style="width: 24px; height: 24px; border-radius: 4px"
                    />
                    <span>{{ getSkuPropertyName(scope.row.sku, property.id) }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="商品条码" width="150">
                <template #default="scope"><el-input :model-value="scope.row.sku.barCode" :disabled="readonly" size="small" @input="(value: string | number) => patchSku(scope.row.sourceIndex, 'barCode', String(value))" /></template>
              </el-table-column>
              <el-table-column label="价格(元)" width="130">
                <template #default="scope"><el-input-number :model-value="scope.row.sku.price" :disabled="readonly" size="small" :min="0" :step="0.01" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'price', Number(value || 0))" /></template>
              </el-table-column>
              <el-table-column label="市场价(元)" width="130">
                <template #default="scope"><el-input-number :model-value="scope.row.sku.marketPrice" :disabled="readonly" size="small" :min="0" :step="0.01" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'marketPrice', Number(value || 0))" /></template>
              </el-table-column>
              <el-table-column label="成本价(元)" width="130">
                <template #default="scope"><el-input-number :model-value="scope.row.sku.costPrice" :disabled="readonly" size="small" :min="0" :step="0.01" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'costPrice', Number(value || 0))" /></template>
              </el-table-column>
              <el-table-column label="库存" width="120">
                <template #default="scope"><el-input-number :model-value="scope.row.sku.stock" :disabled="readonly" size="small" :min="0" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'stock', Number(value || 0))" /></template>
              </el-table-column>
              <el-table-column label="重量(kg)" width="120">
                <template #default="scope"><el-input-number :model-value="scope.row.sku.weight" :disabled="readonly" size="small" :min="0" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'weight', Number(value || 0))" /></template>
              </el-table-column>
              <el-table-column label="体积(m³)" width="120">
                <template #default="scope"><el-input-number :model-value="scope.row.sku.volume" :disabled="readonly" size="small" :min="0" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'volume', Number(value || 0))" /></template>
              </el-table-column>
              <el-table-column v-if="form.subCommissionType" label="一级返佣(元)" width="140">
                <template #default="scope"><el-input-number :model-value="scope.row.sku.subCommissionFirstPrice" :disabled="readonly" size="small" :min="0" :step="0.01" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'subCommissionFirstPrice', Number(value || 0))" /></template>
              </el-table-column>
              <el-table-column v-if="form.subCommissionType" label="二级返佣(元)" width="140">
                <template #default="scope"><el-input-number :model-value="scope.row.sku.subCommissionSecondPrice" :disabled="readonly" size="small" :min="0" :step="0.01" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'subCommissionSecondPrice', Number(value || 0))" /></template>
              </el-table-column>
              <el-table-column v-if="form.specType && !readonly" label="操作" width="90" fixed="right">
                <template #default="scope">
                  <el-button link type="danger" @click="deleteSku(scope.row.sourceIndex)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>

        <template v-else>
          <div class="sku-table-wrap">
            <el-table :data="[{ sku: form.skus[0] || createDefaultSku(), sourceIndex: 0 }]" border style="width: 100%" class="sku-table">
              <el-table-column label="价格(元)" width="140"><template #default="scope"><el-input-number :model-value="scope.row.sku.price" :disabled="readonly" size="small" :min="0" :step="0.01" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'price', Number(value || 0))" /></template></el-table-column>
              <el-table-column label="市场价(元)" width="140"><template #default="scope"><el-input-number :model-value="scope.row.sku.marketPrice" :disabled="readonly" size="small" :min="0" :step="0.01" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'marketPrice', Number(value || 0))" /></template></el-table-column>
              <el-table-column label="成本价(元)" width="140"><template #default="scope"><el-input-number :model-value="scope.row.sku.costPrice" :disabled="readonly" size="small" :min="0" :step="0.01" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'costPrice', Number(value || 0))" /></template></el-table-column>
              <el-table-column label="库存" width="140"><template #default="scope"><el-input-number :model-value="scope.row.sku.stock" :disabled="readonly" size="small" :min="0" controls-position="right" @change="(value: number | undefined) => patchSku(scope.row.sourceIndex, 'stock', Number(value || 0))" /></template></el-table-column>
            </el-table>
          </div>
        </template>
      </div>

      <div ref="deliveryRef" class="section-block">
        <h3>物流服务</h3>
        <el-checkbox-group v-model="form.deliveryTypes" :disabled="readonly">
          <el-checkbox :label="DELIVERY_TYPE_EXPRESS">快递</el-checkbox>
          <el-checkbox :label="DELIVERY_TYPE_PICK_UP">门店自提</el-checkbox>
          <el-checkbox :label="DELIVERY_TYPE_SAME_CITY">同城配送</el-checkbox>
        </el-checkbox-group>
        <el-form v-if="form.deliveryTypes.includes(DELIVERY_TYPE_EXPRESS)" label-width="120px" style="margin-top: 12px">
          <el-form-item label="运费模板 ID"><el-input-number v-model="form.deliveryTemplateId" :disabled="readonly" :min="0" style="width: 240px" /></el-form-item>
        </el-form>
      </div>

      <div ref="descriptionRef" class="section-block">
        <h3>图文描述</h3>
        <el-input v-model="form.description" :disabled="readonly" type="textarea" :rows="8" placeholder="请输入商品详情" />
      </div>

      <div ref="otherRef" class="section-block">
        <h3>其它设置</h3>
        <el-form label-width="120px">
          <el-row :gutter="12">
            <el-col :span="8"><el-form-item label="赠送积分"><el-input-number v-model="form.giveIntegral" :disabled="readonly" :min="0" style="width: 100%" /></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="活动排序"><el-input v-model="form.activityOrders" :disabled="readonly" /></el-form-item></el-col>
          </el-row>
        </el-form>
      </div>

      <div class="footer-bar">
        <el-space>
          <el-button v-if="!readonly" type="primary" :loading="loading" @click="submit">保存</el-button>
          <el-button @click="goBack">返回</el-button>
        </el-space>
      </div>
    </el-card>

    <input ref="slotUploadInputRef" type="file" accept="image/*" style="display: none" @change="handleSalesSlotImageSelect" />
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  createSpu,
  getBrandSimpleList,
  getCategoryList,
  getCategoryPropertyList,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  getPropertyValueSimpleList,
  getSpuDetail,
  type BrandResp,
  type CategoryPropertyResp,
  type CategoryResp,
  type PropertyValueResp,
  type SkuProperty,
  type SkuResp,
  type SpuDisplayProperty,
  type SpuSaveReq,
  updateSpu
} from '../../api/admin';

type FormSection = 'info' | 'sku' | 'delivery' | 'description' | 'other';

const FORM_SECTION_NAV: Array<{ key: FormSection; label: string }> = [
  { key: 'info', label: '基础信息' },
  { key: 'sku', label: '销售信息' },
  { key: 'delivery', label: '物流服务' },
  { key: 'description', label: '图文描述' },
  { key: 'other', label: '其它设置' }
];

const DELIVERY_TYPE_EXPRESS = 1;
const DELIVERY_TYPE_PICK_UP = 2;
const DELIVERY_TYPE_SAME_CITY = 3;
const PROPERTY_TYPE_DISPLAY = 0;
const PROPERTY_TYPE_SALES = 1;

interface PropertyAndValues {
  id: number;
  name: string;
  values: Array<{ id: number; name: string; picUrl?: string }>;
}

interface SalesValueSlot {
  valueId: number | null;
  valueName: string;
  picUrl: string;
}

type SalesSlotMap = Record<number, SalesValueSlot[]>;

interface OrderedSkuRow {
  sku: SkuResp;
  sourceIndex: number;
}

const route = useRoute();
const router = useRouter();

const spuId = Number(route.params.id || 0);
const isEdit = route.path.endsWith('/edit');
const isDetail = Boolean(spuId) && !isEdit;
const readonly = computed(() => isDetail);

function createDefaultSku(): SkuResp {
  return {
    properties: [],
    price: 0,
    marketPrice: 0,
    costPrice: 0,
    barCode: '',
    picUrl: '',
    stock: 0,
    weight: 0,
    volume: 0,
    subCommissionFirstPrice: 0,
    subCommissionSecondPrice: 0
  };
}

function createDefaultForm(): SpuSaveReq {
  return {
    name: '',
    keyword: '',
    introduction: '',
    description: '',
    barCode: '',
    categoryId: 0,
    brandId: 0,
    picUrl: '',
    sliderPicUrls: [],
    videoUrl: '',
    sort: 0,
    specType: false,
    deliveryTypes: [],
    deliveryTemplateId: 0,
    recommendHot: false,
    recommendBenefit: false,
    recommendBest: false,
    recommendNew: false,
    recommendGood: false,
    giveIntegral: 0,
    giveCouponTemplateIds: '',
    subCommissionType: false,
    activityOrders: '',
    displayProperties: [],
    skus: [createDefaultSku()]
  };
}

function fenToYuan(price?: number) {
  return Number(((price ?? 0) / 100).toFixed(2));
}

function yuanToFen(price?: number) {
  const value = Number(price ?? 0);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100);
}

function buildSkuKey(properties?: SkuProperty[]) {
  if (!properties || properties.length === 0) {
    return '';
  }
  return properties
    .map((item) => item.valueId)
    .sort((a, b) => a - b)
    .join('_');
}

function buildPropertyListFromSkus(skus: SkuResp[]): PropertyAndValues[] {
  const propertyMap = new Map<number, PropertyAndValues>();
  skus.forEach((sku) => {
    (sku.properties ?? []).forEach((property) => {
      const exists = propertyMap.get(property.propertyId);
      if (!exists) {
        propertyMap.set(property.propertyId, {
          id: property.propertyId,
          name: property.propertyName,
          values: [{ id: property.valueId, name: property.valueName, picUrl: property.valuePicUrl }]
        });
        return;
      }
      if (!exists.values.some((value) => value.id === property.valueId)) {
        exists.values.push({ id: property.valueId, name: property.valueName, picUrl: property.valuePicUrl });
      }
    });
  });
  return Array.from(propertyMap.values());
}

function buildSkuCombinations(propertyList: PropertyAndValues[]): SkuProperty[][] {
  if (propertyList.length === 0) {
    return [];
  }
  let combinations: SkuProperty[][] = [[]];
  propertyList.forEach((property) => {
    const next: SkuProperty[][] = [];
    property.values.forEach((value) => {
      combinations.forEach((combination) => {
        next.push([
          ...combination,
          {
            propertyId: property.id,
            propertyName: property.name,
            valueId: value.id,
            valueName: value.name,
            valuePicUrl: value.picUrl
          }
        ]);
      });
    });
    combinations = next;
  });
  return combinations;
}

function mergeSkusByProperty(prevSkus: SkuResp[], propertyList: PropertyAndValues[]) {
  const prevSkuMap = new Map(prevSkus.map((sku) => [buildSkuKey(sku.properties), sku]));
  const combinations = buildSkuCombinations(propertyList);
  return combinations.map((properties) => {
    const key = buildSkuKey(properties);
    const exists = prevSkuMap.get(key);
    if (exists) {
      return { ...exists, properties };
    }
    return { ...createDefaultSku(), properties };
  });
}

const loading = ref(false);
const errorMessage = ref('');
const activeSection = ref<FormSection>('info');

const form = ref<SpuSaveReq>(createDefaultForm());
const batchSku = ref<SkuResp>(createDefaultSku());
const selectedSkuIndexes = ref<number[]>([]);

const brands = ref<BrandResp[]>([]);
const categories = ref<CategoryResp[]>([]);
const salesPropertyOptions = ref<CategoryPropertyResp[]>([]);
const displayPropertyOptions = ref<CategoryPropertyResp[]>([]);
const propertyValueOptions = ref<Record<number, PropertyValueResp[]>>({});

const salesValueSlots = ref<SalesSlotMap>({});
const propertyList = ref<PropertyAndValues[]>([]);
const previewUrlMap = ref<Record<string, string>>({});

const slotUploadInputRef = ref<HTMLInputElement | null>(null);
const pendingSlotUploadTarget = ref<{ propertyId: number; slotIndex: number } | null>(null);

const infoRef = ref<HTMLElement | null>(null);
const skuRef = ref<HTMLElement | null>(null);
const deliveryRef = ref<HTMLElement | null>(null);
const descriptionRef = ref<HTMLElement | null>(null);
const otherRef = ref<HTMLElement | null>(null);

const pageTitle = computed(() => {
  if (!spuId) {
    return '新增商品';
  }
  return isDetail ? `商品详情 #${spuId}` : `编辑商品 #${spuId}`;
});

const colorPropertyId = computed(() => {
  const withImageProperty = salesPropertyOptions.value.find((item) => item.supportValueImage);
  if (withImageProperty) {
    return withImageProperty.propertyId;
  }
  const colorByName = propertyList.value.find((item) => item.name.includes('色'));
  return colorByName?.id;
});

const orderedSkuRows = computed<OrderedSkuRow[]>(() => {
  const rows = form.value.skus.map((sku, sourceIndex) => ({ sku, sourceIndex }));
  if (!form.value.specType || !colorPropertyId.value) {
    return rows;
  }
  return rows.sort((left, right) => {
    const leftColorValueId =
      left.sku.properties?.find((item) => item.propertyId === colorPropertyId.value)?.valueId ?? Number.MAX_SAFE_INTEGER;
    const rightColorValueId =
      right.sku.properties?.find((item) => item.propertyId === colorPropertyId.value)?.valueId ?? Number.MAX_SAFE_INTEGER;
    if (leftColorValueId !== rightColorValueId) {
      return leftColorValueId - rightColorValueId;
    }
    return left.sourceIndex - right.sourceIndex;
  });
});

const isAllSkuSelected = computed(() => {
  if (!orderedSkuRows.value.length) {
    return false;
  }
  return orderedSkuRows.value.every((row) => selectedSkuIndexes.value.includes(row.sourceIndex));
});

const isSkuSelectionIndeterminate = computed(() => {
  if (!orderedSkuRows.value.length) {
    return false;
  }
  return selectedSkuIndexes.value.length > 0 && !isAllSkuSelected.value;
});

function getSectionRef(section: FormSection) {
  if (section === 'info') return infoRef.value;
  if (section === 'sku') return skuRef.value;
  if (section === 'delivery') return deliveryRef.value;
  if (section === 'description') return descriptionRef.value;
  return otherRef.value;
}

function scrollToSection(section: FormSection) {
  activeSection.value = section;
  getSectionRef(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onSpecTypeChange() {
  if (!form.value.specType) {
    form.value.skus = [form.value.skus[0] ?? createDefaultSku()];
    return;
  }
  form.value.skus = [];
}

function getDisplayPropertyValue(propertyId: number) {
  return form.value.displayProperties?.find((item) => item.propertyId === propertyId)?.valueText || '';
}

function patchDisplayProperty(propertyId: number, propertyName: string, valueText: string, sort: number) {
  const list = [...(form.value.displayProperties ?? [])];
  const idx = list.findIndex((item) => item.propertyId === propertyId);
  if (!valueText.trim()) {
    if (idx >= 0) {
      list.splice(idx, 1);
    }
    form.value.displayProperties = list;
    return;
  }
  const nextItem: SpuDisplayProperty = { propertyId, propertyName, valueText, sort };
  if (idx >= 0) {
    list[idx] = nextItem;
  } else {
    list.push(nextItem);
  }
  form.value.displayProperties = list;
}

function getSkuPropertyName(sku: SkuResp, propertyId: number) {
  return sku.properties?.find((item) => item.propertyId === propertyId)?.valueName || '';
}

function getSkuPropertyPic(sku: SkuResp, propertyId: number) {
  return sku.properties?.find((item) => item.propertyId === propertyId)?.valuePicUrl || '';
}

function getSkuRowKey(row: OrderedSkuRow) {
  return buildSkuKey(row.sku.properties) || String(row.sourceIndex);
}

function patchSku(index: number, key: keyof SkuResp, value: number | string) {
  const skus = [...form.value.skus];
  skus[index] = { ...skus[index], [key]: value };
  form.value.skus = skus;
}

function deleteSku(index: number) {
  form.value.skus = form.value.skus.filter((_, rowIndex) => rowIndex !== index);
}

function applyBatchSku() {
  if (!selectedSkuIndexes.value.length) {
    ElMessage.warning('请先勾选要批量填写的 SKU');
    return;
  }
  form.value.skus = form.value.skus.map((sku, index) => {
    if (!selectedSkuIndexes.value.includes(index)) {
      return sku;
    }
    return {
      ...sku,
      price: batchSku.value.price,
      stock: batchSku.value.stock
    };
  });
  ElMessage.success(`已批量应用到 ${selectedSkuIndexes.value.length} 条 SKU`);
}

function toggleSelectSku(sourceIndex: number, checked: boolean) {
  if (checked) {
    selectedSkuIndexes.value = Array.from(new Set([...selectedSkuIndexes.value, sourceIndex]));
    return;
  }
  selectedSkuIndexes.value = selectedSkuIndexes.value.filter((item) => item !== sourceIndex);
}

function toggleSelectAllSku(checked: boolean) {
  if (checked) {
    selectedSkuIndexes.value = orderedSkuRows.value.map((row) => row.sourceIndex);
    return;
  }
  selectedSkuIndexes.value = [];
}

function rebuildPropertyListFromSlots(nextSlots: SalesSlotMap) {
  const nextPropertyList: PropertyAndValues[] = salesPropertyOptions.value
    .map((property) => {
      const optionMap = new Map((propertyValueOptions.value[property.propertyId] ?? []).map((item) => [item.id, item]));
      const selectedValues = nextSlots[property.propertyId] ?? [];
      const valuesMap = new Map<number, { id: number; name: string; picUrl?: string }>();
      selectedValues.forEach((slot) => {
        if (!slot.valueId) {
          return;
        }
        const option = optionMap.get(slot.valueId);
        const valueName = slot.valueName || option?.name || '';
        if (!valueName) {
          return;
        }
        const valuePicUrl = property.supportValueImage ? slot.picUrl || option?.picUrl || '' : option?.picUrl || '';
        valuesMap.set(slot.valueId, { id: slot.valueId, name: valueName, picUrl: valuePicUrl });
      });
      return {
        id: property.propertyId,
        name: property.propertyName,
        values: Array.from(valuesMap.values())
      };
    })
    .filter((item) => item.values.length > 0);
  propertyList.value = nextPropertyList;
}

function addSalesValueSlot(propertyId: number) {
  const current = salesValueSlots.value[propertyId] ?? [];
  const next: SalesSlotMap = {
    ...salesValueSlots.value,
    [propertyId]: [...current, { valueId: null, valueName: '', picUrl: '' }]
  };
  salesValueSlots.value = next;
  rebuildPropertyListFromSlots(next);
}

function removeSalesValueSlot(propertyId: number, slotIndex: number) {
  const current = salesValueSlots.value[propertyId] ?? [];
  const next: SalesSlotMap = {
    ...salesValueSlots.value,
    [propertyId]: current.filter((_, index) => index !== slotIndex)
  };
  salesValueSlots.value = next;
  rebuildPropertyListFromSlots(next);
}

function patchSalesValueSlot(propertyId: number, slotIndex: number, patch: Partial<SalesValueSlot>) {
  const current = salesValueSlots.value[propertyId] ?? [];
  if (!current[slotIndex]) {
    return;
  }
  const nextSlots = current.map((item, index) => (index === slotIndex ? { ...item, ...patch } : item));
  const next = { ...salesValueSlots.value, [propertyId]: nextSlots };
  salesValueSlots.value = next;
  rebuildPropertyListFromSlots(next);
}

function patchSalesValueBySlot(propertyId: number, slotIndex: number, valueId: number | null) {
  errorMessage.value = '';
  const current = salesValueSlots.value[propertyId] ?? [];
  if (!current[slotIndex]) {
    return;
  }
  if (!valueId) {
    patchSalesValueSlot(propertyId, slotIndex, { valueId: null, valueName: '' });
    return;
  }
  if (current.some((item, index) => index !== slotIndex && item.valueId === valueId)) {
    errorMessage.value = '同一销售属性下不能重复选择同一个规格值';
    return;
  }
  const option = (propertyValueOptions.value[propertyId] ?? []).find((item) => item.id === valueId);
  const property = salesPropertyOptions.value.find((item) => item.propertyId === propertyId);
  patchSalesValueSlot(propertyId, slotIndex, {
    valueId,
    valueName: option?.name || '',
    picUrl: property?.supportValueImage ? current[slotIndex].picUrl || option?.picUrl || '' : ''
  });
}

function triggerSalesSlotImageUpload(propertyId: number, slotIndex: number) {
  if (readonly.value) {
    return;
  }
  pendingSlotUploadTarget.value = { propertyId, slotIndex };
  slotUploadInputRef.value?.click();
}

async function handleSalesSlotImageSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !pendingSlotUploadTarget.value) {
    return;
  }
  try {
    const sign = await getPresignedUploadUrl({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      pathPrefix: 'product/spu/sales-property'
    });
    await axios.put(sign.uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'application/octet-stream' }
    });
    const { propertyId, slotIndex } = pendingSlotUploadTarget.value;
    patchSalesValueSlot(propertyId, slotIndex, { picUrl: sign.objectUrl });
    await loadPreviewUrls([sign.objectUrl]);
    ElMessage.success('上传成功');
  } catch (error) {
    errorMessage.value = `图片上传失败：${(error as Error).message}`;
  } finally {
    pendingSlotUploadTarget.value = null;
  }
}

function resolvePreviewUrl(objectUrl?: string) {
  const key = objectUrl?.trim();
  if (!key) {
    return '';
  }
  return previewUrlMap.value[key] || '';
}

function isLeafCategory(category: CategoryResp) {
  if (typeof category.isLeaf === 'boolean') {
    return category.isLeaf;
  }
  return !categories.value.some((item) => item.parentId === category.id);
}

function getCategoryOptionLabel(category: CategoryResp) {
  if (isLeafCategory(category)) {
    return category.name;
  }
  return `${category.name}（仅叶子类目可发布）`;
}

async function loadPreviewUrls(objectUrls: string[]) {
  const unique = Array.from(new Set(objectUrls.map((item) => item.trim()).filter(Boolean)));
  const pending = unique.filter((item) => !previewUrlMap.value[item]);
  if (!pending.length) {
    return;
  }
  const entries = await Promise.all(
    pending.map(async (objectUrl) => {
      try {
        const resp = await getPresignedDownloadUrl({ objectUrl });
        return [objectUrl, resp.downloadUrl] as const;
      } catch (_error) {
        return [objectUrl, ''] as const;
      }
    })
  );
  previewUrlMap.value = Object.fromEntries([...Object.entries(previewUrlMap.value), ...entries]);
}

async function loadPropertyValueOptions(propertyId: number) {
  if (propertyValueOptions.value[propertyId]) {
    return;
  }
  const values = await getPropertyValueSimpleList(propertyId);
  propertyValueOptions.value = {
    ...propertyValueOptions.value,
    [propertyId]: values
  };
}

async function loadCategoryProperties(categoryId: number) {
  if (!categoryId) {
    salesPropertyOptions.value = [];
    displayPropertyOptions.value = [];
    return;
  }
  const [salesList, displayList] = await Promise.all([
    getCategoryPropertyList(categoryId, PROPERTY_TYPE_SALES),
    getCategoryPropertyList(categoryId, PROPERTY_TYPE_DISPLAY)
  ]);
  salesPropertyOptions.value = salesList.filter((item) => item.enabled);
  displayPropertyOptions.value = displayList.filter((item) => item.enabled);
}

async function onCategoryChange(categoryId: number) {
  try {
    await loadCategoryProperties(categoryId);
    form.value.displayProperties = [];
    salesValueSlots.value = {};
    propertyList.value = [];
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function loadMeta() {
  const [brandList, categoryList] = await Promise.all([getBrandSimpleList(), getCategoryList()]);
  brands.value = brandList;
  categories.value = categoryList;
}

async function loadDetail(targetId: number) {
  const detail = await getSpuDetail(targetId);
  const detailSkus = (detail.skus.length ? detail.skus : [createDefaultSku()]).map((sku) => ({
    ...sku,
    price: fenToYuan(sku.price),
    marketPrice: fenToYuan(sku.marketPrice),
    costPrice: fenToYuan(sku.costPrice),
    subCommissionFirstPrice: fenToYuan(sku.subCommissionFirstPrice),
    subCommissionSecondPrice: fenToYuan(sku.subCommissionSecondPrice)
  })) as unknown as SkuResp[];

  form.value = {
    id: detail.id,
    name: detail.name,
    keyword: detail.keyword,
    introduction: detail.introduction,
    description: detail.description,
    barCode: detail.barCode || '',
    categoryId: detail.categoryId,
    brandId: detail.brandId,
    picUrl: detail.picUrl,
    sliderPicUrls: detail.sliderPicUrls || [],
    videoUrl: detail.videoUrl || '',
    sort: detail.sort,
    specType: detail.specType,
    deliveryTypes: detail.deliveryTypes || [],
    deliveryTemplateId: detail.deliveryTemplateId || 0,
    recommendHot: Boolean(detail.recommendHot),
    recommendBenefit: Boolean(detail.recommendBenefit),
    recommendBest: Boolean(detail.recommendBest),
    recommendNew: Boolean(detail.recommendNew),
    recommendGood: Boolean(detail.recommendGood),
    giveIntegral: detail.giveIntegral || 0,
    giveCouponTemplateIds: detail.giveCouponTemplateIds || '',
    subCommissionType: Boolean(detail.subCommissionType),
    activityOrders: detail.activityOrders || '',
    displayProperties: detail.displayProperties || [],
    skus: detailSkus
  };

  const propertyListFromDetail = buildPropertyListFromSkus(detailSkus);
  propertyList.value = propertyListFromDetail;
  salesValueSlots.value = propertyListFromDetail.reduce<SalesSlotMap>((accumulator, item) => {
    accumulator[item.id] = item.values.map((value) => ({
      valueId: value.id,
      valueName: value.name,
      picUrl: value.picUrl || ''
    }));
    return accumulator;
  }, {});
}

function goBack() {
  void router.push('/product/spu');
}

async function submit() {
  if (readonly.value) {
    goBack();
    return;
  }

  if (!form.value.name || !form.value.keyword || !form.value.introduction || !form.value.description || !form.value.picUrl) {
    errorMessage.value = '请完善基础信息';
    activeSection.value = 'info';
    return;
  }

  if (!form.value.categoryId || !form.value.brandId) {
    errorMessage.value = '请选择分类和品牌';
    activeSection.value = 'info';
    return;
  }
  const selectedCategory = categories.value.find((item) => item.id === form.value.categoryId);
  if (!selectedCategory || !isLeafCategory(selectedCategory)) {
    errorMessage.value = '请选择可发布的叶子类目';
    activeSection.value = 'info';
    return;
  }

  const requiredDisplayProperties = displayPropertyOptions.value.filter((item) => item.required);
  const displayValueMap = new Map((form.value.displayProperties ?? []).map((item) => [item.propertyId, item.valueText]));
  if (requiredDisplayProperties.some((item) => !displayValueMap.get(item.propertyId)?.trim())) {
    errorMessage.value = '请填写类目必填展示属性';
    activeSection.value = 'info';
    return;
  }

  if (form.value.specType) {
    const requiredSalesProperties = salesPropertyOptions.value.filter((item) => item.required);
    const selectedSalesValueMap = new Map(propertyList.value.map((item) => [item.id, (item.values ?? []).map((value) => value.id)]));
    if (requiredSalesProperties.some((item) => !(selectedSalesValueMap.get(item.propertyId) ?? []).length)) {
      errorMessage.value = '请先完成必填销售属性的值选择';
      activeSection.value = 'sku';
      return;
    }
    if (!propertyList.value.length) {
      errorMessage.value = '多规格模式下请先选择销售属性值';
      activeSection.value = 'sku';
      return;
    }
  }

  if (!form.value.skus.length) {
    errorMessage.value = '请至少配置一条 SKU';
    activeSection.value = 'sku';
    return;
  }

  if (!form.value.deliveryTypes.length) {
    errorMessage.value = '请至少选择一种配送方式';
    activeSection.value = 'delivery';
    return;
  }

  if (form.value.deliveryTypes.includes(DELIVERY_TYPE_EXPRESS) && !form.value.deliveryTemplateId) {
    errorMessage.value = '选择快递配送时必须填写运费模板 ID';
    activeSection.value = 'delivery';
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  try {
    const payload: SpuSaveReq = {
      ...form.value,
      skus: form.value.skus.map((sku) => ({
        ...sku,
        price: yuanToFen(Number(sku.price || 0)),
        marketPrice: yuanToFen(Number(sku.marketPrice || 0)),
        costPrice: yuanToFen(Number(sku.costPrice || 0)),
        subCommissionFirstPrice: yuanToFen(Number(sku.subCommissionFirstPrice || 0)),
        subCommissionSecondPrice: yuanToFen(Number(sku.subCommissionSecondPrice || 0))
      })),
      sliderPicUrls: (form.value.sliderPicUrls ?? []).filter(Boolean),
      displayProperties: (form.value.displayProperties ?? []).filter((item) => item.valueText?.trim())
    };

    if (spuId) {
      await updateSpu({ ...payload, id: spuId });
    } else {
      await createSpu(payload);
    }
    ElMessage.success('保存成功');
    goBack();
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
}

watch(
  () => form.value.categoryId,
  (value) => {
    if (!value) {
      salesPropertyOptions.value = [];
      displayPropertyOptions.value = [];
      return;
    }
    void loadCategoryProperties(value).catch((error) => {
      errorMessage.value = (error as Error).message;
    });
  }
);

watch(
  () => salesPropertyOptions.value,
  (options) => {
    if (!options.length) {
      salesValueSlots.value = {};
      propertyList.value = [];
      return;
    }
    const nextSlots = options.reduce<SalesSlotMap>((accumulator, property) => {
      accumulator[property.propertyId] = salesValueSlots.value[property.propertyId] ?? [];
      return accumulator;
    }, {});
    salesValueSlots.value = nextSlots;
    rebuildPropertyListFromSlots(nextSlots);

    options.forEach((item) => {
      if (!propertyValueOptions.value[item.propertyId]) {
        void loadPropertyValueOptions(item.propertyId).catch((error) => {
          errorMessage.value = (error as Error).message;
        });
      }
    });
  },
  { immediate: true }
);

watch(
  () => propertyList.value,
  (nextPropertyList) => {
    if (!form.value.specType) {
      if (form.value.skus.length !== 1) {
        form.value.skus = [form.value.skus[0] ?? createDefaultSku()];
      }
      return;
    }
    if (nextPropertyList.length === 0 || nextPropertyList.some((item) => item.values.length === 0)) {
      form.value.skus = [];
      return;
    }
    form.value.skus = mergeSkusByProperty(form.value.skus, nextPropertyList);
  },
  { deep: true }
);

watch(
  () => form.value.skus.length,
  () => {
    const validIndexes = new Set(form.value.skus.map((_, index) => index));
    selectedSkuIndexes.value = selectedSkuIndexes.value.filter((index) => validIndexes.has(index));
  }
);

watch(
  () => salesValueSlots.value,
  (slots) => {
    const objectUrls = Array.from(
      new Set(
        Object.values(slots)
          .flatMap((items) => items.map((slot) => slot.picUrl?.trim() || ''))
          .filter(Boolean)
      )
    );
    if (objectUrls.length) {
      void loadPreviewUrls(objectUrls);
    }
  },
  { deep: true }
);

watch(
  () => [infoRef.value, skuRef.value, deliveryRef.value, descriptionRef.value, otherRef.value],
  async () => {
    await nextTick();
    const onScroll = () => {
      const sections: Array<{ key: FormSection; element: HTMLElement | null }> = [
        { key: 'info', element: infoRef.value },
        { key: 'sku', element: skuRef.value },
        { key: 'delivery', element: deliveryRef.value },
        { key: 'description', element: descriptionRef.value },
        { key: 'other', element: otherRef.value }
      ];
      const offset = 160;
      let current: FormSection = 'info';
      sections.forEach((section) => {
        if (!section.element) {
          return;
        }
        if (section.element.getBoundingClientRect().top - offset <= 0) {
          current = section.key;
        }
      });
      activeSection.value = current;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  },
  { immediate: true }
);

onMounted(async () => {
  loading.value = true;
  try {
    await loadMeta();
    if (spuId) {
      await loadDetail(spuId);
    }
  } catch (error) {
    errorMessage.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.spu-form-page {
  min-width: 0;
  width: 100%;
  max-width: 100%;
  padding-bottom: 84px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 22px;
  font-weight: 700;
}

.section-nav {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 12px;
  margin-bottom: 12px;
}

.page-header {
  margin-bottom: 12px;
}

.section-block {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  scroll-margin-top: 130px;
}

.spec-switch-row {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.sales-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-weight: 600;
}

.sales-property-panel {
  border: 1px solid #e8ebf3;
  background: #f8f9fc;
  border-radius: 10px;
  padding: 10px;
}

.sales-property-block {
  border-bottom: 1px solid #e8ebf3;
  padding: 8px 0;
}

.sales-property-block:last-child {
  border-bottom: none;
}

.sales-property-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
}

.sales-property-tags {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.required {
  color: #ef4444;
}

.sales-value-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.sales-value-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slot-img-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.slot-select {
  flex: 1;
}

.slot-plus {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 8px;
}

.sku-table-wrap {
  width: 100%;
}

.sku-prop-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sku-table :deep(.cell) {
  padding-left: 8px;
  padding-right: 8px;
}

.sku-table :deep(.el-input),
.sku-table :deep(.el-input-number) {
  width: 100%;
}

.batch-panel {
  margin-bottom: 8px;
}

.footer-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
}

</style>
