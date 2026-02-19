import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ReviewsOutlinedIcon from '@mui/icons-material/ReviewsOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import { logout } from '../api/admin';

const navItems = [
  { to: '/', label: '概览', icon: <DashboardOutlinedIcon fontSize="small" /> },
  { to: '/product/brand', label: '商品品牌', icon: <LabelOutlinedIcon fontSize="small" /> },
  { to: '/product/category', label: '商品分类', icon: <AccountTreeOutlinedIcon fontSize="small" /> },
  { to: '/product/category-property', label: '类目属性绑定', icon: <LinkOutlinedIcon fontSize="small" /> },
  { to: '/product/property', label: '商品属性', icon: <TuneOutlinedIcon fontSize="small" /> },
  { to: '/product/property-values', label: '属性值', icon: <ChecklistOutlinedIcon fontSize="small" /> },
  { to: '/product/spu', label: '商品 SPU', icon: <Inventory2OutlinedIcon fontSize="small" /> },
  { to: '/product/comment', label: '商品评论', icon: <ReviewsOutlinedIcon fontSize="small" /> }
];

const drawerWidthExpanded = 240;
const drawerWidthCollapsed = 72;

export function AdminLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const drawerWidth = useMemo(
    () => (collapsed ? drawerWidthCollapsed : drawerWidthExpanded),
    [collapsed]
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: 'width 200ms ease, margin-left 200ms ease'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={collapsed ? '展开导航栏' : '收起导航栏'}>
              <IconButton onClick={() => setCollapsed((value) => !value)} size="small">
                {collapsed ? <KeyboardDoubleArrowRightIcon /> : <KeyboardDoubleArrowLeftIcon />}
              </IconButton>
            </Tooltip>
            <Typography variant="h6" color="text.primary">
              Mall Admin
            </Typography>
          </Box>
          <Button
            color="primary"
            onClick={async () => {
              try {
                await logout();
              } catch (_error) {
                // Ignore logout error and clear local token directly.
              } finally {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_refresh_token');
                navigate('/login');
              }
            }}
          >
            退出登录
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(180deg, #0f172a 0%, #134e4a 100%)',
            color: '#fff',
            overflowX: 'hidden',
            transition: 'width 200ms ease'
          }
        }}
      >
        <Toolbar sx={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease' }}
          >
            Admin Console
          </Typography>
        </Toolbar>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        <List sx={{ px: 1, py: 1 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              {({ isActive }) => (
                <Tooltip title={collapsed ? item.label : ''} placement="right">
                  <ListItemButton
                    selected={isActive}
                    sx={{
                      my: 0.5,
                      borderRadius: 2,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      px: collapsed ? 1 : 2,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255,255,255,0.2)'
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: 'rgba(255,255,255,0.25)'
                      }
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: collapsed ? 0 : 36,
                        color: 'inherit',
                        justifyContent: 'center'
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed ? (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          textAlign: 'left',
                          noWrap: true
                        }}
                      />
                    ) : null}
                  </ListItemButton>
                </Tooltip>
              )}
            </NavLink>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          overflowX: 'hidden',
          p: 3,
          mt: 8,
          transition: 'margin-left 200ms ease'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
