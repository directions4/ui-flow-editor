import * as vscode from 'vscode';

export class UIFlowCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.CompletionItem[] {
    const line = document.lineAt(position.line);
    const lineText = line.text.substring(0, position.character);

    // Completion items for UI Flows
    const completions: vscode.CompletionItem[] = [];

    // Page block completion
    if (lineText.match(/^\s*\[.*$/)) {
      const pageCompletion = new vscode.CompletionItem('[Page Name]', vscode.CompletionItemKind.Snippet);
      pageCompletion.insertText = new vscode.SnippetString('[${1:Page Name}]');
      pageCompletion.documentation = new vscode.MarkdownString('UI Flow page block');
      completions.push(pageCompletion);
    }

    // Separator completion
    if (lineText.trim() === '' || lineText.match(/^\s*-*$/)) {
      const separatorCompletion = new vscode.CompletionItem('--', vscode.CompletionItemKind.Snippet);
      separatorCompletion.insertText = '--';
      separatorCompletion.documentation = new vscode.MarkdownString('Separator between display and action elements');
      completions.push(separatorCompletion);
    }

    // Transition arrow completions
    if (lineText.match(/^\s*[^=]*$/)) {
      // Simple transition
      const simpleTransition = new vscode.CompletionItem('==>', vscode.CompletionItemKind.Snippet);
      simpleTransition.insertText = new vscode.SnippetString('==> ${1:Target Page}');
      simpleTransition.documentation = new vscode.MarkdownString('Simple transition to another page');
      completions.push(simpleTransition);

      // Named transition
      const namedTransition = new vscode.CompletionItem('=={name}=>', vscode.CompletionItemKind.Snippet);
      namedTransition.insertText = new vscode.SnippetString('=={${1:Transition Name}}=> ${2:Target Page}');
      namedTransition.documentation = new vscode.MarkdownString('Named transition with label');
      completions.push(namedTransition);
    }

    // Action element patterns
    if (this.isInActionSection(document, position)) {
      const actionPatterns = [
        { label: 'Button Click', snippet: 'Tap ${1:Button}' },
        { label: 'Input', snippet: 'Enter ${1:Field}' },
        { label: 'Selection', snippet: 'Select ${1:Item}' },
        { label: 'Swipe', snippet: 'Swipe ${1:Element}' },
        { label: 'Back', snippet: 'Go Back' },
        { label: 'Submit', snippet: 'Submit' },
        { label: 'Cancel', snippet: 'Cancel' },
      ];

      actionPatterns.forEach(pattern => {
        const completion = new vscode.CompletionItem(pattern.label, vscode.CompletionItemKind.Text);
        completion.insertText = new vscode.SnippetString(pattern.snippet);
        completion.documentation = new vscode.MarkdownString(`Common action: ${pattern.label}`);
        completions.push(completion);
      });
    }

    // Display element patterns
    if (this.isInDisplaySection(document, position)) {
      const displayPatterns = [
        { label: 'Dialog', snippet: '${1:Confirmation} Dialog' },
        { label: 'Button', snippet: '${1:OK} Button' },
        { label: 'Input Field', snippet: '${1:Name} Input Field' },
        { label: 'List', snippet: '${1:Items} List' },
        { label: 'Image', snippet: '${1:Title} Image' },
        { label: 'Text', snippet: '${1:Content} Text' },
        { label: 'Icon', snippet: '${1:Search} Icon' },
      ];

      displayPatterns.forEach(pattern => {
        const completion = new vscode.CompletionItem(pattern.label, vscode.CompletionItemKind.Text);
        completion.insertText = new vscode.SnippetString(pattern.snippet);
        completion.documentation = new vscode.MarkdownString(`Common display element: ${pattern.label}`);
        completions.push(completion);
      });
    }

    return completions;
  }

  private isInActionSection(document: vscode.TextDocument, position: vscode.Position): boolean {
    // Find the nearest page block and check if we're in the action section
    let foundPage = false;
    let foundSeparator = false;

    for (let i = position.line; i >= 0; i--) {
      const line = document.lineAt(i).text.trim();

      // If we hit another page block, we're no longer in the current page
      if (line.match(/^\[.*\]$/) && i !== position.line) {
        if (foundPage) {
          break;
        }
        foundPage = true;
        continue;
      }

      // If we find the current or previous page block
      if (line.match(/^\[.*\]$/)) {
        foundPage = true;
        continue;
      }

      // If we find a separator after finding a page
      if (foundPage && (line === '--' || line === '------')) {
        foundSeparator = true;
        break;
      }
    }

    return foundPage && foundSeparator;
  }

  private isInDisplaySection(document: vscode.TextDocument, position: vscode.Position): boolean {
    // Find the nearest page block and check if we're in the display section (before separator)
    let foundPage = false;

    for (let i = position.line; i >= 0; i--) {
      const line = document.lineAt(i).text.trim();

      // If we find a separator, we're not in the display section
      if (line === '--' || line === '------') {
        return false;
      }

      // If we find a page block
      if (line.match(/^\[.*\]$/)) {
        foundPage = true;
        break;
      }

      // If we hit another page block that's not current, stop
      if (line.match(/^\[.*\]$/) && i !== position.line) {
        break;
      }
    }

    return foundPage;
  }
}