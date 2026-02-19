import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  createComment,
  getCommentPage,
  replyComment,
  type CommentResp,
  updateCommentVisible
} from '../../api/admin';
import { Pagination } from '../../components/Pagination';
import { PromptDialog } from '../../components/PromptDialog';

const DEFAULT_FORM = {
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

export function CommentPage() {
  const [list, setList] = useState<CommentResp[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [spuId, setSpuId] = useState<number | ''>('');
  const [userId, setUserId] = useState<number | ''>('');
  const [visible, setVisible] = useState<'all' | 'true' | 'false'>('all');

  const [form, setForm] = useState(DEFAULT_FORM);
  const [createOpen, setCreateOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  async function loadData() {
    try {
      const page = await getCommentPage(pageNum, pageSize, {
        spuId: spuId === '' ? undefined : spuId,
        userId: userId === '' ? undefined : userId,
        visible: visible === 'all' ? undefined : visible === 'true'
      });
      setList(page.list || []);
      setTotal(page.total || 0);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  useEffect(() => {
    void loadData();
  }, [pageNum, pageSize]);

  async function submitCreate() {
    if (!form.userId || !form.spuId || !form.skuId) {
      setErrorMessage('userId/spuId/skuId 不能为空');
      return;
    }
    try {
      await createComment(form);
      setCreateOpen(false);
      setForm(DEFAULT_FORM);
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  function openCreateDialog() {
    setForm(DEFAULT_FORM);
    setCreateOpen(true);
  }

  async function onReply(id: number, content: string) {
    if (!content.trim()) {
      setErrorMessage('回复内容不能为空');
      return;
    }
    try {
      await replyComment(id, content.trim());
      setReplyTargetId(null);
      setReplyContent('');
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function onToggleVisible(item: CommentResp) {
    try {
      await updateCommentVisible(item.id, !item.visible);
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">商品评论</Typography>
        <Button onClick={openCreateDialog}>新增评论</Button>
      </Stack>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              size="small"
              type="number"
              label="SPU ID"
              value={spuId}
              onChange={(e) => setSpuId(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <TextField
              size="small"
              type="number"
              label="用户 ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <TextField select size="small" label="可见性" value={visible} onChange={(e) => setVisible(e.target.value as 'all' | 'true' | 'false')}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="true">可见</MenuItem>
              <MenuItem value="false">隐藏</MenuItem>
            </TextField>
            <Button onClick={() => void loadData()}>查询</Button>
          </Stack>
        </CardContent>
      </Card>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>用户</TableCell>
              <TableCell>SPU/SKU</TableCell>
              <TableCell>评分</TableCell>
              <TableCell>内容</TableCell>
              <TableCell>可见</TableCell>
              <TableCell>回复</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>暂无数据</TableCell>
              </TableRow>
            ) : (
              list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>
                    {item.userId}
                    <br />
                    {item.userNickname || '-'}
                  </TableCell>
                  <TableCell>
                    {item.spuId}/{item.skuId}
                  </TableCell>
                  <TableCell>{item.scores}</TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>{item.content || '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.visible ? '可见' : '隐藏'} color={item.visible ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>{item.replyContent || '-'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setReplyTargetId(item.id);
                          setReplyContent('');
                        }}
                      >
                        回复
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => void onToggleVisible(item)}>
                        {item.visible ? '隐藏' : '显示'}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Pagination
        pageNum={pageNum}
        pageSize={pageSize}
        total={total}
        onChange={(nextPageNum, nextPageSize) => {
          setPageNum(nextPageNum);
          setPageSize(nextPageSize);
        }}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>新增评论</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField size="small" fullWidth type="number" label="用户ID*" value={form.userId} onChange={(e) => setForm({ ...form, userId: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField size="small" fullWidth type="number" label="SPUID*" value={form.spuId} onChange={(e) => setForm({ ...form, spuId: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField size="small" fullWidth type="number" label="SKUID*" value={form.skuId} onChange={(e) => setForm({ ...form, skuId: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField size="small" fullWidth label="昵称" value={form.userNickname} onChange={(e) => setForm({ ...form, userNickname: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField size="small" fullWidth type="number" label="综合评分" value={form.scores} onChange={(e) => setForm({ ...form, scores: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select size="small" fullWidth label="可见性" value={form.visible ? 'true' : 'false'} onChange={(e) => setForm({ ...form, visible: e.target.value === 'true' })}>
                <MenuItem value="true">可见</MenuItem>
                <MenuItem value="false">隐藏</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField size="small" fullWidth type="number" label="描述评分" value={form.descriptionScores} onChange={(e) => setForm({ ...form, descriptionScores: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField size="small" fullWidth type="number" label="服务评分" value={form.benefitScores} onChange={(e) => setForm({ ...form, benefitScores: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField size="small" fullWidth label="图片URL（逗号分隔）" value={form.picUrls} onChange={(e) => setForm({ ...form, picUrls: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={3}
                label="评论内容"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setCreateOpen(false)}>
            取消
          </Button>
          <Button onClick={() => void submitCreate()}>新增评论</Button>
        </DialogActions>
      </Dialog>

      <PromptDialog
        open={replyTargetId !== null}
        title="回复评论"
        label="回复内容"
        value={replyContent}
        confirmText="提交回复"
        onChange={setReplyContent}
        onCancel={() => {
          setReplyTargetId(null);
          setReplyContent('');
        }}
        onConfirm={() => {
          if (replyTargetId !== null) {
            void onReply(replyTargetId, replyContent);
          }
        }}
      />
    </Stack>
  );
}
