// ── Visual Editor injection script for preview iframe ──────────────
// This script is injected as a string into the iframe's srcdoc.
// It handles hover highlights, element selection, inline text editing,
// and communicates with the parent via postMessage.

export function getInjectionScript(): string {
  return `
(function() {
  if (window.__wfEditorInjected) return;
  window.__wfEditorInjected = true;

  var EDITABLE_TAGS = new Set([
    'H1','H2','H3','H4','H5','H6','P','SPAN','A','BUTTON','LI','TD','TH',
    'IMG','DIV','SECTION','NAV','FOOTER','HEADER','FIGURE','BLOCKQUOTE','LABEL','INPUT'
  ]);

  var TEXT_TAGS = new Set([
    'H1','H2','H3','H4','H5','H6','P','SPAN','A','BUTTON','LI','TD','TH',
    'LABEL','BLOCKQUOTE'
  ]);

  var mode = 'select'; // 'browse' | 'select' | 'edit'
  var selectedEl = null;
  var hoveredEl = null;
  var isTextEditing = false;
  var originalTextContent = '';
  var labelEl = null;

  // ── Styles ────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.id = 'wf-visual-editor-styles';
  style.textContent = [
    '[data-wf-hover] { outline: 2px dashed #6366f1 !important; outline-offset: 2px !important; cursor: pointer !important; }',
    '[data-wf-selected] { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; }',
    '[data-wf-text-editing] { outline: 2px solid #8b5cf6 !important; outline-offset: 2px !important; cursor: text !important; min-height: 1em; }',
    '.wf-tag-label { position: absolute; z-index: 99999; background: #6366f1; color: #fff; font-size: 10px; font-family: monospace; padding: 1px 6px; border-radius: 3px 3px 0 0; pointer-events: none; line-height: 16px; white-space: nowrap; }',
    '.wf-section-handle { position: absolute; left: -36px; top: 50%; transform: translateY(-50%); z-index: 99998; width: 28px; height: 28px; background: #6366f1; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: grab; opacity: 0; transition: opacity 0.2s; }',
    '.wf-section-handle:hover { opacity: 1 !important; background: #4f46e5; }',
    '.wf-section-handle svg { width: 14px; height: 14px; fill: white; }',
    '[data-wf-hover] ~ .wf-section-handle, [data-wf-selected] ~ .wf-section-handle { opacity: 0.7; }',
  ].join('\\n');
  document.head.appendChild(style);

  // ── Utility functions ─────────────────────────────────────────
  function getCSSPath(el) {
    if (!el || el === document.documentElement || el === document.body) return 'body';
    var parts = [];
    var current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      var tag = current.tagName.toLowerCase();
      if (current.id) {
        parts.unshift('#' + current.id);
        break;
      }
      var parent = current.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children);
        var sameTag = siblings.filter(function(s) { return s.tagName === current.tagName; });
        if (sameTag.length > 1) {
          var idx = sameTag.indexOf(current) + 1;
          tag += ':nth-of-type(' + idx + ')';
        }
      }
      parts.unshift(tag);
      current = parent;
    }
    if (parts[0] && parts[0][0] !== '#') {
      parts.unshift('body');
    }
    return parts.join(' > ');
  }

  function isEditable(el) {
    if (!el || !el.tagName) return false;
    return EDITABLE_TAGS.has(el.tagName);
  }

  function isTextEditable(el) {
    if (!el || !el.tagName) return false;
    return TEXT_TAGS.has(el.tagName);
  }

  function getComputedProps(el) {
    var cs = window.getComputedStyle(el);
    return {
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      lineHeight: cs.lineHeight,
      textAlign: cs.textAlign,
      padding: cs.padding,
      margin: cs.margin,
      borderWidth: cs.borderWidth,
      borderColor: cs.borderColor,
      borderRadius: cs.borderRadius,
      width: cs.width,
      height: cs.height,
      maxWidth: cs.maxWidth,
      display: cs.display,
      position: cs.position,
    };
  }

  function getElementInfo(el) {
    var rect = el.getBoundingClientRect();
    var isImg = el.tagName === 'IMG';
    return {
      tag: el.tagName.toLowerCase(),
      cssPath: getCSSPath(el),
      boundingRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      textContent: (el.textContent || '').substring(0, 200),
      outerHTML: el.outerHTML.substring(0, 2000),
      computedStyles: getComputedProps(el),
      isImage: isImg,
      imgSrc: isImg ? el.src : undefined,
      parentTag: el.parentElement ? el.parentElement.tagName.toLowerCase() : undefined,
    };
  }

  function sendMessage(msg) {
    window.parent.postMessage(msg, '*');
  }

  // ── Tag label ─────────────────────────────────────────────────
  function showLabel(el) {
    removeLabel();
    var rect = el.getBoundingClientRect();
    labelEl = document.createElement('div');
    labelEl.className = 'wf-tag-label';
    labelEl.textContent = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      var cls = el.className.split(/\\s+/).filter(function(c) {
        return c && !c.startsWith('wf-') && !c.startsWith('data-wf');
      }).slice(0, 2).join('.');
      if (cls) labelEl.textContent += '.' + cls;
    }
    labelEl.style.top = (rect.top + window.scrollY - 18) + 'px';
    labelEl.style.left = (rect.left + window.scrollX) + 'px';
    document.body.appendChild(labelEl);
  }

  function removeLabel() {
    if (labelEl && labelEl.parentNode) {
      labelEl.parentNode.removeChild(labelEl);
      labelEl = null;
    }
  }

  // ── Selection ─────────────────────────────────────────────────
  function clearSelection() {
    if (selectedEl) {
      selectedEl.removeAttribute('data-wf-selected');
      selectedEl = null;
    }
    removeLabel();
    sendMessage({ type: 'wf-deselect' });
  }

  function selectElement(el) {
    if (selectedEl === el) return;
    if (selectedEl) selectedEl.removeAttribute('data-wf-selected');
    selectedEl = el;
    el.setAttribute('data-wf-selected', '');
    showLabel(el);
    sendMessage({ type: 'wf-select', element: getElementInfo(el) });
  }

  // ── Hover ─────────────────────────────────────────────────────
  var hoverRaf = null;
  function handleMouseOver(e) {
    if (mode === 'browse' || isTextEditing) return;
    var target = e.target;
    if (target === hoveredEl || target === selectedEl) return;
    if (!isEditable(target)) return;

    if (hoverRaf) cancelAnimationFrame(hoverRaf);
    hoverRaf = requestAnimationFrame(function() {
      if (hoveredEl) hoveredEl.removeAttribute('data-wf-hover');
      hoveredEl = target;
      target.setAttribute('data-wf-hover', '');
      sendMessage({ type: 'wf-hover', element: getElementInfo(target) });
    });
  }

  function handleMouseOut(e) {
    if (mode === 'browse') return;
    var target = e.target;
    target.removeAttribute('data-wf-hover');
    if (target === hoveredEl) {
      hoveredEl = null;
      sendMessage({ type: 'wf-hover', element: null });
    }
  }

  // ── Click ─────────────────────────────────────────────────────
  function handleClick(e) {
    if (mode === 'browse' || isTextEditing) return;
    var target = e.target;
    if (!isEditable(target)) {
      clearSelection();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    selectElement(target);
  }

  // ── Double-click for inline text editing ──────────────────────
  function handleDblClick(e) {
    if (mode === 'browse') return;
    var target = e.target;
    if (!isTextEditable(target)) return;
    e.preventDefault();
    e.stopPropagation();

    startTextEditing(target);
  }

  function startTextEditing(el) {
    if (isTextEditing) stopTextEditing(false);
    selectElement(el);
    isTextEditing = true;
    originalTextContent = el.innerHTML;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-wf-text-editing', '');
    el.focus();

    // Select all text
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function stopTextEditing(save) {
    if (!isTextEditing || !selectedEl) return;
    var el = selectedEl;
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-wf-text-editing');

    if (save && el.innerHTML !== originalTextContent) {
      sendMessage({
        type: 'wf-text-edit',
        cssPath: getCSSPath(el),
        oldText: originalTextContent,
        newText: el.innerHTML,
        newHtml: document.documentElement.outerHTML,
      });
    } else if (!save) {
      el.innerHTML = originalTextContent;
    }

    isTextEditing = false;
    originalTextContent = '';
  }

  // ── Keyboard handling ─────────────────────────────────────────
  function handleKeyDown(e) {
    if (isTextEditing) {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopTextEditing(false);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        stopTextEditing(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      clearSelection();
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedEl && !isTextEditing) {
        e.preventDefault();
        var toRemove = selectedEl;
        clearSelection();
        toRemove.remove();
        sendMessage({ type: 'wf-html-update', html: document.documentElement.outerHTML });
      }
    }

    if (e.key === 'Enter' && selectedEl && isTextEditable(selectedEl)) {
      e.preventDefault();
      startTextEditing(selectedEl);
    }

    if (e.key === 'Tab' && selectedEl) {
      e.preventDefault();
      var next = e.shiftKey ? selectedEl.previousElementSibling : selectedEl.nextElementSibling;
      if (next && isEditable(next)) selectElement(next);
    }
  }

  // ── Blur handler for text editing ─────────────────────────────
  var blurTimeout = null;
  function handleBlur(e) {
    if (isTextEditing && selectedEl && e.target === selectedEl) {
      // Cancel any previously queued blur timeout to prevent duplicate calls
      if (blurTimeout) clearTimeout(blurTimeout);
      // Small delay to allow click on toolbar
      blurTimeout = setTimeout(function() {
        blurTimeout = null;
        if (isTextEditing) stopTextEditing(true);
      }, 200);
    }
  }

  // ── Listen for parent commands ────────────────────────────────
  function handleParentMessage(e) {
    var data = e.data;
    if (!data || typeof data.type !== 'string' || !data.type.startsWith('wf-cmd-')) return;

    switch (data.type) {
      case 'wf-cmd-set-mode':
        mode = data.mode;
        if (mode === 'browse') {
          clearSelection();
          if (hoveredEl) { hoveredEl.removeAttribute('data-wf-hover'); hoveredEl = null; }
          if (isTextEditing) stopTextEditing(false);
        }
        break;

      case 'wf-cmd-select':
        var el = document.querySelector(data.cssPath);
        if (el) selectElement(el);
        break;

      case 'wf-cmd-style':
        var target = document.querySelector(data.cssPath);
        if (target) {
          // Handle HTML attributes (src, href, alt) separately from CSS properties
          var attrProps = ['src', 'href', 'alt', 'title', 'placeholder', 'value'];
          if (attrProps.indexOf(data.property) !== -1) {
            target.setAttribute(data.property, data.value);
          } else {
            target.style[data.property] = data.value;
          }
          sendMessage({ type: 'wf-select', element: getElementInfo(target) });
        }
        break;

      case 'wf-cmd-delete':
        var toDelete = document.querySelector(data.cssPath);
        if (toDelete) {
          toDelete.remove();
          clearSelection();
          sendMessage({ type: 'wf-html-update', html: document.documentElement.outerHTML });
        }
        break;

      case 'wf-cmd-get-html':
        sendMessage({ type: 'wf-html-update', html: document.documentElement.outerHTML });
        break;

      case 'wf-cmd-replace-element':
        var toReplace = document.querySelector(data.cssPath);
        if (toReplace) {
          var temp = document.createElement('div');
          temp.innerHTML = data.newHtml;
          var newEl = temp.firstElementChild;
          if (newEl) {
            toReplace.parentNode.replaceChild(newEl, toReplace);
            selectElement(newEl);
          }
          sendMessage({ type: 'wf-html-update', html: document.documentElement.outerHTML });
        }
        break;

      case 'wf-cmd-text-edit':
        var editTarget = document.querySelector(data.cssPath);
        if (editTarget) {
          if (data.enable) startTextEditing(editTarget);
          else stopTextEditing(true);
        }
        break;

      case 'wf-cmd-reorder-section':
        var sections = document.querySelectorAll('body > section, body > header, body > main, body > footer, body > nav');
        var arr = Array.from(sections);
        if (data.fromIndex >= 0 && data.fromIndex < arr.length && data.toIndex >= 0 && data.toIndex < arr.length) {
          var moving = arr[data.fromIndex];
          var ref = arr[data.toIndex];
          if (data.fromIndex < data.toIndex) {
            ref.parentNode.insertBefore(moving, ref.nextSibling);
          } else {
            ref.parentNode.insertBefore(moving, ref);
          }
          sendMessage({ type: 'wf-html-update', html: document.documentElement.outerHTML });
        }
        break;
    }
  }

  // ── Attach listeners ──────────────────────────────────────────
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('dblclick', handleDblClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('focusout', handleBlur, true);
  window.addEventListener('message', handleParentMessage);

  // Prevent navigation on link clicks
  document.addEventListener('click', function(e) {
    if (mode === 'browse') return;
    var link = e.target.closest('a[href]');
    if (link) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // Signal ready
  sendMessage({ type: 'wf-ready' });
})();
`;
}
