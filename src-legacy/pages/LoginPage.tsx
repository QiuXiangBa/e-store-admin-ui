import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { login } from '../api/admin';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  async function doLogin() {
    if (!username || !password) {
      setErrorMessage('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await login({ username, password });
      localStorage.setItem('admin_token', data.accessToken);
      localStorage.setItem('admin_refresh_token', data.refreshToken);
      navigate('/');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background: 'radial-gradient(circle at 15% 15%, #d1fae5 0%, #e0f2fe 35%, #f8fafc 100%)'
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(15, 23, 42, 0.1)' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h4">管理后台登录</Typography>
            <Typography variant="body2" color="text.secondary">
              请输入管理后台账号密码
            </Typography>
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
            <TextField label="用户名" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth />
            <TextField
              label="密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  void doLogin();
                }
              }}
              fullWidth
            />
            <Button onClick={() => void doLogin()} disabled={loading} size="large">
              {loading ? '登录中...' : '进入后台'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
