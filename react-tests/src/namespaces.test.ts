/**
 * Integration test for @k8s-web/react
 * Tests the library can connect to Kubernetes API
 */
import { test, expect } from '@playwright/test';

test.describe('React Integration Tests - Namespaces', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the simple test page
    await page.goto('http://localhost:3000/test-simple.html');
  });

  test('should load the test page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('React Integration Test');
    await expect(page.locator('h2')).toContainText('@k8s-web/react');
  });

  test('should list namespaces from Kubernetes API', async ({ page }) => {
    // Wait for the status to show success
    await expect(page.locator('#status')).toContainText('Loaded', { timeout: 10000 });

    // Check that namespaces list is visible
    const namespaceList = page.locator('#namespace-list');
    await expect(namespaceList).toBeVisible();

    // Verify that default namespaces exist
    const listItems = page.locator('#namespace-list li');
    await expect(listItems).not.toHaveCount(0);

    // Check for common namespaces
    const text = await page.locator('#namespace-list').textContent();
    expect(text).toContain('default');
    expect(text).toContain('kube-system');
  });

  test('should not show error message', async ({ page }) => {
    await page.waitForTimeout(3000);
    const errorElement = page.locator('#error');
    const errorDisplay = await errorElement.evaluate(el => window.getComputedStyle(el).display);
    expect(errorDisplay).toBe('none');
  });
});
