/**
 * Integration test for @k8s-web/react
 * Tests listing namespaces using the generated hooks
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useListCoreV1Namespace, useNamespaces, configureK8sClient } from '@k8s-web/react';
import React from 'react';

// Mock fetch globally
global.fetch = jest.fn();

describe('React Integration Tests - Namespaces', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Configure the client
    configureK8sClient({
      baseURL: 'https://localhost:6443',
      token: 'test-token',
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should export useListCoreV1Namespace hook', () => {
    expect(useListCoreV1Namespace).toBeDefined();
    expect(typeof useListCoreV1Namespace).toBe('function');
  });

  it('should export useNamespaces convenience hook', () => {
    expect(useNamespaces).toBeDefined();
    expect(typeof useNamespaces).toBe('function');
  });

  it('should call fetch with correct URL when using useListCoreV1Namespace', async () => {
    const mockResponse = {
      apiVersion: 'v1',
      kind: 'NamespaceList',
      items: [
        {
          metadata: { name: 'default' },
          spec: {},
          status: { phase: 'Active' },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useListCoreV1Namespace(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://localhost:6443'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );

    expect(result.current.data).toEqual(mockResponse);
  });

  it('should call fetch when using useNamespaces convenience hook', async () => {
    const mockResponse = {
      apiVersion: 'v1',
      kind: 'NamespaceList',
      items: [
        {
          metadata: { name: 'default' },
          spec: {},
          status: { phase: 'Active' },
        },
        {
          metadata: { name: 'kube-system' },
          spec: {},
          status: { phase: 'Active' },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useNamespaces(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.data?.items).toHaveLength(2);
  });

  it('should support label selector in useNamespaces', async () => {
    const mockResponse = {
      apiVersion: 'v1',
      kind: 'NamespaceList',
      items: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(
      () =>
        useNamespaces({
          labelSelector: 'environment=production',
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const url = fetchCall[0];
    expect(url).toContain('labelSelector=environment%3Dproduction');
  });
});
