import { getOrigin, isSaveable } from './grifo.js'

const page = document.getElementById('page')
const status = document.getElementById('status')
const buttons = [document.getElementById('queue'), document.getElementById('favorite')]

document.getElementById('settings').addEventListener('click', (e) => {
  e.preventDefault()
  chrome.runtime.openOptionsPage()
})

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
page.textContent = tab?.title || tab?.url || ''

if (!(await getOrigin())) {
  disable('Set your Grifo address in Settings first.')
} else if (!isSaveable(tab?.url)) {
  disable('Only web pages can be saved.')
}

buttons[0].addEventListener('click', () => save(false))
buttons[1].addEventListener('click', () => save(true))

async function save(favorite) {
  disable('Saving…')
  status.classList.remove('error')
  const result = await chrome.runtime.sendMessage({ type: 'save', url: tab.url, favorite })

  if (result.status === 'saved') {
    status.textContent = favorite ? 'Saved to your favorites.' : 'Saved to your queue.'
    setTimeout(() => window.close(), 1200)
  } else if (result.status === 'opened') {
    window.close()
  } else {
    status.textContent = result.message
    status.classList.add('error')
    for (const b of buttons) b.disabled = false
  }
}

function disable(message) {
  status.textContent = message
  for (const b of buttons) b.disabled = true
}
