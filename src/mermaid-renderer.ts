import { UIFlow, UIFlowElement, UIFlowDisplayItem } from './parser';

export class MermaidRenderer {
  render(flow: UIFlow, scriptSrc?: string): string {
    const mermaidCode = this.generateMermaidClassDiagram(flow);
    return this.generateMermaidHTML(mermaidCode, scriptSrc);
  }

  generateMermaidClassDiagram(flow: UIFlow): string {
    // Handle empty flow case first
    if (flow.elements.length === 0) {
      return `classDiagram
    class Test {
        +test
    }`;
    }

    let diagram = 'classDiagram\n';

    // Generate class definitions (box format according to original specification)
    for (const element of flow.elements) {
      try {
        diagram += this.generateClassDefinition(element);
      } catch (error) {
        continue;
      }
    }

    // Generate relationships (arrows) - individual arrow for each action element
    for (const element of flow.elements) {
      for (const action of element.actionElements) {
        if (action.target) {
          try {
            const sourceName = this.sanitizeClassName(element.name);
            const targetName = this.sanitizeClassName(action.target);

            // Use action element text as label (shortened version)
            const actionText = this.sanitizeText(action.text).substring(0, 20);

            diagram += `${sourceName} --> ${targetName}${actionText ? ` : ${actionText}` : ''}\n`;
          } catch (error) {
            continue;
          }
        }
      }
    }

    return diagram;
  }

  private generateClassDefinition(element: UIFlowElement): string {
    const className = this.sanitizeClassName(element.name);
    let classDefinition = `class ${className} {\n`;

    // Display elements (represented as attributes, distinguished with ■ prefix)
    for (const displayItem of element.displayElements) {
      const sanitized = this.sanitizeText(displayItem.text);
      if (sanitized && sanitized !== 'empty') {
        classDefinition += `■ ${sanitized}\n`;

        // Display child elements with indentation if they exist
        if (displayItem.children && displayItem.children.length > 0) {
          for (const child of displayItem.children) {
            const childSanitized = this.sanitizeText(child.text);
            if (childSanitized && childSanitized !== 'empty') {
              classDefinition += `-- ${childSanitized}\n`;
            }
          }
        }
      }
    }

    // Action elements (represented as methods)
    for (const actionElement of element.actionElements) {
      const sanitized = this.sanitizeText(actionElement.text);
      if (sanitized && sanitized !== 'empty') {
        classDefinition += `+${sanitized}()\n`;
      }
    }

    // Add dummy element if no content
    if (element.displayElements.length === 0 && element.actionElements.length === 0) {
      classDefinition += '■ info\n';
    }

    classDefinition += '    }\n';
    return classDefinition;
  }

