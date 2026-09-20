import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "./useDebounce";

// 1. Error boundary (protect from app crashing)
export class ErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "15px", background: "#ffebee", color: "#c6828", borderRadius: "8px", margin: "10px 0"}}>
                    <h3>if something is wrong! Screen save from Crash.</h3>
                </div>
            );
        }
        return this.props.children;
    }
}





// 2. Skeleton (Loading placeholder)
const Skeleton = () => (
    <div style={{ background: "#e0e0e0", height: "80px", borderRadius: "8px", margin: "15px 0", opacity: 0.7}} />
);





//3. Profile Card (user details)
const ProfileCard = ({ user }) => (
    <div style={{ display: "flex", gap: "15px", padding: "15px", border: "1px solid #ddd", borderRadius: "8px", margin: "15px 0"}}>
        <img src={user.avatar_url} alt="avatar" style={{ width: "60px", height: "60px", borderRadius: "50%" }} />
        <div>
            <h3 style={{ margin: 0 }}>{user.name || user.login}</h3>
            <p style={{ margin: "50px 0", color: "#666" }}>{user.bio || "No bio"}</p>
            <small> Repos: {user.public_repos} | Followers: {user.followers}</small>
        </div>
    </div>
);




// 4. Repo List (To Show Repository list)
const RepoList = ({ repos }) => (
  <div>
    <h4>Top Repositories:</h4>
    <ul>
      {repos.map((repo) => (
        <li key={repo.id} style={{ margin: "6px 0" }}>
          <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ fontWeight: "bold" }}>
            {repo.name}
          </a>{" "}
          — ★ {repo.stargazers_count}
        </li>
      ))}
    </ul>
  </div>
);






// 5. Main Component
export default function WednesdayDemo() {
  const [text, setText] = useState("");
  const query = useDebounce(text, 500);

  const { data: user, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ["gh-user", query],
    queryFn: () =>
      fetch(`https://api.github.com/users/${query}`).then((res) => {
        if (!res.ok) throw new Error("User nahi mila");
        return res.json();
      }),
    enabled: query.trim().length > 0,
  });

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ["gh-repos", query],
    queryFn: () =>
      fetch(`https://api.github.com/users/${query}/repos?sort=updated&per_page=5`).then((res) => res.json()),
    enabled: !!user,
  });

  return (
    <ErrorBoundary>
      <div style={{ maxWidth: "500px", margin: "30px auto", fontFamily: "sans-serif" }}>
        <h2>GitHub Profile Finder (Wednesday Task)</h2>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="GitHub username likho (e.g. facebook)..."
          style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "6px", border: "1px solid #ccc" }}
        />

        {userLoading && <Skeleton />}
        {userError && <p style={{ color: "red" }}>User Name not found! please enter correct user name </p>}
        {user && <ProfileCard user={user} />}
        {reposLoading && <Skeleton />}
        {repos && <RepoList repos={repos} />}
      </div>
    </ErrorBoundary>
  );
}