import { getOrigin, saveLink } from './grifo.js'

const WEB = ['http://*/*', 'https://*/*']

// Right-click entries: save the page you are on, or a link without opening it.
const MENUS = [
  { id: 'page-queue', title: 'Save page to Grifo queue', context: 'page', favorite: false },
  { id: 'page-favorite', title: 'Save page to Grifo favorites', context: 'page', favorite: true },
  { id: 'link-queue', title: 'Save link to Grifo queue', context: 'link', favorite: false },
  { id: 'link-favorite', title: 'Save link to Grifo favorites', context: 'link', favorite: true },
]

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.removeAll(() => {
    for (const menu of MENUS) {
      chrome.contextMenus.create({
        id: menu.id,
        title: menu.title,
        contexts: [menu.context],
        ...(menu.context === 'link' ? { targetUrlPatterns: WEB } : { documentUrlPatterns: WEB }),
      })
    }
  })
  if (!(await getOrigin())) chrome.runtime.openOptionsPage()
})

chrome.contextMenus.onClicked.addListener(async (info) => {
  const menu = MENUS.find((m) => m.id === info.menuItemId)
  if (!menu) return
  const url = menu.context === 'link' ? info.linkUrl : info.pageUrl
  flash(await saveLink(url, menu.favorite))
})

// The popup hands the save over to this worker, so it finishes even if the
// popup closes while Grifo is still extracting the article.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'save') return
  saveLink(message.url, message.favorite).then((result) => {
    flash(result)
    sendResponse(result)
  })
  return true
})

// A short badge on the toolbar icon confirms a save made from the right-click
// menu, where there is no popup to show it. An opened tab speaks for itself.
function flash(result) {
  if (result.status === 'opened') return
  const ok = result.status === 'saved'
  chrome.action.setBadgeBackgroundColor({ color: ok ? '#f2ca55' : '#dc2626' })
  chrome.action.setBadgeText({ text: ok ? '✓' : '!' })
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000)
}
