// src/useOnlineStatus.js
import { useState, useEffect } from "react";

export function useOnlineStatus() {
    // navigator.online says internet is connected or not
    const [isOnline, setIsOnline]= useState(navigator.onLine);

    useEffect(() => {
        function handleOnline() {
            setIsOnline(true);
        }

        function handleOffline() {
            setIsOnline(false);
        }

    
        // register windows events
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // cleanup of monday task: remove listner to save from memory leak
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return isOnline;
}