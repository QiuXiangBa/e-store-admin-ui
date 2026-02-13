# 产品管理手工测试用例（Admin）

## 1. 测试目标

验证管理后台「产品管理」主链路可用：
- 品牌新增（图片直传 S3 + 预览）
- 分类新增（图片直传 S3 + 预览）
- SPU 新增与列表展示
- 评论新增与展示

## 2. 前置配置（必须）

### 2.1 启动 admin 后端

确保 admin 服务启动在 `8092`（对应前端代理配置）。

### 2.2 配置对象存储（S3）

编辑后端配置（建议 `admin/src/main/resources/application-dev.yml`），至少保证：

```yaml
store:
  object-storage:
    enabled: true
    provider: aws-s3
    aws-s3:
      endpoint: https://s3.us-east-1.amazonaws.com
      region: us-east-1
      access-key: <你的AK>
      secret-key: <你的SK>
      bucket: e-store-dev
      public-url-prefix: ""
      path-style-access-enabled: false
      presign-ttl: 30m
```

说明：
- `region` 必须和桶实际区域一致（你当前是 `us-east-1`）。
- `bucket` 必须是同一个桶（你当前是 `e-store-dev`）。

### 2.3 配置 S3 CORS

在桶 CORS 中加入：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-id-2"],
    "MaxAgeSeconds": 3000
  }
]
```

### 2.4 配置 IAM 权限

用于签名的 AK/SK 所属 IAM 用户/角色需要：
- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject`（可选）
- `s3:ListBucket`

资源建议：
- `arn:aws:s3:::e-store-dev`
- `arn:aws:s3:::e-store-dev/*`

### 2.5 启动 admin-ui 前端

```bash
cd /Users/catchword/projects/mall/repos/frontend/admin-ui
npm run dev
```

访问：`http://localhost:5173`

---

## 3. 基础测试数据建议

- 品牌：`测试品牌A`
- 一级分类：`手机数码`
- 二级分类：`手机`
- SPU：`iPhone 测试款`
- 评论：用户ID=1，SPU/SKU 使用已创建数据

---

## 4. 手工测试用例

## TC-01 商品品牌新增（图片直传）

### 步骤
1. 打开「商品品牌」页面。
2. 点击标题行「新增」。
3. 输入品牌名称：`测试品牌A`。
4. 点击「上传图片」，选择一张 png/jpg。
5. 等待上传完成，确认 `图片 URL` 自动回填，且出现预览图。
6. 填写排序（如 `10`），状态选择启用。
7. 点击「新增品牌」。

### 期望结果
- 新增成功，无报错。
- 列表出现该品牌。
- 图片 URL 正常展示。

---

## TC-02 商品分类新增（图片直传）

### 步骤
1. 打开「商品分类」页面。
2. 点击标题行「新增」。
3. 新增一级分类：
   - 父级分类：`顶级分类`
   - 分类名称：`手机数码`
   - 点击「上传图片」上传分类图
   - （可选）点击「上传大图」上传大图
   - 排序：`1`
   - 状态：启用
4. 点击「新增分类」。
5. 再新增二级分类：
   - 父级分类选择 `手机数码`
   - 分类名称：`手机`
   - 其余同上
6. 点击「新增分类」。

### 期望结果
- 一级、二级分类都创建成功。
- 上传后 URL 自动回填并可预览。
- 列表树形层级正确。

---

## TC-03 商品 SPU 新增

### 步骤
1. 打开「商品 SPU」页面。
2. 点击标题行「新增」。
3. 在弹窗填写：
   - 商品名称：`iPhone 测试款`
   - 分类：选择二级分类 `手机`
   - 品牌：`测试品牌A`
   - 关键词、简介、封面图 URL、详情
   - 默认 SKU：填写图片 URL、价格、库存
4. 点击「创建商品」。

### 期望结果
- 创建成功，列表出现新 SPU。
- 可查看详情。

---

## TC-04 商品评论新增

### 步骤
1. 打开「商品评论」页面。
2. 点击标题行「新增评论」。
3. 填写：
   - 用户ID、SPUID、SKUID
   - 评论内容与评分
4. 点击「新增评论」。

### 期望结果
- 评论创建成功并显示在列表。

---

## 5. 失败场景回归

1. 不上传分类图片直接提交分类：
- 期望：弹窗内提示必填错误。

2. S3 配置错误（比如 region 不一致）：
- 期望：上传失败，弹窗内提示错误。

3. 私有桶预览：
- 期望：通过下载预签名 URL 预览成功，不应出现 `AccessDenied`。

---

## 6. 配置商品的顺序（避免依赖问题）

建议按以下顺序配置：
1. 先建品牌
2. 再建分类（先一级后子级）
3. 再建 SPU（依赖品牌 + 分类）
4. 最后测评论（依赖 SPU/SKU）

这个顺序是当前后台最稳的初始化路径。
