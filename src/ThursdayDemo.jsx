// src/ThursdayDemo.jsx
import  { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBookmarksFromDB, saveBookmarkToDB, deleteBookmarkFromDB } from "./idb";




export default function ThursdayDemo() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [simulateError, setSimulateError] = useState(false); // Switch to test rollback



  // 1. Data fetch from indexedDB
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: getBookmarksFromDB,
  });




  // 2. OPTIMISTIC MUTATION (most imp part)
  const addMutation = useMutation({
    mutationFn: async (newUser) => {
      // 1 one sec delay for visible  optimistic add and rollback clearly
      await new Promise((resolve) => setTimeout(resolve, 1000));

      
      // if checkbox were tick, then show the error
      if (simulateError) {
        throw new Error("Simulated Error: Network / DB write will fail!");
      }
      return await saveBookmarkToDB(newUser);
    },




    // A. onMutate: before saving the database update the ui
    onMutate: async (newUser) => {
      // Step i: stop running fetch because old data will not be overwrite the new data
      await queryClient.cancelQueries({ queryKey: ["bookmarks"] });

      // Step ii: take backup the old state(snapshot) 
      const previousBookmarks = queryClient.getQueryData(["bookmarks"]) || [];

      // Step iii: update the ui cache with new item (Instant 0ms display)
      queryClient.setQueryData(["bookmarks"], (old = []) => [...old, newUser]);

      // Step iv: Return backup to the snapshot (for using on the error)
      return { previousBookmarks };
    },






    // B. onError: If mutation were fail, so going back on the old state (ROLLBACK)
    onError: (err, newUser, context) => {
      if (context?.previousBookmarks) {
        queryClient.setQueryData(["bookmarks"], context.previousBookmarks);
      }
      alert(err.message + " -> UI were rollback on old state!");
    },



    // C. onSettled: is it pass or fail, To Re-sync the final DB
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteBookmarkFromDB,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    const newItem = { id: Date.now(), name: username };
    addMutation.mutate(newItem);
    setUsername("");
  };

  return (
    <div style={{ maxWidth: "500px", margin: "30px auto", fontFamily: "sans-serif" }}>
      <h2>Thursday Task: IndexedDB & Optimistic UI</h2>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="GitHub user bookmark karo (e.g. torvalds)..."
          style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          style={{ padding: "8px 16px", background: "#0066cc", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Add Bookmark
        </button>
      </form>

      {/* Rollback test karne ka checkbox */}
      <div style={{ marginBottom: "15px", background: "#f8f9fa", padding: "10px", borderRadius: "6px", border: "1px dashed #aaa" }}>
        <label style={{ fontSize: "14px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={simulateError}
            onChange={(e) => setSimulateError(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          <strong>Simulate Failure (To Check the Rollback)</strong>
        </label>
      </div>

      <h3>Saved in IndexedDB:</h3>
      {isLoading && <p>Loading...</p>}
      {bookmarks.length === 0 && !isLoading && <p style={{ color: "#888" }}>There is No Bookmark.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {bookmarks.map((item) => (
          <li
            key={item.id}
            style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}
          >
            <span>👤 {item.name}</span>
            <button
              onClick={() => deleteMutation.mutate(item.id)}
              style={{ background: "#ff4d4f", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}