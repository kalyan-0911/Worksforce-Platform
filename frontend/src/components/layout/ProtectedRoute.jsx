import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('workforcex_token');
  const user = JSON.parse(localStorage.getItem('workforcex_user') || 'null');

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard if they don't have permission
    if (user.role === 'Admin') return <Navigate to="/admin" replace />;
    if (user.role === 'Employer') return <Navigate to="/employer" replace />;
    return <Navigate to="/professional" replace />;
  }

  return children;
};

export default ProtectedRoute;
