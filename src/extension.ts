import * as vscode from 'vscode';
import { UIFlowPreviewPanel } from './preview-panel';
import { UIFlowParser } from './parser';
import { MermaidRenderer } from './mermaid-renderer';
import { UIFlowCompletionProvider } from './completion-provider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Markdown UI Flows extension is now active!');

	// Register preview command
	const previewCommand = vscode.commands.registerCommand(
		'ui-flow-editor.preview',
		() => {
			UIFlowPreviewPanel.createOrShow(context.extensionUri);
			updatePreview();
		}
	);

	// Register export HTML command
	const exportHtmlCommand = vscode.commands.registerCommand(
		'ui-flow-editor.exportHtml',
		() => {
			exportToSvg();
		}
	);


	// Watch for editor changes to update preview
	const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
		(event) => {
			if (event.document === vscode.window.activeTextEditor?.document) {
				updatePreview();
			}
		}
	);

	// Watch for active editor changes
	const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(() => {
		updatePreview();
	});

	// Register completion provider for UI Flows files
	const completionProvider = vscode.languages.registerCompletionItemProvider(
		'ui-flows',
		new UIFlowCompletionProvider(),
		'[', '-', '='
	);

	context.subscriptions.push(
		previewCommand,
		exportHtmlCommand,
		onDidChangeTextDocument,
		onDidChangeActiveTextEditor,
		completionProvider
	);

	// Register webview serializer (only if not already registered)
	try {
		if (vscode.window.registerWebviewPanelSerializer) {
			const serializer = vscode.window.registerWebviewPanelSerializer('uiFlowPreview', {
				async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel) {
					UIFlowPreviewPanel.revive(webviewPanel, context.extensionUri);
				}
			});
			context.subscriptions.push(serializer);
		}
	} catch (error) {
		console.log('Webview serializer already registered, skipping...', error);
	}
}

function updatePreview() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	const document = editor.document;
	if (document.languageId !== 'ui-flows') {
		return;
	}

	const text = document.getText();
	UIFlowPreviewPanel.currentPanel?.updateContent(text);
}

async function exportToSvg() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage('No active editor');
		return;
	}

	if (editor.document.languageId !== 'ui-flows') {
		vscode.window.showErrorMessage('Current file is not a UI Flows file');
		return;
	}

	try {
		const text = editor.document.getText();
		const parser = new UIFlowParser();
		const renderer = new MermaidRenderer();

		const flow = parser.parse(text);
		const html = renderer.render(flow);

		// Get default filename from current document
		const currentFilePath = editor.document.uri.fsPath;
		const baseName = currentFilePath.replace(/\.[^/.]+$/, "");
		const defaultUri = vscode.Uri.file(baseName + '.html');

		const fileUri = await vscode.window.showSaveDialog({
			defaultUri,
			filters: {
				'HTML files': ['html'],
			},
		});

		if (fileUri) {
			const htmlBuffer = Buffer.from(html, 'utf8');
			await vscode.workspace.fs.writeFile(fileUri, htmlBuffer);
			vscode.window.showInformationMessage(`HTML exported to: ${fileUri.fsPath}`);
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to export HTML: ${error}`);
	}
}


// This method is called when your extension is deactivated
export function deactivate() {}
