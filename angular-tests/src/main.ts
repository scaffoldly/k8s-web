/**
 * Angular integration test application
 * Tests the @k8s-web/angular library by listing Kubernetes namespaces
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { CoreV1Service, K8S_CLIENT_CONFIG, k8sClientInterceptor } from 'k8s-web-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1>Angular Integration Test</h1>
      <h2>@k8s-web/angular</h2>

      <div class="status">
        <p>Status: <span id="status">{{ status }}</span></p>
      </div>

      <div class="namespaces">
        <h3>Kubernetes Namespaces</h3>
        @if (loading) {
          <p id="loading">Loading...</p>
        }
        @if (error) {
          <p id="error" class="error">Error: {{ error }}</p>
        }
        @if (namespaces.length > 0) {
          <ul id="namespace-list">
            @for (namespace of namespaces; track namespace) {
              <li>{{ namespace }}</li>
            }
          </ul>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
      }
      .error {
        color: red;
      }
      #status {
        font-weight: bold;
      }
      ul {
        list-style-type: none;
        padding: 0;
      }
      li {
        padding: 8px;
        border-bottom: 1px solid #eee;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  status = 'Initializing...';
  namespaces: string[] = [];
  loading = false;
  error = '';

  constructor(private coreV1: CoreV1Service) {}

  ngOnInit() {
    this.loadNamespaces();
  }

  loadNamespaces() {
    this.loading = true;
    this.status = 'Loading namespaces...';

    this.coreV1.listCoreV1Namespace().subscribe({
      next: (result) => {
        this.namespaces = result.items?.map((ns) => ns.metadata?.name || '') || [];
        this.status = `Loaded ${this.namespaces.length} namespaces`;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Unknown error';
        this.status = 'Error loading namespaces';
        this.loading = false;
      },
    });
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([k8sClientInterceptor])),
    {
      provide: K8S_CLIENT_CONFIG,
      useValue: {
        baseURL: 'https://localhost:6443',
        token: 'secret-token',
        rejectUnauthorized: false,
      },
    },
  ],
}).catch((err) => console.error(err));
