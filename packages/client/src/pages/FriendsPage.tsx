import { Navigate } from 'react-router-dom';

/** Friends live on Profile; keep this route for old links and nav. */
export function FriendsPage() {
  return <Navigate to="/profile#friends" replace />;
}
