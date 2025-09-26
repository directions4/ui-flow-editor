import * as vscode from 'vscode';
import { UIFlowParser } from './parser';
import { MermaidRenderer } from './mermaid-renderer';

export class UIFlowPreviewPanel {
  public static currentPanel: UIFlowPreviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];
  private parser: UIFlowParser;
  private renderer: MermaidRenderer;

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : undefined;

    if (UIFlowPreviewPanel.currentPanel) {
      UIFlowPreviewPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'uiFlowPreview',
      'UI Flow Preview',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'dist'),
        ],
      }
    );

    UIFlowPreviewPanel.currentPanel = new UIFlowPreviewPanel(panel, extensionUri);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    UIFlowPreviewPanel.currentPanel = new UIFlowPreviewPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.parser = new UIFlowParser();
    this.renderer = new MermaidRenderer();
    console.log('Preview panel initialized with MermaidRenderer');

    this.update();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'alert':
            vscode.window.showErrorMessage(message.text);
            return;
        }
      },
      null,
      this.disposables
    );
  }

  public updateContent(markdown: string) {
    try {
      console.log('UpdateContent called with:', markdown.length, 'characters');
      const flow = this.parser.parse(markdown);
      console.log('Parsed flow:', JSON.stringify(flow, null, 2));
      const mermaidUri = this.panel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'media', 'mermaid.min.js')
      );
      const html = this.renderer.render(flow, mermaidUri.toString());
      console.log('Generated HTML length:', html.length);
      console.log('HTML includes mermaid?', html.includes('mermaid'));
      console.log('HTML includes classDiagram?', html.includes('classDiagram'));
      console.log('HTML preview:', html.substring(0, 500));
      this.panel.webview.html = html;
    } catch (error) {
      console.error('Preview error:', error);
      this.panel.webview.html = this.getErrorHtml(String(error));
    }
  }

  private update() {
    this.panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>UI Flow Preview</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      text-align: center;
      color: #666;
    }
  </style>
</head>
<body>
  <p>No UI Flow content to preview</p>
</body>
</html>`;
  }

  private getSVGHtml(svgContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI Flow Preview</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            overflow: auto;
        }
        .preview-container {
            width: 100%;
            overflow: auto;
        }
        svg {
            width: 100%;
            height: auto;
            min-height: 400px;
            border: 1px solid var(--vscode-panel-border);
            background: white;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        ${svgContent}
    </div>
</body>
</html>`;
  }

  private getHtmlForWebview(svgContent: string) {
    const debugInfo = `<div style="background: #f0f0f0; padding: 10px; margin-bottom: 10px; font-family: monospace; font-size: 12px;">
      <strong>Debug Info:</strong><br>
      SVG Content Length: ${svgContent.length}<br>
      SVG Preview: ${svgContent.substring(0, 100).replace(/</g, '&lt;').replace(/>/g, '&gt;')}...
    </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI Flow Preview</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            overflow: auto;
        }
        .preview-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }
        svg {
            max-width: 100%;
            height: auto;
            border: 1px solid var(--vscode-panel-border);
            background: white;
            border-radius: 4px;
        }
        .error {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 10px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        ${debugInfo}
        <div style="border: 1px solid red; padding: 10px;">
          ${svgContent}
        </div>
    </div>
</body>
</html>`;
  }

  private getErrorHtml(error: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI Flow Preview - Error</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        .error {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 10px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="error">
        <h3>Preview Error</h3>
        <p>${error}</p>
    </div>
</body>
</html>`;
  }

  public dispose() {
    UIFlowPreviewPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}