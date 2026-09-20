// src/GithubFinder.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "./useDebounce";
import { useOnlineStatus } from "./useOnlineStatus";
import { syncWithExponentialBackoff } from "./syncService";
import { getBookmarksFromDB, saveBookmarkToDB } from "./idb";

export default function GithubFinder() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedTerm = useDebounce(searchTerm, 500);

  const [syncStatus, setSyncStatus] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [simulateServerDown, setSimulateServerDown] = useState(false);

  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  // 1. Fetch Profile (AbortController signal TanStack Query internally provide karta hai)
  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
  } = useQuery({
    queryKey: ["githubUser", debouncedTerm],
    queryFn: async ({ signal }) => {
      if (!debouncedTerm.trim()) return null;
      const res = await fetch(
        `https://api.github.com/users/${debouncedTerm.trim()}`,
        { signal }
      );
      if (!res.ok) {
        throw new Error(res.status === 404 ? "User Not Found" : "API Error");
      }
      return res.json();
    },
    enabled: !!debouncedTerm.trim(),
    retry: 1,
  });

  // 2. Fetch Repositories
  const { data: repos = [], isLoading: isReposLoading } = useQuery({
    queryKey: ["githubRepos", debouncedTerm],
    queryFn: async ({ signal }) => {
      if (!debouncedTerm.trim()) return [];
      const res = await fetch(
        `https://api.github.com/users/${debouncedTerm.trim()}/repos?sort=updated&per_page=4`,
        { signal }
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!debouncedTerm.trim() && !!profile,
  });

  // 3. IndexedDB Bookmarks Query
  const { data: bookmarks = [] } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: getBookmarksFromDB,
  });

  // 4. Optimistic Bookmark Mutation with Snapshot Rollback
  const bookmarkMutation = useMutation({
    mutationFn: async (userObj) => {
      return await saveBookmarkToDB(userObj);
    },
    onMutate: async (userObj) => {
      await queryClient.cancelQueries({ queryKey: ["bookmarks"] });
      const previousBookmarks = queryClient.getQueryData(["bookmarks"]) || [];
      queryClient.setQueryData(["bookmarks"], [...previousBookmarks, userObj]);
      return { previousBookmarks };
    },
    onError: (_err, _userObj, context) => {
      if (context?.previousBookmarks) {
        queryClient.setQueryData(["bookmarks"], context.previousBookmarks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const handleBookmark = () => {
    if (!profile) return;
    bookmarkMutation.mutate({
      id: profile.id,
      name: profile.login,
      avatar: profile.avatar_url,
    });
  };

  // 5. Exponential Backoff Reconnection Sync
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus("Starting sync...");
    try {
      await syncWithExponentialBackoff(
        async () => {
          if (simulateServerDown) throw new Error("Server 503 Service Unavailable");
          return { success: true };
        },
        3,
        1000,
        (msg) => setSyncStatus(msg)
      );
    } catch {
      setSyncStatus("Sync failed after 3 retries (1s, 2s, 4s). Local cache intact.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#0d1117",
        color: "#c9d1d9",
        minHeight: "100vh",
        padding: "30px 20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Exact Project Header */}
      <h1 style={{ fontSize: "26px", fontWeight: "700", color: "#f0f6fc", marginBottom: "6px", textAlign: "center" }}>
        GitHub Profile & Repository Finder
      </h1>

      {/* Online / Offline Status Badge */}
      <div style={{ marginBottom: "20px" }}>
        <span
          style={{
            fontSize: "12px",
            padding: "4px 12px",
            borderRadius: "20px",
            fontWeight: "600",
            backgroundColor: isOnline ? "#238636" : "#da3633",
            color: "#ffffff",
          }}
        >
          {isOnline ? "● ONLINE" : "● OFFLINE"}
        </span>
      </div>

      {/* Search Input Box */}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Type GitHub username (e.g. octocat)..."
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "10px 14px",
          borderRadius: "6px",
          border: "1px solid #30363d",
          backgroundColor: "#161b22",
          color: "#c9d1d9",
          fontSize: "15px",
          outline: "none",
          textAlign: "center",
          marginBottom: "24px",
        }}
      />

      {/* Main Profile Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "#161b22",
          borderRadius: "8px",
          border: "1px solid #30363d",
          padding: "24px",
          textAlign: "center",
        }}
      >
        {isProfileLoading && <p style={{ color: "#8b949e" }}>Loading profile...</p>}

        {isProfileError && (
          <p style={{ color: "#f85149", fontWeight: "600" }}>
            {profileError?.message || "User not found"}
          </p>
        )}

        {profile && !isProfileLoading && !isProfileError && (
          <div>
            <img
              src={profile.avatar_url}
              alt={profile.login}
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                border: "2px solid #58a6ff",
                marginBottom: "12px",
              }}
            />
            <h2 style={{ fontSize: "20px", margin: "4px 0", color: "#f0f6fc" }}>
              {profile.name || profile.login}
            </h2>
            <p style={{ color: "#8b949e", fontSize: "14px", margin: "0 0 10px" }}>
              @{profile.login}
            </p>
            {profile.bio && (
              <p style={{ fontSize: "13px", color: "#8b949e", marginBottom: "16px" }}>
                {profile.bio}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
              <a
                href={profile.html_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  backgroundColor: "#21262d",
                  border: "1px solid #30363d",
                  color: "#58a6ff",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                View Profile
              </a>
              <button
                onClick={handleBookmark}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  backgroundColor: "#238636",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                Bookmark (Offline)
              </button>
            </div>

            {/* Repositories Section */}
            <div style={{ textAlign: "left", borderTop: "1px solid #30363d", paddingTop: "14px" }}>
              <h3 style={{ fontSize: "14px", color: "#f0f6fc", marginBottom: "8px" }}>
                Latest Repositories:
              </h3>
              {isReposLoading && <p style={{ fontSize: "12px", color: "#8b949e" }}>Loading repos...</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {repos.map((repo) => (
                  <a
                    key={repo.id}
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "block",
                      backgroundColor: "#0d1117",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #21262d",
                      color: "#58a6ff",
                      textDecoration: "none",
                      fontSize: "13px",
                    }}
                  >
                    📦 {repo.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Offline Storage & Exponential Backoff Sync Engine */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          marginTop: "20px",
          padding: "16px",
          backgroundColor: "#161b22",
          borderRadius: "8px",
          border: "1px solid #30363d",
        }}
      >
        <h3 style={{ fontSize: "14px", color: "#f0f6fc", marginBottom: "8px" }}>
          IndexedDB Offline Bookmarks ({bookmarks.length})
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
          {bookmarks.map((bm) => (
            <span
              key={bm.id}
              style={{
                backgroundColor: "#21262d",
                border: "1px solid #30363d",
                padding: "3px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#c9d1d9",
              }}
            >
              @{bm.name}
            </span>
          ))}
          {bookmarks.length === 0 && (
            <span style={{ fontSize: "12px", color: "#8b949e" }}>No offline bookmarks yet.</span>
          )}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#8b949e", cursor: "pointer", marginBottom: "12px" }}>
          <input
            type="checkbox"
            checked={simulateServerDown}
            onChange={(e) => setSimulateServerDown(e.target.checked)}
          />
          Simulate Server Down (Exponential Backoff: 1s → 2s → 4s)
        </label>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#1f6feb",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            cursor: isSyncing ? "not-allowed" : "pointer",
            fontWeight: "600",
            fontSize: "13px",
          }}
        >
          {isSyncing ? "Syncing..." : "Sync Offline Cache"}
        </button>

        {syncStatus && (
          <p style={{ fontSize: "12px", marginTop: "10px", color: syncStatus.includes("failed") ? "#f85149" : "#58a6ff" }}>
            {syncStatus}
          </p>
        )}
      </div>
    </div>
  );
}