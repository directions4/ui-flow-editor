import * as assert from 'assert';
import * as vscode from 'vscode';
import { MermaidRenderer } from '../mermaid-renderer';
import { UIFlowCompletionProvider } from '../completion-provider';
import { UIFlowParser } from '../parser';

suite('Core Functionality Integration Tests', () => {

  test('MermaidRenderer should generate valid HTML', () => {
    const renderer = new MermaidRenderer();
    const flow = {
      elements: [
        {
          name: 'Test Page',
          displayElements: [{ text: 'Display Element' }],
          actionElements: [
            { text: 'Test Action', target: 'Next Page' }
          ]
        }
      ]
    };

    const html = renderer.render(flow);

    // Basic HTML validation
    assert.ok(html.includes('<!DOCTYPE html>'), 'Should include DOCTYPE');
    assert.ok(html.includes('classDiagram'), 'Should include class diagram');
    assert.ok(html.includes('Test Page'), 'Should include page name');
    assert.ok(html.includes('zoom-controls'), 'Should include zoom controls');

    // Should include action as method
    assert.ok(html.includes('+Test Action()'), 'Should include action as method with parentheses');
  });

  test('MermaidRenderer should handle Japanese content', () => {
    const renderer = new MermaidRenderer();
    const flow = {
      elements: [
        {
          name: 'ログインページ',
          displayElements: [{ text: 'ユーザー名入力' }],
          actionElements: [
            { text: 'ログインボタン', target: 'ダッシュボード' }
          ]
        }
      ]
    };

    const html = renderer.render(flow);

    // Should handle Japanese text
    assert.ok(html.includes('ログインページ'), 'Should preserve Japanese page names');
    assert.ok(html.includes('ユーザー名入力'), 'Should preserve Japanese display elements');
    assert.ok(html.includes('+ログインボタン()'), 'Should include Japanese action as method');
    assert.ok(html.includes('classDiagram'), 'Should still generate valid diagram');
  });

  test('MermaidRenderer should sanitize problematic characters', () => {
    const renderer = new MermaidRenderer();
    const flow = {
      elements: [
        {
          name: 'Test + Page',
          displayElements: [{ text: 'Display • Element' }, { text: '+ Additional' }],
          actionElements: [
            { text: 'Action + Button', target: 'Next' }
          ]
        }
      ]
    };

    const html = renderer.render(flow);

    // Should convert special characters
    assert.ok(html.includes('＋'), 'Should convert + to full-width');
    assert.ok(html.includes('•'), 'Should convert bullet points');
    assert.ok(html.includes('classDiagram'), 'Should generate valid diagram');
  });

  test('CompletionProvider should be instantiable', () => {
    const provider = new UIFlowCompletionProvider();
    assert.ok(provider, 'Should create completion provider instance');
    assert.strictEqual(typeof provider.provideCompletionItems, 'function',
      'Should have provideCompletionItems method');
  });


  test('Export functionality should generate valid structure', () => {
    const renderer = new MermaidRenderer();
    const flow = {
      elements: [
        {
          name: 'Export Test',
          displayElements: [{ text: 'Content' }],
          actionElements: [
            { text: 'Action', target: 'Target' }
          ]
        }
      ]
    };

    const html = renderer.render(flow);

    // Should be self-contained for export
    assert.ok(html.includes('mermaid.min.js'), 'Should include Mermaid script');
    assert.ok(html.includes('mermaid.initialize'), 'Should include initialization');
    assert.ok(html.includes('<title>'), 'Should include title');
    assert.ok(html.includes('zoom-controls'), 'Should include interactive controls');
  });

  test('Complex UI Flow should be processed correctly', () => {
    const renderer = new MermaidRenderer();
    const complexFlow = {
      elements: [
        {
          name: 'Main Menu',
          displayElements: [{ text: 'Logo' }, { text: 'Navigation' }, { text: 'User Menu' }],
          actionElements: [
            { text: 'Profile Click', target: 'User Profile' },
            { text: 'Settings Click', target: 'Settings Page' }
          ]
        },
        {
          name: 'User Profile',
          displayElements: [{ text: 'Profile Info' }, { text: 'Edit Form' }],
          actionElements: [
            { text: 'Back', target: 'Main Menu' }
          ]
        },
        {
          name: 'Settings Page',
          displayElements: [{ text: 'Configuration Options' }],
          actionElements: []
        }
      ]
    };

    const html = renderer.render(complexFlow);

    // Should handle complex relationships
    assert.ok(html.includes('Main Menu'), 'Should include main menu');
    assert.ok(html.includes('User Profile'), 'Should include profile page');
    assert.ok(html.includes('Settings Page'), 'Should include settings page');
    assert.ok(html.includes('-->'), 'Should include relationships');
  });

  test('Edge cases should be handled gracefully', () => {
    const renderer = new MermaidRenderer();

    // Test empty flow
    const emptyFlow = { elements: [] };
    const emptyHtml = renderer.render(emptyFlow);
    assert.ok(emptyHtml.includes('class Test'), 'Should handle empty flow');

    // Test flow with empty elements
    const emptyElementFlow = {
      elements: [
        {
          name: 'Empty Page',
          displayElements: [],
          actionElements: []
        }
      ]
    };
    const emptyElementHtml = renderer.render(emptyElementFlow);
    assert.ok(emptyElementHtml.includes('■ info'), 'Should add dummy content for empty elements');
  });

  test('Parser should handle Markdown list syntax correctly', () => {
    const parser = new UIFlowParser();
    const listContent = `[Menu Page]
- Logo
- Navigation Menu
  - Home Link
  - About Link
  - Contact Link
- User Profile
  - Profile Picture
  - User Name
--
Click Navigation
==> Target Page`;

    const result = parser.parse(listContent);

    // Should parse the hierarchical list structure
    assert.strictEqual(result.elements.length, 1);
    assert.strictEqual(result.elements[0].name, 'Menu Page');

    // Should have top-level display elements
    assert.strictEqual(result.elements[0].displayElements.length, 3);
    assert.strictEqual(result.elements[0].displayElements[0].text, 'Logo');
    assert.strictEqual(result.elements[0].displayElements[1].text, 'Navigation Menu');
    assert.strictEqual(result.elements[0].displayElements[2].text, 'User Profile');

    // Should have children for Navigation Menu
    const navItem = result.elements[0].displayElements[1];
    assert.ok(navItem.children, 'Navigation Menu should have children');
    assert.strictEqual(navItem.children!.length, 3);
    assert.strictEqual(navItem.children![0].text, 'Home Link');
    assert.strictEqual(navItem.children![1].text, 'About Link');
    assert.strictEqual(navItem.children![2].text, 'Contact Link');

    // Should have children for User Profile
    const userItem = result.elements[0].displayElements[2];
    assert.ok(userItem.children, 'User Profile should have children');
    assert.strictEqual(userItem.children!.length, 2);
    assert.strictEqual(userItem.children![0].text, 'Profile Picture');
    assert.strictEqual(userItem.children![1].text, 'User Name');
  });

  test('MermaidRenderer should render hierarchical lists with proper indentation', () => {
    const renderer = new MermaidRenderer();
    const hierarchicalFlow = {
      elements: [
        {
          name: 'Hierarchical Page',
          displayElements: [
            {
              text: 'Main Section',
              children: [
                { text: 'Sub Item 1' },
                { text: 'Sub Item 2' }
              ]
            },
            {
              text: 'Another Section'
            }
          ],
          actionElements: [
            { text: 'Next Action', target: 'Target' }
          ]
        }
      ]
    };

    const html = renderer.render(hierarchicalFlow);

    // Should include main items with bullet points
    assert.ok(html.includes('■ Main Section'), 'Should include main section with bullet');
    assert.ok(html.includes('■ Another Section'), 'Should include another section with bullet');

    // Should include child items with different indentation/markers
    assert.ok(html.includes('-- Sub Item 1'), 'Should include sub item 1 with child marker');
    assert.ok(html.includes('-- Sub Item 2'), 'Should include sub item 2 with child marker');
  });
});