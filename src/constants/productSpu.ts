export const PRODUCT_SPU_STATUS = {
  RECYCLE: -1,
  ENABLE: 1,
  DISABLE: 0
} as const;

export const PRODUCT_SPU_TAB = {
  FOR_SALE: 0,
  IN_WAREHOUSE: 1,
  SOLD_OUT: 2,
  ALERT_STOCK: 3,
  RECYCLE_BIN: 4
} as const;

export function getProductSpuStatusLabel(status: number): string {
  if (status === PRODUCT_SPU_STATUS.ENABLE) {
    return '上架';
  }
  if (status === PRODUCT_SPU_STATUS.DISABLE) {
    return '下架';
  }
  return '回收站';
}

export function fenToYuan(price?: number): string {
  return ((price ?? 0) / 100).toFixed(2);
}
