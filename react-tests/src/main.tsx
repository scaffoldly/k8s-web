/**
 * React integration test application
 * Tests the @k8s-web/react library by listing Kubernetes namespaces
 */
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNamespaces, configureK8sClient } from '@k8s-web/react';

// Configure the K8s client
configureK8sClient({
  baseURL: 'https://localhost:6443',
  token: 'secret-token',
  rejectUnauthorized: false,
});

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { data, isLoading, error } = useNamespaces();
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    if (isLoading) {
      setStatus('Loading namespaces...');
    } else if (error) {
      setStatus('Error loading namespaces');
    } else if (data) {
      setStatus(`Loaded ${data.items?.length || 0} namespaces`);
    }
  }, [isLoading, error, data]);

  return (
    <div style={styles.container}>
      <h1>React Integration Test</h1>
      <h2>@k8s-web/react</h2>

      <div style={styles.status}>
        <p>
          Status: <span id="status" style={styles.statusText}>{status}</span>
        </p>
      </div>

      <div style={styles.namespaces}>
        <h3>Kubernetes Namespaces</h3>
        {isLoading && <p id="loading">Loading...</p>}
        {error && (
          <p id="error" style={styles.error}>
            Error: {error.message}
          </p>
        )}
        {data && data.items && (
          <ul id="namespace-list" style={styles.list}>
            {data.items.map((ns) => (
              <li key={ns.metadata?.name} style={styles.listItem}>
                {ns.metadata?.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  status: {},
  statusText: {
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
  },
  namespaces: {},
  list: {
    listStyleType: 'none',
    padding: 0,
  },
  listItem: {
    padding: '8px',
    borderBottom: '1px solid #eee',
  },
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
