import { getOrigin, setOrigin, toOrigin } from './grifo.js'

const input = document.getElementById('origin')
const status = document.getElementById('status')

input.value = (await getOrigin()) ?? ''

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault()
  status.classList.remove('error')
  const origin = toOrigin(input.value)
  if (!origin) {
    status.textContent = 'That does not look like an https address.'
    status.classList.add('error')
    return
  }

  // Must be the first await: Chrome only shows the permission prompt while the
  // click that triggered it is still being handled.
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] })
  await setOrigin(origin)
  input.value = origin
  status.textContent = granted
    ? 'Saved. You can close this tab.'
    : 'Saved, but without the permission every save will open a Grifo tab.'
})
