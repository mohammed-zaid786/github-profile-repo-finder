// src/FridayDemo.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOnlineStatus } from "./useOnlineStatus";
import { syncWithExponentialBackoff } from "./syncService";
import { getBookmarksFromDB, saveBookmarkToDB } from "./idb";

export default function FridayDemo() {
  const [username, setUsername] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [simulateServerDown, setSimulateServerDown] = useState(false);

  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  // 1. IndexedDB se bookmarks fetch karna
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: getBookmarksFromDB,
  });

  // 2. Bookmark add mutation with snapshot rollback
  const addMutation = useMutation({
    mutationFn: async (newUser) => {
      return await saveBookmarkToDB(newUser);
    },
    onMutate: async (newUser) => {
      await queryClient.cancelQueries({ queryKey: ["bookmarks"] });
      const previousBookmarks = queryClient.getQueryData(["bookmarks"]) || [];

      // Optimistic update
      queryClient.setQueryData(["bookmarks"], [...previousBookmarks, newUser]);
      return { previousBookmarks };
    },
    onError: (_err, _newUser, context) => {
      if (context?.previousBookmarks) {
        queryClient.setQueryData(["bookmarks"], context.previousBookmarks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const handleAddBookmark = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    addMutation.mutate({
      id: Date.now(),
      name: username.trim(),
    });

    setUsername("");
  };

// 3. Reconnection Exponential Backoff Trigger
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncStatus("Starting reconnection sync...");

    try {
      await syncWithExponentialBackoff(
        async () => {
          if (simulateServerDown) {
            throw new Error("Server 503: Service Unavailable");
          }
          return { success: true };
        },
        3, // maxRetries
        1000, // baseDelay
        (statusText) => setSyncStatus(statusText)
      );
    } catch {
      setSyncStatus("Sync failed after exponential retries: Cache intact.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{ border: "2px solid #646cff", borderRadius: "10px", padding: "20px", marginTop: "24px" }}>
      <h2>Friday Task: Offline-First & Exponential Backoff Sync</h2>

      {/* Network Status Badge */}
      <div style={{ marginBottom: "16px" }}>
        <strong>Network Status: </strong>
        <span
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: "14px",
            color: "#fff",
            backgroundColor: isOnline ? "#22c55e" : "#ef4444",
            fontWeight: "bold",
          }}
        >
          {isOnline ? "ONLINE" : "OFFLINE"}
        </span>
      </div>

      {/* Bookmark Input Form */}
      <form onSubmit={handleAddBookmark} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="GitHub username for offline bookmark..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: "8px", flex: 1 }}
        />
        <button type="submit" style={{ padding: "8px 16px", cursor: "pointer" }}>
          Add Bookmark
        </button>
      </form>

      {/* Exponential Backoff Controls */}
      <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "8px", cursor: "pointer", color: "#333" }}>
          <input
            type="checkbox"
            checked={simulateServerDown}
            onChange={(e) => setSimulateServerDown(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          Simulate Remote Server Down (To verify retry backoff 1s - 2s - 4s)
        </label>

        <button
          onClick={handleTriggerSync}
          disabled={isSyncing}
          style={{
            padding: "8px 16px",
            cursor: isSyncing ? "not-allowed" : "pointer",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {isSyncing ? "Syncing..." : "Sync Offline Data Now"}
        </button>

        {syncStatus && (
          <p style={{ marginTop: "10px", fontWeight: "bold", color: syncStatus.includes("failed") ? "#dc2626" : "#0284c7" }}>
            Status: {syncStatus}
          </p>
        )}
      </div>

      {/* Bookmarks List */}
      <h3>Bookmarks in IndexedDB:</h3>
      {isLoading && <p>Loading cache...</p>}
      {bookmarks.length === 0 && !isLoading && <p style={{ color: "#888" }}>No bookmarks found.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {bookmarks.map((bm) => (
          <li
            key={bm.id}
            style={{
              padding: "8px 12px",
              background: "#e2e8f0",
              borderRadius: "4px",
              marginBottom: "6px",
              color: "#1e293b",
            }}
          >
            {bm.name}
          </li>
        ))}
      </ul>
    </div>
  );
}