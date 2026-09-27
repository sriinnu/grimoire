export const nativeTextAssistanceDisabledAttributes = {
  spellcheck: 'false',
  autocorrect: 'off',
  autocomplete: 'off',
  autocapitalize: 'off',
} as const

export const nativeTextAssistanceDisabledProps = {
  spellCheck: false,
  autoCorrect: 'off',
  autoComplete: 'off',
  autoCapitalize: 'off',
} as const

const TEXT_ENTRY_SELECTOR = [
  'textarea',
  '[contenteditable="true"]',
  'input:not([type])',
  'input[type="email"]',
  'input[type="number"]',
  'input[type="password"]',
  'input[type="search"]',
  'input[type="tel"]',
  'input[type="text"]',
  'input[type="url"]',
].join(',')

function isElement(node: ParentNode): node is Element {
  return typeof Element !== 'undefined' && node instanceof Element
}

export interface NativeTextAssistanceOptions {
  /** Leave the browser's spellcheck on (autocorrect, autocomplete and autocapitalize stay off). */
  keepSpellcheck?: boolean
}

function setNativeTextAssistanceDisabled(element: Element, options: NativeTextAssistanceOptions) {
  for (const [attribute, value] of Object.entries(nativeTextAssistanceDisabledAttributes)) {
    const wanted = attribute === 'spellcheck' && options.keepSpellcheck ? 'true' : value
    if (element.getAttribute(attribute) !== wanted) {
      element.setAttribute(attribute, wanted)
    }
  }
}

export function disableNativeTextAssistance(root: ParentNode, options: NativeTextAssistanceOptions = {}) {
  if (isElement(root) && root.matches(TEXT_ENTRY_SELECTOR)) {
    setNativeTextAssistanceDisabled(root, options)
  }

  root.querySelectorAll(TEXT_ENTRY_SELECTOR).forEach((element) => setNativeTextAssistanceDisabled(element, options))
}

export function observeNativeTextAssistanceDisabled(root: ParentNode, options: NativeTextAssistanceOptions = {}): () => void {
  disableNativeTextAssistance(root, options)

  if (typeof MutationObserver === 'undefined') {
    return () => {}
  }

  const observer = new MutationObserver(() => disableNativeTextAssistance(root, options))
  observer.observe(root, {
    attributeFilter: ['contenteditable'],
    attributes: true,
    childList: true,
    subtree: true,
  })

  return () => observer.disconnect()
}
