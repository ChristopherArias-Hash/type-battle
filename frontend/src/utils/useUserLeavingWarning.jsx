import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function useUserLeavingWarning(message = "Are you sure you want to leave?") {
  const [isDirty, setIsDirty] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [confirmedNavigation, setConfirmedNavigation] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const cancelNavigation = useCallback(() => {
    setConfirmedNavigation(false);
    setLastLocation(null);
  }, []);

  const confirmNavigation = useCallback(() => {
    setConfirmedNavigation(true);
    setIsDirty(false);
  }, []);

  // 
  
  const handleBlockedNavigation = useCallback(
    (nextLocation) => {
      if (!confirmedNavigation && isDirty) {
        const confirmLeave = window.confirm(message);
        if (confirmLeave) {
          confirmNavigation();
          navigate(nextLocation.pathname + nextLocation.search);
        }
        return false;
      }
      return true;
    },
    [isDirty, confirmedNavigation, message, confirmNavigation, navigate]
  );

  useEffect(() => {
    if (isDirty && !confirmedNavigation) {
      setLastLocation(location);
    }
  }, [location, isDirty, confirmedNavigation]);

  // Handle browser navigation (back/forward)
  useEffect(() => {
    if (!isDirty) return;

    const handlePopState = (event) => {
      if (!confirmedNavigation) {
        const confirmLeave = window.confirm(message);
        if (!confirmLeave) {
          // Push current location back to history to prevent navigation
          window.history.pushState(null, "", window.location.href);
        } else {
          setIsDirty(false);
        }
      }
    };

    // Push a dummy state to detect back button
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty, confirmedNavigation, message]);

  // Handle browser refresh/close
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, message]);

  return [() => setIsDirty(true), () => setIsDirty(false)];
}