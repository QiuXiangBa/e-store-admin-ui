import { Link } from 'react-router-dom';
import { Card, CardActionArea, CardContent, Grid, Stack, Typography } from '@mui/material';

const entries = [
  { to: '/product/brand', label: '品牌管理', desc: '维护品牌信息、状态与排序' },
  { to: '/product/category', label: '分类管理', desc: '维护分类层级、图标和展示状态' },
  { to: '/product/property', label: '属性管理', desc: '定义规格属性并维护可选值' },
  { to: '/product/property-values', label: '属性值管理', desc: '配置规格值并绑定属性' },
  { to: '/product/spu', label: 'SPU / SKU', desc: '管理商品主数据、库存与上下架' },
  { to: '/product/comment', label: '商品评论', desc: '查看评论并处理回复与可见性' }
];

export function DashboardPage() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4">商品中心</Typography>
      <Typography variant="body1" color="text.secondary">
        已按 eg 的产品管理结构整理为独立模块页面。
      </Typography>
      <Grid container spacing={2}>
        {entries.map((entry) => (
          <Grid key={entry.to} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card>
              <CardActionArea component={Link} to={entry.to} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {entry.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {entry.desc}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