  private sanitizeClassName(name: string): string {
    // Support Japanese class names by wrapping with backticks
    const cleaned = name
      .replace(/[`]/g, '') // Remove existing backticks
      .replace(/（[^）]*）/g, '') // Remove Japanese parentheses content
      .replace(/\([^)]*\)/g, '') // Remove English parentheses content
      .trim();

    // Return default name if empty
    if (!cleaned) {
      return 'UnknownClass';
    }

    // Return wrapped with backticks
    return `\`${cleaned}\``;
  }

  private sanitizeText(text: string): string {
    // Safely replace characters that cause problems in Mermaid syntax
    return text
      .replace(/\+\+/g, '■') // Replace ++ with ■ (as section separator)
      .replace(/\+/g, '＋') // Replace + with full-width +
      .replace(/・/g, '•') // Replace middle dot with bullet point
      .replace(/[{}()\[\]|~`]/g, '_') // Replace Mermaid syntax characters
      .replace(/（[^）]*）/g, '') // Remove Japanese parentheses content (Phase info, etc.)
      .replace(/\([^)]*\)/g, '') // Remove English parentheses content
      .replace(/"/g, "'") // Replace double quotes with single quotes
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .replace(/\r/g, '') // Remove carriage returns
      .replace(/\s+/g, ' ') // Replace consecutive spaces with single space
      .substring(0, 50) // Truncate text that is too long
      .trim() || 'empty';
  }



  private generateMermaidHTML(mermaidCode: string, scriptSrc?: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>UI Flow Diagrams</title>
  <script src="${scriptSrc || 'https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.min.js'}"></script>
  <style type="text/css">
    body {
      margin: 0;
      padding: 20px;
      font-family: Arial, sans-serif;
      background-color: #f8fafc;
      overflow: hidden;
    }
    .zoom-container {
      position: relative;
      width: 100%;
      height: calc(100vh - 40px);
      overflow: hidden;
      background-color: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      cursor: grab;
    }
    .zoom-container:active {
      cursor: grabbing;
    }
    .mermaid {
      text-align: center;
      padding: 20px;
      margin: 0 auto;
      transform-origin: center center;
      transition: transform 0.1s ease-out;
    }
    .zoom-controls {
      position: fixed;
      top: 30px;
      right: 30px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
    }
    .zoom-btn {
      width: 40px;
      height: 40px;
      border: 1px solid #ccc;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .zoom-btn:hover {
      background: #f0f0f0;
    }
    .zoom-info {
      position: fixed;
      top: 30px;
      left: 30px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
    }
    /* Mermaid class diagram style customization */
    .node rect {
      fill: #ffffff !important;
      stroke: #2563eb !important;
      stroke-width: 2px !important;
    }
    .node text {
      font-size: 12px !important;
      font-family: 'Courier New', 'Monaco', monospace !important;
      white-space: pre !important;
    }
    .classTitleText {
      font-weight: bold !important;
      font-size: 14px !important;
    }
    .classText {
      font-size: 11px !important;
      white-space: pre !important;
    }
    /* Arrow styles */
    .edgePath path {
      stroke: #6366f1 !important;
      stroke-width: 2px !important;
    }
    .arrowheadPath {
      fill: #6366f1 !important;
      stroke: #6366f1 !important;
    }
    /* Relationship label styles */
    .edgeLabel {
      background-color: white !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 4px !important;
      padding: 2px 6px !important;
      font-size: 10px !important;
    }
  </style>
</head>
<body>
  <div class="zoom-info">
    Zoom: <span id="zoom-level">100%</span> | Use mouse wheel to zoom, drag to pan
  </div>

  <div class="zoom-controls">
    <button class="zoom-btn" onclick="zoomIn()">+</button>
    <button class="zoom-btn" onclick="zoomOut()">−</button>
    <button class="zoom-btn" onclick="resetZoom()" title="Reset Zoom">⌂</button>
  </div>

  <div class="zoom-container" id="zoom-container">
    <div class="mermaid" id="mermaid-diagram">
${mermaidCode}
    </div>
  </div>

  <script type="text/javascript">
    function initializeMermaid() {
      if (typeof mermaid !== 'undefined') {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
              primaryColor: '#ffffff',
              primaryTextColor: '#374151',
              primaryBorderColor: '#2563eb',
              lineColor: '#6366f1',
              secondaryColor: '#f8fafc',
              tertiaryColor: '#ffffff'
            },
            classDiagram: {
              htmlLabels: true,
              useMaxWidth: true,
              diagramPadding: 35,
              titleTopMargin: 30,
              dividerMargin: 15,
              defaultRenderer: 'dagre'
            },
            layout: 'dagre',
            dagre: {
              rankdir: 'TB',
              ranksep: 80,
              nodesep: 60,
              edgesep: 40
            }
          });

          const element = document.querySelector('.mermaid');
          if (element) {
            mermaid.run({
              querySelector: '.mermaid'
            }).then(() => {
              initializeZoomPan();
            }).catch((error) => {
              element.innerHTML = '<p>Mermaid rendering failed: ' + error.message + '</p>';
            });
          }
        } catch (error) {
          const mermaidDiv = document.querySelector('.mermaid');
          if (mermaidDiv) {
            mermaidDiv.innerHTML = '<p>Error rendering diagram: ' + error.message + '</p>';
          }
        }
      } else {
        const mermaidDiv = document.querySelector('.mermaid');
        if (mermaidDiv) {
          mermaidDiv.innerHTML = '<p>Mermaid library failed to load. Please check your internet connection.</p>';
        }
      }
    }

    // Zoom and pan functionality implementation
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    function updateTransform() {
      const mermaidDiv = document.getElementById('mermaid-diagram');
      if (mermaidDiv) {
        mermaidDiv.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${zoomLevel})\`;
        document.getElementById('zoom-level').textContent = Math.round(zoomLevel * 100) + '%';
      }
    }

    function zoomIn() {
      zoomLevel = Math.min(zoomLevel * 1.2, 3);
      updateTransform();
    }

    function zoomOut() {
      zoomLevel = Math.max(zoomLevel / 1.2, 0.1);
      updateTransform();
    }

    function resetZoom() {
      zoomLevel = 1;
      panX = 0;
      panY = 0;
      updateTransform();
    }

    function initializeZoomPan() {
      const container = document.getElementById('zoom-container');

      // Zoom with mouse wheel
      container.addEventListener('wheel', function(e) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Zoom centered on mouse position
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(3, zoomLevel * scaleFactor));

        if (newZoom !== zoomLevel) {
          const zoomDelta = newZoom - zoomLevel;
          panX -= (mouseX - panX) * zoomDelta / zoomLevel;
          panY -= (mouseY - panY) * zoomDelta / zoomLevel;
          zoomLevel = newZoom;
          updateTransform();
        }
      });

      // Pan with drag
      container.addEventListener('mousedown', function(e) {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        container.style.cursor = 'grabbing';
      });

      container.addEventListener('mousemove', function(e) {
        if (isDragging) {
          const deltaX = e.clientX - lastMouseX;
          const deltaY = e.clientY - lastMouseY;
          panX += deltaX;
          panY += deltaY;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
          updateTransform();
        }
      });

      container.addEventListener('mouseup', function() {
        isDragging = false;
        container.style.cursor = 'grab';
      });

      container.addEventListener('mouseleave', function() {
        isDragging = false;
        container.style.cursor = 'grab';
      });
    }

    // Wait for Mermaid script to finish loading
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for script loading completion
        setTimeout(initializeMermaid, 100);
      });
    } else {
      // If already loaded
      setTimeout(initializeMermaid, 100);
    }
  </script>
</body>
</html>`;
  }
}