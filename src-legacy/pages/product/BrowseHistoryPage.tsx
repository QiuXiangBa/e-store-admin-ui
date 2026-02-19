import { useEffect, useState } from 'react';
import { getBrowseHistoryPage, type BrowseHistoryResp } from '../../api/admin';
import { Pagination } from '../../components/Pagination';

export function BrowseHistoryPage() {
  const [list, setList] = useState<BrowseHistoryResp[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userId, setUserId] = useState<number | ''>('');
  const [spuId, setSpuId] = useState<number | ''>('');
  const [userDeleted, setUserDeleted] = useState<'all' | 'true' | 'false'>('all');

  async function loadData() {
    try {
      const page = await getBrowseHistoryPage(pageNum, pageSize, {
        userId: userId === '' ? undefined : userId,
        spuId: spuId === '' ? undefined : spuId,
        userDeleted: userDeleted === 'all' ? undefined : userDeleted === 'true'
      });
      setList(page.list || []);
      setTotal(page.total || 0);
    } catch (error) {
      alert((error as Error).message);
    }
  }

  useEffect(() => {
    void loadData();
  }, [pageNum, pageSize]);

  return (
    <section className="panel">
      <h2>商品浏览记录</h2>
      <div className="toolbar">
        <input
          type="number"
          placeholder="用户ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value === '' ? '' : Number(e.target.value))}
        />
        <input
          type="number"
          placeholder="SPUID"
          value={spuId}
          onChange={(e) => setSpuId(e.target.value === '' ? '' : Number(e.target.value))}
        />
        <select value={userDeleted} onChange={(e) => setUserDeleted(e.target.value as 'all' | 'true' | 'false')}>
          <option value="all">全部删除状态</option>
          <option value="true">已删除</option>
          <option value="false">未删除</option>
        </select>
        <button type="button" onClick={() => void loadData()}>
          查询
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户ID</th>
              <th>SPUID</th>
              <th>用户删除</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5}>暂无数据</td>
              </tr>
            ) : (
              list.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.userId}</td>
                  <td>{item.spuId}</td>
                  <td>{item.userDeleted ? '是' : '否'}</td>
                  <td>{item.createTime ? new Date(item.createTime).toLocaleString() : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        pageNum={pageNum}
        pageSize={pageSize}
        total={total}
        onChange={(nextPageNum, nextPageSize) => {
          setPageNum(nextPageNum);
          setPageSize(nextPageSize);
        }}
      />
    </section>
  );
}
