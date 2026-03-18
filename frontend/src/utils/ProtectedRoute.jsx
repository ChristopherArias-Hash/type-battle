import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../utils/authContext";

export default function ProtectedRoute({ children }) {  // Add children prop
  const { isUserLoggedIn, isUserVerified, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isUserLoggedIn || !isUserVerified) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet/>;  // Support both patterns
}