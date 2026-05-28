import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';

/**
 * 路由守卫
 *
 * 未登录用户访问受保护路由时：
 *   - 重定向到 /login
 *   - state.from 携带原目标，登录成功后跳回
 *
 * 用法：
 *   <Route element={<RequireAuth><Layout /></RequireAuth>}>
 *     <Route path="/" element={<Dashboard />} />
 *     ...
 *   </Route>
 */
interface Props {
  children: ReactElement;
}

export default function RequireAuth({ children }: Props) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
