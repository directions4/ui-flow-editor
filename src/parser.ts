export interface UIFlowDisplayItem {
  text: string;
  children?: UIFlowDisplayItem[];
}

export interface UIFlowElement {
  name: string;
  displayElements: UIFlowDisplayItem[];
  actionElements: UIFlowAction[];
}

export interface UIFlowAction {
  text: string;
  target?: string;
}

export interface UIFlow {
  elements: UIFlowElement[];
}

export class UIFlowParser {
  parse(markdown: string): UIFlow {
    const elements: UIFlowElement[] = [];
    const blocks = this.splitIntoBlocks(markdown);

    for (let i = 0; i < blocks.length; i++) {
      const element = this.parseBlock(blocks[i]);
      if (element) {
        // Auto-connection: connect any actions without explicit targets to next block
        if (element.actionElements.length > 0 && i + 1 < blocks.length) {
          const nextBlock = blocks[i + 1];
          const nextBlockName = this.extractBlockName(nextBlock);
          if (nextBlockName) {
            // Connect all actions that don't have explicit targets
            for (const action of element.actionElements) {
              if (!action.target) {
                action.target = nextBlockName;
              }
            }
          }
        }
        elements.push(element);
      }
    }

    return { elements };
  }

  private splitIntoBlocks(markdown: string): string[] {
    return markdown.split(/\n\s*\n/).filter(block => block.trim().length > 0);
  }

  private parseBlock(block: string): UIFlowElement | null {
    const lines = block.trim().split('\n');

    // Extract block name
    const nameMatch = lines[0].trim().match(/^\[(.+)\]$/);
    if (!nameMatch) {
      return null;
    }

    const name = nameMatch[1];
    const displayElements: UIFlowDisplayItem[] = [];
    const actionElements: UIFlowAction[] = [];

    let isActionSection = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (/^-{2,}$/.test(line.trim())) { // Recognize 2 or more hyphens as separator
        isActionSection = true;
        continue;
      }

      if (!line.trim()) {
        continue;
      }

      if (!isActionSection) {
        const { consumedLines, displayItem } = this.parseDisplayElement(line, lines, i);
        if (displayItem) {
          displayElements.push(displayItem);
        }
        i += consumedLines - 1; // Skip processed lines
      } else {
        const consumed = this.parseActionLine(line.trim(), lines, i, actionElements);
        if (consumed > 1) {
          i += consumed - 1; // Skip processed lines
        }
      }
    }

    return { name, displayElements, actionElements };
  }

  private parseActionLine(line: string, lines: string[], index: number, actionElements: UIFlowAction[]): number {
    // Check for transition arrow
    const transitionMatch = line.match(/^(.+?)\s*==>?\s*(.*)$/);
    if (transitionMatch) {
      const actionText = transitionMatch[1].trim();
      const target = transitionMatch[2].trim() || undefined;
      actionElements.push({ text: actionText, target });
      return 1;
    }

    // Check if next line has transition
    if (index + 1 < lines.length) {
      const nextLine = lines[index + 1];

      const nextTransitionMatch = nextLine.match(/^==>?\s*(.*)$/);
      if (nextTransitionMatch) {
        const target = nextTransitionMatch[1].trim() || undefined;
        actionElements.push({ text: line, target });
        return 2; // Consumed current and next line
      }
    }

    // Simple action without transition
    actionElements.push({ text: line });
    return 1;
  }

  private parseDisplayElement(line: string, lines: string[], startIndex: number): { consumedLines: number, displayItem: UIFlowDisplayItem | null } {
    // Check if this is a Markdown list item
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);

    if (!listMatch) {
      // Not a list item, treat as plain text
      return { consumedLines: 1, displayItem: { text: line } };
    }

    const indent = listMatch[1];
    const text = listMatch[3];
    const isTopLevel = indent.length === 0;

    if (isTopLevel) {
      // Top-level item, check for children
      const displayItem: UIFlowDisplayItem = { text };
      const children: UIFlowDisplayItem[] = [];
      let consumedLines = 1;

      // Look for child items (indented)
      for (let i = startIndex + 1; i < lines.length; i++) {
        const childLine = lines[i];

        // Stop if we hit separator or empty line or another top-level item
        if (/^-{2,}$/.test(childLine) || !childLine.trim() || this.isTopLevelListItem(childLine)) {
          break;
        }

        const childMatch = childLine.match(/^(\s+)([-*+]|\d+\.)\s+(.+)$/);
        if (childMatch && childMatch[1].length > 0) {
          // This is a child item
          children.push({ text: childMatch[3] });
          consumedLines++;
        } else {
          // Not a list item, stop looking for children
          break;
        }
      }

      if (children.length > 0) {
        displayItem.children = children;
      }

      return { consumedLines, displayItem };
    }

    // This is a child item, but should be handled by parent parsing
    return { consumedLines: 1, displayItem: null };
  }

  private isTopLevelListItem(line: string): boolean {
    const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    return match !== null && match[1].length === 0;
  }

  private extractBlockName(block: string): string | null {
    const firstLine = block.trim().split('\n')[0].trim();
    const nameMatch = firstLine.match(/^\[(.+)\]$/);
    return nameMatch ? nameMatch[1] : null;
  }
}