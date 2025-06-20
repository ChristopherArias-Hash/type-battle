import { Navigate } from "react-router-dom";
import { useAuth } from "../utils/authContext";

function ProtectedRoute({ children }) {
  const { isUserLoggedIn, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isUserLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;