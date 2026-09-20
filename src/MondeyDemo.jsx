import { useState, useEffect } from "react";

export default function MondayDemo() {
  // 1. query: input box me jo text type karenge usko store karta hai
  const [query, setQuery] = useState("octocat");

  // 2. userData: GitHub API se aane wala data yahan store hota hai (Local UI state)
  const [userData, setUserData] = useState(null);

  // 3. loading & error: screen par loading indicator aur error message dikhane ke liye
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* 
    ========================================================================
    MONDAY TOPIC 3: SERVER CACHE RULES
    - Server ka data remote hota hai aur kabhi bhi badal sakta hai.
    - React ka useState temporary memory hai, isme cache, stale-time 
      aur background sync nahi hota.
    - Isi limitation ko solve karne ke liye Tuesday ko hum TanStack Query lagayenge.
    ========================================================================
  */

  useEffect(() => {
    // Agar search box khali ho toh koi network call mat bhejo
    if (!query.trim()) {
      return;
    }

    // MONDAY TOPIC 2: AbortController Setup
    // new AbortController(): yeh browser ka remote control hai jo network request cancel kar sakta hai
    // signal: yeh ek wire ki tarah fetch call se judti hai
    const controller = new AbortController();
    const { signal } = controller;

    // Async function banakar fetch call chalayi taaki linter warning na de
    const fetchGithubUser = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`https://api.github.com/users/${query}`, { signal });

        if (!response.ok) {
          throw new Error("User not found or rate limit exceeded");
        }

        const data = await response.json();
        setUserData(data);
        setLoading(false);
      } catch (err) {
        // err.name === "AbortError": Jab hum purani call cancel karte hain toh browser ise error bolta hai
        // Lekin yeh bug nahi hai, hamara intentional cancellation hai, isliye screen par error nahi dikhayenge
        if (err.name === "AbortError") {
          console.log("[AbortController]: Purani request cancel ho gayi for:", query);
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchGithubUser();

    /* 
      ========================================================================
      MONDAY TOPIC 1: EFFECT CLEANUP LIFECYCLE & RACE CONDITIONS
      - Jab user tezi se type karta hai (e.g. 'a' fir 'ab'), purani request background me chal rahi hoti hai.
      - Agar purani request late aayi toh naye data ko overwrite kar sakti hai (Race Condition).
      - Cleanup function dependency [query] badalte hi pehle chalta hai aur purani call abort kar deta hai.
      ========================================================================
    */
    return () => {
      controller.abort();
    };
  }, [query]);

  // UI Rendering: Input box, loading text, error message aur user profile card
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "400px" }}>
      <h3>Monday Task: AbortController & Race Condition</h3>
      <p style={{ fontSize: "12px", color: "#666" }}>
        Type rapidly in the input and inspect Console to see cancelled calls.
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter GitHub username..."
        style={{ padding: "8px", width: "100%", boxSizing: "border-box" }}
      />

      {loading && <p style={{ color: "#0066cc" }}>Loading user data...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {userData && (
        <div style={{ marginTop: "15px", border: "1px solid #ddd", padding: "12px", borderRadius: "8px" }}>
          <img
            src={userData.avatar_url}
            alt={userData.login}
            width={60}
            style={{ borderRadius: "50%" }}
          />
          <h4 style={{ margin: "8px 0 4px" }}>{userData.name || userData.login}</h4>
          <p style={{ margin: 0, fontSize: "13px", color: "#555" }}>
            {userData.bio || "No bio available"}
          </p>
        </div>
      )}
    </div>
  );
}