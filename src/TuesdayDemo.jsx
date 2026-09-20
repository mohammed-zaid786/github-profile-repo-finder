import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

// GitHub Search API ka fetcher function
const fetchGithubUsers = async (searchTerm) => {
  if (!searchTerm) return [];
  const response = await fetch(`https://api.github.com/search/users?q=${searchTerm}`);
  if (!response.ok) {
    throw new Error('API request failed!');
  }
  const data = await response.json();
  return data.items || [];
};

export default function TuesdayDemo() {
  const [text, setText] = useState('');
  
  // Custom hook: typing rukne ke 500ms baad hi update karega
  const debouncedSearch = useDebounce(text, 500);

  // TanStack Query ka useQuery hook
  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['githubUsers', debouncedSearch], // Dynamic key: search term badalte hi naya cache banega
    queryFn: () => fetchGithubUsers(debouncedSearch), // Data fetch karne wala function
    enabled: debouncedSearch.trim().length > 0, // Khali input par API call nahi jayegi
  });

  return (
    <section style={{ padding: '20px', border: '2px solid #646cff', borderRadius: '8px', margin: '20px 0' }}>
      <h2>Tuesday Task: TanStack Query + Debounce Search</h2>
      
      <input
        type="text"
        placeholder="Type GitHub username..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
      />

      <div style={{ marginTop: '16px' }}>
        {/* Loading state */}
        {isLoading && <p>Searching users...</p>}

        {/* Error state */}
        {isError && <p style={{ color: 'red' }}>Error: {error.message}</p>}

        {/* Empty state */}
        {!isLoading && debouncedSearch && users.length === 0 && (
          <p>No users found for "{debouncedSearch}"</p>
        )}

        {/* Results list */}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map((user) => (
            <li 
              key={user.id} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #444' }}
            >
              <img src={user.avatar_url} alt={user.login} width={40} height={40} style={{ borderRadius: '50%' }} />
              <div>
                <strong>{user.login}</strong>
                <br />
                <a href={user.html_url} target="_blank" rel="noreferrer" style={{ color: '#646cff' }}>
                  View Profile
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}